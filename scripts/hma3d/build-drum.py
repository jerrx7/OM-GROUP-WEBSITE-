"""OM GROUP - Hot Mix Asphalt page: the drum-mix plant figure, as a Blender Cycles still.
  blender -b --factory-startup -P scripts/hma3d/build-drum.py -- <repo root> [--quick|--half]
Out: _review/hma3d/drum.png (RGBA, shadow catcher) + drum-anchors.json.
A parallel-flow drum-mix plant (the process the page already describes): cold-feed bins, collecting + inclined conveyor, a rotary drum with the burner at the
entry end (cut-away windows show the flame and the mixing zone), filler and binder added at designated points, exhaust to a baghouse, finished mix by
slat conveyor to a storage silo and a tipper below. There is no hot elevator, screen, hot bin or separate pugmill, as the page says."""
import os
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'common.py'), encoding='utf8').read())
W, H = 2600, 1380
sc = setup_scene(W, H, 200)
world_studio(.9, (.95, .94, .92), (.10, .10, .11))

# ---------------------------------------------------------------- materials
CONC = bump(mat('conc', (.46, .45, .44), 0, .5, coat=.15, spec=.4), 80, .12)
STEEL = bump(mat('steel', (.62, .63, .65), 1, .3), 300, .012, 3); rough_var(STEEL, .3, .5, 30)
ENAM = bump(mat('enamel', (.50, .52, .54), .1, .36, coat=.2), 500, .02, 2)
DSTEEL = mat('dsteel', (.07, .07, .08), .85, .4)
ORANGE = mat('orange', (.9, .24, .04), .1, .34, coat=.55)
BLACK = mat('black', (.012, .012, .014), 0, .5)
BELT = bump(mat('belt', (.02, .02, .022), 0, .55), 60, .2)
RUST = mat('rustin', (.16, .06, .03), .6, .45)
HEATIN = mat('heatin', (.2, .05, .015), .4, .4, emit=(1, .2, .03), estr=.55)
MIXDARK = mat('mixdark', (.012, .012, .014), 0, .25, coat=.25)
AGG1 = stone_mat('agg1', .07, .22, .74, (1, 1, 1.03), 50, .6)
AGG2 = stone_mat('agg2', .16, .42, .75, (1.02, 1, .97), 90, .6)
AGG3 = stone_mat('agg3', .50, .78, .82, (1.08, 1.0, .84), 160, .5)
MIXSTONE = stone_mat('mixst', .014, .05, .3, (1, 1, 1.02), 100, .3)
GLASS = mat('glassdark', (.03, .035, .04), 0, .1, coat=.4)
def flame_mat():
    m = bpy.data.materials.new('flame'); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial'); mx = nt.nodes.new('ShaderNodeMixShader'); em = nt.nodes.new('ShaderNodeEmission'); tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    fr = nt.nodes.new('ShaderNodeFresnel'); fr.inputs['IOR'].default_value = 1.15
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); cr = nt.nodes.new('ShaderNodeValToRGB')
    cr.color_ramp.elements[0].position = 0.0; cr.color_ramp.elements[0].color = (1, .62, .16, 1); cr.color_ramp.elements[1].position = 1.0; cr.color_ramp.elements[1].color = (.85, .07, .005, 1)
    e = cr.color_ramp.elements.new(.45); e.color = (1, .3, .03, 1)
    nt.links.new(tc.outputs['Generated'], sep.inputs['Vector']); nt.links.new(sep.outputs['X'], cr.inputs['Fac']); nt.links.new(cr.outputs['Color'], em.inputs['Color'])
    em.inputs['Strength'].default_value = 1.35; nt.links.new(fr.outputs['Fac'], mx.inputs['Fac']); nt.links.new(em.outputs['Emission'], mx.inputs[1]); nt.links.new(tr.outputs['BSDF'], mx.inputs[2])
    nt.links.new(mx.outputs['Shader'], out.inputs['Surface']); return m
FLAME = flame_mat()

# ---------------------------------------------------------------- helpers
def align(o, d):
    o.rotation_euler = Vector((1, 0, 0)).rotation_difference(Vector(d).normalized()).to_euler()
def beam(name, p0, p1, wy, wz, m, r=.02, off=(0, 0, 0)):
    p0, p1 = Vector(p0), Vector(p1); L = (p1 - p0).length; o = box(name, (L, wy, wz), (p0 + p1) / 2, m, r=r)
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = Vector((1, 0, 0)).rotation_difference((p1 - p0).normalized()); return o
def post(name, x, y, z0, z1, w, m, r=.015): return box(name, (w, w, z1 - z0), (x, y, (z0 + z1) / 2), m, r=r)
def sector_shell(name, x0, x1, R, a0, a1, m, thick=.05, seg=120):
    """cylinder shell around the X axis from angle a0..a1 (radians); a front window is left by choosing a0/a1"""
    bm = bmesh.new(); n = max(8, int(seg * (a1 - a0) / (2 * math.pi))); full = abs((a1 - a0) - 2 * math.pi) < 1e-6
    rows = []
    for xx in (x0, x1):
        rows.append([bm.verts.new((xx, R * math.cos(a0 + (a1 - a0) * i / n), R * math.sin(a0 + (a1 - a0) * i / n))) for i in range(n + (0 if full else 1))])
    cnt = len(rows[0])
    for i in range(cnt if full else cnt - 1):
        j = (i + 1) % cnt; bm.faces.new((rows[0][i], rows[0][j], rows[1][j], rows[1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    o = from_bm(name, bm, m, True); o.location = (0, 0, ZC); sd = o.modifiers.new('s', 'SOLIDIFY'); sd.thickness = thick; sd.offset = -1; return o

ZC, R = 3.95, 1.4
DTOP = ZC + R; PH = ZC - R - .55                                              # drum axis height, radius
XA, XB = -1.4, 5.1

# ---------------------------------------------------------------- ground
box('apron', (25.5, 6.8, .3), (.5, 1.0, -.15), CONC, r=.04)
for gx in range(-12, 13, 3): box('joint%d' % gx, (.03, 6.8, .005), (gx + .5, 1.0, .003), mat('jt', (.12, .12, .12), 0, .8), r=0)

# ---------------------------------------------------------------- cold-feed bins + collecting belt
BX = [-9.1, -7.8, -6.5]
for i, (bx, ag) in enumerate(zip(BX, (AGG1, AGG2, AGG3))):
    funnel = cyl('fun%d' % i, .17, 1.0, (bx, 0, 1.55), (0, 0, math.radians(45)), ENAM, 4, r2=.92); funnel.scale = (1, 1, 1)
    box('hop%d' % i, (1.28, 1.28, .78), (bx, 0, 2.43), ENAM, r=.025)
    box('hoptrim%d' % i, (1.34, 1.34, .08), (bx, 0, 2.86), ORANGE, r=.02)
    box('hopbase%d' % i, (.42, .42, .2), (bx, 0, 1.0), DSTEEL, r=.02)
    heap('bin%d' % i, 'b', (bx, 0, 2.84), .62, .46, 150, .12, ag, mat('bb%d' % i, (.05, .05, .05), 0, .9), seed=20 + i, ellipse=1.0)
    for sx in (-1, 1):
        for sy in (-1, 1): post('bl%d%d%d' % (i, sx, sy), bx + sx * .55, sy * .55, 0, 1.95, .09, ORANGE if False else STEEL)
for z in (.9, 1.7):
    beam('bbr%d' % int(z * 10), (BX[0] - .55, -.55, z), (BX[2] + .55, -.55, z), .06, .06, STEEL, r=.01)
    beam('bbb%d' % int(z * 10), (BX[0] - .55, .55, z), (BX[2] + .55, .55, z), .06, .06, STEEL, r=.01)
box('collect', (5.0, .72, .16), (-7.55, 0, .66), BELT, r=.04); box('collect_rail1', (5.0, .05, .24), (-7.55, -.38, .74), STEEL, r=.01); box('collect_rail2', (5.0, .05, .24), (-7.55, .38, .74), STEEL, r=.01)
for k in range(-4, 5): post('cl%d' % k, -7.55 + k * .58, 0, 0, .55, .12, DSTEEL)
box('drive1', (.5, .6, .55), (-10.1, 0, .66), ORANGE, r=.04)

# ---------------------------------------------------------------- inclined conveyor to the drum
P0, P1 = Vector((-5.0, 0, .75)), Vector((-1.55, 0, 5.45))
beam('belt', P0, P1, .62, .13, BELT, r=.035)
load = beam('load', P0 + Vector((.3, 0, .15)), P1 + Vector((-.3, 0, .05)), .42, .1, AGG1, r=.04)
for sg in (-1, 1): beam('rail%d' % sg, P0 + Vector((0, sg * .36, .1)), P1 + Vector((0, sg * .36, .1)), .05, .3, STEEL, r=.01)
for sg in (-1, 1): beam('str%d' % sg, P0 + Vector((0, sg * .39, -.1)), P1 + Vector((0, sg * .39, -.1)), .08, .12, ORANGE, r=.015)
for t in (0, .22, .45, .68, .9):
    pt = P0 + (P1 - P0) * t
    for sg in (-1, 1): post('cs%d%d' % (int(t * 100), sg), pt.x, sg * .38, 0, pt.z - .12, .09, STEEL)
    beam('cx%d' % int(t * 100), (pt.x, -.38, pt.z - .6), (pt.x, .38, pt.z - .2), .04, .04, STEEL, r=.005)
box('headhood', (.9, .85, .8), (P1.x + .2, 0, P1.z + .05), ENAM, r=.04); box('headtrim', (.95, .9, .07), (P1.x + .2, 0, P1.z + .46), ORANGE, r=.02)
cyl('headpul', .27, .72, (P0.x - .1, 0, P0.z), (math.radians(90), 0, 0), DSTEEL, 32)
# feed chute into the drum
box('chute', (.8, .8, .85), (-1.15, 0, DTOP - .05), ENAM, r=.04); cyl('chute2', .36, .6, (-1.15, 0, DTOP - .7), (0, 0, 0), ENAM, 4, r2=.55)

# ---------------------------------------------------------------- the drum
wf, wm = math.radians(50), math.radians(60)                     # half-widths of the two cut-away windows (front = -Y = 180 deg)
PI = math.pi
sector_shell('shA', XA, 0.7, R, PI + wf, 3 * PI - wf, STEEL)    # drying zone, window at the burner end
sector_shell('shB', 0.7, 1.9, R, 0, 2 * PI, STEEL)
sector_shell('shC', 1.9, 4.7, R, PI + wm, 3 * PI - wm, STEEL)   # mixing zone, window
sector_shell('shD', 4.7, XB, R, 0, 2 * PI, STEEL)
# inner skin (visible through the windows)
sector_shell('inA', XA + .02, .7, R - .07, PI + wf - .04, 3 * PI - wf + .04, HEATIN, .02)
sector_shell('inC', 1.9, 4.7, R - .07, PI + wm - .04, 3 * PI - wm + .04, RUST, .02)
for nm, x in (('r1', .25), ('r2', 3.7)):
    t = torus(nm, R + .01, .075, (x, 0, ZC), (0, math.radians(90), 0), DSTEEL)
for nm, x in (('o1', -1.4), ('o2', 5.1)):
    torus(nm, R, .04, (x, 0, ZC), (0, math.radians(90), 0), STEEL)
# gear ring + orange band
torus('gear', R + .08, .1, (2.45, 0, ZC), (0, math.radians(90), 0), mat('gearm', (.05, .05, .055), .9, .38)); torus('band', R + .02, .06, (1.0, 0, ZC), (0, math.radians(90), 0), ORANGE)
torus('band2', R + .02, .06, (4.4, 0, ZC), (0, math.radians(90), 0), ORANGE)
# mix bed + flights inside the mixing zone
rng = random.Random(41); mrocks = [make_rock('mr%d' % i, 300 + i) for i in range(4)]
for rk in mrocks: rk.materials.append(MIXSTONE)
for i in range(1500):
    x = rng.uniform(1.95, 4.65); y = rng.uniform(-1.05, 1.05); zb = ZC - math.sqrt(max(.02, (R - .12) ** 2 - y * y)); z = zb + rng.uniform(.03, .32 - abs(y) * .1)
    s = rng.uniform(.045, .09); o = bpy.data.objects.new('mix%d' % i, rng.choice(mrocks)); link(o); o.location = (x, y, z); o.rotation_euler = (rng.uniform(0, 6), rng.uniform(0, 6), rng.uniform(0, 6)); o.scale = (s, s, s)
box('mixbase', (2.74, 2.0, .08), (3.3, 0, ZC - R + .08), MIXDARK, r=.02)
for i in range(16):
    a = PI + math.radians(-52 + i % 8 * 14 + (i // 8) * 0); x = 2.0 + (i // 8) * 1.3 + (i % 8) * .12
    for a2 in (a, a + math.radians(-30) if False else a):
        pass
    px = 2.1 + (i % 8) * .33; ang = PI + math.radians(-48 + (i * 37) % 96)
    box('fl%d' % i, (.24, .02, .22), (px, (R - .2) * math.cos(ang), ZC + (R - .2) * math.sin(ang)), ORANGE, r=.005, rot=(ang - PI / 2, 0, 0))
# burner + blower
cyl('blower', .52, .95, (-3.0, 0, ZC), (0, math.radians(90), 0), ORANGE, 64); cyl('blowcap', .56, .12, (-3.55, 0, ZC), (0, math.radians(90), 0), DSTEEL, 64)
cyl('nozzle', .5, .9, (-2.05, 0, ZC), (0, math.radians(90), 0), STEEL, 64, r2=.28)
box('burnbase', (1.4, .9, .26), (-2.8, 0, ZC - .8), DSTEEL, r=.03)
for bx_ in (-3.3, -2.3):
    for by_ in (-.3, .3): post('bs%s%s' % (bx_, by_), bx_, by_, 0, ZC - .7, .12, DSTEEL)
cyl('fuel', .06, 1.6, (-3.0, .85, ZC - .45), (math.radians(90), 0, 0), BLACK, 16)
for nm_, rr, ll in (('flameO', .78, 3.4), ('flameM', .56, 2.7), ('flameC', .32, 1.9)):
    sphere(nm_, 1.0, (-1.45 + ll / 2, 0, ZC), FLAME, scale=(ll / 2, rr, rr), seg=48)
ld = bpy.data.lights.new('flamelight', 'POINT'); ld.energy = 2600; ld.color = (1, .45, .12); ld.shadow_soft_size = .3; lo = bpy.data.objects.new('flamelight', ld); link(lo); lo.location = (-.2, -.1, ZC)
# trunnion piers + rollers
for nm, x in (('p1', .25), ('p2', 3.7)):
    box('pier' + nm, (1.1, 2.6, PH), (x, 0, PH / 2), CONC, r=.04)
    for sy in (-1, 1): cyl('roller%s%d' % (nm, sy), .3, .55, (x, sy * 1.0, ZC - R - .22), (0, math.radians(90), 0), DSTEEL, 32)
    beam('sup' + nm + 'a', (x, -.6, PH), (x, -1.0, ZC - R - .25), .34, .34, DSTEEL, r=.03); beam('sup' + nm + 'b', (x, .6, PH), (x, 1.0, ZC - R - .25), .34, .34, DSTEEL, r=.03)
# drive motor + gearbox
box('gearbox', (.8, .6, .6), (2.45, -1.3, 2.3), DSTEEL, r=.05); cyl('motor', .32, .9, (2.45, -1.9, 2.3), (math.radians(90), 0, 0), ORANGE, 48); post('gbp', 2.45, -1.3, 0, 2.0, .35, DSTEEL)

# ---------------------------------------------------------------- filler + binder at designated points
FX = 1.25
box('fhop', (.9, .9, .65), (FX, 0, DTOP + 1.95), ORANGE, r=.04); cyl('fhopc', .09, .6, (FX, 0, DTOP + 1.3), (0, 0, 0), ORANGE, 4, r2=.6)
post('fp1', FX - .35, 0, DTOP + .5, DTOP + 1.7, .09, STEEL); post('fp2', FX + .35, 0, DTOP + .5, DTOP + 1.7, .09, STEEL)
cyl('fscrew', .16, .8, (FX, 0, DTOP + .9), (0, 0, 0), ENAM, 40); cyl('fdrop', .11, .7, (FX, 0, DTOP + .15), (0, 0, 0), STEEL, 32)
cyl('fflange', .22, .06, (FX, 0, DTOP + .52), (0, 0, 0), DSTEEL, 32)
BXx = 3.4
BZ = DTOP + 1.55
bp = [(BXx, 0, DTOP - .1), (BXx, 0, BZ), (BXx + 1.9, 0, BZ)]
tube('binder', bp, .09, STEEL)
for (x, y, z) in [(BXx, 0, DTOP + .95), (BXx + .95, 0, BZ)]:
    cyl('bfl%d' % int(x * 10), .17, .08, (x, y, z), (0, 0, 0) if x == BXx else (0, math.radians(90), 0), DSTEEL, 32)
sphere('bvalve', .17, (BXx, 0, DTOP + .4), ORANGE, seg=24); cyl('bvh', .025, .32, (BXx, 0, DTOP + .72), (0, 0, 0), DSTEEL, 12); cyl('bvh2', .16, .035, (BXx, 0, DTOP + .9), (0, 0, 0), ORANGE, 24)
cyl('bfl_end', .22, .1, (BXx + 1.9, 0, BZ), (0, math.radians(90), 0), DSTEEL, 32)
post('bpost', BXx + 1.7, 0, PH, BZ - .1, .13, STEEL)

# ---------------------------------------------------------------- exhaust duct + baghouse + stack
box('smoke', (1.1, 2.0, 2.3), (5.65, 0, ZC + .1), ENAM, r=.05); box('smoketrim', (1.16, 2.06, .06), (5.65, 0, ZC + 1.28), ORANGE, r=.02)
tube('duct', [(5.65, 0, ZC + 1.3), (5.65, 0, 7.1), (6.1, 1.2, 7.4)], .4, ENAM)
BHX, BHY = 6.7, 2.1
box('bag', (2.3, 1.9, 2.4), (BHX, BHY, 6.9), ENAM, r=.06); box('bagtrim', (2.36, 1.96, .09), (BHX, BHY, 8.12), ORANGE, r=.02)
for sx in (-.55, .55): cyl('bagh%d' % int(sx * 10), .11, 1.1, (BHX + sx, BHY, 4.95), (0, 0, math.radians(45)), ENAM, 4, r2=.62)
for sx in (-1, 1):
    for sy in (-1, 1): post('bagl%d%d' % (sx, sy), BHX + sx * 1.0, BHY + sy * .8, 0, 5.7, .14, STEEL)
beam('bagx1', (BHX - 1, BHY, 2.2), (BHX + 1, BHY, 4.4), .05, .05, STEEL); beam('bagx2', (BHX + 1, BHY, 2.2), (BHX - 1, BHY, 4.4), .05, .05, STEEL)
cyl('stack', .24, 1.7, (BHX + .5, BHY, 9.0), (0, 0, 0), STEEL, 48); cyl('stacktop', .3, .12, (BHX + .5, BHY, 9.85), (0, 0, 0), ORANGE, 48)
box('bagcable', (.5, .2, .5), (BHX - 1.2, BHY, 6.9), DSTEEL, r=.03)
box('bagwalk', (.6, 2.0, .05), (BHX + 1.4, BHY, 7.3), STEEL, r=.005)

# ---------------------------------------------------------------- discharge, slat conveyor, silo, tipper
SX, SY = 8.3, 0
Q0, Q1 = Vector((5.7, 0, 1.55)), Vector((SX - .35, 0, 9.2))
cyl('dischute', .3, .5, (5.65, 0, ZC - R - .2), (0, 0, 0), ENAM, 4, r2=.55)
beam('slat', Q0, Q1, .62, .13, BELT, r=.035)
for sg in (-1, 1): beam('srail%d' % sg, Q0 + Vector((0, sg * .36, .1)), Q1 + Vector((0, sg * .36, .1)), .05, .3, STEEL, r=.01); beam('sstr%d' % sg, Q0 + Vector((0, sg * .39, -.1)), Q1 + Vector((0, sg * .39, -.1)), .08, .12, ORANGE, r=.015)
for t in (0, .18, .38, .58, .78):
    pt = Q0 + (Q1 - Q0) * t
    for sg in (-1, 1): post('ss%d%d' % (int(t * 100), sg), pt.x, sg * .38, 0, pt.z - .12, .09, STEEL)
SIL = ENAM
cyl('silo', 1.15, 4.1, (SX, SY, 6.5), (0, 0, 0), SIL, 96); cyl('silocone', .38, 1.3, (SX, SY, 3.85), (0, 0, 0), SIL, 96, r2=1.15); cyl('silotop', 1.2, .12, (SX, SY, 8.58), (0, 0, 0), ORANGE, 96)
cyl('silolid', 1.0, .2, (SX, SY, 8.7), (0, 0, 0), SIL, 64, r2=.35)
for k in range(6): cyl('siloband%d' % k, 1.17, .05, (SX, SY, 4.7 + k * .72), (0, 0, 0), STEEL, 96)
for sx in (-1, 1):
    for sy in (-1, 1): post('silol%d%d' % (sx, sy), SX + sx * .95, sy * .95, 0, 4.7, .16, STEEL)
for z in (1.3, 3.0): beam('sbx%d' % int(z), (SX - .95, -.95, z), (SX + .95, -.95, z + 1.4), .05, .05, STEEL); beam('sby%d' % int(z), (SX + .95, -.95, z), (SX - .95, -.95, z + 1.4), .05, .05, STEEL)
cyl('sgate', .3, .35, (SX, SY, 3.05), (0, 0, 0), DSTEEL, 32); box('sladder', (.08, .5, 4.6), (SX + 1.3, -.9, 2.3), STEEL, r=.01)
# tipper (the site's own model), cab to the right, bed under the silo outlet
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets', '3d', 'om-group-tipper.glb'))
tip = [o for o in bpy.context.selected_objects]
holder = bpy.data.objects.new('tip', None); link(holder); holder.scale = (.56, .56, .56); holder.location = (SX + .95, -.1, 0); holder.rotation_euler = (0, 0, 0)
for o in tip:
    if o.parent is None: o.parent = holder
# the model's bed holds a heap of mix under the outlet
for o in tip:
    if o.type == 'MESH':
        for s in o.material_slots: s.material.use_backface_culling = False

# ---------------------------------------------------------------- lights + camera
area_light('key', (-9, -16, 14), (1, 0, 3), 7600, 10, (1, .96, .9), sy=7)
area_light('fill', (14, -14, 6), (1, 0, 3), 1400, 8, (.93, .96, 1))
area_light('rim', (3, 14, 12), (2, 0, 5), 2600, 7, (1, .94, .88))
area_light('front', (0, -20, 3), (0, 0, 3), 400, 12, (1, 1, 1))
cam = camera((.9, -31.5, 6.6), (.9, 0, 4.95), 50, (0, 0))

anch = {'bins': (-7.8, 0, 3.45), 'conv': (-4.05, 0, 2.2), 'burner': (-3.0, 0, ZC + .62), 'filler': (FX, 0, DTOP + 2.35), 'binder': (BXx + 1.2, 0, BZ + .1),
        'dust': (BHX - .3, BHY - 1, 8.22), 'silo': (SX, 0, 8.95), 'tipper': (SX + .2, -1.3, .02),
        'drying': (-1.0, 0, ZC - R), 'mixing': (2.3, 0, ZC - R)}
json.dump(project(cam, anch), open(os.path.join(OUT, 'drum-anchors.json'), 'w'))
if not os.environ.get('NORENDER'): render(os.path.join(OUT, 'drum.png'))
print('[drum] done')
