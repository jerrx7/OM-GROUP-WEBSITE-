"""OM GROUP - the Hot Mix paving train (Hot Mix Asphalt page, "Paving process explorer"): a tracked asphalt paver and a tandem steel-drum roller,
plus the asphalt mat textures, all built from code.

  blender -b --factory-startup -P scripts/hma3d/build-paving.py -- <repo root> [--preview] [--notex]

Output
  assets/3d/om-group-asphalt-paver.glb   tracked asphalt paver: crawler undercarriage (sprockets `Sprocket_*` and idlers `Idler_*` turn; the track shoes are drawn by the web
                                         scene), front hopper with hinged wings and an asphalt-coated liner, push rollers (`PushRoller_*` turn), the material tunnel with
                                         its walls (the two slat conveyors and the mix are drawn by the web scene), engine hood with the OM GROUP mark, operator platform with
                                         two consoles and a canopy, tow arms with tow-point cylinders, two augers (`AugerL`, `AugerR`, opposite hand, turn about z), and an
                                         extending screed with end gates, walkway, handrails, control boxes and a grade sensor.
  assets/3d/om-group-tandem-roller.glb   tandem steel-drum roller: two drums (`DrumF`, `DrumR` turn about z) in yokes, scraper and spray bars, water tank and engine hood
                                         with the mark, articulation joint, operator platform, ROPS canopy.
  assets/3d/om-group-paving.json         anchors the web scene needs (track, conveyor, hopper, auger, screed, mat, drums)
  assets/hma3d/asphalt-{fresh,rolled}-{c,n,r}.png  -> converted to .webp by scripts/hma3d/export-paving-assets.js
  _review/hma3d/*.blend, previews with --preview

Metres, three.js axes (x forward = the direction of paving, y up, z toward the viewer). Materials and helpers come from build-tipper.py's header and bpy_helpers.py.
Generic machines (not a particular manufacturer's model or an OM GROUP unit); no capacity, width, speed or temperature is implied by the drawing.
"""
import os, sys, json
_argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
_ROOT = os.path.abspath(_argv[0] if _argv else os.getcwd())
PREVIEW = '--preview' in _argv; NOTEX = '--notex' in _argv; TEXONLY = '--texonly' in _argv
_src = open(os.path.join(_ROOT, 'scripts', 'excavator3d', 'build-tipper.py')).read()
exec(_src[:_src.index('# ================================================================ THE TRUCK')])
RV = os.path.join(ROOT, '_review', 'hma3d'); os.makedirs(RV, exist_ok=True)
TEXOUT = os.path.join(ROOT, 'assets', 'hma3d'); os.makedirs(TEXOUT, exist_ok=True)

YELLOW = MAT['yellow']; DARK = MAT['graphite']; STEEL = MAT['steel']
MAT['hoodY'] = pbr('PaintYellowHood', YEL, 0.0, .36, IMG_N, .22, rough_img('hoody', .36, .05), coat=.45); YH = MAT['hoodY']
MAT['grate'] = pbr('GratingSteel', (.34, .35, .37), 1.0, .42, IMG_RN, .6, rough_img('grate', .42, .1))
MAT['coated'] = pbr('AsphaltCoatedSteel', (.03, .028, .026), .3, .3, IMG_RN, 1.0, rough_img('coated', .3, .12))
MAT['screen'] = pbr('ConsoleScreen', (.012, .02, .028), 0.0, .06)
MAT['drum'] = pbr('DrumSteelPolished', (.42, .43, .44), 1.0, .22, IMG_N, .4, rough_img('drum', .22, .08))
COATED = MAT['coated']

# ---------------------------------------------------------------- small helpers
def slab(bm, pts, n, t):
    """a plate: a planar polygon (three.js points) thickened by t along the normal n"""
    a = [bm.verts.new(V(*p)) for p in pts]; b = [bm.verts.new(V(p[0] + n[0] * t, p[1] + n[1] * t, p[2] + n[2] * t)) for p in pts]; k = len(pts)
    bm.faces.new(a); bm.faces.new(b[::-1])
    for i in range(k): bm.faces.new((a[i], b[i], b[(i + 1) % k], a[(i + 1) % k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
def beam(bm, p0, p1, z, w, h):
    """a box-section beam in the x-y plane from p0 to p1 at depth z (w = width along z, h = height)"""
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]; L = math.hypot(dx, dy); a = math.atan2(dy, dx)
    add_box(bm, ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, z), (L, h, w), rot=Rz(a))
def rail(bm, pts, r=.025): tube(bm, pts, r, seg=10)
def helix(bm, z0, z1, rin, rout, pitch, hand, t=.014, per=40):
    """an auger flight from z0 to z1 about the z axis (local), hand +1 / -1"""
    n = max(8, int(abs(z1 - z0) / pitch * per)); rows = []
    for i in range(n + 1):
        z = z0 + (z1 - z0) * i / n; a = hand * 2 * math.pi * (z - z0) / pitch
        rows.append([bm.verts.new(V(rr * math.cos(a), rr * math.sin(a), z + dz)) for (rr, dz) in ((rin, -t), (rout, -t), (rout, t), (rin, t))])
    for i in range(n):
        for j in range(4): bm.faces.new((rows[i][j], rows[i][(j + 1) % 4], rows[i + 1][(j + 1) % 4], rows[i + 1][j]))
    bm.faces.new(rows[0][::-1]); bm.faces.new(rows[-1]); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
def cylinder_pair(name, parent, p0, p1, rb=.06, rr=.035, mat_b=None):
    """a hydraulic cylinder from p0 (barrel end) to p1 (rod end): barrel graphite, rod chrome"""
    bm = bmesh.new(); m = [p0[i] + (p1[i] - p0[i]) * .58 for i in range(3)]
    cyl_between(bm, p0, m, rb, 18); new_obj(name + '_Barrel', bm, mat_b or DARK, parent, bevel=.004, bev_seg=1)
    bm = bmesh.new(); cyl_between(bm, m, p1, rr, 14); new_obj(name + '_Rod', bm, MAT['chrome'], parent)

def finish(root, name, glb):
    def sel_tree(o):
        o.select_set(True)
        for c in o.children: sel_tree(c)
    bpy.ops.object.select_all(action='DESELECT'); sel_tree(root); bpy.context.view_layer.objects.active = root
    opts = dict(filepath=glb, export_format='GLB', use_selection=True, export_apply=True, export_texcoords=True, export_normals=True, export_tangents=False,
                export_materials='EXPORT', export_yup=True, export_cameras=False, export_lights=False, export_extras=True, export_image_format='WEBP', export_image_quality=82)
    for drop in ([], ['export_image_quality'], ['export_image_quality', 'export_image_format']):
        try: bpy.ops.export_scene.gltf(**{k: v for k, v in opts.items() if k not in drop}); break
        except TypeError as e: print('[paving3d] gltf option retry', e)
    print('[paving3d]', name, 'GLB', os.path.getsize(glb), 'bytes')
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(RV, name + '.blend'))

def clear():
    bpy.ops.object.select_all(action='DESELECT')
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)

def preview(root, name, cam_loc, target, lens=40):
    """a quick Cycles still for review (only with --preview)"""
    if not PREVIEW: return
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = 1400, 860; sc.render.film_transparent = False
    w = bpy.data.worlds.new('pv'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (.85, .84, .82, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = .7
    cd = bpy.data.cameras.new('pc'); cd.lens = lens; cam = bpy.data.objects.new('pc', cd); scene.collection.objects.link(cam); cam.location = V(*cam_loc)
    tg = empty('pt', None, target); tc = cam.constraints.new('TRACK_TO'); tc.target = tg; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'; sc.camera = cam
    ld = bpy.data.lights.new('sun', 'SUN'); ld.energy = 3.2; ld.angle = .2; lo = bpy.data.objects.new('sun', ld); scene.collection.objects.link(lo); lo.rotation_euler = (math.radians(40), math.radians(10), math.radians(-35))
    gm = bpy.data.meshes.new('gp'); bm = bmesh.new(); add_box(bm, (0, -.01, 0), (60, .02, 60)); bm.to_mesh(gm); go = bpy.data.objects.new('gp', gm); scene.collection.objects.link(go)
    gm.materials.append(pbr('PvGround', (.5, .49, .47), 0.0, .8))
    sc.render.filepath = os.path.join(RV, name + '.png'); bpy.ops.render.render(write_still=True)
    for o in (cam, tg, lo, go): bpy.data.objects.remove(o, do_unlink=True)

J = {}

# ================================================================ PAVER
def paver():
    root = empty('OMGroupAsphaltPaver')
    # ---- crawler undercarriage. Shoes are drawn by the web scene along the stadium (sprocket at x0, idler at x1, radius r, centre height r).
    TX0, TX1, TR, TZ, TW = -1.3, 1.1, .3, .99, .34
    J['track'] = {'x0': TX0, 'x1': TX1, 'r': TR, 'z': TZ, 'w': TW}
    for s in (-1, 1):
        zc = s * TZ; tag = 'L' if s > 0 else 'R'; g = empty('Track_' + tag, root)
        bm = bmesh.new(); add_box(bm, ((TX0 + TX1) / 2, TR, zc), (TX1 - TX0, .3, .16)); add_box(bm, ((TX0 + TX1) / 2, TR - .02, zc + s * .1), (TX1 - TX0 - .3, .34, .04))
        for x in np.linspace(TX0 + .4, TX1 - .4, 4): add_box(bm, (x, .13, zc), (.12, .1, .22))
        new_obj('TrackFrame_' + tag, bm, DARK, g, bevel=.015)
        for nm, x in (('Sprocket_', TX0), ('Idler_', TX1)):
            e = empty(nm + tag, g, (x, TR, zc)); bm = bmesh.new(); add_cyl(bm, (0, 0, 0), TR - .055, TW - .06, 44, axis='z')
            if nm == 'Sprocket_':
                for k in range(13): a = 2 * math.pi * k / 13; add_box(bm, (math.cos(a) * (TR - .045), math.sin(a) * (TR - .045), 0), (.06, .06, TW - .12), rot=Rz(a))
            else:
                add_cyl(bm, (0, 0, 0), TR - .02, .08, 44, axis='z')
            add_cyl(bm, (0, 0, s * (TW / 2 - .01)), .1, .05, 24, axis='z')
            for k in range(8): a = 2 * math.pi * k / 8; hexbolt(bm, math.cos(a) * .07, math.sin(a) * .07, s * (TW / 2 + .02), r=.014, h=.02)
            new_obj(nm + 'M_' + tag, bm, STEEL, e, bevel=.005, bev_seg=1)
        bm = bmesh.new()
        for x in np.linspace(TX0 + .42, TX1 - .42, 4): add_cyl(bm, (x, .125, zc), .1, TW - .08, 22, axis='z'); add_cyl(bm, (x, .125, zc + s * (TW / 2 - .03)), .045, .03, 16, axis='z')
        for x in (TX0 + .55, TX1 - .55): add_cyl(bm, (x, 2 * TR - .065, zc), .06, TW - .12, 16, axis='z')
        new_obj('TrackRollers_' + tag, bm, STEEL, g, bevel=.004, bev_seg=1)
        bm = bmesh.new(); add_box(bm, ((TX0 + TX1) / 2 + .05, 2 * TR + .1, zc + s * .02), (TX1 - TX0 + .55, .05, TW + .14)); add_box(bm, ((TX0 + TX1) / 2 + .05, 2 * TR + .02, zc + s * (TW / 2 + .08)), (TX1 - TX0 + .55, .2, .03))
        new_obj('TrackGuard_' + tag, bm, YELLOW, g, bevel=.01)

    # ---- the material tunnel: floor, centre divider and side walls (the slats and the mix are drawn by the web scene)
    CX0, CX1, CY, CW = -1.5, 3.22, .5, .66
    J['conveyor'] = {'x0': CX0, 'x1': CX1, 'y': CY, 'lanes': [-.4, .4], 'w': CW, 'r': .07}
    bm = bmesh.new()
    add_box(bm, ((CX0 + CX1) / 2, CY - .17, 0), (CX1 - CX0, .04, 1.56))
    add_box(bm, ((CX0 + CX1) / 2, CY - .02, 0), (CX1 - CX0, .26, .06))
    for s in (-1, 1): add_box(bm, ((CX0 + 1.36) / 2, CY + .2, s * .78), (1.36 - CX0, .74, .05))
    new_obj('TunnelWalls', bm, COATED, root, bevel=.008)
    bm = bmesh.new()
    for x in (CX0 + .07, CX1 - .07):
        for z in (-.4, .4): add_cyl(bm, (x, CY - .07, z), .075, CW - .02, 24, axis='z')
    new_obj('ConveyorShafts', bm, STEEL, root, bevel=.004)

    # ---- main frame, side skirts (the near skirt `Skirt_L` is see-through in the conveyor view), rear frame under the platform
    bm = bmesh.new()
    for s in (-1, 1): add_box(bm, (.05, .93, s * .86), (3.0, .22, .14))
    add_box(bm, (1.4, .93, 0), (.12, .22, 1.86)); add_box(bm, (-1.45, .93, 0), (.12, .22, 1.86))
    new_obj('MainFrame', bm, DARK, root, bevel=.012)
    for s in (-1, 1):
        tag = 'L' if s > 0 else 'R'; bm = bmesh.new(); prism(bm, [(1.38, .74), (1.38, 1.04), (-1.62, 1.04), (-1.62, .74), (-1.4, .7), (1.15, .7)], s * 1.1 - .025, s * 1.1 + .025)
        for x in np.linspace(-1.3, 1.0, 5): add_box(bm, (x, .88, s * 1.13), (.04, .22, .02))
        new_obj('Skirt_' + tag, bm, YELLOW, root, bevel=.008)
    bm = bmesh.new(); prism(bm, [(-.4, 1.0), (-.4, 1.535), (-1.66, 1.535), (-1.66, 1.0)], -1.1, 1.1); new_obj('RearFrame', bm, YELLOW, root, bevel=.03, bev_seg=3, tile=.4)
    bm = bmesh.new()
    for z in np.linspace(-.85, .85, 6): add_box(bm, (-1.665, 1.27, z), (.02, .3, .04))
    new_obj('RearVents', bm, DARK, root, bevel=.003, bev_seg=1)
    bm = bmesh.new()
    for s in (-1, 1): add_box(bm, (-1.67, 1.1, s * .92), (.03, .1, .2))
    new_obj('RearLamps', bm, MAT['red'], root)
    decal('Logo_Rear', MAT['logo'], root, (-1.675, 1.29, 0), .62, plane='x')

    # ---- engine hood with louvres, the mark, a stripe, intake, exhaust
    bm = bmesh.new(); prism(bm, [(1.4, 1.02), (1.4, 1.6), (1.12, 1.88), (-.32, 1.9), (-.5, 1.72), (-.5, 1.02)], -1.12, 1.12)
    new_obj('Hood', bm, YH, root, bevel=.06, bev_seg=4, tile=.4)
    bm = bmesh.new()
    for s in (-1, 1):
        for k in range(9): add_box(bm, (-.05 + k * .1, 1.66, s * 1.125), (.05, .2, .012))
        for k in range(6): add_box(bm, (.95 + k * .06, 1.912 - k * .045, s * .6), (.03, .02, .7))
    new_obj('HoodLouvres', bm, DARK, root, bevel=.003, bev_seg=1)
    bm = bmesh.new()
    for s in (-1, 1):
        add_box(bm, (.45, 1.13, s * 1.123), (1.9, .006, .006)); add_box(bm, (.45, 1.13, s * 1.123), (.006, .2, .006))
        add_box(bm, (.45, 1.8, s * 1.123), (1.6, .004, .004))
    new_obj('HoodSeams', bm, DARK, root)
    bm = bmesh.new()
    for s in (-1, 1): add_box(bm, (.45, 1.52, s * 1.124), (1.8, .07, .006))
    new_obj('HoodStripe', bm, MAT['stripe'], root)
    decal('Logo_Hood_L', MAT['logo'], root, (.92, 1.3, 1.128), .78); decal('Logo_Hood_R', MAT['logo'], root, (.92, 1.3, -1.128), .78, side=-1)
    bm = bmesh.new(); add_cyl(bm, (.0, 2.2, -.72), .07, .64, 18); add_cyl(bm, (.0, 2.55, -.72), .085, .08, 18); add_cyl(bm, (.0, 1.98, -.72), .13, .16, 22)
    new_obj('Exhaust', bm, STEEL, root, bevel=.006)
    bm = bmesh.new(); add_box(bm, (.55, 2.0, .65), (.42, .24, .36)); add_cyl(bm, (.55, 2.2, .65), .1, .18, 20)
    new_obj('AirIntake', bm, DARK, root, bevel=.02)

    # ---- hopper: rear bulkhead with the tunnel mouths and flow gates, wings (outside yellow, inside asphalt-coated), front apron, push rollers
    HX0, HX1, HY0, HZ0, HZ1, HY1 = 1.42, 3.26, .58, .9, 1.72, 1.46
    J['hopper'] = {'x0': HX0, 'x1': HX1, 'floor': HY0, 'z0': HZ0, 'z1': HZ1, 'top': HY1}
    bm = bmesh.new()
    add_box(bm, (HX0 - .02, 1.28, 0), (.06, .62, 2.3))
    for z in (-.78, .78): add_box(bm, (HX0 - .02, .8, z * 1.1), (.06, .5, .28))
    add_box(bm, (HX0 - .02, .8, 0), (.06, .5, .08))
    new_obj('HopperBulkhead', bm, COATED, root, bevel=.008)
    bm = bmesh.new()
    for z in (-.4, .4): add_box(bm, (HX0 + .03, .96, z), (.03, .14, .62))
    new_obj('FlowGates', bm, STEEL, root, bevel=.004)
    for s in (-1, 1):
        tag = 'L' if s > 0 else 'R'; w = empty('Wing_' + tag, root, (0, HY0, s * HZ0))
        dz, dy = HZ1 - HZ0, HY1 - HY0; Ln = math.hypot(dz, dy); nz, ny = -dy / Ln * s, dz / Ln   # inward-up normal of the sloped plate
        bm = bmesh.new(); slab(bm, [(HX0, 0, 0), (HX1, 0, 0), (HX1, dy, s * dz), (HX0, dy, s * dz)], (0, -ny, -nz), .045); new_obj('WingOuter_' + tag, bm, YELLOW, w, bevel=.006)
        bm = bmesh.new(); slab(bm, [(HX0 + .02, .01, 0), (HX1 - .02, .01, 0), (HX1 - .02, dy, s * dz), (HX0 + .02, dy, s * dz)], (0, ny, nz), .012); new_obj('WingLiner_' + tag, bm, COATED, w)
        bm = bmesh.new(); add_box(bm, ((HX0 + HX1) / 2, dy + .062, s * (dz + .02)), (HX1 - HX0, .12, .06))
        for x in (HX0 + .05, HX1 - .09): slab(bm, [(x, 0, 0), (x, dy, s * dz), (x, dy + .1, s * dz), (x, .12, 0)], (1, 0, 0), .04)
        for x in np.linspace(HX0 + .4, HX1 - .4, 3): beam(bm, (x, .1), (x, dy - .05), s * (dz * .5 + .06), .04, .07)
        new_obj('WingFrame_' + tag, bm, YELLOW, w, bevel=.008)
        cylinder_pair('WingCyl_' + tag, root, (HX0 + .9, .66, s * 1.18), (HX0 + .9, 1.12, s * 1.45))
    bm = bmesh.new(); slab(bm, [(HX1 + .03, .4, -.86), (HX1 + .03, .4, .86), (HX1 + .03, .64, .86), (HX1 + .03, .64, -.86)], (1, 0, 0), .04); new_obj('FrontApron', bm, COATED, root)
    bm = bmesh.new(); add_box(bm, (HX1 + .05, .52, 0), (.12, .2, 1.9)); add_box(bm, (HX1 - .2, .52, 0), (.4, .1, 1.7))
    for s in (-1, 1): add_box(bm, (HX1 + .12, .52, s * .95), (.2, .26, .06)); add_box(bm, (HX1 + .12, .52, s * .3), (.2, .26, .06))
    new_obj('Bumper', bm, DARK, root, bevel=.01)
    J['push'] = {'x': HX1 + .3, 'y': .52, 'r': .15}
    for s in (-1, 1):
        tag = 'L' if s > 0 else 'R'; e = empty('PushRoller_' + tag, root, (HX1 + .15, .52, s * .62)); bm = bmesh.new(); add_cyl(bm, (0, 0, 0), .15, .56, 36, axis='z')
        for k in range(6): a = 2 * math.pi * k / 6; hexbolt(bm, math.cos(a) * .08, math.sin(a) * .08, .29, r=.016, h=.02)
        new_obj('PushRollerM_' + tag, bm, STEEL, e, bevel=.006)

    # ---- operator platform: grating deck, two consoles with screens, seats, canopy on four posts, beacon, work lamps, handrails, steps
    PY = 1.52
    bm = bmesh.new(); add_box(bm, (-1.08, PY + .01, 0), (1.22, .06, 2.4)); new_obj('Platform', bm, MAT['grate'], root, bevel=.006)
    for s in (-1, 1):
        tag = 'L' if s > 0 else 'R'; bm = bmesh.new(); add_box(bm, (-.72, PY + .38, s * .78), (.18, .7, .18)); add_box(bm, (-.74, PY + .78, s * .78), (.42, .12, .6), rot=Rz(-.35))
        new_obj('Console_' + tag, bm, MAT['chassis'], root, bevel=.015)
        bm = bmesh.new(); quad(bm, (-.86, PY + .9, s * .78), .44, .2, normal='x'); new_obj('ConsoleScreen_' + tag, bm, MAT['screen'], root, uv=False)
        bm = bmesh.new(); add_box(bm, (-1.22, PY + .3, s * .62), (.46, .14, .46)); add_box(bm, (-1.44, PY + .62, s * .62), (.1, .55, .44)); add_cyl(bm, (-1.22, PY + .12, s * .62), .05, .22, 12)
        new_obj('Seat_' + tag, bm, MAT['seat'], root, bevel=.035)
    bm = bmesh.new(); posts = [(-1.62, 1.16), (-1.62, -1.16), (-.56, 1.16), (-.56, -1.16)]
    for x, z in posts: cyl_between(bm, (x, PY + .05, z), (x, 3.02, z), .045, 14)
    add_box(bm, (-1.09, 3.07, 0), (1.52, .1, 2.6)); add_box(bm, (-1.09, 3.14, 0), (1.3, .05, 2.3))
    new_obj('Canopy', bm, YELLOW, root, bevel=.02, bev_seg=2)
    bm = bmesh.new(); add_box(bm, (-1.09, 3.015, 0), (1.46, .02, 2.54)); new_obj('CanopyLiner', bm, DARK, root)
    bm = bmesh.new(); add_cyl(bm, (-.7, 3.24, .9), .085, .15, 20); new_obj('Beacon', bm, MAT['amber'], root)
    bm = bmesh.new()
    for z in (-1.05, 1.05): add_box(bm, (-.5, 3.02, z), (.08, .1, .16))
    new_obj('WorkLamps', bm, MAT['lamp'], root, bevel=.01)
    bm = bmesh.new()
    for s in (-1, 1):
        rail(bm, [(-1.62, PY + .05, s * 1.2), (-1.62, PY + .95, s * 1.2), (-.6, PY + .95, s * 1.2), (-.6, PY + .05, s * 1.2)], .022)
        for y in (.95, 1.3): add_box(bm, (-1.0, y, s * 1.17), (.36, .03, .1))
    new_obj('Handrails', bm, YELLOW, root)
    bm = bmesh.new()
    for s in (-1, 1):
        for y in (.96, 1.24): add_box(bm, (-1.0, y, s * 1.2), (.38, .03, .16))
    new_obj('Steps', bm, MAT['grate'], root, bevel=.004)

    # ---- tow arms, tow-point cylinders, screed-lift cylinders, grade sensor
    TP = (.2, .93); SP = (-2.02, .44)
    for s in (-1, 1):
        tag = 'L' if s > 0 else 'R'; bm = bmesh.new(); beam(bm, TP, SP, s * 1.22, .1, .14); add_box(bm, (TP[0], TP[1], s * 1.22), (.2, .22, .16))
        add_cyl(bm, (TP[0], TP[1], s * 1.22), .07, .24, 16, axis='z'); add_box(bm, (SP[0] + .1, SP[1] + .05, s * 1.22), (.3, .2, .16))
        new_obj('TowArm_' + tag, bm, YELLOW, root, bevel=.01)
        cylinder_pair('TowCyl_' + tag, root, (TP[0], 1.5, s * 1.22), (TP[0], TP[1] + .1, s * 1.22), rb=.055, rr=.03)
        cylinder_pair('LiftCyl_' + tag, root, (-1.55, 1.4, s * .98), (-2.08, .62, s * 1.08), rb=.05, rr=.028)
        bm = bmesh.new(); tube(bm, [(.3, 1.0, s * 1.16), (-.6, .82, s * 1.18), (-1.6, .64, s * 1.2), (-2.0, .56, s * 1.18)], .02, 8); new_obj('Hose_' + tag, bm, MAT['rubber'], root)
    bm = bmesh.new(); add_box(bm, (-.62, .72, 1.6), (.06, .06, .78)); add_cyl(bm, (-.62, .58, 1.96), .06, .22, 18); add_box(bm, (-.62, .7, 1.96), (.12, .08, .12))
    new_obj('GradeSensor', bm, DARK, root, bevel=.006)
    bm = bmesh.new(); add_cyl(bm, (-.62, .47, 1.96), .045, .01, 18); new_obj('GradeSensorFace', bm, MAT['lamp'], root)

    # ---- augers: two flights of opposite hand on one axis, a central gearbox, hanger bearings
    AX, AY, AR = -1.76, .3, .19
    J['auger'] = {'x': AX, 'y': AY, 'r': AR, 'z0': .14, 'z1': 1.76}
    for s in (-1, 1):
        tag = 'L' if s > 0 else 'R'; e = empty('Auger' + tag, root, (AX, AY, 0)); bm = bmesh.new(); add_cyl(bm, (0, 0, s * .95), .05, 1.64, 18, axis='z')
        new_obj('AugerShaft_' + tag, bm, STEEL, e, bevel=.003, bev_seg=1)
        bm = bmesh.new(); z0, z1 = (.14, 1.76) if s > 0 else (-1.76, -.14); helix(bm, z0, z1, .05, AR, .34, s)
        new_obj('AugerFlight_' + tag, bm, MAT['trackWorn'], e)
    bm = bmesh.new(); add_box(bm, (AX, AY + .02, 0), (.3, .34, .26)); add_box(bm, (AX + .12, AY + .35, 0), (.18, .5, .2))
    for s in (-1, 1): add_box(bm, (AX + .02, AY + .25, s * 1.0), (.1, .3, .06)); add_cyl(bm, (AX, AY, s * 1.0), .07, .07, 16, axis='z')
    new_obj('AugerGearbox', bm, DARK, root, bevel=.01)
    bm = bmesh.new(); slab(bm, [(-1.58, .7, -1.8), (-1.58, .7, 1.8), (-1.95, .62, 1.8), (-1.95, .62, -1.8)], (0, 1, 0), .02); new_obj('AugerHood', bm, DARK, root)

    # ---- the screed: strike-off, screed plates (main + extensions behind it), heated body, end gates with skid shoes and depth cranks, walkway, rails, control boxes
    S0, S1, SB, SZ, EZ = -1.98, -2.62, .1, 1.24, 1.8
    J['screed'] = {'front': S0, 'back': S1 - .1, 'bottom': SB, 'half': EZ, 'gate': EZ + .06}
    J['mat'] = {'half': EZ, 'fresh': SB, 'rolled': .078}
    bm = bmesh.new()
    add_box(bm, (S0 - .02, .36, 0), (.04, .5, 2 * SZ)); add_box(bm, ((S0 + S1) / 2, SB + .02, 0), (S0 - S1, .04, 2 * SZ))
    for s in (-1, 1): add_box(bm, (S0 - .12, .38, s * (SZ + (EZ - SZ) / 2)), (.04, .44, EZ - SZ)); add_box(bm, ((S0 + S1) / 2 - .1, SB + .02, s * (SZ + (EZ - SZ) / 2)), (S0 - S1, .04, EZ - SZ))
    new_obj('ScreedPlates', bm, COATED, root, bevel=.004)
    bm = bmesh.new(); add_box(bm, ((S0 + S1) / 2 - .02, .3, 0), (S0 - S1 - .06, .3, 2 * SZ - .04))
    for s in (-1, 1): add_box(bm, ((S0 + S1) / 2 - .12, .3, s * (SZ + (EZ - SZ) / 2)), (S0 - S1 - .06, .3, EZ - SZ - .02))
    new_obj('ScreedBody', bm, YELLOW, root, bevel=.018, bev_seg=2)
    bm = bmesh.new(); add_box(bm, ((S0 + S1) / 2 - .02, .47, 0), (S0 - S1 - .1, .05, 2 * SZ - .1))
    for s in (-1, 1): add_box(bm, ((S0 + S1) / 2 - .12, .47, s * (SZ + (EZ - SZ) / 2)), (S0 - S1 - .1, .05, EZ - SZ - .06))
    new_obj('ScreedTop', bm, DARK, root, bevel=.008)
    bm = bmesh.new()
    for z in np.linspace(-1.6, 1.6, 9): add_box(bm, ((S0 + S1) / 2, .3, z), (S0 - S1 - .04, .32, .03))
    new_obj('ScreedRibs', bm, DARK, root, bevel=.004)
    bm = bmesh.new(); tube(bm, [(S1 + .05, .5, -1.7), (S1 + .05, .52, 0), (S1 + .05, .5, 1.7)], .025, 8); tube(bm, [(S0 - .25, .52, -1.2), (S0 - .25, .54, 1.2)], .02, 8)
    new_obj('HeaterCables', bm, MAT['rubber'], root)
    for s in (-1, 1):
        tag = 'L' if s > 0 else 'R'; gz = s * (EZ + .05)
        bm = bmesh.new(); prism(bm, [(-1.6, .2), (-1.6, .58), (S1 - .32, .58), (S1 - .32, .02), (-1.75, .02)], gz - .02, gz + .02); new_obj('EndGate_' + tag, bm, YELLOW, root, bevel=.006)
        bm = bmesh.new(); add_box(bm, ((-1.6 + S1 - .32) / 2, .03, gz), (S1 - .32 + 1.6 - .1, .05, .09)); new_obj('SkidShoe_' + tag, bm, MAT['trackWorn'], root, bevel=.006)
        bm = bmesh.new(); add_cyl(bm, (-2.2, .78, gz), .02, .44, 10); add_cyl(bm, (-2.2, 1.0, gz), .09, .02, 18); cyl_between(bm, (-2.2, 1.0, gz), (-2.12, 1.02, gz), .012, 8)
        add_cyl(bm, (-2.75, .78, gz), .02, .44, 10); add_cyl(bm, (-2.75, 1.0, gz), .09, .02, 18)
        new_obj('DepthCranks_' + tag, bm, STEEL, root, bevel=.002, bev_seg=1)
    bm = bmesh.new(); add_box(bm, (S1 - .25, .4, 0), (.42, .05, 3.5)); new_obj('Walkway', bm, MAT['grate'], root, bevel=.004)
    bm = bmesh.new()
    for z in np.linspace(-1.68, 1.68, 6): cyl_between(bm, (S1 - .44, .42, z), (S1 - .44, 1.3, z), .022, 10)
    rail(bm, [(S1 - .44, 1.3, -1.7), (S1 - .44, 1.32, 0), (S1 - .44, 1.3, 1.7)], .025); rail(bm, [(S1 - .44, .86, -1.7), (S1 - .44, .86, 1.7)], .02)
    new_obj('ScreedRails', bm, YELLOW, root)
    for s in (-1, 1):
        tag = 'L' if s > 0 else 'R'; bm = bmesh.new(); add_cyl(bm, (S1 - .2, .76, s * 1.5), .03, .7, 10); add_box(bm, (S1 - .22, 1.18, s * 1.5), (.18, .3, .34), rot=Rz(.2))
        new_obj('ScreedControl_' + tag, bm, MAT['chassis'], root, bevel=.012)
        bm = bmesh.new(); quad(bm, (S1 - .325, 1.2, s * 1.5), .26, .18, normal='x'); new_obj('ScreedScreen_' + tag, bm, MAT['screen'], root, uv=False)
    bm = bmesh.new()
    for s in (-1, 1): add_box(bm, (S1 - .03, .3, s * .9), (.01, .06, .9))
    new_obj('ScreedStripe', bm, MAT['stripe'], root)
    decal('Logo_Screed', MAT['logo'], root, (S1 - .045, .3, 0), .4, plane='x')
    finish(root, 'om-group-asphalt-paver', os.path.join(ROOT, 'assets', '3d', 'om-group-asphalt-paver.glb'))
    preview(root, 'paver-front', (7.5, 3.6, 6.8), (.4, .9, 0))
    preview(root, 'paver-rear', (-8.2, 3.4, 5.4), (-1.2, .7, 0))
    clear()

# ================================================================ TANDEM ROLLER
def tandem():
    root = empty('OMGroupTandemRoller')
    DR, DW, DX = .6, 1.7, 1.46
    J['roller'] = {'r': DR, 'w': DW, 'xf': DX, 'xr': -DX}
    for nm, dx, sgn in (('DrumF', DX, 1), ('DrumR', -DX, -1)):
        d = empty(nm, root, (dx, DR, 0)); bm = bmesh.new(); add_cyl(bm, (0, 0, 0), DR, DW, 88, axis='z')
        new_obj(nm + '_Shell', bm, MAT['drum'], d, bevel=.012, bev_seg=2, tile=.6)
        bm = bmesh.new()
        for s in (-1, 1):
            add_cyl(bm, (0, 0, s * (DW / 2 - .005)), DR * .9, .03, 64, axis='z'); add_cyl(bm, (0, 0, s * (DW / 2 + .03)), DR * .36, .07, 40, axis='z')
            for k in range(12): a = 2 * math.pi * k / 12; hexbolt(bm, math.cos(a) * DR * .28, math.sin(a) * DR * .28, s * (DW / 2 + .07), r=.022, h=.025)
        new_obj(nm + '_Ends', bm, DARK, d, bevel=.005, bev_seg=1)
        bm = bmesh.new()                                         # the yoke: side plates down to the axle, a beam over the drum
        for s in (-1, 1):
            prism(bm, [(dx - .42, 1.02), (dx + .42, 1.02), (dx + .22, DR - .05), (dx - .22, DR - .05)], s * (DW / 2 + .1) - .04, s * (DW / 2 + .1) + .04)
            add_cyl(bm, (dx, DR, s * (DW / 2 + .12)), .2, .1, 28, axis='z')
        add_box(bm, (dx, 1.08, 0), (.9, .14, DW + .28))
        new_obj(nm + '_Yoke', bm, YELLOW, root, bevel=.012)
        bm = bmesh.new()
        for xo in (DR + .04, -(DR + .04)): add_box(bm, (dx + xo, DR * .55, 0), (.05, .12, DW - .06))
        new_obj(nm + '_Scrapers', bm, DARK, root, bevel=.006)
        bm = bmesh.new(); bx = dx + sgn * (DR * .78); by = DR * 1.72
        cyl_between(bm, (bx, by, -DW / 2 + .05), (bx, by, DW / 2 - .05), .028, 12)
        for z in np.linspace(-DW / 2 + .15, DW / 2 - .15, 7): add_cyl(bm, (bx + sgn * .02, by - .05, z), .016, .06, 8, r2=.024)
        new_obj(nm + '_SprayBar', bm, STEEL, root)
        J['roller']['spray' + nm[-1]] = [bx, by - .08]
    # front frame (water tank), rear frame (engine hood), articulation, operator platform, ROPS
    bm = bmesh.new(); prism(bm, [(2.02, 1.02), (2.02, 1.42), (1.85, 1.6), (.42, 1.6), (.42, 1.02)], -.88, .88); new_obj('WaterTank', bm, YH, root, bevel=.06, bev_seg=4, tile=.4)
    bm = bmesh.new(); prism(bm, [(-.42, 1.02), (-.42, 1.72), (-.62, 1.86), (-1.9, 1.84), (-2.06, 1.62), (-2.06, 1.02)], -.88, .88); new_obj('EngineHood', bm, YH, root, bevel=.06, bev_seg=4, tile=.4)
    bm = bmesh.new()
    for s in (-1, 1):
        for k in range(8): add_box(bm, (-1.75 + k * .11, 1.5, s * .885), (.05, .22, .012))
    for k in range(7): add_box(bm, (-2.065, 1.18 + k * .06, 0), (.012, .025, 1.3))
    new_obj('Louvres', bm, DARK, root, bevel=.003, bev_seg=1)
    bm = bmesh.new(); add_cyl(bm, (1.2, 1.645, .45), .1, .08, 20); add_cyl(bm, (1.2, 1.645, -.45), .1, .08, 20); new_obj('TankCaps', bm, DARK, root, bevel=.008)
    bm = bmesh.new(); add_box(bm, (0, .96, 0), (.78, .3, .7)); add_cyl(bm, (0, 1.22, 0), .1, .3, 18); add_cyl(bm, (0, .72, 0), .1, .3, 18)
    new_obj('Articulation', bm, DARK, root, bevel=.015)
    bm = bmesh.new(); add_box(bm, (0, 1.06, 0), (.92, .08, 1.9)); new_obj('Platform', bm, MAT['grate'], root, bevel=.005)
    bm = bmesh.new(); add_box(bm, (-.18, 1.32, 0), (.5, .4, .5)); add_box(bm, (-.2, 1.56, 0), (.46, .12, .46)); add_box(bm, (-.42, 1.84, 0), (.1, .5, .46)); new_obj('Seat', bm, MAT['seat'], root, bevel=.035)
    bm = bmesh.new(); cyl_between(bm, (.3, 1.1, 0), (.2, 1.82, 0), .04, 12); add_cyl(bm, (.18, 1.86, 0), .2, .035, 28, axis='y'); add_box(bm, (.32, 1.55, 0), (.18, .3, .5))
    new_obj('Steering', bm, MAT['chassis'], root, bevel=.008)
    bm = bmesh.new()
    for z in (-.82, .82): cyl_between(bm, (-.4, 1.06, z), (-.4, 2.82, z), .05, 14)
    add_box(bm, (-.4, 2.86, 0), (.12, .12, 1.74)); add_box(bm, (-.1, 2.93, 0), (1.25, .08, 1.92)); add_box(bm, (-.1, 2.99, 0), (1.05, .05, 1.7))
    new_obj('ROPS', bm, YELLOW, root, bevel=.016)
    bm = bmesh.new(); add_box(bm, (-.1, 2.885, 0), (1.2, .02, 1.86)); new_obj('ROPSLiner', bm, DARK, root)
    bm = bmesh.new(); add_cyl(bm, (-.45, 3.06, .6), .08, .14, 20); new_obj('Beacon', bm, MAT['amber'], root)
    bm = bmesh.new()
    for z in (-.72, .72): add_box(bm, (2.03, 1.32, z), (.03, .1, .16)); add_box(bm, (-2.07, 1.32, z), (.03, .1, .16))
    new_obj('Lamps', bm, MAT['lamp'], root)
    bm = bmesh.new()
    for s in (-1, 1): add_box(bm, (1.22, 1.16, s * .885), (1.5, .06, .006)); add_box(bm, (-1.24, 1.16, s * .885), (1.5, .06, .006))
    new_obj('Stripe', bm, MAT['stripe'], root)
    bm = bmesh.new()
    for s in (-1, 1): rail(bm, [(.38, 1.1, s * .92), (.38, 1.62, s * .92), (-.38, 1.62, s * .92), (-.38, 1.1, s * .92)], .02)
    new_obj('Handrails', bm, YELLOW, root)
    decal('Logo_Tank_L', MAT['logo'], root, (1.22, 1.41, .885), .56); decal('Logo_Tank_R', MAT['logo'], root, (1.22, 1.41, -.885), .56, side=-1)
    decal('Logo_Hood_L', MAT['logo'], root, (-.72, 1.4, .885), .44); decal('Logo_Hood_R', MAT['logo'], root, (-.72, 1.4, -.885), .44, side=-1)
    finish(root, 'om-group-tandem-roller', os.path.join(ROOT, 'assets', '3d', 'om-group-tandem-roller.glb'))
    preview(root, 'roller', (5.6, 2.8, 5.2), (0, 1.0, 0))

# ================================================================ ASPHALT TEXTURES
def asphalt_textures(N=1024, tile=1.2):
    """seamless asphalt mat tiles (1024 px = 1.2 m): black binder, coated coarse aggregate with lighter edges where the film is thin, fine aggregate speckle.
       fresh = open texture, stones stand proud, satin film; rolled = the same stones pressed in, a smoother, slightly glossier surface"""
    rng = np.random.default_rng(2026)
    low = .6 * pnoise(rng, N, .9) + .4 * pnoise(rng, N, 1.6)
    H = np.zeros((N, N), np.float32); C = np.zeros((N, N), np.float32); EDGE = np.zeros((N, N), np.float32)
    ppm = N / tile; K = int(.62 * N * N / (math.pi * (4.2 ** 2)))
    radii = np.clip(rng.gamma(3.2, 1.25, K), 1.6, 8.5) * ppm / 853
    order = np.argsort(-radii)
    for i in order:
        r = radii[i]; cx, cy = rng.uniform(0, N, 2); w = int(math.ceil(r * 1.35)) + 1
        xs = (np.arange(-w, w + 1) + int(cx)) % N; ys = (np.arange(-w, w + 1) + int(cy)) % N
        dx = (np.arange(-w, w + 1) + int(cx) - cx)[None, :]; dy = (np.arange(-w, w + 1) + int(cy) - cy)[:, None]
        rho = np.hypot(dx, dy); th = np.arctan2(dy, dx); p1, p2, p3 = rng.uniform(0, 6.3, 3)
        rr = r * (1 + .16 * np.sin(3 * th + p1) + .09 * np.sin(5 * th + p2) + .05 * np.sin(7 * th + p3))
        q = rho / rr; m = q < 1
        h = np.where(m, np.sqrt(np.clip(1 - q * q, 0, 1)) * (.55 + .45 * rng.random()) * min(1.0, r / 5), 0)
        sub = np.ix_(ys, xs); cur = H[sub]; take = h > cur
        tone = rng.choice([.06, .075, .09, .11], p=[.35, .3, .25, .1])
        if rng.random() < .012: tone = .22
        H[sub] = np.where(take, h, cur); C[sub] = np.where(take, tone, C[sub]); EDGE[sub] = np.where(take, np.clip((q - .55) / .45, 0, 1) * m, EDGE[sub])
    stone = H > 0
    binder = .022 + .006 * low
    spk = rng.random((N, N)); fine = (spk > .9) & ~stone
    colr = np.where(stone, C + .05 * EDGE * (C < .2) + .01 * low, binder); colr = np.where(fine, .045 + .03 * rng.random((N, N)), colr)
    def save(kind, hscale, rough_b, rough_s, gloss_low):
        h = H * hscale + .004 * low + np.where(fine, .08, 0) * hscale
        col = np.dstack([colr * 1.0, colr * .985, colr * .965])
        save_img('asphalt-%s-c' % kind, np.clip(col, 0, 1) ** (1 / 2.2), 'sRGB')
        save_img('asphalt-%s-n' % kind, normal_from_height(h * 6.0, 1.0), 'Non-Color')
        r = np.where(stone, rough_s - .1 * (1 - EDGE), rough_b) + gloss_low * low; save_img('asphalt-%s-r' % kind, np.clip(r, .05, 1), 'Non-Color')
    save('fresh', 1.0, .66, .76, .06); save('rolled', .42, .52, .62, .04)   # a hot mat has a satin film, not a gloss: low roughness made it mirror the sky
    import shutil
    for kind in ('fresh', 'rolled'):
        for c in 'cnr': shutil.copy(os.path.join(TEX, 'asphalt-%s-%s.png' % (kind, c)), os.path.join(TEXOUT, 'asphalt-%s-%s.png' % (kind, c)))
    print('[paving3d] asphalt textures written')

if not TEXONLY:
    paver()
    tandem()
    json.dump(J, open(os.path.join(ROOT, 'assets', '3d', 'om-group-paving.json'), 'w'), indent=1)
if not NOTEX: asphalt_textures()
print('[paving3d] done')
