"""OM GROUP - VSI stone-crushing plant (M-Sand page, "How M-Sand is produced"), the 3D twin of the "VSI Stone Crusher at Banda Wafoli" drawing on the home page.

  blender -b --factory-startup -P scripts/excavator3d/build-crusher.py -- <repo root>

Output
  assets/3d/om-group-vsi-crusher.glb     the plant: a vertical-shaft-impact crusher on a steel tower (hopper, housing with the OM GROUP mark, two motors on orange brackets, discharge chute),
                                         a rising feed conveyor into the hopper, a product conveyor down to the graded stockpile, the source-rock pile behind it
  assets/3d/om-group-vsi-crusher.json    anchors the web scene needs (belt paths, hopper, pile apex, shadow frame)
  assets/3d/om-group-vsi-crusher-shadow.webp   (made by bake-plant-shadow.py + finish-plant-shadow.js from the saved .blend)
  _review/excavator3d/om-group-vsi-crusher.blend

Layout follows the home-page drawing (viewBox 64 46 256 172): tower legs at drawing x 154 / 186 / 218, deck at y 138, product conveyor from (196, 200) up-left to (96, 126), feed conveyor from (330, 158)
up-left to the hopper rim at (204, 68), stockpile 0..186, rock pile 222..322. 1 drawing unit = 1/14 m, so the tower is about 4.6 m between legs and 9.6 m to the top of the hopper.
Metres, three.js axes (x right, y up, z toward the viewer). Materials, helpers and export come from build-plant.py's header and bpy_helpers.py.
"""
import os, sys
_argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
_ROOT = os.path.abspath(_argv[0] if _argv else os.getcwd())
_src = open(os.path.join(_ROOT, 'scripts', 'excavator3d', 'build-plant.py')).read()
_head = _src[:_src.index('# ================================================================ GROUND')]
_head = _head.replace('"""OM GROUP - ready-mix batching plant', '"""(header reused) OM GROUP - ready-mix batching plant', 1)
_head = _head.replace("'om-group-rmc-plant.glb'", "'om-group-vsi-crusher.glb'").replace("root = empty('OMGroupRMCPlant')", "root = empty('OMGroupVSICrusher')")
exec(_head)

S = 1 / 14.0
X = lambda sx: (sx - 160) * S
Y = lambda sy: (210 - sy) * S
GREY = None

# extra materials for the crusher: weathered stone, steel, dust-grey paint
MAT['pileRock'] = noisy('PileRock', (.24, .24, .25), .5, 41, spl=(.42, .41, .40), speck=.06, nstr=1.5, rough=(.8, .2))
MAT['pileGrit'] = noisy('PileGrit', (.50, .495, .485), .4, 42, spl=(.66, .65, .63), speck=.08, nstr=1.5, rough=(.82, .18))
MAT['pileDark'] = noisy('PileDark', (.34, .34, .35), .4, 43, spl=(.5, .5, .5), speck=.05, nstr=1.4, rough=(.8, .2))
MAT['pileB'] = noisy('PileMid', (.42, .415, .41), .4, 45, spl=(.6, .59, .58), speck=.07, nstr=1.4, rough=(.82, .18))
MAT['concrete'] = noisy('YardConcrete', (.60, .585, .56), .1, 46, spl=(.5, .49, .47), speck=.02, nstr=.4, rough=(.88, .08))
MAT['gravel'] = noisy('YardGravel', (.30, .285, .26), .35, 44, speck=.1, nstr=1.0, rough=(.9, .08), scale=1.4)
MAT['paintDark'] = pbr('PaintCharcoal', (.032, .034, .038), .35, .5, IMG_N, .35, rough_img('paintDark', .5, .07), coat=.1)
MAT['paintOrangeD'] = pbr('PaintOrangeDeep', tuple(c * .78 for c in ORANGE), 0.0, .42, IMG_N, .15, rough_img('orangeD', .42, .05), coat=.3)
MAT['silver'] = pbr('PanelSilver', (.76, .77, .79), .55, .32, IMG_N, .28, rough_img('silver', .32, .05), coat=.25)

# ---------------------------------------------------------------- local helpers
def grey_rails(bp, bm, p0, p1, y, h=1.05, step=1.4, r=.026):
    a = Vector(p0); b = Vector(p1); L = (b - a).length; n = max(1, int(L / step)); pts = [a + (b - a) * i / n for i in range(n + 1)]
    for p in pts: cyl_between(bp, (p.x, y, p.y), (p.x, y + h, p.y), r, 6)
    for k in (h, h * .52): cyl_between(bm, (a.x, y + k, a.y), (b.x, y + k, b.y), r, 6)
def frustum(bm, c, yb, yt, hb, ht, shape=(1, 1), rot=0.0):
    """a square frustum between two heights, centre c = (x, z); hb / ht = half sizes at the bottom / top"""
    rows = []
    for yy, hh in ((yb, hb), (yt, ht)):
        rows.append([bm.verts.new(V(c[0] + sx * hh * shape[0], yy, c[1] + sz * hh * shape[1])) for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
    for k in range(4): bm.faces.new((rows[0][k], rows[0][(k + 1) % 4], rows[1][(k + 1) % 4], rows[1][k]))
    bm.faces.new(rows[0][::-1]); bm.faces.new(rows[1])
def frustum_pts(bm, bot, top):
    """a hollow-looking chute: two quads of corner points (three coords) joined by sides"""
    a = [bm.verts.new(V(*p)) for p in bot]; b = [bm.verts.new(V(*p)) for p in top]
    for k in range(4): bm.faces.new((a[k], a[(k + 1) % 4], b[(k + 1) % 4], b[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

def conveyor(Ap, Bp, w=1.2, legs=(), z=0.0, tail_r=.22, head_r=.3, guard=True, name=''):
    """a belt conveyor from Ap (tail) to Bp (head) in the x-y plane: belt, trough idlers, side frames, truss, orange guard rails, pulleys and legs on footings"""
    A0 = Vector(Ap); D = Vector(Bp) - A0; LEN = D.length; ex = D.normalized(); nx = Vector((-ex.y, ex.x))
    if nx.y < 0: nx = -nx
    inc = lambda u, v, zz: ((A0 + ex * u + nx * v).x, (A0 + ex * u + nx * v).y, z + zz)
    bl, rl, bf, ro = A('belt'), A('roller'), A('beam'), A('orangeRail')
    beam(bl, inc(0, .08, 0), inc(LEN, .08, 0), w, .06); beam(bl, inc(0, -.34, 0), inc(LEN, -.34, 0), w - .1, .05)
    for s in (-1, 1):
        beam(bf, inc(0, -.14, s * (w / 2 + .1)), inc(LEN, -.14, s * (w / 2 + .1)), .07, .34); beam(bf, inc(0, .16, s * (w / 2 + .1)), inc(LEN, .16, s * (w / 2 + .1)), .05, .12)
        n = int(LEN / 1.0)
        for k in range(n):
            cyl_between(bf, inc(k * LEN / n, -.3, s * (w / 2 + .1)), inc((k + 1) * LEN / n, -.62, s * (w / 2 + .1)), .02, 5); cyl_between(bf, inc((k + 1) * LEN / n, -.3, s * (w / 2 + .1)), inc(k * LEN / n, -.62, s * (w / 2 + .1)), .02, 5)
        for v in (-.3, -.62): beam(bf, inc(0, v, s * (w / 2 + .1)), inc(LEN, v, s * (w / 2 + .1)), .07, .07)
        if guard:
            for k in range(int(LEN / 1.4) + 1):
                u = k * 1.4; cyl_between(ro, inc(u, .18, s * (w / 2 + .16)), inc(u, 1.1, s * (w / 2 + .16)), .026, 6)
            for h in (1.08, .62): cyl_between(ro, inc(0, h, s * (w / 2 + .16)), inc(LEN, h, s * (w / 2 + .16)), .026, 6)
    for k in range(int(LEN / 1.2) + 1): beam(bf, inc(k * 1.2, -.62, -(w / 2 + .1)), inc(k * 1.2, -.62, w / 2 + .1), .07, .07)
    for k in range(int(LEN / .8) + 1):
        u = k * .8 + .3
        if u < LEN - .2: cyl_between(rl, inc(u, .02, -w / 2 + .06), inc(u, .02, w / 2 - .06), .045, 10)
    for u, r_ in ((0, tail_r), (LEN, head_r)): cyl_between(rl, inc(u, -.12, -(w / 2 + .12)), inc(u, -.12, w / 2 + .12), r_, 24)
    for f in legs:
        p = A0 + ex * LEN * f; top = p.y - .62
        if top < 1.4: continue
        for s in (-1, 1):
            zz = z + s * (w / 2 + .1)
            for dx in (-.55, .55): beam(bf, (p.x + dx, 0, zz), (p.x, top, zz), .13, .13); footing(p.x + dx, zz, .75)
        beam(bf, (p.x, top, z - (w / 2 + .1)), (p.x, top, z + (w / 2 + .1)), .12, .12); xbrace(bf, p.x - .55, p.x + .55, 1.0, max(top - .5, 1.6), z + (w / 2 + .1), .03) if top > 2.6 else None
    return A0, ex, nx, LEN

def pile(name, mats, cx, cz, rx, rz, h, seed, nst, ssz, rough=.08, y0=0.0, surf_mat=None):
    """a conical heap (angle of repose, concave foot, a ragged outline) with loose stones laid over it. mats = materials for the stones (one object per material)"""
    r = random.Random(seed); bm = bmesh.new(); NR, NS = 44, 110; g = []
    for i in range(NR + 1):
        row = []
        for j in range(NS):
            th = 2 * math.pi * j / NS; rr = i / NR; wob = 1 + .07 * math.sin(3 * th + seed) + .05 * math.sin(5 * th + 2 * seed) + .03 * math.sin(9 * th + seed * .3)
            n1 = noise.noise(Vector((math.cos(th) * rr * 3 + seed, math.sin(th) * rr * 3, seed * .37))) * rough; rho = rr * wob
            hh = h * (1 - rr ** 1.55) ** 1.15 * (1 + n1) if rr < 1 else 0.0
            row.append(bm.verts.new(V(cx + rx * rho * math.cos(th), y0 + max(hh, 0) + (.0 if i == NR else .0), cz + rz * rho * math.sin(th))))
        g.append(row)
    for i in range(NR):
        for j in range(NS): bm.faces.new((g[i][j], g[i][(j + 1) % NS], g[i + 1][(j + 1) % NS], g[i + 1][j]))
    bm.faces.new([v for v in g[0]][::-1]) if False else None
    surf = [(v.co.copy(), i) for i, row in enumerate(g) for v in row if i < NR - 2]
    for p in bm.faces: p.smooth = True
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); me.materials.append(surf_mat or mats[0])
    for p in me.polygons: p.use_smooth = True
    me.update()
    box_uv(ob, 1.0); ob.parent = root
    sb = [bmesh.new() for _ in mats]
    for k in range(nst):
        p, i = r.choice(surf); s_ = r.uniform(*ssz) * (1.0 + .5 * (1 - i / NR)); m = Matrix.Translation(p + Vector((0, 0, s_ * .1))) @ Matrix.Rotation(r.uniform(0, 6.28), 4, 'Z') @ Matrix.Rotation(r.uniform(0, 6.28), 4, 'X') @ Matrix.Diagonal((s_ * r.uniform(.8, 1.35), s_ * r.uniform(.6, 1.0), s_ * r.uniform(.5, .9), 1))
        out = bmesh.ops.create_icosphere(sb[r.randrange(len(mats))], subdivisions=1, radius=1.0, matrix=m)
        for v in out['verts']: v.co += Vector((r.uniform(-1, 1), r.uniform(-1, 1), r.uniform(-1, 1))) * s_ * .24
    for k, b in enumerate(sb):
        me = bpy.data.meshes.new(name + '_Stones%d' % k); b.to_mesh(me); b.free(); o2 = bpy.data.objects.new(name + '_Stones%d' % k, me); scene.collection.objects.link(o2); me.materials.append(mats[k])
        for p in me.polygons: p.use_smooth = False
        box_uv(o2, .9); o2.parent = root
    return ob

# ================================================================ GROUND
bm = A('concrete'); add_box(bm, (1.7, -.1, -.4), (31.0, .2, 16.0))
# ================================================================ TOWER (three legs across, two deep)
TX = [X(154), X(186), X(218)]; TZ = 2.1; HT = Y(142); col = A('orangeRail'); colD = A('beam')
for i, x in enumerate(TX):
    for z in (-TZ, TZ):
        add_box(A('orangeRail') if i < 2 else A('orangeRail'), (x, HT / 2, z), (.36, HT, .36)); footing(x, z, 1.05)
    for yy in (Y(176), Y(141)):
        if i == 2 or (i == 0 and yy > 4.0): add_box(colD, (x, yy - .12, 0), (.2, .26, 2 * TZ))
for z in (-TZ, TZ):
    for yy in (Y(176), Y(141)): add_box(colD, ((TX[0] + TX[2]) / 2, yy - .12, z), (TX[2] - TX[0], .26, .2))
    for (xa, xb) in ((TX[0], TX[1]), (TX[1], TX[2])):
        xbrace(colD, xa, xb, Y(208), Y(179), z, .045); xbrace(colD, xa, xb, Y(173), Y(146), z, .045)
for x in (TX[1], TX[2]): xbrace(colD, -TZ, TZ, Y(208), Y(179), x, .04, axis='x')
# platform at drawing y 173: grating strips either side of the product belt, with rails
g = A('grate'); px0, px1 = X(148), X(224); py = Y(173)
for z0, z1 in ((.82, 2.5), (-2.5, -.82)):
    add_box(g, ((px0 + px1) / 2, py, (z0 + z1) / 2), (px1 - px0, .09, z1 - z0)); add_box(A('beam'), ((px0 + px1) / 2, py - .11, z0), (px1 - px0, .16, .1)); add_box(A('beam'), ((px0 + px1) / 2, py - .11, z1), (px1 - px0, .16, .1))
for z in (-2.5, 2.5): grey_rails(A('galv'), A('galv'), (px0, z), (px1, z), py + .05)
for x in (px0, px1):
    for (z0, z1) in ((.82, 2.5), (-2.5, -.82)): grey_rails(A('galv'), A('galv'), (x, z0), (x, z1), py + .05) if x == px1 else None
# the top deck: drawing y 138..143, with the opening for the discharge chute, rails at y 128
dx0, dx1 = X(144), X(228); dy = Y(140.5); xc = TX[1]
deck_g = A('grate'); hx0, hx1, hz0, hz1 = xc - 1.05, xc + 1.05, -1.05, 1.05; DZ = 2.7
add_box(deck_g, ((dx0 + hx0) / 2, dy, 0), (hx0 - dx0, .12, 2 * DZ)); add_box(deck_g, ((hx1 + dx1) / 2, dy, 0), (dx1 - hx1, .12, 2 * DZ)); add_box(deck_g, (xc, dy, (-DZ + hz0) / 2), (hx1 - hx0, .12, hz0 + DZ)); add_box(deck_g, (xc, dy, (DZ + hz1) / 2), (hx1 - hx0, .12, DZ - hz1))
bb = A('motor'); add_box(bb, ((dx0 + dx1) / 2, Y(141) - .1, -DZ), (dx1 - dx0, .36, .2)); add_box(bb, ((dx0 + dx1) / 2, Y(141) - .1, DZ), (dx1 - dx0, .36, .2))
for k in range(int((dx1 - dx0) / 1.0) + 1):
    if not (hx0 - .1 < dx0 + k * 1.0 < hx1 + .1): add_box(bb, (dx0 + k * 1.0, Y(141) - .1, 0), (.14, .3, 2 * DZ))
for (p, q) in (((dx0, DZ), (dx1, DZ)), ((dx0, -DZ), (dx1, -DZ)), ((dx0, -DZ), (dx0, DZ)), ((dx1, -DZ), (dx1, DZ))): grey_rails(A('galv'), A('galv'), p, q, dy + .06, 1.05, 1.3)
# stair up the front of the tower to the deck (as the RMC plant has)
lx0, lx1 = dx0 - 1.9, dx0 + .4
for z in (3.0, 3.5): beam(A('beam'), (lx0, .12, z), (lx1, dy, z), .1, .1)
for k in range(1, 30):
    t = k / 30; cyl_between(A('roller'), (lx0 + (lx1 - lx0) * t, dy * t + .02, 3.0), (lx0 + (lx1 - lx0) * t, dy * t + .02, 3.5), .02, 6)
for z in (3.0, 3.5): cyl_between(A('galv'), (lx0 - .05, 1.05, z), (lx1 - .05, dy + 1.0, z), .024, 6)
footing(lx0, 3.0, .6); footing(lx0, 3.5, .6)
# ================================================================ THE VSI CRUSHER
cx_ = xc; y_base0, y_base1 = Y(138) + .0, Y(124)
add_cyl(A('paintDark'), (cx_, (y_base0 + y_base1) / 2 + .0, 0), 2.0, y_base1 - y_base0 + .08, 72)                    # rotor chamber base, charcoal
add_cyl(A('galv'), (cx_, y_base1 + .0, 0), 2.04, .08, 72); add_cyl(A('galv'), (cx_, y_base0 + .02, 0), 2.04, .08, 72)
for k in range(24):
    a = 2 * math.pi * k / 24; hexbolt(A('galv'), cx_ + 1.9 * math.cos(a), y_base1 + .08, 1.9 * math.sin(a), .045, .05, 'y')
y_fl0, y_fl1 = Y(125), Y(121)
add_cyl(A('silver'), (cx_, (y_fl0 + y_fl1) / 2, 0), 1.7, y_fl0 - y_fl1, 72)
y_h0, y_h1 = Y(121), Y(97)
add_cyl(A('silver'), (cx_, (y_h0 + y_h1) / 2, 0), 1.43, y_h1 - y_h0, 80)                                                     # the housing, silver
for yy in (y_h1 - .22,): add_cyl(A('vesselD'), (cx_, yy, 0), 1.455, .05, 80)
y_t0, y_t1 = Y(97), Y(93)
add_cyl(A('galv'), (cx_, (y_t0 + y_t1) / 2, 0), 1.64, y_t0 - y_t1, 72)
for k in range(28):
    a = 2 * math.pi * k / 28; hexbolt(A('galv'), cx_ + 1.54 * math.cos(a), y_t0 + .06, 1.54 * math.sin(a), .05, .06, 'y')
y_hp0, y_hp1 = Y(93), Y(77)
add_cyl(A('paintDark'), (cx_, (y_hp0 + y_hp1) / 2, 0), 1.14, y_hp1 - y_hp0, 72, r2=1.5)                                      # feed hopper (cone, charcoal) - bottom r1 (smaller), top r2
add_cyl(A('galv'), (cx_, Y(76.5), 0), 1.64, .16, 72)
add_cyl(A('paintDark'), (cx_, Y(76.5) - .02, 0), 1.66, .06, 72)
# the hopper: narrower at the bottom
# (add_cyl radius1 is the -y end) so the cone above is re-made with the right orientation:
# access door, inspection hatch, lifting lugs on the silver housing
add_box(A('vesselD'), (cx_ + 0, (y_h0 + y_h1) / 2 - .1, -1.43), (.9, .55, .06)); add_box(A('galv'), (cx_, (y_h0 + y_h1) / 2 - .1, -1.47), (.96, .62, .02))
for a in (math.pi / 3, math.pi * 1.05): add_box(A('galv'), (cx_ + 1.45 * math.cos(a), y_h1 + .1, 1.45 * math.sin(a)), (.18, .2, .18))
# motors on orange brackets (drawing x 146..162 and 210..226, y 106..122), each a finned cylinder along x with a terminal box and a belt-drive hub
for side, mx_ in ((-1, X(154)), (1, X(218))):
    my = (Y(106) + Y(122)) / 2; mr = .56
    add_cyl(A('motor'), (mx_, my, 0), mr, 1.1, 40, axis='x')
    for k in range(9): add_cyl(A('vesselD'), (mx_ - .45 + k * .11, my, 0), mr + .03, .035, 40, axis='x')
    add_cyl(A('motor'), (mx_ + side * .66, my, 0), .62, .22, 40, axis='x'); add_cyl(A('galv'), (mx_ - side * .62, my, 0), .46, .14, 40, axis='x')   # fan cowl on the outer end
    add_cyl(A('galv'), (mx_ + side * -.0 + (-side) * 0 + side * -.0, my, 0), .01, .01, 6) if False else None
    add_box(A('motor'), (mx_, my + mr + .16, 0), (.5, .3, .5)); add_box(A('galv'), (mx_, my + mr + .33, 0), (.54, .03, .54))
    add_cyl(A('galv'), (mx_ - side * .0, my, 0), .0001, .0001, 3) if False else None
    for dz in (-.4, .4): add_box(A('motor'), (mx_, my - mr - .1, dz), (1.0, .14, .22))
    # orange bracket post to the housing and a gusset
    bx_ = X(163) if side < 0 else X(209)
    add_box(A('orangeRail'), (bx_, (Y(102) + Y(124)) / 2, 0), (.43, Y(102) - Y(124), 1.4)); add_box(A('orangeRail'), ((bx_ + mx_) / 2, Y(124) + .1, 0), (abs(bx_ - mx_) + .4, .1, 1.1))
    add_cyl(A('galv'), (bx_ + side * .0, Y(112), 0), .3, .1, 30, axis='x')
add_box(A('beam'), (cx_ - 1.2, Y(143) - .3, 0), (.25, .5, 1.2)) if False else None
# discharge chute: from under the rotor chamber, through the deck opening, down to the product belt tail
chute_b = [(cx_ - .8, Y(143), -.8), (cx_ + .8, Y(143), -.8), (cx_ + .8, Y(143), .8), (cx_ - .8, Y(143), .8)]
tail = (X(196), Y(200))
chute_t = [(tail[0] - .55, tail[1] + .55, -.55), (tail[0] + .55, tail[1] + .55, -.55), (tail[0] + .55, tail[1] + .55, .55), (tail[0] - .55, tail[1] + .55, .55)]
frustum_pts(A('paintDark'), chute_t, chute_b)
add_box(A('galv'), (cx_, Y(143) - .0, 0), (1.9, .06, 1.9)); add_box(A('galv'), (tail[0], tail[1] + .55, 0), (1.3, .05, 1.3))
# ================================================================ FEED CONVEYOR (rising to the hopper, drawing (330,158) -> (204,68))
FB = (X(204), Y(68)); _sl = (Y(68) - Y(158)) / (X(204) - X(330)); FA = (X(330) + (Y(196) - Y(158)) / _sl, Y(196))
A0f, exf, nxf, LENf = conveyor(FA, FB, 1.2, legs=(.3, .55, .8))
# foot hopper at the tail, head hood over the crusher hopper
hf = A('paintDark'); frustum(hf, (FA[0] + .1, 0), 1.45, 3.1, .75, 1.55, shape=(1.0, 1.0)); add_box(A('galv'), (FA[0] + .1, 3.12, 0), (3.2, .06, 3.2))
for sx in (-1, 1):
    for sz in (-1, 1): add_box(A('beam'), (FA[0] + .1 + sx * 1.35, 1.1, sz * 1.35), (.24, 2.2, .24)); footing(FA[0] + .1 + sx * 1.35, sz * 1.35, .75)
hood = A('paintDark'); prism(hood, [(FB[0] - .75, FB[1] - .3), (FB[0] + .75, FB[1] - .3), (FB[0] + .75, FB[1] + .55), (FB[0] - .15, FB[1] + .55), (FB[0] - .75, FB[1] + .15)], -.78, .78)
# ================================================================ PRODUCT CONVEYOR (tail under the tower at drawing (196,200), head over the stockpile at (96,126))
PA = (X(196), Y(200)); PB = (X(96), Y(126))
A0p, exp_, nxp, LENp = conveyor(PA, PB, 1.2, legs=(.47, .82))
hood2 = A('paintDark'); prism(hood2, [(PB[0] - .7, PB[1] - .25), (PB[0] + .6, PB[1] + .5), (PB[0] + .9, PB[1] + .5), (PB[0] + .9, PB[1] - .1), (PB[0] - .3, PB[1] - .62)], -.7, .7)
# ================================================================ STOCKPILES AND THE GROUND
MAIN = dict(cx=X(90), cz=-.2, rx=5.2, rz=4.8, h=Y(150.5)); ROCK = dict(cx=X(300), cz=-3.6, rx=4.0, rz=2.8, h=Y(165) + .3)
pile('Stockpile', [MAT['pileGrit'], MAT['pileB'], MAT['pileDark']], MAIN['cx'], MAIN['cz'], MAIN['rx'], MAIN['rz'], MAIN['h'], 7, 1500, (.1, .22), rough=.07, surf_mat=MAT['pileB'])
pile('RockPile', [MAT['pileRock'], MAT['pileA'], MAT['pileGrit']], ROCK['cx'], ROCK['cz'], ROCK['rx'], ROCK['rz'], ROCK['h'], 9, 480, (.26, .6), rough=.14, surf_mat=MAT['pileRock'])
pile('HopperFill', [MAT['pileRock'], MAT['pileA']], FA[0] + .1, 0, 1.45, 1.45, .75, 21, 46, (.2, .42), rough=.1, y0=3.15, surf_mat=MAT['pileRock'])
# a gravel apron under both piles
add_box(A('footing'), (MAIN['cx'], .01, MAIN['cz']), (MAIN['rx'] * 2.3, .02, MAIN['rz'] * 2.4)) if False else None
# ================================================================ OM GROUP MARK ON THE HOUSING (drawing x 175..197, y 102..115)
curved_decal('Logo_Housing', root, cx_, 0, 1.43, (y_h0 + y_h1) / 2, 1.5)
# ================================================================ FLUSH + EXPORT
flush('concrete', 'Ground', MAT['concrete'], .0, 1, 4.0)
for k, (name, mat, bev, tile) in {'beam': ('SteelWork', MAT['beam'], .012, 1.0), 'grate': ('Decks', MAT['grate'], .01, .5), 'orangeRail': ('OrangeWork', MAT['orangeRail'], .008, 1.0), 'galv': ('Fittings', MAT['galv'], .006, 1.0),
                                  'belt': ('BeltRubber', MAT['belt'], 0, 1.0), 'roller': ('Rollers', MAT['roller'], 0, 1.0), 'motor': ('Motors', MAT['motor'], .01, 1.0), 'footing': ('Footings', MAT['footing'], .02, 1.0),
                                  'paintDark': ('CharcoalWork', MAT['paintDark'], .012, 1.2), 'silver': ('SilverHousing', MAT['silver'], .01, 1.2), 'vesselD': ('HousingDetail', MAT['vesselD'], .006, 1.0)}.items():
    flush(k, name, mat, bev, 1, tile, root)
for k in list(ACC): flush(k, k, MAT['beam'], 0, 1, 1.0, root)
def sel_tree(o):
    o.select_set(True)
    for c in o.children: sel_tree(c)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.parent is None and o is not root: o.parent = root
bpy.ops.object.select_all(action='DESELECT'); sel_tree(root); bpy.context.view_layer.objects.active = root
opts = dict(filepath=GLB, export_format='GLB', use_selection=True, export_apply=True, export_texcoords=True, export_normals=True, export_tangents=False,
            export_materials='EXPORT', export_yup=True, export_cameras=False, export_lights=False, export_extras=True, export_image_format='WEBP', export_image_quality=80)
for drop in ([], ['export_image_quality'], ['export_image_quality', 'export_image_format']):
    try: bpy.ops.export_scene.gltf(**{k: v for k, v in opts.items() if k not in drop}); break
    except TypeError as e: print('[crusher3d] gltf option retry', e)
print('[crusher3d] GLB', os.path.getsize(GLB), 'bytes')
meta = {'feed': {'a': [FA[0], FA[1] + .1], 'b': [FB[0], FB[1] + .1], 'width': 1.2}, 'product': {'a': [PA[0], PA[1] + .1], 'b': [PB[0], PB[1] + .1], 'width': 1.2},
        'hopper': {'x': cx_, 'top': Y(76), 'r': 1.5}, 'crusher': {'x': cx_, 'y0': y_base0, 'y1': y_hp1, 'logoY': (Y(102) + Y(115)) / 2}, 'deck': dy, 'platform': py,
        'stockpile': {'x': MAIN['cx'], 'z': MAIN['cz'], 'rx': MAIN['rx'], 'rz': MAIN['rz'], 'h': MAIN['h']}, 'rockpile': {'x': ROCK['cx'], 'z': ROCK['cz'], 'rx': ROCK['rx'], 'rz': ROCK['rz'], 'h': ROCK['h']},
        'chute': {'top': [cx_, Y(143)], 'bottom': [PA[0], PA[1] + .6]}, 'shadow': {'x': 1.7, 'z': -.4, 'w': 31.0, 'd': 16.0}}
json.dump(meta, open(os.path.join(ROOT, 'assets', '3d', 'om-group-vsi-crusher.json'), 'w'), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'om-group-vsi-crusher.blend'))
print('[crusher3d] done')
