/* OM GROUP - live render progress page.   node scripts/wmm3d/progress.js   ->  http://localhost:4190/
   Reads the Blender logs that scripts/wmm3d/render-gsb2.sh writes to _review/wmm3d/progress/ and shows one bar per job (the poster still and the motion loop of each scene). */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'), LOG = path.join(ROOT, '_review', 'wmm3d', 'progress'), PORT = +process.env.PORT || 4190;
const SCENES = [['load', 'Load distribution · tyre on the pavement'], ['filter', 'Filter and separation · two glass boxes'], ['drain', 'Drainage · outlet working'], ['drainoff', 'Drainage · outlet closed']];
const FRAMES = +process.env.FRAMES || 72;
const tail = f => { try { const s = fs.statSync(f), n = Math.min(s.size, 60000), fd = fs.openSync(f, 'r'), b = Buffer.alloc(n); fs.readSync(fd, b, 0, n, s.size - n); fs.closeSync(fd); return { txt: b.toString('utf8'), mtime: s.mtimeMs, size: s.size, birth: s.birthtimeMs }; } catch (e) { return null; } };
const hms = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ' h ' : '') + m + ' min'; };
function job(scene, kind) {
  const f = path.join(LOG, `${scene}.${kind}.log`), t = tail(f); if (!t) return { state: 'queued', pct: 0, note: 'waiting' };
  const done = /\[lab\] wrote/.test(t.txt), err = /Traceback|Error:/.test(t.txt) && !done, idle = (Date.now() - t.mtime) / 1000;
  if (done) return { state: 'done', pct: 100, note: 'finished' };
  if (err) return { state: 'error', pct: 0, note: 'error: see the log' };
  const fr = [...t.txt.matchAll(/Fra:(\d+)/g)].pop(), sm = [...t.txt.matchAll(/Sample (\d+)\/(\d+)/g)].pop();
  if (kind === 'poster') { const p = sm ? +sm[1] / +sm[2] : 0; return { state: 'running', pct: Math.round(p * 100), note: sm ? `sample ${sm[1]} of ${sm[2]}` : 'building the scene' }; }
  if (!fr) return { state: 'running', pct: 1, note: 'building the scene (stones, textures)', idle };
  const f1 = +fr[1], p = sm ? +sm[1] / +sm[2] : 0, pct = Math.min(99, ((f1 - 1 + p) / FRAMES) * 100);
  const times = [...t.txt.matchAll(/Fra:(\d+)[^\n]*?Time:(\d+):(\d+)\.(\d+)/g)]; let eta = '';
  if (times.length > 3 && f1 > 2) { const last = times[times.length - 1], secs = (+last[2]) * 60 + (+last[3]), first = times.find(x => +x[1] >= 2); if (first) { const s0 = (+first[2]) * 60 + (+first[3]), f0 = +first[1]; if (f1 > f0 && secs > s0) eta = hms((secs - s0) / (f1 - f0) * (FRAMES - f1)); } }
  return { state: 'running', pct: Math.round(pct * 10) / 10, note: `frame ${f1} of ${FRAMES}${eta ? ' · about ' + eta + ' left' : ''}`, idle };
}
function status() {
  const jobs = []; SCENES.forEach(([k, name]) => { jobs.push({ id: k + '.poster', scene: name, what: 'Still poster', w: 1, ...job(k, 'poster') }); jobs.push({ id: k + '.anim', scene: name, what: 'Motion loop (72 frames)', w: 10, ...job(k, 'anim') }); });
  const tot = jobs.reduce((a, j) => a + j.w, 0), got = jobs.reduce((a, j) => a + j.w * j.pct / 100, 0);
  return { jobs, overall: Math.round(got / tot * 1000) / 10, now: new Date().toLocaleTimeString() };
}
const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GSB render progress</title>
<style>
:root{--bg:#f6f4ef;--ink:#16171a;--mut:#6a6c71;--acc:#F15A29;--card:#fff;--line:rgba(20,20,22,.1)}
@media (prefers-color-scheme:dark){:root{--bg:#121214;--ink:#f1f0ec;--mut:#9a9ca1;--card:#1b1b1e;--line:rgba(255,255,255,.1)}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 Inter,system-ui,sans-serif;padding:32px 20px}
.wrap{max-width:880px;margin:0 auto}h1{font:600 28px/1.2 Georgia,serif;margin:0 0 4px}p.s{color:var(--mut);margin:0 0 24px}
.big{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:22px 24px;margin-bottom:18px}
.big b{font:700 44px/1 Inter,sans-serif;letter-spacing:-.02em}.big span{color:var(--mut);margin-left:8px}
.bar{height:16px;border-radius:99px;background:var(--line);overflow:hidden;margin-top:14px;position:relative}
.bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#ff8a5c,var(--acc));transition:width .8s cubic-bezier(.2,.7,.2,1);position:relative;overflow:hidden}
.running .bar i::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.55) 50%,transparent 70%);animation:sh 1.4s linear infinite}
@keyframes sh{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
.job{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 20px;margin-bottom:10px}
.job h3{margin:0;font:600 15px/1.3 Inter,sans-serif;display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.job h3 em{font-style:normal;font-weight:700;font-variant-numeric:tabular-nums}.job small{color:var(--mut);display:block;margin-top:2px}
.job .bar{height:10px;margin-top:10px}.done .bar i{background:#2f9e5b}.error .bar i{background:#b3261e}.queued{opacity:.6}
.tag{display:inline-block;font:700 10.5px/1 Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;padding:4px 8px;border-radius:99px;background:var(--line);margin-right:8px;vertical-align:1px}
.running .tag{background:rgba(241,90,41,.15);color:var(--acc)}.done .tag{background:rgba(47,158,91,.18);color:#2f9e5b}
</style></head><body><div class="wrap"><h1>GSB motion graphics: render progress</h1><p class="s">Updates by itself every 2 seconds. Last update <span id="t">…</span></p>
<div class="big" id="ov"><b id="op">0%</b><span>of everything</span><div class="bar"><i id="ob" style="width:0"></i></div></div><div id="jobs"></div></div>
<script>
async function tick(){try{const r=await fetch('/status',{cache:'no-store'});const d=await r.json();document.getElementById('t').textContent=d.now;
document.getElementById('op').textContent=d.overall+'%';document.getElementById('ob').style.width=d.overall+'%';document.getElementById('ov').className='big '+(d.overall<100?'running':'done');
document.getElementById('jobs').innerHTML=d.jobs.map(j=>'<div class="job '+j.state+'"><h3><span><span class="tag">'+({queued:'waiting',running:'rendering',done:'done',error:'error'})[j.state]+'</span>'+j.scene+' · '+j.what+'</span><em>'+j.pct+'%</em></h3><small>'+j.note+'</small><div class="bar"><i style="width:'+j.pct+'%"></i></div></div>').join('')}catch(e){document.getElementById('t').textContent='waiting for the server…'}}
tick();setInterval(tick,2000);
</script></body></html>`;
http.createServer((q, r) => { if (q.url.startsWith('/status')) { r.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); r.end(JSON.stringify(status())); } else { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(PAGE); } }).listen(PORT, () => console.log('progress page on http://localhost:' + PORT + '/'));
