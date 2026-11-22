/* MoRTH Fifth Revision Table 400-1 (traditional GSB gradings): percentage by weight passing the IS sieve, [low, high].
   null = no value specified at that sieve in the table (NOT zero). For 0.075 mm, Gradings I to IV say "Less than 5", drawn here as 0 to 5.
   This is the traditional Fifth Revision reference only: it is not a universal requirement and not an OM GROUP result. */
export const SIEVES = [75, 53, 26.5, 9.5, 4.75, 2.36, 0.85, 0.425, 0.075];
export const GRADINGS = {
  I: [[100, 100], [80, 100], [55, 90], [35, 65], [25, 55], [20, 40], null, [10, 15], [0, 5]],
  II: [null, [100, 100], [70, 100], [50, 80], [40, 65], [30, 50], null, [10, 15], [0, 5]],
  III: [null, [100, 100], [55, 75], null, [10, 30], null, null, null, [0, 5]],
  IV: [null, [100, 100], [50, 80], null, [15, 35], null, null, null, [0, 5]],
  V: [[100, 100], [80, 100], [55, 90], [35, 65], [25, 50], [10, 20], [2, 10], [0, 5], null],
  VI: [null, [100, 100], [75, 100], [55, 75], [30, 55], [10, 25], null, [0, 8], [0, 3]],
};
/* a cumulative curve for a grading: the middle of each specified range, interpolated on a log scale across unspecified sieves.
   It exists only to draw particles and curves. It is not a sample, a blend or a test result. */
export function midCurve(g) {
  const pts = []; GRADINGS[g].forEach((r, i) => { if (r) pts.push([SIEVES[i], (r[0] + r[1]) / 2]); });
  pts.sort((a, b) => a[0] - b[0]); if (pts[0][0] > 0.05) pts.unshift([0.05, 0]); if (pts[pts.length - 1][1] < 100) pts.push([pts[pts.length - 1][0] * 1.3, 100]);
  return pts;
}
export function passingAt(g, d) {
  const p = midCurve(g); if (d <= p[0][0]) return p[0][1]; for (let i = 1; i < p.length; i++) { if (d <= p[i][0]) { const t = (Math.log(d) - Math.log(p[i - 1][0])) / (Math.log(p[i][0]) - Math.log(p[i - 1][0])); return p[i - 1][1] + t * (p[i][1] - p[i - 1][1]); } } return 100;
}
/* a particle size (mm) drawn from the example curve by mass fraction: u in [0,1] */
export function sizeAt(g, u) {
  const p = midCurve(g), v = u * 100; for (let i = 1; i < p.length; i++) { if (v <= p[i][1]) { const t = (v - p[i - 1][1]) / Math.max(1e-6, p[i][1] - p[i - 1][1]); return Math.exp(Math.log(p[i - 1][0]) + t * (Math.log(p[i][0]) - Math.log(p[i - 1][0]))); } } return p[p.length - 1][0];
}
