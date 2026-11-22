"""OM GROUP - ready-mix batching plant (Ready-mix concrete page, "How RMC is produced"), the 3D twin of the plant drawn in the home page's Connected Operations section.

  blender -b --factory-startup -P scripts/excavator3d/build-plant.py -- <repo root> [--quick]

Output
  assets/3d/om-group-rmc-plant.glb      the plant: four aggregate bins on their frame with the material piles, gathering belt, inclined conveyor, mixing tower with weigh hoppers,
                                        water vessel, pan mixer, two cement silos with screw conveyors, control cabin. (The transit mixer under the tower is the truck model, om-group-transit-mixer.glb.)
  assets/3d/om-group-rmc-plant.json     anchors the web scene needs (belt paths, outlets, bin positions, shadow frame)
  assets/3d/om-group-rmc-plant-shadow.webp   a Cycles contact-shadow / ambient-occlusion pass of the plant on the ground (alpha only)
  _review/excavator3d/om-group-rmc-plant.blend

Layout follows the home-page drawing (operations-art.js plant()), 1 drawing unit = 1/40 m, so the proportions are the same: bins x 0..512, incline to the tower head at (884, 604),
tower columns 850 / 930 / 1050 / 1130, decks at 330 / 440 / 540, mixer pan centred x = 990, silos at x = 1290 / 1430. Drawing depth is invented: bins 3.1 m deep, tower 4.8 m, silos set back.
Metres, three.js axes (x right, y up, z toward the viewer); helpers come from bpy_helpers.py.
"""
import bpy, bmesh, math, json, os, sys, random
import numpy as np
from mathutils import Vector, Matrix, noise

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd()); QUICK = '--quick' in argv
OUT = os.path.join(ROOT, '_review', 'excavator3d'); TEX = os.path.join(OUT, 'tex'); os.makedirs(TEX, exist_ok=True)
GLB = os.path.join(ROOT, 'assets', '3d', 'om-group-rmc-plant.glb')
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene; scene.unit_settings.system = 'METRIC'
exec(open(os.path.join(ROOT, 'scripts', 'excavator3d', 'bpy_helpers.py')).read())
U = lambda v: v / 40.0            # drawing units -> metres
rnd = random.Random(11)

# ---------------------------------------------------------------- textures and materials
def corr_normal(name, ribs, depth=1.0):
    N = 512; x = np.arange(N); h = np.tile(np.sin(2 * np.pi * ribs * x / N)[None, :], (N, 1)); h += .25 * np.sin(4 * np.pi * ribs * x / N)[None, :]
    return save_img(name, normal_from_height(h * .6 * depth, 1.0), 'Non-Color')
def noisy(name, base, var, seed, spl=None, speck=0.0, streak=0.0, nstr=.5, rough=(.6, .15), metal=0.0, scale=1.0):
    r = np.random.default_rng(seed); N = 512; n1, n2, n3 = pnoise(r, N, 1.1), pnoise(r, N, .5), pnoise(r, N, 2.0)
    a = np.empty((N, N, 3)); a[:] = base; a *= (1 + var * (.6 * n1 + .4 * n2))[..., None]
    if spl is not None: m = np.clip((n1 - .8) * 2.0, 0, 1) * np.clip(.6 + .4 * n3, 0, 1); a = a * (1 - m[..., None]) + np.array(spl) * m[..., None]
    if speck: s = (r.random((N, N)) < speck).astype(float) * r.uniform(.4, 1.0, (N, N)); a = a * (1 - s[..., None] * .6) + s[..., None] * .35 * np.array(base)
    if streak: sr = pnoise(r, N, 1.6); st = np.repeat(sr[:1, :], N, axis=0) * .6 + sr * .4; a *= (1 - streak * np.clip(st * .5 + .3, 0, 1))[..., None]
    a = np.clip(a, 0, 1); h = .5 * n1 + .3 * n2 + .25 * n3
    al = save_img(name + '_a', a, 'sRGB'); nm = save_img(name + '_n', normal_from_height(h * .09 * scale, 1.0), 'Non-Color'); rg = save_img(name + '_r', np.clip(rough[0] + rough[1] * h / (np.abs(h).max() + 1e-9), .05, 1), 'Non-Color')
    return pbr(name, al, metal, .6, nm, nstr, rg)
IMG_CORR = corr_normal('corr_n', 18)
ORANGE = tuple(c * .92 for c in srgb('#FF5E29'))
MAT.update({
    'panel': pbr('PanelWhite', (.80, .79, .76), 0.0, .42, IMG_CORR, .9, rough_img('panel', .42, .05), coat=.2),
    'vessel': pbr('VesselWhite', (.84, .83, .80), 0.0, .38, IMG_N, .22, rough_img('vessel', .38, .05), coat=.3),
    'vesselD': pbr('VesselShade', (.58, .57, .55), .3, .45, IMG_N, .3, rough_img('vesselD', .45, .06)),
    'orangeRail': pbr('SafetyOrange', ORANGE, 0.0, .4, IMG_N, .15, rough_img('orangeR', .4, .04), coat=.3),
    'beam': pbr('BeamSteel', (.095, .10, .108), .75, .5, IMG_RN, .5, rough_img('beam', .5, .1)),
    'galv': pbr('GalvSteel', (.58, .60, .62), 1.0, .36, IMG_N, .35, rough_img('galv', .36, .08)),
    'grate': pbr('GratingSteel', (.34, .35, .37), 1.0, .42, IMG_RN, .6, rough_img('grate', .42, .1)),
    'belt': pbr('BeltRubber', (.018, .018, .02), 0.0, .7, IMG_RN, .9),
    'roller': pbr('RollerSteel', (.28, .29, .30), 1.0, .38, IMG_N, .3, rough_img('roller', .38, .07)),
    'green': pbr('ValveGreen', (.02, .30, .14), 0.0, .35, IMG_N, .15),
    'glassP': pbr('CabinGlass', (.03, .05, .065), 0.0, .04, opacity=.82),
    'pipeBlue': pbr('PipeSteelBlue', (.34, .45, .55), .6, .34, IMG_N, .25, rough_img('pipeb', .34, .05)),
    'motor': pbr('MotorGrey', (.10, .105, .115), .6, .45, IMG_N, .4, rough_img('motor', .45, .07)),
    'cone': pbr('ConeGrey', (.66, .65, .62), .25, .4, IMG_N, .3, rough_img('cone', .4, .06), coat=.15),
    'concrete': noisy('Concrete', (.80, .775, .735), .08, 21, spl=(.68, .66, .62), speck=.012, streak=0.0, nstr=.35, rough=(.86, .08)),
    'footing': noisy('Footing', (.44, .435, .42), .25, 22, speck=.03, streak=.45, nstr=.6, rough=(.85, .1)),
    'pileA': noisy('PileBasalt', (.07, .072, .08), .6, 31, spl=(.2, .2, .21), speck=.05, nstr=1.4, rough=(.78, .2)),
    'pileB': noisy('PileGrey', (.20, .205, .215), .55, 32, spl=(.34, .34, .35), speck=.05, nstr=1.4, rough=(.8, .2)),
    'pileSand': noisy('PileSand', (.58, .44, .27), .28, 33, speck=.2, nstr=.8, rough=(.92, .06), scale=1.5),
    'pileFine': noisy('PileFine', (.34, .345, .35), .3, 34, speck=.2, nstr=.8, rough=(.9, .08), scale=1.5),
    'screw': pbr('ScrewOrange', ORANGE, 0.0, .45, IMG_N, .2, rough_img('screw', .45, .05), coat=.2),
})
MAT['orange'] = pbr('PaintOrangeMark', ORANGE, 0.0, .45, IMG_N, .15)

# ---------------------------------------------------------------- accumulators
ACC = {}
def A(key):
    if key not in ACC: ACC[key] = bmesh.new()
    return ACC[key]
def flush(key, name, mat, bevel=0.0, seg=1, tile=1.2, parent=None):
    if key in ACC and len(ACC[key].verts): return new_obj(name, ACC.pop(key), mat, parent, bevel=bevel, bev_seg=seg, tile=tile)
root = empty('OMGroupRMCPlant')
def beam(bm, a, b, w=.2, h=.2):              # a box beam between two points (three coords)
    d = V(*b) - V(*a); m = Matrix.Translation((V(*a) + V(*b)) / 2) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
    bmesh.ops.create_cube(bm, size=1.0, matrix=m @ Matrix.Diagonal((w, h, d.length, 1)))
def hbeam(bm, a, b, w=.2, h=.2): beam(bm, a, b, w, h)
def xbrace(bm, x0, x1, y0, y1, z, r=.035, axis='z'):
    if axis == 'z': cyl_between(bm, (x0, y0, z), (x1, y1, z), r, 6); cyl_between(bm, (x0, y1, z), (x1, y0, z), r, 6)
    else: cyl_between(bm, (z, y0, x0), (z, y1, x1), r, 6); cyl_between(bm, (z, y1, x0), (z, y0, x1), r, 6)
def rail_run(bm, bp, p0, p1, h=1.1, step=1.3, y=0.0, r=.025):
    """a handrail along a horizontal run p0 -> p1 (x, z) at height y: posts, top and mid rail"""
    a = Vector(p0); b = Vector(p1); L = (b - a).length; n = max(1, int(L / step)); pts = [a + (b - a) * i / n for i in range(n + 1)]
    for p in pts: cyl_between(bp, (p.x, y, p.y), (p.x, y + h, p.y), r, 6)
    for k in (h, h * .52): cyl_between(bm, (a.x, y + k, a.y), (b.x, y + k, b.y), r, 6)
def deck(x0, x1, y, z0, z1, t=.1, rails=True, hole=None):
    g = A('grate'); xs = [x0, x1]
    if hole is None: add_box(g, ((x0 + x1) / 2, y, (z0 + z1) / 2), (x1 - x0, t, z1 - z0))
    else:
        hx0, hx1, hz0, hz1 = hole
        add_box(g, ((x0 + hx0) / 2, y, (z0 + z1) / 2), (hx0 - x0, t, z1 - z0)); add_box(g, ((hx1 + x1) / 2, y, (z0 + z1) / 2), (x1 - hx1, t, z1 - z0))
        add_box(g, ((hx0 + hx1) / 2, y, (z0 + hz0) / 2), (hx1 - hx0, t, hz0 - z0)); add_box(g, ((hx0 + hx1) / 2, y, (hz1 + z1) / 2), (hx1 - hx0, t, z1 - hz1))
    bb = A('beam'); add_box(bb, ((x0 + x1) / 2, y - .12, z0), (x1 - x0, .2, .12)); add_box(bb, ((x0 + x1) / 2, y - .12, z1), (x1 - x0, .2, .12))
    for k in range(int((x1 - x0) / 1.2) + 1): add_box(bb, (x0 + k * 1.2, y - .1, (z0 + z1) / 2), (.1, .16, z1 - z0))
    if rails:
        ro = A('orangeRail')
        for (p, q) in (((x0, z1), (x1, z1)), ((x0, z0), (x1, z0)), ((x0, z0), (x0, z1)), ((x1, z0), (x1, z1))): rail_run(ro, ro, p, q, 1.1, 1.3, y + t / 2)
def footing(x, z, s=.9): add_box(A('footing'), (x, .22, z), (s, .44, s)); add_box(A('beam'), (x, .46, z), (s * .7, .06, s * .7))
def curved_decal(name, parent, cx, cz, R, y, w, mat=None, center=math.pi / 2):
    h = w * 534 / 787; span = w / R; nu = 22; bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap'); rows = []
    for j in (0, 1):
        row = []
        for i in range(nu + 1):
            a = center + span / 2 - span * i / nu; row.append(bm.verts.new(V(cx + (R + .012) * math.cos(a), y + (j - .5) * h, cz + (R + .012) * math.sin(a))))
        rows.append(row)
    for i in range(nu):
        f = bm.faces.new((rows[0][i], rows[0][i + 1], rows[1][i + 1], rows[1][i]))
        for lp in f.loops:
            ii = i + (1 if lp.vert in (rows[0][i + 1], rows[1][i + 1]) else 0); jj = 1 if lp.vert in rows[1] else 0; lp[uvl].uv = (ii / nu, jj)
    ob = new_obj(name, bm, mat or MAT['logo'], parent, uv=False); return ob

# ================================================================ GROUND
bm = A('concrete'); add_box(bm, (17.6, -.1, 0.3), (46.0, .2, 17.6))
for k in range(-12, 13): add_box(A('footing'), (18.0 + k * 2.0, .002, .5), (.03, .005, 21.0)) if False else None
# ================================================================ AGGREGATE BINS + FRAME
BX = lambda i: U(64 + i * 128); BZ = 1.7; TOP = U(330)
fr = A('beam')
for i in range(5):
    for z in (-BZ - .12, BZ + .12): add_box(fr, (U(i * 128), TOP / 2 + .06, z), (.36, TOP + .12, .36)); footing(U(i * 128), z)
for z in (-BZ - .12, BZ + .12):
    for y in (U(278), U(150), U(60)): add_box(fr, (U(256), y, z), (U(520) + .4, .22 if y > 5 else .18, .26))
for x in [U(i * 128) for i in range(5)]:
    for y in (U(278), U(150), U(60)): add_box(fr, (x, y, 0), (.2, .2, 2 * BZ + .24))
for i in range(4):
    for z in (-BZ - .12, BZ + .12): xbrace(A('beam'), U(i * 128), U((i + 1) * 128), U(64), U(146), z, .045)
pan = A('panel'); cone = A('cone'); gate = A('orangeRail'); gv = A('green')
for i in range(4):
    x = BX(i); hw = U(62)
    add_box(pan, (x, U(307), 0), (2 * hw, U(46), 2 * hw)); add_box(A('beam'), (x, TOP + .02, hw), (2 * hw + .1, .08, .08)); add_box(A('beam'), (x, TOP + .02, -hw), (2 * hw + .1, .08, .08))
    for sx in (-1, 1): add_box(A('beam'), (x + sx * hw, TOP + .02, 0), (.08, .08, 2 * hw))
    # hopper: a square frustum from the box down to the outlet
    y0, y1, ow = U(284), U(244), U(16)
    verts = []
    for yy, hh in ((y0, hw), (y1, ow)):
        verts.append([bm_v for bm_v in [cone.verts.new(V(x + sx * hh, yy, sz * hh)) for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))]])
    for k in range(4): cone.faces.new((verts[1][k], verts[1][(k + 1) % 4], verts[0][(k + 1) % 4], verts[0][k]))
    add_box(gate, (x, U(230), 0), (ow * 2 + .12, .3, ow * 2 + .12)); add_box(A('galv'), (x, U(230) - .2, 0), (ow * 2 + .3, .04, ow * 2 + .3))
    # a chute from the gate down to the belt
    add_box(A('beam'), (x, U(210), 0), (.5, .16, .5))
# ================================================================ GATHERING BELT
bl = A('belt'); rl = A('roller'); bf = A('beam')
gx0, gx1, gy = U(-6), U(520), U(196)
add_box(bl, ((gx0 + gx1) / 2, gy, 0), (gx1 - gx0, .07, 1.55)); add_box(bl, ((gx0 + gx1) / 2, gy - .22, 0), (gx1 - gx0, .05, 1.45))
for z in (-.86, .86): add_box(bf, ((gx0 + gx1) / 2, gy - .12, z), (gx1 - gx0, .3, .09)); add_box(bf, ((gx0 + gx1) / 2, gy + .12, z), (gx1 - gx0, .22, .06))
for k in range(int((gx1 - gx0) / 1.0) + 1):
    x = gx0 + k * 1.0; cyl_between(rl, (x, gy - .1, -.78), (x, gy - .1, .78), .055, 10)
    for z in (-.86, .86): cyl_between(bf, (x, gy - .15, z), (x + .5, gy + .14, z), .02, 5) if False else None
for k in range(14): add_box(bf, (gx0 + k * 1.0 + .5, gy - .35, 0), (.08, .08, 1.7))
for z in (-.86, .86):
    for k in range(int((gx1 - gx0) / 1.0)):
        x = gx0 + k * 1.0; cyl_between(bf, (x, gy - .25, z), (x + 1.0, gy + .08, z), .02, 5); cyl_between(bf, (x + 1.0, gy - .25, z), (x, gy + .08, z), .02, 5)
# ================================================================ INCLINED CONVEYOR
A0 = Vector((U(520), U(196))); B0 = Vector((U(884), U(604))); D = (B0 - A0); LEN = D.length; ang = math.atan2(D.y, D.x); ex = D.normalized(); nx = Vector((-ex.y, ex.x))
def inc(u, v, z): p = A0 + ex * u + nx * v; return (p.x, p.y, z)
for z in (-.95, .95):
    for v in (0, -.55): beam(bf, inc(0, v, z), inc(LEN, v, z), .09, .09)
    n = int(LEN / 1.0)
    for k in range(n): cyl_between(bf, inc(k * LEN / n, 0, z), inc((k + 1) * LEN / n, -.55, z), .022, 5); cyl_between(bf, inc((k + 1) * LEN / n, 0, z), inc(k * LEN / n, -.55, z), .022, 5)
    ro = A('orangeRail')
    for k in range(int(LEN / 1.3) + 1):
        u = k * 1.3; cyl_between(ro, inc(u, .04, z * 1.02), inc(u, 1.15, z * 1.02), .025, 6)
    for h in (1.12, .58): cyl_between(ro, inc(0, h, z * 1.02), inc(LEN, h, z * 1.02), .025, 6)
for k in range(int(LEN / 1.2) + 1): beam(bf, inc(k * 1.2, -.5, -1.0), inc(k * 1.2, -.5, 1.0), .08, .08)
bm = bl; beam(bm, inc(0, .06, 0), inc(LEN, .06, 0), 1.55, .05); beam(bm, inc(0, -.4, 0), inc(LEN, -.4, 0), 1.45, .04)
for k in range(int(LEN / .9) + 1): cyl_between(rl, inc(k * .9, -.04, -.78), inc(k * .9, -.04, .78), .05, 10)
for u in (0, LEN): cyl_between(rl, inc(u, .02, -.85), inc(u, .02, .85), .24 if u else .2, 24)
# support legs: two A-frames at 0.3 and 0.58 of the length
for f in (.3, .58):
    p = A0 + ex * LEN * f
    for z in (-1.0, 1.0): beam(bf, (p.x - .5, 0, z), (p.x, p.y - .55, z), .14, .14); beam(bf, (p.x + .5, 0, z), (p.x, p.y - .55, z), .14, .14)
    footing(p.x - .5, -1.0, .7); footing(p.x + .5, -1.0, .7); footing(p.x - .5, 1.0, .7); footing(p.x + .5, 1.0, .7)
    beam(bf, (p.x, p.y - .55, -1.0), (p.x, p.y - .55, 1.0), .12, .12); xbrace(bf, p.x - .5, p.x + .5, 1.2, p.y - 1.0, 1.0, .03)
# head chute (dark)
bm = A('motor'); prism(bm, [(U(872), U(626)), (U(906), U(626)), (U(944), U(548)), (U(930), U(540)), (U(894), U(604)), (U(872), U(604))], -.62, .62)
cyl_between(rl, (U(884), U(604), -.9), (U(884), U(604), .9), .3, 24)
# ================================================================ MIXING TOWER
CX = [U(850), U(930), U(1050), U(1130)]; TZ = 2.4; col = A('beam'); HT = U(540)
for x in CX:
    for z in (-TZ, TZ): add_box(col, (x, HT / 2 + .1, z), (.42, HT + .2, .42)); footing(x, z, 1.1)
    # tower cross frames at the decks and braces
for lvl in (U(330), U(440), U(540)):
    for z in (-TZ, TZ): add_box(col, ((CX[0] + CX[3]) / 2, lvl - .22, z), (CX[3] - CX[0], .3, .22))
    for x in CX: add_box(col, (x, lvl - .22, 0), (.22, .3, 2 * TZ))
for (xa, xb) in ((CX[0], CX[1]), (CX[2], CX[3])):
    for z in (-TZ, TZ): xbrace(col, xa, xb, U(30), U(180), z, .05); xbrace(col, xa, xb, U(200), U(330), z, .045)
    xbrace(col, xa, xb, U(30), U(180), TZ, .0) if False else None
for x in CX: xbrace(col, -TZ, TZ, U(40), U(190), x, .045, axis='x'); xbrace(col, -TZ, TZ, U(210), U(330), x, .04, axis='x')
mixx = U(990); MR = U(100)
deck(U(836), U(1146), U(330), -2.9, 2.9, hole=(mixx - 2.75, mixx + 2.75, -2.75, 2.75))
deck(U(836), U(1146), U(440), -2.9, 2.9); deck(U(896), U(1160), U(540), -2.9, 2.9)
# stairs / ladder on the front of the tower (a near-vertical stair, as drawn)
lx0, lx1 = U(812), U(850); ly1 = U(330)
for z in (3.1, 3.5): beam(A('beam'), (lx0, .1, z), (lx1, ly1, z), .08, .08)
for k in range(1, 32): t = k / 32; cyl_between(A('roller'), (lx0 + (lx1 - lx0) * t, ly1 * t, 3.1), (lx0 + (lx1 - lx0) * t, ly1 * t, 3.5), .02, 6)
ro = A('orangeRail')
for z in (3.1, 3.5): cyl_between(ro, (lx0 - .1, 1.1, z), (lx1 - .1, ly1 + 1.1, z), .022, 6)
# weigh hoppers (square frustums), green outlets, and the water vessel above the deck
for x in (U(935), U(1045)):
    hw = U(46); bm = A('cone'); verts = []
    for yy, hh in ((U(506), hw), (U(458), U(12))): verts.append([bm.verts.new(V(x + sx * hh, yy, sz * hh)) for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
    for k in range(4): bm.faces.new((verts[1][k], verts[1][(k + 1) % 4], verts[0][(k + 1) % 4], verts[0][k]))
    add_box(A('vessel'), (x, U(518), 0), (2 * hw, U(24), 2 * hw)); add_box(A('green'), (x, U(451), 0), (U(20), U(14), U(20)))
    for sx in (-1, 1):
        for sz in (-1, 1): beam(A('beam'), (x + sx * hw * .9, U(540), sz * hw * .9), (x + sx * hw * .9, U(512), sz * hw * .9), .1, .1)
wx = U(1040); add_cyl(A('vessel'), (wx, U(590), 1.2), U(30), U(100), 40); add_cyl(A('vessel'), (wx, U(641), 1.2), U(30) * 1.0, .08, 40)
for k in range(3): add_cyl(A('galv'), (wx, U(560) + k * 1.0, 1.2), U(30) + .015, .05, 40)
bm = A('pipeBlue'); pp = [(U(1074), U(600), 1.2), (U(1092), U(600), 1.2), (U(1092), U(420), 1.2), (U(1062), U(420), 1.0)]; tube(bm, pp, .09, 10)
for p in pp[1:3]: add_cyl(A('galv'), p, .14, .05, 12)
# ================================================================ THE PAN MIXER
mc = (mixx, 0, 0); my0, my1 = U(336), U(426)
mx = A('vessel'); add_cyl(mx, (mixx, (my0 + my1) / 2, 0), MR, my1 - my0, 72)
add_cyl(A('orangeRail'), (mixx, my1 - .27, 0), MR + .02, .26, 72); add_cyl(A('galv'), (mixx, my1 + .02, 0), MR + .05, .06, 72); add_cyl(A('galv'), (mixx, my0 - .02, 0), MR + .05, .08, 72)
add_cyl(A('vesselD'), (mixx, my1 + .1, 0), MR * .96, .1, 72)          # lid
for k in range(3): add_cyl(A('vessel'), (mixx + (k - 1) * 1.4, my1 + .28, (k % 2) * 1.2 - .6), .4, .3, 20)
for k in range(10): a = 2 * math.pi * k / 10; add_cyl(A('galv'), (mixx + (MR - .05) * math.cos(a), my1 + .17, (MR - .05) * math.sin(a)), .06, .06, 6)
bm = A('cone'); rows = [(U(336), U(90)), (U(268), U(28))]; ring = []
for yy, rr in rows: ring.append([bm.verts.new(V(mixx + rr * math.cos(2 * math.pi * j / 64), yy, rr * math.sin(2 * math.pi * j / 64))) for j in range(64)])
for j in range(64): bm.faces.new((ring[0][j], ring[0][(j + 1) % 64], ring[1][(j + 1) % 64], ring[1][j]))
ring2 = [[bm.verts.new(V(mixx + rr * math.cos(2 * math.pi * j / 40), yy, rr * math.sin(2 * math.pi * j / 40))) for j in range(40)] for yy, rr in ((U(268), U(22)), (U(232), U(14)))]
for j in range(40): bm.faces.new((ring2[0][j], ring2[0][(j + 1) % 40], ring2[1][(j + 1) % 40], ring2[1][j]))
add_cyl(A('galv'), (mixx, U(268), 0), U(30), .08, 40); add_cyl(A('orangeRail'), (mixx, U(232) - .1, 0), U(16), .18, 28); add_cyl(A('green'), (mixx, U(232) - .3, 0), U(14), .22, 28)
# pan supports hanging from the top deck, and the drive on the right
for k in range(4):
    a = math.pi / 4 + k * math.pi / 2; px, pz = mixx + (MR + .1) * math.cos(a), (MR + .1) * math.sin(a)
    beam(A('beam'), (px, my1, pz), (px + 1.2 * math.cos(a), my1 + .6, pz + 1.2 * math.sin(a)), .14, .14)
    beam(A('beam'), (px, my0 + .1, pz), (px, my1, pz), .12, .12)
dx0 = U(1092); dxm = A('motor'); add_box(dxm, (U(1107), U(398), 0), (U(30), U(40), 1.5)); add_cyl(A('galv'), (U(1092) - .05, U(398), 0), .3, .25, 20, axis='x')
for k in range(7): add_box(A('galv'), (U(1107), U(398) + .45 - k * .13, 0), (U(30) + .06, .04, 1.56))
add_box(A('motor'), (U(1115), U(425) - .2, 0), (.8, .5, .9)); cyl_between(A('galv'), (dx0, U(398), 0), (mixx + MR, U(398), 0), .12, 12)
# ================================================================ CEMENT SILOS (set back behind the tower line)
SZ = -5.6; SR = 1.4; SY0, SY1 = U(230), U(660)
sil = [U(1290), U(1430)]
for sx in sil:
    for dx, dz in ((-1.1, -1.1), (1.1, -1.1), (-1.1, 1.1), (1.1, 1.1)): add_box(A('beam'), (sx + dx, SY0 / 2, SZ + dz), (.3, SY0, .3)); footing(sx + dx, SZ + dz, 1.0)
    for z in (SZ - 1.1, SZ + 1.1): xbrace(A('beam'), sx - 1.1, sx + 1.1, U(20), U(150), z, .04)
    for x in (sx - 1.1, sx + 1.1): xbrace(A('beam'), SZ - 1.1, SZ + 1.1, U(20), U(150), x, .04, axis='x')
    for yy in (U(150), U(60)): beam(A('beam'), (sx - 1.1, yy, SZ - 1.1), (sx + 1.1, yy, SZ - 1.1), .16, .16); beam(A('beam'), (sx - 1.1, yy, SZ + 1.1), (sx + 1.1, yy, SZ + 1.1), .16, .16)
    add_cyl(A('vessel'), (sx, (SY0 + SY1) / 2, SZ), SR, SY1 - SY0, 80)
    for yy in (U(330), U(430), U(530)): add_cyl(A('vesselD'), (sx, yy, SZ), SR + .025, .07, 80)
    add_cyl(A('galv'), (sx, SY1, SZ), SR + .07, .12, 80); add_cyl(A('galv'), (sx, SY0, SZ), SR + .07, .12, 80)
    bm = A('cone'); rr = [(SY0, SR), (U(150), U(12))]; ring = [[bm.verts.new(V(sx + r_ * math.cos(2 * math.pi * j / 64), yy, SZ + r_ * math.sin(2 * math.pi * j / 64))) for j in range(64)] for yy, r_ in rr]
    for j in range(64): bm.faces.new((ring[0][j], ring[0][(j + 1) % 64], ring[1][(j + 1) % 64], ring[1][j]))
    add_cyl(A('galv'), (sx, U(150) - .12, SZ), U(14), .26, 28)
    # roof deck with rails, a filter box, and a vertical ladder with a cage on the +x side
    add_cyl(A('grate'), (sx, SY1 + .12, SZ), SR + .45, .1, 48)
    for k in range(18):
        a = 2 * math.pi * k / 18; ro = A('orangeRail'); cyl_between(ro, (sx + (SR + .42) * math.cos(a), SY1 + .15, SZ + (SR + .42) * math.sin(a)), (sx + (SR + .42) * math.cos(a), SY1 + 1.25, SZ + (SR + .42) * math.sin(a)), .025, 6)
    for h in (1.2, .65): add_cyl(A('orangeRail'), (sx, SY1 + .15 + h * 0 + (h - .05), SZ), SR + .42, .05, 48) if False else None
    for h in (1.22, .66):
        bm_r = A('orangeRail'); pts = [(sx + (SR + .42) * math.cos(2 * math.pi * k / 36), SY1 + .15 + h, SZ + (SR + .42) * math.sin(2 * math.pi * k / 36)) for k in range(37)]
        for k in range(36): cyl_between(bm_r, pts[k], pts[k + 1], .022, 6)
    add_box(A('vessel'), (sx, SY1 + .5, SZ), (U(24), U(18), U(24))); add_cyl(A('vessel'), (sx, SY1 + .08, SZ), SR * .98, .16, 40)
    curved_decal('Logo_Silo_%d' % int(sx * 100), root, sx, SZ, SR, U(560) + .7, 1.7)
# ladder on the first silo, and the screw conveyors to the mixer
lxp = sil[0] + SR + .35
for z in (SZ - .3, SZ + .3): add_box(A('galv'), (lxp, (U(236) + SY1) / 2, z), (.05, SY1 - U(236), .05))
for k in range(int((SY1 - U(236)) / .32)): add_box(A('galv'), (lxp, U(236) + k * .32, SZ), (.04, .04, .6))
for k in range(int((SY1 - U(236) - 2.4) / 1.0)):
    y = U(236) + 2.4 + k * 1.0
    for z in (SZ - .5, SZ + .5): add_box(A('galv'), (lxp + .18, y + .02, z), (.4, .02, .02)) if False else None
SCR = [((sil[0], U(150), SZ), (U(1080), U(470), 0.55)), ((sil[1], U(150), SZ), (U(1100), U(490), -.55))]
for (a, b) in SCR:
    cyl_between(A('screw'), a, b, .24, 20); d = (V(*b) - V(*a)).normalized()
    for t in (.12, .5, .88):
        p = V(*a) + (V(*b) - V(*a)) * t; add_cyl(A('galv'), (p.x, p.z, -p.y), .275, .06, 20) if False else None
    cyl_between(A('galv'), a, (a[0] + (b[0] - a[0]) * .05, a[1] + (b[1] - a[1]) * .05, a[2] + (b[2] - a[2]) * .05), .29, 20)
    cyl_between(A('galv'), b, (b[0] - (b[0] - a[0]) * .05, b[1] - (b[1] - a[1]) * .05, b[2] - (b[2] - a[2]) * .05), .29, 20)
    add_box(A('motor'), (a[0] - .2, a[1] - .5, a[2]), (.7, .6, .6)); add_box(A('motor'), (b[0] + .3, b[1] + .3, b[2]), (.9, .5, .9))
    for k in range(5):
        t = .15 + k * .17; p = [a[i] + (b[i] - a[i]) * t for i in range(3)]; cyl_between(A('galv'), (p[0], p[1], p[2]), (p[0] + (b[0] - a[0]) * .015, p[1] + (b[1] - a[1]) * .015, p[2] + (b[2] - a[2]) * .015), .3, 20)
    beam(A('beam'), (a[0] - .3, a[1] - .4, a[2]), (a[0] + .3, a[1] + .2, a[2]), .08, .08)
# a bracket at the tower for the screws, and the cement hopper inlets on the deck
add_box(A('vesselD'), (U(1085), U(448), .55), (.9, .45, .9)); add_box(A('vesselD'), (U(1105), U(448), -.55), (.9, .45, .9))
# ================================================================ CONTROL CABIN
cx, cz = U(795), 3.9; cb = A('panel'); add_box(cb, (cx, 1.15, cz), (U(70), 2.3, 2.3)); add_box(A('galv'), (cx, 2.36, cz), (U(70) + .35, .08, 2.7))
add_box(A('glassP'), (cx - .18, 1.55, cz + 1.16), (1.0, .6, .02)); add_box(A('glassP'), (cx + .55, 1.55, cz + 1.16), (.5, .6, .02))
add_box(A('beam'), (cx - .18, 1.55, cz + 1.17), (1.06, .66, .012)) if False else None
add_box(A('beam'), (cx - U(35) + .22, .9, cz + 1.16), (.5, 1.8, .03)); add_box(A('galv'), (cx, 2.5, cz - .3), (.9, .3, .6))
for x in (cx - U(35) + .05, cx + U(35) - .05): add_box(A('beam'), (x, .12, cz), (.12, .24, 2.3))
for s in (-1, 1): add_box(A('beam'), (cx + s * (U(35) - .02), 1.2, cz + 1.16), (.06, 2.3, .06))
# a few cable runs and a pipe rack linking the cabin to the tower
tube(A('rubber') if 'rubber' in MAT else A('belt'), [(cx + .8, 2.4, cz - 1.0), (cx + 1.4, 2.6, cz - 1.8), (U(850), 3.0, 2.9)], .035, 8)
# ================================================================ MATERIAL PILES ON THE BINS
def heap(name, mat, cx, cz, rx, rz, h, seed, rough=.12, stones=0, ssz=(.1, .22)):
    r = random.Random(seed); bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=56, v_segments=20, radius=1.0); surf = []
    for v in bm.verts:                                         # blender axes directly: x right, y = -z(three), z up
        a, b, c = v.co; n = noise.noise(Vector((a * 3 + seed, b * 3, c * 3))) * rough
        X = a * rx * (1 + n) + cx; Y = b * rz * (1 + n); Z = max(c, 0.0) * h * (1 + .6 * n) + TOP + .05; v.co = Vector((X, Y, Z))
        if c > .15: surf.append(Vector((X, Y, Z)))
    for i in range(stones):
        p = r.choice(surf); s_ = r.uniform(*ssz); m = Matrix.Translation(p + Vector((0, 0, s_ * .25))) @ Matrix.Rotation(r.uniform(0, 6.28), 4, 'Z') @ Matrix.Rotation(r.uniform(0, 6.28), 4, 'X') @ Matrix.Diagonal((s_ * r.uniform(.8, 1.3), s_ * r.uniform(.6, 1.0), s_ * r.uniform(.8, 1.3), 1))
        out = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0, matrix=m)
        for v in out['verts']: v.co += Vector((r.uniform(-1, 1), r.uniform(-1, 1), r.uniform(-1, 1))) * s_ * .22
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); me.materials.append(mat)
    for p in me.polygons: p.use_smooth = (stones == 0)
    box_uv(ob, .9); ob.parent = root; return ob
# bins left to right: coarse (black basalt), coarse (dark grey), sand, fine grey
pile_defs = [('Pile_Coarse1', MAT['pileA'], 1.45, 1.55, 1.05, 5, .22, 360, (.09, .2)), ('Pile_Coarse2', MAT['pileB'], 1.45, 1.55, 1.0, 6, .22, 340, (.09, .2)), ('Pile_Sand', MAT['pileSand'], 1.5, 1.55, .95, 7, .1, 0, (.1, .2)), ('Pile_Fine', MAT['pileFine'], 1.5, 1.55, .9, 8, .1, 0, (.1, .2))]
for i, (nm, mat, rx, rz, h, seed, rgh, nst, ssz) in enumerate(pile_defs): heap(nm, mat, BX(i), 0, rx, rz, h, seed, rgh, nst, ssz)

# ================================================================ OM GROUP MARK ON THE PAN MIXER AND THE PAN BAND
curved_decal('Logo_Mixer', root, mixx, 0, MR, (my0 + my1) / 2 - .18, 2.0)
# ================================================================ FLUSH THE ACCUMULATORS
flush('concrete', 'Ground', MAT['concrete'], .0, 1, 4.0)
for k, (name, mat, bev, tile) in {'beam': ('SteelWork', MAT['beam'], .012, 1.0), 'grate': ('Decks', MAT['grate'], .01, .5), 'panel': ('Panels', MAT['panel'], .02, 1.2), 'cone': ('Hoppers', MAT['cone'], 0, 1.5),
                                  'vessel': ('Vessels', MAT['vessel'], .012, 1.5), 'vesselD': ('VesselDetail', MAT['vesselD'], .008, 1.0), 'orangeRail': ('OrangeWork', MAT['orangeRail'], 0, 1.0), 'galv': ('Fittings', MAT['galv'], .006, 1.0),
                                  'belt': ('BeltRubber', MAT['belt'], 0, 1.0), 'roller': ('Rollers', MAT['roller'], 0, 1.0), 'green': ('Valves', MAT['green'], .01, 1.0), 'glassP': ('CabinGlass', MAT['glassP'], 0, 1.0),
                                  'pipeBlue': ('WaterPipe', MAT['pipeBlue'], 0, 1.0), 'motor': ('Motors', MAT['motor'], .01, 1.0), 'footing': ('Footings', MAT['footing'], .02, 1.0), 'screw': ('ScrewConveyors', MAT['screw'], 0, 1.0), 'rubber': ('Cables', MAT['rubber'], 0, 1.0)}.items():
    flush(k, name, mat, bev, 1, tile, root)
for k in list(ACC): flush(k, k, MAT['beam'], 0, 1, 1.0, root)
# ---------------------------------------------------------------- export
def sel_tree(o):
    o.select_set(True)
    for c in o.children: sel_tree(c)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.parent is None and o is not root: o.parent = root
bpy.ops.object.select_all(action='DESELECT'); sel_tree(root); bpy.context.view_layer.objects.active = root
opts = dict(filepath=GLB, export_format='GLB', use_selection=True, export_apply=True, export_texcoords=True, export_normals=True, export_tangents=False,
            export_materials='EXPORT', export_yup=True, export_cameras=False, export_lights=False, export_extras=True, export_image_format='WEBP', export_image_quality=80)
for drop in ([], ['export_image_quality'], ['export_image_quality', 'export_image_format']):
    try: bpy.ops.export_scene.gltf(**{k: v for k, v in opts.items() if k not in drop}); break
    except TypeError as e: print('[plant3d] gltf option retry', e)
print('[plant3d] GLB', os.path.getsize(GLB), 'bytes')
meta = {'bins': [BX(i) for i in range(4)], 'binTop': TOP, 'gate': [U(222), U(196)], 'gather': [[U(-6), U(196) + .1], [U(520), U(196) + .1]], 'incline': [[A0.x, A0.y + .1], [B0.x, B0.y + .1]], 'head': [U(930), U(545)],
        'hopperX': [U(935), U(1045)], 'mixer': {'x': mixx, 'r': MR, 'top': my1, 'bottom': my0, 'outlet': [mixx, U(232) - .3]}, 'silos': [[s, SZ] for s in sil], 'screws': [[list(a), list(b)] for a, b in SCR], 'water': [wx, U(641), 1.2]}
json.dump(meta, open(os.path.join(ROOT, 'assets', '3d', 'om-group-rmc-plant.json'), 'w'), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'om-group-rmc-plant.blend'))
print('[plant3d] done')
