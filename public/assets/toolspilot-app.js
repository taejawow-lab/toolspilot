/* ToolsPilot — shared interactions */
(function () {
  'use strict';

  /* ---------- theme ---------- */
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem('tp-theme'); } catch (e) {}
  if (saved) { root.setAttribute('data-theme', saved); }
  else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    root.setAttribute('data-theme', 'dark');
  }
  function toggleTheme() {
    var cur = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    var next = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('tp-theme', next); } catch (e) {}
  }

  /* ---------- drawer ---------- */
  function openDrawer() { var d = document.getElementById('drawer'); if (d) d.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeDrawer() { var d = document.getElementById('drawer'); if (d) d.classList.remove('open'); document.body.style.overflow = ''; }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-action]');
    if (!t) {
      if (e.target.id === 'drawer' || e.target.classList.contains('drawer__scrim')) closeDrawer();
      return;
    }
    var a = t.getAttribute('data-action');
    if (a === 'theme') toggleTheme();
    else if (a === 'open-menu') openDrawer();
    else if (a === 'close-menu') closeDrawer();
  });

  /* ---------- reveal on scroll (above-the-fold stays visible) ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.remove('pre'); en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });
    var fold = window.innerHeight * 0.92;
    revealEls.forEach(function (el, i) {
      var top = el.getBoundingClientRect().top;
      if (top > fold) { el.classList.add('pre'); el.style.transitionDelay = (Math.min(i % 3, 3) * 70) + 'ms'; io.observe(el); }
    });
  }

  /* ---------- reading progress ---------- */
  var bar = document.getElementById('progress-bar');
  var article = document.getElementById('article-body');
  if (bar && article) {
    var onScroll = function () {
      var rect = article.getBoundingClientRect();
      var total = article.offsetHeight - window.innerHeight;
      var passed = -rect.top;
      var p = total > 0 ? Math.min(1, Math.max(0, passed / total)) : 0;
      bar.style.width = (p * 100) + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }

  /* ---------- TOC scroll-spy ---------- */
  var tocLinks = document.querySelectorAll('.toc a[href^="#"]');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    tocLinks.forEach(function (l) { map[l.getAttribute('href').slice(1)] = l; });
    var heads = [];
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) heads.push(el); });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          tocLinks.forEach(function (l) { l.classList.remove('active'); });
          var lk = map[en.target.id];
          if (lk) lk.classList.add('active');
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });
    heads.forEach(function (h) { spy.observe(h); });
  }

  /* ---------- category filter + search ---------- */
  var filterRoot = document.getElementById('filter-root');
  if (filterRoot) {
    var chips = filterRoot.querySelectorAll('.chip[data-cat]');
    var items = document.querySelectorAll('[data-card]');
    var searchInput = document.getElementById('archive-search');
    var emptyState = document.getElementById('empty-state');
    var countOut = document.getElementById('result-count');
    var activeCat = 'all';

    function apply() {
      var q = (searchInput && searchInput.value || '').trim().toLowerCase();
      var shown = 0;
      items.forEach(function (it) {
        var cat = it.getAttribute('data-cat') || '';
        var text = (it.getAttribute('data-search') || it.textContent || '').toLowerCase();
        var okCat = activeCat === 'all' || cat === activeCat;
        var okQ = !q || text.indexOf(q) !== -1;
        var vis = okCat && okQ;
        it.style.display = vis ? '' : 'none';
        if (vis) shown++;
      });
      if (emptyState) emptyState.style.display = shown ? 'none' : '';
      if (countOut) countOut.textContent = shown;
    }
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        chips.forEach(function (x) { x.classList.remove('is-active'); x.setAttribute('aria-pressed', 'false'); });
        c.classList.add('is-active'); c.setAttribute('aria-pressed', 'true');
        activeCat = c.getAttribute('data-cat');
        apply();
      });
    });
    if (searchInput) searchInput.addEventListener('input', apply);
    apply();
  }

  /* ---------- "/" focuses search ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/INPUT|TEXTAREA/.test((document.activeElement || {}).tagName || '')) {
      var s = document.querySelector('[data-search-focus]');
      if (s) { e.preventDefault(); s.focus(); }
    }
    if (e.key === 'Escape') closeDrawer();
  });

  /* ---------- newsletter fake submit ---------- */
  document.querySelectorAll('form[data-newsletter]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var wrap = f.parentElement;
      f.style.display = 'none';
      var ok = document.createElement('div');
      ok.className = 'nl-ok';
      ok.style.cssText = 'display:flex;align-items:center;gap:10px;font-weight:600;font-size:1.05rem;';
      ok.innerHTML = '<svg viewBox="0 0 24 24" fill="none" width="24" height="24" style="flex:none"><circle cx="12" cy="12" r="11" fill="currentColor" opacity=".15"/><path d="M7 12.5l3.2 3.2L17 9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg> You\u2019re on the list \u2014 check your inbox to confirm.';
      wrap.appendChild(ok);
    });
  });

})();
