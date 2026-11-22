# OM GROUP - WMM stills: the laying stages (transport, spread, roll, check). exec'd by build-road.py.

X0, X1 = -19.0, 26.0

def polish_machines():
    """a little more paint depth and real steel: clear-coat on the yellow and white paint, metallic machined parts, rubber tyres"""
    for m in bpy.data.materials:
        if not m.use_nodes: continue
        P = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if P is None: continue
        try:
            if m.name.startswith(('PaintYellow', 'PaintWhite')):
                P.inputs['Coat Weight'].default_value = .65; P.inputs['Coat Roughness'].default_value = .10; P.inputs['Roughness'].default_value = .34
            elif m.name.startswith(('MachinedSteel', 'RimSteel', 'ChromeRod')):
                P.inputs['Metallic'].default_value = .95; P.inputs['Roughness'].default_value = .28
            elif m.name.startswith(('GraphiteSteel', 'DarkSteel')):
                P.inputs['Metallic'].default_value = .85; P.inputs['Roughness'].default_value = .42
            elif m.name.startswith('TyreRubber'):
                P.inputs['Roughness'].default_value = .86
        except Exception: pass

def tipper_pose(nodes, ang_deg):
    """tip the body about its rear hinge and let the 3-stage hoist follow (same rule as the web scene)"""
    bed = nodes['Bed']; bed.rotation_mode = 'XYZ'; bed.rotation_euler.y = -math.radians(ang_deg)
    bpy.context.view_layer.update()
    hoist, s1, s2, tip = nodes['Cyl_Hoist'], nodes['Hoist_Stage1'], nodes['Hoist_Stage2'], nodes['Tip_Hoist']
    o = hoist.matrix_world.translation.copy(); t = tip.matrix_world.translation.copy(); d = t - o
    # the hoist plane is the truck's x-z plane; the cylinder's local x axis points along the hoist
    ln = math.hypot(d.x, d.z); a = math.atan2(d.z, d.x); d0 = 1.3997856978837873
    root = nodes['OMGroupTipper']; yaw = root.rotation_euler.z
    hoist.rotation_mode = 'XYZ'; hoist.rotation_euler.y = -(a - (0 if abs(yaw) < 1e-3 else 0))
    bpy.context.view_layer.update()
    e = max(0.0, ln - d0); s1.location.x = e / 2; s2.location.x = e

def aggregate_stream(p0, p1, n, seed, mats, spread=.9):
    """stones falling from the tail of the body into the hopper: n angular stones strung along a short arc"""
    rng = random.Random(seed); meshes = [rock_mesh(300 + i, mats[i % len(mats)], 'fall%d' % i) for i in range(8)]
    for k in range(n):
        t = rng.random() ** .8; x = p0[0] + (p1[0] - p0[0]) * t + rng.uniform(-.15, .15); z = p0[2] + rng.uniform(-spread, spread) * (.6 + .5 * t)
        y = p0[1] + (p1[1] - p0[1]) * t * t + .12 * math.sin(math.pi * t) + rng.uniform(-.06, .08)
        s = rng.uniform(.06, .17); ob = new_obj('fl%d' % k, meshes[rng.randrange(len(meshes))]); ob.scale = (s * rng.uniform(.9, 1.5), s * rng.uniform(.6, 1), s * rng.uniform(.8, 1.3))
        ob.rotation_euler = (rng.uniform(0, 6.3), rng.uniform(0, 6.3), rng.uniform(0, 6.3)); ob.location = V(x, y, z)
        STREAM.append((ob, t, x - (p0[0] + (p1[0] - p0[0]) * t), z - p0[2], y - (p0[1] + (p1[1] - p0[1]) * t * t + .12 * math.sin(math.pi * t)), p0, p1, rng.uniform(-spread, spread)))

def tarp_mat():
    m = mat_plain('Tarp', (.045, .07, .09), .62, 0, 1.4)
    return m

def covered_load(xT, zT, y_floor, mats):
    """a heaped load under a tarpaulin (tipper faces -x: yaw pi), as a displaced tarp over the body"""
    cx = xT + .65
    rim = y_floor + 2.15
    def h(x, z):
        u = (x - cx) / 3.7; v = z / 1.15
        bump = max(0.0, 1 - (u * u) ** 1.0 - (v * v) ** 1.0) ** .6
        base = rim + .02 + 1.05 * bump
        fold = .035 * noise2(x, z, 3.4, 4) + .012 * noise2(x, z, 11, 1)
        edge = max(0.0, (abs(z) - 1.16)) * 1.6                              # the tarp drapes over the side walls
        return base + fold - edge
    grid_surface('Tarp', cx - 3.9, cx + 3.9, zT - 1.42, zT + 1.42, 170, 60, h, tarp_mat(), 1.0)
    for i in range(5):                                                       # tie-down ropes
        x = cx - 3.0 + i * 1.5
        pts = [(x, h(x, zT + k * .1) + .03, zT + k * .1) for k in range(-14, 15)]
        for a, b in zip(pts[:-1], pts[1:]): cyl('Rope', a, b, .018, mat_plain('Rope', (.5, .35, .1), .8, 0, 0), 6)

def staff(x, z, y0, mats_dummy=None):
    black = mat_plain('StaffB', (.03, .03, .03), .5, 0, 0); white = mat_plain('StaffW', (.85, .85, .83), .5, 0, 0); red = mat_plain('StaffR', (.7, .05, .03), .5, 0, 0)
    for i in range(30):
        c = red if i % 10 == 0 else (black if i % 2 else white)
        box('S%d' % i, x - .04, x + .04, y0 + i * .1, y0 + (i + 1) * .1, z - .015, z + .015, c, .0005)

def level_tripod(x, z, y0):
    steel = mat_plain('TripodSteel', (.5, .5, .52), .35, .9, 0); wood = mat_plain('TripodWood', (.5, .33, .15), .6, 0, 0); yel = mat_plain('LevelYel', (.8, .55, .02), .35, 0, 0); blk = mat_plain('LevelBlk', (.02, .02, .02), .4, 0, 0)
    for k in range(3):
        a = k * 2 * math.pi / 3 + .4; cyl('Leg', (x, y0 + 1.45, z), (x + .62 * math.cos(a), y0, z + .62 * math.sin(a)), .018, wood, 8)
    cyl('Head', (x, y0 + 1.42, z), (x, y0 + 1.5, z), .06, steel, 16)
    cyl('Body', (x, y0 + 1.5, z), (x, y0 + 1.66, z), .05, yel, 18); cyl('Scope', (x - .14, y0 + 1.7, z), (x + .14, y0 + 1.7, z), .026, blk, 14); cyl('Lens', (x + .14, y0 + 1.7, z), (x + .16, y0 + 1.7, z), .03, steel, 14)

def straightedge(x, z0, z1, y):
    al = mat_plain('Alu', (.72, .73, .75), .3, .95, 0)
    box('SE', x - .03, x + .03, y, y + .1, z0, z1, al, .003); box('SEg', x - .05, x + .05, y + .1, y + .105, (z0 + z1) / 2 - .02, (z0 + z1) / 2 + .02, mat_plain('Gauge', (.9, .5, .05), .5, 0, 0), 0)

def cone(x, z, y):
    org = mat_plain('Cone', (.9, .22, .03), .5, 0, 0); wh = mat_plain('ConeW', (.9, .9, .88), .5, 0, 0)
    cyl('C1', (x, y + .02, z), (x, y + .5, z), .06, org, 20, r1=.16); cyl('C2', (x, y + .24, z), (x, y + .32, z), .095, wh, 20, r1=.1); box('Cb', x - .21, x + .21, y, y + .03, z - .21, z + .21, mat_plain('ConeB', (.05, .05, .05), .7, 0, 0), .004)

# =========================================================================================== STAGES
def stage_lay():
    st = STAGE
    P = {'transport': 2.0, 'spread': 6.0, 'roll': 9.0, 'check': 60.0}[st]
    xs = P - 3.35 if st != 'check' else X1 + 2
    xr = {'transport': xs - 9.0, 'spread': xs - 12.0, 'roll': xs - 8.5, 'check': X1 + 1}[st]
    terrain(); far_land(); S = Strip(xs, xr); mats = [M_stone(i) for i in range(3)]
    world_outdoor(sun_elev=32, sun_rot=-52, strength=.4); sun_light(32, -52, 3.6)
    g = Y_GSB + .0015
    if st in ('transport', 'spread', 'roll'): paver, pn = import_machine('paver', (P, g, 0), 0.0)
    cam_t = (P + 4, 1.8, 0); az, el, dist, lens, fs = 18, 6, 34, 38, 5.0
    if st == 'transport':
        xT = P + 17.0; T, tn = import_machine('tipper', (xT, g, 0.15), math.pi); covered_load(xT, 0.15, g + 1.3, mats)
        roller, _ = import_machine('roller', (xr - 2.3, S.hc(xr, 0), 0.5), 0.0)
        cam_t = (P + 6, 2.0, 0); az, el, dist, lens, fs = 20, 5, 36, 36, 6.0
    if st == 'spread':
        T, tn = import_machine('tipper', (P + 10.3, g, 0), 0.0); tipper_pose(tn, 27)
        aggregate_stream((P + 5.3, g + 2.3, 0), (P + 3.6, g + 1.45, 0), 150 if not QUICK else 60, 7, mats, .9)
        heap('HopperPile', P + 3.5, 0, 1.3, .95, M_wmm(.1), .7, n=110, seed=5, base=g + 1.18, wob=.08)
        roller, _ = import_machine('roller', (xr - 2.3, S.hc(xr, 0), 0.5), 0.0)
        cam_t = (P + 4.4, 2.0, 0); az, el, dist, lens, fs = 17, 9, 21.5, 40, 5.0
    if st == 'roll':
        roller, rn = import_machine('roller', (xr - 2.3, S.hc(xr, 0) + .02, 0.3), 0.0); roller.rotation_euler.y = -math.atan((Y_WL - Y_WC) / 3.0)
        cam_t = (xr + .5, 1.9, 0); az, el, dist, lens, fs = 24, 7, 20, 40, 4.5
    if st == 'check':
        roller, _ = import_machine('roller', (-12.0, S.hc(-12.0, 0), -1.2), 0.0)
        y = S.hc(0, 0); straightedge(-1.0, -2.6, 2.6, y); staff(2.6, 1.6, y); level_tripod(-6.0, -1.0, y)
        for k in range(7): cone(-9.5 + k * 3.2, 3.2, y)
        cam_t = (-2.0, 1.2, 0); az, el, dist, lens, fs = 26, 10, 15.5, 38, 6.0
    if xs < X1 - 1: scatter_rocks((max(xs, X0), X1 - .3, -ZH + .15, ZH - .15), 900 if not QUICK else 250, .012, .06, S.hg, 23, mats, sink=.7)
    # loose aggregate lying on the loose mat and fines on the compacted surface
    if xs > xr + .3: scatter_rocks((xr, xs - .2, -ZH + .15, ZH - .15), 2600 if not QUICK else 700, .03, .12, S.hl, 21, mats)
    if xr > X0 + 1: scatter_rocks((X0 + .2, min(xr, X1) - .1, -ZH + .15, ZH - .15), 900 if not QUICK else 220, .012, .045, S.hc, 22, mats, sink=.6)
    polish_machines()
    co = camera(cam_t, az, el, dist, lens, fstop=fs)
    hcx = S.hc(xr, 0)
    pts = {'transport': {'tipper': (P + 17.0 + .6, g + 4.3, .15), 'paver': (P - .6, g + 4.3, 0), 'roller': (xr - 2.8, hcx + 4.1, .5), 'mat': ((xr + xs) / 2, Y_WL + .2, 0)},
           'spread': {'tipper': (P + 10.0, g + 4.8, 0), 'hopper': (P + 3.6, g + 2.3, 0), 'mat': (xs - 2.6, Y_WL + .2, 0), 'paver': (P - .6, g + 4.3, 0)},
           'roll': {'roller': (xr - 2.6, hcx + 4.1, .3), 'compacted': (xr - 6.0, Y_WC + .15, 0), 'loose': ((xr + xs) / 2 + .8, Y_WL + .15, 0), 'paver': (P - .6, g + 4.3, 0)},
           'check': {'straight': (-1.0, S.hc(0, 0) + .45, 0), 'staff': (2.6, S.hc(0, 0) + 3.3, 1.6), 'level': (-6.0, S.hc(0, 0) + 2.1, -1.0), 'roller': (-12.4, S.hc(-12.0, 0) + 4.1, -1.2)}}[st]
    finish_render(co, pts)

if STAGE in ('transport', 'spread', 'roll', 'check'):
    stage_lay()
