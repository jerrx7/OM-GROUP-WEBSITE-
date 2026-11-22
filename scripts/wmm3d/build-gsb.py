"""OM GROUP - Granular Sub-base page: the load-distribution, filter-separation and drainage figures as photoreal Blender scenes (Cycles, OptiX).

  SCENE=load|filter|drain|drainoff [ANIM=1] [POSTER=1] blender -b --factory-startup -P scripts/wmm3d/build-gsb.py -- <repo root> [--quick]

  load      a cut-away pavement (surface course, base course, granular sub-base, subgrade) with a tyre rolling on it
  filter    two glass test boxes side by side: a compatible arrangement (filter layer holds the fines) and an incompatible one (fines migrate into the stone voids)
  drain     a cut section: subgrade, an open granular drainage layer under a base course with a crack; water enters at the crack, moves through the voids and leaves at an edge outlet
  drainoff  the same with the outlet closed: the water collects
Outputs _review/wmm3d/anim/lab-gsb-<scene>.mp4 (+ .json with the per-frame pin positions) or, with POSTER=1, lab-gsb-<scene>-poster.png.
Illustrations of a mechanism: thicknesses, particle sizes and flows are not specification values.
"""
import sys, os
_root_ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_lab = open(os.path.join(_root_, 'scripts', 'wmm3d', 'build-lab.py'), encoding='utf8').read()
os.environ.setdefault('SCENE', 'gsb-' + os.environ.get('GSBSCENE', 'load'))
exec(compile(_lab[:_lab.index("{'shape': scene_shape")], 'lab', 'exec'))
_road = open(os.path.join(_root_, 'scripts', 'wmm3d', 'build-road.py'), encoding='utf8').read()
exec(compile(_road[_road.index('def M_laterite'):_road.index('# ------------------------------------------------------------------ surfaces')], 'roadmats', 'exec'))
ASPECT = 2.0
GS = os.environ.get('GSBSCENE', 'load'); SC = 'gsb-' + GS
PINS = {}                                   # name -> [[x, y] per frame] written next to the video (the page moves its numbered pins and wedge with them)

def M_asphalt(): return mat_pbr('Asphalt', speckle_maps(NS, 111, (.055, .055, .06), [(.14, .14, .15), (.03, .03, .033), (.24, .235, .23), (.1, .1, .105), (.33, .32, .3)], 52000, (1.4, 4.2), (.3, 1.0), .2, big=(160, 7, 20, [(.2, .2, .2), (.08, .08, .085)]), tone=.12, rough=(.82, .06)), 1.1, .35)
def M_base(): return mat_pbr('BaseCourse', speckle_maps(NS, 121, (.2, .2, .205), [(.36, .35, .34), (.12, .12, .125), (.5, .48, .45), (.08, .08, .08), (.28, .27, .26)], 44000, (1.8, 5.2), (.3, 1.0), .22, big=(150, 8, 24, [(.4, .39, .37), (.16, .16, .16)]), tone=.14, rough=(.88, .05)), 1.2, .3)
def M_soilfine(): return mat_pbr('SoilFine2', speckle_maps(NS, 131, (.40, .30, .19), [(.52, .40, .26), (.30, .22, .14), (.6, .5, .36), (.22, .16, .1), (.66, .56, .42)], 60000, (1.0, 3.0), (.2, .9), .1, tone=.12, rough=(.95, .03)), .9, .3)

def glass_mat(name='Glass', col=(.88, .96, .94), rough=.02, ior=1.45, tint=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); gl = nt.nodes.new('ShaderNodeBsdfGlass'); gl.inputs['Color'].default_value = (*col, 1); gl.inputs['Roughness'].default_value = rough; gl.inputs['IOR'].default_value = ior
    nt.links.new(gl.outputs[0], out.inputs['Surface']); return m

def pane_mat(name='Pane', tint=(.88, .96, .93)):
    """acrylic that does not bend rays (cheap and clean): clear, with a Fresnel sheen"""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); mix = nt.nodes.new('ShaderNodeMixShader'); tr = nt.nodes.new('ShaderNodeBsdfTransparent'); gl = nt.nodes.new('ShaderNodeBsdfGlossy'); fr = nt.nodes.new('ShaderNodeLayerWeight')
    tr.inputs['Color'].default_value = (*tint, 1); gl.inputs['Roughness'].default_value = .03; fr.inputs['Blend'].default_value = .12
    if os.environ.get('PANECLEAR'): gl.inputs['Roughness'].default_value = 1.0; mix.inputs['Fac'].default_value = 0.0; fr = None
    if fr is not None:
        mm = nt.nodes.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'; mm.inputs[1].default_value = .3; nt.links.new(fr.outputs['Fresnel'], mm.inputs[0]); nt.links.new(mm.outputs[0], mix.inputs['Fac'])
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(gl.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs['Surface']); return m

def face_rocks(x0, x1, y0, y1, zf, n, smin, smax, seed, mats, sink=.55):
    """stones showing on a vertical cut face: partly embedded, so the section has real relief instead of a flat print"""
    rng = random.Random(seed); meshes = [rock_mesh(2000 + seed * 5 + i, mats[i % len(mats)], 'fr%d_%d' % (seed, i)) for i in range(8)]
    for k in range(n):
        s = smin + (smax - smin) * (rng.random() ** 2.0); x = rng.uniform(x0 + s, x1 - s); y = rng.uniform(y0 + s * .6, y1 - s * .6)
        ob = new_obj('f%d_%d' % (seed, k), meshes[rng.randrange(len(meshes))]); ob.scale = (s * rng.uniform(.9, 1.4), s * rng.uniform(.7, 1.1), s * rng.uniform(.5, .9))
        ob.rotation_euler = (rng.uniform(0, 6.3), rng.uniform(0, 6.3), rng.uniform(0, 6.3)); ob.location = V(x, y, zf - s * .1)

def cyl_axis_y(name, r, a0, a1, mat, seg=48):
    """a cylinder whose axis is the wheel axle (blender Y, toward the viewer is -Y); centred on the origin of its parent"""
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=abs(a1 - a0))
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=mathutils.Matrix.Rotation(math.pi / 2, 3, 'X'))
    for v in bm.verts: v.co.y += (a0 + a1) / 2
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = new_obj(name, me)
    for p in me.polygons: p.use_smooth = True
    me.materials.append(mat); return ob

def tyre_object(rubber, steel, dark):
    """a truck tyre: lathe profile with shoulders, four circumferential grooves and a sidewall rib, on a steel disc wheel with ten nuts; returns the root empty (origin = axle)"""
    R, HW = .22, .088
    prof = [(.125, -HW + .003), (.152, -HW - .004), (.19, -HW - .002), (.208, -HW + .006), (.216, -.066)]
    a = -.062
    while a <= .0621:
        dip = 0.0
        for g in (-.038, -.012, .012, .038):
            d = abs(a - g)
            if d < .0065: dip = max(dip, .0075 * (1 - (d / .0065) ** 2))
        prof.append((R - dip - .0012 * (abs(a) / .062) ** 2, a)); a += .0035
    prof += [(.216, .066), (.208, HW - .006), (.19, HW + .002), (.152, HW + .004), (.125, HW - .003)]
    bm = bmesh.new(); vs = [bm.verts.new(Vector((r, y, 0))) for r, y in prof]
    for p, q in zip(vs[:-1], vs[1:]): bm.edges.new((p, q))
    bm.edges.new((vs[-1], vs[0]))
    bmesh.ops.spin(bm, geom=list(bm.verts) + list(bm.edges), cent=(0, 0, 0), axis=(0, 1, 0), angle=2 * math.pi, steps=120, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('Tyre'); bm.to_mesh(me); bm.free(); ty = new_obj('Tyre', me); me.materials.append(rubber)
    for p in me.polygons: p.use_smooth = True
    root = bpy.data.objects.new('WheelRoot', None); scene.collection.objects.link(root); ty.parent = root
    parts = [cyl_axis_y('Disc', .128, -.085, -.04, steel, 64), cyl_axis_y('DiscRim', .132, -.092, -.07, steel, 64), cyl_axis_y('Cap', .046, -.108, -.07, dark, 40)]
    for k in range(10):
        ang = k * 2 * math.pi / 10; n = cyl_axis_y('Nut%d' % k, .0105, -.104, -.082, steel, 6); n.location = Vector((.082 * math.cos(ang), 0, .082 * math.sin(ang))); parts.append(n)
    for o in parts: o.parent = root
    return root

# ---------------------------------------------------------------- scene: load distribution
def scene_load():
    studio_world(); lights3((0, .35, 0), 1.0); floor_catcher(0, 0, 8)
    mats = [M_stone(i) for i in range(3)]
    XW, ZD = .86, .42; Ys, Yg, Yb, Yt, Yp = 0.0, .32, .56, .76, .83
    sub = M_laterite(); gsb = M_gsb(); base = M_base(); asph = M_asphalt()
    ubox('Subgrade', -XW, XW, Ys, Yg, -ZD, ZD, sub, .004, 1.0); ubox('GSB', -XW, XW, Yg, Yb, -ZD, ZD, gsb, .004, 1.0); ubox('Base', -XW, XW, Yb, Yt, -ZD, ZD, base, .004, .9); ubox('Surface', -XW, XW, Yt, Yp, -ZD, ZD, asph, .003, .8)
    face_rocks(-XW, XW, Yg + .01, Yb - .01, ZD, 190 if not QUICK else 60, .012, .034, 1, mats, .6)           # granular sub-base: coarse stones in the cut
    face_rocks(-XW, XW, Yb + .008, Yt - .008, ZD, 340 if not QUICK else 90, .006, .016, 2, mats, .5)          # base course: finer, tighter
    face_rocks(-XW, XW, Ys + .01, Yg - .01, ZD, 80 if not QUICK else 24, .006, .014, 3, mats, .35)            # a few laterite pebbles in the subgrade
    rubber = mat_plain('TyreRubber', (.018, .018, .02), .86, 0.0, .6); steel = mat_plain('WheelSteel', (.62, .63, .65), .3, 1.0, .2); dark = mat_plain('HubDark', (.03, .03, .035), .5)
    root = tyre_object(rubber, steel, dark); root.scale = (1.28, 1.28, 1.28); R = .22 * 1.28; yc = Yp + R - .002
    cam_t = (0, .54, 0); co = persp(cam_t, 17, 12, 4.35, 52, 2.0); bpy.context.view_layer.update()
    def proj(p): c = world_to_camera_view(scene, co, V(*p)); return [round(c.x, 4), round(1 - c.y, 4)]
    X0w, AMP = -.42, .84
    N = NFR; PINS.update({k: [] for k in ('wheel', 'wa', 'wl', 'wr')})
    def pose(f):
        u = ((f - 1) % N) / N; x = X0w + AMP * .5 * (1 - math.cos(2 * math.pi * u)) if os.environ.get('ANIM') else -.1
        root.location = V(x, yc, 0); root.rotation_euler = (0, (x - X0w) / R, 0)
        return x
    def fn(s):
        f = scene.frame_current
        if f < 1 or f > NFR: return
        x = pose(f); bpy.context.view_layer.update()
        PINS['wheel'].append(proj((x, Yp + .02, ZD))); PINS['wa'].append(proj((x, Yp + .002, ZD)))
        PINS['wl'].append(proj((x - .72, Ys + .004, ZD))); PINS['wr'].append(proj((x + .72, Ys + .004, ZD)))
    pose(1); ANIMFN[0] = fn; ANIMEXTRA[0] = PINS
    STATIC = {'s': (-XW + .12, (Yt + Yp) / 2, ZD), 'b': (-XW + .12, (Yb + Yt) / 2, ZD), 'g': (-XW + .12, (Yg + Yb) / 2, ZD), 'u': (-XW + .12, Yg / 2, ZD)}
    PINS['static'] = {k: proj(v) for k, v in STATIC.items()}
    render(co, {})

exec(compile(open(os.path.join(_root_, 'scripts', 'wmm3d', 'gsb_scenes2.py'), encoding='utf8').read(), 'gsb2', 'exec'))
