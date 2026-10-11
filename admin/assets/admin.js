(function () {
  'use strict';

  // Two lists share one UI. Each tab knows its API, labels and how to draw a row.
  var TABS = {
    inquiries: {
      title: 'Project inquiries', api: '/api/admin/leads', csv: '/api/admin/leads.csv', noun: 'inquiry',
      labels: { new: 'New', contacted: 'Contacted', site_visit: 'Site visit', proposal: 'Proposal sent', booked: 'Booked', not_a_fit: 'Not a fit' },
      search: function (r) { return [r.name, r.phone, r.email, r.town, r.service, r.client_type, r.source]; },
      meta: function (r) {
        return (r.service ? '<span>🪨 ' + esc(r.service) + '</span>' : '') +
          (r.town ? '<span>📍 ' + esc(r.town) + '</span>' : '') +
          (r.timeline ? '<span>🗓 ' + esc(r.timeline) + '</span>' : '');
      },
      detail: function (r) {
        return '<h4>Project</h4><div>' + esc(r.service || '—') + (r.timeline ? ' · ' + esc(r.timeline) : '') + '</div>' +
          '<div class="chips">' +
            (r.client_type ? '<span class="chip-i">' + esc(r.client_type) + '</span>' : '') +
            (r.source ? '<span class="chip-i">Found us: ' + esc(r.source) + '</span>' : '') +
          '</div>' +
          (r.message ? '<h4>About the project</h4><div class="msg">' + esc(r.message) + '</div>' : '');
      },
      subject: 'Your stonework project', notesHint: 'Site visit date, stone source, wall length, budget…',
      empty: 'No inquiries yet. Messages from the “Start a project” form will show up here.'
    },
    applications: {
      title: 'Job applications', api: '/api/admin/applications', csv: '/api/admin/applications.csv', noun: 'application',
      labels: { new: 'New', reviewing: 'Reviewing', interview: 'Interview', hired: 'Hired', not_a_fit: 'Not a fit' },
      search: function (r) { return [r.name, r.phone, r.email, r.town, r.position, r.experience, r.certification]; },
      meta: function (r) {
        return (r.position ? '<span>🧱 ' + esc(r.position) + '</span>' : '') +
          (r.experience ? '<span>⚒ ' + esc(r.experience) + '</span>' : '') +
          (r.town ? '<span>📍 ' + esc(r.town) + '</span>' : '');
      },
      detail: function (r) {
        var yes = function (v, label) { return v ? '<span class="chip-i' + (v === 'Yes' ? ' good' : '') + '">' + label + ': ' + esc(v) + '</span>' : ''; };
        return '<h4>Position</h4><div>' + esc(r.position || '—') + '</div>' +
          '<h4>Background</h4><div>' + esc(r.experience || '—') + '</div>' +
          '<div class="chips">' +
            (r.certification ? '<span class="chip-i' + (r.certification !== 'None' ? ' good' : '') + '">DSWA: ' + esc(r.certification) + '</span>' : '') +
            yes(r.license, 'Driver’s license') +
            yes(r.physical, 'Heavy outdoor work') +
            (r.start_date ? '<span class="chip-i">Start: ' + esc(r.start_date) + '</span>' : '') +
            (r.source ? '<span class="chip-i">Heard via: ' + esc(r.source) + '</span>' : '') +
          '</div>' +
          (r.portfolio ? '<h4>Work / Instagram</h4><div>' + link(r.portfolio) + '</div>' : '') +
          (r.about ? '<h4>About them</h4><div class="msg">' + esc(r.about) + '</div>' : '');
      },
      subject: 'Your application to Maine Stone Scapes', notesHint: 'Interview date, references, trial day…',
      empty: 'No applications yet. Submissions from the Careers page will show up here.'
    }
  };

  var state = { tab: 'inquiries', data: {}, filter: '', q: '', open: {} };
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function link(v) {
    var url = /^@/.test(v) ? 'https://www.instagram.com/' + v.slice(1) : v;
    return /^https?:\/\//i.test(url) ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(v) + '</a>' : esc(v);
  }
  var color = function (s) { return 'var(--s-' + s + ')'; };
  var ago = function (ts) {
    var d = new Date(ts.replace(' ', 'T') + 'Z');
    var m = Math.round((Date.now() - d) / 60000);
    if (m < 60) return m + 'm ago';
    if (m < 1440) return Math.round(m / 60) + 'h ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  function api(url, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    return fetch(url, opts).then(function (r) {
      if (r.status === 401) { location.reload(); throw new Error('auth'); }
      return r.json();
    });
  }

  function loadAll() {
    return Promise.all(Object.keys(TABS).map(function (k) {
      return api(TABS[k].api).then(function (d) { state.data[k] = d; });
    })).then(render);
  }

  function setTab(k) {
    state.tab = k; state.filter = ''; state.q = ''; $('#search').value = '';
    $$('.tab').forEach(function (t) { var on = t.dataset.tab === k; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); });
    if (location.hash !== '#' + k) history.replaceState(null, '', '#' + k);
    render();
  }

  function render() {
    var T = TABS[state.tab], d = state.data[state.tab];
    if (!d) return;
    $('#listTitle').textContent = T.title;
    $('#csvLink').href = T.csv;
    $('#search').placeholder = state.tab === 'applications' ? 'Search name, phone, position…' : 'Search name, phone, town…';

    // "New" badges on both tabs
    Object.keys(TABS).forEach(function (k) {
      var n = state.data[k] && state.data[k].counts.new;
      $('#cnt-' + k).textContent = n ? n : '';
    });

    var sel = $('#statusFilter');
    sel.innerHTML = '<option value="">All statuses</option>' + d.statuses.map(function (s) {
      return '<option value="' + s + '"' + (state.filter === s ? ' selected' : '') + '>' + T.labels[s] + '</option>';
    }).join('');

    var stats = $('#stats');
    stats.className = 'stats' + (d.statuses.length === 5 ? ' five' : '');
    stats.innerHTML = d.statuses.map(function (s) {
      return '<button class="stat' + (state.filter === s ? ' active' : '') + '" data-stat="' + s + '" style="--c:' + color(s) + '"><b>' + (d.counts[s] || 0) + '</b><span>' + T.labels[s] + '</span></button>';
    }).join('');

    var q = state.q.toLowerCase();
    var list = d.items.filter(function (r) {
      if (state.filter && r.status !== state.filter) return false;
      return !q || T.search(r).join(' ').toLowerCase().indexOf(q) > -1;
    });

    $('#list').innerHTML = list.length ? list.map(function (r) {
      var key = state.tab + r.id, digits = String(r.phone).replace(/[^\d+]/g, '');
      return '<article class="lead' + (state.open[key] ? ' open' : '') + '">' +
        '<button class="lead-top" data-toggle="' + key + '" aria-expanded="' + !!state.open[key] + '">' +
          '<div><div class="lead-name">' + esc(r.name) + '</div>' +
            '<div class="lead-meta">' + T.meta(r) + '<span>Received ' + ago(r.created_at) + '</span></div></div>' +
          '<div class="lead-right"><span class="badge" style="--c:' + color(r.status) + '">' + T.labels[r.status] + '</span></div>' +
        '</button>' +
        '<div class="lead-body">' +
          '<div>' +
            '<h4>Contact</h4><div>' + esc(r.phone) + (r.email ? ' · ' + esc(r.email) : '') + (r.town ? ' · ' + esc(r.town) : '') + '</div>' +
            '<div class="quick"><a class="call" href="tel:' + esc(digits) + '">Call</a><a href="sms:' + esc(digits) + '">Text</a>' +
              (r.email ? '<a href="mailto:' + esc(r.email) + '?subject=' + encodeURIComponent(T.subject) + '">Email</a>' : '') + '</div>' +
            T.detail(r) +
          '</div>' +
          '<div>' +
            '<h4>Status</h4><select data-status="' + r.id + '">' + d.statuses.map(function (s) {
              return '<option value="' + s + '"' + (s === r.status ? ' selected' : '') + '>' + T.labels[s] + '</option>';
            }).join('') + '</select>' +
            '<h4>Private notes</h4><textarea data-notes="' + r.id + '" placeholder="' + esc(T.notesHint) + '">' + esc(r.notes || '') + '</textarea>' +
            '<button class="save" data-save="' + r.id + '">Save notes</button><span class="saved" data-saved="' + r.id + '"></span>' +
            '<div class="quick"><button class="del" data-del="' + r.id + '">Delete ' + T.noun + '</button></div>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('') : '<p class="empty">' + (d.items.length ? 'Nothing matches that filter.' : T.empty) + '</p>';
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab],[data-toggle],[data-stat],[data-save],[data-del],#logout');
    if (!t) return;
    var T = TABS[state.tab];
    if (t.dataset.tab) setTab(t.dataset.tab);
    else if (t.dataset.toggle) { state.open[t.dataset.toggle] = !state.open[t.dataset.toggle]; render(); }
    else if (t.dataset.stat) { state.filter = state.filter === t.dataset.stat ? '' : t.dataset.stat; render(); }
    else if (t.dataset.save) {
      var id = t.dataset.save;
      api(T.api + '/' + id, { method: 'PATCH', body: JSON.stringify({ notes: document.querySelector('[data-notes="' + id + '"]').value }) })
        .then(function (r) {
          var items = state.data[state.tab].items;
          var i = items.findIndex(function (x) { return String(x.id) === id; });
          if (i > -1 && r.item) items[i] = r.item;
          var s = document.querySelector('[data-saved="' + id + '"]'); if (s) s.textContent = 'Saved ✓';
        });
    }
    else if (t.dataset.del) {
      if (!confirm('Delete this ' + T.noun + ' permanently?')) return;
      api(T.api + '/' + t.dataset.del, { method: 'DELETE' }).then(loadAll);
    }
    else if (t.id === 'logout') { api('/api/admin/logout', { method: 'POST' }).then(function () { location.reload(); }); }
  });

  document.addEventListener('change', function (e) {
    if (e.target.dataset.status) {
      api(TABS[state.tab].api + '/' + e.target.dataset.status, { method: 'PATCH', body: JSON.stringify({ status: e.target.value }) }).then(loadAll);
    }
    if (e.target.id === 'statusFilter') { state.filter = e.target.value; render(); }
  });
  $('#search').addEventListener('input', function (e) { state.q = e.target.value; render(); });

  // Email links land on the right tab (…/admin#applications)
  if (TABS[location.hash.slice(1)]) state.tab = location.hash.slice(1);
  loadAll().then(function () { setTab(state.tab); });
  setInterval(function () { if (!document.querySelector('.lead.open textarea:focus')) loadAll(); }, 60000);
})();
