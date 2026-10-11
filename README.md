# Maine Stone Scapes — website

Dry stone walling & stonework, South Portland, Maine. Owner: Dan Morales-Walsh · 207.251.8127 · dan@mainestonescapes.com · Instagram @mainestonescapes

Replaces the Squarespace site at mainestonescapes.com. Built on the Real Easy Sites (TBLC) pattern: Node/Express + SQLite, admin dashboard, site-analytics.

## What's in it

| Page | What it does |
|---|---|
| `/` | Home: hero, services, recent work, Instagram, partners, teaching, process, service area, careers teaser, **project inquiry form** |
| `/work` | Filterable photo gallery + lightbox (photos listed in `public/js/gallery-data.js`) |
| `/about` | Dan's story timeline and the crew |
| `/careers` | **Job application form** |
| `/admin` | Password login → traffic panel + two tabs: **Project inquiries** and **Job applications** (status, private notes, call/text/email buttons, CSV export each) |

Old Squarespace URLs (`/residentialstonework`, `/aboutus`, `/workwithus`…) 301-redirect to the new pages.

## Render setup

1. New **Web Service** from the GitHub repo. Build: `npm install` · Start: `npm start` (Node 20 is pinned).
2. **Disks** → add 1 GB at `/var/data` (needs a paid instance). Without it, inquiries and applications are wiped on every deploy.
3. **Environment** (see `.env.example`):
   - `NODE_ENV=production`
   - `ADMIN_PASSWORD` — set yourself, 8+ characters
   - `NOTIFY_EMAIL` — where inquiry alerts go (e.g. dan@mainestonescapes.com)
   - `HIRING_EMAIL` — optional, separate inbox for applications (defaults to NOTIFY_EMAIL)
   - `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER`, `SMTP_PASS` (Gmail app password — set yourself)
   - `SITE_URL=https://www.mainestonescapes.com`
   - `DB_PATH=/var/data/mainestonescapes.sqlite`
4. Domain: point mainestonescapes.com at Render (A record + www CNAME, same as MPS207) once Dan's ready to switch off Squarespace.

Reply-to on every alert email is the customer/applicant, so Dan can just hit reply. Health check: `/healthz`.

## Editing

- **Facebook link / Instagram follower count:** `public/js/config.js`. Facebook links stay hidden until the URL is filled in.
- **Add gallery photos:** put `<name>.jpg` (~1600px) and `<name>-sm.jpg` (~720px) in `public/img/work/`, add a line to `public/js/gallery-data.js`.
- **Form dropdowns:** change `lib/options.js` *and* the matching `<option>`s in the HTML (the server ignores values it doesn't know).
- After changing CSS/JS, bump the `?v=` number in the HTML so browsers pick it up.

## Traffic tracking

Same `site-analytics/` module as Loria / MPS207. Tips for Dan: set the Google Business Profile website link to `https://www.mainestonescapes.com/?utm_source=gbp`, and open `mainestonescapes.com/#notrack` once on his phone so his own visits don't count.
