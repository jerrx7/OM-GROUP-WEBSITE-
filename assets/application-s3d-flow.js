/* Shared helpers for rock, sand and aggregate that travels along a looped path in the plant figures.
   The paths used to be stitched together from stretches with hard edges: a stone hopped sideways in depth where one stretch ended and the next began, it was
   teleported from one machine to the next (inside the crusher, over the weir, at the end of the line back to the start), and it popped in and out at full size.
   Those were the flicker. Now a depth offset is blended with smoothsteps, and a traveller grows out of the start of a path and shrinks into its end. */

/* smoothstep of x between a and b */
export const ss = (a, b, x) => { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); };

/* grow / shrink envelope for a traveller at u (0..1) on a looped path: it grows out of the start over `a` and shrinks into the end over `b` */
export const loopEnv = (u, a, b = a) => ss(0, a, u) * ss(0, b, 1 - u);

/* the same for a path made of polyline stretches SEG [{ pts: [V3...], time }] that are not all joined end to start (a hand-over hidden inside a machine,
   or the wrap from the end of the line back to its start): the traveller shrinks away `fade` seconds before every break and grows out `fade` seconds after it */
export function segEnv(SEG, phase, fade = .4) {
  let CYC = 0; for (const s of SEG) CYC += s.time;
  let t = ((phase % CYC) + CYC) % CYC;
  for (let i = 0; i < SEG.length; i++) {
    const sg = SEG[i];
    if (t <= sg.time) {
      if (sg._gi === undefined) {
        const prev = SEG[(i + SEG.length - 1) % SEG.length], next = SEG[(i + 1) % SEG.length];
        sg._gi = prev.pts[prev.pts.length - 1].distanceTo(sg.pts[0]) > .25; sg._go = sg.pts[sg.pts.length - 1].distanceTo(next.pts[0]) > .25;
      }
      let f = 1; if (sg._gi) f *= ss(0, fade, t); if (sg._go) f *= ss(0, fade, sg.time - t); return f;
    }
    t -= sg.time;
  }
  return 1;
}

/* ───────── the OM GROUP logo on the machines ─────────
   The logo decals in the Blender models were lit like painted metal and tone mapped, so the brand orange came out dull, and they were sampled from the model's
   embedded texture. Here every decal uses the supplied logo file itself (assets/om-group-machine-logo.png): its colour is spread into the file's transparent pixels
   (they are black, which would draw a dark fringe round every edge when the picture is minified; the shape and the orange are untouched), full mipmaps and the
   maximum anisotropy, and the decal shows through an emissive channel, so it is not lit, not shaded and not tone mapped: the logo shows its own orange, crisp. */
/* the file starts loading as soon as this module is imported, long before a figure is built, so it is there for the first frame */
const LOGO_IMG = typeof Image !== 'undefined' ? new Image() : null; if (LOGO_IMG) { LOGO_IMG.decoding = 'async'; LOGO_IMG.src = '/assets/om-group-machine-logo.png'; }
export function bleedLogo(img) {
  const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight; const x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, cv.width, cv.height), a = d.data; let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < a.length; i += 4) if (a[i + 3] === 255) { r += a[i]; g += a[i + 1]; b += a[i + 2]; n++; }
  if (n) { r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n); for (let i = 0; i < a.length; i += 4) { a[i] = r; a[i + 1] = g; a[i + 2] = b; } x.putImageData(d, 0, 0); }
  return cv;
}
let LOGO_T = null;
export function logoTexGLB(THREE, aniso = 16) {
  if (LOGO_T) return LOGO_T;
  const t = LOGO_T = new THREE.Texture(); t.flipY = false;   /* the decals' UVs follow the glTF convention */
  t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = aniso;
  const done = () => { t.image = bleedLogo(LOGO_IMG); t.needsUpdate = true; };
  if (LOGO_IMG.complete && LOGO_IMG.naturalWidth) done(); else LOGO_IMG.addEventListener('load', done);
  return t;
}
/* the logo material of a Blender model, changed in place */
export function crispLogo(THREE, m, aniso = 16) {
  if (!m) return;
  const t = logoTexGLB(THREE, aniso);
  m.map = t; m.emissiveMap = t; m.color.setRGB(0, 0, 0); m.emissive.setRGB(1, 1, 1); m.emissiveIntensity = 1; m.envMapIntensity = 0; m.roughness = 1; m.metalness = 0;
  m.toneMapped = false; m.transparent = true; m.depthWrite = false; m.premultipliedAlpha = false; m.alphaTest = 0; m.blending = THREE.NormalBlending;
  m.polygonOffset = true; m.polygonOffsetFactor = -3; m.polygonOffsetUnits = -3; m.needsUpdate = true;
}
