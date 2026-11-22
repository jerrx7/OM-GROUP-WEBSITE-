"""OM GROUP - finished concrete products on a turntable (M-Sand page, "Fine Aggregate for Engineered Concrete Products").

  blender -b --factory-startup -P scripts/excavator3d/build-products.py -- <repo root> [--quick]

Output
  assets/3d/om-group-products.glb    interlocking pavers on a sand bed, a bullnose precast kerb, four tiles, a two-core hollow block, a spigot ring unit and the turntable.
                                     Every surface carries Cycles-BAKED maps from a procedural concrete shader (pigmented paste, cloudy mottling, sand grains, pores and blowholes, form-line seams,
                                     worn arrises): base colour with the contact occlusion baked in, a tangent normal map (the bump of the pores and grains) and a roughness map.
                                     Pavers and tiles are baked in a neutral grey and tinted per piece in the web scene (pigment).
  assets/3d/om-group-products.json  anchors for the numbered markers (three.js coordinates)
  _review/excavator3d/om-group-products.blend
Units are the scene's own (a paver is 2.0 x 1.0 x 0.6); three.js axes in the output (x right, y up, z toward the viewer); here the model is built in Blender axes (z up, y away).
"""
import bpy, bmesh, math, json, os, sys, random
import numpy as np
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd()); QUICK = '--quick' in argv
OUT = os.path.join(ROOT, '_review', 'excavator3d'); TEX = os.path.join(OUT, 'tex-products'); os.makedirs(TEX, exist_ok=True)
GLB = os.path.join(ROOT, 'assets', '3d', 'om-group-products.glb')
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene; scene.render.engine = 'CYCLES'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for kind in ('OPTIX', 'CUDA'):
        try: prefs.compute_device_type = kind
        except Exception: continue
        prefs.get_devices(); devs = [d for d in prefs.devices if d.type == kind]
        if devs:
            for d in prefs.devices: d.use = d.type == kind
            scene.cycles.device = 'GPU'; break
except Exception as e: print('gpu', e)
scene.cycles.samples = 24; scene.cycles.use_denoising = False
P = lambda x, y, z: Vector((x, -z, y))                      # three.js -> blender
rnd = random.Random(7)
SZ = {'paver': 1024, 'tile': 1024, 'kerb': 2048, 'block': 2048, 'ring': 1024, 'sand': 512, 'plate': 1024}
if QUICK: SZ = {k: max(256, v // 4) for k, v in SZ.items()}

# ---------------------------------------------------------------- the concrete shader (baked, never exported)
def conc(name, base, G, Pp, o=None):
    o = o or {}
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N, Lk = nt.nodes, nt.links
    for n in list(N): N.remove(n)
    out = N.new('ShaderNodeOutputMaterial'); pr = N.new('ShaderNodeBsdfPrincipled'); Lk.new(pr.outputs['BSDF'], out.inputs['Surface'])
    tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); Lk.new(tc.outputs['Object'], mp.inputs['Vector'])
    seed = o.get('seed', 1.0); mp.inputs['Location'].default_value = (seed * 3.7, seed * 1.3, seed * 2.9)
    def S(v):                                                                 # a socket or a constant -> something linkable
        return v
    def math(op, a, b=None, c=None, clamp=False):
        n = N.new('ShaderNodeMath'); n.operation = op; n.use_clamp = clamp
        for i, v in enumerate((a, b, c)):
            if v is None: continue
            if isinstance(v, (int, float)): n.inputs[i].default_value = v
            else: Lk.new(v, n.inputs[i])
        return n.outputs[0]
    def noise(scale, detail=5, rough=.55, dist=0.0):
        n = N.new('ShaderNodeTexNoise'); n.noise_dimensions = '3D'; n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail; n.inputs['Roughness'].default_value = rough; n.inputs['Distortion'].default_value = dist
        Lk.new(mp.outputs['Vector'], n.inputs['Vector']); return n.outputs['Fac']
    def vor(scale):
        n = N.new('ShaderNodeTexVoronoi'); n.voronoi_dimensions = '3D'; n.feature = 'F1'; n.inputs['Scale'].default_value = scale; n.inputs['Randomness'].default_value = 1.0
        Lk.new(mp.outputs['Vector'], n.inputs['Vector']); bw = N.new('ShaderNodeRGBToBW'); Lk.new(n.outputs['Color'], bw.inputs['Color']); return n.outputs['Distance'], bw.outputs['Val']
    clamp01 = lambda v: math('MINIMUM', math('MAXIMUM', v, 0.0), 1.0)
    # colour: large mottling, medium clouds, sand grains, fine variation
    f = math('MULTIPLY', math('MULTIPLY_ADD', noise(1.1, 5, .6), o.get('mot', .42), 1 - o.get('mot', .42) / 2), math('MULTIPLY_ADD', noise(5.5, 6, .6), o.get('cloud', .30), 1 - o.get('cloud', .30) / 2))
    gd, gbw = vor(G); f = math('MULTIPLY', f, math('MULTIPLY_ADD', gbw, o.get('grain', .46), 1 - o.get('grain', .46) / 2))
    nf = noise(G * 1.6, 4, .6); f = math('MULTIPLY', f, math('MULTIPLY_ADD', nf, .22, .89))
    # pores and blowholes: a Voronoi cell becomes a pore when its random value is high, with a random radius
    pd, pbw = vor(Pp); rad = math('MULTIPLY', math('MAXIMUM', math('SUBTRACT', pbw, o.get('pth', .6)), 0.0), o.get('pk', 1.6))
    mask = clamp01(math('MULTIPLY', math('SUBTRACT', rad, pd), 55.0))
    f = math('MULTIPLY', f, math('MULTIPLY_ADD', mask, -o.get('pd', .78), 1.0))
    # aggregate chips (hollow block): large cells with a random lighter or darker tone
    ag = 0.0
    if o.get('agg'):
        ad, abw = vor(o['agg']); am = clamp01(math('MULTIPLY', math('SUBTRACT', math('MULTIPLY', math('MAXIMUM', math('SUBTRACT', abw, .72), 0.0), .7), ad), 40.0)); tone = noise(o['agg'] * .9, 2, .5)
        f = math('MULTIPLY', f, math('MULTIPLY_ADD', math('MULTIPLY', am, math('SUBTRACT', tone, .5)), 1.1, 1.0)); ag = am
    # form-line seams (kerb): thin horizontal lines every n units of height
    if o.get('seam'):
        sx = N.new('ShaderNodeSeparateXYZ'); Lk.new(mp.outputs['Vector'], sx.inputs['Vector']); fr = math('FRACT', math('MULTIPLY_ADD', sx.outputs['Z'], o['seam'], .5))
        line = math('LESS_THAN', math('ABSOLUTE', math('SUBTRACT', fr, .5)), .012); f = math('MULTIPLY', f, math('MULTIPLY_ADD', line, -.45, 1.0)); seamh = line
    else: seamh = 0.0
    # worn arrises: an inside-AO edge mask lightens and chips the edges
    ao = N.new('ShaderNodeAmbientOcclusion'); ao.inside = True; ao.only_local = True; ao.inputs['Distance'].default_value = o.get('edged', .06)
    em = clamp01(math('MULTIPLY', math('SUBTRACT', math('SUBTRACT', 1.0, ao.outputs['AO']), .12), 3.0)); f = math('MULTIPLY', f, math('MULTIPLY_ADD', em, .15 * o.get('wear', 1), 1.0))
    # height for the bump: grains + fine noise - pores - chips at the edges - seams
    h = math('ADD', math('MULTIPLY', nf, .45), math('MULTIPLY', gbw, .4)); h = math('SUBTRACT', h, math('MULTIPLY', mask, 1.3))
    h = math('SUBTRACT', h, math('MULTIPLY', em, math('MULTIPLY', noise(G * .35, 3, .6), .9 * o.get('wear', 1))))
    if o.get('seam'): h = math('SUBTRACT', h, math('MULTIPLY', seamh, .6))
    if o.get('agg'): h = math('ADD', h, math('MULTIPLY', ag, .5))
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = o.get('bump', 1.0); bump.inputs['Distance'].default_value = o.get('bd', .03); Lk.new(h, bump.inputs['Height'])
    vs = N.new('ShaderNodeVectorMath'); vs.operation = 'SCALE'; vs.inputs[0].default_value = base; Lk.new(f, vs.inputs['Scale'])
    Lk.new(vs.outputs['Vector'], pr.inputs['Base Color']); Lk.new(bump.outputs['Normal'], pr.inputs['Normal'])
    rgh = math('MULTIPLY_ADD', nf, .14, o.get('rough', .88) - .07); rgh = math('ADD', rgh, math('MULTIPLY', em, .08)); Lk.new(math('MINIMUM', rgh, 1.0), pr.inputs['Roughness'])
    pr.inputs['Metallic'].default_value = 0.0
    try: pr.inputs['Specular IOR Level'].default_value = .3
    except Exception: pass
    return m

# ---------------------------------------------------------------- baking
def world_ao(dist):
    w = scene.world or bpy.data.worlds.new('W'); scene.world = w; w.use_nodes = True
    try: w.light_settings.distance = dist
    except Exception as e: print('ao dist', e)
def sel(ob):
    for o in bpy.context.view_layer.objects: o.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
def bake_maps(ob, mat, size, kinds, ao_dist=.5, ao_samples=96):
    ob.data.materials.clear(); ob.data.materials.append(mat); nt = mat.node_tree; res = {}
    for k in kinds:
        img = bpy.data.images.new('bk_%s_%s' % (ob.name, k), size, size, alpha=False, float_buffer=True)
        img.colorspace_settings.name = 'sRGB' if k == 'color' else 'Non-Color'
        tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = img; nt.nodes.active = tn; sel(ob)
        if k == 'ao': world_ao(ao_dist); scene.cycles.samples = ao_samples
        else: scene.cycles.samples = 12
        kw = dict(margin=6 if not QUICK else 2, use_clear=True)
        if k == 'color': bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'}, **kw)
        elif k == 'normal': bpy.ops.object.bake(type='NORMAL', normal_space='TANGENT', **kw)
        elif k == 'rough': bpy.ops.object.bake(type='ROUGHNESS', **kw)
        elif k == 'ao': bpy.ops.object.bake(type='AO', **kw)
        a = np.empty(size * size * 4, np.float32); img.pixels.foreach_get(a); res[k] = a.reshape(size, size, 4)[..., :3].copy(); nt.nodes.remove(tn); bpy.data.images.remove(img)
        print('[products3d] baked', ob.name, k)
    return res
def enc(a): a = np.clip(a, 0, 1); return np.where(a <= .0031308, a * 12.92, 1.055 * np.power(a, 1 / 2.4) - .055)
def save_img(name, arr, cs):
    N_ = arr.shape[0]; rgba = np.ones((N_, arr.shape[1], 4), dtype=np.float32); rgba[..., :3] = arr
    img = bpy.data.images.new(name, arr.shape[1], N_, alpha=False); img.pixels.foreach_set(rgba.ravel()); img.filepath_raw = os.path.join(TEX, name + '.png'); img.file_format = 'PNG'; img.save(); img.colorspace_settings.name = cs; return img
def final_mat(name, maps, ao_mix=.9, ao_floor=.25, color_const=None):
    """the exported material: base colour (albedo x baked occlusion), roughness map, tangent normal map"""
    ao = maps.get('ao'); col = maps['color'] if 'color' in maps else np.ones_like(ao) * np.array(color_const)
    if ao is not None: col = col * (1 - ao_mix + ao_mix * (ao_floor + (1 - ao_floor) * ao))
    ci = save_img(name + '_c', enc(col), 'sRGB'); m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N, Lk = nt.nodes, nt.links; pr = next(n for n in N if n.type == 'BSDF_PRINCIPLED')
    uv = N.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'
    def timg(img):
        t = N.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Linear'; Lk.new(uv.outputs['UV'], t.inputs['Vector']); return t
    Lk.new(timg(ci).outputs['Color'], pr.inputs['Base Color'])
    if 'rough' in maps: ri = save_img(name + '_r', maps['rough'], 'Non-Color'); Lk.new(timg(ri).outputs['Color'], pr.inputs['Roughness'])
    if 'normal' in maps:
        ni = save_img(name + '_n', maps['normal'], 'Non-Color'); nm = N.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 1.0; Lk.new(timg(ni).outputs['Color'], nm.inputs['Color']); Lk.new(nm.outputs['Normal'], pr.inputs['Normal'])
    return m

# ---------------------------------------------------------------- geometry
root = bpy.data.objects.new('OMGroupProducts', None); scene.collection.objects.link(root)
def finish(name, bm, loc=(0, 0, 0), yaw=0.0, bevel=0.0, seg=2, unwrap=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); ob.location = P(*loc); ob.rotation_euler = (0, 0, yaw); ob.parent = root
    sel(ob)
    for p in me.polygons: p.use_smooth = True
    if bevel > 0:
        bv = ob.modifiers.new('bevel', 'BEVEL'); bv.width = bevel; bv.segments = seg; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(35); bv.profile = .65
        try: bv.harden_normals = True
        except Exception: pass
        bpy.ops.object.modifier_apply(modifier=bv.name)
        wn = ob.modifiers.new('wn', 'WEIGHTED_NORMAL'); wn.keep_sharp = True; wn.weight = 100; bpy.ops.object.modifier_apply(modifier=wn.name)
    if unwrap:
        me.uv_layers.new(name='UVMap'); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=.006); bpy.ops.object.mode_set(mode='OBJECT')
    return ob
def box_bm(sx, sy, sz, cx=0, cy=0, cz=0):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(Vector((cx, cy, cz))) @ Matrix.Diagonal((sx, sy, sz, 1))); return bm

# plate (turntable top) and drum
RT = 13.2
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=True, segments=128, radius1=RT, radius2=RT, depth=.5, matrix=Matrix.Translation(Vector((0, 0, -.25))))
plate = finish('Turntable', bm, unwrap=False); uvl = plate.data.uv_layers.new(name='UVMap')
for poly in plate.data.polygons:
    for li in poly.loop_indices: v = plate.data.vertices[plate.data.loops[li].vertex_index].co; uvl.data[li].uv = (v.x / (2 * RT) + .5, v.y / (2 * RT) + .5)
bm = bmesh.new(); prof = [(0, 0), (RT + .5, 0), (RT + .5, -.18), (RT + .2, -.3), (RT + .2, -.95), (RT - 1.6, -1.15), (0, -1.15)]
vs_ = [bm.verts.new((x, 0, z - .5)) for x, z in prof]
for i in range(len(vs_) - 1): bm.edges.new((vs_[i], vs_[i + 1]))
bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], cent=(0, 0, 0), axis=(0, 0, 1), angle=math.tau, steps=128, use_merge=True); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
drum = finish('Drum', bm, unwrap=False)
dm = bpy.data.materials.new('DrumMetal'); dm.use_nodes = True; pb = next(n for n in dm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); pb.inputs['Base Color'].default_value = (.022, .024, .028, 1); pb.inputs['Metallic'].default_value = .85; pb.inputs['Roughness'].default_value = .38; drum.data.materials.append(dm)
bpy.ops.mesh.primitive_torus_add(major_radius=RT + .02, minor_radius=.06, major_segments=128, minor_segments=8, location=(0, 0, .02)); ringo = bpy.context.active_object; ringo.name = 'TurntableRim'; ringo.parent = root
om = bpy.data.materials.new('RimOrange'); om.use_nodes = True; pb = next(n for n in om.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); pb.inputs['Base Color'].default_value = (1.0, .1, .02, 1); pb.inputs['Roughness'].default_value = .4; pb.inputs['Emission Color'].default_value = (1, .1, .02, 1); pb.inputs['Emission Strength'].default_value = .05; ringo.data.materials.append(om)
for p in ringo.data.polygons: p.use_smooth = True

# sand bed
sand = finish('SandBed', box_bm(6.3, 5.3, .12, 0, -1.6, .06), bevel=0.0, unwrap=True)
# pavers (15 on the bed, three pigments): geometry shared, placed in a running bond
PG = None; pavers = []; pr_ = random.Random(4); PIGK = []
for row in range(5):
    for col in range(3):
        shift = 1.04 if row % 2 else 0; x = (col - 1) * 2.04 - 1.02 + shift + 1.02 - .02; z = (row - 2) * 1.04 + 1.6
        if abs(x) > 3.1: continue
        k = (row + col * 2 + (1 if pr_.random() < .2 else 0)) % 3; PIGK.append(k)
        if PG is None: PG = finish('Paver_0', box_bm(2.0, 1.0, .6), loc=(x, .12 + .3, z), yaw=(pr_.random() - .5) * .006, bevel=.05, seg=2); pavers.append((PG, k))
        else:
            ob = bpy.data.objects.new('Paver_%d' % len(pavers), PG.data); scene.collection.objects.link(ob); ob.location = P(x, .12 + .3, z); ob.rotation_euler = (0, 0, (pr_.random() - .5) * .006); ob.parent = root; pavers.append((ob, k))
# kerb: length along x, a bullnose on the +y(front) top edge, a small chamfer on the back
KW, KH, KR, KL = 1.3, 2.3, .42, 6.2
prof = [(-KW / 2, 0), (KW / 2, 0), (KW / 2, KH - KR)] + [(KW / 2 - KR + KR * math.cos(a), KH - KR + KR * math.sin(a)) for a in [i / 8 * math.pi / 2 for i in range(1, 9)]] + [(-KW / 2 + .15, KH), (-KW / 2, KH - .12)]
bm = bmesh.new(); a = [bm.verts.new((-KL / 2, w, h)) for w, h in prof]; b = [bm.verts.new((KL / 2, w, h)) for w, h in prof]; n = len(prof)
bm.faces.new(a[::-1]); bm.faces.new(b)
for i in range(n): bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
kerb = finish('Kerb', bm, loc=(-6.6, 0, -2.2), yaw=.38, bevel=.035, seg=2)
# tiles
tiles = []
for i, (dx, dz) in enumerate([(-1.2, -1.2), (1.2, -1.2), (-1.2, 1.2), (1.2, 1.2)]):
    if i == 0: t0 = finish('Tile_0', box_bm(2.3, 2.3, .26), loc=(6.4 + dx, .13, -1.0 + dz), yaw=(i - 1.5) * .008, bevel=.04, seg=2); tiles.append(t0)
    else: ob = bpy.data.objects.new('Tile_%d' % i, t0.data); scene.collection.objects.link(ob); ob.location = P(6.4 + dx, .13, -1.0 + dz); ob.rotation_euler = (0, 0, (i - 1.5) * .008); ob.parent = root; tiles.append(ob)
# hollow block: a box minus two cores
BL, BW, BH = 3.9, 1.9, 1.9
blk = finish('HollowBlock', box_bm(BL, BW, BH, 0, 0, BH / 2), loc=(-3.4, 0, 6.0), yaw=.5, bevel=0.0, unwrap=False); sel(blk)
for cx in (-.95, .95):
    cb = bpy.data.objects.new('core', bpy.data.meshes.new('core')); bm = box_bm(1.16, 1.24, BH + .4, cx, 0, BH / 2); bm.to_mesh(cb.data); bm.free(); scene.collection.objects.link(cb); cb.parent = blk
    bo = blk.modifiers.new('cut', 'BOOLEAN'); bo.operation = 'DIFFERENCE'; bo.object = cb; bo.solver = 'EXACT'; sel(blk); bpy.ops.object.modifier_apply(modifier=bo.name); bpy.data.objects.remove(cb)
bv = blk.modifiers.new('bevel', 'BEVEL'); bv.width = .04; bv.segments = 2; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(35); bv.profile = .65; sel(blk); bpy.ops.object.modifier_apply(modifier=bv.name)
for p in blk.data.polygons: p.use_smooth = True
wn = blk.modifiers.new('wn', 'WEIGHTED_NORMAL'); wn.keep_sharp = True; wn.weight = 100; bpy.ops.object.modifier_apply(modifier=wn.name)
blk.data.uv_layers.new(name='UVMap'); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=.006); bpy.ops.object.mode_set(mode='OBJECT')
# ring unit with a spigot
rp = [(1.06, .06), (1.14, 0), (1.56, 0), (1.6, .06), (1.6, 1.0), (1.44, 1.06), (1.44, 1.62), (1.36, 1.68), (1.06, 1.68)]
bm = bmesh.new(); vs_ = [bm.verts.new((x, 0, z)) for x, z in rp]
for i in range(len(vs_) - 1): bm.edges.new((vs_[i], vs_[i + 1]))
bm.edges.new((vs_[-1], vs_[0]))
bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], cent=(0, 0, 0), axis=(0, 0, 1), angle=math.tau, steps=96, use_merge=True); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
ring = finish('RingUnit', bm, loc=(-.8, 0, -5.4), bevel=.0)
# the lathe is smooth except at its steps: flag steps sharp by angle through a bevel-free weighted normal
bm = bmesh.new(); bm.from_mesh(ring.data)
for e in bm.edges:
    if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(35): e.smooth = False
bm.to_mesh(ring.data); bm.free()

# ---------------------------------------------------------------- bake every type, then build the exported materials
NEUTRAL = (.58, .58, .58)
if True:
    ctx = {}
    ctx['paver'] = bake_maps(PG, conc('bk_paver', NEUTRAL, 200, 60, {'seed': 1.1, 'pth': .66, 'pk': 1.3, 'edged': .05, 'bump': 1.1, 'bd': .02, 'rough': .9}), SZ['paver'], ('color', 'normal', 'rough', 'ao'), ao_dist=.35)
    ctx['tile'] = bake_maps(tiles[0], conc('bk_tile', NEUTRAL, 220, 70, {'seed': 2.3, 'pth': .74, 'pk': 1.0, 'edged': .05, 'bump': .7, 'bd': .015, 'rough': .72, 'mot': .3, 'cloud': .2}), SZ['tile'], ('color', 'normal', 'rough', 'ao'), ao_dist=.3)
    ctx['kerb'] = bake_maps(kerb, conc('bk_kerb', (.115, .115, .112), 95, 20, {'seed': 3.4, 'grain': .3, 'pd': .72, 'pth': .68, 'pk': 2.3, 'mot': .7, 'cloud': .42, 'edged': .07, 'bump': 1.5, 'bd': .06, 'rough': .93, 'seam': .55, 'mot': .5, 'cloud': .34}), SZ['kerb'], ('color', 'normal', 'rough', 'ao'), ao_dist=.5)
    ctx['block'] = bake_maps(blk, conc('bk_block', (.135, .13, .122), 95, 24, {'seed': 4.6, 'pd': .66, 'pth': .6, 'pk': 2.0, 'edged': .08, 'bump': 2.0, 'bd': .06, 'rough': .97, 'agg': 7.5, 'mot': .5, 'cloud': .4, 'grain': .36}), SZ['block'], ('color', 'normal', 'rough', 'ao'), ao_dist=.5)
    ctx['ring'] = bake_maps(ring, conc('bk_ring', (.108, .112, .112), 130, 26, {'seed': 5.7, 'grain': .3, 'pd': .68, 'pth': .68, 'pk': 1.9, 'mot': .6, 'edged': .05, 'bump': 1.1, 'bd': .03, 'rough': .86, 'mot': .38, 'cloud': .26}), SZ['ring'], ('color', 'normal', 'rough', 'ao'), ao_dist=.45)
    ctx['sand'] = bake_maps(sand, conc('bk_sand', (.50, .38, .24), 260, 30, {'seed': 6.1, 'pth': .9, 'pk': .2, 'edged': .02, 'bump': .8, 'bd': .015, 'rough': 1.0, 'wear': .2, 'grain': .7}), SZ['sand'], ('color', 'normal', 'rough', 'ao'), ao_dist=.35)
    # the plate: only the occlusion of everything standing on it
    plate.data.materials.clear(); pm = bpy.data.materials.new('bk_plate'); pm.use_nodes = True; ctx['plate'] = bake_maps(plate, pm, SZ['plate'], ('ao',), ao_dist=1.6, ao_samples=160)
FM = {}
FM['paver'] = final_mat('Paver', ctx['paver'], .9, .3); FM['tile'] = final_mat('Tile', ctx['tile'], .9, .3); FM['kerb'] = final_mat('Kerb', ctx['kerb'], 1.0, .15)
FM['block'] = final_mat('HollowBlock', ctx['block'], 1.0, .12); FM['ring'] = final_mat('RingUnit', ctx['ring'], 1.0, .15); FM['sand'] = final_mat('SandBed', ctx['sand'], .9, .3)
ao_p = ctx['plate']['ao']; FM['plate'] = final_mat('Turntable', {'ao': ao_p}, .8, .5, color_const=(.5, .48, .45))
ASSIGN = [(PG, 'paver')] + [(o, 'paver') for o, k in pavers[1:]] + [(t, 'tile') for t in tiles] + [(kerb, 'kerb'), (blk, 'block'), (ring, 'ring'), (sand, 'sand'), (plate, 'plate')]
for ob, k in ASSIGN:
    ob.data.materials.clear(); ob.data.materials.append(FM[k])
# plate: satin lacquer
for k in ('plate',):
    pr = next(n for n in FM[k].node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); pr.inputs['Roughness'].default_value = .34
    try: pr.inputs['Coat Weight'].default_value = .4
    except Exception: pass
# colour index of each paver is carried in its name for the web scene (R, G, B)
for ob, k in pavers: ob.name = 'Paver_%s_%d' % ('RGB'[k], int(ob.name.split('_')[1]))
for i, t in enumerate(tiles): t.name = 'Tile_%s_%d' % ('AB'[(i + (1 if i > 1 else 0)) % 2], i)

# ---------------------------------------------------------------- export
def sel_tree(o):
    o.select_set(True)
    for c in o.children: sel_tree(c)
for o in bpy.context.view_layer.objects: o.select_set(False)
sel_tree(root); bpy.context.view_layer.objects.active = root
opts = dict(filepath=GLB, export_format='GLB', use_selection=True, export_apply=True, export_texcoords=True, export_normals=True, export_tangents=False, export_materials='EXPORT', export_yup=True, export_cameras=False, export_lights=False, export_extras=True, export_image_format='WEBP', export_image_quality=82)
for drop in ([], ['export_image_quality'], ['export_image_quality', 'export_image_format']):
    try: bpy.ops.export_scene.gltf(**{k: v for k, v in opts.items() if k not in drop}); break
    except TypeError as e: print('[products3d] gltf option retry', e)
print('[products3d] GLB', os.path.getsize(GLB), 'bytes')
meta = {'pavers': {'x': 0, 'y': .85, 'z': 1.6}, 'kerb': {'x': -6.6, 'y': KH + .05, 'z': -2.2}, 'tiles': {'x': 6.4, 'y': .32, 'z': -1.0}, 'block': {'x': -3.4, 'y': BH + .08, 'z': 6.0}, 'ring': {'x': -.8, 'y': 1.72, 'z': -5.4}, 'plateRadius': RT}
json.dump(meta, open(os.path.join(ROOT, 'assets', '3d', 'om-group-products.json'), 'w'), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'om-group-products.blend'))
print('[products3d] done')
