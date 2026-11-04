/* PROCESS STORY — scene engine for #process.
   One cinematic mode, chosen for every viewport:
   - pin     (motion allowed): one sticky stage and one shared transition engine. Desktop, tablet
             and mobile only change the stage geometry; they never change scene ownership.
   - stack   (reduced motion, or no JS): the plain stacked list from the static HTML.
   The active scene, image, copy, counter and progress rail all derive from the same transition.
   A dissolve waits until the incoming image is loaded and decoded, so the stage is never blank. */
(function () {
  const section = document.getElementById('process');
  if (!section) return;

  const root = document.documentElement;
  const track = section.querySelector('.pst-track');
  const scenes = Array.from(section.querySelectorAll('.pst-scene'));
  const copies = scenes.map(s => s.querySelector('.pst-copy'));
  const steps = scenes.map(s => s.querySelector('.pst-step'));
  const figures = scenes.map(s => s.querySelector('.pst-figure'));
  const imgs = scenes.map(s => s.querySelector('.pst-figure img'));
  const stage = section.querySelector('.pst-stage');
  const progress = section.querySelector('.pst-progress');
  const ticks = Array.from(section.querySelectorAll('.pst-progress a'));
  const tickBars = ticks.map(a => a.querySelector('.pst-tick'));
  const countEl = section.querySelector('.pst-progress-num');
  const N = scenes.length;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const SEG = 0.8;           // pin: viewport heights of track per scene (scrollbar, keyboard and touch scrolling)
  const END_REST = 0.5;      // pin: extra viewport heights on the final scene before the stage releases
  const DURATION = 750;      // ms for one scene-to-scene dissolve
  const THRESHOLD = 60;      // pin: px of wheel travel (after a dissolve settles) that moves one scene
  const GESTURE_GAP = 200;   // pin: ms without wheel input that resets the travel count
  const ENTRY_HOLD = 350;    // pin: ms the first scene holds when scrolling carries the page into the story
  const SETTLE_DELAY = 160;  // pin: ms of scroll inactivity before the page is re-aligned with the active scene
  // Blur is the costliest part of the dissolve on phones; keep it softer there and on low-core devices.
  const LOW_POWER = (navigator.hardwareConcurrency || 8) <= 4;
  const blurMax = () => (mode === 'pin' ? 9 : LOW_POWER ? 4 : 6);

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const ease = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const pad = n => String(n).padStart(2, '0');
  // `behavior: 'instant'` is not supported consistently across Safari/iOS. Temporarily
  // disable CSS smooth scrolling and use the numeric overload for a genuinely immediate jump.
  const jumpScroll = y => {
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    root.style.scrollBehavior = previous;
  };

  let mode = 'stack', segPx = 1, shown = -1;
  // Transition state: dissolving from `from` to `to` with eased progress `t`; `want` is the scene
  // the input currently asks for. Stable when from === to === want.
  let from = 0, to = 0, want = 0, t = 1, startTime = 0, raf = 0, waiting = false;
  // pin: wheel gesture state.
  let acc = 0, lastWheel = 0, lastDir = 0, lastAbs = 0, holdUntil = 0, cameFromOutside = false, coasting = false;
  let settleTimer = 0, progressRaf = 0, touching = false;
  const staged = () => mode === 'pin';
  const decoded = scenes.map(() => false);
  const cache = scenes.map(() => ({ live: null, img: '', copy: '' }));
  const tickCache = ticks.map(() => -1);

  root.classList.add('pst-js');

  /* ---------- rendering (shared) ---------- */

  function setLive(k, live) {
    if (cache[k].live === live) return;
    cache[k].live = live;
    scenes[k].classList.toggle('is-live', live);
  }

  function paint(k, imgCss, copyCss) {
    const c = cache[k];
    if (c.img !== imgCss) { imgs[k].style.cssText = imgCss; c.img = imgCss; }
    if (copyCss !== null && c.copy !== copyCss) { copies[k].style.cssText = copyCss; c.copy = copyCss; }
  }

  function render() {
    if (!staged()) return;
    const moving = from !== to, pin = mode === 'pin', BLUR = blurMax();

    for (let k = 0; k < N; k++) {
      // 0 = settled on this scene; > 0 leaving; < 0 arriving; |x| >= 1 off stage
      const x = !moving ? (k === to ? 0 : 2) : k === from ? t : k === to ? t - 1 : 2;
      if (x <= -1 || x >= 1) { setLive(k, false); paint(k, 'opacity:0', pin ? 'opacity:0' : null); continue; }
      setLive(k, Math.abs(x) > 0.001);

      let o, blur, scale, co, ty;
      if (x >= 0) {            // outgoing: dissolve and soften, drifting very slightly forward
        o = 1 - smooth(0, 0.9, x);
        blur = BLUR * smooth(0, 1, x);
        scale = 1 + 0.015 * x;
        co = 1 - smooth(0.26, 0.49, x);
        ty = -12 * smooth(0.26, 0.49, x);
      } else {                 // incoming: condense out of the haze into a crisp frame
        const s = 1 + x;
        o = smooth(0.1, 1, s);
        blur = BLUR * (1 - smooth(0, 1, s));
        scale = 0.985 + 0.015 * s;
        co = smooth(0.51, 0.74, s);
        ty = 12 * (1 - co);
      }
      paint(k,
        `opacity:${o.toFixed(3)};transform:scale(${scale.toFixed(4)})` + (blur > 0.05 ? `;filter:blur(${blur.toFixed(2)}px)` : ''),
        pin ? `opacity:${co.toFixed(3)}` + (Math.abs(ty) > 0.05 ? `;transform:translate3d(0,${ty.toFixed(2)}px,0)` : '') : null);
    }

    // Keep the authoritative label/progress on the outgoing scene until the full dissolve is
    // complete. This prevents a new counter or progress rail from appearing beside the old image.
    markActive(moving ? from : to, moving ? from : to);
  }

  // The active scene (class, pill counter, aria-current) and the pill's tick fill up to v.
  function markActive(now, v) {
    if (now !== shown) {
      if (shown >= 0) { scenes[shown].classList.remove('is-active'); ticks[shown].removeAttribute('aria-current'); }
      shown = now;
      scenes[shown].classList.add('is-active');
      ticks[shown].setAttribute('aria-current', 'step');
      countEl.textContent = pad(shown + 1);
    }
    for (let k = 0; k < ticks.length; k++) {
      const p = Math.round(clamp(v - k + 1, 0, 1) * 100) / 100;
      if (p !== tickCache[k]) { tickBars[k].style.setProperty('--p', p); tickCache[k] = p; }
    }
    placeMobileProgress();
  }

  // Portrait compact layouts keep the rail immediately after the active copy. It remains an
  // absolutely positioned child of the pinned stage, so it never becomes an independent scroll
  // consumer or a second source of scene state.
  function placeMobileProgress() {
    const viewportWidth = Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
    if (!progress || !stage || mode !== 'pin' || viewportWidth > 959 || !matchMedia('(orientation: portrait)').matches) {
      if (progress) { progress.style.removeProperty('top'); progress.style.removeProperty('bottom'); }
      return;
    }
    const copy = copies[shown >= 0 ? shown : to];
    if (!copy) return;
    const sr = stage.getBoundingClientRect(), cr = copy.getBoundingClientRect();
    const h = progress.offsetHeight || 32;
    const top = clamp(cr.bottom - sr.top + 12, 10, Math.max(10, stage.clientHeight - h - 10));
    progress.style.top = `${Math.round(top)}px`;
    progress.style.bottom = 'auto';
  }
  function scheduleMobileProgress() {
    cancelAnimationFrame(progressRaf);
    progressRaf = requestAnimationFrame(() => {
      // Wait one more frame so Safari has applied the image/font/layout change before
      // measuring the copy. This avoids falling back to the stage's bottom anchor.
      progressRaf = requestAnimationFrame(placeMobileProgress);
    });
  }

  /* ---------- image loading ---------- */

  // Only the scenes around the wanted one are displayed (and therefore fetched); the rest stay
  // display:none, so a phone never downloads all eleven full-resolution images up front.
  // The wanted scene loads first, on its own; its neighbours follow once it has arrived, so on a
  // slow connection the image actually needed is not sharing bandwidth with three others.
  const loaded = k => imgs[k].complete && imgs[k].naturalWidth > 0;
  function prime(k) {
    const ahead = loaded(k);
    for (let j = 0; j < N; j++) {
      const near = j === k || j === to || j === from || (ahead && j >= k - 1 && j <= k + 2);
      imgs[j].classList.toggle('is-near', near);
      if (near && imgs[j].loading !== 'eager') imgs[j].loading = 'eager';
      imgs[j].fetchPriority = j === k ? 'high' : 'auto';
    }
    if (!ahead) imgs[k].addEventListener('load', () => { if (staged()) { prime(want); scheduleMobileProgress(); } }, { once: true });
  }

  // Resolves once image k is loaded and decoded (or has failed). There is deliberately no
  // timeout: on a slow connection the current, sharp scene stays on stage rather than the
  // stage dissolving into an image that has not arrived.
  function whenReady(k) {
    const img = imgs[k];
    const loaded = img.complete && img.naturalWidth
      ? Promise.resolve()
      : new Promise(res => { img.addEventListener('load', res, { once: true }); img.addEventListener('error', res, { once: true }); });
    return loaded.then(() => (img.decode ? img.decode().catch(() => {}) : null));
  }

  /* ---------- transition engine (shared) ---------- */

  let waitFor = -1;
  const busy = () => from !== to || waiting;

  function request(k) {
    want = clamp(k, 0, N - 1);
    // Still waiting for an image the reader has already moved past: re-target.
    if (waiting && waitFor !== want) { waiting = false; waitFor = -1; }
    pump();
  }

  // Start the next dissolve if one is wanted and none is running. A dissolve always finishes
  // first; the latest request then follows from a settled state.
  function pump() {
    if (!staged() || busy() || want === to) return;
    const k = want;
    prime(k);
    if (!decoded[k]) {
      waiting = true; waitFor = k;
      whenReady(k).then(() => {
        decoded[k] = true;
        if (waitFor !== k) return; // superseded by a newer request
        waiting = false; waitFor = -1;
        pump();
      });
      return;
    }
    from = to; to = k; t = 0; startTime = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(step);
  }

  function step(now) {
    if (!staged()) return;
    const p = clamp((now - startTime) / DURATION, 0, 1);
    t = ease(p);
    if (p < 1) { render(); raf = requestAnimationFrame(step); return; }
    from = to; t = 1;
    render();
    prime(to);
    pump();
  }

  // Show scene k immediately in its stable state (mode switches, resizes, history restores).
  function jumpTo(k) {
    cancelAnimationFrame(raf);
    from = to = want = clamp(k, 0, N - 1); t = 1;
    prime(to);
    render();
  }

  /* ---------- pin mode ---------- */

  function measurePin() {
    const vh = window.innerHeight;
    segPx = SEG * vh;
    track.style.height = (vh + (N - 1) * segPx + END_REST * vh) + 'px';
  }

  // Document scroll offset at which scene k is the settled scene.
  function sceneOffset(k) {
    return track.getBoundingClientRect().top + window.scrollY + k * segPx;
  }
  function sceneAtScroll() {
    return Math.round(clamp(-track.getBoundingClientRect().top / segPx, 0, N - 1));
  }

  // Keep the page offset aligned with the active scene once scrolling stops, so the next
  // gesture, the scrollbar and the release into Products all start from a settled position.
  function settle() {
    if (mode !== 'pin' || touching) return;
    const y = window.scrollY, first = sceneOffset(0), last = sceneOffset(N - 1);
    if (y <= first + 1 || y >= last - 1) return; // outside the scene range: natural page scrolling
    const goal = sceneOffset(want);
    if (Math.abs(y - goal) > 1) jumpScroll(goal);
  }

  function onWheel(e) {
    if (mode !== 'pin' || e.ctrlKey) return;
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
    if (!dy || Math.abs(dy) < Math.abs(e.deltaX)) return;

    // Deliberate scrolling keeps moving through the story: while the reader keeps scrolling (steady
    // or rising wheel input, e.g. a mouse wheel kept turning), each stretch of travel after a dissolve
    // moves one more scene, so it never feels stuck. A fading momentum tail (trackpad fling) is
    // only coasting: it cannot start another scene, so one flick still moves one scene.
    const time = performance.now(), dir = Math.sign(dy), abs = Math.abs(dy);
    if (time - lastWheel > GESTURE_GAP || dir !== lastDir) { acc = 0; coasting = false; cameFromOutside = false; }
    else if (abs < lastAbs * 0.9) coasting = true;   // decaying: momentum
    else if (abs > lastAbs * 1.15) coasting = false; // rising again: fresh input
    lastWheel = time; lastDir = dir; lastAbs = abs;

    const y = window.scrollY, first = sceneOffset(0), last = sceneOffset(N - 1);
    // Scrolling back up through the short rest after Scene 11 (stage still pinned, nothing
    // moving on it): land straight on Scene 11 instead of spending scroll on dead space.
    if (dir < 0 && y > last + 1 && y <= last + END_REST * window.innerHeight + 1) {
      e.preventDefault();
      cameFromOutside = false; acc = 0; holdUntil = time + ENTRY_HOLD;
      request(N - 1);
      jumpScroll(last);
      return;
    }
    if (y < first - 1 || y > last + 1) { cameFromOutside = true; return; } // stage not pinned: native scroll

    const moving = busy();
    // Settled on the first/last scene and heading out of the story: give the scroll back to the page.
    if (!moving && time >= holdUntil && ((dir > 0 && to === N - 1) || (dir < 0 && to === 0))) return;

    e.preventDefault();
    // Scrolling that carries the page into the story lands on the scene it arrives at, briefly.
    if (cameFromOutside) { cameFromOutside = false; acc = 0; holdUntil = time + ENTRY_HOLD; return; }
    if (moving || time < holdUntil || coasting) { acc = 0; return; }
    acc += dy;
    if (Math.abs(acc) < THRESHOLD) return;
    acc = 0;
    navigate(to + dir);
  }

  // Arrow / Page / Space keys inside the pinned range move one scene, like a wheel gesture.
  const KEYS = { ArrowDown: 1, PageDown: 1, ' ': 1, ArrowUp: -1, PageUp: -1 };
  function onKey(e) {
    if (mode !== 'pin' || e.altKey || e.ctrlKey || e.metaKey || !(e.key in KEYS)) return;
    if (e.target.closest && e.target.closest('input, textarea, select, button, [contenteditable], .q-modal')) return;
    const dir = e.key === ' ' && e.shiftKey ? -1 : KEYS[e.key];
    const y = window.scrollY, first = sceneOffset(0), last = sceneOffset(N - 1);
    if (y < first - 1 || y > last + 1) return;
    const moving = busy();
    if (!moving && ((dir > 0 && to === N - 1) || (dir < 0 && to === 0))) return; // leave the story natively
    e.preventDefault();
    if (!moving) navigate(to + dir);
  }

  // Touch devices use the same one-gesture/one-scene contract as the wheel engine. Native page
  // scrolling is allowed only when the reader is leaving the story at either boundary.
  let touchY = 0, touchX = 0, touchConsumed = false, touchInside = false;
  const onTouchStart = e => {
    if (mode === 'pin' && e.touches && e.touches.length === 1) {
      touching = true;
      touchConsumed = false;
      touchY = e.touches[0].clientY;
      touchX = e.touches[0].clientX;
      const y = window.scrollY, first = sceneOffset(0), last = sceneOffset(N - 1);
      touchInside = y >= first - 1 && y <= last + END_REST * window.innerHeight + 1;
    }
  };
  const onTouchMove = e => {
    if (!touching || !e.touches || !e.touches.length) return;
    const dy = e.touches[0].clientY - touchY;
    const dx = e.touches[0].clientX - touchX;
    if (touchConsumed) { e.preventDefault(); return; }
    if (!touchInside || Math.abs(dy) < 18 || Math.abs(dy) < Math.abs(dx)) return;
    const dir = dy < 0 ? 1 : -1;
    const leaving = (dir > 0 && to === N - 1) || (dir < 0 && to === 0);
    // Do not cancel the browser's gesture at either story boundary: the reader must
    // still be able to leave the pinned section naturally.
    if (leaving) return;
    // From this point on this touch belongs to the story. Cancelling only after the
    // intent threshold prevents taps, link presses, and tiny finger tremors from
    // freezing page scroll on mobile Safari/Chrome.
    touchConsumed = true;
    e.preventDefault();
  };
  const onTouchEnd = e => {
    const point = e.changedTouches && e.changedTouches[0];
    const dy = point ? point.clientY - touchY : 0;
    const dx = point ? point.clientX - touchX : 0;
    const consumed = touchConsumed;
    const inside = touchInside;
    touching = false;
    touchConsumed = false;
    touchInside = false;
    if (consumed && inside && Math.abs(dy) >= 35 && Math.abs(dy) >= Math.abs(dx)) {
      const dir = dy < 0 ? 1 : -1;
      const leaving = (dir > 0 && to === N - 1) || (dir < 0 && to === 0);
      if (!leaving) { e.preventDefault(); navigate(to + dir); }
    }
    onScroll();
  };
  const onTouchCancel = () => {
    touching = false;
    touchConsumed = false;
    touchInside = false;
  };

  function setPinListeners(on) {
    const m = on ? 'addEventListener' : 'removeEventListener';
    window[m]('wheel', onWheel, { passive: false }); // the only non-passive listener, and only in pin mode
    window[m]('keydown', onKey);
    window[m]('touchstart', onTouchStart, { passive: true });
    window[m]('touchmove', onTouchMove, { passive: false });
    window[m]('touchend', onTouchEnd, { passive: false });
    window[m]('touchcancel', onTouchCancel, { passive: true });
  }

  /* ---------- mode switching ---------- */

  function currentMode() {
    if (reduce.matches) return 'stack';
    return 'pin';
  }

  function teardown() {
    cancelAnimationFrame(raf);
    clearTimeout(settleTimer);
    if (mode === 'pin') setPinListeners(false);
    track.style.height = '';
    scenes.forEach((s, k) => {
      s.classList.remove('is-active', 'is-live');
      imgs[k].style.cssText = ''; copies[k].style.cssText = '';
      imgs[k].classList.remove('is-near');
      cache[k] = { live: null, img: '', copy: '' };
    });
    if (progress) { progress.style.removeProperty('top'); progress.style.removeProperty('bottom'); }
    cancelAnimationFrame(progressRaf);
    ticks.forEach(a => a.removeAttribute('aria-current'));
    tickCache.fill(-1);
    shown = -1; waiting = false; waitFor = -1;
  }

  function enter() {
    if (mode === 'pin') { setPinListeners(true); measurePin(); jumpTo(sceneAtScroll()); settle(); scheduleMobileProgress(); }
  }

  function anchorTo(k) {
    if (mode === 'pin') { measurePin(); jumpTo(k); jumpScroll(sceneOffset(k)); }
  }

  function setMode() {
    const next = currentMode();
    if (next !== mode) {
      const r = section.getBoundingClientRect(), inside = r.top < window.innerHeight && r.bottom > 0;
      const keep = inside && shown >= 0 ? shown : -1;
      teardown();
      mode = next;
      root.classList.toggle('pst-pin', mode === 'pin');
      root.classList.toggle('pst-scrolly', mode === 'scrolly');
      root.classList.toggle('pst-flow', mode === 'flow');
      enter();
      if (keep >= 0) anchorTo(keep);
      scheduleMobileProgress();
      return;
    }
    if (mode === 'pin') {
      // Resize while pinned: keep the scene that is on stage and re-align the page to it,
      // rather than re-deriving the scene from an offset measured with the old geometry.
      const y = window.scrollY, inside = y >= sceneOffset(0) - 1 && y <= sceneOffset(N - 1) + 1;
      const keep = want;
      measurePin(); jumpTo(keep);
      if (inside) jumpScroll(sceneOffset(keep));
      scheduleMobileProgress();
    }
  }
  function onScroll() {
    if (mode === 'pin') {
      // A consumed touch is intentionally held by the scene engine. Ignoring the
      // small native scroll delta here prevents the settle timer from fighting the
      // gesture and snapping the reader back to the previous scene.
      if (touching && touchConsumed) return;
      request(sceneAtScroll());
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, SETTLE_DELAY);
    }
  }

  function navigate(k) {
    k = clamp(k, 0, N - 1);
    request(k);
    if (mode === 'pin') jumpScroll(sceneOffset(k));
    // pin: align the shared stage to the selected scene.
  }

  ticks.forEach((a, k) => a.addEventListener('click', e => {
    if (mode === 'stack') return;
    e.preventDefault();
    navigate(k);
  }));

  // Keyboard users tabbing into a scene that is not on stage: bring that scene on stage.
  scenes.forEach((s, k) => s.addEventListener('focusin', () => {
    if (mode === 'pin' && k !== to) navigate(k);
  }));

  // "Request a Quote" reuses the site's existing quote modal and its validation/submission flow.
  section.querySelectorAll('[data-pst-quote]').forEach(a => a.addEventListener('click', e => {
    const trigger = document.getElementById('requestQuoteBtn');
    if (!trigger) return; // falls back to the #contact anchor
    e.preventDefault();
    trigger.click();
  }));

  // Fetch the opening scenes shortly before the section arrives so the stage is never empty.
  if ('IntersectionObserver' in window) {
    const warm = new IntersectionObserver(entries => {
      if (!entries.some(en => en.isIntersecting)) return;
      if (staged()) prime(want);
      warm.disconnect();
    }, { rootMargin: '150% 0px' });
    warm.observe(section);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', setMode);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', setMode);
  window.addEventListener('load', setMode);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setMode);
  // Back/forward cache restore: re-sync to the restored scroll position without animating.
  window.addEventListener('pageshow', e => { if (e.persisted) { teardown(); enter(); } });
  [reduce].forEach(mq => mq.addEventListener('change', setMode));
  setMode();
})();
