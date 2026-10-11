'use strict';

const express = require('express');
const { stmts } = require('../db');
const { notifyNewLead, notifyNewApplication } = require('../lib/mailer');
const rateLimit = require('../lib/rateLimit');
const O = require('../lib/options');

const router = express.Router();

const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const pick = (v, list) => (list.includes(v) ? v : null);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkContact(b) {
  const name = clip(b.name, 100);
  const phone = clip(b.phone, 40);
  const email = clip(b.email, 160);
  const errors = {};
  if (name.length < 2) errors.name = 'Please enter your name.';
  if (phone.replace(/\D/g, '').length < 10) errors.phone = 'Please enter a valid phone number.';
  if (email && !EMAIL_RE.test(email)) errors.email = 'That email doesn’t look right.';
  return { name, phone, email: email || null, errors };
}

/* ---------- Project inquiry ---------- */
router.post('/contact', rateLimit({ windowMs: 15 * 60 * 1000, max: 8 }), (req, res) => {
  const b = req.body || {};
  // Honeypot: real people never fill the hidden "mss_trap" field. (Not named "company"/"website": browsers autofill those.)
  if (b.mss_trap) return res.json({ ok: true });

  const { name, phone, email, errors } = checkContact(b);
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors });

  const lead = {
    name, phone, email,
    town: clip(b.town, 80) || null,
    service: pick(b.service, O.SERVICES),
    timeline: pick(b.timeline, O.TIMELINES),
    client_type: pick(b.client_type, O.CLIENT_TYPES),
    source: pick(b.source, O.SOURCES),
    message: clip(b.message, 3000) || null,
    ip: req.ip
  };
  const info = stmts.insertLead.run(lead);
  lead.id = Number(info.lastInsertRowid);
  notifyNewLead(lead); // fire-and-forget
  res.json({ ok: true, id: lead.id });
});

/* ---------- Job application ---------- */
router.post('/apply', rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), (req, res) => {
  const b = req.body || {};
  if (b.mss_trap) return res.json({ ok: true });

  const { name, phone, email, errors } = checkContact(b);
  if (!pick(b.position, O.POSITIONS)) errors.position = 'Pick the position you’re interested in.';
  if (!pick(b.experience, O.EXPERIENCE)) errors.experience = 'Tell us your experience level.';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors });

  let portfolio = clip(b.portfolio, 300);
  if (portfolio && !/^https?:\/\//i.test(portfolio)) portfolio = portfolio.startsWith('@') ? portfolio : 'https://' + portfolio;

  const app = {
    name, phone, email,
    town: clip(b.town, 80) || null,
    position: pick(b.position, O.POSITIONS),
    experience: pick(b.experience, O.EXPERIENCE),
    certification: pick(b.certification, O.CERTIFICATIONS),
    license: pick(b.license, O.YES_NO),
    physical: pick(b.physical, O.YES_NO),
    start_date: pick(b.start_date, O.START_DATES),
    source: pick(b.source, O.APP_SOURCES),
    portfolio: portfolio || null,
    about: clip(b.about, 3000) || null,
    ip: req.ip
  };
  const info = stmts.insertApp.run(app);
  app.id = Number(info.lastInsertRowid);
  notifyNewApplication(app); // fire-and-forget
  res.json({ ok: true, id: app.id });
});

module.exports = router;
