"""OM GROUP - concrete pumping set-up (Ready-mix concrete page, "Pumped concrete"): pump unit with hopper, trestles, couplings, riser mast and a slab being cast.
  blender -b --factory-startup -P scripts/excavator3d/build-pump.py -- <repo root>
Output: assets/3d/om-group-pump-line.glb, om-group-pump-line.json (the pipe centre line, for the cutaway tube and the mix moving in it), _review/excavator3d/om-group-pump-line.blend. Same helpers/materials as build-plant.py. Metres, three.js axes."""
import bpy, bmesh, math, json, os, sys, random
import numpy as np
from mathutils import Vector, Matrix, noise

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd()); QUICK = '--quick' in argv
OUT = os.path.join(ROOT, '_review', 'excavator3d'); TEX = os.path.join(OUT, 'tex'); os.makedirs(TEX, exist_ok=True)
GLB = os.path.join(ROOT, 'assets', '3d', 'om-group-pump-line.glb')
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
root = empty('OMGroupPumpLine')
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

MAT['_'] = None

# ================================================================ concrete pumping set-up: pump unit and hopper, pipeline trestles and couplings, riser mast, slab being cast
# scene coordinates: x along the line, y up, the transit mixer stands at +z reversing its chute over the hopper (the truck model is added in the page)
PR = .62                                                    # pipe radius (a cutaway pipe, drawn larger than a real 125 mm line so the concrete inside can be seen)
def qb(p0, p1, p2, t): return (1 - t) ** 2 * Vector(p0) + 2 * (1 - t) * t * Vector(p1) + t * t * Vector(p2)
SEG = [('L', (-10, 1.4), (5.4, 1.4)), ('Q', (5.4, 1.4), (8.0, 1.4), (8.0, 4.0)), ('L', (8.0, 4.0), (8.0, 11.2)), ('Q', (8.0, 11.2), (8.0, 13.8), (10.6, 13.8)), ('L', (10.6, 13.8), (16.6, 13.8)), ('Q', (16.6, 13.8), (19.2, 13.8), (19.2, 11.4))]
poly = []
for sg in SEG:
    if sg[0] == 'L': poly += [Vector(sg[1]), Vector(sg[2])]
    else: poly += [qb(sg[1], sg[2], sg[3], i / 16) for i in range(17)]
cum = [0]
for i in range(1, len(poly)): cum.append(cum[-1] + (poly[i] - poly[i - 1]).length)
LENP = cum[-1]
def at_len(s):
    s = max(0, min(LENP, s))
    for i in range(1, len(poly)):
        if cum[i] >= s: k = (s - cum[i - 1]) / max(cum[i] - cum[i - 1], 1e-9); p = poly[i - 1].lerp(poly[i], k); t = (poly[i] - poly[i - 1]).normalized(); return p, t
    return poly[-1], (poly[-1] - poly[-2]).normalized()

MAT['rebar'] = pbr('RebarSteel', (.30, .20, .15), .85, .5, IMG_RN, .5, rough_img('rebar', .5, .1))
MAT['wetconc'] = noisy('WetConcrete', (.34, .335, .32), .15, 61, speck=.02, nstr=.6, rough=(.35, .1))
MAT['deckconc'] = noisy('DeckConcrete', (.66, .645, .615), .12, 62, spl=(.56, .55, .52), speck=.012, streak=.15, nstr=.3, rough=(.88, .06))
MAT['wood'] = noisy('FormworkTimber', (.56, .42, .26), .14, 63, streak=.25, nstr=.35, rough=(.72, .1))
MAT['pumpbody'] = pbr('PumpPanel', (.78, .78, .76), 0.0, .42, IMG_CORR, .5, rough_img('pump', .42, .05), coat=.25)
MAT['hose'] = pbr('DeliveryHose', (.015, .015, .017), 0.0, .6, IMG_RN, 1.0)

# ---- ground slab
add_box(A('concrete'), (2, -.1, 0), (66, .2, 24))
# ---- pump unit: trailer chassis, body behind the hopper (hopper at z = 0, body toward -z), wheels, outriggers, control cabinet
PX = -13.4
chs = A('beam'); add_box(chs, (PX, .62, -4.4), (2.2, .34, 8.6)); add_box(chs, (PX - .85, .62, -4.4), (.14, .5, 8.6)); add_box(chs, (PX + .85, .62, -4.4), (.14, .5, 8.6))
for z in (-1.0, -3.0, -5.0, -7.0): add_box(chs, (PX, .6, z), (2.4, .22, .18))
pb = A('pumpbody'); add_box(pb, (PX, 1.75, -4.4), (2.4, 2.2, 5.2)); add_box(A('galv'), (PX, 2.88, -4.4), (2.55, .08, 5.35))
ro = A('orangeRail'); add_box(ro, (PX, 2.45, -4.4), (2.46, .45, 5.26)); add_box(A('orangeRail'), (PX, .9, -4.4), (2.44, .12, 5.24))
for sx in (-1, 1):
    for k in range(2): add_box(A('vesselD'), (PX + sx * 1.215, 1.5, -2.9 - k * 2.9), (.04, 1.1, 1.3))      # service doors
    for k in range(9): add_box(A('galv'), (PX + sx * 1.225, 1.95, -3.25 + k * -.12 - 3.7), (.02, .5, .05))
# the pump cylinders' housing, a chrome rod pair, and the control cabinet
add_box(A('motor'), (PX, 1.0, -1.7), (1.9, 1.0, 1.2)); [cyl_between(A('galv'), (PX + dx, 1.0, -1.1), (PX + dx, 1.0, -.45), .13, 16) for dx in (-.45, .45)]
add_box(A('panel'), (PX + 1.5, 1.55, -1.5), (.45, 1.5, .8)); add_box(A('glassP'), (PX + 1.75, 1.9, -1.5), (.02, .5, .45)); add_box(A('beam'), (PX + 1.5, .78, -1.5), (.5, .2, .85))
# wheels (twin axle trailer) and mudguards
for z in (-5.6, -6.4):
    cyl_between(A('galv'), (PX - 1.35, .5, z), (PX + 1.35, .5, z), .09, 14)
    for s in (-1, 1):
        for k in (0, 1):
            cx = PX + s * (1.1 + k * .28)
            add_cyl(A('belt'), (cx, .5, z), .5, .22, 32, axis='x') if False else None
        tire = A('belt'); add_cyl(tire, (PX + s * 1.25, .5, z), .5, .3, 32, axis='x'); add_cyl(A('galv'), (PX + s * 1.42, .5, z), .27, .08, 24, axis='x')
for s in (-1, 1): add_box(A('beam'), (PX + s * 1.25, 1.14, -6.0), (.36, .08, 1.9))
# tow eye, jack leg at the hopper end, outriggers
add_box(A('beam'), (PX, .65, -9.1), (.18, .18, 1.0)); add_cyl(A('galv'), (PX, .65, -9.65), .24, .16, 20, axis='y')
for s in (-1, 1): add_box(A('beam'), (PX + s * 1.05, .4, -.5), (.12, .8, .12)); add_box(A('galv'), (PX + s * 1.05, .02, -.5), (.5, .05, .5))
# ---- hopper (rim at 1.55 so the truck's chute reaches it), grate, agitator and the wet concrete in it
hp = A('cone'); verts = []
for yy, hw, hd in ((1.55, 1.4, 1.35), (.75, .5, .5)): verts.append([hp.verts.new(V(PX + sx * hw, yy, sz * hd)) for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
for k in range(4): hp.faces.new((verts[1][k], verts[1][(k + 1) % 4], verts[0][(k + 1) % 4], verts[0][k]))
hp2 = A('cone'); verts = []
for yy, hw, hd in ((1.52, 1.34, 1.29), (.75, .46, .46)): verts.append([hp2.verts.new(V(PX + sx * hw, yy, sz * hd)) for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
for k in range(4): hp2.faces.new((verts[0][k], verts[0][(k + 1) % 4], verts[1][(k + 1) % 4], verts[1][k]))
rim = A('galv')
for sx in (-1, 1): add_box(rim, (PX + sx * 1.42, 1.58, 0), (.1, .1, 2.82))
for sz in (-1, 1): add_box(rim, (PX, 1.58, sz * 1.37), (2.9, .1, .1))
fill = bmesh.new(); bmesh.ops.create_cube(fill, size=1.0, matrix=Matrix.Translation(V(PX, 1.3, 0)) @ Matrix.Diagonal((2.5, 2.4, .1, 1)))
new_obj('HopperFill', fill, MAT['wetconc'], root, bevel=.03, bev_seg=3, tile=1.5)
for k in range(7): add_box(A('rebar'), (PX - 1.2 + k * .4, 1.64, 0), (.035, .035, 2.6))
for k in range(5): add_box(A('rebar'), (PX, 1.64, -1.1 + k * .55), (2.7, .035, .035))
cyl_between(A('galv'), (PX - 1.4, 1.1, 0), (PX + 1.4, 1.1, 0), .09, 12)
for sx in (-1, 1): add_box(A('beam'), (PX + sx * 1.45, 1.12, 0), (.3, .3, .3))
# outlet from the hopper to the start of the line (steel elbow and flange)
add_cyl(A('galv'), (-11.6, 1.4, 0), PR * 1.15, 2.4, 28, axis='x'); add_cyl(A('galv'), (-10.1, 1.4, 0), PR * 1.35, .2, 28, axis='x')
add_box(A('motor'), (PX + 1.1, 1.0, 0), (.9, .8, .9))
def ring(bm, p, t, ri, ro, w, seg=32):
    n = Vector((-t.y, t.x, 0)); bz = Vector((0, 0, 1)); rows = []
    for (da, rr) in ((-w / 2, ri), (-w / 2, ro), (w / 2, ro), (w / 2, ri)):
        rows.append([bm.verts.new(V(*(Vector((p.x, p.y, 0)) + t.to_3d() * da + (n * math.cos(2 * math.pi * j / seg) + bz * math.sin(2 * math.pi * j / seg)) * rr))) for j in range(seg)])
    for k in range(4):
        for j in range(seg): bm.faces.new((rows[k][j], rows[k][(j + 1) % seg], rows[(k + 1) % 4][(j + 1) % seg], rows[(k + 1) % 4][j]))
# ---- couplings along the line: alternating orange clamps and steel flanges, with the hose end
for i in range(int(LENP / 2.6) + 1):
    p, t = at_len(i * 2.6)
    a = p - t * .11; b = p + t * .11
    ring(A('orangeRail') if i % 2 == 0 else A('galv'), p, t, PR * 1.0, PR * 1.1, .22)
# ---- trestles under the horizontal run
for x in (-7.0, -2.0, 3.0):
    for dz in (-.65, .65):
        beam(A('beam'), (x - .5, 0, dz), (x, .82, dz), .1, .1); beam(A('beam'), (x + .5, 0, dz), (x, .82, dz), .1, .1)
    add_box(A('beam'), (x, .82, 0), (.2, .12, 1.5)); add_box(A('belt'), (x, .86, 0), (.7, .06, .5)); footing(x - .5, -.65, .5); footing(x + .5, -.65, .5); footing(x - .5, .65, .5); footing(x + .5, .65, .5)
# ---- riser mast: two columns with braces and clamps
RXm = 8.0
for dz in (-1.15, 1.15): add_box(A('beam'), (RXm - 1.2, 6.0, dz), (.2, 12.0, .2)); add_box(A('beam'), (RXm + 1.2, 6.0, dz), (.2, 12.0, .2)); footing(RXm - 1.2, dz, .8); footing(RXm + 1.2, dz, .8)
for y in (1.2, 3.8, 6.4, 9.0, 11.6):
    for dz in (-1.15, 1.15): add_box(A('beam'), (RXm, y, dz), (2.4, .14, .14))
    add_box(A('beam'), (RXm - 1.2, y, 0), (.14, .14, 2.3)); add_box(A('beam'), (RXm + 1.2, y, 0), (.14, .14, 2.3))
for k in range(4):
    y0, y1 = 1.2 + k * 2.6, 3.8 + k * 2.6
    for x in (RXm - 1.2, RXm + 1.2): xbrace(A('beam'), -1.15, 1.15, y0, y1, x, .035, axis='x')
for y in (5.0, 8.0, 10.4):
    add_box(A('orangeRail'), (RXm, y, 0), (1.6, .2, .5)); add_box(A('galv'), (RXm, y, 0), (.1, .1, 2.3))
# ---- the slab being cast: columns, formwork deck, rebar mesh, edge forms, railing, wet concrete at the hose end
for (x, z) in ((11, 3), (19, 3), (11, -3), (19, -3), (15, 3), (15, -3)): add_box(A('deckconc'), (x, 5.2, z), (.55, 10.4, .55)); footing(x, z, 1.2)
add_box(A('deckconc'), (15, 10.45, 0), (10.0, .7, 7.0))
# stripped formwork under the deck: joists and props
for k in range(7): add_box(A('wood'), (11.0 + k * 1.33, 10.0, 0), (.12, .16, 7.0))
for (x, z) in ((13, 1.8), (17, 1.8), (13, -1.8), (17, -1.8)): cyl_between(A('galv'), (x, 0, z), (x, 10.0, z), .06, 8)
# edge forms and rebar
for sz in (-1, 1): add_box(A('wood'), (15, 11.45, sz * 3.55), (10.2, 1.05, .12))
for sx in (-1, 1): add_box(A('wood'), (15 + sx * 5.05, 11.45, 0), (.12, 1.05, 7.1))
for i in range(-4, 5): add_box(A('rebar'), (15 + i * 1.05, 11.3, 0), (.05, .05, 6.6))
for i in range(-3, 4): add_box(A('rebar'), (15, 11.36, i * .95), (9.6, .05, .05))
for i in range(-4, 5):
    for j in range(-3, 4):
        if (i + j) % 2 == 0: add_box(A('galv'), (15 + i * 1.05, 11.33, j * .95), (.09, .09, .09))
for sx in (10.0, 20.0):
    for z in (-3.55, 3.55): add_box(A('orangeRail'), (sx, 12.15, z), (.06, 1.0, .06)) if False else None
# pour: a heap of wet concrete under the hose end
pr = bmesh.new(); bmesh.ops.create_uvsphere(pr, u_segments=48, v_segments=18, radius=1.0)
for v in pr.verts:
    a, b, c = v.co; n = noise.noise(Vector((a * 2.4 + 3, b * 2.4, c * 2.4))) * .22
    v.co = Vector((a * 1.55 * (1 + n) + 19.2, b * 1.45 * (1 + n), max(c, 0) * .32 * (1 + n * .5) + 11.15))
me = bpy.data.meshes.new('PourHeap'); pr.to_mesh(me); pr.free(); ob = bpy.data.objects.new('PourHeap', me); scene.collection.objects.link(ob); me.materials.append(MAT['wetconc'])
for p_ in me.polygons: p_.use_smooth = True
box_uv(ob, 1.2); ob.parent = root
# the delivery hose: a black rubber hose from the end of the line, with a reducer and a short drop
hs = bmesh.new(); tube(hs, [(19.2, 11.5, 0), (19.2, 11.2, 0), (19.2, 10.95, 0)], .3, 16); new_obj('HoseEnd', hs, MAT['hose'], root)
add_cyl(A('galv'), (19.2, 11.5, 0), PR * 1.15, .2, 28)
for k in range(5): add_cyl(A('galv'), (19.2, 11.35 - k * .1, 0), .33, .035, 20)
# a short ladder up the deck and safety rail on the +z edge
for z in (3.9, 4.3): add_box(A('galv'), (12.0, 5.6, z), (.05, 11.2, .05))
for k in range(30): add_box(A('galv'), (12.0, .3 + k * .36, 4.1), (.04, .04, .4))

for k, (name, mat, bev, tile) in {'concrete': ('Ground', MAT['concrete'], 0, 4.0), 'beam': ('PumpSteel', MAT['beam'], .012, 1.0), 'panel': ('PumpPanels', MAT['panel'], .02, 1.2), 'pumpbody': ('PumpBody', MAT['pumpbody'], .04, 1.2), 'cone': ('Hopper', MAT['cone'], 0, 1.5),
    'vesselD': ('PumpDetail', MAT['vesselD'], .008, 1.0), 'orangeRail': ('PumpOrange', MAT['orangeRail'], .012, 1.0), 'galv': ('Fittings', MAT['galv'], .006, 1.0), 'belt': ('Tyres', MAT['belt'], .02, .6), 'glassP': ('PumpGlass', MAT['glassP'], 0, 1.0),
    'motor': ('Motors', MAT['motor'], .01, 1.0), 'footing': ('Footings', MAT['footing'], .02, 1.0), 'rebar': ('Rebar', MAT['rebar'], 0, 1.0), 'wood': ('Formwork', MAT['wood'], .004, .8), 'deckconc': ('DeckConcrete', MAT['deckconc'], .02, 1.4)}.items():
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
    except TypeError as e: print('[pump3d] gltf option retry', e)
print('[pump3d] GLB', os.path.getsize(GLB), 'bytes')
json.dump({'radius': PR, 'path': [[round(p.x, 4), round(p.y, 4)] for p in poly], 'hopper': [PX, 1.55], 'chuteTarget': [PX, 1.6, 0.0]}, open(os.path.join(ROOT, 'assets', '3d', 'om-group-pump-line.json'), 'w'))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'om-group-pump-line.blend'))
print('[pump3d] done')
