"""OM GROUP - the two plants of the Wet Mix Macadam / Granular Sub-base pages.

  blender -b --factory-startup -P scripts/excavator3d/build-wmm.py -- <repo root>

Output
  assets/3d/om-group-wmm-source.glb   "From quarry to fraction stockpiles": a benched rock pile, a feed conveyor into a jaw crusher on a steel frame (hopper, charcoal body, two orange flywheels, motor), a
                                      conveyor up to a two-deck vibrating screen on coil springs, and a long product conveyor over a row of five fraction stockpile positions
  assets/3d/om-group-wmm-plant.glb    "The wet-mix plant": four aggregate bins on a frame with variable-speed feeders, a gathering belt, an inclined conveyor, a small oversize screen, a twin-shaft pugmill with a glass
                                      side wall (nodes `ShaftA`, `ShaftB` turn) and a water spray bar, a discharge hopper (the tipper is the truck model), a water tank and pump, a control cabin
  assets/3d/om-group-wmm-source.json, om-group-wmm-plant.json   anchors for the web scene (belts, pile positions, pugmill, discharge)
Metres, three.js axes. Materials and helpers reuse build-plant.py / build-crusher.py. Generic plants: not any particular OM GROUP plant.
"""
import os, sys
_argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
_ROOT = os.path.abspath(_argv[0] if _argv else os.getcwd())
_src = open(os.path.join(_ROOT, 'scripts', 'excavator3d', 'build-plant.py')).read()
_head = _src[:_src.index('# ================================================================ GROUND')]
exec(_head)
_c = open(os.path.join(_ROOT, 'scripts', 'excavator3d', 'build-crusher.py')).read()
_s0 = _c.index('# extra materials for the crusher'); exec(_c[_s0:_c.index('# ================================================================ GROUND', _s0)])
MAT['pipeBlue2'] = MAT['pipeBlue']
MAT['water'] = pbr('PlantWater', (.12, .22, .3), 0.0, .08, opacity=.85)
MAT['glass'] = pbr('PugGlass', (.82, .9, .94), 0.0, .03, opacity=.14)
MAT['cabin'] = pbr('CabinWhite', (.78, .78, .76), 0.0, .45, IMG_N, .2, rough_img('cabin', .45, .05), coat=.2)
MAT['paddle'] = pbr('PaddleSteel', (.55, .56, .58), 1.0, .38, IMG_RN, .5, rough_img('paddle', .38, .1))
GLB_DIR = os.path.join(ROOT, 'assets', '3d')

def open_tank(bm, cx, cz, r, h, t, seg=64, y0=0.0):
    rows = []
    for (rr, y) in ((r, y0), (r, y0 + h), (r - t, y0 + h), (r - t, y0)):
        rows.append([bm.verts.new(V(cx + rr * math.cos(2 * math.pi * k / seg), y, cz + rr * math.sin(2 * math.pi * k / seg))) for k in range(seg)])
    for i in range(3):
        for k in range(seg): bm.faces.new((rows[i][k], rows[i][(k + 1) % seg], rows[i + 1][(k + 1) % seg], rows[i + 1][k]))
    bm.faces.new(rows[3][::-1]); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

def finish(name, glb, meta):
    flush('concrete', 'Ground', MAT['concrete'], .0, 1, 4.0)
    for k, (nm, mat, bev, tile) in {'beam': ('SteelWork', MAT['beam'], .012, 1.0), 'grate': ('Decks', MAT['grate'], .01, .5), 'orangeRail': ('OrangeWork', MAT['orangeRail'], .008, 1.0), 'galv': ('Fittings', MAT['galv'], .006, 1.0),
                                    'belt': ('BeltRubber', MAT['belt'], 0, 1.0), 'roller': ('Rollers', MAT['roller'], 0, 1.0), 'motor': ('Motors', MAT['motor'], .01, 1.0), 'footing': ('Footings', MAT['footing'], .02, 1.0),
                                    'paintDark': ('CharcoalWork', MAT['paintDark'], .012, 1.2), 'silver': ('SilverHousing', MAT['silver'], .01, 1.2), 'vesselD': ('GreySteel', MAT['vesselD'], .008, 1.0), 'pipeBlue': ('PipeBlue', MAT['pipeBlue'], .004, 1.0),
                                    'cabin': ('Cabin', MAT['cabin'], .01, 1.0), 'glassP': ('CabinGlass', MAT['glassP'], 0, 1.0), 'paddle': ('Paddles', MAT['paddle'], .004, 1.0), 'glass': ('PugGlass', MAT['glass'], 0, 1.0), 'green': ('Valves', MAT['green'], .004, 1.0)}.items():
        flush(k, nm, mat, bev, 1, tile, root)
    for k in list(ACC): flush(k, k, MAT['beam'], 0, 1, 1.0, root)
    def sel_tree(o):
        o.select_set(True)
        for c in o.children: sel_tree(c)
    for o in list(bpy.data.objects):
        if o.type == 'MESH' and o.parent is None and o is not root: o.parent = root
    bpy.ops.object.select_all(action='DESELECT'); sel_tree(root); bpy.context.view_layer.objects.active = root
    opts = dict(filepath=glb, export_format='GLB', use_selection=True, export_apply=True, export_texcoords=True, export_normals=True, export_tangents=False,
                export_materials='EXPORT', export_yup=True, export_cameras=False, export_lights=False, export_extras=True, export_image_format='WEBP', export_image_quality=80)
    for drop in ([], ['export_image_quality'], ['export_image_quality', 'export_image_format']):
        try: bpy.ops.export_scene.gltf(**{k: v for k, v in opts.items() if k not in drop}); break
        except TypeError as e: print('[wmm3d] gltf option retry', e)
    print('[wmm3d]', name, 'GLB', os.path.getsize(glb), 'bytes')
    json.dump(meta, open(glb.replace('.glb', '.json'), 'w'), indent=1)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, name + '.blend'))

# ================================================================ THE SOURCE PLANT
def source():
    global root
    root = empty('OMGroupWMMSource')
    add_box(A('concrete'), (12.0, -.1, -1.0), (74.0, .2, 20.0))
    # benched rock pile (the quarry face) and the feed conveyor from it into the crusher hopper
    pile('RockFace', [MAT['pileRock'], MAT['pileA'], MAT['pileGrit']], -24.5, -3.0, 6.5, 4.5, 6.2, 9, 300, (.4, .85), rough=.16, surf_mat=MAT['pileRock'])
    CX = -12.0
    for sx in (-1, 1):
        for sz in (-1, 1): add_box(A('beam'), (CX + sx * 1.9, 1.7, sz * 1.5), (.3, 3.4, .3)); footing(CX + sx * 1.9, sz * 1.5, .85)
    for yy in (1.4, 3.2): add_box(A('beam'), (CX, yy, 0), (4.1, .2, .16)); add_box(A('beam'), (CX, yy, 1.5), (4.1, .2, .16)); add_box(A('beam'), (CX, yy, -1.5), (4.1, .2, .16))
    add_box(A('paintDark'), (CX, 4.55, 0), (3.2, 2.5, 2.3))                                     # crusher body
    for sz in (-1, 1): add_cyl(A('orangeRail'), (CX + .4, 4.4, sz * 1.5), 1.05, .26, 56, axis='z'); add_cyl(A('galv'), (CX + .4, 4.4, sz * 1.66), .26, .1, 28, axis='z')
    add_box(A('beam'), (CX + 1.7, 4.5, 0), (.5, 1.2, 2.5)); add_box(A('motor'), (CX - 2.5, 3.0, 1.2), (1.2, .9, .9)); add_cyl(A('motor'), (CX - 2.5, 3.5, 1.2), .3, .5, 24)
    frustum(A('paintDark'), (CX, 0), 5.8, 7.6, .9, 2.0)
    for z in (-1, 1): rail_run(A('orangeRail'), A('orangeRail'), (CX - 2.2, z * 2.2), (CX + 2.2, z * 2.2), 1.0, 1.3, 7.6)
    fa = (-20.5, 1.0); fb = (CX - 1.0, 8.2); conveyor(fa, fb, 1.0, legs=(.35, .7))
    prism(A('paintDark'), [(fb[0] - .6, fb[1] - .3), (fb[0] + .5, fb[1] - .3), (fb[0] + .5, fb[1] + .45), (fb[0] - .2, fb[1] + .45), (fb[0] - .6, fb[1] + .1)], -.65, .65)
    # crusher discharge to the screen feed conveyor
    pa = (CX + 1.0, 1.3); pb = (-0.4, 8.0); conveyor(pa, pb, 1.0, legs=(.3, .6, .85))
    frustum_pts(A('paintDark'), [(CX - .6, 3.4, -.6), (CX + .6, 3.4, -.6), (CX + .6, 3.4, .6), (CX - .6, 3.4, .6)], [(pa[0] - .3, pa[1] + .4, -.5), (pa[0] + .5, pa[1] + .4, -.5), (pa[0] + .5, pa[1] + .4, .5), (pa[0] - .3, pa[1] + .4, .5)])
    # the screen on a tower
    SX, SY, SL, SW, STH = 1.0, 7.4, 6.6, 2.4, -math.radians(8)
    def sp(s, v): return inc_pt(SX, SY, STH, s, v)
    def inc_pt(x0, y0, th, s, v): return (x0 + s * math.cos(th) - v * math.sin(th), y0 + s * math.sin(th) + v * math.cos(th))
    for sx in (-1, 1):
        for sz in (-1, 1): add_box(A('beam'), (SX + 3.3 + sx * 2.4, 3.7, sz * 1.8), (.3, 7.4, .3)); footing(SX + 3.3 + sx * 2.4, sz * 1.8, .9)
    for yy in (2.5, 5.2): add_box(A('beam'), (SX + 3.3, yy, 1.8), (5.1, .2, .14)); add_box(A('beam'), (SX + 3.3, yy, -1.8), (5.1, .2, .14))
    for z in (-1, 1): xbrace(A('beam'), SX + .9, SX + 5.7, 2.6, 5.1, z * 1.8, .04)
    for sz in (-1, 1):
        x, y = sp(SL / 2, .5); add_box(A('paintDark'), (x, y, sz * SW / 2), (SL, 1.0, .1), rot=Rz(STH))
    for yy, off in ((.18, 0), (.5, .3)):
        x, y = sp(SL / 2 - off / 2, yy); add_box(A('grate'), (x, y, 0), (SL - off - .1, .05, SW - .12), rot=Rz(STH))
    ex_, ey_ = sp(SL * .45, 1.2); add_cyl(A('motor'), (ex_, ey_, 0), .5, 1.6, 36, axis='z'); add_box(A('motor'), (ex_, ey_ + .6, 0), (.5, .3, .5))
    for s in (.6, 3.3, 6.0):
        x, y = sp(s, -.1)
        for sz in (-1, 1):
            add_box(A('orangeRail'), (x, y - .25, sz * 1.5), (.4, .06, .4)); pts = [(x + .17 * math.cos(2 * math.pi * k / 10), y - .55 + (.3) * k / 40, sz * 1.5 + .17 * math.sin(2 * math.pi * k / 10)) for k in range(41)]
            tube(A('orangeRail'), pts, .03, 6)
    # the long product conveyor over the stockpile row, with five chute points
    PA = (sp(SL, .2)[0] + .5, 5.4); PB = (46.0, 7.0); conveyor(PA, PB, 1.0, legs=(.12, .3, .5, .7, .9))
    frustum_pts(A('paintDark'), [(PA[0] - .4, 6.0, -.7), (PA[0] + .6, 6.0, -.7), (PA[0] + .6, 6.0, .7), (PA[0] - .4, 6.0, .7)], [(PA[0] - .3, PA[1] + .2, -.5), (PA[0] + .5, PA[1] + .2, -.5), (PA[0] + .5, PA[1] + .2, .5), (PA[0] - .3, PA[1] + .2, .5)])
    PX = [14.0, 21.0, 28.0, 35.0, 42.0]
    for x in PX:
        yb = 5.4 + (x - PA[0]) * (7.0 - 5.4) / (46.0 - PA[0])
        frustum_pts(A('paintDark'), [(x - .4, yb - 1.2, -.45), (x + .4, yb - 1.2, -.45), (x + .4, yb - 1.2, .45), (x - .4, yb - 1.2, .45)], [(x - .6, yb - .5, -.6), (x + .6, yb - .5, -.6), (x + .6, yb - .5, .6), (x - .6, yb - .5, .6)])
    curved_decal('Logo_Screen', root, SX + 3.3, 0, 1.0, 3.5, 1.6) if False else None
    meta = {'rock': {'x': -24.5, 'z': -3.0, 'rx': 6.5, 'rz': 4.5, 'h': 6.2}, 'crusher': {'x': CX, 'top': 7.6}, 'feed': {'a': [fa[0], fa[1] + .1], 'b': [fb[0], fb[1] + .1]}, 'mid': {'a': [pa[0], pa[1] + .1], 'b': [pb[0], pb[1] + .1]},
            'screen': {'x0': SX, 'y0': SY, 'th': STH, 'L': SL, 'W': SW}, 'prod': {'a': [PA[0], PA[1] + .1], 'b': [PB[0], PB[1] + .1]}, 'piles': [{'x': x, 'z': 0.0} for x in PX], 'shadow': {'x': 12.0, 'z': -1.0, 'w': 74.0, 'd': 20.0}}
    finish('om-group-wmm-source', os.path.join(GLB_DIR, 'om-group-wmm-source.glb'), meta)

# ================================================================ THE WET-MIX PLANT
def mixplant():
    global root
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    ACC.clear(); root = empty('OMGroupWMMPlant')
    add_box(A('concrete'), (-2.0, -.1, -1.0), (80.0, .2, 22.0))
    BXs = [-34.0, -28.0, -22.0, -16.0]
    for i, bx in enumerate(BXs):
        frustum(A('paintDark'), (bx, 0), 2.6, 5.0, .6, 2.4)
        add_box(A('beam'), (bx, 5.05, 0), (4.9, .12, .12)); add_box(A('beam'), (bx, 5.05, 2.4), (4.9, .12, .12)); add_box(A('beam'), (bx, 5.05, -2.4), (4.9, .12, .12))
        for z in (-1, 1): rail_run(A('orangeRail'), A('orangeRail'), (bx - 2.4, z * 2.4), (bx + 2.4, z * 2.4), 1.0, 1.3, 5.05)
        add_box(A('motor'), (bx, 1.5, -1.0), (1.4, .5, 1.0)); add_box(A('belt'), (bx, 1.35, 0), (1.5, .08, 1.0)); add_cyl(A('roller'), (bx - .75, 1.35, 0), .14, 1.0, 16, axis='z'); add_cyl(A('roller'), (bx + .75, 1.35, 0), .14, 1.0, 16, axis='z')
    for sx in (-1, 1):
        for sz in (-1, 1):
            for bx in (BXs[0] - 3.0, BXs[-1] + 3.0): add_box(A('beam'), (bx if sx < 0 else bx, 1.4, sz * 2.4), (.3, 2.8, .3)) if False else None
    for xx in (BXs[0] - 2.8, BXs[1] + 3.0, BXs[2] + 3.0, BXs[3] + 2.8):
        for sz in (-1, 1): add_box(A('beam'), (xx, 1.7, sz * 2.4), (.3, 3.4, .3)); footing(xx, sz * 2.4, .85)
    for yy in (2.6, 5.0): add_box(A('beam'), ((BXs[0] + BXs[-1]) / 2, yy, 2.4), (BXs[-1] - BXs[0] + 5.6, .2, .14)); add_box(A('beam'), ((BXs[0] + BXs[-1]) / 2, yy, -2.4), (BXs[-1] - BXs[0] + 5.6, .2, .14))
    ga = (-37.0, 1.2); gb = (-12.0, 1.2); conveyor(ga, gb, 1.0, legs=(.1, .35, .6, .9), guard=False)        # the gathering belt under the feeders
    ia = (-11.5, 1.2); ib = (5.0, 11.0); conveyor(ia, ib, 1.0, legs=(.3, .55, .8))
    prism(A('paintDark'), [(ib[0] - .7, ib[1] - .3), (ib[0] + .6, ib[1] - .3), (ib[0] + .6, ib[1] + .45), (ib[0] - .2, ib[1] + .45), (ib[0] - .7, ib[1] + .1)], -.7, .7)
    # the oversize screen
    for sx in (-1, 1):
        for sz in (-1, 1): add_box(A('beam'), (9.0 + sx * 2.0, 4.7, sz * 1.5), (.28, 9.4, .28)); footing(9.0 + sx * 2.0, sz * 1.5, .85)
    add_box(A('paintDark'), (9.0, 9.9, 0), (4.2, 1.0, 2.2)); add_box(A('grate'), (9.0, 10.3, 0), (3.9, .05, 2.0)); add_cyl(A('motor'), (9.0, 10.9, 0), .45, 1.4, 30, axis='z')
    for yy in (3.0, 6.6): add_box(A('beam'), (9.0, yy, 1.5), (4.0, .2, .14)); add_box(A('beam'), (9.0, yy, -1.5), (4.0, .2, .14))
    # the pugmill on its own tower
    PX0, PX1, PY, PW = 15.0, 24.0, 6.4, 2.0
    for xx in (PX0 + 1.0, PX1 - 1.0):
        for sz in (-1, 1): add_box(A('beam'), (xx, 3.0, sz * 1.5), (.34, 6.0, .34)); footing(xx, sz * 1.5, .9)
    for yy in (2.2, 4.4): add_box(A('beam'), ((PX0 + PX1) / 2, yy, 1.5), (PX1 - PX0 - 1.4, .2, .14)); add_box(A('beam'), ((PX0 + PX1) / 2, yy, -1.5), (PX1 - PX0 - 1.4, .2, .14))
    for z in (-1, 1): xbrace(A('beam'), PX0 + 1.0, PX1 - 1.0, 2.3, 4.3, z * 1.5, .04)
    add_box(A('paintDark'), ((PX0 + PX1) / 2, PY - .05, -PW / 2), (PX1 - PX0, 1.5, .1)); add_box(A('paintDark'), ((PX0 + PX1) / 2, PY - .72, 0), (PX1 - PX0, .1, PW)); add_box(A('paintDark'), (PX0, PY, 0), (.12, 1.5, PW)); add_box(A('paintDark'), (PX1, PY, 0), (.12, 1.5, PW))
    add_box(A('glass'), ((PX0 + PX1) / 2, PY - .05, PW / 2), (PX1 - PX0, 1.5, .03))
    for sz in (-1, 1): add_box(A('beam'), ((PX0 + PX1) / 2, PY + .72, sz * PW / 2), (PX1 - PX0, .1, .16))
    for k in range(1, 6): add_box(A('beam'), (PX0 + k * (PX1 - PX0) / 6, PY + .72, 0), (.1, .08, PW))
    for yy in (.55, 1.0): pass
    # twin shafts with paddles
    for nm, zz in (('ShaftA', -.5), ('ShaftB', .5)):
        sh = empty(nm, root, ((PX0 + PX1) / 2, PY - .1, zz)); bm = bmesh.new(); L2 = PX1 - PX0 - .3
        cyl_between(bm, (-L2 / 2, 0, 0), (L2 / 2, 0, 0), .09, 16)
        for k in range(int(L2 / .62)):
            x = -L2 / 2 + .4 + k * .62; a = (k * 1.2 + (0 if zz < 0 else .8)); dx, dy = math.cos(a) * .42, math.sin(a) * .42
            cyl_between(bm, (x, 0, 0), (x, dy, dx), .035, 8); add_box(bm, (x, dy, dx), (.16, .1, .26), rot=Rz(a * .5))
        new_obj(nm + '_Mesh', bm, MAT['paddle'], sh, bevel=.004, bev_seg=1)
    # water spray bar, a motor and gearbox, discharge hopper
    cyl_between(A('pipeBlue'), (PX0 + 1.0, PY + 1.1, -.0), (PX1 - 2.5, PY + 1.1, -.0), .08, 14)
    for k in range(6): x = PX0 + 1.4 + k * 1.3; cyl_between(A('galv'), (x, PY + 1.1, 0), (x, PY + .62, 0), .03, 8)
    add_box(A('motor'), (PX0 - 1.0, PY - .1, 0), (1.3, 1.2, 1.4)); add_cyl(A('motor'), (PX0 - 2.1, PY - .1, 0), .5, 1.3, 30, axis='x')
    frustum_pts(A('paintDark'), [(PX1 - 3.3, PY - .72, -.9), (PX1 - 1.3, PY - .72, -.9), (PX1 - 1.3, PY - .72, .9), (PX1 - 3.3, PY - .72, .9)], [(PX1 - 2.6, PY - 2.6, -.5), (PX1 - 2.0, PY - 2.6, -.5), (PX1 - 2.0, PY - 2.6, .5), (PX1 - 2.6, PY - 2.6, .5)])
    ps = (PX1 - 6.0, PY - .72); cyl_between(A('galv'), (PX1 - 1.4, PY + .72, -.8), (PX1 - 1.4, PY + .72, .8), .05, 8)
    inlet = [(ib[0] + .2, ib[1] - .4, -.5), (ib[0] + .2, ib[1] - .4, .5), (ib[0] - .5, ib[1] - .4, .5), (ib[0] - .5, ib[1] - .4, -.5)]
    # water tank, pump and pipe to the spray bar
    open_tank(A('pipeBlue'), 30.0, -6.5, 1.9, 3.6, .08, 56); add_cyl(A('galv'), (30.0, 3.64, -6.5), 1.94, .08, 56)
    cyl_between(A('pipeBlue'), (28.1, 1.0, -6.5), (22.0, 1.0, -6.5), .1, 12); cyl_between(A('pipeBlue'), (22.0, 1.0, -6.5), (22.0, PY + 1.1, -6.5), .1, 12); cyl_between(A('pipeBlue'), (22.0, PY + 1.1, -6.5), (22.0, PY + 1.1, 0), .1, 12)
    add_box(A('motor'), (26.0, .4, -6.5), (.9, .8, .6)); add_cyl(A('motor'), (26.0, .4, -5.9), .3, .6, 24, axis='z')
    # control cabin
    add_box(A('cabin'), (-6.0, 1.3, -9.0), (3.6, 2.6, 2.6)); add_box(A('beam'), (-6.0, 2.65, -9.0), (3.8, .12, 2.8)); add_box(A('glassP'), (-6.0, 1.6, -7.68), (2.0, .85, .04)); add_box(A('beam'), (-7.6, .9, -7.68), (.8, 1.8, .05))
    meta = {'bins': [{'x': x, 'top': 5.0} for x in BXs], 'gather': {'a': [ga[0], ga[1] + .1], 'b': [gb[0], gb[1] + .1]}, 'incl': {'a': [ia[0], ia[1] + .1], 'b': [ib[0], ib[1] + .1]}, 'pug': {'x0': PX0, 'x1': PX1, 'y': PY, 'w': PW}, 'dis': [PX1 - 2.3, PY - 2.6], 'water': {'x': 30.0, 'z': -6.5}, 'shadow': {'x': -2.0, 'z': -1.0, 'w': 80.0, 'd': 22.0}}
    finish('om-group-wmm-plant', os.path.join(GLB_DIR, 'om-group-wmm-plant.glb'), meta)

source()
mixplant()
print('[wmm3d] done')
