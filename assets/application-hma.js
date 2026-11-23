/* OM GROUP - Hot Mix Asphalt application page: click tracking, jump bar, reading progress, scroll reveals, the explorers and the browser-only tools.
   Nothing here is needed to read the page: with no script every block is visible and every link works.
   The charts and the calculator run on the visitor's own numbers in the browser; nothing is stored or sent, and no specification value is built in. */
(function () {
  'use strict';
  var APP = 'hot-mix-asphalt';
  var reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var dl = function (o) { window.dataLayer = window.dataLayer || []; o.application = APP; window.dataLayer.push(o); };

  /* GTM events: only the action and where it happened are sent, never anything typed */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-ev]');
    if (!a) return;
    var path = ''; try { var u = new URL(a.href, location.href); if (/^https?:$/.test(u.protocol)) path = u.pathname; } catch (_) {}
    dl({ event: a.getAttribute('data-ev'), click_location: a.getAttribute('data-loc') || '', link_path: path });
  }, true);

  /* jump bar: mark the section on screen */
  var bar = $('#toc ul'), links = $$('#toc a');
  if (bar && links.length && 'IntersectionObserver' in window) {
    var byId = {}; links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var current = null;
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var a = byId[en.target.id]; if (!a || a === current) return;
        if (current) current.classList.remove('on');
        a.classList.add('on'); current = a;
        var left = a.offsetLeft - (bar.clientWidth - a.offsetWidth) / 2;
        if (bar.scrollWidth > bar.clientWidth) bar.scrollTo({ left: left, behavior: reduce ? 'auto' : 'smooth' });
      });
    }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });
    Object.keys(byId).forEach(function (id) { var s = document.getElementById(id); if (s) so.observe(s); });
  }

  /* reading progress */
  var prog = $('#apProgress');
  if (prog) {
    var ticking = false, paint = function () {
      ticking = false;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      prog.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0) + ')';
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
    paint();
  }

  /* scroll reveals: blocks that begin below the fold are armed, then shown as they approach; the rest is simply there */
  var scrollDriven = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
  var els = $$('[data-rv]');
  if (els.length && 'IntersectionObserver' in window && !reduce) {
    var vh = window.innerHeight, owner = new Map();
    var show = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { var el = owner.get(en.target); if (el) el.classList.add('rv-on'); show.unobserve(en.target); } });
    }, { rootMargin: '0px 0px 8% 0px', threshold: 0.12 });
    var first = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        first.unobserve(en.target);
        var el = owner.get(en.target);
        if (!el || en.isIntersecting || en.boundingClientRect.top <= vh * 0.95) { owner.delete(en.target); return; }
        var v = el.getAttribute('data-rv');
        el.classList.add('rv'); if (v) el.classList.add('rv-' + v);
        show.observe(en.target);
      });
    });
    els.forEach(function (el) {
      var v = el.getAttribute('data-rv');
      if (v === 'photo' && scrollDriven) return;
      if (el.closest('.hma-st')) return;           /* states inside explorers are shown by the explorer, not by scrolling */
      var watched = v === 'photo' ? el.parentNode : el;
      owner.set(watched, el); first.observe(watched);
    });
  }

  /* ───────── explorers: one state at a time (data-set / data-when), the same state machine as the other application pages ───────── */
  function plainBind(box) {
    if (box.__plain) return; box.__plain = true;
    var st = {}; try { st = JSON.parse(box.getAttribute('data-init') || '{}'); } catch (e) {}
    var parse = function (s) { var i = s.indexOf(':'); return [s.slice(0, i), s.slice(i + 1)]; };
    var sync = function () {
      $$('[data-set]', box).forEach(function (b) { var p = parse(b.getAttribute('data-set')); b.setAttribute('aria-pressed', String(st[p[0]]) === p[1] ? 'true' : 'false'); });
      $$('[data-toggle]', box).forEach(function (b) { b.setAttribute('aria-pressed', st[b.getAttribute('data-toggle')] ? 'true' : 'false'); });
      $$('[data-when]', box).forEach(function (pn) {
        var on = pn.getAttribute('data-when').split(',').some(function (c) { var q = parse(c.trim()); return String(st[q[0]]) === q[1]; });
        pn.classList.toggle('on', on); if (on) pn.removeAttribute('hidden'); else pn.setAttribute('hidden', '');
      });
      Object.keys(st).forEach(function (k) { box.setAttribute('data-' + k, String(st[k])); });
    };
    var set = function (k, v) { st[k] = v; sync(); box.dispatchEvent(new CustomEvent('s3dstate', { detail: { key: k, val: v, state: st }, bubbles: true })); };
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-set],[data-toggle]'); if (!b || !box.contains(b)) return;
      if (b.hasAttribute('data-set')) { var p = parse(b.getAttribute('data-set')), v = p[1]; if (v === 'true') v = true; else if (v === 'false') v = false; else if (v !== '' && !isNaN(+v)) v = +v; set(p[0], v); }
      else { var k = b.getAttribute('data-toggle'); set(k, !st[k]); }
    });
    box.classList.add('s3d-ready', 's3d-plain'); sync();
  }
  $$('.s3d-box[data-ex]').forEach(plainBind);

  /* the 26-stage journey: previous / next, the phase tabs, the route line with the stage you are on, and "play the journey" (it walks through the stages by itself until you take over) */
  (function () {
    var box = $('.hma-proc'); if (!box) return;
    var ticks = $$('.hma-tk', box), pts = $$('.hma-pt', box), nowS = $('.hma-now small', box), nowB = $('.hma-now b', box), play = $('[data-hma-play]', box), N = ticks.length, timer = 0, vis = false;
    var GL = pts.map(function (p) { return $('.hma-pt-l', p).textContent; });
    function cur() { var c = $('.hma-tk[aria-pressed="true"]', box); return c ? +c.getAttribute('data-set').split(':')[1] : 1; }
    function go(n) { var t = $('.hma-tk[data-set="stg:' + n + '"]', box); if (t) t.click(); }
    function show(n) {
      ticks.forEach(function (t, i) { t.classList.toggle('done', i < n - 1); });
      var t = ticks[n - 1]; if (!t) return; var g = +t.getAttribute('data-g');
      pts.forEach(function (p, i) { p.classList.toggle('on', i === g); });
      nowS.textContent = GL[g] + ' · stage ' + (n < 10 ? '0' : '') + n + ' of ' + N; nowB.textContent = t.getAttribute('data-t');
    }
    box.addEventListener('s3dstate', function (e) { if (e.detail.key === 'stg') show(+e.detail.val); });
    show(1);
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-hma-step]'); if (!b || !box.contains(b)) return;
      stop(); var n = cur() + (+b.getAttribute('data-hma-step')); if (n >= 1 && n <= N) go(n);
    });
    box.addEventListener('click', function (e) { if (e.target.closest('.hma-tk,.hma-pt')) stop(); });
    box.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var n = cur() + (e.key === 'ArrowRight' ? 1 : -1); if (n >= 1 && n <= N && e.target.closest('.hma-route')) { e.preventDefault(); stop(); go(n); var t = ticks[n - 1]; if (t) t.focus(); } } });
    function stop() { clearInterval(timer); timer = 0; if (play) { play.setAttribute('aria-pressed', 'false'); $('.hma-play-t', play).textContent = 'Play the journey'; } }
    function start() { if (timer) return; play.setAttribute('aria-pressed', 'true'); $('.hma-play-t', play).textContent = 'Pause'; timer = setInterval(function () { if (!vis) return; var n = cur(); go(n >= N ? 1 : n + 1); }, 6500); }
    if (play) play.addEventListener('click', function () { if (timer) stop(); else { if (cur() >= N) go(1); start(); } });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }, { threshold: .25 }).observe(box); else vis = true;
  })();

  /* which control was used (no personal data) */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.s3d-box [data-set],.s3d-box [data-toggle]'); if (!b) return;
    var box = b.closest('.s3d-box'), item = (b.getAttribute('data-set') || '').split(':');
    var ev = box.getAttribute('data-evbox'); if (ev) dl({ event: ev, item: item[1] || '' });
    dl({ event: 'hot_mix_interaction', figure: box.getAttribute('data-s3d') || (box.hasAttribute('data-ex') ? 'explorer' : ''), control: item[0] || '' });
  }, true);

  /* the real cut-block pavement scene (shared engine): loaded only when it is near, never with Save-Data, with a plain fallback */
  var boxes = $$('.s3d-box[data-s3d]');
  if (boxes.length) {
    var glOk = false; try { var pc = document.createElement('canvas'); glOk = !!(pc.getContext('webgl2') || pc.getContext('webgl')); } catch (e) {}
    var cn = navigator.connection || {};
    if (!glOk || cn.saveData || !('IntersectionObserver' in window)) boxes.forEach(plainBind);
    else {
      var loaded = false, go = function () {
        if (loaded) return; loaded = true;
        import('/assets/application-s3d.js').then(function (m) { if (!m.init(document)) boxes.forEach(plainBind); }).catch(function () { boxes.forEach(plainBind); });
      };
      var sio = new IntersectionObserver(function (es) { if (es.some(function (x) { return x.isIntersecting; })) { sio.disconnect(); go(); } }, { rootMargin: '800px 0px' });
      boxes.forEach(function (b) { sio.observe(b); });
    }
  }

  /* ───────── helpers for the browser-only tools ───────── */
  var NS = 'http://www.w3.org/2000/svg';
  function el(n, a, t) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); if (t != null) e.textContent = t; return e; }
  function clear(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }
  var num = function (v) { v = String(v == null ? '' : v).replace(',', '.').trim(); if (v === '') return null; var n = +v; return isNaN(n) ? NaN : n; };
  var once = function (flag, fn) { var done = false; return function () { if (done) return; done = true; fn(); }; };

  /* ───────── gradation chart: only the visitor's numbers, log sieve axis ───────── */
  (function () {
    var root = $('#hmaGrade'); if (!root) return;
    var svg = $('#hmaGradeSvg'), msg = $('#hmaGradeMsg'), ins = $$('input[data-gr]', root);
    var S = ['37.5', '26.5', '19', '13.2', '9.5', '4.75', '2.36', '1.18', '0.6', '0.3', '0.15', '0.075'];
    var X0 = 60, X1 = 618, Y0 = 20, Y1 = 478, LMIN = Math.log(0.075), LMAX = Math.log(37.5);
    var X = function (s) { return X0 + (Math.log(+s) - LMIN) / (LMAX - LMIN) * (X1 - X0); }, Y = function (p) { return Y1 - p / 100 * (Y1 - Y0); };
    var tracked = once(0, function () { dl({ event: 'hot_mix_calculator_use', tool: 'gradation' }); });
    var narrow = false;
    function frame(empty) {
      narrow = svg.clientWidth > 0 && svg.clientWidth < 440; svg.classList.toggle('narrow', narrow);
      /* side by side: stretch the plot to the height of the input table so the chart column is not left half empty */
      Y1 = 478;
      var form = $('.hma-tool-form', root), sc = svg.clientWidth / 640;
      if (form && sc > 0 && !narrow && window.matchMedia('(min-width:900px)').matches) {
        var other = svg.parentNode.offsetHeight - svg.getBoundingClientRect().height;
        Y1 = Math.max(478, Math.min(760, Math.floor((form.offsetHeight - other) / sc - 72)));
      }
      svg.setAttribute('viewBox', '0 0 640 ' + (Y1 + 72));
      clear(svg);
      for (var g = 0; g <= 100; g += 20) { svg.appendChild(el('line', { x1: X0, x2: X1, y1: Y(g), y2: Y(g), class: 'g' })); svg.appendChild(el('text', { x: X0 - 10, y: Y(g) + 4.5, 'text-anchor': 'end', class: 'ax' }, g)); }
      S.forEach(function (s, i) { svg.appendChild(el('line', { x1: X(s), x2: X(s), y1: Y0, y2: Y1, class: 'g v' })); if (!narrow || i % 2 === 0) svg.appendChild(el('text', { x: X(s), y: Y1 + (narrow ? 26 : 20), 'text-anchor': 'middle', class: 'ax' }, s)); });
      svg.appendChild(el('text', { x: 14, y: (Y0 + Y1) / 2, transform: 'rotate(-90 14 ' + (Y0 + Y1) / 2 + ')', 'text-anchor': 'middle', class: 'ax t' }, '% passing by mass'));
      svg.appendChild(el('text', { x: (X0 + X1) / 2, y: Y1 + 58, 'text-anchor': 'middle', class: 'ax t' }, 'IS sieve size, mm (log scale)'));
      if (empty) svg.appendChild(el('text', { x: (X0 + X1) / 2, y: (Y0 + Y1) / 2 + 5, 'text-anchor': 'middle', class: 'ghost' }, 'Your grading curve appears here'));
    }
    function draw() {
      var d = { lo: {}, hi: {}, mid: {} }, bad = false, any = false;
      ins.forEach(function (i) { var v = num(i.value), k = i.getAttribute('data-gr'), s = i.getAttribute('data-s'); if (v === null) { i.removeAttribute('aria-invalid'); return; } if (isNaN(v) || v < 0 || v > 100) { bad = true; i.setAttribute('aria-invalid', 'true'); return; } i.removeAttribute('aria-invalid'); d[k][s] = v; any = true; });
      frame(!any && !bad);
      if (bad) { msg.textContent = 'Each value must be a percentage between 0 and 100.'; return; }
      if (!any) { msg.textContent = 'The chart is empty until you enter values.'; return; }
      tracked();
      var pts = function (k) { return S.filter(function (s) { return d[k][s] != null; }).map(function (s) { return [X(s), Y(d[k][s]), s]; }); };
      var lo = pts('lo'), hi = pts('hi'), mid = pts('mid');
      var both = S.filter(function (s) { return d.lo[s] != null && d.hi[s] != null; });
      if (both.length > 1) svg.insertBefore(el('polygon', { points: both.map(function (s) { return X(s) + ',' + Y(d.hi[s]); }).concat(both.slice().reverse().map(function (s) { return X(s) + ',' + Y(d.lo[s]); })).join(' '), class: 'band' }), svg.firstChild);
      [lo, hi].forEach(function (a) { if (a.length > 1) svg.appendChild(el('polyline', { points: a.map(function (p) { return p[0] + ',' + p[1]; }).join(' '), class: 'lim' })); a.forEach(function (p) { svg.appendChild(el('circle', { cx: p[0], cy: p[1], r: 3.6, fill: '#2a2b2e' })); }); });
      if (mid.length > 1) svg.appendChild(el('polyline', { points: mid.map(function (p) { return p[0] + ',' + p[1]; }).join(' '), class: 'mid' }));
      mid.forEach(function (p) { svg.appendChild(el('circle', { cx: p[0], cy: p[1], r: 5.2, class: 'pt' })); });
      var out = S.filter(function (s) { return d.mid[s] != null && ((d.lo[s] != null && d.mid[s] < d.lo[s]) || (d.hi[s] != null && d.mid[s] > d.hi[s])); });
      msg.textContent = out.length ? 'Check: at ' + out.join(', ') + ' mm the combined grading you entered is outside the limits you entered.' : 'This is a plot of your own numbers. It is not a test result or an approval.';
    }
    frame(true); window.addEventListener('resize', function () { draw(); });
    ins.forEach(function (i) { i.addEventListener('input', draw); });
    $('#hmaGradeClear').addEventListener('click', function () { ins.forEach(function (i) { i.value = ''; i.removeAttribute('aria-invalid'); }); draw(); });
  })();

  /* ───────── temperature chart: the visitor's approved ranges only ───────── */
  (function () {
    var root = $('#hmaTemp'); if (!root) return;
    var svg = $('#hmaTempSvg'), msg = $('#hmaTempMsg'), ins = $$('input[data-t]', root);
    var N = ['Binder storage', 'Aggregate heating', 'Mixing', 'Mix discharge', 'Truck loading', 'Transport', 'Site receipt', 'Paver placement', 'Initial compaction', 'Intermediate and final rolling'];
    var tracked = once(0, function () { dl({ event: 'hot_mix_calculator_use', tool: 'temperature' }); });
    var TOP = 18, RH = 38, AX0 = 252, AX1 = 614, YB = TOP + N.length * RH, narrow = false;
    function skeleton() {
      narrow = svg.clientWidth > 0 && svg.clientWidth < 440; svg.classList.toggle('narrow', narrow); AX0 = narrow ? 64 : 252;
      /* side by side: stretch the plot to the height of the input table, so the chart rows line up with the stage rows and no column is left empty */
      RH = 38;
      var form = $('.hma-tool-form', root), sc = svg.clientWidth / 640;
      if (form && sc > 0 && !narrow && window.matchMedia('(min-width:900px)').matches) {
        var other = svg.parentNode.offsetHeight - svg.getBoundingClientRect().height;
        RH = Math.max(38, Math.min(92, Math.floor(((form.offsetHeight - other) / sc - TOP - 72) / N.length)));
      }
      YB = TOP + N.length * RH; svg.setAttribute('viewBox', '0 0 640 ' + (YB + 72));
      clear(svg);
      N.forEach(function (n, i) {
        var y = TOP + i * RH;
        if (i % 2 === 0) svg.appendChild(el('rect', { x: 0, y: y, width: 640, height: RH, class: 'bd' }));
        svg.appendChild(el('text', { x: 14, y: y + RH / 2 + 4.5, class: 'rn' }, i + 1));
        if (!narrow) svg.appendChild(el('text', { x: 34, y: y + RH / 2 + 4.5, class: 'rl' }, n));
      });
    }
    function draw() {
      skeleton();
      var rows = N.map(function (n, i) { var lo = num($('[data-t="lo"][data-i="' + i + '"]', root).value), hi = num($('[data-t="hi"][data-i="' + i + '"]', root).value); return { n: n, lo: lo, hi: hi }; });
      var bad = rows.some(function (r) { return isNaN(r.lo) || isNaN(r.hi) || (r.lo != null && r.hi != null && r.lo > r.hi); });
      var have = rows.filter(function (r) { return r.lo != null || r.hi != null; });
      if (bad) { msg.textContent = 'Enter numbers only, with the lowest value not above the highest.'; return; }
      if (!have.length) { svg.appendChild(el('text', { x: (AX0 + AX1) / 2, y: (TOP + YB) / 2 + 5, 'text-anchor': 'middle', class: 'ghost' }, 'Your temperature ranges appear here')); svg.appendChild(el('text', { x: (AX0 + AX1) / 2, y: YB + 40, 'text-anchor': 'middle', class: 'ax t' }, 'Approved temperature, °C (your values)')); msg.textContent = 'The chart is empty until you enter values.'; return; }
      tracked();
      var vals = []; have.forEach(function (r) { if (r.lo != null) vals.push(r.lo); if (r.hi != null) vals.push(r.hi); });
      var mn = Math.floor((Math.min.apply(null, vals) - 10) / 10) * 10, mx = Math.ceil((Math.max.apply(null, vals) + 10) / 10) * 10, step = (mx - mn) > 120 ? 20 : 10;
      var X = function (v) { return AX0 + (v - mn) / (mx - mn) * (AX1 - AX0); };
      for (var v = mn; v <= mx; v += step) { svg.appendChild(el('line', { x1: X(v), x2: X(v), y1: TOP, y2: YB, class: 'g' })); svg.appendChild(el('text', { x: X(v), y: YB + 20, 'text-anchor': 'middle', class: 'ax' }, v)); }
      svg.appendChild(el('text', { x: (AX0 + AX1) / 2, y: YB + 44, 'text-anchor': 'middle', class: 'ax t' }, 'Approved temperature, °C (your values)'));
      rows.forEach(function (r, i) {
        if (r.lo == null && r.hi == null) return;
        var y = TOP + i * RH + RH / 2, a = r.lo != null ? r.lo : r.hi, b = r.hi != null ? r.hi : r.lo;
        if (a === b) svg.appendChild(el('circle', { cx: X(a), cy: y, r: 7, class: 'pt' }));
        else svg.appendChild(el('rect', { x: X(a), y: y - Math.min(13, RH * .21), width: Math.max(6, X(b) - X(a)), height: Math.min(26, RH * .42), rx: 8, class: 'rng' }));
        var lab = a === b ? a + '°' : a + '–' + b + '°', right = X(b) + 12 + lab.length * 7 < 636;
        svg.appendChild(el('text', { x: right ? X(b) + 10 : X(a) - 10, y: y + 4.5, 'text-anchor': right ? 'start' : 'end', class: 'ax t' }, lab));
      });
      msg.textContent = 'This is a plot of your own approved ranges. No temperature is built into the page.';
    }
    draw(); window.addEventListener('resize', function () { draw(); });
    ins.forEach(function (i) { i.addEventListener('input', draw); });
    $('#hmaTempClear').addEventListener('click', function () { ins.forEach(function (i) { i.value = ''; }); draw(); });
  })();

  /* ───────── quantity calculator: length x width x thickness, then x the density the visitor enters ───────── */
  (function () {
    var f = $('#hmaCalc'); if (!f) return;
    var vol = $('#hmaVol'), mass = $('#hmaMass'), msg = $('#hmaCalcMsg'), q = function (k) { return $('[data-q="' + k + '"]', f); };
    var fmt = function (n, d) { return n.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d }); };
    var tracked = once(0, function () { dl({ event: 'hot_mix_calculator_use', tool: 'quantity' }); });
    function calc() {
      var L = num(q('len').value), W = num(q('wid').value), T = num(q('thk').value), D = num(q('den').value);
      var a = [L, W, T, D];
      if (a.some(function (x) { return x !== null && (isNaN(x) || x <= 0); })) { vol.textContent = '—'; mass.textContent = '—'; msg.textContent = 'Enter positive numbers only.'; return; }
      if (L == null || W == null || T == null) { vol.textContent = '—'; mass.textContent = '—'; msg.textContent = 'Enter the four values. The density must come from your approved mix design; none is assumed.'; return; }
      var v = L * W * T / 1000; vol.textContent = fmt(v, 2) + ' m³'; tracked();
      if (D == null) { mass.textContent = '—'; msg.textContent = 'Volume calculated. Enter the approved compacted density to get the theoretical mass.'; return; }
      mass.textContent = fmt(v * D, 2) + ' t'; msg.textContent = 'Theoretical compacted mass. Final procurement and payment quantities follow the approved mix density, the BOQ and the measurement method.';
    }
    f.addEventListener('input', calc);
    $('#hmaCalcClear').addEventListener('click', function () { ['len', 'wid', 'thk', 'den'].forEach(function (k) { q(k).value = ''; }); calc(); });
    $('#hmaCalcEx').addEventListener('click', function () { q('len').value = '1000'; q('wid').value = '7'; q('thk').value = '50'; q('den').value = '2.40'; calc(); msg.textContent = 'Worked example filled in. The 2.40 t/m³ density is an example only, not a recommended density.'; });
    calc();
  })();

  /* ───────── enquiry builder: the answers become the message of the standard enquiry form (a link on this site; nothing is sent) ───────── */
  (function () {
    var f = $('#hmaBuild'); if (!f) return;
    var go = $('#hmaGo'), sum = $('#hmaSum'), base = '/?category=Stone%20Aggregates';
    var get = function (k) { var e = $('[data-b="' + k + '"]', f); return e ? e.value.trim().replace(/\s+/g, ' ').slice(0, 90) : ''; };
    var build = function () {
      var bits = ['Hot Mix Asphalt enquiry'];
      if (get('mix')) bits.push('Mix type: ' + get('mix'));
      if (get('ptype')) bits.push('Project type: ' + get('ptype'));
      if (get('spec')) bits.push('Specification: ' + get('spec'));
      if (get('rev') && !/^Not sure/.test(get('rev'))) bits.push('MoRTH revision: ' + get('rev'));
      if (get('jmf') && !/^Not sure/.test(get('jmf'))) bits.push('JMF available: ' + get('jmf'));
      if (get('bg')) bits.push('Binder grade: ' + get('bg'));
      if (get('qty')) bits.push('Quantity: ' + get('qty') + ' tonnes');
      if (get('loc')) bits.push('Delivery location: ' + get('loc'));
      if (get('date')) bits.push('Delivery date: ' + get('date'));
      if (get('sched') && !/^To be/.test(get('sched'))) bits.push('Delivery schedule: ' + get('sched'));
      var dim = [['len', 'length', 'm'], ['wid', 'width', 'm'], ['thk', 'layer thickness', 'mm']].filter(function (d) { return get(d[0]); }).map(function (d) { return d[1] + ' ' + get(d[0]) + ' ' + d[2]; });
      if (dim.length) bits.push('Road: ' + dim.join(', '));
      if (get('pave') && !/^To be/.test(get('pave'))) bits.push('Paving: ' + get('pave'));
      if (get('docs') && get('docs') !== 'None yet') bits.push('Documentation: ' + get('docs'));
      bits.push('Please confirm availability and supply arrangements');
      var text = bits.join('. ') + '.';
      sum.textContent = 'Your message will read: “' + text + '”';
      var q = parseFloat((get('qty') || '').replace(/,/g, '')), extra = '';
      if (q > 0) extra += '&qty=' + encodeURIComponent(String(Math.round(q * 100) / 100)) + '&unit=Tonnes';
      if (get('loc')) extra += '&loc=' + encodeURIComponent(get('loc'));
      go.setAttribute('href', base + '&message=' + encodeURIComponent(text) + extra + '#contact');
    };
    f.addEventListener('input', build); f.addEventListener('change', build); build();
    var started = once(0, function () { dl({ event: 'hot_mix_form_start', click_location: 'builder' }); });
    f.addEventListener('input', started);
    var mixSeen = once(0, function () { dl({ event: 'hot_mix_mix_type_select', click_location: 'builder' }); }), qSeen = once(0, function () { dl({ event: 'hot_mix_quantity_submit', click_location: 'builder' }); }), lSeen = once(0, function () { dl({ event: 'hot_mix_location_submit', click_location: 'builder' }); });
    var m = $('[data-b="mix"]', f), qq = $('[data-b="qty"]', f), ll = $('[data-b="loc"]', f);
    if (m) m.addEventListener('change', function () { if (m.value) mixSeen(); });
    if (qq) qq.addEventListener('change', function () { if (qq.value.trim()) qSeen(); });
    if (ll) ll.addEventListener('change', function () { if (ll.value.trim()) lSeen(); });
  })();

  /* ───────── funnel: the stage and standards sections were viewed (once each, no personal data) ───────── */
  (function () {
    if (!('IntersectionObserver' in window)) return;
    var map = { process: 'hot_mix_process_section_view', standards: 'hot_mix_standards_view', quality: 'hot_mix_quality_view' };
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (!en.isIntersecting) return; io.unobserve(en.target); dl({ event: map[en.target.id] }); }); }, { threshold: .25 });
    Object.keys(map).forEach(function (id) { var e = document.getElementById(id); if (e) io.observe(e); });
  })();
})();
