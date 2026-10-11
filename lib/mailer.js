'use strict';

const nodemailer = require('nodemailer');

let transport = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

const BRAND = 'Maine Stone Scapes';
const INK = '#1f2326';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Shared send function. Resolves { skipped: true } when SMTP isn't configured. */
async function sendMail(msg) {
  if (!transport) {
    console.log(`[mailer] SMTP not configured — not sent: "${msg.subject}" → ${msg.to}`);
    return { skipped: true };
  }
  return transport.sendMail(Object.assign({ from: process.env.MAIL_FROM || `"${BRAND} Website" <${process.env.SMTP_USER}>` }, msg));
}

const row = (k, v) => `<tr><td style="color:#666;width:34%;vertical-align:top"><b>${k}</b></td><td>${v}</td></tr>`;
const tel = (p) => `<a href="tel:${esc(String(p).replace(/[^\d+]/g, ''))}">${esc(p)}</a>`;
const mail = (e) => (e ? `<a href="mailto:${esc(e)}">${esc(e)}</a>` : '—');

function wrap(title, rows, longLabel, longText, tab) {
  const link = process.env.SITE_URL ? `<p style="margin-top:22px"><a href="${esc(process.env.SITE_URL)}/admin${tab ? '#' + tab : ''}">Open the dashboard →</a></p>` : '';
  return `
    <div style="font-family:Arial,sans-serif;max-width:580px">
      <div style="background:${INK};color:#f1ede4;padding:16px 20px;font-weight:bold;font-size:18px">${BRAND} · ${title}</div>
      <div style="padding:18px 20px;border:1px solid #e5e2da;border-top:0">
        <table cellpadding="6" style="border-collapse:collapse;width:100%">${rows}</table>
        ${longText ? `<h3 style="margin:18px 0 6px">${longLabel}</h3><p style="white-space:pre-wrap">${esc(longText)}</p>` : ''}
        <p style="color:#888;font-size:12px;margin-top:18px">Hit reply to answer them directly.</p>
        ${link}
      </div>
    </div>`;
}

async function deliver(to, msg, what) {
  if (!to) { console.log(`[mailer] NOTIFY_EMAIL not set — ${what} saved to dashboard only.`); return; }
  try { await sendMail(Object.assign({ to }, msg)); }
  catch (err) { console.error(`[mailer] Failed to send ${what} notification:`, err.message); }
}

/** Email Dan about a new project inquiry. Never throws. */
function notifyNewLead(lead) {
  const subject = `New project inquiry: ${lead.name}${lead.service ? ' — ' + lead.service : ''}${lead.town ? ' (' + lead.town + ')' : ''}`;
  const html = wrap('New project inquiry', [
    row('Name', esc(lead.name)),
    row('Phone', tel(lead.phone)),
    row('Email', mail(lead.email)),
    row('Town', esc(lead.town || '—')),
    row('Project', esc(lead.service || '—')),
    row('Timeline', esc(lead.timeline || '—')),
    row('They are a', esc(lead.client_type || '—')),
    row('Found us via', esc(lead.source || '—'))
  ].join(''), 'About the project', lead.message, 'inquiries');
  return deliver(process.env.NOTIFY_EMAIL, { replyTo: lead.email || undefined, subject, html }, `lead #${lead.id}`);
}

/** Email Dan about a new job application. Goes to HIRING_EMAIL if set, else NOTIFY_EMAIL. Never throws. */
function notifyNewApplication(app) {
  const subject = `New job application: ${app.name}${app.position ? ' — ' + app.position : ''}`;
  const html = wrap('New job application', [
    row('Name', esc(app.name)),
    row('Phone', tel(app.phone)),
    row('Email', mail(app.email)),
    row('Lives in', esc(app.town || '—')),
    row('Position', esc(app.position || '—')),
    row('Experience', esc(app.experience || '—')),
    row('DSWA certification', esc(app.certification || '—')),
    row('Driver’s license', esc(app.license || '—')),
    row('OK with heavy outdoor work year-round', esc(app.physical || '—')),
    row('Can start', esc(app.start_date || '—')),
    row('Heard about us', esc(app.source || '—')),
    row('Work / Instagram', app.portfolio ? esc(app.portfolio) : '—')
  ].join(''), 'About them', app.about, 'applications');
  return deliver(process.env.HIRING_EMAIL || process.env.NOTIFY_EMAIL, { replyTo: app.email || undefined, subject, html }, `application #${app.id}`);
}

module.exports = { notifyNewLead, notifyNewApplication, sendMail };
