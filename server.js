'use strict';

require('dotenv').config();
const path = require('path');
const express = require('express');

const { db, PERSISTENT } = require('./db');
const { requireAdmin, isAuthed } = require('./lib/auth');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const mountSiteAnalytics = require('./site-analytics');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }));

app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// persistentStorage:false means leads are being saved somewhere that gets wiped on deploy (no disk attached).
app.get('/healthz', (req, res) => res.json({ ok: true, persistentStorage: PERSISTENT }));

// Old Squarespace URLs → new pages, so Google results and saved links keep working.
const REDIRECTS = {
  '/residentialstonework': '/work',
  '/residentialsculptures': '/work#sculpture',
  '/garden-shows': '/work#show',
  '/aboutus': '/about',
  '/workwithus': '/#contact'
};
Object.entries(REDIRECTS).forEach(([from, to]) => app.get(from, (req, res) => res.redirect(301, to)));

// Website traffic: page views, visitors, sources and call/text taps, shown on the /admin dashboard.
mountSiteAnalytics(app, { db, isAuthed, requireAdmin, timezone: 'America/New_York' });

app.use('/api/admin', adminRoutes.api);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes.pages);

// Pages always revalidate so edits show right away; assets cache for 7 days
// (they're versioned with ?v=... in the HTML, so bump that when a file changes).
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html'], maxAge: '7d', index: 'index.html',
  setHeaders: (res, filePath) => { if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); }
}));

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

app.listen(PORT, () => console.log(`Maine Stone Scapes site running on http://localhost:${PORT}`));
