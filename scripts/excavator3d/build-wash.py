"""OM GROUP - sand washing line (Washed Sand page, "Inside a general washing-and-screening line").

  blender -b --factory-startup -P scripts/excavator3d/build-wash.py -- <repo root>

Output
  assets/3d/om-group-sand-washing.glb    the line: a feed hopper on legs, a rising feed conveyor, an inclined screw sand washer (open steel trough with a turning screw named 'Screw', a spray manifold over it,
                                         an overflow weir at the low end), the overflow pipe to a round settling tank with a bridge and the OM GROUP mark, a two-deck dewatering screen on coil springs with
                                         its exciter motor and a sump, a product conveyor to the stockpile, a small control cabin and the water supply
  assets/3d/om-group-sand-washing.json   anchors the web scene needs (belts, trough axis, nozzles, overflow path, tank, screen, stockpile)
  _review/excavator3d/om-group-sand-washing.blend

Metres, three.js axes (x right, y up, z toward the viewer). Materials, helpers and export reuse build-plant.py / build-crusher.py.
"""
import os, sys
_argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
_ROOT = os.path.abspath(_argv[0] if _argv else os.getcwd())
_src = open(os.path.join(_ROOT, 'scripts', 'excavator3d', 'build-plant.py')).read()
_head = _src[:_src.index('# ================================================================ GROUND')]
_head = _head.replace("'om-group-rmc-plant.glb'", "'om-group-sand-washing.glb'").replace("root = empty('OMGroupRMCPlant')", "root = empty('OMGroupSandWashing')")
exec(_head)
_c = open(os.path.join(_ROOT, 'scripts', 'excavator3d', 'build-crusher.py')).read()
_s0 = _c.index('# extra materials for the crusher'); exec(_c[_s0:_c.index('# ================================================================ GROUND', _s0)])

MAT['water'] = pbr('TurbidWater', (.16, .115, .065), 0.0, .1, opacity=.9, coat=0.0)
MAT['waterClear'] = pbr('SprayWater', (.7, .85, .95), 0.0, .02, opacity=.5)
MAT['cabin'] = pbr('CabinWhite', (.78, .78, .76), 0.0, .45, IMG_N, .2, rough_img('cabin', .45, .05), coat=.2)
MAT['troughGlass'] = pbr('TroughGlass', (.82, .9, .94), 0.0, .03, opacity=.12, coat=0.0)
MAT['sandWet'] = noisy('WashedSandPile', (.62, .50, .34), .2, 51, speck=.2, nstr=.8, rough=(.9, .06), scale=1.5)

def open_tank(bm, cx, cz, r, h, t, seg=64, y0=0.0, floor=True):
    """an open round tank: outer wall, a rim, the inner wall and a floor"""
    rows = []
    for (rr, y) in ((r, y0), (r, y0 + h), (r - t, y0 + h), (r - t, y0)):
        rows.append([bm.verts.new(V(cx + rr * math.cos(2 * math.pi * k / seg), y, cz + rr * math.sin(2 * math.pi * k / seg))) for k in range(seg)])
    for i in range(3):
        for k in range(seg): bm.faces.new((rows[i][k], rows[i][(k + 1) % seg], rows[i + 1][(k + 1) % seg], rows[i + 1][k]))
    if floor: bm.faces.new(rows[3][::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

def inc_pt(x0, y0, th, s, v):
    """world (x, y) of the point s along an axis that rises at angle th from (x0, y0) and v across it"""
    return (x0 + s * math.cos(th) - v * math.sin(th), y0 + s * math.sin(th) + v * math.cos(th))

# ================================================================ GROUND
bm = A('concrete'); add_box(bm, (3.0, -.1, -1.0), (46.0, .2, 19.0))
# ================================================================ FEED HOPPER (a charcoal bin on four legs with a grizzly on top)
HX = -14.6
for sx in (-1, 1):
    for sz in (-1, 1): add_box(A('beam'), (HX + sx * 1.7, 1.2, sz * 1.7), (.26, 2.4, .26)); footing(HX + sx * 1.7, sz * 1.7, .8)
for yy in (.9, 2.3):
    for sz in (-1, 1): add_box(A('beam'), (HX, yy, sz * 1.7), (3.4, .16, .12))
    for sx in (-1, 1): add_box(A('beam'), (HX + sx * 1.7, yy, 0), (.12, .16, 3.4))
frustum(A('paintDark'), (HX, 0), 1.35, 3.3, .55, 2.05)
for k in range(11): add_box(A('galv'), (HX - 1.8 + k * .36, 3.34, 0), (.08, .1, 4.1))
for sx in (-1, 1): add_box(A('beam'), (HX + sx * 2.07, 3.34, 0), (.12, .12, 4.2))
for z in (-1, 1): rail_run(A('orangeRail'), A('orangeRail'), (HX - 2.1, z * 2.1), (HX + 2.1, z * 2.1), 1.0, 1.3, 3.34)
# ================================================================ FEED CONVEYOR
FA = (HX + .3, 1.1); FB = (-4.4, 4.5)
A0f, exf, nxf, LENf = conveyor(FA, FB, 1.0, legs=(.3, .62, .9))
hood = A('paintDark'); prism(hood, [(FB[0] - .7, FB[1] - .3), (FB[0] + .55, FB[1] - .3), (FB[0] + .55, FB[1] + .5), (FB[0] - .15, FB[1] + .5), (FB[0] - .7, FB[1] + .1)], -.7, .7)
# ================================================================ SCREW SAND WASHER (inclined open trough)
TH = math.radians(13); L = 9.6; W = 1.9; D = 1.25; X0, Y0 = -6.4, 2.35
def trough_pt(s, v, z): x, y = inc_pt(X0, Y0, TH, s, v); return (x, y, z)
vd, ow = A('vesselD'), A('orangeRail')
add_box(vd, (*trough_pt(L / 2, .03, 0)[:2], 0), (L, .08, W), rot=Rz(TH))
for sz in (-1, 1):
    add_box(vd if sz < 0 else A('troughGlass'), (*trough_pt(L / 2, D / 2, sz * (W / 2 - .03))[:2], sz * (W / 2 - .03)), (L, D, .07 if sz < 0 else .04), rot=Rz(TH))
    add_box(A('beam'), (*trough_pt(L / 2, D + .04, sz * (W / 2 - .03))[:2], sz * (W / 2 - .03)), (L + .06, .08, .14), rot=Rz(TH))
add_box(vd, (*trough_pt(.02, D / 2, 0)[:2], 0), (.07, D, W), rot=Rz(TH))                    # low end plate
add_box(vd, (*trough_pt(L - .02, D / 2 + .1, 0)[:2], 0), (.07, D * .7, W), rot=Rz(TH))     # high end plate (lower: the sand leaves over it)
for k in range(1, 8):
    s = k * L / 8
    for sz in (-1, 1): add_box(A('beam'), (*trough_pt(s, D / 2, sz * (W / 2 + .02))[:2], sz * (W / 2 + .02)), (.1, D + .12, .08), rot=Rz(TH))
# the bearing housings and the drive at the high end: gearbox, motor, guard
gx, gy = inc_pt(X0, Y0, TH, L + .55, D / 2 - .15); add_box(A('motor'), (gx, gy, 0), (.9, .9, .9), rot=Rz(TH)); add_cyl(A('galv'), (gx + .05, gy, 0), .26, .12, 24, axis='x')
mx, my = inc_pt(X0, Y0, TH, L + 1.5, D / 2 - .15); add_cyl(A('motor'), (mx, my, 0), .42, 1.0, 36, axis='x'); add_box(A('motor'), (mx, my + .52, 0), (.4, .26, .4))
for k in range(6): add_cyl(A('vesselD'), (mx - .38 + k * .14, my, 0), .45, .04, 36, axis='x')
add_box(A('beam'), (gx + .55, gy - .65, 0), (1.9, .12, .9))
bx_, by_ = inc_pt(X0, Y0, TH, -.35, D / 2 - .15); add_box(A('motor'), (bx_, by_, 0), (.5, .5, .5), rot=Rz(TH))
# supports from the ground to the trough
for s in (1.0, 4.8, 8.6):
    x, y = inc_pt(X0, Y0, TH, s, -.05)
    for sz in (-1, 1):
        add_box(A('beam'), (x, y / 2 - .04, sz * (W / 2 + .1)), (.22, y - .08, .22)); footing(x, sz * (W / 2 + .1), .75)
    add_box(A('beam'), (x, y - .1, 0), (.18, .18, W + .5))
    for sz in (-1, 1): xbrace(A('beam'), x - .0, x + .0, .3, y - .2, sz * (W / 2 + .1), .03) if False else None
# a catwalk and handrail along the near side of the trough
for k in range(0, 9):
    s = k * 1.1 + .4; x, y = inc_pt(X0, Y0, TH, s, D + .3)
    add_box(A('grate'), (x, y, -(W / 2 + .72)), (1.14, .07, 1.0), rot=Rz(TH))
    cyl_between(A('orangeRail'), (x, y + .08, -(W / 2 + 1.2)), (x, y + 1.08, -(W / 2 + 1.2)), .025, 6)
a_ = inc_pt(X0, Y0, TH, .4, D + .3); b_ = inc_pt(X0, Y0, TH, 10.0, D + .3)
for h in (1.05, .55): cyl_between(A('orangeRail'), (a_[0], a_[1] + h, -(W / 2 + 1.2)), (b_[0], b_[1] + h, -(W / 2 + 1.2)), .025, 6)
add_box(A('beam'), ((a_[0] + b_[0]) / 2, (a_[1] + b_[1]) / 2 - .08, -(W / 2 + .72)), (math.hypot(b_[0] - a_[0], b_[1] - a_[1]), .1, .1), rot=Rz(TH))
# the feed box at the low end that the conveyor drops into
fx, fy = inc_pt(X0, Y0, TH, 1.0, D + .35); frustum(A('paintDark'), (fx, 0), fy - .3, fy + 1.0, .75, 1.0) if False else None
chp = [(FB[0] + .2, FB[1] - .35, -.55), (FB[0] + .2, FB[1] - .35, .55), (FB[0] - .6, FB[1] - .35, .55), (FB[0] - .6, FB[1] - .35, -.55)]
cht = [(X0 + 1.0, Y0 + D + .0, -.6), (X0 + 1.0, Y0 + D + .0, .6), (X0 + .2, Y0 + D + .0, .6), (X0 + .2, Y0 + D + .0, -.6)]
frustum_pts(A('paintDark'), cht, chp)
# the water: a turbid surface inside the trough
wl = D * .62; wbm = bmesh.new(); add_box(wbm, (*trough_pt(L / 2 - .05, wl, 0)[:2], 0), (L - .3, .02, W - .2), rot=Rz(TH))
water = new_obj('TroughWater', wbm, MAT['water'], root, uv=True, tile=1.5)
# spray manifold over the trough with five nozzles
sy0 = D + .85
for k, s in enumerate((1.5, 3.2, 4.9, 6.6, 8.3)):
    x, y = inc_pt(X0, Y0, TH, s, sy0)
    cyl_between(A('pipeBlue'), (x, y, -W / 2 - .1), (x, y, W / 2 + .1), .06, 14)
    for sz in (-.5, 0, .5): add_cyl(A('galv'), (x, y - .1, sz), .035, .12, 10, r2=.05)
a_ = inc_pt(X0, Y0, TH, 1.0, sy0); b_ = inc_pt(X0, Y0, TH, 8.9, sy0)
cyl_between(A('pipeBlue'), (a_[0], a_[1], -W / 2 - .1), (b_[0], b_[1], -W / 2 - .1), .09, 16)
sup = (a_[0] - .5, a_[1], -W / 2 - .1); cyl_between(A('pipeBlue'), (a_[0], a_[1], -W / 2 - .1), (sup[0] - 1.6, 4.9, -W / 2 - .1), .09, 16)
# ================================================================ THE SCREW (its own node, turned by the web scene)
cx, cy = inc_pt(X0, Y0, TH, L / 2, .58)
piv = empty('ScrewPivot', root, (cx, cy, 0)); piv.rotation_euler = Rz(TH).to_euler()
sb = bmesh.new(); SR, r0, PITCH, NSTEP = .66, .13, .85, 30; steps = int((L - .4) / PITCH * NSTEP); rows = []
add_cyl(sb, (0, 0, 0), r0, L + .5, 24, axis='x')
for i in range(steps + 1):
    ph = 2 * math.pi * i / NSTEP; x = -(L - .4) / 2 + PITCH * i / NSTEP
    rows.append([sb.verts.new(V(x + dx, rr * math.sin(ph), rr * math.cos(ph))) for (rr, dx) in ((r0, -.03), (SR, -.03), (SR, .03), (r0, .03))])
for i in range(steps):
    for j in range(4): sb.faces.new((rows[i][j], rows[i][(j + 1) % 4], rows[i + 1][(j + 1) % 4], rows[i + 1][j]))
bmesh.ops.recalc_face_normals(sb, faces=sb.faces)
screw = new_obj('Screw', sb, MAT['screw'], piv, uv=True, tile=.6)
# ================================================================ OVERFLOW PIPE AND THE SETTLING TANK
TX, TZ, TR, THh = -1.6, 6.4, 2.5, 2.1
open_tank(A('vesselD'), TX, TZ, TR, THh, .1, 64); open_tank(A('galv'), TX, TZ, TR + .05, .1, .22, 64, y0=THh - .04, floor=False)
for k in range(24):
    a = 2 * math.pi * k / 24; hexbolt(A('galv'), TX + (TR + .02) * math.cos(a), THh - .12, TZ + (TR + .02) * math.sin(a), .04, .05, 'x')
add_cyl(A('beam'), (TX, THh / 2, TZ), TR + .02, .1, 64) if False else None
for k in range(6):
    a = 2 * math.pi * k / 6 + .3; footing(TX + (TR - .2) * math.cos(a), TZ + (TR - .2) * math.sin(a), .7)
add_box(A('beam'), (TX, THh + .3, TZ), (TR * 2 + .4, .2, .36)); add_cyl(A('motor'), (TX, THh + .75, TZ), .42, .7, 30); add_cyl(A('galv'), (TX, THh + .3 - .5, TZ), .08, 1.8, 12)
rail_run(A('orangeRail'), A('orangeRail'), (TX - TR - .2, TZ - .5), (TX + TR + .2, TZ - .5), 1.0, 1.3, THh + .42); rail_run(A('orangeRail'), A('orangeRail'), (TX - TR - .2, TZ + .5), (TX + TR + .2, TZ + .5), 1.0, 1.3, THh + .42)
wbm2 = bmesh.new(); add_cyl(wbm2, (TX, THh - .32, TZ), TR - .08, .02, 64); tankwater = new_obj('TankWater', wbm2, MAT['water'], root, uv=True, tile=2.0)
add_cyl(A('galv'), (TX + TR - .05, THh - .5, TZ + .0), .0001, .0001, 3) if False else None
# the pipe: from the weir at the low end of the trough, down and across to the tank inlet
w0 = inc_pt(X0, Y0, TH, -.15, D * .55); path = [(w0[0] - .1, w0[1], W / 2 + .0), (w0[0] - .75, w0[1] - .35, W / 2 + .6), (w0[0] - 1.2, 1.35, 2.4), (-4.2, 1.1, 4.1), (TX - TR - .4, 1.4, TZ - .6), (TX - TR + .3, THh - .1, TZ - .3)]
tube(A('pipeBlue'), path, .17, 14)
for p in (path[1], path[2], path[3]): add_cyl(A('galv'), (p[0], p[1], p[2]), .23, .12, 16)
add_cyl(A('green'), (-4.2, 1.5, 4.1), .06, .6, 10); add_cyl(A('green'), (-4.2, 1.85, 4.1), .22, .08, 14, axis='y')
# a sludge outlet from the tank bottom to a sump
cyl_between(A('pipeBlue'), (TX + TR + .3, .45, TZ + .0), (TX + TR + 3.2, .45, TZ + .0), .12, 12); add_box(A('footing'), (TX + TR + 3.5, .12, TZ), (1.4, .24, 1.4))
# ================================================================ DEWATERING SCREEN
SX0, SY0, SL, SW, SH, STH = 4.6, 3.1, 5.8, 2.3, .62, -math.radians(10)
def sc_pt(s, v, z): x, y = inc_pt(SX0, SY0, STH, s, v); return (x, y, z)
for sz in (-1, 1): add_box(A('paintDark'), (*sc_pt(SL / 2, SH / 2, sz * (SW / 2))[:2], sz * (SW / 2)), (SL, SH, .09), rot=Rz(STH))
for k in range(0, 7): add_box(A('beam'), (*sc_pt(k * SL / 6, SH * .5, 0)[:2], 0), (.12, SH * .08, SW), rot=Rz(STH))
for yy, off in ((.2, 0), (.42, .2)):
    add_box(A('grate'), (*sc_pt(SL / 2 - off / 2, yy, 0)[:2], 0), (SL - off - .1, .05, SW - .12), rot=Rz(STH))
add_box(A('paintDark'), (*sc_pt(.02, SH / 2, 0)[:2], 0), (.1, SH, SW), rot=Rz(STH))
for sz in (-1, 1): add_box(A('beam'), (*sc_pt(SL / 2, SH + .05, sz * (SW / 2))[:2], sz * (SW / 2)), (SL + .1, .1, .16), rot=Rz(STH))
for s in (.8, 2.5, 4.2, 5.2): add_box(A('beam'), (*sc_pt(s, SH + .06, 0)[:2], 0), (.18, .1, SW + .2), rot=Rz(STH))
ex_, ey_ = inc_pt(SX0, SY0, STH, SL * .45, SH + .55); add_cyl(A('motor'), (ex_, ey_, 0), .46, 1.5, 36, axis='z'); add_box(A('motor'), (ex_, ey_ + .55, 0), (.46, .3, .46))
for k in range(7): add_cyl(A('vesselD'), (ex_, ey_, -.62 + k * .2), .49, .04, 36, axis='z')
add_box(A('beam'), (ex_, ey_ - .5, 0), (.4, .16, SW * .9), rot=Rz(STH))
for z in (-SW / 2 - .35, SW / 2 + .35):                                          # coil springs on four posts
    for s in (.7, 5.1):
        x, y = inc_pt(SX0, SY0, STH, s, -.1); h = y - .55
        add_box(A('beam'), (x, h / 2 - .1, z), (.28, h - .2, .28)); footing(x, z, .8); add_box(A('orangeRail'), (x, y - .22, z), (.4, .06, .4))
        pts = [(x + .17 * math.cos(2 * math.pi * k / 10 * 1.0), h + .05 + (y - h - .3) * k / 40, z + .17 * math.sin(2 * math.pi * k / 10)) for k in range(41)]
        tube(A('orangeRail'), pts, .03, 6)
# the receiving chute from the washer's high end, a sump under the screen, and the product chute at its low end
hx_, hy_ = inc_pt(X0, Y0, TH, L + .1, D * .55)
frustum_pts(A('paintDark'), [(hx_ + .1, hy_ - .1, -.8), (hx_ + .1, hy_ - .1, .8), (hx_ - .3, hy_ - .1, .8), (hx_ - .3, hy_ - .1, -.8)], [(SX0 + .6, SY0 + SH + .25, -.9), (SX0 + .6, SY0 + SH + .25, .9), (SX0 - .1, SY0 + SH + .25, .9), (SX0 - .1, SY0 + SH + .25, -.9)])
frustum(A('paintDark'), (SX0 + SL * .45, 0), .7, 2.1, .65, 1.2, shape=(1.5, 1.0)); cyl_between(A('pipeBlue'), (SX0 + SL * .45, .6, 0), (SX0 + SL * .45 + 3.4, .6, -.9), .12, 12)
ex2, ey2 = inc_pt(SX0, SY0, STH, SL + .05, .2)
frustum_pts(A('paintDark'), [(ex2 + .3, 1.6, -.7), (ex2 + .3, 1.6, .7), (ex2 - .5, 1.6, .7), (ex2 - .5, 1.6, -.7)], [(ex2 + .1, ey2, -SW / 2), (ex2 + .1, ey2, SW / 2), (ex2 - .3, ey2 + .4, SW / 2), (ex2 - .3, ey2 + .4, -SW / 2)])
# ================================================================ PRODUCT CONVEYOR (to the stockpile)
PA = (ex2 - .1, 1.1); PB = (17.4, 5.6)
A0p, exp_, nxp, LENp = conveyor(PA, PB, 1.0, legs=(.4, .72))
hood2 = A('paintDark'); prism(hood2, [(PB[0] - .7, PB[1] - .25), (PB[0] + .6, PB[1] + .45), (PB[0] + .9, PB[1] + .45), (PB[0] + .9, PB[1] - .1), (PB[0] - .3, PB[1] - .6)], -.7, .7)
# ================================================================ CONTROL CABIN AND WATER SUPPLY
add_box(A('cabin'), (-10.4, 1.25, -8.2), (3.4, 2.5, 2.6)); add_box(A('beam'), (-10.4, 2.55, -8.2), (3.6, .12, 2.8)); add_box(A('glassP'), (-10.4, 1.55, -6.88), (2.0, .85, .04)); add_box(A('beam'), (-11.9, .9, -6.88), (.8, 1.8, .05))
for k in range(2): add_box(A('beam'), (-11.8 + k * 2.8, .08, -8.2), (.3, .16, 2.8)) if False else None
add_cyl(A('pipeBlue'), (-4.4, 1.3, -8.4), 1.3, 2.6, 40); add_cyl(A('galv'), (-4.4, 2.64, -8.4), 1.34, .08, 40); cyl_between(A('pipeBlue'), (-5.2, .5, -7.2), (-5.2, .5, -2.0), .11, 12); cyl_between(A('pipeBlue'), (-5.2, .5, -2.0), (-5.2, 5.4, -2.0), .11, 12)
add_box(A('motor'), (-6.4, .42, -7.0), (.9, .84, .6)); add_cyl(A('motor'), (-6.4, .42, -6.4), .34, .7, 30, axis='z')
# ================================================================ MARK AND GROUND
curved_decal('Logo_Tank', root, TX, TZ, TR, THh * .5, 2.2, center=math.pi / 2)
flush('concrete', 'Ground', MAT['concrete'], .0, 1, 4.0)
for k, (name, mat, bev, tile) in {'beam': ('SteelWork', MAT['beam'], .012, 1.0), 'grate': ('Decks', MAT['grate'], .01, .5), 'orangeRail': ('OrangeWork', MAT['orangeRail'], .008, 1.0), 'galv': ('Fittings', MAT['galv'], .006, 1.0),
                                  'belt': ('BeltRubber', MAT['belt'], 0, 1.0), 'roller': ('Rollers', MAT['roller'], 0, 1.0), 'motor': ('Motors', MAT['motor'], .01, 1.0), 'footing': ('Footings', MAT['footing'], .02, 1.0),
                                  'paintDark': ('CharcoalWork', MAT['paintDark'], .012, 1.2), 'silver': ('SilverHousing', MAT['silver'], .01, 1.2), 'vesselD': ('TroughSteel', MAT['vesselD'], .008, 1.0),
                                  'pipeBlue': ('PipeBlue', MAT['pipeBlue'], .004, 1.0), 'green': ('Valves', MAT['green'], .004, 1.0), 'cabin': ('Cabin', MAT['cabin'], .01, 1.0), 'glassP': ('CabinGlass', MAT['glassP'], 0, 1.0), 'troughGlass': ('TroughGlass', MAT['troughGlass'], 0, 1.0)}.items():
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
    except TypeError as e: print('[wash3d] gltf option retry', e)
print('[wash3d] GLB', os.path.getsize(GLB), 'bytes')
meta = {'feed': {'a': [FA[0], FA[1] + .1], 'b': [FB[0], FB[1] + .1], 'width': 1.0}, 'product': {'a': [PA[0], PA[1] + .1], 'b': [PB[0], PB[1] + .1], 'width': 1.0},
        'hopper': {'x': HX, 'top': 3.3, 'r': 2.0},
        'trough': {'x0': X0, 'y0': Y0, 'th': TH, 'L': L, 'W': W, 'D': D, 'water': wl, 'screw': [cx, cy], 'nozzles': [list(inc_pt(X0, Y0, TH, s, sy0)) for s in (1.5, 3.2, 4.9, 6.6, 8.3)], 'high': [list(inc_pt(X0, Y0, TH, L, D * .55))], 'weir': [list(w0)]},
        'overflow': [list(p) for p in path], 'tank': {'x': TX, 'z': TZ, 'r': TR, 'h': THh, 'water': THh - .32},
        'screen': {'x0': SX0, 'y0': SY0, 'th': STH, 'L': SL, 'W': SW, 'h': SH, 'low': [ex2, ey2]},
        'stockpile': {'x': 18.4, 'z': 0.0, 'r': 4.6, 'h': 3.4}, 'feedpile': {'x': -19.2, 'z': 0.6, 'r': 3.6, 'h': 2.4}, 'shadow': {'x': 3.0, 'z': -1.0, 'w': 46.0, 'd': 19.0}}
json.dump(meta, open(os.path.join(ROOT, 'assets', '3d', 'om-group-sand-washing.json'), 'w'), indent=1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'om-group-sand-washing.blend'))
print('[wash3d] done')
