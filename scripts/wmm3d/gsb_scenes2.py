# ---------------------------------------------------------------- shared helpers for the filter and drainage scenes (exec'd by build-gsb.py)
def pack(x0, x1, z0, z1, y0, layers, cell, ssz, seed, mats):
    """loose angular stones packed in staggered layers (a gravel bed): every layer is offset half a cell from the one below, with random size, turn and jitter"""
    rng = random.Random(seed); meshes = [rock_mesh(3000 + seed * 9 + i, mats[i % len(mats)], 'pk%d_%d' % (seed, i)) for i in range(12)]; out = []
    nx = max(1, int((x1 - x0) / cell)); nz = max(1, int((z1 - z0) / cell))
    for L in range(layers):
        for j in range(nz):
            for i in range(nx):
                x = x0 + (i + .5 + (.5 if (j + L) % 2 else 0)) * (x1 - x0) / nx; z = z0 + (j + .5) * (z1 - z0) / nz
                if x > x1 - cell * .3: continue
                s = rng.uniform(*ssz); ob = new_obj('st%d_%d_%d_%d' % (seed, L, j, i), meshes[rng.randrange(len(meshes))])
                ob.scale = (s * rng.uniform(.95, 1.35), s * rng.uniform(.7, 1.0), s * rng.uniform(.85, 1.2)); ob.rotation_euler = (rng.uniform(0, 6.3), rng.uniform(0, 6.3), rng.uniform(0, 6.3))
                ob.location = V(x + rng.uniform(-.22, .22) * cell, y0 + (L + .5) * cell * .78 + rng.uniform(-.1, .12) * cell, z + rng.uniform(-.2, .2) * cell); out.append(ob)
    return out

def smooth(x): x = min(1.0, max(0.0, x)); return x * x * (3 - 2 * x)

def uu(period=1):
    return (((scene.frame_current - 1) % NFR) / NFR * period) % 1.0

def unshadow():
    try: scene.cycles.denoising_input_passes = 'RGB'
    except Exception: pass
    for o_ in bpy.data.objects:
        if o_.name.startswith(('Glass', 'Spout', 'Pool', 'Collect', 'wd')): o_.visible_shadow = False

# ---------------------------------------------------------------- scene: filter / separation
def scene_filter():
    studio_world(); lights3((0, .3, 0), 1.1); floor_catcher(0, 0, 8)
    mats = [M_stone(i) for i in range(3)]; soil = mat_plain('SoilPlain', (.45, .33, .2), .9) if os.environ.get('SOILPLAIN') else M_soilfine(); glass = pane_mat('LabGlass')
    fabric = mat_plain('Fabric', (.92, .9, .82), .95, 0.0, .6); tan = mat_plain('Fines', (.5, .36, .2), .9, 0.0, .3); steel = mat_plain('BaseW', (.9, .9, .88), .3, 0.0, .1)
    HX, HZ, YS, YF, YT = .36, .25, .14, .016, .62; fines_l = []; fines_r = []
    for side, cx in (('L', -.5), ('R', .5)):
        box('Plate' + side, cx - HX - .03, cx + HX + .03, -.03, 0, -HZ - .03, HZ + .03, steel, .004)
        ubox('Soil' + side, cx - HX, cx + HX, 0, YS, -HZ, HZ, soil, .003, .35)
        floor_y = YS
        if side == 'L': ubox('Filter', cx - HX, cx + HX, YS + .004, YS + .004 + YF, -HZ, HZ, fabric, .001, .2); floor_y = YS + .004 + YF
        pack(cx - HX + .005, cx + HX - .005, -HZ + .005, HZ - .005, floor_y, 4, .078, (.034, .046), 7 if side == 'L' else 8, mats)
        for nm, (a0, a1, b0, b1) in (('F', (cx - HX, cx + HX, HZ, HZ + .005)), ('B', (cx - HX, cx + HX, -HZ - .005, -HZ)), ('E', (cx + HX, cx + HX + .005, -HZ, HZ)), ('W', (cx - HX - .005, cx - HX, -HZ, HZ))):
            box('Glass' + side + nm, a0, a1, (YS if nm == 'F' else 0), YT, b0, b1, glass, .0005)
        rng = random.Random(3 if side == 'L' else 4); lst = fines_l if side == 'L' else fines_r
        for k in range(150 if not QUICK else 40):
            x = rng.uniform(cx - HX + .01, cx + HX - .01); z = rng.uniform(HZ - .09, HZ - .012); ob = sphere('fn%s%d' % (side, k), (x, YS + .01, z), .0046, tan, 1)
            lst.append((ob, x, z, rng.random(), rng.uniform(.4, 1.0), rng.uniform(-1, 1)))
    water = glass_mat('Water', (.8, .92, 1.0), .0, 1.33); drops = []
    for side, cx in (('L', -.5), ('R', .5)):
        rng = random.Random(11 if side == 'L' else 12)
        for k in range(16 if not QUICK else 6):
            ob = sphere('wd%s%d' % (side, k), (cx, .5, HZ - .05), .012, water, 2, (1, 1.25, 1)); drops.append((ob, side, cx + rng.uniform(-HX + .04, HX - .04), rng.uniform(HZ - .1, HZ - .02), rng.random()))
    co = persp((0, .3, 0), 10, 12, 3.6, 52, 2.0); bpy.context.view_layer.update()
    proj = lambda p: (lambda c: [round(c.x, 4), round(1 - c.y, 4)])(world_to_camera_view(scene, co, V(*p)))
    PINS['static'] = {'a': proj((-.5, YT + .05, HZ)), 'b': proj((.5, YT + .05, HZ)), 'f': proj((-.5 - HX, YS + .02, HZ)), 's': proj((-.5 - HX, YS * .5, HZ)), 'g': proj((-.5 - HX, .3, HZ))}
    def fn(s):
        u = uu()
        for ob, x, z, ph, sp, jx in fines_l:       # compatible: the fines press up against the filter and stop there
            t = (u + ph) % 1.0; lift = .012 * smooth(t * 1.6) * (1 - smooth((t - .75) * 4)); ob.location = V(x + .002 * math.sin(6.28 * t + jx * 3), YS + .01 + lift, z)
        for ob, x, z, ph, sp, jx in fines_r:       # incompatible: the fines rise into the voids between the stones, then settle back
            t = (u * sp + ph) % 1.0; h = .2 * smooth(t * 1.4) * (1 - smooth((t - .72) * 3.6)); ob.location = V(x + .006 * math.sin(6.28 * t + jx * 3) * h * 6, YS + .01 + h * (.6 + .4 * abs(jx)), z - h * .12)
        for ob, side, x, z, ph in drops:           # water: down through the stones; through the filter on the left, hanging up in the stones on the right
            t = (u * (1.0 if side == 'L' else .65) + ph) % 1.0; ytop, ybot = YT - .02, (YS + .03 if side == 'L' else YS + .2); y = ytop - (ytop - ybot) * t ** 1.3 + .004 * math.sin(40 * t)
            sc_ = smooth(t * 8) * (1 - smooth((t - .9) * 10)); ob.location = V(x + .004 * math.sin(11 * t), y, z); ob.scale = (sc_, 1.25 * sc_, sc_)
    ANIMFN[0] = fn; ANIMEXTRA[0] = PINS; unshadow()
    render(co, {})

# ---------------------------------------------------------------- scene: drainage layer (outlet working / closed)
def scene_drain(outlet=True):
    studio_world(); lights3((0, .3, 0), 1.1); floor_catcher(0, 0, 8)
    mats = [M_stone(i) for i in range(3)]; sub = M_laterite(); base = M_base(); glass = pane_mat('LabGlass'); dark = mat_plain('BackDark', (.07, .06, .055), .8)
    XW, ZD, Ys, Yd, Yb = 1.25, .3, .22, .5, .62
    ubox('Subgrade', -XW, XW, 0, Ys, -ZD, ZD, sub, .004, 1.0)
    CX, CG = -.62, .02
    ubox('BaseL', -XW, CX - CG, Yd, Yb, -ZD, ZD, base, .003, .8); ubox('BaseR', CX + CG, XW, Yd, Yb, -ZD, ZD, base, .003, .8)
    face_rocks(-XW, CX - CG, Yd + .008, Yb - .008, ZD, 150 if not QUICK else 40, .006, .015, 5, mats, .5); face_rocks(CX + CG, XW, Yd + .008, Yb - .008, ZD, 300 if not QUICK else 60, .006, .015, 6, mats, .5)
    box('BackWall', -XW, XW, Ys, Yd, -ZD, -ZD + .01, dark, .002)
    box('Glass_front', -XW, XW, Ys, Yd, ZD - .004, ZD, glass, .0005); box('WallL', -XW, -XW + .02, Ys, Yd, -ZD, ZD, dark, .002)
    if outlet: box('WallR_up', XW - .02, XW, Ys + .1, Yd, -ZD, ZD, dark, .002)             # an open slot at the foot of the right wall: the edge outlet
    else: box('WallR', XW - .02, XW, Ys, Yd, -ZD, ZD, dark, .002)
    pack(-XW + .03, XW - .03, ZD - .27, ZD - .02, Ys + .004, 4, .075, (.034, .05), 21, mats)                 # the open granular layer: rows of coarse stones behind the glass
    pack(-XW + .03, XW - .03, -ZD + .03, ZD - .27, Ys + .004, 3, .1, (.04, .055), 22, mats)
    if outlet:
        box('Spout', XW, XW + .22, Ys + .02, Ys + .1, -.15, .15, glass, .001)
    water = glass_mat('Water', (.78, .9, 1.0), .0, 1.33); drops = []; rng = random.Random(33)
    for k in range(26 if not QUICK else 8):
        ob = sphere('wd%d' % k, (CX, .9, 0), .015, water, 2, (1, 1.25, 1)); drops.append((ob, rng.uniform(.12, .27), rng.random(), rng.uniform(-.06, .06)))
    lvl = None
    if not outlet:                                 # no outlet: the water collects, a tinted level climbing through the stones
        wmat = glass_mat('Collect', (.6, .8, 1.0), .0, 1.33); lvl = box('Collect', -XW + .02, XW - .02, 0, 1, -ZD + .012, ZD - .006, wmat, 0); lvl.location.z = Ys
    co = persp((.08, .34, 0), 12, 11, 4.7, 52, 2.0); bpy.context.view_layer.update()
    proj = lambda p: (lambda c: [round(c.x, 4), round(1 - c.y, 4)])(world_to_camera_view(scene, co, V(*p)))
    PINS['static'] = {'c': proj((CX, Yb + .04, ZD)), 'b': proj((-XW + .25, (Yd + Yb) / 2, ZD)), 'd': proj((-XW + .25, (Ys + Yd) / 2, ZD)), 's': proj((-XW + .25, Ys / 2, ZD)), 'o': proj((XW + .02, Ys + .06, ZD))}
    def fn(s):
        u = uu()
        for ob, zj, ph, xj in drops:
            t = (u + ph) % 1.0; env = smooth(t * 10) * (1 - smooth((t - .93) * 14)); tend = .82 if outlet else .72
            if t < .2: x, y = CX + xj * .2, .95 - (.95 - (Yb + .01)) * (t / .2) ** 1.4
            elif t < .3: k = (t - .2) / .1; x, y = CX + xj * .1 * (1 - k), (Yb + .01) - (Yb - Yd + .09) * k
            elif t < tend: k = (t - .3) / (tend - .3); x = CX + (XW - .06 - CX) * k; y = Yd - .09 - .06 * math.sin(math.pi * k) - (.02 * k if outlet else .0) + .012 * math.sin(30 * k)
            else:
                k = (t - tend) / (1 - tend)
                if outlet: x, y = XW - .06 + .3 * k, Ys + .05 - .26 * k * k
                else: x, y = XW - .06, Yd - .15; env *= (1 - k)
            ob.location = V(x, y, zj if t > .2 else zj * .4); ob.scale = (env, 1.25 * env, env)
        if lvl is not None:
            h = (Yd - .06 - Ys) * smooth(u * 1.15) * (1 - smooth((u - .88) * 8)); lvl.scale.z = max(.001, h); lvl.location.z = Ys
    ANIMFN[0] = fn; ANIMEXTRA[0] = PINS; unshadow()
    render(co, {})

SCENES = {'load': scene_load, 'filter': scene_filter, 'drain': lambda: scene_drain(True), 'drainoff': lambda: scene_drain(False)}
if not os.environ.get('NOSCENE'): SCENES[GS]()
