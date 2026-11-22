"""OM GROUP - Hot Mix Asphalt page: shared Blender helpers for the two premium stills (JMF panel, drum-mix plant).
exec'd by build-jmf.py / build-drum.py.  Units are metres, Z up, camera looks along +Y."""
import bpy, bmesh, math, json, os, sys, random
from mathutils import Vector, Matrix, noise
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ROOT = os.path.abspath(argv[0] if argv else os.getcwd()); QUICK = '--quick' in argv
OUT = os.path.join(ROOT, '_review', 'hma3d'); os.makedirs(OUT, exist_ok=True)

def setup_scene(W, H, samples):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene; sc.unit_settings.system = 'METRIC'; sc.render.engine = 'CYCLES'
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        for kind in ('OPTIX', 'CUDA'):
            try: prefs.compute_device_type = kind
            except Exception: continue
            prefs.get_devices(); devs = [d for d in prefs.devices if d.type == kind]
            if devs:
                for d in prefs.devices: d.use = d.type == kind
                sc.cycles.device = 'GPU'; print('[hma3d] device', kind); break
    except Exception as e: print('[hma3d] gpu fail', e)
    q = .25 if QUICK else (.5 if '--half' in argv else 1)
    sc.render.resolution_x = int(W * q); sc.render.resolution_y = int(H * q); sc.render.resolution_percentage = 100
    sc.cycles.samples = 48 if QUICK else (96 if '--half' in argv else samples); sc.cycles.use_denoising = True
    try: sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception: pass
    sc.cycles.max_bounces = 8; sc.cycles.glossy_bounces = 6; sc.cycles.transmission_bounces = 4
    sc.render.film_transparent = True; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    try: sc.view_settings.view_transform = 'Khronos PBR Neutral'
    except Exception: sc.view_settings.view_transform = 'AgX'
    return sc

# ------------------------------------------------------------------ materials
def mat(name, base=(.5, .5, .5), metal=0., rough=.5, coat=0., emit=None, estr=0., spec=.5):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*base, 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    for k, v in (('Coat Weight', coat), ('Specular IOR Level', spec)):
        if k in b.inputs: b.inputs[k].default_value = v
    if emit is not None:
        b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = estr
    return m
def bump(m, scale=60, strength=.15, detail=8):
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = strength
    nt.links.new(n.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal']); return m
def rough_var(m, lo, hi, scale=14):
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = 6
    r = nt.nodes.new('ShaderNodeMapRange'); r.inputs['To Min'].default_value = lo; r.inputs['To Max'].default_value = hi
    nt.links.new(n.outputs['Fac'], r.inputs['Value']); nt.links.new(r.outputs['Result'], b.inputs['Roughness'])
def stone_mat(name, lo, hi, rough=.62, tint=(1, 1, 1), bscale=90, bstr=.35):
    """per-object random grey (Object Info > Random) so every stone in a pile reads differently"""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    oi = nt.nodes.new('ShaderNodeObjectInfo'); cr = nt.nodes.new('ShaderNodeValToRGB')
    cr.color_ramp.elements[0].color = (*[c * lo for c in tint], 1); cr.color_ramp.elements[1].color = (*[c * hi for c in tint], 1)
    nt.links.new(oi.outputs['Random'], cr.inputs['Fac'])
    vor = nt.nodes.new('ShaderNodeTexNoise'); vor.inputs['Scale'].default_value = 38; vor.inputs['Detail'].default_value = 10
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = .55
    nt.links.new(cr.outputs['Color'], mix.inputs['A']); nt.links.new(vor.outputs['Color'], mix.inputs['B'])
    nt.links.new(mix.outputs['Result'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = rough
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bstr
    n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = bscale; n2.inputs['Detail'].default_value = 12
    nt.links.new(n2.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], b.inputs['Normal']); return m

# ------------------------------------------------------------------ geometry
def link(o, coll=None): (coll or bpy.context.scene.collection).objects.link(o); return o
def from_bm(name, bm, m=None, smooth=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = smooth
    o = bpy.data.objects.new(name, me); link(o)
    if m: o.data.materials.append(m)
    return o
def box(name, size, loc, m=None, r=0., seg=4, rot=(0, 0, 0)):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co.x *= size[0]; v.co.y *= size[1]; v.co.z *= size[2]
    if r > 0: bmesh.ops.bevel(bm, geom=bm.edges[:], offset=r, segments=seg, affect='EDGES', profile=.5)
    o = from_bm(name, bm, m, smooth=r > 0); o.location = loc; o.rotation_euler = rot; return o
def cyl(name, r, depth, loc, rot=(0, 0, 0), m=None, verts=64, caps=True, r2=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=caps, segments=verts, radius1=r, radius2=(r if r2 is None else r2), depth=depth)
    o = from_bm(name, bm, m, smooth=True); o.location = loc; o.rotation_euler = rot; return o
def sphere(name, r, loc, m=None, scale=(1, 1, 1), seg=48):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    for v in bm.verts: v.co.x *= scale[0]; v.co.y *= scale[1]; v.co.z *= scale[2]
    o = from_bm(name, bm, m, True); o.location = loc; return o
def torus(name, R, r, loc, rot=(0, 0, 0), m=None):
    bm = bmesh.new(); bmesh.ops.create_circle(bm, segments=1, radius=1)   # placeholder to keep bmesh warm
    bm.clear()
    seg, rs = 72, 20
    verts = [[bm.verts.new(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b))) for b in [2 * math.pi * j / rs for j in range(rs)]] for a in [2 * math.pi * i / seg for i in range(seg)]]
    for i in range(seg):
        for j in range(rs): bm.faces.new((verts[i][j], verts[(i + 1) % seg][j], verts[(i + 1) % seg][(j + 1) % rs], verts[i][(j + 1) % rs]))
    o = from_bm(name, bm, m, True); o.location = loc; o.rotation_euler = rot; return o
def tube(name, pts, radius, m=None, res=16):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = radius; cu.bevel_resolution = 6; cu.use_fill_caps = True
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for p, c in zip(sp.points, pts): p.co = (*c, 1)
    o = bpy.data.objects.new(name, cu); link(o)
    if m: o.data.materials.append(m)
    return o
def pipe_path(pts, r, m=None, name='pipe', fillet=.0):
    return tube(name, pts, r, m)
def look_at(obj, target):
    d = Vector(target) - obj.location; obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()

def make_rock(name, seed, pts=22, flat=.78, tall=.66, bev=.085):
    """faceted angular stone: convex hull of jittered points on an ellipsoid, chipped edges"""
    rng = random.Random(seed); bm = bmesh.new()
    for _ in range(pts):
        v = Vector((rng.gauss(0, 1), rng.gauss(0, 1), rng.gauss(0, 1))).normalized() * rng.uniform(.78, 1.02)
        bm.verts.new((v.x, v.y * flat, v.z * tall))
    ret = bmesh.ops.convex_hull(bm, input=bm.verts[:])
    bmesh.ops.delete(bm, geom=list({g for g in ret['geom_interior'] + ret['geom_unused'] if isinstance(g, bmesh.types.BMVert)}), context='VERTS')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bmesh.ops.dissolve_degenerate(bm, dist=.002, edges=bm.edges[:])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    # centre + normalise so every stone is a unit-ish lump regardless of the random points
    c = sum((v.co for v in bm.verts), Vector()) / len(bm.verts); mx = max((v.co - c).length for v in bm.verts)
    for v in bm.verts: v.co = (v.co - c) / mx
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=.01)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = False
    return me

def heap(name, kind, center, R, H, count, size, m_stone, base_mat, seed=1, rocks=None, ellipse=1.0, dome=1.0):
    """a heap of angular stones: solid underlay cone + stones scattered over (and just under) its surface"""
    rng = random.Random(seed); cx, cy, cz = center
    # underlay cone, slightly smaller so only a rind of stones shows
    bm = bmesh.new(); N = 48; prof = lambda t: H * (1 - t ** 1.7) ** 0.95 if dome else H * (1 - t)
    rings = [(0.0, prof(0.0) * .94)] + [(t * R * .96, prof(t) * .9) for t in [i / 14 for i in range(1, 15)]]
    vs = []
    for (rr, zz) in rings:
        vs.append([bm.verts.new((cx + rr * math.cos(2 * math.pi * k / N) * ellipse, cy + rr * math.sin(2 * math.pi * k / N), cz + zz)) for k in range(N)] if rr > 0 else [bm.verts.new((cx, cy, cz + zz))])
    for i in range(1, len(vs)):
        a, b = vs[i - 1], vs[i]
        for k in range(N):
            if len(a) == 1: bm.faces.new((a[0], b[(k + 1) % N], b[k]))
            else: bm.faces.new((a[k], a[(k + 1) % N], b[(k + 1) % N], b[k]))
    bmesh.ops.contextual_create(bm, geom=[v for v in vs[-1]]) if False else None
    under = from_bm(name + '_under', bm, base_mat, True)
    out = [under]
    rocks = rocks or [make_rock('rk%d_%s' % (i, name), seed * 10 + i) for i in range(5)]
    for i in range(count):
        u = rng.random(); t = math.sqrt(u) * 0.99; a = rng.uniform(0, 2 * math.pi)
        z = prof(t) - rng.uniform(0, size * .9)
        if z < -size * .2: z = size * .1
        s = size * rng.uniform(.65, 1.35)
        o = bpy.data.objects.new('%s_%d' % (name, i), rng.choice(rocks)); link(o); o.data.materials.clear() if False else None
        if not o.data.materials: o.data.materials.append(m_stone)
        o.location = (cx + t * R * math.cos(a) * ellipse, cy + t * R * math.sin(a), cz + max(z, 0) + s * .25)
        o.rotation_euler = (rng.uniform(0, 6.28), rng.uniform(0, 6.28), rng.uniform(0, 6.28)); o.scale = (s, s * rng.uniform(.85, 1.15), s * rng.uniform(.85, 1.1)); out.append(o)
    return out

def soft_heap(name, center, R, H, m, seed=2, amp=.05, freq=7, grid=160, sharp=1.6):
    """smooth powder / paste heap: height field with fractal noise"""
    cx, cy, cz = center; bm = bmesh.new(); n = grid
    vs = []
    for j in range(n + 1):
        row = []
        for i in range(n + 1):
            x = (i / n * 2 - 1) * R * 1.25; y = (j / n * 2 - 1) * R * 1.25; r = math.hypot(x, y) / R
            z = H * max(0, 1 - r ** sharp) ** .85 if r < 1 else 0
            z += amp * noise.fractal(Vector((x * freq, y * freq, seed)), .5, 2.0, 5) * (1 if z > 0 else 0) * min(1, z / (H * .25 + 1e-6))
            row.append(bm.verts.new((cx + x, cy + y, cz + max(z, 0))))
        vs.append(row)
    for j in range(n):
        for i in range(n): bm.faces.new((vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]))
    return from_bm(name, bm, m, True)

def area_light(name, loc, target, energy, size, color=(1, 1, 1), shape='RECTANGLE', sy=None):
    ld = bpy.data.lights.new(name, 'AREA'); ld.energy = energy; ld.size = size; ld.shape = shape
    if sy: ld.size_y = sy
    ld.color = color; o = bpy.data.objects.new(name, ld); link(o); o.location = loc; look_at(o, target); return o

def world_studio(strength=.9, top=(.95, .94, .92), bottom=(.62, .62, .64)):
    w = bpy.data.worlds.new('W'); w.use_nodes = True; nt = w.node_tree; bgn = nt.nodes['Background']
    tc = nt.nodes.new('ShaderNodeTexCoord'); g = nt.nodes.new('ShaderNodeTexGradient'); g.gradient_type = 'LINEAR'
    mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Rotation'].default_value = (0, math.radians(-90), 0)
    cr = nt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].color = (*bottom, 1); cr.color_ramp.elements[1].color = (*top, 1)
    nt.links.new(tc.outputs['Generated'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], g.inputs['Vector']); nt.links.new(g.outputs['Fac'], cr.inputs['Fac'])
    nt.links.new(cr.outputs['Color'], bgn.inputs['Color']); bgn.inputs['Strength'].default_value = strength
    bpy.context.scene.world = w

def camera(loc, target, lens, shift=(0, 0)):
    cd = bpy.data.cameras.new('cam'); cd.lens = lens; cd.sensor_width = 36; cd.shift_x, cd.shift_y = shift
    co = bpy.data.objects.new('cam', cd); link(co); co.location = loc; look_at(co, target); bpy.context.scene.camera = co; return co

def project(co, pts):
    sc = bpy.context.scene; out = {}; bpy.context.view_layer.update()
    for k, p in pts.items():
        v = world_to_camera_view(sc, co, Vector(p)); out[k] = [round(v.x, 4), round(1 - v.y, 4)]
    return out

def shadow_floor(size=60, z=0):
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=2, y_segments=2, size=size)
    o = from_bm('floor', bm, mat('floor', (.9, .9, .9), 0, .9), False); o.location = (0, 0, z); o.is_shadow_catcher = True; return o

def render(path):
    sc = bpy.context.scene; sc.render.filepath = path; bpy.ops.render.render(write_still=True)
