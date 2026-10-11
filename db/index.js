'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Render's persistent disk is mounted at /var/data. Anything outside it is wiped on every deploy,
// so use the disk automatically when it exists (DB_PATH in the environment still wins).
const DISK = '/var/data';
const DB_PATH = process.env.DB_PATH || (fs.existsSync(DISK) ? path.join(DISK, 'mainestonescapes.sqlite') : path.join(__dirname, 'mainestonescapes.sqlite'));
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
console.log(`[db] SQLite at ${DB_PATH}${DB_PATH.startsWith(DISK) ? ' (persistent disk)' : ' (NOT persistent: wiped on each deploy)'}`);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  -- Project inquiries from the "Start a project" form.
  CREATE TABLE IF NOT EXISTS leads (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    phone       TEXT NOT NULL,
    email       TEXT,
    town        TEXT,
    service     TEXT,
    timeline    TEXT,
    client_type TEXT,
    source      TEXT,
    message     TEXT,
    status      TEXT NOT NULL DEFAULT 'new',
    notes       TEXT,
    ip          TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

  -- Job applications from /careers.
  CREATE TABLE IF NOT EXISTS applications (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    phone         TEXT NOT NULL,
    email         TEXT,
    town          TEXT,
    position      TEXT,
    experience    TEXT,
    certification TEXT,
    license       TEXT,
    physical      TEXT,
    start_date    TEXT,
    source        TEXT,
    portfolio     TEXT,
    about         TEXT,
    status        TEXT NOT NULL DEFAULT 'new',
    notes         TEXT,
    ip            TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_apps_status ON applications(status);

  CREATE TABLE IF NOT EXISTS sessions (
    token       TEXT PRIMARY KEY,
    expires_at  INTEGER NOT NULL
  );
`);

const STATUSES = ['new', 'contacted', 'site_visit', 'proposal', 'booked', 'not_a_fit'];
const APP_STATUSES = ['new', 'reviewing', 'interview', 'hired', 'not_a_fit'];

const stmts = {
  insertLead: db.prepare(`
    INSERT INTO leads (name, phone, email, town, service, timeline, client_type, source, message, ip)
    VALUES (@name, @phone, @email, @town, @service, @timeline, @client_type, @source, @message, @ip)
  `),
  listLeads: db.prepare(`SELECT * FROM leads ORDER BY datetime(created_at) DESC`),
  getLead: db.prepare(`SELECT * FROM leads WHERE id = ?`),
  updateLead: db.prepare(`
    UPDATE leads SET status = COALESCE(@status, status), notes = COALESCE(@notes, notes), updated_at = datetime('now')
    WHERE id = @id
  `),
  deleteLead: db.prepare(`DELETE FROM leads WHERE id = ?`),
  statusCounts: db.prepare(`SELECT status, COUNT(*) AS n FROM leads GROUP BY status`),

  insertApp: db.prepare(`
    INSERT INTO applications (name, phone, email, town, position, experience, certification, license, physical, start_date, source, portfolio, about, ip)
    VALUES (@name, @phone, @email, @town, @position, @experience, @certification, @license, @physical, @start_date, @source, @portfolio, @about, @ip)
  `),
  listApps: db.prepare(`SELECT * FROM applications ORDER BY datetime(created_at) DESC`),
  getApp: db.prepare(`SELECT * FROM applications WHERE id = ?`),
  updateApp: db.prepare(`
    UPDATE applications SET status = COALESCE(@status, status), notes = COALESCE(@notes, notes), updated_at = datetime('now')
    WHERE id = @id
  `),
  deleteApp: db.prepare(`DELETE FROM applications WHERE id = ?`),
  appStatusCounts: db.prepare(`SELECT status, COUNT(*) AS n FROM applications GROUP BY status`),

  insertSession: db.prepare(`INSERT INTO sessions (token, expires_at) VALUES (?, ?)`),
  getSession: db.prepare(`SELECT * FROM sessions WHERE token = ? AND expires_at > ?`),
  deleteSession: db.prepare(`DELETE FROM sessions WHERE token = ?`),
  purgeSessions: db.prepare(`DELETE FROM sessions WHERE expires_at <= ?`)
};

module.exports = { db, stmts, STATUSES, APP_STATUSES };
