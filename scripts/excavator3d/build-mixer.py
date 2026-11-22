"""OM GROUP - 6x4 transit mixer (Ready-mix concrete page, the reveal figure).

  blender -b --factory-startup -P scripts/excavator3d/build-mixer.py -- <repo root>

Output
  assets/3d/om-group-transit-mixer.glb    the truck: white cab with the OM GROUP mark on both doors, tilted drum with orange outer helix and two inner mixing blades
  assets/3d/om-group-transit-mixer.json   the drum constants (tilt, axis point, radius profile) the web scene needs to build the concrete inside it
  _review/excavator3d/om-group-transit-mixer.blend

Metres, three.js axes. The chassis, wheels and cab come from the same code as build-tipper.py. Nodes: Drum (rotates about its local x axis) under DrumTilt (the 13 degree tilt);
DrumCradle is fixed in the tilted frame (rollers, hopper). The fresh concrete is generated in the browser from the drum profile, because it is animated.
"""
import bpy, bmesh, math, json, os, sys
import numpy as np
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd())
OUT = os.path.join(ROOT, '_review', 'excavator3d'); TEX = os.path.join(OUT, 'tex')
os.makedirs(TEX, exist_ok=True)
GLB = os.path.join(ROOT, 'assets', '3d', 'om-group-transit-mixer.glb')
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
root = empty('OMGroupTransitMixer')
AX_F = (3.55,); AX_R = (-2.35, -3.65)
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
# ---- cab (forward-control day cab: sloped windscreen, sunk side windows, panelled doors, grille, lamps, mirrors, steps, roof deflector)
CZ = 1.24
cab = empty('Cab', root)
MAT['glassC'] = pbr('CabGlassClear', (.02, .03, .036), 0.0, .03, opacity=.5)
MAT['chromeT'] = pbr('ChromeTrim', (.82, .83, .85), 1.0, .16)
SLOPE = Vector((-.205, 1.0)).normalized(); NRM = Vector((SLOPE.y, -SLOPE.x))          # windscreen direction and its outward normal
WS0 = Vector((4.605, 2.26)); WS1 = WS0 + SLOPE * 1.05
bm = bmesh.new(); prism(bm, [(2.35, 1.3), (4.44, 1.3), (4.6, 1.46), (4.6, 2.26), (WS1.x - .02, 3.30), (4.28, 3.4), (2.45, 3.4), (2.35, 3.28)], -CZ, CZ)
new_obj('CabShell', bm, MAT['cab'], cab, bevel=.13, bev_seg=4)
# rear panel detail and the roof: a swept air deflector and a sun visor over the windscreen
bm = bmesh.new(); prism(bm, [(2.4, 3.36), (3.2, 3.38), (3.2, 3.66), (2.75, 3.98), (2.4, 4.05)], -CZ + .1, CZ - .1)
new_obj('AirDeflector', bm, MAT['cab'], cab, bevel=.06, bev_seg=3)
bm = bmesh.new(); prism(bm, [(4.3, 3.36), (4.68, 3.3), (4.7, 3.36), (4.32, 3.44)], -CZ + .08, CZ - .08); new_obj('SunVisor', bm, MAT['graphite'], cab, bevel=.012, bev_seg=1)
bm = bmesh.new()
for z in (-.8, -.4, 0, .4, .8): add_box(bm, (4.5, 3.455, z), (.1, .05, .2))
new_obj('RoofMarkers', bm, MAT['amber'], cab, bevel=.015)
# windscreen: sloped glass in a black frame, with two wipers
P = lambda p, k: (p.x + NRM.x * k, p.y + NRM.y * k)
bm = bmesh.new(); prism(bm, [P(WS0, .006), P(WS1, .006), P(WS1, .034), P(WS0, .034)], -CZ + .13, CZ - .13); new_obj('Windscreen', bm, MAT['glassC'], cab)
bm = bmesh.new()
for a, b in ((WS0, WS1),):
    prism(bm, [P(WS0 - SLOPE * .0, .004), P(WS0 + SLOPE * .07, .004), P(WS0 + SLOPE * .07, .028), P(WS0, .028)], -CZ + .1, CZ - .1)
    prism(bm, [P(WS1 - SLOPE * .07, .004), P(WS1, .004), P(WS1, .028), P(WS1 - SLOPE * .07, .028)], -CZ + .1, CZ - .1)
    for z0 in (-CZ + .1, CZ - .13): prism(bm, [P(WS0, .004), P(WS1, .004), P(WS1, .028), P(WS0, .028)], z0, z0 + .03)
    prism(bm, [P(WS0 + SLOPE * .5, .004), P(WS0 + SLOPE * .53, .004), P(WS0 + SLOPE * .53, .03), P(WS0 + SLOPE * .5, .03)], -.02, .02)
new_obj('WindscreenFrame', bm, MAT['graphite'], cab, bevel=.004, bev_seg=1)
bm = bmesh.new()
for z in (-.55, .35):
    a = WS0 + SLOPE * .1; b = WS0 + SLOPE * .82; cyl_between(bm, (a.x + NRM.x * .05, a.y + NRM.y * .05, z), (b.x + NRM.x * .05, b.y + NRM.y * .05, z + .55), .012, 6)
    cyl_between(bm, (a.x + NRM.x * .045, a.y + NRM.y * .045, z), (a.x + NRM.x * .045 + .03, a.y + NRM.y * .045 - .04, z - .04), .02, 8)
new_obj('Wipers', bm, MAT['rubber'], cab)
# side windows (both sides): glass shaped to the A-pillar, black surround, door seams, handles
for s in (-1, 1):
    zg = s * CZ
    bm = bmesh.new(); prism(bm, [(3.0, 2.2), (4.47, 2.2), (4.42, 3.1), (3.0, 3.1)], min(zg - .01, zg + .014), max(zg - .01, zg + .014)); new_obj('SideGlass_%d' % s, bm, MAT['glassC'], cab)
    bm = bmesh.new(); zz = s * (CZ + .008); zt = (zz - .014, zz + .014)
    for poly in ([(2.94, 2.14), (4.52, 2.14), (4.52, 2.2), (2.94, 2.2)], [(2.94, 3.1), (4.43, 3.1), (4.43, 3.16), (2.94, 3.16)], [(2.94, 2.14), (3.0, 2.14), (3.0, 3.16), (2.94, 3.16)], [(4.47, 2.14), (4.53, 2.14), (4.45, 3.16), (4.39, 3.16)]): prism(bm, poly, *zt)
    new_obj('SideWindowFrame_%d' % s, bm, MAT['graphite'], cab, bevel=.004, bev_seg=1)
    bm = bmesh.new(); zz = s * (CZ + .006); zt = (zz - .006, zz + .006)
    for poly in ([(2.9, 1.37), (4.55, 1.37), (4.55, 1.39), (2.9, 1.39)], [(2.9, 1.37), (2.92, 1.37), (2.92, 3.2), (2.9, 3.2)], [(4.53, 1.37), (4.55, 1.37), (4.55, 2.3), (4.53, 2.3)], [(2.9, 2.2), (4.5, 2.2), (4.5, 2.215), (2.9, 2.215)]): prism(bm, poly, *zt)
    new_obj('DoorSeams_%d' % s, bm, MAT['graphite'], cab)
    bm = bmesh.new(); hz = s * (CZ + .03); add_box(bm, (3.0, 2.0, hz), (.26, .045, .05)); add_box(bm, (2.9, 2.0, hz - s * .02), (.05, .07, .06)); add_box(bm, (3.0, 1.9, s * (CZ + .02)), (.07, .07, .03))
    new_obj('DoorHandle_%d' % s, bm, MAT['chromeT'], cab, bevel=.008, bev_seg=1)
# the grille, headlamps, bumper, mudguard flares, steps
bm = bmesh.new(); add_box(bm, (4.61, 1.88, 0), (.05, .66, 1.52)); new_obj('GrilleFrame', bm, MAT['chromeT'], cab, bevel=.02, bev_seg=2)
bm = bmesh.new(); add_box(bm, (4.635, 1.88, 0), (.03, .58, 1.42))
for k in range(8): add_box(bm, (4.655, 1.62 + k * .075, 0), (.025, .03, 1.38))
new_obj('GrilleSlats', bm, MAT['graphite'], cab, bevel=.004, bev_seg=1)
bm = bmesh.new(); add_cyl(bm, (4.675, 1.9, 0), .1, .03, 36, axis='x'); new_obj('GrilleBadge', bm, MAT['machined'], cab)
for s in (-1, 1):
    bm = bmesh.new(); prism(bm, [(4.52, 1.62), (4.63, 1.64), (4.64, 2.12), (4.52, 2.14)], s * .86, s * 1.18) if s > 0 else prism(bm, [(4.52, 1.62), (4.63, 1.64), (4.64, 2.12), (4.52, 2.14)], s * 1.18, s * .86)
    new_obj('HeadlampHousing_%d' % s, bm, MAT['graphite'], cab, bevel=.02, bev_seg=2)
    bm = bmesh.new(); add_box(bm, (4.655, 1.97, s * 1.02), (.03, .13, .26)); add_box(bm, (4.655, 1.76, s * 1.02), (.03, .1, .24)); new_obj('HeadlampLens_%d' % s, bm, MAT['lamp'], cab, bevel=.015, bev_seg=2)
    bm = bmesh.new(); add_box(bm, (4.652, 1.76, s * 1.13), (.03, .08, .08)); new_obj('Indicator_%d' % s, bm, MAT['amber'], cab, bevel=.015)
    bm = bmesh.new(); add_box(bm, (4.6, 1.06, s * .9), (.05, .12, .22)); new_obj('FogLamp_%d' % s, bm, MAT['lamp'], cab, bevel=.02)
bm = bmesh.new(); add_box(bm, (4.68, 1.0, 0), (.34, .32, 2.38)); add_box(bm, (4.62, 1.27, 0), (.12, .1, 2.34)); add_box(bm, (4.7, .78, 0), (.26, .1, 2.0))
for s in (-1, 1): add_box(bm, (4.4, 1.08, s * 1.28), (.46, .34, .22))
new_obj('Bumper', bm, MAT['graphite'], cab, bevel=.035, bev_seg=3)
bm = bmesh.new(); add_box(bm, (4.64, .77, 0), (.18, .035, 1.3)); new_obj('BumperPlate', bm, MAT['plate'], cab)
for s in (-1, 1):
    bm = bmesh.new()
    for y in (.62, 1.0): add_box(bm, (3.82, y, s * 1.4), (.62, .05, .34))
    add_box(bm, (3.5, .81, s * 1.34), (.06, .8, .12)); add_box(bm, (4.14, .81, s * 1.34), (.06, .8, .12))
    new_obj('Steps_%d' % s, bm, MAT['graphite'], cab, bevel=.008, bev_seg=1)
# mirrors: a main and a wide-angle housing on a bracket, with glass faces
for s in (-1, 1):
    bm = bmesh.new(); cyl_between(bm, (4.34, 2.9, s * (CZ + .02)), (4.2, 2.75, s * 1.68), .022, 8); cyl_between(bm, (4.34, 2.46, s * (CZ + .02)), (4.22, 2.5, s * 1.68), .022, 8); add_box(bm, (4.2, 2.7, s * 1.7), (.16, .86, .035)); new_obj('MirrorArm_%d' % s, bm, MAT['graphite'], cab, bevel=.008)
    bm = bmesh.new(); add_box(bm, (4.18, 2.88, s * 1.76), (.12, .46, .13)); add_box(bm, (4.18, 2.4, s * 1.74), (.12, .24, .11)); new_obj('MirrorHousing_%d' % s, bm, MAT['graphite'], cab, bevel=.03, bev_seg=3)
    bm = bmesh.new(); add_box(bm, (4.255, 2.88, s * 1.76), (.006, .4, .115)); add_box(bm, (4.245, 2.4, s * 1.74), (.006, .2, .095)); new_obj('MirrorGlass_%d' % s, bm, MAT['chromeT'], cab)
# a dashboard, steering wheel, seats and the cab floor seen through the glass
bm = bmesh.new(); add_box(bm, (4.1, 2.12, 0), (.55, .22, 2.0)); add_box(bm, (3.9, 2.0, 0), (.5, .08, 2.0))
for s in (-1, 1): add_box(bm, (3.35, 1.7, s * .55), (.62, .45, .6)); add_box(bm, (3.08, 2.3, s * .55), (.16, .85, .58))
new_obj('CabInterior', bm, MAT['seat'], cab, bevel=.03, bev_seg=2)
bm = bmesh.new(); add_cyl(bm, (3.95, 2.33, .5), .22, .035, 28, axis='x'); bm.verts.ensure_lookup_table()
new_obj('SteeringWheel', bm, MAT['graphite'], cab)
# orange cab stripe and the reflective belt at the bottom of the doors
bm = bmesh.new()
for s in (-1, 1): add_box(bm, (3.7, 1.44, s * (CZ + .01)), (1.62, .035, .014)); add_box(bm, (3.7, 1.395, s * (CZ + .01)), (1.62, .018, .014))
add_box(bm, (4.605, 1.52, 0), (.012, .03, 1.46))
new_obj('CabStripe', bm, MAT['stripe'], cab)
# the OM GROUP logo, centred on the lower door panel (between the stripe and the window sill, clear of the handle and the seams), both doors
LW = .74; LC = (3.72, 1.88)
decal('Logo_Door_L', MAT['logo'], cab, (LC[0], LC[1], CZ + .018), LW)
decal('Logo_Door_R', MAT['logo'], cab, (LC[0], LC[1], -CZ - .018), LW, side=-1)


# ================================================================ THE MIXER DRUM (rotating) + cradle + chute
T = math.radians(13.0); P0 = (-.75, 2.85)                       # drum axis: tilt (front end lower) and the world point the axis passes at local x = 0
PROF = [(-2.72, .68), (-2.6, .8), (-2.3, .98), (-1.8, 1.12), (-1.1, 1.19), (.2, 1.2), (1.2, 1.12), (1.7, .93), (2.15, .64), (2.36, .34), (2.45, .02)]
dense = catmull([Vector((x, r, 0)) for x, r in PROF], 16)
DX = np.array([p.x for p in dense]); DR = np.array([max(p.y, .02) for p in dense])
XMIN, XMAX = float(DX.min()), float(DX.max()); LEN = XMAX - XMIN
def rad(x): return float(np.interp(x, DX, DR))
THK = .045                                                      # shell thickness
PITCH = 2.1                                                     # axial advance per turn of each helix
def pts_between(a, b, n): return [(a + (b - a) * i / n) for i in range(n + 1)]

def cyl_uv(bm):
    uvl = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        us = []
        for lp in f.loops:
            c = lp.vert.co; ang = math.atan2(c.z * -1.0, c.y) if False else math.atan2(c.y, c.z)     # blender: axis x; radial = (y, z)
            us.append(ang / (2 * math.pi) + .5)
        if max(us) - min(us) > .5: us = [u + 1 if u < .5 else u for u in us]
        for lp, u in zip(f.loops, us): lp[uvl].uv = (u * 3.0, (lp.vert.co.x - XMIN) / LEN * 2.0)
def lathe(bm, rows, seg, rof=0.0):
    rings = []
    for (x, r) in rows:
        rings.append([bm.verts.new(V(x, (r + rof) * math.cos(2 * math.pi * j / seg), (r + rof) * math.sin(2 * math.pi * j / seg))) for j in range(seg)])
    fs = []
    for i in range(len(rows) - 1):
        for j in range(seg): fs.append(bm.faces.new((rings[i][j], rings[i][(j + 1) % seg], rings[i + 1][(j + 1) % seg], rings[i + 1][j])))
    return fs
def outward(bm, want_out=True):
    bm.faces.ensure_lookup_table(); f = bm.faces[len(bm.faces) // 2]; c = f.calc_center_median(); rv = Vector((0, c.y, c.z))
    if (f.normal.dot(rv) > 0) != want_out: bmesh.ops.reverse_faces(bm, faces=list(bm.faces))

# surfaces / materials of the drum
def grunge(name, base, var, spl=None, streak=0.0, seed=1, rough=(.55, .12), nstr=.6):
    rng = np.random.default_rng(seed); N = 512
    n1, n2, n3 = pnoise(rng, N, 1.1), pnoise(rng, N, .5), pnoise(rng, N, 2.0)
    a = np.empty((N, N, 3)); a[:] = base; a *= (1 + var * (.6 * n1 + .4 * n2))[..., None]
    if spl is not None:
        m = np.clip((n1 - .9) * 2.2, 0, 1) * np.clip(.6 + .4 * n3, 0, 1); a = a * (1 - m[..., None]) + np.array(spl) * m[..., None]
    if streak:
        sr = pnoise(rng, N, 1.6); st = np.repeat(sr[:1, :], N, axis=0) * .6 + sr * .4; a *= (1 - streak * np.clip(st * .5 + .3, 0, 1))[..., None]
    a = np.clip(a, 0, 1); h = .5 * n1 + .3 * n2 + .25 * n3
    return save_img(name + '_a', a, 'sRGB'), save_img(name + '_n', normal_from_height(h * .09, 1.0), 'Non-Color'), save_img(name + '_r', np.clip(rough[0] + rough[1] * h / (np.abs(h).max() + 1e-9), .08, 1), 'Non-Color')
def drum_mat(name, base, var, spl, streak, seed, metal=.0, rough=(.6, .15), nstr=.7):
    al, nm, rg = grunge(name, base, var, spl, streak, seed, rough)
    return pbr(name, al, metal, .6, nm, nstr, rg)
MAT['drumOut'] = drum_mat('DrumOuter', (.60, .60, .585), .2, (.72, .715, .70), .3, 3, 0.15, (.55, .18), .5)
MAT['drumIn'] = drum_mat('DrumInner', (.50, .485, .45), .3, (.66, .63, .56), .4, 7, 0.25, (.62, .2), .9)
MAT['blade'] = drum_mat('DrumBlade', (.46, .44, .41), .35, (.62, .56, .46), .3, 11, 0.55, (.5, .2), .8)
MAT['orangeP'] = pbr('DrumOrange', tuple(c * .92 for c in srgb('#FF5E29')), 0.0, .42, IMG_N, .25, rough_img('orangeP', .42, .06), coat=.25)
MAT['ringSteel'] = pbr('RingSteel', (.12, .125, .13), .85, .45, IMG_N, .5, rough_img('ringsteel', .45, .1))
MAT['galv'] = pbr('GalvanisedSteel', (.62, .64, .66), 1.0, .34, IMG_N, .4, rough_img('galv', .34, .08))
MAT['gearbox'] = pbr('GearboxGrey', (.30, .31, .32), .45, .5, IMG_N, .4, rough_img('gearbox', .5, .08))

drum = empty('Drum', None)
tilt = empty('DrumTilt', root, (P0[0], P0[1], 0)); tilt.rotation_euler = (0, T, 0)       # about the blender +y axis = three -z: the front (x+) end goes down
drum.parent = tilt
cradle = empty('DrumCradle', tilt)                                                        # fixed in the tilted frame: rollers, hopper
rows = [(float(x), float(r)) for x, r in zip(DX, DR)]
bm = bmesh.new(); lathe(bm, rows, 96); outward(bm, True); cyl_uv(bm); new_obj('DrumOuter', bm, MAT['drumOut'], drum, uv=False)
bm = bmesh.new(); lathe(bm, rows, 96, -THK); outward(bm, False); cyl_uv(bm); new_obj('DrumInner', bm, MAT['drumIn'], drum, uv=False)
# the lip at the mouth (rolled edge) and the head hub
bm = bmesh.new(); add_cyl(bm, (XMIN + .03, 0, 0), .0, .0, 3, axis='x') if False else None
lip = [(XMIN - .0, rad(XMIN) + .05), (XMIN + .07, rad(XMIN + .07) + .05), (XMIN + .07, rad(XMIN + .07) - THK - .01), (XMIN - .0, rad(XMIN) - THK - .01)]
bm = bmesh.new(); ring = []
for (x, r) in lip: ring.append([bm.verts.new(V(x, r * math.cos(2 * math.pi * j / 72), r * math.sin(2 * math.pi * j / 72))) for j in range(72)])
for i in range(4):
    for j in range(72): bm.faces.new((ring[i][j], ring[i][(j + 1) % 72], ring[(i + 1) % 4][(j + 1) % 72], ring[(i + 1) % 4][j]))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces); new_obj('DrumLip', bm, MAT['ringSteel'], drum, bevel=.006, bev_seg=1)
bm = bmesh.new(); add_cyl(bm, (XMAX + .09, 0, 0), .34, .3, 40, axis='x'); add_cyl(bm, (XMAX + .3, 0, 0), .16, .3, 28, axis='x')
for k in range(10): a = 2 * math.pi * k / 10; hexbolt(bm, XMAX + .02, .27 * math.cos(a), .27 * math.sin(a), r=.025, h=.04, axis='x')
new_obj('DrumHub', bm, MAT['machined'], drum, bevel=.008)
# drive ring (the roller track) and a flange ring, each a short band standing proud of the shell
def band(name, x0, wd, grow, mat):
    xs = pts_between(x0 - wd / 2, x0 + wd / 2, 6); bm = bmesh.new(); lathe(bm, [(x, rad(x) + grow) for x in xs], 96); outward(bm, True)
    return new_obj(name, bm, mat, drum, bevel=.012, bev_seg=1)
band('RollerTrack', -1.35, .36, .06, MAT['ringSteel']); band('DriveFlange', .85, .12, .05, MAT['ringSteel'])
# the helical ribbon painted on the outside (two-start): the weld line of the blades inside it, painted orange
def helix_ribbon(name, phi0, x_a, x_b, w, h_in, h_out, mat, parent, inner=False, steps_per_turn=64, thick_x=None):
    turns = (x_b - x_a) / PITCH; n = max(8, int(turns * steps_per_turn)); bm = bmesh.new(); rings = []
    for i in range(n + 1):
        x = x_a + (x_b - x_a) * i / n; ang = phi0 + 2 * math.pi * (x - x_a) / PITCH; ca, sa = math.cos(ang), math.sin(ang)
        if inner:
            r_o = rad(x) - THK + .002; r_i = r_o - h_in; xs = (x - w / 2, x + w / 2); poly = [(xs[0], r_i), (xs[1], r_i), (xs[1], r_o), (xs[0], r_o)]
        else:
            xs = (x - w / 2, x + w / 2); poly = [(xs[0], rad(xs[0]) - .012), (xs[1], rad(xs[1]) - .012), (xs[1], rad(xs[1]) + h_out), (xs[0], rad(xs[0]) + h_out)]
        rings.append([bm.verts.new(V(px, rr * ca, rr * sa)) for (px, rr) in poly])
    for i in range(n):
        for j in range(4): bm.faces.new((rings[i][j], rings[i][(j + 1) % 4], rings[i + 1][(j + 1) % 4], rings[i + 1][j]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1]); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_obj(name, bm, mat, parent, bevel=.004, bev_seg=1)
for k in range(2):
    helix_ribbon('DrumRibbon_%d' % k, math.pi * k, XMIN + .45, XMAX - .35, .26, 0, .03, MAT['orangeP'], drum)
    helix_ribbon('DrumBlade_%d' % k, math.pi * k + .0, XMIN + .55, XMAX - .5, .03, .34, 0, MAT['blade'], drum, inner=True)
# blade root welds + a scraper lip on the leading edge are folded into the blade; add inner end plates near the mouth (hold-back ring)
bm = bmesh.new(); xs = pts_between(XMIN + .5, XMIN + .62, 2); lathe(bm, [(x, rad(x) - THK) for x in xs], 96); [lathe(bm, [(x, rad(x) - THK - .16) for x in xs], 96)]; bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
new_obj('MouthWeir', bm, MAT['blade'], drum, bevel=.004, bev_seg=1)

# ---- cradle: rollers under the track ring, drive housing at the head, charge hopper
bm = bmesh.new(); bz = math.radians(32)
for s in (-1, 1):
    cy, cz = -1.39 * math.cos(bz), s * 1.39 * math.sin(bz)
    add_cyl(bm, (-1.35, cy, cz), .17, .36, 36, axis='x'); add_cyl(bm, (-1.35, cy, cz), .06, .56, 20, axis='x')
new_obj('Rollers', bm, MAT['machined'], cradle, bevel=.01)
bm = bmesh.new(); lathe(bm, [(XMIN - .05, rad(XMIN) + .12), (XMIN - .3, rad(XMIN) + .09), (XMIN - .62, rad(XMIN) - .08)], 72); lathe(bm, [(XMIN - .05, rad(XMIN) + .1), (XMIN - .3, rad(XMIN) + .07), (XMIN - .62, rad(XMIN) - .1)], 72)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces); new_obj('ChargeHopper', bm, MAT['galv'], cradle, bevel=.006, bev_seg=1)
# static frame work in world coordinates (the cradle's supports go down to the chassis rails)
bm = bmesh.new()
for s in (-1, 1):
    add_box(bm, (-2.14, 1.55, s * .74), (.55, .95, .2)); add_box(bm, (-2.14, 1.12, s * .74), (.9, .1, .5))
add_box(bm, (-2.14, 1.72, 0), (.28, .22, 1.5)); add_box(bm, (-2.14, 1.2, 0), (.3, .2, 1.6))
new_obj('RearPedestal', bm, MAT['gearbox'], root, bevel=.02)
hubw = (P0[0] + (XMAX + .3) * math.cos(T), P0[1] - (XMAX + .3) * math.sin(T))
bm = bmesh.new(); add_box(bm, (hubw[0] + .05, (1.1 + hubw[1]) / 2 - .1, 0), (.5, hubw[1] - 1.1 + .2, .9)); add_box(bm, (hubw[0] - .05, 1.15, 0), (1.0, .1, 1.5))
new_obj('HeadSupport', bm, MAT['gearbox'], root, bevel=.03, bev_seg=2)
bm = bmesh.new(); add_box(bm, (hubw[0] + .3, hubw[1] - .62, .55), (.62, .85, .5)); add_cyl(bm, (hubw[0] + .3, hubw[1] - .85, -.35), .17, .8, 24, axis='x'); add_cyl(bm, (hubw[0] + .05, hubw[1] - .2, -.35), .13, .5, 20, axis='y')
new_obj('DriveBox', bm, MAT['gearbox'], root, bevel=.03, bev_seg=2)
for nm, pp in (('HydraulicHose', [(hubw[0] + .3, hubw[1] - .25, -.35), (hubw[0] + .6, hubw[1] - .9, -.5), (hubw[0] + .7, 1.5, -.55)]),):
    bm = bmesh.new(); tube(bm, pp, .04, 8); new_obj(nm, bm, MAT['rubber'], root)
# discharge chute: an open galvanised trough from under the hopper, with its arm; the water tank and a ladder
cp0 = Vector((-3.55, 2.85)); cp1 = Vector((-5.65, 1.55)); d = cp1 - cp0; ca = math.atan2(d.y, d.x); ln = d.length; nrm = Vector((-math.sin(ca), math.cos(ca)))
mid = (cp0 + cp1) / 2
bm = bmesh.new(); add_box(bm, (mid.x, mid.y, 0), (ln, .035, .62), Rz(ca))
for s in (-1, 1): c = mid + nrm * .1; add_box(bm, (c.x, c.y, s * .3), (ln, .2, .035), Rz(ca))
add_box(bm, (cp0.x, cp0.y + .05, 0), (.22, .24, .72), Rz(ca))
new_obj('ChuteTrough', bm, MAT['galv'], root, bevel=.008, bev_seg=1)
bm = bmesh.new(); cyl_between(bm, (-3.0, 2.4, .42), (-3.6, 2.75, .32), .07, 14); cyl_between(bm, (-3.0, 2.4, -.42), (-3.6, 2.75, -.32), .07, 14); cyl_between(bm, (-3.55, 2.7, -.45), (-3.55, 2.7, .45), .05, 12)
new_obj('ChuteArm', bm, MAT['machined'], root, bevel=.005)
bm = bmesh.new(); add_cyl(bm, (-.5, .72, -1.13), .36, 1.5, 32, axis='x'); add_box(bm, (-.5, .72, -1.13), (1.2, .04, .08))
new_obj('WaterTank', bm, MAT['galv'], root, bevel=.015)
bm = bmesh.new()
for s in (-1, 1): add_box(bm, (-5.0, 1.5, s * .32), (.06, 1.25, .06))
for k in range(5): add_box(bm, (-5.0, .95 + k * .26, 0), (.06, .045, .62))
new_obj('RearLadder', bm, MAT['galv'], root, bevel=.004, bev_seg=1)

# ---- export
def sel_tree(o):
    o.select_set(True)
    for c in o.children: sel_tree(c)
bpy.ops.object.select_all(action='DESELECT'); sel_tree(root); bpy.context.view_layer.objects.active = root
opts = dict(filepath=GLB, export_format='GLB', use_selection=True, export_apply=True, export_texcoords=True, export_normals=True, export_tangents=False,
            export_materials='EXPORT', export_yup=True, export_cameras=False, export_lights=False, export_extras=True, export_image_format='WEBP', export_image_quality=82)
for drop in ([], ['export_image_quality'], ['export_image_quality', 'export_image_format']):
    try: bpy.ops.export_scene.gltf(**{k: v for k, v in opts.items() if k not in drop}); break
    except TypeError as e: print('[mixer3d] gltf option retry', e)
print('[mixer3d] GLB', os.path.getsize(GLB), 'bytes')
sub = [[round(float(x), 3), round(float(r), 3)] for x, r in zip(DX[::6], DR[::6])] + [[round(float(DX[-1]), 3), round(float(DR[-1]), 3)]]
json.dump({'tilt': T, 'axis': list(P0), 'xmin': XMIN, 'xmax': XMAX, 'thk': THK, 'pitch': PITCH, 'profile': sub}, open(os.path.join(ROOT, 'assets', '3d', 'om-group-transit-mixer.json'), 'w'), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'om-group-transit-mixer.blend'))
print('[mixer3d] done')
