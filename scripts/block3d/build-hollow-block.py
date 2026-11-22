"""OM GROUP - hollow concrete block (6mm aggregate page, "Anatomy of a hollow concrete block").

Builds the whole asset in Blender, headless:
  blender -b --factory-startup -P scripts/block3d/build-hollow-block.py -- <repo root> [--quick]

What it makes
  1. Geometry: one watertight block. Outer box minus two rounded-corner core cutters (exact boolean), so the cores are
     real openings through the full height; the web, end walls and face shells are real material. Bevel (limit by
     angle) softens every outside and core edge; Weighted Normal keeps the flat faces flat.
  2. Concrete: tileable PBR maps (albedo, tangent normal, roughness) generated procedurally here with numpy: cement
     paste, partly exposed sand and fine stone grains, pores and small voids, all periodic so they tile without seams.
  3. Lighting bake: ambient occlusion (Cycles) into a second UV set, and the studio floor shadow (Cycles shadow
     catcher, three area lights) as a texture the web scene lays under the block.
  4. Exports: assets/3d/hollow-concrete-block.glb (geometry, normals, tangents, both UV sets, PBR material, anatomy
     anchor empties), Cycles poster renders (fallback while WebGL loads), the .blend source and meta.json.

Units are metres. Blender axes: X = length, -Y = front face, Z = up. glTF (+Y up) maps (x, y, z) -> (x, z, -y).
Proportions follow the approved reference picture; they are a schematic, not a product specification.
"""
import bpy, bmesh, math, json, os, sys
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd())
QUICK = '--quick' in argv
OUT = os.path.join(ROOT, '_review', 'block3d')
TEX = os.path.join(OUT, 'tex')
os.makedirs(TEX, exist_ok=True)
os.makedirs(os.path.join(ROOT, 'assets', '3d'), exist_ok=True)
GLB = os.path.join(ROOT, 'assets', '3d', 'hollow-concrete-block.glb')

# ---------------------------------------------------------------- dimensions (m)
L, D, H = 0.40, 0.22, 0.15      # length, depth (front to back), height
TF = 0.030                      # front / back face shell
TE = 0.032                      # end walls
TW = 0.030                      # web
RC = 0.010                      # core corner radius (mould fillet)
BEV = 0.0024                    # edge softening
TILE = 0.18                     # one concrete texture tile covers 180 mm
NTEX = 1024

# Camera rigs, shared with the web component (three.js coordinates, block centre at (0, H/2, 0)).
# The camera looks straight down -Z (front face parallel to the picture, verticals stay vertical, like a shift lens).
CAMS = {
    'wide': {'ax': 0.50, 'ay': 0.30, 'dist': 1.72},   # desktop / tablet: the reference three-quarter view
    'tall': {'ax': 0.40, 'ay': 0.40, 'dist': 1.60},   # phones: a little higher, a little more frontal
}

def cam_pos3(c):
    return (c['ax'] * c['dist'], H / 2 + c['ay'] * c['dist'], c['dist'])

def to_blender(p3):
    return Vector((p3[0], -p3[2], p3[1]))

# ---------------------------------------------------------------- scene reset
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'CYCLES'

def gpu_on():
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        for kind in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI'):
            try:
                prefs.compute_device_type = kind
            except Exception:
                continue
            prefs.get_devices()
            devs = [d for d in prefs.devices if d.type == kind]
            if devs:
                for d in prefs.devices:
                    d.use = d.type == kind
                scene.cycles.device = 'GPU'
                print('[block3d] Cycles device:', kind, [d.name for d in devs])
                return
    except Exception as e:
        print('[block3d] GPU setup failed', e)
    scene.cycles.device = 'CPU'
    print('[block3d] Cycles device: CPU')
gpu_on()

# ---------------------------------------------------------------- geometry
def box_obj(name, x0, x1, y0, y1, z0, z1):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, z)) for z in (z0, z1) for y in (y0, y1) for x in (x0, x1)]
    f = lambda a, b, c, d: bm.faces.new((vs[a], vs[b], vs[c], vs[d]))
    f(0, 2, 3, 1); f(4, 5, 7, 6); f(0, 1, 5, 4); f(2, 6, 7, 3); f(0, 4, 6, 2); f(1, 3, 7, 5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    return ob

def rounded_prism(name, x0, x1, y0, y1, z0, z1, r, seg=8):
    pts = []
    for cx, cy, a0 in ((x1 - r, y0 + r, -90), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180)):
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bot = [bm.verts.new((x, y, z0)) for x, y in pts]
    top = [bm.verts.new((x, y, z1)) for x, y in pts]
    bm.faces.new(list(reversed(bot))); bm.faces.new(top)
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((bot[i], bot[j], top[j], top[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    return ob

block = box_obj('HollowBlock', -L / 2, L / 2, -D / 2, D / 2, 0, H)
cores = [
    rounded_prism('CoreCutterL', -L / 2 + TE, -TW / 2, -D / 2 + TF, D / 2 - TF, -0.02, H + 0.02, RC),
    rounded_prism('CoreCutterR', TW / 2, L / 2 - TE, -D / 2 + TF, D / 2 - TF, -0.02, H + 0.02, RC),
]
bpy.context.view_layer.objects.active = block
for c in cores:
    m = block.modifiers.new('core', 'BOOLEAN')
    m.operation = 'DIFFERENCE'; m.solver = 'EXACT'; m.object = c
    bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.data.objects.remove(c, do_unlink=True)

# smooth shading + bevel with hardened normals + weighted normals: soft physical edges, flat faces stay flat
for p in block.data.polygons:
    p.use_smooth = True
bv = block.modifiers.new('bevel', 'BEVEL')
bv.width = BEV; bv.segments = 3; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(40)
bv.profile = 0.6
try:
    bv.harden_normals = True
except Exception:
    pass
bpy.ops.object.modifier_apply(modifier=bv.name)
wn = block.modifiers.new('weighted', 'WEIGHTED_NORMAL')
wn.keep_sharp = True; wn.mode = 'FACE_AREA'; wn.weight = 100
bpy.ops.object.modifier_apply(modifier=wn.name)
me = block.data
print('[block3d] block mesh:', len(me.vertices), 'verts,', len(me.polygons), 'faces')

# ---------------------------------------------------------------- UVs
# UVMap: world-scale box projection for the tiling concrete (one tile = TILE metres). Each face is projected on its
# dominant axis; the tile offset drifts with the face's own position, so the outside face and the core face that
# look the same way never show the same patch, while a bevel strip continues its neighbour.
me.uv_layers.new(name='UVMap')
me.uv_layers.new(name='AO')
bm = bmesh.new(); bm.from_mesh(me)
uvl = bm.loops.layers.uv['UVMap']
for f in bm.faces:
    n = f.normal; c = f.calc_center_median(); ax = max(range(3), key=lambda i: abs(n[i]))
    if ax == 2:   # top / bottom
        k = (c.z * 5.3 + 0.17, c.z * 3.1 + 0.61)
        get = lambda v: (v.co.x if n.z > 0 else -v.co.x, v.co.y)
    elif ax == 1:  # front / back faces
        k = (c.y * 4.7 + 0.33, c.y * 2.9 + 0.08)
        get = lambda v: (v.co.x if n.y < 0 else -v.co.x, v.co.z)
    else:          # ends
        k = (c.x * 4.1 + 0.52, c.x * 3.7 + 0.29)
        get = lambda v: (-v.co.y if n.x < 0 else v.co.y, v.co.z)
    for lp in f.loops:
        u, v = get(lp.vert)
        lp[uvl].uv = (u / TILE + k[0], v / TILE + k[1])
bm.to_mesh(me); bm.free()

# AO: unique, non-overlapping layout for the baked occlusion
me.uv_layers.active = me.uv_layers['AO']
bpy.ops.object.select_all(action='DESELECT'); block.select_set(True); bpy.context.view_layer.objects.active = block
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(50), island_margin=0.006, correct_aspect=True, scale_to_bounds=False)
try:
    bpy.ops.uv.pack_islands(margin=0.006, rotate=True)
except TypeError:
    bpy.ops.uv.pack_islands(margin=0.006)
bpy.ops.object.mode_set(mode='OBJECT')
me.uv_layers.active = me.uv_layers['UVMap']
try:
    me.uv_layers['UVMap'].active_render = True
except Exception:
    pass

# ---------------------------------------------------------------- concrete maps (procedural, periodic)
def pnoise(rng, N, beta):
    w = rng.standard_normal((N, N))
    F = np.fft.rfft2(w)
    fy = np.fft.fftfreq(N)[:, None]; fx = np.fft.rfftfreq(N)[None, :]
    f = np.sqrt(fx * fx + fy * fy); f[0, 0] = 1
    F *= f ** (-beta); F[0, 0] = 0
    o = np.fft.irfft2(F, s=(N, N))
    return (o - o.mean()) / (o.std() + 1e-9)

def concrete_maps(N=NTEX, seed=7):
    rng = np.random.default_rng(seed)
    px_mm = N / (TILE * 1000)                       # texels per millimetre
    # cement paste: warm neutral grey with soft mottling
    base = np.array([0.655, 0.648, 0.628])
    mott = 0.022 * pnoise(rng, N, 1.6) + 0.014 * pnoise(rng, N, 0.9)
    alb = np.empty((N, N, 3)); alb[:] = base
    alb *= (1 + mott)[..., None]
    fine = pnoise(rng, N, 0.15)                      # per-texel sandy speckle
    alb *= (1 + 0.045 * fine)[..., None]
    grit = pnoise(rng, N, 0.45)                      # grain-scale relief of the paste itself
    hgt = 0.06 * pnoise(rng, N, 1.4) + 0.045 * grit + 0.015 * fine  # millimetres
    rough = 0.885 + 0.03 * pnoise(rng, N, 1.0)

    def stamp(cx, cy, r, aspect, ang, irr, fn):
        R = int(math.ceil(r * max(aspect, 1 / aspect) * (1 + irr) + 2))
        xs = np.arange(int(cx) - R, int(cx) + R + 1); ys = np.arange(int(cy) - R, int(cy) + R + 1)
        X, Y = np.meshgrid(xs + 0.5 - cx, ys + 0.5 - cy)
        ca, sa = math.cos(ang), math.sin(ang)
        u = (X * ca + Y * sa); v = (-X * sa + Y * ca) * aspect
        th = np.arctan2(v, u); ph = rng.uniform(0, 6.3, 3)
        rr = r * (1 + irr * (0.55 * np.sin(2 * th + ph[0]) + 0.3 * np.sin(3 * th + ph[1]) + 0.15 * np.sin(5 * th + ph[2])))
        d = np.sqrt(u * u + v * v) / rr
        m = np.clip((1 - d) * rr / 1.1, 0, 1)        # ~1 texel anti-aliased edge
        if m.max() <= 0:
            return
        ix = np.ix_(ys % N, xs % N)
        fn(ix, m, np.clip(d, 0, 1))

    # A machine-pressed block has an open, gritty face: the paste only half closes around a dense packing of sand
    # and fine stone, so grains touch everywhere and small pores sit between them. Grains are coated to varying
    # degrees, so their tone stays close to the paste (speckle, not dots); their relief is what catches the light.
    def grain(ix, m, d, col, cover, lift):
        a = (m * cover)[..., None]
        alb[ix] = alb[ix] * (1 - a) + col * a
        prof = np.sqrt(np.clip(1 - d * d, 0, 1))
        hgt[ix] = np.maximum(hgt[ix], hgt[ix] * (1 - m) + m * (lift * prof))
    k = 1.0
    for _ in range(int(380 * k)):                    # 2-4.5 mm stone: basalt greys, mostly under a skin of paste
        r = rng.uniform(1.0, 2.2) * px_mm; g = rng.uniform(0.44, 0.56); warm = rng.uniform(-0.01, 0.015)
        col = np.array([g + warm, g + warm * 0.4, g - warm * 0.5])
        stamp(rng.uniform(0, N), rng.uniform(0, N), r, rng.uniform(0.7, 1.35), rng.uniform(0, 3.14), 0.18,
              lambda ix, m, d, col=col: grain(ix, m, d, col, rng.uniform(0.12, 0.35), rng.uniform(0.12, 0.22)))
    for _ in range(int(34000 * k)):                  # 0.25-1.2 mm sand, packed edge to edge
        r = rng.uniform(0.13, 0.6) * px_mm
        g = rng.choice([rng.uniform(0.47, 0.58), rng.uniform(0.66, 0.76), rng.uniform(0.58, 0.67)], p=[0.3, 0.25, 0.45])
        col = np.array([g, g * 0.992, g * 0.972])
        stamp(rng.uniform(0, N), rng.uniform(0, N), r, rng.uniform(0.75, 1.3), rng.uniform(0, 3.14), 0.14,
              lambda ix, m, d, col=col: grain(ix, m, d, col, rng.uniform(0.3, 0.75), rng.uniform(0.05, 0.12)))

    # pores and small voids between the grains
    def pore(ix, m, d, depth, dark):
        prof = np.sqrt(np.clip(1 - d * d, 0, 1))
        hgt[ix] -= m * depth * prof
        alb[ix] *= (1 - dark * m * (0.5 + 0.5 * prof))[..., None]
        rough[ix] = np.maximum(rough[ix], 0.96 * m + rough[ix] * (1 - m))
    for _ in range(int(16000 * k)):
        r = rng.uniform(0.07, 0.26) * px_mm
        stamp(rng.uniform(0, N), rng.uniform(0, N), r, rng.uniform(0.7, 1.4), rng.uniform(0, 3.14), 0.25,
              lambda ix, m, d: pore(ix, m, d, rng.uniform(0.12, 0.25), rng.uniform(0.12, 0.3)))
    for _ in range(int(1400 * k)):
        r = rng.uniform(0.26, 0.6) * px_mm
        stamp(rng.uniform(0, N), rng.uniform(0, N), r, rng.uniform(0.6, 1.6), rng.uniform(0, 3.14), 0.32,
              lambda ix, m, d: pore(ix, m, d, rng.uniform(0.25, 0.5), rng.uniform(0.25, 0.42)))
    for _ in range(int(70 * k)):
        r = rng.uniform(0.6, 1.2) * px_mm
        stamp(rng.uniform(0, N), rng.uniform(0, N), r, rng.uniform(0.6, 1.6), rng.uniform(0, 3.14), 0.35,
              lambda ix, m, d: pore(ix, m, d, rng.uniform(0.45, 0.8), rng.uniform(0.35, 0.5)))

    # micro cavity shading from the height field (dirt settles in low spots), very light
    blur = (np.roll(hgt, 2, 0) + np.roll(hgt, -2, 0) + np.roll(hgt, 2, 1) + np.roll(hgt, -2, 1)) / 4
    cav = np.clip((blur - hgt) * 1.4, -0.06, 0.12)
    alb *= (1 - cav)[..., None]
    alb = np.clip(alb, 0, 1)

    # tangent-space normal (OpenGL, +Y = +V); image rows run bottom to top in Blender, so axis 0 is +V
    px = 1.0 / px_mm   # mm per texel
    dx = (np.roll(hgt, -1, 1) - np.roll(hgt, 1, 1)) / (2 * px)
    dy = (np.roll(hgt, -1, 0) - np.roll(hgt, 1, 0)) / (2 * px)
    s = 2.0
    nrm = np.dstack([-dx * s, -dy * s, np.ones_like(hgt)])
    nrm /= np.linalg.norm(nrm, axis=2, keepdims=True)
    nrm = nrm * 0.5 + 0.5
    rough = np.clip(rough, 0.6, 1)
    return alb, nrm, rough

def save_img(name, arr, colorspace):
    N = arr.shape[0]
    if arr.ndim == 2:
        arr = np.dstack([arr, arr, arr])
    rgba = np.ones((N, N, 4), dtype=np.float32); rgba[..., :3] = arr
    img = bpy.data.images.new(name, N, N, alpha=False)
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = os.path.join(TEX, name + '.png'); img.file_format = 'PNG'; img.save()
    img.colorspace_settings.name = colorspace
    return img

alb, nrm, rgh = concrete_maps()
img_col = save_img('concrete_albedo', alb, 'sRGB')
img_nrm = save_img('concrete_normal', nrm, 'Non-Color')
img_rgh = save_img('concrete_roughness', rgh, 'Non-Color')
img_ao = bpy.data.images.new('block_ao', 1024, 1024, alpha=False)
img_ao.colorspace_settings.name = 'Non-Color'
print('[block3d] textures done')

# ---------------------------------------------------------------- material
def gltf_output_group():
    g = bpy.data.node_groups.get('glTF Material Output')
    if g: return g
    g = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
    g.interface.new_socket('Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
    g.nodes.new('NodeGroupInput')
    return g

mat = bpy.data.materials.new('Concrete')
try: mat.use_nodes = True
except Exception: pass
nt = mat.node_tree; N_ = nt.nodes; Lk = nt.links
P = next(n for n in N_ if n.type == 'BSDF_PRINCIPLED')
P.inputs['Metallic'].default_value = 0.0
uv0 = N_.new('ShaderNodeUVMap'); uv0.uv_map = 'UVMap'; uv0.location = (-900, 0)
uv1 = N_.new('ShaderNodeUVMap'); uv1.uv_map = 'AO'; uv1.location = (-900, -500)
def tex(img, y, cs):
    t = N_.new('ShaderNodeTexImage'); t.image = img; t.location = (-600, y); t.interpolation = 'Linear'
    return t
tc = tex(img_col, 300, 'sRGB'); tr = tex(img_rgh, 0, 'Non-Color'); tn = tex(img_nrm, -260, 'Non-Color'); ta = tex(img_ao, -560, 'Non-Color')
for t in (tc, tr, tn): Lk.new(uv0.outputs['UV'], t.inputs['Vector'])
Lk.new(uv1.outputs['UV'], ta.inputs['Vector'])
Lk.new(tc.outputs['Color'], P.inputs['Base Color'])
Lk.new(tr.outputs['Color'], P.inputs['Roughness'])
nm = N_.new('ShaderNodeNormalMap'); nm.uv_map = 'UVMap'; nm.location = (-300, -260)
Lk.new(tn.outputs['Color'], nm.inputs['Color']); Lk.new(nm.outputs['Normal'], P.inputs['Normal'])
go = N_.new('ShaderNodeGroup'); go.node_tree = gltf_output_group(); go.location = (0, -560)
Lk.new(ta.outputs['Color'], go.inputs['Occlusion'])
block.data.materials.clear()   # the boolean leaves an empty slot behind
block.data.materials.append(mat)
for p in block.data.polygons: p.material_index = 0

# ---------------------------------------------------------------- hierarchy + anatomy anchors (exported as glTF nodes)
root = bpy.data.objects.new('HollowConcreteBlock', None); scene.collection.objects.link(root)
block.parent = root
# three.js coordinates -> Blender: (x, y, z) -> (x, -z, y)
ANCHORS = {
    'anchor_wall_thickness': (-L / 2 + TE * 0.5, H, D / 2 - TF * 1.6),       # top of the left end wall, near the front
    'anchor_core':           (-L / 4 - TW / 4 + 0.006, H * 0.86, -D / 2 + TF + 0.0005),  # inside the left core: the visible upper part of its far wall
    'anchor_web':            (0.0, H, -0.012),                                # top of the web
    'anchor_end_wall':       (L / 2, H * 0.6, -0.008),                        # the right end face
}
for name, p3 in ANCHORS.items():
    e = bpy.data.objects.new(name, None); e.empty_display_size = 0.01
    e.location = to_blender(p3); e.parent = root; scene.collection.objects.link(e)

# ---------------------------------------------------------------- studio: floor, lights, world
floor = box_obj('StudioFloor', -2, 2, -2, 2, -0.002, 0.0)
fm = bpy.data.materials.new('Floor')
try: fm.use_nodes = True
except Exception: pass
fp = next(n for n in fm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
fp.inputs['Base Color'].default_value = (0.82, 0.81, 0.8, 1); fp.inputs['Roughness'].default_value = 0.6
floor.data.materials.append(fm)

def area(name, loc, size, energy, color=(1, 1, 1), sx=None, shadow=True):
    ld = bpy.data.lights.new(name, 'AREA'); ld.shape = 'RECTANGLE'; ld.size = size; ld.size_y = sx or size * 0.75
    ld.energy = energy; ld.color = color
    try: ld.use_shadow = shadow
    except Exception: pass
    ob = bpy.data.objects.new(name, ld); scene.collection.objects.link(ob)
    ob.location = loc
    d = Vector((0, 0, 0.06)) - ob.location
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return ob
# key: big softbox above, front-left; fill: opposite side; rim: behind, right
area('Key', (-0.7, -0.6, 1.75), 1.9, 34, (1.0, 0.985, 0.965))
area('Fill', (1.55, -0.95, 0.7), 2.0, 7, (0.97, 0.98, 1.0), shadow=False)
area('Rim', (0.55, 1.35, 0.85), 0.9, 9, shadow=False)
world = bpy.data.worlds.new('Studio'); scene.world = world
try: world.use_nodes = True
except Exception: pass
bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
bg.inputs['Color'].default_value = (0.93, 0.93, 0.94, 1); bg.inputs['Strength'].default_value = 0.22

scene.view_settings.view_transform = 'AgX'
try: scene.view_settings.look = 'AgX - Base Contrast'
except Exception: pass
scene.view_settings.exposure = 0.0
scene.cycles.use_denoising = True

# ---------------------------------------------------------------- bake ambient occlusion into UV "AO"
bake_node = N_.new('ShaderNodeTexImage'); bake_node.image = img_ao; bake_node.location = (-600, -820)
for n in N_: n.select = False
bake_node.select = True; N_.active = bake_node
me.uv_layers.active = me.uv_layers['AO']
bpy.ops.object.select_all(action='DESELECT'); block.select_set(True); bpy.context.view_layer.objects.active = block
scene.cycles.samples = 96 if QUICK else 512
scene.render.bake.margin = 12
try: scene.world.light_settings.distance = 0.12
except Exception: pass
bpy.ops.object.bake(type='AO')
# AO is used for ambient light only: keep the contrast physical but never black
ao = np.array(img_ao.pixels[:], dtype=np.float32).reshape(1024, 1024, 4)
ao[..., :3] = 0.18 + 0.82 * ao[..., :3]
img_ao.pixels.foreach_set(ao.ravel())
img_ao.filepath_raw = os.path.join(TEX, 'block_ao.png'); img_ao.file_format = 'PNG'; img_ao.save()
N_.remove(bake_node)
me.uv_layers.active = me.uv_layers['UVMap']
print('[block3d] AO baked')

# ---------------------------------------------------------------- export GLB (block + anchors only)
bpy.ops.object.select_all(action='DESELECT')
for ob in [root, block] + [o for o in root.children if o.name.startswith('anchor_')]:
    ob.select_set(True)
bpy.context.view_layer.objects.active = root
opts = dict(filepath=GLB, export_format='GLB', use_selection=True, export_apply=True, export_texcoords=True,
            export_normals=True, export_tangents=True, export_materials='EXPORT', export_yup=True,
            export_cameras=False, export_lights=False, export_image_format='WEBP', export_image_quality=80)
for drop in ([], ['export_image_quality'], ['export_image_quality', 'export_image_format']):
    try:
        bpy.ops.export_scene.gltf(**{k: v for k, v in opts.items() if k not in drop}); break
    except TypeError as e:
        print('[block3d] gltf option retry', e)
print('[block3d] GLB', os.path.getsize(GLB), 'bytes')

# ---------------------------------------------------------------- renders: shadow texture + posters
# Path tracing has no grazing realtime key to pick out the grain, so the stills get a stronger relief than the GLB
nm.inputs['Strength'].default_value = 1.8
floor.is_shadow_catcher = True
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.color_depth = '16'

def corners3():
    return [(x, y, z) for x in (-L / 2, L / 2) for y in (0, H) for z in (-D / 2, D / 2)]

meta = {'L': L, 'D': D, 'H': H, 'cams': {}, 'posters': {}, 'anchors': ANCHORS}

# (1) floor shadow, seen from straight above; the block itself is hidden from the camera but still casts
SH_C, SH_S = (0.06, 0.05), 0.9      # three.js (x, z) centre and side of the shadow square
top = bpy.data.cameras.new('ShadowCam'); top.type = 'ORTHO'; top.ortho_scale = SH_S
tco = bpy.data.objects.new('ShadowCam', top); scene.collection.objects.link(tco)
tco.location = to_blender((SH_C[0], 2.0, SH_C[1])); tco.rotation_euler = (0, 0, 0)
scene.camera = tco
block.visible_camera = False
scene.render.resolution_x = scene.render.resolution_y = 512 if QUICK else 1024
scene.cycles.samples = 64 if QUICK else 384
scene.render.filepath = os.path.join(OUT, 'shadow.png')
bpy.ops.render.render(write_still=True)
block.visible_camera = True
meta['shadow'] = {'center': SH_C, 'size': SH_S}
print('[block3d] shadow rendered')

# (2) posters: one per camera rig, framed on the block with room for its shadow
for key, c in CAMS.items():
    C3 = cam_pos3(c)
    us, vs = [], []
    for p in corners3():
        dz = C3[2] - p[2]
        us.append((p[0] - C3[0]) / dz); vs.append((p[1] - C3[1]) / dz)
    u0, u1, v0, v1 = min(us), max(us), min(vs), max(vs); bw = u1 - u0
    U0, U1, V0, V1 = u0 - 0.08 * bw, u1 + 0.30 * bw, v0 - 0.24 * bw, v1 + 0.06 * bw
    W_u, W_v = U1 - U0, V1 - V0
    cam = bpy.data.cameras.new('Cam_' + key); cam.sensor_fit = 'HORIZONTAL'; cam.sensor_width = 36
    cam.lens = 36 / W_u
    cam.shift_x = ((U0 + U1) / 2) / W_u
    cam.shift_y = ((V0 + V1) / 2) / W_u
    co = bpy.data.objects.new('Cam_' + key, cam); scene.collection.objects.link(co)
    co.location = to_blender(C3); co.rotation_euler = (math.radians(90), 0, 0)
    scene.camera = co
    rw = 1200 if QUICK else 2400
    scene.render.resolution_x = rw; scene.render.resolution_y = int(round(rw * W_v / W_u))
    scene.render.resolution_percentage = 100
    scene.cycles.samples = 96 if QUICK else 640
    scene.render.filepath = os.path.join(OUT, 'poster-' + key + '.png')
    bpy.ops.render.render(write_still=True)
    meta['cams'][key] = {'pos': C3, **c}
    meta['posters'][key] = {'w': scene.render.resolution_x, 'h': scene.render.resolution_y,
                            # block bbox inside the poster, fractions from the top-left
                            'bbox': [(u0 - U0) / W_u, (V1 - v1) / W_v, (u1 - U0) / W_u, (V1 - v0) / W_v],
                            'uv': [U0, V0, U1, V1]}
    print('[block3d] poster', key, scene.render.resolution_x, 'x', scene.render.resolution_y)

floor.is_shadow_catcher = False
with open(os.path.join(OUT, 'meta.json'), 'w') as fh:
    json.dump(meta, fh, indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'hollow-concrete-block.blend'))
print('[block3d] done')
