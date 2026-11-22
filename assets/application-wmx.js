/* OM GROUP - Wet Mix Macadam page: behaviour of the photoreal road-works and laboratory figures (scripts/wmm3d).
   - mirrors each widget's state onto the box (data-view, data-th, data-roll, data-play) so the CSS can react;
   - plays the Blender motion loops (machines driving, drum turning, hammer falling, sieve shaking) only while a figure is on screen and not hidden by a control, and the still stays underneath until the video is running;
   - numbered pins and length / width / thickness bars follow the moving parts from per-frame tables written by the renderer;
   - the loose-to-compacted slider crossfades two synchronised loops; with "Roller moving" on it also sweeps by itself until the visitor takes it over. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches, FPS = 24, cache = {};
  function getJSON(u, cb) {
    if (cache[u]) { if (cache[u].d) cb(cache[u].d); else cache[u].q.push(cb); return; }
    cache[u] = { q: [cb] };
    fetch(u).then(function (r) { return r.json(); }).then(function (d) { var q = cache[u].q; cache[u] = { d: d }; q.forEach(function (f) { f(d); }); }).catch(function () {});
  }
  [].slice.call(document.querySelectorAll('.wmx')).forEach(function (box) {
    var st = {}; try { st = JSON.parse(box.getAttribute('data-init') || '{}'); } catch (e) {}
    var toggle = box.querySelector('[data-toggle="play"]'), vids = [].slice.call(box.querySelectorAll('video.wmx-vid')), visible = false, raf = 0, t0 = 0;
    var mirror = function () { Object.keys(st).forEach(function (k) { box.setAttribute('data-' + k, String(st[k])); }); };
    mirror();

    /* ---- video playback ---- */
    var wanted = function (v) { return !reduce && visible && v.offsetParent !== null && !(toggle && !st.play); };
    function sync() {
      vids.forEach(function (v) {
        if (wanted(v)) {
          if (!v.getAttribute('src')) { v.setAttribute('src', v.getAttribute('data-src')); v.load(); }
          var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
        } else if (!v.paused) v.pause();
      });
    }
    vids.forEach(function (v) {
      v.muted = true;
      v.addEventListener('playing', function () { v.classList.add('on'); });
      var pinsU = v.getAttribute('data-pins'), frU = v.getAttribute('data-frames'), scope = v.closest('.wmx-view') || v.parentNode, pins = null, frames = null;
      var marks = [].slice.call(scope.querySelectorAll('[data-pin]')), lines = [].slice.call(scope.querySelectorAll('line[data-k],circle[data-k]')), polys = [].slice.call(scope.querySelectorAll('polygon[data-pts]'));
      if (pinsU) getJSON(pinsU, function (d) { pins = d; });
      if (frU) getJSON(frU, function (d) { frames = d; });
      function apply(t) {
        var fi = Math.round(t * FPS);
        if (pins) marks.forEach(function (m) {
          var a = pins[m.getAttribute('data-pin')]; if (!a) return; var p = a[fi % a.length]; if (!p) return;
          m.style.left = (p[0] * 100).toFixed(2) + '%'; m.style.top = (p[1] * 100).toFixed(2) + '%'; m.hidden = !(p[0] > .015 && p[0] < .985 && p[1] > .02 && p[1] < .98);
        });
        if (pins) polys.forEach(function (pg) {
          var ps = pg.getAttribute('data-pts').split(',').map(function (k) { var a = pins[k]; return a && a[fi % a.length]; }); if (ps.every(Boolean)) pg.setAttribute('points', ps.map(function (q) { return (q[0] * 100).toFixed(2) + ',' + (q[1] * 50).toFixed(2); }).join(' '));
        });
        if (frames) lines.forEach(function (el) {
          var a = frames[el.getAttribute('data-k')]; if (!a) return; var f = a[fi % a.length]; if (!f) return; var ax = f[+el.getAttribute('data-a')];
          if (el.tagName === 'line') { el.setAttribute('x1', (ax[0][0] * 100).toFixed(2)); el.setAttribute('y1', (ax[0][1] * 62.5).toFixed(2)); el.setAttribute('x2', (ax[1][0] * 100).toFixed(2)); el.setAttribute('y2', (ax[1][1] * 62.5).toFixed(2)); }
          else { var e = ax[+el.getAttribute('data-e')]; el.setAttribute('cx', (e[0] * 100).toFixed(2)); el.setAttribute('cy', (e[1] * 62.5).toFixed(2)); }
        });
      }
      if (pinsU || frU) {
        if (v.requestVideoFrameCallback) { var cb = function (n, meta) { apply(meta.mediaTime); v.requestVideoFrameCallback(cb); }; v.requestVideoFrameCallback(cb); }
        else { var loop = function () { if (!v.paused) apply(v.currentTime); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
      }
    });
    /* the two loops of a compaction pair run in step: the loose one leads, the compacted one is nudged back if it drifts */
    var pair = box.querySelectorAll('.wmx-pair');
    [].forEach.call(pair, function (p) {
      var a = p.querySelector('.wmx-l0 video'), b = p.querySelector('.wmx-l1 video'); if (!a || !b) return;
      var al = function () { if (Math.abs(a.currentTime - b.currentTime) > .05) b.currentTime = a.currentTime; }; a.addEventListener('playing', al); b.addEventListener('playing', al);
      setInterval(function () { if (!a.paused && !b.paused && Math.abs(a.currentTime - b.currentTime) > .09) b.currentTime = a.currentTime; }, 1200);
    });

    /* ---- loose-to-compacted slider ---- */
    var rng = box.querySelector('input[data-range="comp"]');
    var set = function (v) { box.style.setProperty('--c', (v / 100).toFixed(3)); };
    var tick = function (t) {
      if (!t0) t0 = t; var u = ((t - t0) / 5200) % 2, v = u < 1 ? u : 2 - u; v = v * v * (3 - 2 * v);
      rng.value = String(Math.round(v * 100)); set(v * 100); raf = requestAnimationFrame(tick);
    };
    function run() { cancelAnimationFrame(raf); if (!rng) return; raf = 0; if (st.play && visible && !reduce) { t0 = 0; raf = requestAnimationFrame(tick); } }
    if (rng) rng.addEventListener('input', function () {
      set(+rng.value); cancelAnimationFrame(raf); raf = 0;
      if (st.play) { var b = box.querySelector('[data-toggle="play"]'); if (b) b.click(); }
    });
    if (rng) set(+rng.value || 0);

    /* ---- widget state ---- */
    box.addEventListener('s3dstate', function (e) { st[e.detail.key] = e.detail.val; mirror(); setTimeout(sync, 40); if (e.detail.key === 'play') run(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; sync(); run(); }, { threshold: .12, rootMargin: '120px 0px' }).observe(box); else { visible = true; sync(); }

  });
})();
