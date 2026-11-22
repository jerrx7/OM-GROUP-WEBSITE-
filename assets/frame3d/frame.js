/* OM GROUP · concrete frame figure (20mm aggregates page). The still fades up once when it is about 30 % on screen. No script: the still simply shows. */
(() => {
  const els = [...document.querySelectorAll('.fr3d')]; if (!els.length) return;
  els.forEach(e => e.classList.add('is-js'));
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('is-in')); return; }
  const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } }), { threshold: 0.3 });
  els.forEach(e => io.observe(e));
})();
