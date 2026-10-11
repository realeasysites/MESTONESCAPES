'use strict';

const path = require('path');
const express = require('express');
const { stmts, STATUSES, APP_STATUSES } = require('../db');
const { checkPassword, createSession, destroySession, isAuthed, requireAdmin } = require('../lib/auth');
const rateLimit = require('../lib/rateLimit');

const ADMIN_DIR = path.join(__dirname, '..', 'admin');

/* ---------- Pages (/admin) ---------- */
const pages = express.Router();

pages.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(ADMIN_DIR, isAuthed(req) ? 'dashboard.html' : 'login.html'));
});
pages.use('/assets', express.static(path.join(ADMIN_DIR, 'assets')));

/* ---------- API (/api/admin) ---------- */
const api = express.Router();

api.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many attempts. Try again in 15 minutes.' }), (req, res) => {
  if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'ADMIN_PASSWORD is not set on the server.' });
  if (!checkPassword(req.body && req.body.password)) return res.status(401).json({ error: 'Incorrect password.' });
  createSession(res);
  res.json({ ok: true });
});

api.post('/logout', (req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
});

api.use(requireAdmin);

const shape = ({ ip, ...rest }) => rest;
const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/**
 * Same endpoints for both lists:
 *   GET    /api/admin/<name>        list + status counts
 *   PATCH  /api/admin/<name>/:id    { status?, notes? }
 *   DELETE /api/admin/<name>/:id
 *   GET    /api/admin/<name>.csv    export
 */
function collection(name, { list, get, update, del, counts, statuses, cols, file }) {
  api.get(`/${name}`, (req, res) => {
    const c = Object.fromEntries(statuses.map((s) => [s, 0]));
    for (const r of counts.all()) c[r.status] = r.n;
    res.set('Cache-Control', 'no-store');
    res.json({ items: list.all().map(shape), counts: c, statuses });
  });

  api.patch(`/${name}/:id`, (req, res) => {
    const id = Number(req.params.id);
    if (!get.get(id)) return res.status(404).json({ error: 'Not found' });
    const { status, notes } = req.body || {};
    if (status !== undefined && !statuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    update.run({ id, status: status ?? null, notes: typeof notes === 'string' ? notes.slice(0, 4000) : null });
    res.json({ ok: true, item: shape(get.get(id)) });
  });

  api.delete(`/${name}/:id`, (req, res) => {
    del.run(Number(req.params.id));
    res.json({ ok: true });
  });

  api.get(`/${name}.csv`, (req, res) => {
    const rows = list.all().map((r) => cols.map((c) => cell(r[c])).join(','));
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${file}"`);
    res.send([cols.join(','), ...rows].join('\n'));
  });
}

collection('leads', {
  list: stmts.listLeads, get: stmts.getLead, update: stmts.updateLead, del: stmts.deleteLead,
  counts: stmts.statusCounts, statuses: STATUSES, file: 'maine-stone-scapes-inquiries.csv',
  cols: ['id', 'created_at', 'status', 'name', 'phone', 'email', 'town', 'service', 'timeline', 'client_type', 'source', 'message', 'notes']
});

collection('applications', {
  list: stmts.listApps, get: stmts.getApp, update: stmts.updateApp, del: stmts.deleteApp,
  counts: stmts.appStatusCounts, statuses: APP_STATUSES, file: 'maine-stone-scapes-applications.csv',
  cols: ['id', 'created_at', 'status', 'name', 'phone', 'email', 'town', 'position', 'experience', 'certification', 'license', 'physical', 'start_date', 'source', 'portfolio', 'about', 'notes']
});

module.exports = { pages, api };
