"""OM GROUP - Wet Mix Macadam page: the aggregate-testing widgets as photoreal Blender stills (studio, transparent background, soft floor shadow).

  SCENE=shape|la|impact|pi blender -b --factory-startup -P scripts/wmm3d/build-lab.py -- <repo root> [--quick]

  shape   four stones on stands: cubical, flaky, elongated, irregular (real stone texture), with their length / width / thickness axes projected for the page overlay
  la      a Los Angeles abrasion machine: the drum with a window, the shelf, steel balls and aggregate tumbling
  impact  an aggregate impact tester: base, steel cup with aggregate, two guide columns and the hammer
  pi      a 425 micron brass sieve with a pan and fine soil, and a glass plate with a thread of soil rolled to crumbling
Outputs _review/wmm3d/lab-<scene>.png and lab-<scene>.json. Generic equipment models, not any particular laboratory. No result, limit or certificate is implied.
"""
import sys, os
_root_ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_src = open(os.path.join(_root_, 'scripts', 'wsand3d', 'build-wsand.py'), encoding='utf8').read()
exec(compile(_src[:_src.index('# =========================================================================================== WASHING')], 'prelude', 'exec'))
_s2 = open(os.path.join(_root_, 'scripts', 'wsand3d', 'build-wsand2.py'), encoding='utf8').read()
exec(compile(_s2[_s2.index('import zlib'):_s2.index('HZ = .17')], 'helpers2', 'exec'))
OUT = os.path.join(ROOT, '_review', 'wmm3d'); os.makedirs(OUT, exist_ok=True); TEX = os.path.join(OUT, 'tex'); os.makedirs(TEX, exist_ok=True)
SC = os.environ.get('SCENE', 'shape'); SAMPLES = int(os.environ.get('SAMPLES', '30' if QUICK else '220')); ASPECT = 1.6

def studio_world():
    setup_world_render(); scene.cycles.samples = SAMPLES
    try: scene.view_settings.view_transform = 'AgX'; scene.view_settings.look = 'AgX - Medium High Contrast'
    except Exception: pass
    scene.cycles.denoiser = 'OPENIMAGEDENOISE'

def lights3(target, k=1.0):
    area('Key', (-2.2, 3.0, 2.4), 1.8, 1.4, 520 * k, (1.0, .97, .92), target); area('Fill', (2.8, 1.6, 2.2), 2.2, 1.6, 150 * k, (.93, .96, 1.0), target)
    area('Rim', (.6, 2.2, -2.6), 2.0, 1.0, 260 * k, (1, 1, 1), target); area('Top', (0, 3.6, .4), 2.6, 2.0, 120 * k, (1, 1, 1), target)

def persp(target, az, el, dist, lens=60, aspect=ASPECT):
    cam = bpy.data.cameras.new('Cam'); cam.lens = lens; cam.sensor_width = 36; cam.clip_start = .05; cam.clip_end = 80
    co = new_obj('Cam', cam); scene.camera = co; a, e = math.radians(az), math.radians(el)
    co.location = V(target[0] + dist * math.sin(a) * math.cos(e), target[1] + dist * math.sin(e), target[2] + dist * math.cos(a) * math.cos(e))
    co.rotation_euler = (V(*target) - co.location).to_track_quat('-Z', 'Y').to_euler()
    W = int(os.environ.get('W', '1100' if QUICK else '1800')); scene.render.resolution_x = W; scene.render.resolution_y = int(W / aspect); scene.render.resolution_percentage = 100
    return co

import mathutils
POSTROLL = [None]; FOFF = [0]; ANIM = bool(os.environ.get("ANIM")); ANIMFN = [None]; ANIMEXTRA = [None]; NFR = int(os.environ.get('FRAMES', '96'))

def cream_backdrop():
    """camera rays see a warm studio cream, the lighting keeps the neutral world"""
    nt = scene.world.node_tree; out = next(n for n in nt.nodes if n.type == 'OUTPUT_WORLD'); bg = next(n for n in nt.nodes if n.type == 'BACKGROUND')
    b2 = nt.nodes.new('ShaderNodeBackground'); b2.inputs['Color'].default_value = (.95, .925, .87, 1); b2.inputs['Strength'].default_value = float(os.environ.get('BGK', '2.4'))
    lp = nt.nodes.new('ShaderNodeLightPath'); mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(lp.outputs['Is Camera Ray'], mx.inputs[0]); nt.links.new(bg.outputs[0], mx.inputs[1]); nt.links.new(b2.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], out.inputs['Surface'])

def animate_lab(co, data):
    sc = scene; sc.render.film_transparent = False; cream_backdrop(); gpu_on()
    if ANIMFN[0]: bpy.app.handlers.frame_change_pre.clear(); bpy.app.handlers.frame_change_pre.append(ANIMFN[0])
    pre = int(os.environ.get('PREROLL', '0')); FOFF[0] = pre; sc.frame_start, sc.frame_end = 1, pre + NFR; sc.render.fps = 24; sc.cycles.samples = int(os.environ.get('SAMPLES', '36')); sc.render.use_persistent_data = True
    W = int(os.environ.get('W', '1280')); sc.render.resolution_x = W; sc.render.resolution_y = int(W / ASPECT) // 2 * 2; sc.render.resolution_percentage = 100
    sc.render.image_settings.media_type = 'VIDEO'; sc.render.image_settings.file_format = 'FFMPEG'; ff = sc.render.ffmpeg; ff.format = 'MPEG4'; ff.codec = 'H264'; ff.constant_rate_factor = 'HIGH'; ff.ffmpeg_preset = 'GOOD'; ff.gopsize = 24
    d = os.path.join(OUT, 'anim'); os.makedirs(d, exist_ok=True); sc.render.filepath = os.path.join(d, 'lab-' + SC + '.mp4')
    if pre:
        for f in range(1, pre + 1):
            sc.frame_set(f)
            if f in (1, 10, 40, pre) and os.environ.get('DBG'): o = bpy.data.objects['ball0']; print('[dbg] frame', f, 'ball0', tuple(round(c, 3) for c in o.matrix_world.translation), 'rbw', sc.rigidbody_world.enabled)
    if pre and POSTROLL[0]: POSTROLL[0]()
    sc.frame_start = 1 + pre
    bpy.ops.render.render(animation=True)
    if ANIMEXTRA[0] is not None: json.dump(ANIMEXTRA[0], open(os.path.join(d, 'lab-' + SC + '.json'), 'w'))
    print('[lab] wrote', sc.render.filepath)

def poster(co, data):
    """one opaque frame (the first of the loop) on the same cream backdrop as the video, used as the still under it"""
    sc = scene; sc.render.film_transparent = False; cream_backdrop(); gpu_on(); sc.render.image_settings.media_type = 'IMAGE'; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGB'
    W = int(os.environ.get('W', '1000' if QUICK else '2000')); r = sc.render.resolution_x / sc.render.resolution_y; sc.render.resolution_x = W; sc.render.resolution_y = int(W / r) // 2 * 2; sc.render.resolution_percentage = 100
    pre = int(os.environ.get('PREROLL', '0'))
    if pre:
        FOFF[0] = pre; sc.frame_start, sc.frame_end = 1, pre + NFR
        if ANIMFN[0]: bpy.app.handlers.frame_change_pre.clear(); bpy.app.handlers.frame_change_pre.append(ANIMFN[0])
        for f in range(1, pre + 2): sc.frame_set(f)
        if POSTROLL[0]: POSTROLL[0]()
    elif ANIMFN[0]: ANIMFN[0](sc)
    sc.render.filepath = os.path.join(OUT, 'lab-' + SC + '-poster.png'); bpy.ops.render.render(write_still=True); print('[lab] wrote', sc.render.filepath)

def render(co, data):
    if os.environ.get('POSTER'): return poster(co, data)
    if ANIM: return animate_lab(co, data)
    gpu_on(); bpy.context.view_layer.update(); scene.render.filepath = os.path.join(OUT, 'lab-' + SC + '.png'); bpy.ops.render.render(write_still=True)
    json.dump(data, open(os.path.join(OUT, 'lab-' + SC + '.json'), 'w')); print('[lab] wrote', scene.render.filepath)

def steel(name='SteelBrushed', rough=.3): return mat_plain(name, (.72, .73, .75), rough, 1.0, .25)
def painted(name, col, rough=.35): return mat_plain(name, col, rough, 0.0, .15)

# ---------------------------------------------------------------- shape
def scene_shape():
    studio_world(); lights3((0, .3, 0), .8); floor_catcher(0, 0, 8)
    stone = mat_pbr('StoneShape', stone_maps(NS, 7), 1.1, .4, tint=False); steelm = steel(); plate = painted('PlateW', (.93, .93, .91), .22)
    specs = [('cub', (1.0, .95, .9), 3, (.25, .0, .35)), ('fla', (1.55, 1.15, .34), 11, (.0, .5, .1)), ('elo', (2.35, .72, .62), 19, (.3, .2, -.2)), ('irr', (1.55, 1.0, .78), 27, (.5, -.3, .2))]
    xs = [-1.62, -.54, .54, 1.62]; data = {}; S = .34; stones = []
    for (key, dims, seed, rot), x in zip(specs, xs):
        cyl('Base', (x, 0, 0), (x, .035, 0), .43, plate, 64)
        cyl('Pole', (x, .035, 0), (x, .52, 0), .028, steelm, 20); cyl('Cap', (x, .5, 0), (x, .545, 0), .1, steelm, 28)
        cyl('Pad', (x, .545, 0), (x, .56, 0), .08, mat_plain('Pad', (.05, .05, .05), .7, 0, 0), 24)
        ob = new_obj('Stone_' + key, rock_mesh(seed, stone, 'st' + key)); ob.scale = (dims[0] * S, dims[1] * S, dims[2] * S)
        ob.rotation_euler = rot; ob.location = V(x, .6, 0); bpy.context.view_layer.update(); lowz = min((ob.matrix_world @ v.co).z for v in ob.data.vertices); ob.location.z += (.565 - lowz)
        for p in ob.data.polygons: p.use_smooth = False
        stones.append((key, ob, mathutils.Euler(rot).to_matrix(), dims, x)); c = ob.location; ax = []
        for i, dd in enumerate((dims[0], dims[1], dims[2])):
            v = Vector((1 if i == 0 else 0, 1 if i == 1 else 0, 1 if i == 2 else 0)); w = ob.rotation_euler.to_matrix() @ v; ax.append((c + w * dd * S * .5, c - w * dd * S * .5))
        data[key] = {'ax': [[list(a.to_tuple()), list(b.to_tuple())] for a, b in ax], 'c': list(c.to_tuple())}
    co = persp((0, .5, 0), 8, 13, 6.1, 52); bpy.context.view_layer.update()
    out = {}
    for key, d in data.items():
        out[key] = {'c': project(co, {'c': (d['c'][0], d['c'][2], -d['c'][1])})['c'], 'ax': []}
        for a, b in d['ax']:
            pa = world_to_camera_view(scene, co, Vector(a)); pb = world_to_camera_view(scene, co, Vector(b)); out[key]['ax'].append([[round(pa.x, 4), round(1 - pa.y, 4)], [round(pb.x, 4), round(1 - pb.y, 4)]])
    if ANIM:                                   # turntable: the stones turn on their stands and the length / width / thickness bars follow (per-frame json)
        frames = {k: [None] * NFR for k in data}
        def fn(s):
            f = scene.frame_current
            if f < 1 or f > NFR: return
            th = 2 * math.pi * (f - 1) / NFR
            for (key, ob, R0, dims, x) in stones:
                Rm = mathutils.Matrix.Rotation(th, 3, 'Z') @ R0; ob.rotation_euler = Rm.to_euler(); ob.location = V(x, .6, 0); bpy.context.view_layer.update()
                lowz = min((ob.matrix_world @ v.co).z for v in ob.data.vertices); ob.location.z += (.565 - lowz); bpy.context.view_layer.update()
                c = ob.location.copy(); axs = []
                for i, dd in enumerate(dims):
                    w = Rm @ Vector((1 if i == 0 else 0, 1 if i == 1 else 0, 1 if i == 2 else 0)); pa = world_to_camera_view(scene, co, c + w * dd * S * .5); pb = world_to_camera_view(scene, co, c - w * dd * S * .5)
                    axs.append([[round(pa.x, 4), round(1 - pa.y, 4)], [round(pb.x, 4), round(1 - pb.y, 4)]])
                frames[key][f - 1] = axs
        ANIMFN[0] = fn; ANIMEXTRA[0] = frames
    render(co, out)

# ---------------------------------------------------------------- Los Angeles machine
def scene_la():
    studio_world(); lights3((0, .8, 0)); floor_catcher(0, 0, 8)
    blue = painted('MachineBlue', (.05, .14, .26), .3); grey = painted('MachineGrey', (.42, .44, .45), .38); st = steel('DrumSteel', .34); dark = painted('Dark', (.03, .03, .035), .5)
    ball_m = mat_plain('Ball', (.78, .79, .82), .16, 1.0, 0.0); stone = mat_pbr('StoneLA', stone_maps(NS, 9), 1.0, .4, tint=True)
    box('Base', -1.5, 1.5, 0, .1, -.55, .55, grey, .006); box('FrameL', -.7, -.5, .1, 1.0, -.45, .45, blue, .008); box('FrameR', .5, .7, .1, 1.0, -.45, .45, blue, .008)
    R, Lx, Y = .355, .3, .98
    cyl('Shaft', (-.62, Y, 0), (.62, Y, 0), .04, st, 24); cyl('BearingL', (-.66, Y, 0), (-.52, Y, 0), .075, dark, 28); cyl('BearingR', (.52, Y, 0), (.66, Y, 0), .075, dark, 28)
    # the drum: a steel shell open over a front window, flat end plates, one shelf
    bm = bmesh.new(); N = 96; a0, a1 = math.radians(-58), math.radians(58); rings = []
    for xx in (-Lx, Lx):
        ring = []
        for i in range(N):
            a = math.radians(360 * i / N)
            if a1 < a < math.radians(360) + a0 - 1e-6 and False: pass
            ring.append(a)
        rings.append(ring)
    for i in range(N):
        a_ = 2 * math.pi * i / N; b_ = 2 * math.pi * (i + 1) / N
        mid = (a_ + b_) / 2
        if -a1 < ((mid + math.pi) % (2 * math.pi)) - math.pi < a1: continue                    # leave the window facing the viewer (+z)
    def arc_point(a, xx): return Vector((xx, Y + R * math.sin(a), R * math.cos(a)))               # angle measured from +z (toward the viewer) around the x axis
    window = math.radians(54); verts = {}
    for i in range(N + 1):
        a = -math.pi + 2 * math.pi * i / N
        for j, xx in enumerate((-Lx, Lx)): verts[(i, j)] = bm.verts.new(V(xx, Y + R * math.sin(a), R * math.cos(a)))
    for i in range(N):
        am = -math.pi + 2 * math.pi * (i + .5) / N
        if abs(am - (math.pi / 2)) < window / 1.0 and False: continue
        if abs(math.cos(am)) > math.cos(window) and math.cos(am) > 0 and abs(math.sin(am)) < math.sin(window): continue             # the front window (centred on +z)
        bm.faces.new([verts[(i, 0)], verts[(i + 1, 0)], verts[(i + 1, 1)], verts[(i, 1)]])
    me = bpy.data.meshes.new('Drum'); bm.to_mesh(me); bm.free(); dr = new_obj('Drum', me); sm = dr.modifiers.new('s', 'SOLIDIFY'); sm.thickness = .01; sm.offset = 1; me.materials.append(st)
    for p in me.polygons: p.use_smooth = True
    cyl('EndL', (-Lx - .012, Y, 0), (-Lx, Y, 0), R + .012, st, 96); cyl('EndR', (Lx, Y, 0), (Lx + .012, Y, 0), R + .012, st, 96)
    box('Shelf', -Lx, Lx, Y - R * .98, Y - R * .98 + .09, -.012 - R * .0, .012 - R * .0, st, .002)      # placeholder, moved below
    bpy.data.objects['Shelf'].location = V(0, 0, 0); bpy.data.objects['Shelf'].rotation_euler = (0, 0, 0)
    bpy.data.objects['Shelf'].location = V(0, R * .55 + 0, -R * .85); bpy.data.objects['Shelf'].rotation_euler = (math.radians(-38), 0, 0)
    # the charge: 12 steel balls and angular aggregate, banked up the rising wall and falling from the shelf
    rng = random.Random(4); meshes = [rock_mesh(60 + i, stone, 'la%d' % i) for i in range(10)]
    for k in range(140):
        a = min(math.radians(-25), max(math.radians(-160), rng.gauss(math.radians(-100), math.radians(26)))); rr = R - .045 - rng.uniform(0, .13) * (rng.random() ** .7); x = rng.uniform(-Lx + .035, Lx - .035)
        ob = new_obj('lr%d' % k, meshes[rng.randrange(10)]); s = rng.uniform(.03, .052); ob.scale = (s, s * rng.uniform(.7, 1), s * rng.uniform(.8, 1.1)); ob.rotation_euler = (rng.uniform(0, 6.3), rng.uniform(0, 6.3), rng.uniform(0, 6.3))
        ob.location = V(x, Y + rr * math.sin(a), rr * math.cos(a))
    for k in range(12):
        a = rng.uniform(math.radians(-150), math.radians(-40)); rr = R - rng.uniform(.04, .16); x = rng.uniform(-Lx + .04, Lx - .04)
        sphere('ball%d' % k, (x, Y + rr * math.sin(a), rr * math.cos(a)), .0234, ball_m, 3)
    # motor, belt guard, control box
    cyl('Motor', (-1.35, .32, 0), (-.85, .32, 0), .17, blue, 40); box('MotorFoot', -1.3, -.9, .1, .17, -.17, .17, grey, .004); cyl('Pulley', (-.85, .32, 0), (-.8, .32, 0), .13, dark, 32)
    box('Guard', -.82, -.5, .22, .98, .16, .26, grey, .006); box('Ctrl', .95, 1.35, .1, .62, -.2, .2, grey, .006); box('CtrlFace', .95, 1.35, .3, .56, .2, .205, dark, .002)
    cyl('Btn1', (1.05, .46, .205), (1.05, .46, .225), .03, mat_plain('Green', (.05, .6, .1), .4, 0, 0), 20); cyl('Btn2', (1.18, .46, .205), (1.18, .46, .225), .03, mat_plain('Red', (.7, .05, .05), .4, 0, 0), 20)
    if ANIM:                                   # the drum turns two revolutions per loop and carries a rigid-body charge (balls and aggregate)
        bpy.data.objects.remove(bpy.data.objects['Shelf'], do_unlink=True)
        spin = bpy.data.objects.new('Spin', None); scene.collection.objects.link(spin); spin.location = V(0, Y, 0); bpy.context.view_layer.update()
        shelf = box('ShelfN', -Lx, Lx, Y - .007, Y + .007, -R + .012, -R + .11, st, .002)
        # the shell and its window stay put so the charge is always in view; the end plates, the shelf and a ring of bolts turn
        kin = [bpy.data.objects['EndL'], bpy.data.objects['EndR'], shelf]; boltm = mat_plain('Bolt', (.2, .2, .22), .35, 1.0, 0.0); stripe = mat_plain('EndStripe', (.9, .35, .05), .45, 0.0, 0.0)
        for k in range(10):
            a = k * 2 * math.pi / 10; kin.append(cyl('Bolt%d' % k, (Lx + .008, Y + .27 * math.sin(a), .27 * math.cos(a)), (Lx + .026, Y + .27 * math.sin(a), .27 * math.cos(a)), .011, boltm, 12))
        kin.append(box('EndMark', Lx + .008, Lx + .02, Y - .018, Y + .018, 0, .24, stripe, .001)); kin.append(box('EndMarkL', -Lx - .02, -Lx - .008, Y - .018, Y + .018, 0, .24, stripe, .001))
        for o in kin: o.parent = spin; o.matrix_parent_inverse = spin.matrix_world.inverted()
        # invisible container that carries the charge: a cylinder wall, flat ends and the shelf
        bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=64, radius1=R - .012, radius2=R - .012, depth=2 * Lx - .006)
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=mathutils.Matrix.Rotation(math.pi / 2, 3, 'Y'))
        cb = bmesh.ops.create_cube(bm, size=1.0)['verts']
        for v in cb: v.co = Vector((-Lx if v.co.x < 0 else Lx, (R - .11) if v.co.y < 0 else (R - .012), -.008 if v.co.z < 0 else .008))
        cme = bpy.data.meshes.new('Cont'); bm.to_mesh(cme); bm.free(); cont = new_obj('Cont', cme); cont.location = V(0, Y, 0); cont.hide_render = True; cont.display_type = 'WIRE'
        bpy.context.view_layer.objects.active = cont; cont.select_set(True); bpy.ops.rigidbody.object_add(type='PASSIVE')
        cont.rigid_body.collision_shape = 'MESH'; cont.rigid_body.kinematic = True; cont.rigid_body.friction = .75; cont.rigid_body.restitution = .12; cont.rigid_body.collision_margin = .001
        # spread the charge over the lower part of the drum without overlaps; the pre-roll lets it settle
        rngp = random.Random(12); placed = []
        for o in [x for x in bpy.data.objects if x.name.startswith('ball') or (x.name.startswith('lr') and x.name[2:].isdigit())]:
            rad = (.0234 if o.name.startswith('ball') else max(o.scale) * 1.08)
            for attempt in range(500):
                a = rngp.uniform(math.radians(-168), math.radians(-12)); rr = (R - .06 - rad) * math.sqrt(rngp.uniform(0, 1)); x = rngp.uniform(-Lx + .03 + rad, Lx - .03 - rad)
                yv = Y + rr * math.sin(a) + (0 if attempt < 450 else .14); zv = rr * math.cos(a)
                if attempt < 450 and (yv - Y) > -.01: continue
                p = Vector((x, yv, zv))
                if all((p - q).length > rad + r2 + .003 for q, r2 in placed) or attempt == 499: placed.append((p, rad)); o.location = V(x, yv, zv); break
            bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.rigidbody.object_add(type='ACTIVE')
            o.rigid_body.collision_shape = 'SPHERE' if o.name.startswith('ball') else 'CONVEX_HULL'; o.rigid_body.mass = 1.0 if o.name.startswith('ball') else .12; o.rigid_body.friction = .6; o.rigid_body.restitution = .15; o.rigid_body.collision_margin = .001
        rbw = scene.rigidbody_world; rbw.substeps_per_frame = 14; rbw.solver_iterations = 30; rbw.point_cache.frame_start = 1; rbw.point_cache.frame_end = NFR + 100
        def fn(s):
            th = 4 * math.pi * (scene.frame_current - 1 - FOFF[0]) / NFR; spin.rotation_euler.x = th; cont.rotation_euler.x = th
        ANIMFN[0] = fn; os.environ['PREROLL'] = '80'
    co = persp((0, .72, 0), 20, 12, 5.0, 58); render(co, {})

# ---------------------------------------------------------------- aggregate impact tester
def scene_impact():
    studio_world(); lights3((0, .7, 0)); floor_catcher(0, 0, 8)
    iron = painted('CastIron', (.05, .052, .058), .42); blue = painted('MachineBlue', (.12, .27, .42), .33); st = steel('RodSteel', .22); cr = mat_plain('Chrome', (.86, .87, .9), .1, 1.0, 0.0); grey = painted('MachineGrey', (.55, .57, .58), .38)
    stone = mat_pbr('StoneIM', stone_maps(NS, 14), 1.0, .4, tint=True)
    box('Base', -.45, .45, 0, .13, -.4, .4, iron, .012); box('Plinth', -.28, .28, .13, .2, -.28, .28, iron, .01)
    cyl('Cup', (0, .2, 0), (0, .31, 0), .06, st, 48); cyl('CupIn', (0, .201, 0), (0, .3, 0), .052, mat_plain('CupIn', (.4, .4, .42), .4, 1.0, 0), 48)
    rng = random.Random(8); meshes = [rock_mesh(80 + i, stone, 'im%d' % i) for i in range(8)]
    for k in range(34):
        ob = new_obj('ir%d' % k, meshes[rng.randrange(8)]); s = rng.uniform(.016, .026); ob.scale = (s, s * rng.uniform(.7, 1), s * rng.uniform(.8, 1.1)); ob.rotation_euler = (rng.uniform(0, 6.3), rng.uniform(0, 6.3), rng.uniform(0, 6.3))
        a = rng.uniform(0, 6.3); rr = rng.uniform(0, .04) * (rng.random() ** .5); ob.location = V(rr * math.cos(a), .225 + rng.uniform(0, .05), rr * math.sin(a))
    for sx in (-.085, .085): cyl('Guide', (sx, .2, -.0), (sx, 1.52, -.0), .014, cr, 20); box('Stud', sx - .03, sx + .03, .13, .2, -.03, .03, st, .004)
    box('Bridge', -.14, .14, 1.5, 1.6, -.045, .045, blue, .008); cyl('Pulley', (0, 1.62, 0), (0, 1.62, .06), .04, st, 28)
    cyl('Hammer', (0, .88, 0), (0, 1.0, 0), .052, cr, 56); box('SleeveL', -.108, -.065, .9, .98, -.03, .03, grey, .004); box('SleeveR', .065, .108, .9, .98, -.03, .03, grey, .004)
    cyl('Cord', (0, 1.0, 0), (0, 1.62, 0), .004, mat_plain('Cord', (.05, .05, .05), .7, 0, 0), 8); cyl('Release', (.09, 1.0, 0), (.3, 1.18, 0), .008, st, 12); sphere('Knob', (.3, 1.18, 0), .018, mat_plain('KnobR', (.7, .05, .05), .4, 0, 0), 2)
    cyl('Stand', (-.34, .13, -.3), (-.34, 1.62, -.3), .018, st, 16); box('Arm', -.34, -.08, 1.5, 1.52, -.31, -.29, st, .002)
    # a sample tray with aggregate on the left and a balance on the right, so the bench reads as a laboratory
    box('Tray', -1.05, -.55, 0, .035, -.2, .2, steel('TrayS', .3), .004); box('TrayIn', -1.04, -.56, .01, .036, -.19, .19, mat_plain('TrayIn', (.62, .63, .65), .3, 1.0, 0), .002)
    for k in range(46):
        ob = new_obj('tr%d' % k, meshes[rng.randrange(8)]); s_ = rng.uniform(.018, .03); ob.scale = (s_, s_ * rng.uniform(.7, 1), s_ * rng.uniform(.8, 1.1)); ob.rotation_euler = (rng.uniform(0, 6.3), rng.uniform(0, 6.3), rng.uniform(0, 6.3)); ob.location = V(rng.uniform(-1.0, -.6), .04 + rng.uniform(0, .02), rng.uniform(-.15, .15))
    box('Bal', .6, 1.05, 0, .11, -.22, .22, grey, .01); box('BalPan', .72, .94, .11, .118, -.1, .1, steel('BalPanS', .25), .003); box('BalScr', .64, 1.01, .03, .08, .22, .225, painted('ScreenD', (.02, .05, .04), .3), .002)
    if ANIM:                                   # the hammer rises on its cord, falls onto the sample, rebounds and is raised again
        O = bpy.data.objects; parts = [O[n] for n in ('Hammer', 'SleeveL', 'SleeveR', 'Release', 'Knob')]; z0 = {o.name: o.location.z for o in parts}; cord = O['Cord']
        jit = [(O['ir%d' % k], O['ir%d' % k].location.copy(), O['ir%d' % k].rotation_euler.copy(), random.Random(k).uniform(-1, 1), random.Random(k + 50).uniform(0, 6.3)) for k in range(34)]
        def dyf(u):
            top, low = .40, -.565
            if u < .12: return top
            if u < .30: t = (u - .12) / .18; return top + (low - top) * t * t
            if u < .38: t = (u - .30) / .08; return low + .035 * math.sin(math.pi * t) * (1 - t)
            if u < .88: t = (u - .38) / .5; return low + (top - low) * t * t * (3 - 2 * t)
            return top
        def fn(s):
            u = ((scene.frame_current - 1) % NFR) / NFR; d = dyf(u)
            for o in parts: o.location.z = z0[o.name] + d
            cord.location.z = (1.62 + 1.0 + d) / 2; cord.scale.z = (1.62 - (1.0 + d)) / .62
            amp = math.exp(-(u - .30) * 26) if .30 <= u < .62 else 0.0
            for ob, l0, r0, a, ph in jit:
                ob.location = l0 + Vector((0, 0, .004 * amp * abs(math.sin(ph + u * 90)))); ob.rotation_euler = (r0[0] + .06 * amp * a, r0[1], r0[2] + .05 * amp * a)
        ANIMFN[0] = fn
    co = persp((0, .72, 0), 18, 9, 5.2, 52, ASPECT); render(co, {})

# ---------------------------------------------------------------- plasticity: sieve and thread
def ring(name, cx, y0, y1, cz, r, wall, mat, seg=80):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=False, segments=seg, radius1=r, radius2=r, depth=y1 - y0); me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = new_obj(name, me); ob.location = V(cx, (y0 + y1) / 2, cz); me.materials.append(mat)
    for p in me.polygons: p.use_smooth = True
    sm = ob.modifiers.new('sol', 'SOLIDIFY'); sm.thickness = wall; sm.offset = -1; return ob

def scene_pi():
    studio_world(); lights3((0, .15, 0)); floor_catcher(0, 0, 8)
    brass = mat_plain('Brass', (.78, .58, .24), .26, 1.0, .1); glass = bpy.data.materials.new('Glass'); glass.use_nodes = True; nt = glass.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); mix = nt.nodes.new('ShaderNodeMixShader'); tr = nt.nodes.new('ShaderNodeBsdfTransparent'); gl = nt.nodes.new('ShaderNodeBsdfGlossy'); fr = nt.nodes.new('ShaderNodeFresnel'); fr.inputs['IOR'].default_value = 1.5
    gl.inputs['Roughness'].default_value = .02; gl.inputs['Color'].default_value = (.85, .95, .92, 1); nt.links.new(fr.outputs[0], mix.inputs['Fac']); nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(gl.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs['Surface'])
    soil = mat_pbr('SoilFine', speckle_maps(NS, 91, (.34, .25, .17), [(.46, .34, .22), (.26, .18, .12), (.55, .44, .3), (.18, .13, .08)], 40000, (1.2, 3.2), (.2, .8), .08, tone=.12, rough=(.95, .03)), .9, .3)
    clay = mat_plain('Clay', (.34, .24, .16), .82, 0.0, 1.2)
    # the sieve: brass frame, woven mesh disc (see-through), the soil lying on it, and the pan
    Xs = -.22
    ring('PanWall', Xs, 0, .05, 0, .125, .003, brass); cyl('PanBase', (Xs, 0, 0), (Xs, .004, 0), .125, brass, 80)
    ring('Frame', Xs, .048, .105, 0, .1, .003, brass); ring('FrameRim', Xs, .105, .112, 0, .104, .004, brass)
    wm = wire_maps(cells=40, N=1024, wire=.16, seed=3); meshm = mat_pbr('Mesh', wm, 1.0, .5, 1.0, alpha=wm[3]); me = bpy.data.meshes.new('MeshDisc'); bmx = bmesh.new(); bmesh.ops.create_circle(bmx, cap_ends=True, cap_tris=False, segments=80, radius=.098); bmx.to_mesh(me); bmx.free()
    md = new_obj('MeshDisc', me); md.location = V(Xs, .075, 0); md.rotation_euler = (0, 0, 0); me.materials.append(meshm); uvl = me.uv_layers.new(name='UVMap')
    for p in me.polygons:
        for li in p.loop_indices: c = me.vertices[me.loops[li].vertex_index].co; uvl.data[li].uv = (c.x * 3.2, c.y * 3.2)
    heap('Fines', Xs, 0, .07, .035, soil, .08, n=120, seed=6, base=.076, wob=.06)
    for k in range(3): cyl('Clip%d' % k, (Xs + .1 * math.cos(k * 2.1), .06, .1 * math.sin(k * 2.1)), (Xs + .1 * math.cos(k * 2.1), .1, .1 * math.sin(k * 2.1)), .004, brass, 8)
    # the glass plate with a thread rolled out to crumbling, a ball of soil and a spatula
    Gx = .27
    box('Glass', Gx - .17, Gx + .17, .0, .011, -.14, .14, mat_plain('Frost', (.74, .82, .8), .14, 0.0, 0.0), .0015)
    sphere('Ball', (Gx - .09, .03, .05), .026, clay, 4, (1, .85, 1))
    rng = random.Random(3)
    for k in range(7):
        x0 = Gx - .09 + k * .043 + rng.uniform(-.004, .004); ln = rng.uniform(.02, .036); z0 = -.03 + rng.uniform(-.006, .006)
        ob = cyl('Th%d' % k, (x0, .0155, z0), (x0 + ln, .0155, z0 + rng.uniform(-.006, .006)), .0042, clay, 12)
    cyl('ThreadWhole', (Gx - .1, .0155, -.08), (Gx + .1, .0155, -.084), .0044, clay, 12)
    box('SpatH', Gx + .02, Gx + .09, .02, .026, .08, .092, mat_plain('Handle', (.5, .3, .12), .5, 0, 0), .004); box('SpatB', Gx - .1, Gx + .02, .016, .019, .082, .09, steel('Spatula', .2), .001)
    if ANIM:                                   # the sieve is shaken in a small circle on its pan
        O = bpy.data.objects; spin = O.new('SieveSpin', None); scene.collection.objects.link(spin); spin.location = V(Xs, 0, 0); bpy.context.view_layer.update()
        for o in list(O):
            if o.name.startswith(('PanWall', 'PanBase', 'Frame', 'FrameRim', 'MeshDisc', 'Fines', 'Clip')): o.parent = spin; o.matrix_parent_inverse = spin.matrix_world.inverted()
        def fn(s):
            u = ((scene.frame_current - 1) % NFR) / NFR; th = 2 * math.pi * 4 * u; spin.location = V(Xs + .007 * math.cos(th), 0, .007 * math.sin(th)); spin.rotation_euler.z = .012 * math.sin(th)
        ANIMFN[0] = fn
    co = persp((.03, .035, .0), 8, 36, 1.42, 55); render(co, {})

{'shape': scene_shape, 'la': scene_la, 'impact': scene_impact, 'pi': scene_pi}[SC]()
