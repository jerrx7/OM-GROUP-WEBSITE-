"""OM GROUP - Wet Mix Macadam page: the road-works widgets as photoreal Blender stills (Cycles, OptiX).

  STAGE=transport|spread|roll|check|seg0|seg1|edge|thin0|thin1|... blender -b --factory-startup -P scripts/wmm3d/build-road.py -- <repo root> [--quick]

Outputs _review/wmm3d/<STAGE>.png (opaque, 2 : 1) and _review/wmm3d/<STAGE>.json (normalised anchor points for the page overlay).
Uses the repo's own Blender-built machine models (assets/3d/om-group-{roller,paver,tipper}.glb; generic machines, not any particular OM GROUP unit)
and the texture / rock helpers of scripts/wsand3d. 1 unit = 1 m. A model of a road strip, not a pavement design: thicknesses are not specification values.
"""
import sys, os
_root_ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_src = open(os.path.join(_root_, 'scripts', 'wsand3d', 'build-wsand.py'), encoding='utf8').read()
exec(compile(_src[:_src.index('# =========================================================================================== WASHING')], 'prelude', 'exec'))
_s2 = open(os.path.join(_root_, 'scripts', 'wsand3d', 'build-wsand2.py'), encoding='utf8').read()
exec(compile(_s2[_s2.index('import zlib'):_s2.index('# ------------------------------------------------------------------ scenes') if '# ------------------------------------------------------------------ scenes' in _s2 else _s2.index('HZ = .17')], 'helpers2', 'exec'))

OUT = os.path.join(ROOT, '_review', 'wmm3d'); os.makedirs(OUT, exist_ok=True); TEX = os.path.join(OUT, 'tex'); os.makedirs(TEX, exist_ok=True)
STAGE = os.environ.get('STAGE', 'spread'); SAMPLES = int(os.environ.get('SAMPLES', '24' if QUICK else '160'))
ASPECT = 2.0
GLB = lambda n: os.path.join(ROOT, 'assets', '3d', 'om-group-%s.glb' % n)

# strip geometry (metres): subgrade, GSB, WMM (compacted / loose)
X0, X1, ZH = -17.0, 17.0, 3.7
SUB, GSB, WC, WL = .60, .52, .44, .58
Y_SUB, Y_GSB = SUB, SUB + GSB; Y_WC, Y_WL = Y_GSB + WC, Y_GSB + WL

# ------------------------------------------------------------------ materials
def M_laterite(): return mat_pbr('Laterite', speckle_maps(NS, 31, (.40, .165, .095), [(.52, .22, .11), (.34, .13, .075), (.60, .38, .26), (.22, .09, .055), (.66, .5, .38)], 30000, (2.2, 6.5), (.3, 1.0), .2, big=(90, 7, 16, [(.5, .2, .1), (.3, .12, .07), (.62, .34, .2)]), tone=.14, rough=(.9, .05)), 1.0, .3)
def M_gsb(): return mat_pbr('GSB', speckle_maps(NS, 41, (.50, .47, .41), [(.72, .69, .62), (.36, .34, .31), (.58, .5, .4), (.82, .78, .7), (.28, .26, .24)], 36000, (2.0, 6.0), (.3, 1.0), .2, big=(120, 8, 22, [(.55, .53, .5), (.38, .37, .36), (.66, .6, .5)]), tone=.12, rough=(.9, .05)), 1.0, .3)
def M_wmm(wet=0.0):
    d = 1 - .28 * wet
    return mat_pbr('WMM%d' % int(wet * 10), speckle_maps(NS, 51, (.27 * d, .265 * d, .255 * d), [(.5 * d, .49 * d, .47 * d), (.2 * d, .2 * d, .2 * d), (.64 * d, .62 * d, .59 * d), (.12 * d, .12 * d, .12 * d), (.43 * d, .41 * d, .38 * d)], 40000, (1.8, 5.2), (.3, 1.0), .22, big=(150, 9, 26, [(.52 * d, .51 * d, .5 * d), (.34 * d, .34 * d, .34 * d), (.66 * d, .64 * d, .6 * d), (.24 * d, .24 * d, .24 * d)]), tone=.14, rough=(.9 - .3 * wet, .05)), 1.2, .3)
def M_ground(): return mat_pbr('Ground', speckle_maps(NS, 61, (.30, .20, .12), [(.42, .28, .16), (.24, .15, .09), (.5, .4, .28), (.2, .22, .09), (.34, .3, .13)], 28000, (2.0, 7.0), (.2, .9), .12, big=(60, 7, 14, [(.46, .3, .17), (.3, .2, .12)]), tone=.2, rough=(.92, .04)), 1.0, .3)
def M_stone(i): return mat_pbr('RockM%d' % i, stone_maps(NS, 70 + i), 1.0, .4, tint=True)

# ------------------------------------------------------------------ surfaces
def grid_surface(name, x0, x1, z0, z1, nx, nz, hfun, mat, uvs=.8, smooth=True):
    bm = bmesh.new(); g = {}
    for i in range(nx + 1):
        for j in range(nz + 1):
            x = x0 + (x1 - x0) * i / nx; z = z0 + (z1 - z0) * j / nz; g[(i, j)] = bm.verts.new(V(x, hfun(x, z), z))
    for i in range(nx):
        for j in range(nz): bm.faces.new([g[(i, j)], g[(i, j + 1)], g[(i + 1, j + 1)], g[(i + 1, j)]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = new_obj(name, me); me.materials.append(mat)
    for p in me.polygons: p.use_smooth = smooth
    uv = me.uv_layers.new(name='UVMap')
    for p in me.polygons:
        for li in p.loop_indices:
            c = me.vertices[me.loops[li].vertex_index].co; uv.data[li].uv = (c.x / uvs, -c.y / uvs)
    return ob

_nz = None
def noise2(x, z, s, seed=0):
    """cheap smooth value noise (no numpy grid): sum of sines, deterministic"""
    return (math.sin(x * s * 1.3 + seed) * math.cos(z * s * .9 + seed * 1.7) + .55 * math.sin(x * s * 2.9 + z * s * 2.3 + seed * 2.1) + .3 * math.cos(x * s * 5.7 - z * s * 4.9 + seed)) / 1.85

def scatter_rocks(region, n, smin, smax, hfun, seed, mats, y_off=.0, sink=.3, prefer=None):
    """loose aggregate lying on a surface: n angular stones (x0, x1, z0, z1 region), sunk part-way into hfun(x, z)"""
    rng = random.Random(seed); meshes = [rock_mesh(900 + seed * 7 + i, mats[i % len(mats)], 'rk%d_%d' % (seed, i)) for i in range(10)]
    for k in range(n):
        x = rng.uniform(region[0], region[1]); z = rng.uniform(region[2], region[3])
        s = smin + (smax - smin) * (rng.random() ** 2.2); ob = new_obj('r%d_%d' % (seed, k), meshes[rng.randrange(len(meshes))])
        ob.scale = (s * rng.uniform(.9, 1.5), s * rng.uniform(.6, 1.0), s * rng.uniform(.8, 1.3)); ob.rotation_euler = (rng.uniform(0, 6.3), rng.uniform(0, 6.3), rng.uniform(0, 6.3))
        ob.location = V(x, hfun(x, z) + y_off - s * sink * .5, z)

# ------------------------------------------------------------------ the world: sky, sun, haze, ground
def world_outdoor(sun_elev=30, sun_rot=-35, strength=1.0):
    world = bpy.data.worlds.new('W'); scene.world = world; world.use_nodes = True
    nt = world.node_tree; nt.nodes.clear(); out = nt.nodes.new('ShaderNodeOutputWorld'); bg = nt.nodes.new('ShaderNodeBackground'); sky = nt.nodes.new('ShaderNodeTexSky')
    for t in ('MULTIPLE_SCATTERING', 'SINGLE_SCATTERING', 'NISHITA', 'HOSEK_WILKIE', 'PREETHAM'):
        try: sky.sky_type = t; break
        except Exception: continue
    for k, v in (('sun_elevation', math.radians(sun_elev)), ('sun_rotation', math.radians(sun_rot)), ('altitude', 60.0), ('air_density', .8), ('dust_density', 2.2), ('ozone_density', 1.0), ('sun_intensity', 1.0), ('sun_size', math.radians(.6)), ('sun_disc', False)):
        try: setattr(sky, k, v)
        except Exception: pass
    bg.inputs['Strength'].default_value = strength
    tint = nt.nodes.new('ShaderNodeMix'); tint.data_type = 'RGBA'; tint.blend_type = 'MULTIPLY'; tint.inputs['Factor'].default_value = 1.0; tint.inputs[7].default_value = (1.0, .93, .84, 1)
    if os.environ.get('DBG'): bg.inputs['Color'].default_value = (.5, .6, .8, 1)
    else: nt.links.new(sky.outputs['Color'], tint.inputs[6]); nt.links.new(tint.outputs[2], bg.inputs['Color'])
    print('[wmm3d] sky', sky.sky_type)
    nt.links.new(bg.outputs['Background'], out.inputs['Surface'])
    for vt, lk in (('AgX', 'AgX - Medium High Contrast'), ('AgX', 'Medium High Contrast')):
        try: scene.view_settings.view_transform = vt; scene.view_settings.look = lk; break
        except Exception: continue
    scene.cycles.samples = SAMPLES; scene.cycles.use_denoising = True; scene.render.film_transparent = False
    scene.cycles.max_bounces = 10; scene.cycles.glossy_bounces = 5; scene.cycles.transmission_bounces = 8; scene.cycles.transparent_max_bounces = 12
    try: scene.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception: pass
    scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGB'; scene.render.image_settings.color_depth = '8'

def haze(density=.0016):
    if os.environ.get('NOHAZE'): return
    """a thin atmospheric scatter so distance goes soft and blue, like a photograph"""
    w = scene.world; nt = w.node_tree; out = next(n for n in nt.nodes if n.type == 'OUTPUT_WORLD'); pv = nt.nodes.new('ShaderNodeVolumeScatter')
    pv.inputs['Density'].default_value = density; pv.inputs['Color'].default_value = (.82, .88, .97, 1); pv.inputs['Anisotropy'].default_value = .35
    nt.links.new(pv.outputs['Volume'], out.inputs['Volume'])

def terrain(cx_h=0.0):
    mat = M_ground()
    def h(x, z):
        d = max(0.0, abs(z) - ZH) ; edge = min(1.0, d / 5.0)
        return -.002 + (.05 * noise2(x, z, .55, 3) + .02 * noise2(x, z, 2.2, 8)) * edge + (.4 * max(0, d - 14) / 30) * 0
    grid_surface('Ground', -90, 90, -90, 90, 420, 420, h, mat, uvs=3.2)
    return h

def far_land():
    """a soft dark-green tree line and a low laterite hill far behind the strip, so the horizon is not an empty gradient"""
    mg = mat_plain('Foliage', (.045, .09, .03), .92, 0, 0)
    nt = mg.node_tree; P = next(x for x in nt.nodes if x.type == 'BSDF_PRINCIPLED'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 55; nz.inputs['Detail'].default_value = 8
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = .85; mx.inputs[6].default_value = (.12, .30, .08, 1)
    nt.links.new(nz.outputs['Fac'], mx.inputs[7]); nt.links.new(mx.outputs[2], P.inputs['Base Color'])
    rng = random.Random(5)
    for k in range(120):
        ang = rng.uniform(-1.1, 1.1); R = rng.uniform(70, 88); x = R * math.sin(ang) - 6 + rng.uniform(-6, 6); z = -R * math.cos(ang) - 8
        s = rng.uniform(4, 11); ob = sphere('Tree%d' % k, (x, s * .55, z), s, mg, 3, (rng.uniform(.8, 1.4), rng.uniform(.8, 1.2), rng.uniform(.8, 1.3)))
        ob.rotation_euler = (rng.uniform(0, 3), rng.uniform(0, 3), 0)

# ------------------------------------------------------------------ the road strip
class Strip:
    def __init__(self, xs, xr, loose_top=True, compacted_all=False):
        """xs: where the paver screed lays the mat (mat starts at -inf and ends at xs); xr: end of the compacted mat (to the left of xr it is compacted)"""
        self.xs, self.xr = xs, xr
        sub = M_laterite(); gsb = M_gsb(); wc = M_wmm(.35); wl = M_wmm(0.0)
        ubox('Subgrade', X0, X1, 0, Y_SUB, -ZH, ZH, sub, .004, .9)
        ubox('GSB', X0, X1, Y_SUB, Y_GSB, -ZH, ZH, gsb, .004, .6)
        self.hmat = lambda x, z: 0
        # the WMM layer as cut blocks (the cut face wears the same grain) plus displaced tops
        xs = min(xs, X1); xr_c = max(X0, min(xr, xs))
        if xr_c > X0: ubox('WMMc', X0, xr_c, Y_GSB, Y_WC, -ZH, ZH, wc, .004, .55)
        if xs > xr_c: ubox('WMMl', xr_c, xs, Y_GSB, Y_WL, -ZH, ZH, wl, .004, .55)
        # displaced tops (a very thin skin above the blocks hides the box top)
        self.top_c = None
        def hc(x, z): return Y_WC + .0015 + .004 * noise2(x, z, 6, 2) + (.003 * math.sin(z * 9) if abs(z) < ZH - .3 else 0)
        def hl(x, z):
            edge = min(1.0, (ZH - abs(z)) / .25)
            return Y_WL + .0015 + edge * (.03 * noise2(x, z, 1.7, 4) + .02 * noise2(x, z, 5.5, 9) + .008 * noise2(x, z, 17, 1))
        def hg(x, z): return Y_GSB + .0015 + .004 * noise2(x, z, 8, 5)
        self.hc, self.hl, self.hg = hc, hl, hg
        if xr_c > X0 + .2: grid_surface('TopC', X0, xr_c, -ZH, ZH, int((xr_c - X0) * 14), 110, hc, wc, .8)
        if xs > xr_c + .05: grid_surface('TopL', xr_c, xs, -ZH, ZH, max(4, int((xs - xr_c) * 20)), 150, hl, wl, .8)
        if X1 > xs + .05: grid_surface('TopG', xs, X1, -ZH, ZH, int((X1 - xs) * 12), 100, hg, gsb, .9)
    def top(self, x, z):
        return self.hc(x, z) if x < min(self.xr, self.xs) else (self.hl(x, z) if x < self.xs else self.hg(x, z))

# ------------------------------------------------------------------ machines (the repo's Blender GLB models)
def import_machine(name, loc, yaw=0.0, scale=1.0):
    before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=GLB(name)); new = [o for o in bpy.data.objects if o not in before]
    root = next(o for o in new if o.parent is None and o.type == 'EMPTY') if any(o.parent is None and o.type == 'EMPTY' for o in new) else new[0]
    root.location = V(*loc); root.rotation_euler = (0, 0, -yaw); root.scale = (scale,) * 3
    nodes = {o.name: o for o in new}; MACH.append((name, root, nodes, yaw))
    return root, nodes

def sun_light(elev=30, rot=-35, energy=3.2):
    ld = bpy.data.lights.new('Sun', 'SUN'); ld.energy = energy; ld.angle = math.radians(.8); ld.color = (1, .95, .88)
    ob = new_obj('Sun', ld); ob.rotation_euler = (math.radians(90 - elev), 0, math.radians(rot + 180))
    return ob

def camera(target, az, el, dist, lens=38, aspect=ASPECT, fstop=0.0, focus=None):
    cam = bpy.data.cameras.new('Cam'); cam.lens = lens; cam.sensor_width = 36; cam.clip_start = .1; cam.clip_end = 400
    co = new_obj('Cam', cam); scene.camera = co
    a, e = math.radians(az), math.radians(el); pos = (target[0] + dist * math.sin(a) * math.cos(e), target[1] + dist * math.sin(e), target[2] + dist * math.cos(a) * math.cos(e))
    co.location = V(*pos); co.rotation_euler = (V(*target) - co.location).to_track_quat('-Z', 'Y').to_euler()
    if fstop:
        cam.dof.use_dof = True; cam.dof.aperture_fstop = fstop; cam.dof.focus_distance = (V(*target) - co.location).length if focus is None else focus
    W = int(os.environ.get('W', '1000' if QUICK else '2000')); scene.render.resolution_x = W; scene.render.resolution_y = int(W / aspect); scene.render.resolution_percentage = 100
    return co

def finish_render(co, pts):
    gpu_on(); bpy.context.view_layer.update(); anchors = project(co, pts) if pts else {}
    if os.environ.get('ANIM'): return animate_stage(co, pts)
    scene.render.filepath = os.path.join(OUT, STAGE + '.png')
    if not os.environ.get('NORENDER'): bpy.ops.render.render(write_still=True)
    json.dump(anchors, open(os.path.join(OUT, STAGE + '.json'), 'w')); print('[wmm3d] wrote', scene.render.filepath)

# ------------------------------------------------------------------ the load in a tipper body and the tarpaulin
def bed_load(bed, mats, height=1.25, seed=11, tipped=False):
    """angular stones heaped in the body (bed frame: x 0..6.3 from the hinge, z +-1.1, floor y 0)"""
    stone = M_wmm(.1)
    L = heap('Load', 3.15, 0, 3.0, height, stone, .7, n=170, seed=seed, base=.55, wob=.05)
    L.parent = bed; L.matrix_parent_inverse = bed.matrix_world.inverted()
    return L

exec(compile(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'road_env.py'), encoding='utf8').read(), 'road_env', 'exec'))
# =========================================================================================== STAGES
exec(compile(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'road_env2.py'), encoding='utf8').read(), 'road_env2', 'exec'))
exec(compile(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'road_anim.py'), encoding='utf8').read(), 'road_anim', 'exec'))
exec(compile(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'road_stages.py'), encoding='utf8').read(), 'road_stages', 'exec'))
exec(compile(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'road_stages2.py'), encoding='utf8').read(), 'road_stages2', 'exec'))
