"""OM GROUP - Ready Mix Concrete page: three widgets as Blender cut-away stills.

  SCENE=wall|scc|mass blender -b --factory-startup -P scripts/rmc3d/build-rmc.py -- <repo root> [--quick]

  wall  "RMC for Designed Structural Concrete"   retaining wall: subgrade, base slab, stem (both with a rebar window), drain gravel + weep pipe, backfill
  scc   "Needs Specialised Mix Design"           an SCC section: smooth paste-rich concrete round a tight bar cluster, formwork ends, exposed coarse stones
  mass  "Planning the Delivery ..."              a mass-concrete block poured in three lifts, cooling-pipe ends, temperature sensors
Output _review/rmc3d/<scene>.png (transparent, floor shadow, frame 2.1 : 1) and normalised polygons / anchors in _review/rmc3d/layout.json.
Shares the helpers of scripts/wsand3d/build-wsand.py and build-wsand2.py (everything above their scene sections). A model, not a design.
"""
import sys, os
_here = os.path.dirname(os.path.abspath(__file__)); _w = os.path.join(_here, '..', 'wsand3d')
_s1 = open(os.path.join(_w, 'build-wsand.py'), encoding='utf8').read(); _s1 = _s1[:_s1.index('# =========================================================================================== WASHING')]
exec(compile(_s1, 'prelude1', 'exec'))
_s2 = open(os.path.join(_w, 'build-wsand2.py'), encoding='utf8').read()
_s2 = _s2[_s2.index('import zlib'):_s2.index('# ------------------------------------------------------------------ scenes')]
exec(compile(_s2, 'prelude2', 'exec'))
OUT = os.path.join(ROOT, '_review', 'rmc3d'); os.makedirs(OUT, exist_ok=True)

SCENE = os.environ.get('SCENE', 'wall'); ASPECT = 2.1

def wood_maps(N, seed):
    """plywood / timber: warm brown, long grain streaks along x, a few knots"""
    rng = np.random.default_rng(seed)
    w = rng.standard_normal((N, N)); F = np.fft.rfft2(w); fy = np.fft.fftfreq(N)[:, None]; fx = np.fft.rfftfreq(N)[None, :]
    f = np.sqrt((fx * .03) ** 2 + fy * fy); f[0, 0] = 1; F *= f ** -1.5; F[0, 0] = 0; g = np.fft.irfft2(F, s=(N, N)); g = (g - g.mean()) / (g.std() + 1e-9)
    alb = np.empty((N, N, 3)); alb[:] = (.40, .30, .19); alb *= (1 + .16 * g)[..., None]; alb *= (1 + .08 * pnoise(rng, N, .8))[..., None]
    ring = .5 + .5 * np.sin(g * 5.0); alb *= (1 - .10 * ring)[..., None]
    return np.clip(alb, 0, 1), normal_from_height(g * .02, 1.0), np.clip(.62 + .08 * pnoise(rng, N, .6), .3, .9)

def rmc_mats(which):
    M = mats([w for w in which if w in ('conc', 'soil', 'sand', 'gravel')])
    if 'wood' in which: M['wood'] = mat_pbr('Wood', wood_maps(NS, 41), .8, .3)
    if 'mconc' in which: M['mconc'] = mat_pbr('MConc', speckle_maps(NS, 43, (.50, .49, .47), [(.62, .61, .58), (.40, .39, .37), (.52, .50, .46), (.34, .33, .31)], 16000, (1.4, 3.6), (.2, .7), .3, big=(80, 14, 30, [(.56, .54, .51), (.36, .35, .33), (.63, .61, .57), (.29, .29, .28), (.48, .43, .36)]), tone=.08, big_lift=(1.4, 2.8)), 1.4, .35)
    if 'scc' in which: M['scc'] = mat_pbr('SCC', speckle_maps(NS, 44, (.47, .46, .44), [(.58, .57, .54), (.38, .37, .35), (.50, .47, .42), (.32, .31, .29)], 26000, (1.0, 2.8), (.1, .5), .22, big=(64, 9, 20, [(.50, .48, .45), (.34, .33, .31), (.58, .56, .52), (.28, .28, .27), (.46, .42, .35)]), tone=.05, rough=(.78, .05), big_lift=(1.0, 2.2)), 1.0, .4)
    if 'fill' in which: M['fill'] = mat_pbr('Fill', speckle_maps(NS, 45, (.33, .28, .21), [(.44, .38, .30), (.24, .20, .15), (.52, .47, .40), (.30, .25, .19), (.58, .55, .50)], 30000, (1.2, 4.2), (.2, .9), .17, big=(46, 7, 17, [(.55, .50, .42), (.40, .36, .30), (.62, .58, .50)]), tone=.13, rough=(.93, .05)), 1.5, .15)
    return M

STEEL_ = None
def rebar_mat():
    return mat_plain('Rebar', (.34, .32, .30), .38, .8, .5, .5)

def bar_z(name, x, y, r, z0, z1, mat, seg=14): return cyl(name, (x, y, z0), (x, y, z1), r, mat, seg)
def bar_x(name, x0, x1, y, z, r, mat, seg=14): return cyl(name, (x0, y, z), (x1, y, z), r, mat, seg)
def bar_y(name, x, y0, y1, z, r, mat, seg=14): return cyl(name, (x, y0, z), (x, y1, z), r, mat, seg)

def rocks_in_box(gm, x0, x1, y0, y1, z0, z1, sp, szr, seed, clip_top=None):
    rr = random.Random(seed); rm = [rock_mesh(sd, gm, 'rk%d_%d' % (sd, seed)) for sd in (41, 43, 47, 50, 52, 55)]
    nx = max(1, int((x1 - x0) / sp)); ny = max(1, int((y1 - y0) / sp)); nz = max(1, int((z1 - z0) / sp)); n = 0
    for i in range(nx):
        for k in range(ny):
            for j in range(nz):
                x = x0 + (i + .5 + rr.uniform(-.25, .25)) * (x1 - x0) / nx; y = y0 + (k + .5 + rr.uniform(-.2, .2)) * (y1 - y0) / ny; z = z0 + (j + .5 + rr.uniform(-.25, .25)) * (z1 - z0) / nz
                if clip_top is not None and y > clip_top + rr.uniform(-.008, .004): continue
                sz = rr.uniform(*szr); me = rm[rr.randrange(len(rm))]; n += 1; ob = new_obj('rk%d' % n, me)
                R4 = Matrix.Rotation(rr.uniform(0, 6.283), 4, 'X') @ Matrix.Rotation(rr.uniform(0, 6.283), 4, 'Y') @ Matrix.Rotation(rr.uniform(0, 6.283), 4, 'Z')
                ob.matrix_world = Matrix.Translation(V(x, y, z)) @ R4 @ Matrix.Diagonal((sz, sz * rr.uniform(.8, 1), sz * rr.uniform(.78, .95), 1))

def pts3(co, d):
    bpy.context.view_layer.update(); out = {}
    for k, pts in d.items():
        out[k] = [[round(world_to_camera_view(scene, co, V(*p)).x, 4), round(1 - world_to_camera_view(scene, co, V(*p)).y, 4)] for p in pts]
    return out

# ------------------------------------------------------------------ retaining wall
def build_wall():
    M = rmc_mats(['conc', 'soil', 'gravel', 'fill']); RB = rebar_mat()
    PVC = mat_plain('Pvc', (.82, .83, .85), .35, 0, 0, .5)
    HZ_ = HZ; WN = .045
    ubox('Ground', -.45, .56, -.10, 0, -HZ_, HZ_, M['soil'], .001, .5)
    # base slab with a rebar window
    sx0, sx1, sy1 = -.26, .26, .075
    ubox('SlabBack', sx0, sx1, 0, sy1, -HZ_, HZ_ - WN, M['conc'], .001, .5)
    for nm, a, b, c, d in (('T', sx0, sx1, .057, sy1), ('B', sx0, sx1, 0, .018), ('L', sx0, -.20, .018, .057), ('R', .20, sx1, .018, .057)):
        ubox('SlabF' + nm, a, b, c, d, HZ_ - WN, HZ_, M['conc'], .001, .5)
    for yy in (.03, .045): bar_x('SlabBar%g' % yy, -.225, .225, yy, HZ_ - .022, .0055, RB)
    for i in range(10): bar_y('SlabTie%d' % i, -.2 + i * .0445, .028, .047, HZ_ - .022, .0035, RB, 8)
    # stem with a rebar window
    tx0, tx1, ty1 = -.14, -.05, .435
    ubox('StemBack', tx0, tx1, sy1, ty1, -HZ_, HZ_ - WN, M['conc'], .001, .5)
    for nm, a, b, c, d in (('B', tx0, tx1, sy1, .13), ('T', tx0, tx1, .38, ty1), ('L', tx0, -.13, .13, .38), ('R', -.06, tx1, .13, .38)):
        ubox('StemF' + nm, a, b, c, d, HZ_ - WN, HZ_, M['conc'], .001, .5)
    for i, xx in enumerate((-.115, -.095, -.075)): bar_y('StemBar%d' % i, xx, .09, .405, HZ_ - .022, .0055, RB)
    for i, yy in enumerate((.16, .22, .28, .34)): bar_x('StemTie%d' % i, -.122, -.068, yy, HZ_ - .022, .004, RB, 8)
    # drainage column behind the stem + backfill
    ubox('DrainBase', tx1, tx1 + .06, sy1, sy1 + .004, -HZ_, HZ_, mat_plain('DrainBase', (.1, .1, .1), .9), .0005, .3)
    ubox('Fill', tx1 + .06, .42, sy1, ty1, -HZ_, HZ_, M['fill'], .001, .45)
    rocks_in_box(M['gravel'], tx1 + .004, tx1 + .058, sy1 + .006, .30, -HZ_ + .012, HZ_ - .006, .021, (.021, .028), 11)
    ubox('FillTop', tx1 + .06, .62, .30, ty1, -HZ_, HZ_, M['fill'], .001, .45) if False else None
    ubox('FillOverDrain', tx1, tx1 + .06, .30, ty1, -HZ_, HZ_, M['fill'], .001, .45)
    # weep pipe through the stem, on the open (left) face
    tube('Weep', -.18, .105, .014, HZ_ * 0, HZ_ * 0, .004, PVC) if False else None
    wp = cyl('Weep', (-.20, .105, 0), (-.10, .105, 0), .014, PVC, 32)
    floor_catcher(0, 0, 5.0); lights((0, .2, 0)); setup_world_render()
    co = set_camera((.09, .22, 0), float(os.environ.get('AZ', '-20')), float(os.environ.get('EL', '21')), float(os.environ.get('FW', '1.32')), ASPECT)
    poly = pts3(co, {'stem': rectf(tx0, tx1, sy1, ty1), 'base': rectf(sx0, sx1, 0, sy1), 'back': rectf(tx1, .42, sy1, ty1), 'drain': rectf(tx1, tx1 + .06, sy1, .30),
                     'winS': rectf(-.13, -.06, .13, .38), 'winB': rectf(-.20, .20, .018, .057),
                     'j1': [(tx0 - .006, .20, HZ_), (tx1 + .006, .20, HZ_)], 'j2': [(tx0 - .006, .31, HZ_), (tx1 + .006, .31, HZ_)]})
    anc = pts3(co, {'stem': [(-.30, .26, HZ_)], 'base': [(.0, -.06, HZ_)], 'backfill': [(.32, .36, HZ_)],
                    'la': [(.16, .53, HZ_ * .6), (.16, .465, HZ_ * .6)], 'lb': [(.28, .53, HZ_ * .6), (.28, .465, HZ_ * .6)], 'lc': [(.40, .53, HZ_ * .6), (.40, .465, HZ_ * .6)],
                    'ha': [(.30, .20, HZ_), (.07, .20, HZ_)], 'hb': [(.30, .31, HZ_), (.07, .31, HZ_)], 'wt': [(.36, .13, HZ_), (.36, .27, HZ_)]})
    return {'poly': poly, 'anc': anc}

# ------------------------------------------------------------------ SCC
def build_scc():
    M = rmc_mats(['scc', 'gravel', 'wood']); RB = rebar_mat(); H = .30
    ubox('Scc', -.5, .5, 0, H - .013, -HZ, HZ, M['scc'], .002, .5)
    # wet, glossy top surface with gentle flow undulations
    n = 260 if not QUICK else 140; rng = np.random.default_rng(5); nz = pnoise(rng, 512, 2.0)[:n + 1, :n + 1]; bm = bmesh.new(); gv = {}
    for i in range(n + 1):
        for j in range(n + 1):
            x = -.5 + i / n; z = -HZ + 2 * HZ * j / n; y = H + .0045 * math.sin(x * 11 + z * 5) + .0035 * math.sin(x * 23 - z * 17) + .0012 * nz[i, j]
            gv[(i, j)] = bm.verts.new(V(x, y, z))
    for i in range(n):
        for j in range(n): bm.faces.new([gv[(i, j)], gv[(i + 1, j)], gv[(i + 1, j + 1)], gv[(i, j + 1)]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new('SccTop'); bm.to_mesh(me); bm.free(); top = new_obj('SccTop', me)
    for p in me.polygons: p.use_smooth = True
    me.materials.append(mat_plain('SccWet', (.19, .19, .18), .26, 0, .12, .3))
    # formwork: plywood ends, back and base
    ubox('FBase', -.56, .56, -.03, 0, -HZ - .03, HZ, M['wood'], .002, .6); ubox('FL', -.54, -.5, 0, H + .05, -HZ - .03, HZ, M['wood'], .002, .6)
    ubox('FR', .5, .54, 0, H + .05, -HZ - .03, HZ, M['wood'], .002, .6); ubox('FB', -.5, .5, 0, H + .05, -HZ - .03, -HZ, M['wood'], .002, .6)
    # tight bar cluster, bars running through the section (their cut ends stand a little proud of the face)
    cols = [-.05 + i * .045 for i in range(5)]; rows = [.085 + j * .055 for j in range(3)]
    for i, x in enumerate(cols):
        for j, y in enumerate(rows): bar_z('Bar%d_%d' % (i, j), x, y, .012, -HZ - .02, HZ + .03, RB, 28)
    # three exposed coarse stones on the cut face (left of the bars)
    gm = M['gravel']; rm = [rock_mesh(sd, gm, 'sc%d' % sd) for sd in (41, 47, 52)]
    for k, (x, y) in enumerate(((-.30, .21), (-.21, .12), (-.37, .09))):
        ob = new_obj('Stone%d' % k, rm[k]); R4 = Matrix.Rotation(.9 * k + .3, 4, 'Z') @ Matrix.Rotation(.5 * k, 4, 'X'); sz = .05 + .006 * k
        ob.matrix_world = Matrix.Translation(V(x, y, HZ - .008)) @ R4 @ Matrix.Diagonal((sz, sz * .92, sz * .8, 1))
    floor_catcher(0, 0, 5.0); lights((0, .2, 0)); setup_world_render()
    co = set_camera((0, .20, 0), float(os.environ.get('AZ', '-16')), float(os.environ.get('EL', '24')), float(os.environ.get('FW', '1.42')), ASPECT)
    poly = pts3(co, {'face': rectf(-.5, .5, 0, H)})
    anc = pts3(co, {'flow': [(0, -.05, HZ)], 'stones': [(-.30, .21, HZ), (-.21, .12, HZ), (-.37, .09, HZ)], 'bars': [(x, y, HZ + .03) for x in cols for y in rows],
                    'fl1': [(-.46, .21, HZ), (-.18, .24, HZ), (.0, .215, HZ), (.2, .26, HZ), (.46, .22, HZ)], 'fl2': [(-.46, .11, HZ), (-.18, .14, HZ), (.0, .06, HZ), (.2, .12, HZ), (.46, .09, HZ)]})
    return {'poly': poly, 'anc': anc}

# ------------------------------------------------------------------ mass concrete
def build_mass():
    M = rmc_mats(['mconc']); RB = rebar_mat(); H = .36
    PIPE = mat_plain('CoolPipe', (.07, .09, .13), .4, .0, 0, .5); CAP = mat_plain('Cap', (.85, .30, .08), .45); SEAM = mat_plain('Seam', (.24, .23, .22), .95); CAB = mat_plain('Cable', (.02, .02, .02), .5)
    ys = [0, .12, .24, H]
    for i in range(3):
        ubox('Lift%d' % i, -.5, .5, ys[i] + (.002 if i else 0), ys[i + 1] - (.002 if i < 2 else 0), -HZ, HZ, M['mconc'], .0025, .9)
    for i in (1, 2): ubox('Seam%d' % i, -.5 + .002, .5 - .002, ys[i] - .002, ys[i] + .002, -HZ + .001, HZ + .0008, SEAM, .0004, .3)
    for r_, y in enumerate((.10, .26)):
        for x in (-.30, -.15, .15, .30): tube('Pipe%d_%g' % (r_, x), x, y, .017, -HZ - .02, HZ + .05, .005, PIPE, 40)
    for k, x in enumerate((-.34, 0.0, .34)):
        cyl('Probe%d' % k, (x, .18, HZ - .03), (x, .18, HZ + .06), .0045, mat_plain('Probe', (.7, .7, .72), .3, 1.0), 12); cyl('Cap%d' % k, (x, .18, HZ + .06), (x, .18, HZ + .085), .01, CAP, 20)
        cyl('Cab%d' % k, (x, .18, HZ + .085), (x, .18, HZ + .09), .004, CAB, 8)
    floor_catcher(0, 0, 5.0); lights((0, .2, 0)); setup_world_render()
    co = set_camera((0, .19, 0), float(os.environ.get('AZ', '-16')), float(os.environ.get('EL', '23')), float(os.environ.get('FW', '1.42')), ASPECT)
    poly = pts3(co, {'face': rectf(-.5, .5, 0, H), 'l1': [(-.5, ys[1], HZ), (.5, ys[1], HZ)], 'l2': [(-.5, ys[2], HZ), (.5, ys[2], HZ)]})
    anc = pts3(co, {'core': [(0, .205, HZ)], 'cool': [(0, .335, HZ)], 'pipes': [(x, y, HZ + .05) for y in (.10, .26) for x in (-.30, -.15, .15, .30)], 'probes': [(x, .18, HZ + .06) for x in (-.34, 0, .34)],
                    'lbl_cool': [(0, .335, HZ)], 'lbl_pipes': [(0, .13, HZ)], 'lbl_sens': [(.45, .18, HZ)], 'gc': [(0, .18, HZ)]})
    return {'poly': poly, 'anc': anc}

B = {'wall': build_wall, 'scc': build_scc, 'mass': build_mass}
res = B[SCENE]()
lp = os.path.join(OUT, 'layout.json'); lay = json.load(open(lp)) if os.path.exists(lp) else {}
lay[SCENE] = res; json.dump(lay, open(lp, 'w'), indent=1)
scene.cycles.samples = int(os.environ.get('SAMPLES', '48' if QUICK else '420'))
scene.render.filepath = os.path.join(OUT, SCENE + '.png'); bpy.ops.render.render(write_still=True)
print('[rmc] done', SCENE)
