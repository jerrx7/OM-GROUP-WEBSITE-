"""OM GROUP - Washed Sand page: the three cross-section widgets as Blender cut-away stills.

  SCENE=screed|bed|bedpave|filter blender -b --factory-startup -P scripts/wsand3d/build-wsand2.py -- <repo root> [--quick]

  screed   "A floor screed in section"            substrate (concrete) / screed / tiled finish / movement joint
  bed      "Bedding applications" (pipe, utility)  a pipe in a bed of washed sand, inside natural soil
  bedpave  the same trench with paving blocks on top ("Load and support")
  filter   "Clean appearance does not mean ..."    surrounding soil | filter sand | drainage gravel, side by side
Output _review/wsand3d/<scene>.png (transparent, soft floor shadow, frame 2.1 : 1) and polygons / anchors in _review/wsand3d/layout2.json
(normalised image coordinates) that the page overlay was derived from. 1 unit = 1 m; the blocks are a model, not a scale drawing.
Shares the helpers of build-wsand.py (everything above its WASHING section).
"""
import sys, os
_src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build-wsand.py'), encoding='utf8').read()
_src = _src[:_src.index('# =========================================================================================== WASHING')]
exec(compile(_src, 'build-wsand-prelude', 'exec'))
import zlib

SCENE = os.environ.get('SCENE', 'screed'); ASPECT = 2.1

# ------------------------------------------------------------------ textures
def speckle_maps(N, seed, base, cols, count, rr_, lift, nstr_scale=.16, big=None, tone=.10, rough=(.86, .06), big_lift=(.6, 1.6)):
    """grain / aggregate texture: a base tone, optional large rounded stones (big = (count, rmin, rmax, colours)), then fine angular grains"""
    rng = np.random.default_rng(seed); stamp = stamp_fn(rng, N)
    alb = np.empty((N, N, 3)); alb[:] = base
    alb *= (1 + tone * pnoise(rng, N, 1.0) + .6 * tone * pnoise(rng, N, .4))[..., None]; alb *= (1 + .8 * tone * pnoise(rng, N, .12))[..., None]
    h = .5 * pnoise(rng, N, .8) + .3 * pnoise(rng, N, 1.6)
    def grain(ix, m, d, col, lf):
        a = (m * .95)[..., None]; shade = (.82 + .3 * (1 - d))[..., None]; alb[ix] = alb[ix] * (1 - a) + col * shade * a; h[ix] += m * lf
    cs = [np.array(c) for c in cols]
    for _ in range(int(count * K)):
        col = cs[rng.integers(len(cs))] * rng.uniform(.9, 1.1)
        stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(rr_[0], rr_[1]), lambda ix, m, d, col=col: grain(ix, m, d, col, rng.uniform(lift[0], lift[1])))
    if big:
        for _ in range(int(big[0] * K)):
            col = np.array(big[3][rng.integers(len(big[3]))]) * rng.uniform(.85, 1.1)
            stamp(rng.uniform(0, N), rng.uniform(0, N), rng.uniform(big[1], big[2]), lambda ix, m, d, col=col: grain(ix, m, d, col, rng.uniform(*big_lift)))
            alb[:] = alb * (1 + .04 * pnoise(rng, N, 1.4))[..., None] if False else alb
    return np.clip(alb, 0, 1), normal_from_height(h * nstr_scale, 1.0), np.clip(rough[0] + rough[1] * pnoise(rng, N, .6), .3, 1)

def tile_maps(N, seed):
    rng = np.random.default_rng(seed)
    alb = np.empty((N, N, 3)); alb[:] = (.62, .60, .56)
    v = pnoise(rng, N, 1.6); alb *= (1 + .10 * pnoise(rng, N, 1.0) + .05 * pnoise(rng, N, .3))[..., None]
    vein = np.exp(-(np.abs(pnoise(rng, N, 2.4)) * 5.0) ** 2); alb *= (1 - .12 * vein)[..., None]
    h = .15 * pnoise(rng, N, 1.0)
    return np.clip(alb, 0, 1), normal_from_height(h * .08, 1.0), np.clip(.34 + .06 * pnoise(rng, N, .6), .2, .6)

def ubox(name, x0, x1, y0, y1, z0, z1, mat, bevel=.002, uvs=.5):
    """a box with world-coordinate UVs (uvs metres per texture tile), so every layer keeps its grain scale"""
    ob = box(name, x0, x1, y0, y1, z0, z1, mat, bevel, False); me = ob.data
    b2 = bmesh.new(); b2.from_mesh(me); uvl = b2.loops.layers.uv['UVMap'] if 'UVMap' in b2.loops.layers.uv else b2.loops.layers.uv.new('UVMap')
    off = (zlib.crc32(name.encode()) % 997) / 997.0
    for f in b2.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))          # blender axes: x, y (= -z mine), z (= y mine)
        for lp in f.loops:
            p = lp.vert.co; u, v = (p.x, p.z) if ax == 1 else ((p.y, p.z) if ax == 0 else (p.x, -p.y))
            lp[uvl].uv = (u / uvs + off, v / uvs + off * .7)
    b2.to_mesh(me); b2.free(); return ob

def tube(name, cx, cy, r, z0, z1, wall, mat, seg=64):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=False, segments=seg, radius1=r, radius2=r, depth=(z1 - z0))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = new_obj(name, me); ob.location = V(cx, cy, (z0 + z1) / 2); ob.rotation_euler = (math.pi / 2, 0, 0)
    me.materials.append(mat)
    for p in me.polygons: p.use_smooth = True
    sm = ob.modifiers.new('sol', 'SOLIDIFY'); sm.thickness = wall; sm.offset = -1
    return ob

def lights(target):
    area('Key', (-1.0, 1.7, 1.2), .8, .6, 200 * LK, (1.0, .985, .965), target); area('Fill', (1.8, .9, 1.4), 1.4, 1.0, 36 * LK, (.95, .97, 1.0), target)
    area('Top', (0, 2.2, .2), 1.8, 1.2, 30 * LK, (1, 1, 1), target); area('Low', (.6, .3, 1.7), 1.6, .9, 55 * LK, (1, .98, .95), target)
    for o in bpy.data.objects:
        if o.type == 'LIGHT' and o.name != 'Key': o.visible_glossy = False

HZ = .17                                       # half depth of every block (z)
LKD = {}

def mats(which):
    M = {}
    if 'conc' in which: M['conc'] = mat_pbr('Conc', speckle_maps(NS, 21, (.46, .45, .43), [(.30, .29, .28), (.6, .58, .55), (.42, .40, .37), (.2, .2, .2)], 14000, (1.6, 4.5), (.2, .8), .12, big=(150, 14, 30, [(.50, .47, .43), (.36, .34, .31), (.58, .55, .50), (.28, .27, .26), (.46, .40, .33)]), tone=.07), 1.4, .35)
    if 'screed' in which: M['screed'] = mat_pbr('Screed', speckle_maps(NS, 22, (.60, .56, .49), [(.78, .73, .65), (.42, .40, .36), (.55, .46, .35), (.30, .28, .25), (.70, .66, .58)], 24000, (1.2, 3.6), (.2, .8), .12, tone=.05), 1.2, .3)
    if 'tile' in which: M['tile'] = mat_pbr('Tile', tile_maps(NS, 23), .6, .6)
    if 'soil' in which: M['soil'] = mat_pbr('Soil', speckle_maps(NS, 24, (.235, .165, .105), [(.34, .26, .18), (.15, .11, .075), (.42, .34, .25), (.28, .20, .13), (.50, .44, .36), (.10, .075, .055)], 34000, (1.0, 3.2), (.2, .8), .18, big=(34, 6, 14, [(.40, .35, .29), (.30, .26, .21), (.46, .42, .35)]), tone=.20, rough=(.95, .04)), 1.5, .12)
    if 'sand' in which: M['sand'] = mat_pbr('SandM', sand_maps(NS, 15, np.array([1.22, 1.10, .92])), 1.3, .35)
    if 'gravel' in which:
        sm_ = stone_maps(NS); M['gravel'] = mat_pbr('Stone', (np.clip(sm_[0] * 1.3, 0, 1), sm_[1], sm_[2]), 1.1, .55, tint=True)
    if 'paver' in which: M['paver'] = mat_pbr('Paver', speckle_maps(NS, 25, (.58, .55, .51), [(.70, .67, .62), (.40, .38, .35), (.50, .45, .38), (.28, .27, .26)], 16000, (1.2, 3.4), (.2, .7), .1, tone=.06), 1.2, .3)
    return M

def frame_pts(co, d, ys=None):
    bpy.context.view_layer.update(); out = {}
    for k, pts in d.items():
        out[k] = [[round(world_to_camera_view(scene, co, V(*p)).x, 4), round(1 - world_to_camera_view(scene, co, V(*p)).y, 4)] for p in pts]
    return out
def rectf(x0, x1, y0, y1, z=HZ): return [(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)]

# ------------------------------------------------------------------ scenes
def build_screed():
    M = mats(['conc', 'screed', 'tile'])
    GROUT = mat_plain('Grout', (.40, .38, .35), .9); FOAM = mat_plain('Foam', (.07, .07, .075), .9); SEAL = mat_plain('Seal', (.03, .03, .035), .55)
    y1, y2, y3 = .20, .355, .395; jx0, jx1 = .17, .182
    ubox('Sub', -.5, .5, 0, y1, -HZ, HZ, M['conc'], .0025, .5)
    for nm, a, b in (('L', -.5, jx0), ('R', jx1, .5)):
        ubox('Screed' + nm, a, b, y1, y2, -HZ, HZ, M['screed'], .002, .35)
        ubox('Grout' + nm, a, b, y2, y3 - .004, -HZ + .008, HZ - .008, GROUT, .001, .3)
        n = 3 if nm == 'L' else 2; g = .006; w = (b - a - g * (n + 1)) / n; zr = [(-HZ, -.003), (.003, HZ)]
        for i in range(n):
            for j, (za, zb) in enumerate(zr):
                ubox('Tile%s%d%d' % (nm, i, j), a + g + i * (w + g), a + g + i * (w + g) + w, y2, y3, za, zb, M['tile'], .0028, .45)
    ubox('Foam', jx0, jx1, y1, y3 - .006, -HZ, HZ, FOAM, .0005, .1); ubox('Seal', jx0, jx1, y3 - .008, y3 - .001, -HZ, HZ, SEAL, .001, .1)
    floor_catcher(0, 0, 5.0); lights((0, .22, 0)); setup_world_render()
    co = set_camera((0, .22, 0), float(os.environ.get('AZ', '18')), float(os.environ.get('EL', '22')), float(os.environ.get('FW', '1.32')), ASPECT)
    poly = frame_pts(co, {'sub': rectf(-.5, .5, 0, y1), 'scr1': rectf(-.5, jx0, y1, y2), 'scr2': rectf(jx1, .5, y1, y2), 'fin1': rectf(-.5, jx0, y2, y3), 'fin2': rectf(jx1, .5, y2, y3), 'joint': rectf(jx0, jx1, y1, y3)})
    anc = frame_pts(co, {'sub': [(-.30, .10, HZ)], 'screed': [(-.30, .278, HZ)], 'finish': [(-.30, .375, HZ)], 'joint': [(.176, .445, HZ)]})
    return {'poly': poly, 'anc': anc}

def build_bed(pave):
    M = mats(['soil', 'sand'] + (['paver'] if pave else []))
    H = .34; bx = .2; yb0, yb1 = .035, .215; pcy, pr = .125, .066
    PIPE = mat_plain('Pipe', (.17, .21, .27), .36, 0.0, 0, .5)
    ubox('SoilL', -.5, -bx, 0, H, -HZ, HZ, M['soil'], .0008, .4); ubox('SoilR', bx, .5, 0, H, -HZ, HZ, M['soil'], .0008, .4)
    ubox('SoilB', -bx, bx, 0, yb0, -HZ, HZ, M['soil'], .0008, .4); ubox('SoilT', -bx, bx, yb1, H, -HZ, HZ, M['soil'], .0008, .4)
    ubox('Bed', -bx + .0005, bx - .0005, yb0, yb1, -HZ, HZ + .002, M['sand'], .004, .35)
    tube('Pipe', 0, pcy, pr, -HZ - .03, HZ + .03, .011, PIPE)
    yt = H
    if pave:
        JS = M['sand']; pv = M['paver']; th = .052
        ubox('JointBed', -.495, .495, H, H + .032, -HZ + .006, HZ - .006, JS, .001, .3)
        L, Wd, g = .21, .1, .006; rows = [(-HZ, -HZ + Wd), (-HZ + Wd + g, -HZ + 2 * Wd + g), (-HZ + 2 * (Wd + g), HZ)]
        for r_, (za, zb) in enumerate(rows):
            x = -.5 - (0 if r_ % 2 == 0 else L / 2)
            while x < .5:
                a, b = max(x, -.5), min(x + L, .5)
                if b - a > .02: ubox('Pv%d_%d' % (r_, int(x * 1000)), a + g / 2, b - g / 2 if b < .5 else b, H + .003, H + th, za, zb, pv, .0035, .45)
                x += L + g
        yt = H + th
    floor_catcher(0, 0, 5.0); lights((0, .22, 0)); setup_world_render()
    co = set_camera((0, .24, 0), float(os.environ.get('AZ', '18')), float(os.environ.get('EL', '24')), float(os.environ.get('FW', '1.32')), ASPECT)
    poly = frame_pts(co, {'bed': rectf(-bx, bx, yb0, yb1), 'pave': rectf(-.5, .5, H, H + .052), 'soil': rectf(-.5, .5, 0, H)})
    anc = frame_pts(co, {'soil': [(-.46, .30, HZ)], 'bedmat': [(0, .06, HZ)], 'pipe': [(0, pcy, HZ + .03)], 'paving': [(.36, H + .027, HZ)]})
    return {'poly': poly, 'anc': anc}

def build_filter():
    M = mats(['soil', 'sand', 'gravel'])
    H = .32; xs, xf, xd = -.13, .07, .5
    ubox('Soil', -.5, xs, 0, H, -HZ, HZ, M['soil'], .0008, .4)
    ubox('Filter', xs, xf, 0, H, -HZ, HZ, M['sand'], .003, .35)
    ubox('DrainBase', xf, xd, 0, .02, -HZ, HZ, mat_plain('DrainBase', (.08, .08, .08), .9), .002, .3)
    rmeshes = [rock_mesh(sd, M['gravel'], 'r%d' % sd) for sd in (41, 43, 47, 50, 52, 55, 58, 61)]
    rr = random.Random(7); sp = .032; n = 0
    nx = int((xd - xf) / sp); ny = int(H / sp * 1.02); nz = int(2 * HZ / sp)
    for i in range(nx):
        for k in range(ny):
            for j in range(nz):
                x = xf + (i + .5 + rr.uniform(-.25, .25)) * sp * (xd - xf) / (nx * sp); y = .018 + (k + .5 + rr.uniform(-.2, .2)) * sp * .94 + (rr.uniform(-.004, .004)); z = -HZ + (j + .5 + rr.uniform(-.25, .25)) * (2 * HZ) / nz
                if y > H + .004 + rr.uniform(-.012, .008) - (.01 if k == ny - 1 else 0): continue
                sz = rr.uniform(.030, .043); me = rmeshes[rr.randrange(len(rmeshes))]; n += 1; ob = new_obj('g%d' % n, me)
                R4 = Matrix.Rotation(rr.uniform(0, 6.283), 4, 'X') @ Matrix.Rotation(rr.uniform(0, 6.283), 4, 'Y') @ Matrix.Rotation(rr.uniform(0, 6.283), 4, 'Z')
                ob.matrix_world = Matrix.Translation(V(x, y, z)) @ R4 @ Matrix.Diagonal((sz, sz * rr.uniform(.8, 1), sz * rr.uniform(.78, .95), 1))
    floor_catcher(0, 0, 5.0); lights((0, .2, 0)); setup_world_render()
    co = set_camera((0, .20, 0), float(os.environ.get('AZ', '18')), float(os.environ.get('EL', '24')), float(os.environ.get('FW', '1.32')), ASPECT)
    poly = frame_pts(co, {'soil': rectf(-.5, xs, 0, H), 'filter': rectf(xs, xf, 0, H), 'drain': rectf(xf, xd, 0, H)})
    anc = frame_pts(co, {'soil': [(-.40, .27, HZ)], 'filter': [(-.03, .27, HZ)], 'drain': [(.30, .29, HZ)], 'flow0': [(-.42, .16, HZ)], 'flow1': [(.44, .16, HZ)]})
    return {'poly': poly, 'anc': anc}

builders = {'screed': build_screed, 'bed': lambda: build_bed(False), 'bedpave': lambda: build_bed(True), 'filter': build_filter}
res = builders[SCENE]()
lp = os.path.join(OUT, 'layout2.json'); lay = json.load(open(lp)) if os.path.exists(lp) else {}
lay[SCENE] = res; json.dump(lay, open(lp, 'w'), indent=1)
scene.cycles.samples = int(os.environ.get('SAMPLES', '48' if QUICK else '420'))
scene.render.filepath = os.path.join(OUT, SCENE + '.png'); bpy.ops.render.render(write_still=True)
print('[wsand2] done', SCENE)
