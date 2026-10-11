(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var C = window.MSS_CONFIG || {};
  var PHONE = '207.251.8127';

  /* ---------- year ---------- */
  $$('.js-year').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- config: Facebook links + Instagram follower count ---------- */
  $$('[data-fb]').forEach(function (a) { if (C.facebook) { a.href = C.facebook; a.hidden = false; } });
  $$('[data-ig-count]').forEach(function (el) {
    if (C.instagramFollowers) { el.textContent = C.instagramFollowers + ' followers on Instagram'; el.hidden = false; }
  });

  /* ---------- mobile menu ---------- */
  var toggle = $('#menuToggle'), nav = $('#nav');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) setMenu(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1020 && nav.classList.contains('open')) setMenu(false); });
  }

  /* ---------- gallery (/work) ---------- */
  var DATA = window.MSS_GALLERY || [];
  var LABELS = { all: 'All work', walls: 'Dry stone walls', restoration: 'Restoration', steps: 'Steps & walkways', terraces: 'Terraces & patios', features: 'Fireplaces & features', sculpture: 'Sculpture & arches', show: 'Garden shows' };
  var grid = $('#galleryGrid'), chips = $('#galleryChips');

  if (grid && DATA.length) {
    var frag = document.createDocumentFragment();
    DATA.forEach(function (d) {
      var a = document.createElement('a');
      a.className = 'g-item'; a.href = '/img/work/' + d.file + '.jpg'; a.setAttribute('data-cat', d.cat);
      var f = document.createElement('div'); f.className = 'frame';
      var img = document.createElement('img');
      img.src = '/img/work/' + d.file + '-sm.jpg';
      img.srcset = '/img/work/' + d.file + '-sm.jpg 720w, /img/work/' + d.file + '.jpg 1600w';
      img.sizes = '(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 380px';
      img.alt = d.cap; img.loading = 'lazy';
      var sp = document.createElement('span'); sp.textContent = d.cap;
      f.appendChild(img); a.appendChild(f); a.appendChild(sp); frag.appendChild(a);
    });
    grid.appendChild(frag);

    if (chips) {
      var counts = { all: DATA.length };
      DATA.forEach(function (d) { counts[d.cat] = (counts[d.cat] || 0) + 1; });
      Object.keys(LABELS).forEach(function (k) {
        if (!counts[k]) return;
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'chip' + (k === 'all' ? ' is-on' : ''); b.setAttribute('data-filter', k);
        b.setAttribute('aria-pressed', k === 'all' ? 'true' : 'false');
        b.innerHTML = LABELS[k] + ' <small>' + counts[k] + '</small>';
        chips.appendChild(b);
      });
      chips.addEventListener('click', function (e) {
        var c = e.target.closest('.chip'); if (!c) return;
        filterTo(c.getAttribute('data-filter'));
      });
    }
  }
  function filterTo(f) {
    if (!LABELS[f]) f = 'all';
    $$('.chip', chips).forEach(function (c) { var on = c.getAttribute('data-filter') === f; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    $$('.g-item', grid).forEach(function (it) { it.classList.toggle('is-hidden', f !== 'all' && it.getAttribute('data-cat') !== f); });
    history.replaceState(null, '', f === 'all' ? location.pathname : '#' + f);
  }
  if (grid && location.hash) filterTo(location.hash.slice(1));

  /* lightbox */
  var lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap'), idx = 0, lastFocus = null;
  function visible() { return grid ? $$('.g-item', grid).filter(function (i) { return !i.classList.contains('is-hidden'); }) : []; }
  function show(i) {
    var list = visible(); if (!list.length) return;
    idx = (i + list.length) % list.length;
    var img = $('img', list[idx]);
    lbImg.src = list[idx].getAttribute('href'); lbImg.alt = img.alt; lbCap.textContent = img.alt;
  }
  function openLb(i) { lastFocus = document.activeElement; show(i); lb.hidden = false; document.body.style.overflow = 'hidden'; $('.lb-close', lb).focus(); }
  function closeLb() { lb.hidden = true; document.body.style.overflow = ''; lbImg.removeAttribute('src'); if (lastFocus) lastFocus.focus(); }
  if (grid && lb) {
    grid.addEventListener('click', function (e) {
      var a = e.target.closest('.g-item'); if (!a) return;
      e.preventDefault(); openLb(visible().indexOf(a));
    });
    $('.lb-close', lb).addEventListener('click', closeLb);
    $('.lb-prev', lb).addEventListener('click', function () { show(idx - 1); });
    $('.lb-next', lb).addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
    var sx = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (sx == null) return; var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); sx = null;
    });
  }

  /* ---------- Instagram posts: official embeds, loaded only when near view ---------- */
  var ig = $('#instagram');
  if (ig) {
    var load = function () {
      var s = document.createElement('script');
      s.async = true; s.src = 'https://www.instagram.com/embed.js';
      s.onload = function () { if (window.instgrm) window.instgrm.Embeds.process(); };
      document.body.appendChild(s);
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en, obs) { if (en[0].isIntersecting) { load(); obs.disconnect(); } }, { rootMargin: '600px 0px' }).observe(ig);
    } else load();
  }

  /* ---------- forms (project inquiry + job application share one handler) ---------- */
  $$('form[data-endpoint]').forEach(function (form) {
    var msg = $('.form-msg', form), btn = $('button[type=submit]', form), label = btn.textContent;
    var okText = form.getAttribute('data-ok');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      $$('.invalid', form).forEach(function (el) { el.classList.remove('invalid'); });
      var data = {};
      $$('input, select, textarea', form).forEach(function (el) {
        if (!el.name) return;
        if ((el.type === 'radio' || el.type === 'checkbox') && !el.checked) return;
        data[el.name] = el.value;
      });

      var bad = [];
      if ((data.name || '').trim().length < 2) bad.push('name');
      if ((data.phone || '').replace(/\D/g, '').length < 10) bad.push('phone');
      $$('[data-required]', form).forEach(function (el) { if (!data[el.getAttribute('data-required')]) bad.push(el.getAttribute('data-required')); });
      if (bad.length) { flag(bad); msg.className = 'form-msg err'; msg.textContent = 'Please fill in the highlighted fields.'; return; }

      btn.disabled = true; btn.textContent = 'Sending…';
      fetch(form.getAttribute('data-endpoint'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }, function () { return { ok: false, j: {} }; }); })
        .then(function (res) {
          if (!res.ok) { flag(Object.keys((res.j && res.j.fields) || {})); throw new Error((res.j && res.j.error) || 'That didn’t go through.'); }
          form.reset();
          msg.className = 'form-msg ok'; msg.textContent = okText;
        })
        .catch(function (err) { msg.className = 'form-msg err'; msg.textContent = err.message + ' You can also call or text Dan at ' + PHONE + '.'; })
        .then(function () { btn.disabled = false; btn.textContent = label; });
    });
    function flag(names) {
      names.forEach(function (n) {
        var el = form.elements[n];
        if (!el) return;
        if (el.length && !el.tagName) { var g = form.querySelector('[data-group="' + n + '"]'); if (g) g.classList.add('invalid'); }
        else el.classList.add('invalid');
      });
      var first = names[0] && form.elements[names[0]];
      if (first) (first.focus ? first : first[0]).focus();
    }
  });
})();
