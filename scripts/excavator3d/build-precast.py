"""OM GROUP - precast block-production line (Ready-mix concrete page, the precast figure). The batching plant is om-group-rmc-plant.glb (same coordinates); this file adds the yard in front of it:
a feed belt from the mixer outlet, a block machine with hopper and tamper head, the pallet line, a stacker gantry and three-bay curing racks with finished hollow blocks.

  blender -b --factory-startup -P scripts/excavator3d/build-precast.py -- <repo root>
Output: assets/3d/om-group-precast-line.glb, assets/3d/om-group-precast-line.json, _review/excavator3d/om-group-precast-line.blend. Built on the same helpers and materials as build-plant.py. Metres, three.js axes."""
import bpy, bmesh, math, json, os, sys, random
import numpy as np
from mathutils import Vector, Matrix, noise

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd()); QUICK = '--quick' in argv
OUT = os.path.join(ROOT, '_review', 'excavator3d'); TEX = os.path.join(OUT, 'tex'); os.makedirs(TEX, exist_ok=True)
GLB = os.path.join(ROOT, 'assets', '3d', 'om-group-precast-line.glb')
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
root = empty('OMGroupPrecastLine')
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

MAT['blockconc'] = noisy('BlockConcrete', (.60, .59, .565), .2, 41, spl=(.5, .49, .47), speck=.03, streak=.2, nstr=.8, rough=(.9, .06), scale=1.6)
MAT['wood'] = noisy('PalletWood', (.42, .30, .17), .35, 42, streak=.7, nstr=.7, rough=(.8, .1))
MAT['reflect'] = pbr('YardLine', tuple(c * .9 for c in srgb('#F2B400')), 0.0, .4)
MAT['curing'] = pbr('CuringCover', (.55, .72, .8), 0.0, .1, opacity=.1)

# ================================================================ PRECAST YARD (in front of the batching plant): feed belt, block machine, pallet line, stacker, curing racks
# plant coordinates: the mixer outlet is at x = 24.75 (z = 0); the yard runs along z = +13 and extends to the right
MX = U(990); YZ = 13.0
PAL_Y = .62
# ---- ground: the plant's slab continues forward and to the right
add_box(A('concrete'), (22.8, -.1, 15.4), (56.4, .2, 14.4))
for k in range(-9, 10): add_box(A('footing'), (MX + 3.0, .004, 15.4 + k * .0), (.0, .0, .0)) if False else None
# yellow safety lines on the yard slab
add_box(A('reflect'), (MX + 3.0, .006, 8.2), (46.0, .01, .16)) if 'reflect' in MAT else None
# ---- feed belt from the mixer outlet to the block machine (a raised skip conveyor on a truss)
by = 4.1; z0, z1 = 0.0, YZ - 1.6
bl = A('belt'); bf = A('beam'); rl = A('roller')
add_box(bl, (MX, by, (z0 + z1) / 2), (1.3, .07, z1 - z0)); add_box(bl, (MX, by - .2, (z0 + z1) / 2), (1.2, .05, z1 - z0))
for x in (MX - .72, MX + .72):
    add_box(bf, (x, by - .1, (z0 + z1) / 2), (.09, .3, z1 - z0)); add_box(bf, (x, by + .22, (z0 + z1) / 2), (.06, .26, z1 - z0))
    for k in range(int((z1 - z0) / 1.0)): cyl_between(bf, (x, by - .22, z0 + k * 1.0), (x, by + .1, z0 + (k + 1) * 1.0), .02, 5); cyl_between(bf, (x, by - .22, z0 + (k + 1) * 1.0), (x, by + .1, z0 + k * 1.0), .02, 5)
for k in range(int((z1 - z0) / .9) + 1): cyl_between(rl, (MX - .65, by - .04, z0 + k * .9), (MX + .65, by - .04, z0 + k * .9), .05, 10)
for zz in (z0, z1): cyl_between(rl, (MX - .7, by, zz), (MX + .7, by, zz), .2, 20)
ro = A('orangeRail')
for x in (MX - .78, MX + .78):
    for k in range(int((z1 - z0) / 1.4) + 1): cyl_between(ro, (x, by + .1, z0 + k * 1.4), (x, by + 1.0, z0 + k * 1.4), .022, 6)
    for h in (1.0, .55): cyl_between(ro, (x, by + h, z0), (x, by + h, z1), .022, 6)
for zz in (3.2, 7.0, 10.6):
    for x in (MX - .6, MX + .6): add_box(bf, (x, by / 2 - .2, zz), (.2, by - .4, .2)); footing(x, zz, .8)
    add_box(bf, (MX, by - .35, zz), (1.5, .16, .16)); xbrace(bf, MX - .6, MX + .6, .6, by - .5, zz, .035)
# discharge chute from the mixer outlet onto the belt
add_cyl(A('galv'), (MX, 5.1, 0), .5, .7, 24); add_cyl(A('galv'), (MX, 4.5, 0), .6, .5, 24)
# ---- BLOCK MACHINE (a stationary egg-laying style machine): frame, hopper, mould box with tamper head, pallet feeder
BM = (MX, YZ)
for dx in (-1.9, 1.9):
    for dz in (-1.6, 1.6): add_box(bf, (BM[0] + dx, 2.2, BM[1] + dz), (.34, 4.4, .34)); footing(BM[0] + dx, BM[1] + dz, 1.0)
for y in (.9, 2.4, 4.3):
    for dz in (-1.6, 1.6): add_box(bf, (BM[0], y, BM[1] + dz), (4.1, .26, .26))
    for dx in (-1.9, 1.9): add_box(bf, (BM[0] + dx, y, BM[1]), (.26, .26, 3.4))
for dz in (-1.6, 1.6): xbrace(bf, BM[0] - 1.9, BM[0] + 1.9, .9, 2.4, BM[1] + dz, .04)
for dx in (-1.9, 1.9): xbrace(bf, BM[1] - 1.6, BM[1] + 1.6, .9, 2.4, BM[0] + dx, .04, axis='x')
# charging hopper at the top, fed by the belt
bm = A('cone'); verts = []
for yy, hh in ((5.6, 1.4), (4.45, .62)): verts.append([bm.verts.new(V(BM[0] + sx * hh, yy, BM[1] + sz * hh)) for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
for k in range(4): bm.faces.new((verts[1][k], verts[1][(k + 1) % 4], verts[0][(k + 1) % 4], verts[0][k]))
add_box(A('vessel'), (BM[0], 5.75, BM[1]), (2.84, .36, 2.84))
for dx in (-1.3, 1.3):
    for dz in (-1.3, 1.3): beam(bf, (BM[0] + dx, 4.3, BM[1] + dz), (BM[0] + dx, 5.6, BM[1] + dz), .1, .1)
add_box(A('orangeRail'), (BM[0], 6.0, BM[1]), (3.0, .16, 3.0))
# mould head (the orange compaction/tamper head) on two hydraulic columns, over the mould box
hd = bmesh.new(); add_box(hd, (BM[0], 0, BM[1]), (2.3, .6, 1.9)); add_box(hd, (BM[0], .45, BM[1]), (1.5, .35, 1.1))
for dx in (-.8, .8): add_cyl(hd, (BM[0] + dx, .95, BM[1]), .09, .9, 14)
new_obj('TamperHead', hd, MAT['orangeRail'], root, loc=(0, 3.35, 0), bevel=.01, bev_seg=1)
for dx in (-.8, .8): add_cyl(A('galv'), (BM[0] + dx, 4.45, BM[1]), .15, 1.0, 18)
add_box(A('motor'), (BM[0], 1.95, BM[1]), (2.5, 1.5, 2.1))                       # mould box housing
for k in range(5): add_box(A('galv'), (BM[0] - 1.0 + k * .5, 1.95, BM[1] + 1.06), (.04, 1.46, .02))
add_box(A('vesselD'), (BM[0], 1.1, BM[1]), (2.1, .3, 1.8))
# control panel and drive on the machine's side
add_box(A('panel'), (BM[0] - 2.8, 1.1, BM[1] - .6), (1.0, 2.2, .8)); add_box(A('glassP'), (BM[0] - 2.8, 1.5, BM[1] - .18), (.6, .5, .02))
add_box(A('beam'), (BM[0] - 2.8, .12, BM[1] - .6), (1.1, .24, .9))
tube(A('belt'), [(BM[0] - 2.3, 1.6, BM[1] - .6), (BM[0] - 2.0, 2.4, BM[1] - 1.0), (BM[0] - 1.6, 3.3, BM[1] - .9)], .04, 8)
# ---- PALLET CONVEYOR from the machine toward the curing racks (rollers + side rails)
px0, px1 = BM[0] + 2.2, MX + 22.2
rl2 = A('roller'); bf2 = A('beam')
for z in (YZ - .95, YZ + .95): add_box(bf2, ((px0 + px1) / 2, PAL_Y - .22, z), (px1 - px0, .2, .12)); add_box(bf2, ((px0 + px1) / 2, PAL_Y - .52, z), (px1 - px0, .08, .1))
for k in range(int((px1 - px0) / .55) + 1): cyl_between(rl2, (px0 + k * .55, PAL_Y - .12, YZ - .9), (px0 + k * .55, PAL_Y - .12, YZ + .9), .055, 10)
for k in range(int((px1 - px0) / 2.2) + 1):
    for z in (YZ - .95, YZ + .95): add_box(bf2, (px0 + k * 2.2, .26, z), (.12, .52, .12)); footing(px0 + k * 2.2, z, .5)
# ---- STACKER / DEMOULDING gantry over the line at x = MX + 7
gx = MX + 7.2
for z in (YZ - 1.8, YZ + 1.8): add_box(bf2, (gx, 1.9, z), (.28, 3.8, .28)); footing(gx, z, .9)
add_box(bf2, (gx, 3.95, YZ), (.3, .3, 3.9)); add_box(A('orangeRail'), (gx, 3.3, YZ), (1.5, .3, 1.4)); add_box(A('motor'), (gx, 3.65, YZ), (.8, .3, .8))
for dx in (-.5, .5): cyl_between(A('galv'), (gx + dx, 3.15, YZ - .5), (gx + dx, 2.3, YZ - .5), .05, 8); cyl_between(A('galv'), (gx + dx, 3.15, YZ + .5), (gx + dx, 2.3, YZ + .5), .05, 8)
add_box(A('galv'), (gx, 2.2, YZ), (1.7, .1, 1.5))
# ---- CURING RACKS (three bays, three levels each) with a translucent curing cover
RX0 = MX + 11.0; BAY = 3.4; NB_ = 3; RH = 4.4; RZ = 1.5
for b in range(NB_ + 1):
    x = RX0 + b * BAY
    for z in (YZ - RZ - .5, YZ + RZ + .5): add_box(bf, (x, RH / 2, z), (.2, RH, .2)); footing(x, z, .7)
for lvl in range(4):
    y = .35 + lvl * 1.15
    for z in (YZ - RZ - .5, YZ + RZ + .5): add_box(bf, (RX0 + NB_ * BAY / 2, y, z), (NB_ * BAY, .16, .12))
    for b in range(NB_ * 3 + 1): add_box(A('galv'), (RX0 + b * BAY / 3, y + .1, YZ), (.06, .05, 2 * RZ + 1.0))
for b in range(NB_):
    for z in (YZ - RZ - .5, YZ + RZ + .5): xbrace(bf, RX0 + b * BAY, RX0 + (b + 1) * BAY, .4, RH - .1, z, .03)
add_box(A('curing'), (RX0 + NB_ * BAY / 2, RH / 2 + .15, YZ), (NB_ * BAY + .3, RH + .3, 2 * RZ + 1.3)) if 'curing' in MAT else None
# ---- the concrete blocks: a hollow block (two cores) built once, then placed
BW, BH, BD = .9, .6, .45
def hollow(bm, cx, cy, cz, flip=False):
    """a hollow concrete block (long axis x): solid body with two rectangular cores and a slight chamfer"""
    w, h, d = (BW, BH, BD)
    t = .07; cw = (w - 3 * t) / 2
    add_box(bm, (cx, cy - h / 2 + .03, cz), (w, .06, d))                                    # bottom web
    for sx in (-1, 1): add_box(bm, (cx + sx * (w / 2 - t / 2), cy, cz), (t, h, d))
    add_box(bm, (cx, cy, cz), (t, h, d))
    for sz in (-1, 1): add_box(bm, (cx, cy, cz + sz * (d / 2 - t / 2)), (w, h, t))
    add_box(bm, (cx, cy + h / 2 - .02, cz), (w, .04, d))
# blocks on the pallet line (static, resting): a few finished blocks past the machine
BL = A('blockconc')
# stacks in the racks
for b in range(NB_):
    for lvl in range(3):
        for r_ in range(2):
            for k in range(3): hollow(BL, RX0 + b * BAY + .6 + k * 1.0, .35 + lvl * 1.15 + .08 + BH / 2 + .1, YZ + (r_ - .5) * (BD + .1) * 2.2)
# a stack of finished blocks beside the line and pallets
for k in range(3):
    add_box(A('wood'), (MX + 5.0 + k * 1.2, .09, YZ + 4.2), (1.0, .18, 1.0)) if 'wood' in MAT else None
    for lvl in range(3): hollow(BL, MX + 5.0 + k * 1.2, .2 + BH / 2 + lvl * BH, YZ + 4.2)
pw = bmesh.new(); add_box(pw, (0, 0, 0), (2.2, .07, 1.08)); add_box(pw, (0, -.07, 0), (2.2, .06, .12)); [add_box(pw, (sx, -.07, 0), (.12, .06, 1.08)) for sx in (-1.0, 0, 1.0)]
new_obj('ProtoPallet', pw, MAT['wood'], root, loc=(0, -6, 0), tile=.6)
# the prototype block used by the animation (hidden in the page, cloned for the moving blocks)
proto = bmesh.new(); [hollow(proto, sx, 0, 0) for sx in (-.5, .5)]; pb = new_obj('ProtoBlock', proto, MAT['blockconc'], root, loc=(0, -5, 0), bevel=.008, bev_seg=1, tile=.6)
# ---- a small site office / lab container and drum barrels for texture and scale
add_box(A('panel'), (MX - 10.0, 1.3, YZ + 1.0), (3.2, 2.6, 2.3)); add_box(A('galv'), (MX - 10.0, 2.66, YZ + 1.0), (3.5, .08, 2.6))
add_box(A('glassP'), (MX - 10.0 + .4, 1.6, YZ + 2.17), (1.0, .7, .02)); add_box(A('beam'), (MX - 10.0 - 1.1, .9, YZ + 2.17), (.8, 1.8, .03))
# ---- flush the yard
for k, (name, mat, bev) in {'concrete': ('YardGround', MAT['concrete'], 0), 'blockconc': ('YardBlocks', MAT['blockconc'], .008)}.items(): pass

for k, (name, mat, bev, tile) in {'concrete': ('YardGround', MAT['concrete'], 0, 4.0), 'beam': ('YardSteel', MAT['beam'], .012, 1.0), 'grate': ('YardDecks', MAT['grate'], .01, .5), 'panel': ('YardPanels', MAT['panel'], .02, 1.2), 'cone': ('YardHopper', MAT['cone'], 0, 1.5),
    'vessel': ('YardVessel', MAT['vessel'], .012, 1.5), 'vesselD': ('YardDetail', MAT['vesselD'], .008, 1.0), 'orangeRail': ('YardOrange', MAT['orangeRail'], .01, 1.0), 'galv': ('YardFittings', MAT['galv'], .006, 1.0), 'belt': ('YardBelt', MAT['belt'], 0, 1.0),
    'roller': ('YardRollers', MAT['roller'], 0, 1.0), 'glassP': ('YardGlass', MAT['glassP'], 0, 1.0), 'motor': ('YardMotors', MAT['motor'], .01, 1.0), 'footing': ('YardFootings', MAT['footing'], .02, 1.0), 'blockconc': ('YardBlocks', MAT['blockconc'], .006, .6),
    'wood': ('YardPallets', MAT['wood'], .004, .6), 'reflect': ('YardLines', MAT['reflect'], 0, 1.0), 'curing': ('CuringCover', MAT['curing'], 0, 1.0)}.items():
    flush(k, name, mat, bev, 1, tile, root)
for k in list(ACC): flush(k, k, MAT['beam'], 0, 1, 1.0, root)
def sel_tree(o):
    o.select_set(True)
    for c in o.children: sel_tree(c)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.parent is None and o is not root: o.parent = root
bpy.ops.object.select_all(action='DESELECT'); sel_tree(root); bpy.context.view_layer.objects.active = root
opts = dict(filepath=GLB, export_format='GLB', use_selection=True, export_apply=True, export_texcoords=True, export_normals=True, export_tangents=False, export_materials='EXPORT', export_yup=True, export_cameras=False, export_lights=False, export_extras=True, export_image_format='WEBP', export_image_quality=80)
for drop in ([], ['export_image_quality'], ['export_image_quality', 'export_image_format']):
    try: bpy.ops.export_scene.gltf(**{k: v for k, v in opts.items() if k not in drop}); break
    except TypeError as e: print('[precast3d] gltf option retry', e)
print('[precast3d] GLB', os.path.getsize(GLB), 'bytes')
json.dump({'mixx': MX, 'yz': YZ, 'belt': [[MX, by + .1, 0.0], [MX, by + .1, z1]], 'machine': [BM[0], BM[1]], 'hopperTop': [BM[0], 5.4, BM[1]], 'headY': 3.35, 'pallet': {'y': PAL_Y, 'x0': px0, 'x1': px1, 'z': YZ}, 'gantry': gx, 'rack': {'x0': RX0, 'bay': BAY, 'n': NB_, 'z': YZ}, 'block': [BW, BH, BD]}, open(os.path.join(ROOT, 'assets', '3d', 'om-group-precast-line.json'), 'w'), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'om-group-precast-line.blend'))
print('[precast3d] done')
