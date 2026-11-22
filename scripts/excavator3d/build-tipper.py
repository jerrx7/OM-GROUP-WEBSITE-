"""OM GROUP - 8x4 tipper truck (Construction Boulders page, "Loading a tipper" and "Placing" views).

  blender -b --factory-startup -P scripts/excavator3d/build-tipper.py -- <repo root>

Output
  assets/3d/om-group-tipper.glb       the truck (PBR, named nodes): white cab with the OM GROUP mark, charcoal steel body, 4 axles, 14 tyres
  assets/3d/om-group-tipper.json      constants the web scene mirrors (hinge, hoist range)
  _review/excavator3d/om-group-tipper.blend

Metres. three.js axes (x forward = the cab, y up, z toward the viewer); helpers are shared with build-excavator.py (bpy_helpers.py).
The body is an Empty `Bed` at the rear hinge (rest = lying on the chassis, rotation.z > 0 lifts the front). The hoist is a 3-stage telescopic cylinder:
`Cyl_Hoist` at the chassis pin with `Barrel`, `Stage1`, `Stage2`; `Tip_Hoist` on the body marks the rod pin; the web scene slides the stages by the pin distance.
"""
import bpy, bmesh, math, json, os, sys
import numpy as np
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd())
OUT = os.path.join(ROOT, '_review', 'excavator3d'); TEX = os.path.join(OUT, 'tex')
os.makedirs(TEX, exist_ok=True)
GLB = os.path.join(ROOT, 'assets', '3d', 'om-group-tipper.glb')
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene; scene.unit_settings.system = 'METRIC'
exec(open(os.path.join(ROOT, 'scripts', 'excavator3d', 'bpy_helpers.py')).read())

# ---------------------------------------------------------------- materials for the truck
ORANGE = tuple(c * .9 for c in srgb('#FF5E29'))
MAT['white'] = pbr('DecalWhite', (.82, .82, .80), 0.0, .5, IMG_N, .1)
MAT['cab'] = pbr('PaintWhiteCab', (.80, .80, .78), 0.0, .36, IMG_N, .22, rough_img('cab', .36, .05), coat=.4)
MAT['body'] = pbr('BodyCharcoal', (.075, .08, .088), .35, .52, IMG_RN, .5, rough_img('body', .52, .08))
MAT['stripe'] = pbr('StripeOrange', ORANGE, 0.0, .4)
MAT['reflect'] = pbr('ReflectiveYellow', tuple(c * .9 for c in srgb('#F2B400')), 0.0, .3)
MAT['red'] = pbr('LampRed', (.55, .015, .015), 0.0, .2)
MAT['tyre'] = pbr('TyreRubber', (.018, .018, .02), 0.0, .82, IMG_RN, 1.1)
MAT['rim'] = pbr('RimSteel', (.50, .51, .53), 1.0, .38, IMG_N, .3, rough_img('rim', .38, .08))
MAT['chassis'] = pbr('ChassisBlack', (.03, .031, .034), .6, .5, IMG_RN, .5)
MAT['glassD'] = pbr('CabGlassTint', (.008, .011, .015), 0.0, .04, opacity=.78)
MAT['plate'] = pbr('PlateYellow', (.7, .55, .02), 0.0, .4)

def tyre(bm, cx, cy, cz, ro=.55, ri=.30, w=.30, n=48):
    """a lugged tyre: the profile is revolved about the axle (z); every other segment is a raised tread block"""
    prof = [(ri, -w / 2), (ro - .07, -w / 2), (ro - .025, -w / 2 + .035), (ro, -w / 2 + .09), (ro, w / 2 - .09), (ro - .025, w / 2 - .035), (ro - .07, w / 2), (ri, w / 2)]
    rings = []
    for k in range(n):
        a = 2 * math.pi * k / n; lug = (k % 2 == 0); ring = []
        for j, (r, dz) in enumerate(prof):
            rr = r - (.02 if (j in (2, 3, 4, 5) and not lug) else 0)
            ring.append(bm.verts.new(V(cx + rr * math.cos(a), cy + rr * math.sin(a), cz + dz)))
        rings.append(ring)
    m = len(prof)
    for k in range(n):
        for j in range(m): bm.faces.new((rings[k][j], rings[(k + 1) % n][j], rings[(k + 1) % n][(j + 1) % m], rings[k][(j + 1) % m]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

def wheel(name, parent, x, z, dual=False, steer=False):
    g = empty(name, parent, (x, .55, z)); sgn = 1 if z > 0 else -1
    bm = bmesh.new(); zs = (-.19, .19) if dual else (0.0,)
    for zz in zs: tyre(bm, 0, 0, zz)
    new_obj(name + '_Tyre', bm, MAT['tyre'], g, tile=.3)
    bm = bmesh.new()
    for zz in zs:
        add_cyl(bm, (0, 0, zz), .31, .26, 40, axis='z'); add_cyl(bm, (0, 0, zz + sgn * .115), .25, .05, 40, axis='z')
        for k in range(10):
            a = 2 * math.pi * k / 10; hexbolt(bm, math.cos(a) * .17, math.sin(a) * .17, zz + sgn * .15, r=.022, h=.03)
    add_cyl(bm, (0, 0, sgn * (.15 + (.19 if dual else 0))), .1, .07, 24, axis='z')
    new_obj(name + '_Rim', bm, MAT['rim'], g, bevel=.008, bev_seg=1)
    return g

# ================================================================ THE TRUCK
root = empty('OMGroupTipper')
AX_F = (3.55, 2.25); AX_R = (-2.35, -3.65)
HX, HY = -4.55, 1.32                                    # body hinge (rear), world
# ---- chassis: rails, cross members, axles, springs, tanks, exhaust
ch = empty('Chassis', root)
bm = bmesh.new()
for z in (-.46, .46): add_box(bm, (-.2, .98, z), (9.3, .3, .16))
for x in (-4.4, -3.0, -1.4, .2, 1.8, 3.3, 4.2): add_box(bm, (x, .96, 0), (.14, .24, 1.0))
new_obj('ChassisRails', bm, MAT['chassis'], ch, bevel=.02)
bm = bmesh.new()
for x in AX_F + AX_R:
    cyl_between(bm, (x, .55, -1.02), (x, .55, 1.02), .085, 18)
    add_cyl(bm, (x, .55, 0), .21, .3, 26)
    for z in (-.55, .55): add_box(bm, (x, .78, z), (.9, .08, .1))                 # leaf springs
    for z in (-.4, .4): add_box(bm, (x, .7, z), (.14, .3, .14))
new_obj('Axles', bm, MAT['steel'], ch, bevel=.012)
bm = bmesh.new()
add_cyl(bm, (.9, .72, 1.16), .36, 1.1, 30, axis='z'); add_cyl(bm, (-.2, .66, 1.16), .22, .9, 24, axis='z'); add_box(bm, (-1.2, .62, -1.1), (.9, .4, .38))
new_obj('FuelAirTanks', bm, MAT['steel'], ch, bevel=.02)
bm = bmesh.new()
for x in (.6, 1.2): add_box(bm, (x, .72, 1.17), (.07, .82, .06))
new_obj('TankStraps', bm, MAT['graphite'], ch, bevel=.004, bev_seg=1)
bm = bmesh.new(); cyl_between(bm, (2.15, 1.5, -1.3), (2.15, 3.5, -1.3), .07, 14); add_cyl(bm, (2.15, 3.55, -1.3), .1, .06, 14); add_box(bm, (2.15, 1.5, -1.2), (.3, .3, .2))
new_obj('ExhaustStack', bm, MAT['steel'], ch, bevel=.01)
bm = bmesh.new()                                          # drive shaft, gearbox, differential housings
cyl_between(bm, (3.0, .86, 0), (-2.3, .86, 0), .055, 14); add_cyl(bm, (2.6, .8, 0), .26, .9, 24, axis='z')
new_obj('Driveline', bm, MAT['graphite'], ch, bevel=.006)
bm = bmesh.new(); add_box(bm, (-4.95, .62, 0), (.12, .2, 2.2)); add_box(bm, (-4.88, .9, 0), (.1, .25, 2.2))
new_obj('RearUnderrun', bm, MAT['graphite'], ch, bevel=.02)
bm = bmesh.new()
for z in (-.95, .95): add_box(bm, (-4.99, 1.0, z), (.05, .22, .34)); add_box(bm, (-4.99, 1.0, z * .67), (.05, .12, .2))
add_box(bm, (-5.0, .82, 0), (.04, .18, .6))
new_obj('RearLights', bm, MAT['red'], ch, bevel=.01)
bm = bmesh.new(); add_box(bm, (-5.02, .82, 0), (.02, .14, .52)); new_obj('NumberPlate', bm, MAT['plate'], ch)
# ---- wheels
for i, x in enumerate(AX_F):
    for z in (-1.0, 1.0): wheel('Wheel_F%d%s' % (i + 1, 'L' if z > 0 else 'R'), root, x, z)
for i, x in enumerate(AX_R):
    for z in (-.82, .82): wheel('Wheel_R%d%s' % (i + 1, 'L' if z > 0 else 'R'), root, x, z, dual=True)
# ---- mudguards
def arch(name, x, z, R=.7, wd=.42, ang=(18, 162)):
    bm = bmesh.new(); pts_o = []; pts_i = []
    for k in range(13):
        a = math.radians(ang[0] + (ang[1] - ang[0]) * k / 12); pts_o.append((x + (R + .035) * math.cos(a), .55 + (R + .035) * math.sin(a))); pts_i.append((x + R * math.cos(a), .55 + R * math.sin(a)))
    prof = pts_o + pts_i[::-1]; prism(bm, prof, z - wd / 2, z + wd / 2); new_obj(name, bm, MAT['chassis'], root, bevel=.012, bev_seg=1)
for x in AX_F:
    for z in (-1.0, 1.0): arch('Mudguard_F_%d_%d' % (round(x * 10), z), x, z, wd=.4)
for z in (-1.0, 1.0):
    for x in AX_R: arch('Mudguard_R_%d_%d' % (round(x * 10), z), x, z * 1.0, R=.66, wd=.84, ang=(10, 170))
    bm = bmesh.new(); add_box(bm, (-4.65, .6, z * 1.0), (.04, .6, .5)); new_obj('Mudflap_%d' % z, bm, MAT['rubber'], root)
# ---- side underrun rails and step brackets
bm = bmesh.new()
for z in (-1.2, 1.2):
    cyl_between(bm, (-1.4, .62, z), (1.9, .62, z), .045, 12); cyl_between(bm, (-1.4, .86, z), (1.9, .86, z), .045, 12)
    for x in (-1.4, .25, 1.9): cyl_between(bm, (x, .62, z), (x, .95, z * .78), .035, 10)
new_obj('SideUnderrun', bm, MAT['steel'], root)
# ---- cab
CZ = 1.24
cab = empty('Cab', root)
bm = bmesh.new(); prism(bm, [(2.35, 1.3), (4.42, 1.3), (4.56, 1.58), (4.56, 2.98), (4.36, 3.34), (2.35, 3.34)], -CZ, CZ)
new_obj('CabShell', bm, MAT['cab'], cab, bevel=.11, bev_seg=3)
bm = bmesh.new(); add_box(bm, (4.62, 3.22, 0), (.34, .06, 2.5)); add_box(bm, (4.5, 3.34, 0), (.2, .16, 2.5))
new_obj('RoofVisor', bm, MAT['graphite'], cab, bevel=.02)
bm = bmesh.new(); add_box(bm, (4.55, 2.5, 0), (.07, 1.05, 2.18)); new_obj('Windscreen', bm, MAT['glassD'], cab, bevel=.02)
bm = bmesh.new()
for s in (-1, 1): add_box(bm, (3.55, 2.55, s * (CZ + .004)), (1.5, .95, .02)); add_box(bm, (4.35, 2.55, s * (CZ + .004)), (.34, .95, .02))
new_obj('SideGlass', bm, MAT['glassD'], cab, bevel=.01)
bm = bmesh.new()                                                       # window frames, door seams, handles
for s in (-1, 1):
    z = s * (CZ + .012)
    for x in (2.78, 4.3): add_box(bm, (x, 2.55, z), (.05, 1.0, .03))
    add_box(bm, (3.55, 3.05, z), (1.5, .05, .03)); add_box(bm, (3.55, 2.03, z), (1.5, .05, .03))
    add_box(bm, (3.4, 1.68, z), (.012, .74, .03)); add_box(bm, (4.38, 1.68, z), (.012, .74, .03)); add_box(bm, (2.9, 1.68, z), (.012, .74, .03))
    add_box(bm, (2.95, 1.88, z + s * .02), (.2, .035, .05)); add_box(bm, (4.1, 1.9, z + s * .02), (.2, .035, .05))
add_box(bm, (4.56, 3.04, 0), (.05, .05, 2.2)); add_box(bm, (4.56, 1.96, 0), (.05, .05, 2.2))
for x in (4.56,): add_box(bm, (x, 2.5, -1.1), (.06, 1.1, .05)); add_box(bm, (x, 2.5, 1.1), (.06, 1.1, .05)); add_box(bm, (x, 2.5, 0), (.06, 1.1, .03))
new_obj('CabTrim', bm, MAT['graphite'], cab, bevel=.006, bev_seg=1)
bm = bmesh.new()                                                       # front: grille, bumper, steps, headlights, wipers
add_box(bm, (4.58, 1.72, 0), (.04, .46, 1.5))
for k in range(7): add_box(bm, (4.605, 1.52 + k * .065, 0), (.03, .026, 1.44))
add_box(bm, (4.66, .98, 0), (.34, .3, 2.34)); add_box(bm, (4.66, .78, 0), (.3, .12, 2.1)); add_box(bm, (4.62, 1.25, 0), (.1, .1, 2.4))
new_obj('FrontEnd', bm, MAT['graphite'], cab, bevel=.02)
bm = bmesh.new()
for s in (-1, 1): add_box(bm, (4.62, 1.38, s * .98), (.1, .2, .42)); add_box(bm, (4.62, 1.1, s * 1.1), (.12, .14, .18))
new_obj('Headlights', bm, MAT['lamp'], cab, bevel=.02)
bm = bmesh.new()
for s in (-1, 1): add_box(bm, (4.62, 1.38, s * 1.17), (.08, .16, .12))
new_obj('Indicators', bm, MAT['amber'], cab, bevel=.015)
bm = bmesh.new(); add_cyl(bm, (4.61, 1.72, 0), .1, .03, 28, axis='x'); new_obj('GrilleBadge', bm, MAT['machined'], cab)
bm = bmesh.new()
for s in (-1, 1):
    for y, x in ((.62, 3.95), (1.0, 3.95)): add_box(bm, (x, y, s * 1.36), (.5, .05, .3))
    add_box(bm, (3.72, .8, s * 1.3), (.06, .78, .1)); add_box(bm, (4.18, .8, s * 1.3), (.06, .78, .1))
    cyl_between(bm, (4.28, 3.0, s * (CZ + .02)), (4.15, 2.9, s * 1.62), .02, 8); add_box(bm, (4.12, 2.8, s * 1.66), (.12, .62, .1)); add_box(bm, (4.12, 2.45, s * 1.66), (.12, .26, .08))
    cyl_between(bm, (4.52, 2.0, s * .55), (4.53, 2.9, s * .08), .012, 8)
new_obj('MirrorsStepsWipers', bm, MAT['graphite'], cab, bevel=.01, bev_seg=1)
bm = bmesh.new()                                                       # orange stripe along the cab and a yellow reflective belt line (as on the OM GROUP trucks)
for s in (-1, 1): add_box(bm, (3.45, 1.43, s * (CZ + .008)), (2.2, .035, .015)); add_box(bm, (3.45, 1.37, s * (CZ + .008)), (2.2, .02, .015))
add_box(bm, (4.575, 1.42, 0), (.012, .035, 2.3))
new_obj('CabStripe', bm, MAT['stripe'], cab)
# logo on both cab doors
decal('Logo_Door_L', MAT['logo'], cab, (3.63, 1.7, CZ + .016), .82)
decal('Logo_Door_R', MAT['logo'], cab, (3.63, 1.7, -CZ - .016), .82, side=-1)

# ---- body (the tipping bed), hinged at the rear
bed = empty('Bed', root, (HX, HY, 0))
BL_, BZ = 6.3, 1.25
bm = bmesh.new(); add_box(bm, (BL_ / 2, -.07, 0), (BL_, .12, 2 * BZ - .1))
for x in (.7, 1.8, 2.9, 4.0, 5.1, 6.0): add_box(bm, (x, -.2, 0), (.12, .14, 2.3))
for z in (-.7, 0, .7): add_box(bm, (BL_ / 2, -.2, z), (BL_, .12, .12))
new_obj('BodyFloor', bm, MAT['body'], bed, bevel=.012, bev_seg=1)
bm = bmesh.new()
for s in (-1, 1):
    add_box(bm, (BL_ / 2, .78, s * (BZ - .03)), (BL_, 1.56, .08)); add_box(bm, (BL_ / 2, 1.58, s * (BZ - .02)), (BL_ + .06, .1, .2))
    for x in np.linspace(.35, BL_ - .35, 8): add_box(bm, (x, .75, s * (BZ + .03)), (.09, 1.5, .07))
    add_box(bm, (BL_ / 2, .06, s * (BZ + .03)), (BL_, .12, .08))
add_box(bm, (BL_ + .0, 1.05, 0), (.1, 2.1, 2 * BZ))                                         # front bulkhead
add_box(bm, (BL_ + .75, 2.12, 0), (1.55, .09, 2 * BZ + .1)); add_box(bm, (BL_ + 1.55, 2.06, 0), (.12, .24, 2 * BZ + .1))     # cab guard over the roof
for s in (-1, 1): add_box(bm, (BL_ + .75, 1.65, s * (BZ - .1)), (1.4, .09, .08)); prism(bm, [(BL_ - .05, 1.5), (BL_ + 1.5, 2.05), (BL_ + 1.5, 2.1), (BL_ - .05, 2.1)], s * (BZ - .06) - .02, s * (BZ - .06) + .02)
for x in np.linspace(.5, BL_ - .5, 5): add_box(bm, (BL_ + .02, 1.05, (x - BL_ / 2) * .4), (.12, 1.9, .08))
add_box(bm, (-.04, .78, 0), (.09, 1.5, 2 * BZ - .12))                                       # tailgate
add_box(bm, (-.08, 1.55, 0), (.12, .1, 2 * BZ)); add_box(bm, (-.1, .78, 0), (.04, .1, 2 * BZ - .2)); add_box(bm, (-.1, .4, 0), (.04, .1, 2 * BZ - .2)); add_box(bm, (-.1, 1.15, 0), (.04, .1, 2 * BZ - .2))
new_obj('BodyShell', bm, MAT['body'], bed, bevel=.02, bev_seg=2)
bm = bmesh.new()
for s in (-1, 1):
    for x in np.linspace(.25, BL_ - .3, 12): add_box(bm, (x, .11, s * (BZ + .066)), (.36, .06, .014))        # reflective belt, segment by segment
    for x in np.linspace(.5, BL_ - .5, 6): hexbolt(bm, x, 1.49, s * (BZ + .01), r=.025, h=.02, axis='z')
    for x in (.15, BL_ - .15): add_box(bm, (x, 1.45, s * (BZ + .066)), (.12, .1, .014))
new_obj('BodyReflectors', bm, MAT['reflect'], bed)
bm = bmesh.new(); add_cyl(bm, (0, 0, 0), .075, 2.0, 16, axis='z'); add_box(bm, (.2, -.1, 0), (.5, .2, 1.2))
new_obj('HingePin', bm, MAT['machined'], bed, bevel=.006)
bm = bmesh.new()
for s in (-1, 1): add_box(bm, (-.02, .0, s * .5), (.18, .3, .14))
new_obj('HingeBrackets', bm, MAT['graphite'], bed, bevel=.01)
# logos on the body side
decal('Logo_Body_L', MAT['logo'], bed, (3.15, .78, BZ + .072), 2.0)
decal('Logo_Body_R', MAT['logo'], bed, (3.15, .78, -BZ - .072), 2.0, side=-1)
decal('Logo_Tailgate', MAT['logo'], bed, (-.108, .78, 0), 1.3, plane='x')
# ---- hoist (3-stage telescopic)
HA = (-1.4, .52); HB = (4.4, -.17)                                          # chassis pin (world) and body lug (bed frame)
d0 = math.hypot(HB[0] + HX - HA[0], HB[1] + HY - HA[1])
dmax = 0
for th in np.linspace(0, .62, 20):
    bx = HX + math.cos(th) * HB[0] - math.sin(th) * HB[1]; by = HY + math.sin(th) * HB[0] + math.cos(th) * HB[1]; dmax = max(dmax, math.hypot(bx - HA[0], by - HA[1]))
hoist = empty('Cyl_Hoist', root, (HA[0], HA[1], 0)); tipH = empty('Tip_Hoist', bed, (HB[0], HB[1], 0)); hoist['d0'] = float(d0); hoist['dmax'] = float(dmax)
LB1 = min(1.2, d0 - .12)
bm = bmesh.new(); add_cyl(bm, (0, 0, 0), .11, .26, 22, axis='z'); cyl_between(bm, (.05, 0, 0), (LB1, 0, 0), .13, 28); cyl_between(bm, (LB1 - .04, 0, 0), (LB1, 0, 0), .15, 28)
new_obj('Hoist_Barrel', bm, MAT['graphite'], hoist, bevel=.01)
s1 = empty('Hoist_Stage1', hoist, (0, 0, 0)); s2 = empty('Hoist_Stage2', hoist, (0, 0, 0))
bm = bmesh.new(); cyl_between(bm, (.02, 0, 0), (LB1 - .05, 0, 0), .1, 24); cyl_between(bm, (LB1 - .09, 0, 0), (LB1 - .05, 0, 0), .115, 24)
new_obj('Hoist_Stage1M', bm, MAT['steel'], s1, bevel=.008)
bm = bmesh.new(); cyl_between(bm, (.06, 0, 0), (d0 - .08, 0, 0), .07, 24); add_cyl(bm, (d0, 0, 0), .09, .22, 22, axis='z'); cyl_between(bm, (d0 - .14, 0, 0), (d0 - .04, 0, 0), .1, 22)
new_obj('Hoist_Stage2M', bm, MAT['chrome'], s2)
bm = bmesh.new(); add_box(bm, (HA[0], HA[1] - .12, 0), (.34, .22, .5)); add_cyl(bm, (HA[0], HA[1], .0), .08, .5, 18, axis='z')
new_obj('HoistMount', bm, MAT['graphite'], root, bevel=.012)
bm = bmesh.new(); add_box(bm, (HB[0], HB[1] - .08, 0), (.3, .2, .5)); add_cyl(bm, (HB[0], HB[1], 0), .075, .5, 18, axis='z')
new_obj('HoistLug', bm, MAT['graphite'], bed, bevel=.012)
print('[tipper3d] hoist pin distance', round(d0, 2), '->', round(dmax, 2))

def sel_tree(o):
    o.select_set(True)
    for c in o.children: sel_tree(c)
bpy.ops.object.select_all(action='DESELECT'); sel_tree(root); bpy.context.view_layer.objects.active = root
opts = dict(filepath=GLB, export_format='GLB', use_selection=True, export_apply=True, export_texcoords=True, export_normals=True, export_tangents=False,
            export_materials='EXPORT', export_yup=True, export_cameras=False, export_lights=False, export_extras=True, export_image_format='WEBP', export_image_quality=82)
for drop in ([], ['export_image_quality'], ['export_image_quality', 'export_image_format']):
    try: bpy.ops.export_scene.gltf(**{k: v for k, v in opts.items() if k not in drop}); break
    except TypeError as e: print('[tipper3d] gltf option retry', e)
print('[tipper3d] GLB', os.path.getsize(GLB), 'bytes')
json.dump({'hinge': [HX, HY], 'hoist': {'d0': d0, 'dmax': dmax, 'pinA': HA, 'pinB': HB}, 'bedLen': BL_, 'bedHalfWidth': BZ}, open(os.path.join(ROOT, 'assets', '3d', 'om-group-tipper.json'), 'w'), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'om-group-tipper.blend'))
print('[tipper3d] done')
