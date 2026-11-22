# OM GROUP - WMM stills: layer thickness / compaction, segregation, confinement. exec'd by build-road.py after road_stages.py.
# STAGE = thin0|thin1|med0|med1|thick0|thick1  (0 = loose, 1 = compacted), seg0|seg1 (as spread / after rolling), edge

def _set_layer(loose, comp):
    global WC, WL, Y_WC, Y_WL
    WC, WL = comp, loose; Y_WC, Y_WL = Y_GSB + WC, Y_GSB + WL

def stage_thick():
    global X0, X1
    X0, X1 = -9.0, 9.0
    th = {'thin': (.30, .235), 'med': (.52, .40), 'thick': (.80, .62)}[STAGE[:-1].replace('thi', 'thi')] if STAGE[:-1] in ('thin', 'med', 'thick') else (.52, .40)
    _set_layer(*th)
    done = STAGE.endswith('1')
    terrain(); far_land(); S = Strip(X1 + 1 if not done else X1 + 1, X1 + 1 if done else X0 - 1); mats = [M_stone(i) for i in range(3)]
    world_outdoor(sun_elev=30, sun_rot=-50, strength=.4); sun_light(30, -50, 3.8)
    y = S.top(0, 0)
    roller, rn = import_machine('roller', (-2.4, y + (0.0 if done else .0), 0.2), 0.0)
    scatter_rocks((X0 + .3, X1 - .3, -ZH + .15, ZH - .15), (1800 if not done else 700) if not QUICK else 500, .03 if not done else .012, .13 if not done else .045, S.hc if done else S.hl, 31 + len(STAGE), mats, sink=.35 if not done else .65)
    polish_machines(); co = camera((0.4, y + .5, 0), 15, 7, 15.5, 40, fstop=5.6)
    topy = Y_WC if done else Y_WL
    finish_render(co, {'bl': (X0, Y_GSB, ZH), 'br': (X1, Y_GSB, ZH), 'tr': (X1, topy, ZH), 'tl': (X0, topy, ZH), 'roller': (-2.4, y + 3.9, .2), 'face': (6.0, (Y_GSB + topy) / 2, ZH), 'gsb': (-6.0, (Y_SUB + Y_GSB) / 2, ZH), 'sub': (-6.0, Y_SUB / 2, ZH)})

def stage_seg():
    global X0, X1
    X0, X1 = -6.2, 6.2
    after = STAGE.endswith('1'); _set_layer(.54, .42)
    terrain(); far_land(); mats = [M_stone(i) for i in range(3)]
    world_outdoor(sun_elev=30, sun_rot=-48, strength=.4); sun_light(30, -48, 3.8)
    sub = M_laterite(); gsb = M_gsb(); ubox('Subgrade', X0, X1, 0, Y_SUB, -ZH, ZH, sub, .004, .9); ubox('GSB', X0, X1, Y_SUB, Y_GSB, -ZH, ZH, gsb, .004, .6)
    top = Y_WC if after else Y_WL
    uni = M_wmm(.35 if after else 0.0)
    coarse = mat_pbr('WMMcoarse', speckle_maps(NS, 81, (.17, .165, .16), [(.5, .49, .47), (.2, .2, .2), (.62, .6, .57), (.1, .1, .1)], 9000, (1.8, 4.6), (.3, 1.0), .24, big=(300, 14, 34, [(.52, .51, .5), (.34, .34, .34), (.66, .64, .6), (.24, .24, .24)]), tone=.14, rough=(.85, .05)), 1.4, .3)
    fines = mat_pbr('WMMfines', speckle_maps(NS, 82, (.40, .37, .31), [(.52, .48, .4), (.34, .31, .26), (.6, .55, .47), (.27, .24, .2)], 52000, (1.2, 3.2), (.2, .8), .12, big=(14, 8, 14, [(.5, .5, .48)]), tone=.12, rough=(.93, .04)), .8, .3)
    segs = [(X0, -.15, uni, 'U'), (.15, 1.5, uni, 'u1'), (1.5, 2.6, coarse, 'c1'), (2.6, 3.7, uni, 'u2'), (3.7, 4.6, fines, 'f1'), (4.6, X1, uni, 'u3')]
    # uniform on the left; the right half is the same layer with coarse pockets and a fines pocket
    ubox('WMM_U', X0, -.15, Y_GSB, top, -ZH, ZH, uni, .004, .55)
    ubox('WMM_a', .15, 1.5, Y_GSB, top, -ZH, ZH, uni, .004, .55); ubox('WMM_c', 1.5, 2.6, Y_GSB, top, -ZH, ZH, coarse, .004, .55); ubox('WMM_b', 2.6, 3.7, Y_GSB, top, -ZH, ZH, uni, .004, .55)
    ubox('WMM_f', 3.7, 4.6, Y_GSB, top, -ZH, ZH, fines, .004, .55); ubox('WMM_d', 4.6, X1, Y_GSB, top, -ZH, ZH, uni, .004, .55)
    hf = lambda x, z: top + .002
    if not after:
        scatter_rocks((X0 + .1, -.2, -ZH + .1, ZH - .1), 900 if not QUICK else 250, .03, .1, hf, 41, mats, sink=.4)
        scatter_rocks((1.5, 2.6, -ZH + .1, ZH - .1), 700 if not QUICK else 200, .05, .15, hf, 42, mats, sink=.3)
    polish_machines(); co = camera((0.0, Y_WL * .8, 0.4), 18, 18, 14.5, 42, fstop=7)
    def half(xa, xb): return [(xa, Y_GSB, ZH), (xb, Y_GSB, ZH), (xb, top, ZH), (xb, top, -ZH), (xa, top, -ZH), (xa, top, ZH)]
    pts = {}
    for nm, (xa, xb) in (('U', (X0, -.15)), ('S', (.15, X1))):
        for i, p in enumerate(half(xa, xb)): pts['%s%d' % (nm, i)] = p
    pts.update({'coarse': (2.05, top + .05, 0), 'fines': (4.15, top + .05, 0), 'uni': (-3.0, top + .05, 0)})
    finish_render(co, pts)

def stage_edge():
    global X0, X1
    X0, X1 = -10.0, 10.0; _set_layer(.54, .42)
    terrain(); far_land(); mats = [M_stone(i) for i in range(3)]
    world_outdoor(sun_elev=32, sun_rot=-50, strength=.4); sun_light(32, -50, 3.8)
    sub = M_laterite(); gsb = M_gsb(); wl = M_wmm(0.0); wc = M_wmm(.35)
    ubox('Subgrade', X0, X1, 0, Y_SUB, -ZH, ZH, sub, .004, .9); ubox('GSB', X0, X1, Y_SUB, Y_GSB, -ZH, ZH, gsb, .004, .6)
    # confined (left): the WMM layer is built up between shoulders of granular material that stand as high as the layer
    ubox('WMM_conf', X0, -.6, Y_GSB, Y_WC, -ZH, ZH, wc, .004, .55)
    ubox('Shoulder_n', X0, -.6, Y_GSB, Y_WC + .0, ZH, ZH + 1.0, gsb, .004, .6); ubox('Shoulder_s', X0, -.6, Y_GSB, Y_WC, -ZH - 1.0, -ZH, gsb, .004, .6)
    # unconfined (right): no shoulder, the layer edge slumps and the stones spill outward
    ubox('WMM_open', .6, X1, Y_GSB, Y_WL - .12, -ZH, ZH, wl, .004, .55)
    def slope(x, z):
        d = (abs(z) - ZH) / 1.5
        return max(Y_GSB, Y_WL - .12 - (Y_WL - .12 - Y_GSB) * min(1.0, max(0.0, d)))
    grid_surface('SlopeN', .6, X1, ZH, ZH + 1.5, 60, 18, lambda x, z: slope(x, z) + .02 * noise2(x, z, 9, 2), wl, .6); grid_surface('SlopeS', .6, X1, -ZH - 1.5, -ZH, 60, 18, lambda x, z: slope(x, z) + .02 * noise2(x, z, 9, 3), wl, .6)
    hc = lambda x, z: Y_WC + .002; hl_ = lambda x, z: Y_WL - .12 + .002
    scatter_rocks((.7, X1 - .3, ZH - .2, ZH + 1.7), 520 if not QUICK else 160, .03, .1, lambda x, z: slope(x, z) + .01, 51, mats, sink=.3)
    scatter_rocks((.7, X1 - .3, ZH + .8, ZH + 3.2), 200 if not QUICK else 70, .02, .07, lambda x, z: 0.0, 52, mats, sink=.4)
    scatter_rocks((.7, X1 - .3, -ZH + .2, ZH - .2), 1200 if not QUICK else 350, .03, .11, hl_, 53, mats, sink=.35)
    scatter_rocks((X0 + .3, -.8, -ZH + .2, ZH - .2), 500 if not QUICK else 160, .012, .045, hc, 54, mats, sink=.6)
    r1, _ = import_machine('roller', (-5.4, Y_WC, ZH - 1.15), 0.0); r2, _ = import_machine('roller', (4.2, Y_WL - .12, ZH - 1.15), 0.0)
    polish_machines(); co = camera((0.0, 1.2, ZH * .4), 14, 10, 19, 38, fstop=6.5)
    finish_render(co, {'confined': (-5.4, Y_WC + 4.0, ZH - 1.15), 'unconfined': (4.2, Y_WL + 3.9, ZH - 1.15), 'shoulder': (-3.0, Y_WC - .05, ZH + 1.0), 'spill': (5.5, .15, ZH + 1.4), 'edge': (-3.0, Y_WC + .02, ZH)})

if STAGE.startswith(('thin', 'med', 'thick')): stage_thick()
elif STAGE.startswith('seg'): stage_seg()
elif STAGE == 'edge': stage_edge()
