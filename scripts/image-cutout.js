// Product-photo background/shadow removal for the OM Group product-page
// family (developed while building the 12.5mm aggregate and M-Sand hero /
// specification images — see HANDOVER.md at the repo root for the full
// story of why each step exists before changing this).
//
// USAGE
//   npm install sharp   (once, wherever this runs from)
//   node image-cutout.js <sourcePhoto> <outDir> <outBasename> [targetWidth] [radius] [debloomBand] [debloomMargin]
//
// Example:
//   node image-cutout.js "../products/washed-sand-sample.png" ../img/products om-group-washed-sand-single-sample-transparent 900 4 34 28
//
// Produces <outBasename>.png/.webp (transparent) plus four
// test-<outBasename>-on-{white,cream,grey,dark}.png composites for QA —
// ALWAYS eyeball the dark one before shipping; that's where fringe/halo
// shows up that's invisible against the site's own cream (#FAF8F3) bg.
//
// WHAT THIS DOES AND WHY (read before tuning parameters)
//
// 1. Background/shadow flood-fill (isCandidate + BFS from the image
//    border): a pixel is "background" if it's both low-variance (smooth,
//    5x5 window) and low-saturation (neutral grey/white), flood-filled
//    from the border inward. This is what removes the plain white
//    studio backdrop AND the soft photographic contact shadow beneath
//    the product in one pass — both are smooth+neutral, so one test
//    catches both. Stone/sand grain texture is high-frequency (fails the
//    variance test) so it survives regardless of brightness.
//
// 2. DISK-shaped morphological opening (erode then dilate by the same
//    Euclidean-radius kernel), not a square one. A square structuring
//    element leaves visible rectangular/boxy artifacts on any thin
//    surviving feature (we hit this on the M-Sand pour stream — a
//    faint but real rectangle appeared right where the thin stream met
//    the disk kernel's corners). This pass exists to drop small isolated
//    speckle/dust artifacts near the silhouette, keeping only the
//    largest connected blob.
//
// 3. De-bloom pass (the one that actually matters most): sampling raw
//    RGBA pixel-by-pixel across a "fringe" boundary on the M-Sand photos
//    showed a smooth, FULLY OPAQUE brightness ramp (~150→250+ over
//    ~20px) baked into the source render/photo itself — a rim-glow/bloom
//    effect riding on top of real grain texture, which is why passes 1-2
//    never touch it (it's neither low-variance-enough nor disconnected).
//    No amount of erosion radius removes this, because eroding shrinks
//    the bloom band by the same amount it shrinks the core — they're
//    fused. The fix: within DEBLOOM_BAND px of the silhouette edge, any
//    pixel brighter than (the material's OWN deep-interior average
//    luminance + DEBLOOM_MARGIN) gets its alpha faded proportionally to
//    that excess brightness. Deep-interior pixels (genuine bright grain
//    flecks far from any edge) are explicitly excluded so real texture
//    isn't eaten.
//
// DIAGNOSING A NEW SOURCE PHOTO: don't guess parameters. Run pass 1
// output through a raw-pixel sampler across the visible fringe (see
// HANDOVER.md for the exact snippet) to check whether you're looking at
// (a) sparse disconnected background specks — passes 1-2 handle it,
// tune RADIUS; (b) a hard rectangular edge — check for a square kernel
// bug or a canvas-boundary crop cutting through opaque content, don't
// just add more erosion; or (c) a smooth opaque brightness ramp like
// the M-Sand case — that's pass 3, tune DEBLOOM_BAND/DEBLOOM_MARGIN.
//
// IF THE SOURCE HAS A THIN SPARSE FEATURE (e.g. a pour stream) that
// still shows a hard cut at the image's own canvas edge after all three
// passes: don't fight it further at the pixel level. Apply a CSS
// mask-image linear-gradient fade on the <img> itself in the page (see
// #heroImg, #specStoneImg in products/m-sand/index.html) — fading the
// top ~14% of the image to transparent hides the canvas boundary
// regardless of per-pixel alpha, and it's what actually shipped for
// M-Sand after the pixel-level fixes weren't enough on their own.
const sharp = require('sharp');
const path = require('path');

const SRC = process.argv[2];
const OUT_DIR = process.argv[3];
const OUT_BASENAME = process.argv[4];
const TARGET_W = parseInt(process.argv[5] || '900', 10);
const RADIUS = parseInt(process.argv[6] || '4', 10);
const DEBLOOM_BAND = parseInt(process.argv[7] || '34', 10);
const DEBLOOM_MARGIN = parseInt(process.argv[8] || '28', 10);

async function main() {
  const img = sharp(SRC).rotate();
  const { data, info } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const idx = (x, y) => y * w + x;
  const dirs8 = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  const dirs4 = [[1,0],[-1,0],[0,1],[0,-1]];

  const lum = new Float32Array(w * h);
  const sat = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i*4], g = data[i*4+1], b = data[i*4+2];
    lum[i] = 0.299*r + 0.587*g + 0.114*b;
    sat[i] = Math.max(r,g,b) - Math.min(r,g,b);
  }

  const VR = 2;
  const variance = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x-VR), x1 = Math.min(w-1, x+VR);
      const y0 = Math.max(0, y-VR), y1 = Math.min(h-1, y+VR);
      let sum = 0, sumSq = 0, n = 0;
      for (let yy = y0; yy <= y1; yy++) {
        for (let xx = x0; xx <= x1; xx++) {
          const v = lum[idx(xx,yy)];
          sum += v; sumSq += v*v; n++;
        }
      }
      const mean = sum / n;
      variance[idx(x,y)] = sumSq / n - mean * mean;
    }
  }

  const VAR_THRESH = 55;
  const SAT_THRESH = 16;
  function isCandidate(x, y) {
    const i = idx(x, y);
    return variance[i] < VAR_THRESH && sat[i] < SAT_THRESH;
  }

  // Pass 1: background/shadow flood fill from border
  const bgMask = new Uint8Array(w * h);
  const queue = [];
  for (let x = 0; x < w; x++) for (const y of [0, h-1]) if (isCandidate(x,y)) { const i=idx(x,y); if(!bgMask[i]){bgMask[i]=1;queue.push([x,y]);} }
  for (let y = 0; y < h; y++) for (const x of [0, w-1]) if (isCandidate(x,y)) { const i=idx(x,y); if(!bgMask[i]){bgMask[i]=1;queue.push([x,y]);} }
  let qi = 0;
  while (qi < queue.length) {
    const [x,y] = queue[qi++];
    for (const [dx,dy] of dirs8) {
      const nx=x+dx, ny=y+dy;
      if (nx<0||ny<0||nx>=w||ny>=h) continue;
      const ni = idx(nx,ny);
      if (bgMask[ni]) continue;
      if (isCandidate(nx,ny)) { bgMask[ni]=1; queue.push([nx,ny]); }
    }
  }
  const fg = new Uint8Array(w*h);
  for (let i=0;i<w*h;i++) fg[i] = bgMask[i] ? 0 : 1;

  // Average colour of the flood-filled background, used later to
  // decontaminate semi-transparent edge pixels (see Pass 5).
  let bgSumR=0, bgSumG=0, bgSumB=0, bgN=0;
  for (let i=0;i<w*h;i++) if (bgMask[i]) { bgSumR+=data[i*4]; bgSumG+=data[i*4+1]; bgSumB+=data[i*4+2]; bgN++; }
  const bgR = bgN>0 ? bgSumR/bgN : 254, bgG = bgN>0 ? bgSumG/bgN : 254, bgB = bgN>0 ? bgSumB/bgN : 254;

  // Pass 2: disk-shaped morphological opening — small radius, general
  // matte/speckle cleanup only, not relied on for the bloom band
  const diskOffsets = [];
  for (let dy=-RADIUS; dy<=RADIUS; dy++) for (let dx=-RADIUS; dx<=RADIUS; dx++) if (dx*dx+dy*dy<=RADIUS*RADIUS) diskOffsets.push([dx,dy]);
  function erodeDisk(mask){ const out=new Uint8Array(w*h); for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=1; for(const[dx,dy] of diskOffsets){const nx=x+dx,ny=y+dy; if(nx<0||ny<0||nx>=w||ny>=h){v=0;break;} if(!mask[idx(nx,ny)]){v=0;break;}} out[idx(x,y)]=v;} return out; }
  function dilateDisk(mask){ const out=new Uint8Array(w*h); for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=0; for(const[dx,dy] of diskOffsets){const nx=x+dx,ny=y+dy; if(nx<0||ny<0||nx>=w||ny>=h)continue; if(mask[idx(nx,ny)]){v=1;break;}} out[idx(x,y)]=v;} return out; }

  const eroded = erodeDisk(fg);
  const visited = new Int32Array(w*h).fill(-1);
  let bestLabel=-1, bestSize=0, label=0;
  const stack=[];
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
    const i=idx(x,y);
    if (!eroded[i] || visited[i]!==-1) continue;
    let size=0; stack.push(i); visited[i]=label;
    while(stack.length){ const ci=stack.pop(); size++; const cx=ci%w, cy=(ci-cx)/w;
      for (const [dx,dy] of dirs4){ const nx=cx+dx, ny=cy+dy; if(nx<0||ny<0||nx>=w||ny>=h)continue; const ni=idx(nx,ny); if(eroded[ni] && visited[ni]===-1){visited[ni]=label;stack.push(ni);} } }
    if (size>bestSize){bestSize=size;bestLabel=label;} label++;
  }
  const isolatedCore = new Uint8Array(w*h);
  for (let i=0;i<w*h;i++) isolatedCore[i] = (visited[i]===bestLabel)?1:0;
  let core = dilateDisk(isolatedCore);
  for (let i=0;i<w*h;i++) if (core[i] && !fg[i]) core[i]=0;

  // Pass 3: multi-source BFS distance transform from non-core, capped at DEBLOOM_BAND
  const dist = new Int32Array(w*h).fill(-1);
  const dq = [];
  for (let i=0;i<w*h;i++) if (!core[i]) { dist[i]=0; dq.push(i); }
  let dqi=0;
  while (dqi < dq.length) {
    const ci = dq[dqi++];
    if (dist[ci] >= DEBLOOM_BAND) continue;
    const cx = ci % w, cy = (ci-cx)/w;
    for (const [dx,dy] of dirs8) {
      const nx=cx+dx, ny=cy+dy;
      if (nx<0||ny<0||nx>=w||ny>=h) continue;
      const ni = idx(nx,ny);
      if (dist[ni] !== -1) continue;
      dist[ni] = dist[ci] + 1;
      dq.push(ni);
    }
  }

  // interior reference luminance/colour: core pixels never reached by
  // the capped BFS (i.e. genuinely deep interior, dist === -1)
  let sumInt=0, nInt=0;
  let sumIntR=0, sumIntG=0, sumIntB=0;
  for (let i=0;i<w*h;i++) if (core[i] && dist[i] === -1) { sumInt += lum[i]; sumIntR+=data[i*4]; sumIntG+=data[i*4+1]; sumIntB+=data[i*4+2]; nInt++; }
  const interiorLum = nInt > 0 ? sumInt/nInt : 140;
  const interiorR = nInt > 0 ? sumIntR/nInt : 130, interiorG = nInt > 0 ? sumIntG/nInt : 130, interiorB = nInt > 0 ? sumIntB/nInt : 130;

  // Pass 4: de-bloom
  const alpha = new Float32Array(w*h);
  for (let i=0;i<w*h;i++) alpha[i] = core[i] ? 255 : 0;

  for (let y=0;y<h;y++){
    for (let x=0;x<w;x++){
      const i = idx(x,y);
      if (!core[i]) continue;
      const d = dist[i];
      if (d === -1 || d > DEBLOOM_BAND) continue; // deep interior, untouched
      const excess = lum[i] - (interiorLum + DEBLOOM_MARGIN);
      if (excess <= 0) continue;
      if (sat[i] > 30) continue; // colored pixels aren't bloom, leave them
      const fade = Math.min(1, excess / 45);
      alpha[i] = Math.max(0, alpha[i] * (1 - fade));
    }
  }

  // Alpha contrast: steepen the soft-to-opaque transition so the
  // translucent boundary band is narrower. A wide, gently-graded alpha
  // ramp is exactly the material a naive downscale/resample filter needs
  // to produce visible ringing/fringing on a high-frequency texture like
  // this (dense white mineral veining right up to the silhouette edge);
  // narrowing the ramp gives any such filter less to smear. Centred on
  // 50% grey so fully-transparent/fully-opaque pixels are untouched.
  const ALPHA_CONTRAST = 1.6;
  for (let i=0;i<w*h;i++) {
    const a = alpha[i] / 255;
    if (a <= 0 || a >= 1) continue;
    const sharpened = Math.min(1, Math.max(0, (a - 0.5) * ALPHA_CONTRAST + 0.5));
    alpha[i] = sharpened * 255;
  }

  const out = Buffer.from(data);
  for (let i=0;i<w*h;i++) out[i*4+3] = Math.max(0, Math.min(255, Math.round(alpha[i])));

  // Pass 5: colour decontamination. Every semi-transparent edge pixel
  // still carries its ORIGINAL straight-alpha RGB, which is a blend of
  // the true material colour and the studio background colour (bgR/G/B)
  // — e.g. rgba(186,219,233, alpha=131) is a stone edge at ~51% opacity
  // whose stored colour is still mostly background-white. Composited by
  // hand against a single flat colour (the "test-on-X" composites, or a
  // solid-colour <img> background) this looks fine — alpha correctly
  // dilutes it. But any resize/minify step that filters RGB and alpha
  // independently (mipmap/bilinear downscaling — what a browser does
  // whenever the image is displayed smaller than its native pixels,
  // which is the common case for a responsive hero/spec image) blends
  // that bright residual colour across neighbouring pixels BEFORE the
  // page ever gets to alpha-composite it, producing a visible white/grey
  // halo that traces every stone's silhouette. This is invisible in the
  // on-dark QA composite (which composites at native resolution with no
  // resize) and is the actual cause of the "pasted-on cutout" look — not
  // the alpha mask itself, which is already clean.
  //
  // Fix: unmix the true foreground colour out of every partial-alpha
  // pixel — true = (observed - bg*(1-a)) / a — then damp that estimate
  // toward the material's own interior colour as alpha approaches zero,
  // so even a near-invisible fringe pixel can never carry a bright/white
  // RGB value into a downstream resize.
  for (let i=0;i<w*h;i++){
    const a255 = out[i*4+3];
    if (a255 <= 0 || a255 >= 255) continue; // fully transparent or fully opaque: nothing to decontaminate
    const af = a255/255;
    const obsR = data[i*4], obsG = data[i*4+1], obsB = data[i*4+2];
    const deconR = (obsR - bgR*(1-af)) / af;
    const deconG = (obsG - bgG*(1-af)) / af;
    const deconB = (obsB - bgB*(1-af)) / af;
    const t = Math.min(1, af / 0.5); // full trust in the decontaminated estimate by 50% alpha; blend toward interior colour below that
    const finalR = deconR*t + interiorR*(1-t);
    const finalG = deconG*t + interiorG*(1-t);
    const finalB = deconB*t + interiorB*(1-t);
    out[i*4]   = Math.max(0, Math.min(255, Math.round(finalR)));
    out[i*4+1] = Math.max(0, Math.min(255, Math.round(finalG)));
    out[i*4+2] = Math.max(0, Math.min(255, Math.round(finalB)));
  }

  let minX=w,minY=h,maxX=0,maxY=0;
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) if (out[idx(x,y)*4+3] > 10) {
    if (x<minX) minX=x; if (x>maxX) maxX=x; if (y<minY) minY=y; if (y>maxY) maxY=y;
  }
  const padX = Math.round((maxX-minX)*0.03);
  const padY = Math.round((maxY-minY)*0.03);
  minX = Math.max(0,minX-padX); minY = Math.max(0,minY-padY);
  maxX = Math.min(w-1,maxX+padX); maxY = Math.min(h-1,maxY+padY);
  const cropW = maxX-minX+1, cropH = maxY-minY+1;

  const base = sharp(out, { raw: { width: w, height: h, channels: 4 } }).extract({ left:minX, top:minY, width:cropW, height:cropH });
  const outW = Math.min(TARGET_W, cropW);
  const resized = await base.resize({ width: outW }).png().toBuffer();
  const finalMeta = await sharp(resized).metadata();

  await sharp(resized).png({ compressionLevel: 9 }).toFile(path.join(OUT_DIR, OUT_BASENAME + '.png'));
  await sharp(resized).webp({ quality: 92 }).toFile(path.join(OUT_DIR, OUT_BASENAME + '.webp'));
  console.log('output size:', finalMeta.width, finalMeta.height, 'interiorLum:', interiorLum.toFixed(1));

  for (const [name, bg] of [['white','#ffffff'],['cream','#FAF8F3'],['grey','#e5e5e5'],['dark','#000000']]) {
    await sharp({ create: { width: finalMeta.width, height: finalMeta.height, channels: 3, background: bg } })
      .composite([{ input: resized }]).png().toFile(path.join(OUT_DIR, `test-${OUT_BASENAME}-on-${name}.png`));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
