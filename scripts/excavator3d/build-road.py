"""OM GROUP - road machines for the Wet Mix Macadam and Granular Sub-base pages: a single-drum vibratory roller and a tracked paver finisher.

  blender -b --factory-startup -P scripts/excavator3d/build-road.py -- <repo root>

Output
  assets/3d/om-group-roller.glb   single-drum vibratory roller (yellow, charcoal, the OM GROUP mark on the hood): steel drum (node `Drum`, turned by the web scene) with scraper bars and a spray bar,
                                  yoke frame, articulated rear chassis, engine hood, two rear tyres (nodes `RearWheelL/R`), ROPS canopy, seat, steering wheel, beacon. Travels +x, the drum at +x.
  assets/3d/om-group-paver.glb    tracked paver finisher: two crawler tracks, engine hood with the mark, a front hopper with wings and push rollers, a conveyor floor, a rear screed on tow arms with an auger
                                  (node `Auger`), operator platform and canopy. Travels +x, the hopper at +x.
  _review/excavator3d/om-group-roller.blend, om-group-paver.blend

Metres, three.js axes (x forward, y up, z toward the viewer). Materials and helpers come from build-tipper.py's header and bpy_helpers.py. Generic machines: not any particular OM GROUP unit.
"""
import os, sys
_argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
_ROOT = os.path.abspath(_argv[0] if _argv else os.getcwd())
_src = open(os.path.join(_ROOT, 'scripts', 'excavator3d', 'build-tipper.py')).read()
_head = _src[:_src.index('# ================================================================ THE TRUCK')]
exec(_head)
YELLOW = MAT['yellow']; DARK = MAT['graphite']; STEEL = MAT['steel']; DRUM = MAT['trackWorn']
MAT['hoodY'] = pbr('PaintYellowHood', YEL, 0.0, .36, IMG_N, .22, rough_img('hoody', .36, .05), coat=.45)
YH = MAT['hoodY']
MAT['grate'] = pbr('GratingSteel', (.34, .35, .37), 1.0, .42, IMG_RN, .6, rough_img('grate', .42, .1))

def finish(root, name, glb):
    def sel_tree(o):
        o.select_set(True)
        for c in o.children: sel_tree(c)
    bpy.ops.object.select_all(action='DESELECT'); sel_tree(root); bpy.context.view_layer.objects.active = root
    opts = dict(filepath=glb, export_format='GLB', use_selection=True, export_apply=True, export_texcoords=True, export_normals=True, export_tangents=False,
                export_materials='EXPORT', export_yup=True, export_cameras=False, export_lights=False, export_extras=True, export_image_format='WEBP', export_image_quality=82)
    for drop in ([], ['export_image_quality'], ['export_image_quality', 'export_image_format']):
        try: bpy.ops.export_scene.gltf(**{k: v for k, v in opts.items() if k not in drop}); break
        except TypeError as e: print('[road3d] gltf option retry', e)
    print('[road3d]', name, 'GLB', os.path.getsize(glb), 'bytes')
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, name + '.blend'))
    bpy.ops.object.select_all(action='DESELECT')
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)

def big_tyre(name, parent, x, z, ro=.72, ri=.42, w=.6):
    g = empty(name, parent, (x, ro, z)); bm = bmesh.new(); tyre(bm, 0, 0, 0, ro=ro, ri=ri, w=w, n=56); new_obj(name + '_Tyre', bm, MAT['tyre'], g, tile=.3)
    bm = bmesh.new(); sgn = 1 if z > 0 else -1
    add_cyl(bm, (0, 0, 0), ri + .02, w - .06, 48, axis='z'); add_cyl(bm, (0, 0, sgn * (w / 2 - .02)), ri - .02, .06, 48, axis='z')
    for k in range(12):
        a = 2 * math.pi * k / 12; hexbolt(bm, math.cos(a) * (ri - .12), math.sin(a) * (ri - .12), sgn * (w / 2 + .01), r=.026, h=.03)
    add_cyl(bm, (0, 0, sgn * (w / 2 + .02)), .12, .08, 24, axis='z')
    new_obj(name + '_Rim', bm, MAT['rim'], g, bevel=.008, bev_seg=1)
    return g

# ================================================================ ROLLER
def roller():
    root = empty('OMGroupRoller')
    # drum: a steel shell with a rib of vibration weights inside the end plates, turned about z
    DX, DR, DW = 2.4, .82, 2.14
    drum = empty('Drum', root, (DX, DR, 0))
    bm = bmesh.new(); add_cyl(bm, (0, 0, 0), DR, DW, 72, axis='z')
    for k in range(40):                                         # weld lines / shell bands read as small steps in the roughness
        pass
    new_obj('Drum_Shell', bm, DRUM, drum, bevel=.01, bev_seg=2, tile=.7)
    bm = bmesh.new()
    for s in (-1, 1):
        add_cyl(bm, (0, 0, s * (DW / 2 + .02)), DR * .62, .06, 56, axis='z'); add_cyl(bm, (0, 0, s * (DW / 2 + .07)), DR * .3, .08, 40, axis='z')
        for k in range(16):
            a = 2 * math.pi * k / 16; hexbolt(bm, math.cos(a) * DR * .5, math.sin(a) * DR * .5, s * (DW / 2 + .06), r=.03, h=.03)
    new_obj('Drum_EndPlates', bm, YELLOW, drum, bevel=.008, bev_seg=1)
    # yoke arms and the drum frame (do not turn)
    bm = bmesh.new()
    for s in (-1, 1):
        add_box(bm, (DX - .55, DR + .22, s * (DW / 2 + .22)), (1.3, .5, .16)); add_box(bm, (DX, DR, s * (DW / 2 + .25)), (.6, .6, .12))
        add_cyl(bm, (DX, DR, s * (DW / 2 + .22)), .22, .14, 32, axis='z')
    add_box(bm, (DX - 1.05, DR + .52, 0), (.5, .5, DW + .6)); add_box(bm, (DX - 1.4, DR + .55, 0), (.4, .6, 1.2))
    new_obj('DrumFrame', bm, YELLOW, root, bevel=.02)
    bm = bmesh.new()                                            # scraper bars and a spray bar with nozzles
    for xo in (.84, -.84): add_box(bm, (DX + xo, DR * .42, 0), (.06, .14, DW - .1))
    new_obj('Scrapers', bm, DARK, root, bevel=.01)
    bm = bmesh.new(); cyl_between(bm, (DX + .93, DR * 1.9, -DW / 2 + .1), (DX + .93, DR * 1.9, DW / 2 - .1), .03, 12)
    for z in np.linspace(-DW / 2 + .2, DW / 2 - .2, 7): add_cyl(bm, (DX + .93, DR * 1.9 - .06, z), .02, .08, 8, r2=.03)
    new_obj('SprayBar', bm, STEEL, root)
    # articulation joint and the front frame
    bm = bmesh.new(); add_box(bm, (.9, 1.1, 0), (.7, .62, 1.3)); add_cyl(bm, (.95, 1.45, 0), .13, .6, 24); add_cyl(bm, (.95, .85, 0), .13, .4, 24)
    new_obj('ArticulationJoint', bm, DARK, root, bevel=.03)
    # rear chassis: engine hood in profile, side panels, counterweight
    bm = bmesh.new(); prism(bm, [(.6, 1.0), (.6, 1.72), (.0, 2.02), (-1.6, 1.94), (-2.25, 1.62), (-2.28, 1.0)], -.92, .92)
    new_obj('EngineHood', bm, YH, root, bevel=.07, bev_seg=4, tile=.4)
    bm = bmesh.new(); add_box(bm, (-2.36, 1.3, 0), (.2, .62, 1.7)); add_box(bm, (-2.4, 1.0, 0), (.16, .16, 1.9))
    new_obj('Counterweight', bm, DARK, root, bevel=.03)
    bm = bmesh.new(); prism(bm, [(.58, .62), (.58, 1.0), (-2.25, 1.0), (-2.25, .62)], -.9, .9)
    new_obj('Chassis', bm, MAT['chassis'], root, bevel=.02)
    bm = bmesh.new()                                            # radiator grille and hood louvres
    for k in range(10): add_box(bm, (-2.29, 1.18 + k * .05, 0), (.03, .018, 1.4))
    for s in (-1, 1):
        for k in range(8): add_box(bm, (-1.7 + k * .11, 1.97, s * .55), (.05, .03, .5))
    new_obj('Grille', bm, DARK, root, bevel=.004, bev_seg=1)
    big_tyre('RearWheelL', root, -1.2, 1.08); big_tyre('RearWheelR', root, -1.2, -1.08)
    for s in (-1, 1):                                           # rear mudguards
        bm = bmesh.new(); pts = [(-1.2 + (.8 + .03) * math.cos(math.radians(a)), .72 + (.8 + .03) * math.sin(math.radians(a))) for a in np.linspace(15, 165, 13)]
        prism(bm, pts + [(x, y - .05) for (x, y) in [(-1.2 + .8 * math.cos(math.radians(a)), .72 + .8 * math.sin(math.radians(a))) for a in np.linspace(165, 15, 13)]], s * 1.08 - .36, s * 1.08 + .36)
        new_obj('Mudguard_%d' % s, bm, YELLOW, root, bevel=.01, bev_seg=1)
    # operator platform, ROPS canopy, seat, controls
    bm = bmesh.new(); add_box(bm, (-.25, 2.0, 0), (1.2, .06, 1.7)); add_box(bm, (-.2, 2.32, 0), (.14, .7, .14));
    new_obj('Platform', bm, MAT['grate'], root, bevel=.008)
    bm = bmesh.new()
    for x, z in ((.35, .85), (.35, -.85), (-.85, .85), (-.85, -.85)): cyl_between(bm, (x, 2.0, z), (x, 3.55, z), .045, 12)
    add_box(bm, (-.25, 3.6, 0), (1.5, .09, 2.0)); add_box(bm, (-.25, 3.56, 0), (1.4, .05, 1.9))
    new_obj('ROPS', bm, YELLOW, root, bevel=.015)
    bm = bmesh.new(); add_box(bm, (-.55, 2.12, 0), (.55, .22, .5)); add_box(bm, (-.78, 2.5, 0), (.12, .55, .5)); add_box(bm, (-.55, 2.28, 0), (.5, .08, .46))
    new_obj('Seat', bm, MAT['seat'], root, bevel=.04)
    bm = bmesh.new(); cyl_between(bm, (.1, 2.05, 0), (.2, 2.65, 0), .04, 10); add_cyl(bm, (.22, 2.7, 0), .24, .04, 32, axis='y'); add_box(bm, (.14, 2.3, .42), (.3, .5, .16)); add_box(bm, (.14, 2.3, -.42), (.3, .5, .16))
    new_obj('Controls', bm, MAT['chassis'], root, bevel=.01)
    bm = bmesh.new(); add_cyl(bm, (-1.7, 2.4, .6), .06, .8, 14); add_cyl(bm, (-1.7, 2.84, .6), .09, .06, 14); add_cyl(bm, (-2.0, 2.25, -.5), .2, .35, 24)
    new_obj('Exhaust', bm, STEEL, root, bevel=.008)
    bm = bmesh.new(); add_cyl(bm, (-.2, 3.74, 0), .1, .14, 20); new_obj('Beacon', bm, MAT['amber'], root)
    bm = bmesh.new(); add_box(bm, (.1, 3.52, .9), (.2, .1, .14)); add_box(bm, (.1, 3.52, -.9), (.2, .1, .14))
    new_obj('Lamps', bm, MAT['lamp'], root)
    bm = bmesh.new(); add_box(bm, (-2.38, .98, .62), (.04, .22, .3)); add_box(bm, (-2.38, .98, -.62), (.04, .22, .3)); new_obj('RearLamps', bm, MAT['red'], root)
    bm = bmesh.new(); add_box(bm, (DX - .7, DR + .85, 0), (.04, .02, DW)) if False else None
    bm = bmesh.new()                                            # side stripe and hazard marks
    for s in (-1, 1): add_box(bm, (-.7, 1.32, s * .925), (2.4, .14, .01))
    new_obj('Stripe', bm, MAT['stripe'], root)
    decal('Logo_Hood_L', MAT['logo'], root, (-.85, 1.58, .94), 1.25); decal('Logo_Hood_R', MAT['logo'], root, (-.85, 1.58, -.94), 1.25, side=-1)
    finish(root, 'om-group-roller', os.path.join(ROOT, 'assets', '3d', 'om-group-roller.glb'))

# ================================================================ PAVER
def paver():
    root = empty('OMGroupPaver')
    # crawler tracks: rubber belt around a stadium, sprocket and idler, road wheels
    for s in (-1, 1):
        zc = s * 1.35; tl = 3.6; tr = .55
        bm = bmesh.new(); prof = []
        for a in np.linspace(-90, 90, 13): prof.append((tl / 2 - .3 + tr * math.cos(math.radians(a)), tr + .0 + tr * math.sin(math.radians(a))))
        for a in np.linspace(90, 270, 13): prof.append((-tl / 2 + .3 + tr * math.cos(math.radians(a)), tr + tr * math.sin(math.radians(a))))
        prism(bm, prof, zc - .3, zc + .3); new_obj('Track_%d' % s, bm, MAT['rubber'], root, bevel=.01, bev_seg=1, tile=.4)
        bm = bmesh.new()
        for k in range(46):                                      # track shoes: transverse ribs around the belt
            u = k / 46.0; L1 = tl - .6; per = 2 * L1 + 2 * math.pi * tr; d = u * per
            if d < L1: x, y, a = -tl / 2 + .3 + d, 0.0, 0.0
            elif d < L1 + math.pi * tr: t = (d - L1) / tr; x, y, a = tl / 2 - .3 + tr * math.sin(t), tr - tr * math.cos(t), t
            elif d < 2 * L1 + math.pi * tr: x, y, a = tl / 2 - .3 - (d - L1 - math.pi * tr), 2 * tr, math.pi
            else: t = (d - 2 * L1 - math.pi * tr) / tr; x, y, a = -tl / 2 + .3 - tr * math.sin(t), tr + tr * math.cos(t), math.pi + t
            add_box(bm, (x, y + .005, zc), (.07, .05, .62), rot=Rz(a))
        new_obj('TrackShoes_%d' % s, bm, MAT['trackSteel'], root, bevel=.004, bev_seg=1)
        bm = bmesh.new()
        for x in (tl / 2 - .3, -tl / 2 + .3): add_cyl(bm, (x, tr, zc), tr - .06, .44, 36, axis='z'); add_cyl(bm, (x, tr, zc + s * .24), .22, .06, 24, axis='z')
        for x in np.linspace(-tl / 2 + .9, tl / 2 - .9, 4): add_cyl(bm, (x, .2, zc), .17, .5, 20, axis='z')
        new_obj('TrackWheels_%d' % s, bm, STEEL, root, bevel=.008)
        bm = bmesh.new(); add_box(bm, (0, tr * 2 - .02, zc + s * .3), (tl - .4, .18, .08)); add_box(bm, (0, .6, zc + s * .34), (tl - .6, .5, .06))
        new_obj('TrackGuard_%d' % s, bm, YELLOW, root, bevel=.015)
    # main body, engine hood with the mark, chassis
    bm = bmesh.new(); prism(bm, [(1.9, 1.15), (1.9, 1.85), (1.2, 2.1), (-.6, 2.08), (-1.3, 1.9), (-1.35, 1.15)], -.95, .95)
    new_obj('EngineHood', bm, YH, root, bevel=.07, bev_seg=4, tile=.4)
    bm = bmesh.new(); add_box(bm, (.3, 1.0, 0), (3.5, .3, 2.2)); add_box(bm, (2.3, 1.1, 0), (.8, .5, 2.4))
    new_obj('Chassis', bm, MAT['chassis'], root, bevel=.03)
    bm = bmesh.new()
    for k in range(9): add_box(bm, (-1.38, 1.3 + k * .055, 0), (.03, .02, 1.3))
    for s in (-1, 1):
        for k in range(7): add_box(bm, (-.2 + k * .12, 2.1, s * .55), (.05, .03, .55))
    new_obj('Grille', bm, DARK, root, bevel=.004, bev_seg=1)
    # the front hopper: floor, two tilted wings, push rollers, the conveyor slats on the floor
    bm = bmesh.new(); add_box(bm, (3.4, 1.18, 0), (2.4, .12, 3.2)); new_obj('HopperFloor', bm, DARK, root, bevel=.02)
    bm = bmesh.new()
    for k in range(18): add_box(bm, (2.3 + k * .125, 1.26, 0), (.05, .03, 2.8))
    new_obj('ConveyorSlats', bm, MAT['trackWorn'], root, bevel=.004, bev_seg=1)
    for s in (-1, 1):
        bm = bmesh.new(); add_box(bm, (3.4, 1.7, s * 1.75), (2.4, 1.15, .1), rot=Matrix.Rotation(s * -.42, 4, Vector((1, 0, 0)))) if False else None
        bm = bmesh.new(); prism(bm, [(2.15, 1.2), (4.55, 1.2), (4.55, 2.15), (2.15, 2.15)], 0, .1)
        ob = new_obj('HopperWing_%d' % s, bm, YELLOW, root, bevel=.02, loc=(0, 0, s * 1.55))
        ob.rotation_euler = Matrix.Rotation(s * -.5, 4, Vector((1, 0, 0))).to_euler(); ob.location = V(0, 0, s * 1.55)
    bm = bmesh.new(); add_cyl(bm, (4.65, .62, 0), .17, 2.6, 24, axis='z'); add_box(bm, (4.55, .6, 0), (.12, .24, 2.7))
    for s in (-1, 1): add_cyl(bm, (4.65, .62, s * 1.34), .24, .06, 24, axis='z')
    new_obj('PushRollers', bm, DARK, root, bevel=.01)
    bm = bmesh.new(); add_box(bm, (4.0, 1.12, 0), (1.8, .2, .1)); new_obj('HopperBrace', bm, YELLOW, root)
    # the screed: a wide steel plate at the rear on tow arms, with end gates, and an auger in front of it
    SX = -3.1
    for s in (-1, 1):
        bm = bmesh.new(); cyl_between(bm, (-1.1, 1.3, s * 1.2), (SX + .5, .95, s * 1.45), .09, 14); add_box(bm, (-.9, 1.3, s * 1.2), (.4, .3, .3)); add_cyl(bm, (-1.1, 1.3, s * 1.2), .15, .2, 20, axis='z')
        new_obj('TowArm_%d' % s, bm, YELLOW, root, bevel=.012)
    bm = bmesh.new(); add_box(bm, (SX, .56, 0), (.9, .09, 3.3)); add_box(bm, (SX + .1, .76, 0), (.45, .38, 3.2)); add_box(bm, (SX + .3, 1.0, 0), (.3, .15, 3.1))
    for s in (-1, 1): add_box(bm, (SX, .58, s * 1.66), (1.0, .55, .06)); add_box(bm, (SX + .3, .8, s * 1.5), (.3, .4, .2))
    new_obj('Screed', bm, MAT['trackWorn'], root, bevel=.012)
    bm = bmesh.new(); add_box(bm, (SX + .15, 1.12, 0), (.7, .3, 3.0)); new_obj('ScreedHousing', bm, DARK, root, bevel=.02)
    aug = empty('Auger', root, (SX + 1.05, .62, 0)); bm = bmesh.new(); cyl_between(bm, (0, 0, -1.5), (0, 0, 1.5), .13, 16)
    steps = 90; rows = []
    for i in range(steps + 1):
        ph = 2 * math.pi * i / 24 * 1.0; z = -1.5 + 3.0 * i / steps * 1.0 + 0.0
        zz = -1.5 + (3.0 * i / steps); a = 2 * math.pi * (zz + 1.5) / .5
        rows.append([bm.verts.new(V(rr * math.cos(a), rr * math.sin(a), zz + dz)) for (rr, dz) in ((.13, -.02), (.42, -.02), (.42, .02), (.13, .02))])
    for i in range(steps):
        for j in range(4): bm.faces.new((rows[i][j], rows[i][(j + 1) % 4], rows[i + 1][(j + 1) % 4], rows[i + 1][j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    new_obj('Auger_Flights', bm, STEEL, aug, uv=True, tile=.4)
    # operator platform, canopy, seat, console
    bm = bmesh.new(); add_box(bm, (-.7, 2.15, 0), (1.6, .07, 2.6)); new_obj('Platform', bm, MAT['grate'], root, bevel=.008)
    bm = bmesh.new()
    for x, z in ((.1, 1.2), (.1, -1.2), (-1.4, 1.2), (-1.4, -1.2)): cyl_between(bm, (x, 2.15, z), (x, 3.65, z), .045, 12)
    add_box(bm, (-.65, 3.7, 0), (1.9, .09, 2.8)); new_obj('Canopy', bm, YELLOW, root, bevel=.015)
    bm = bmesh.new(); add_box(bm, (-.9, 2.35, 0), (.6, .22, .55)); add_box(bm, (-1.12, 2.7, 0), (.12, .6, .55)); new_obj('Seat', bm, MAT['seat'], root, bevel=.04)
    bm = bmesh.new(); add_box(bm, (-.2, 2.45, 0), (.45, .6, 1.1)); add_box(bm, (-.2, 2.78, 0), (.5, .08, 1.2)); new_obj('Console', bm, MAT['chassis'], root, bevel=.02)
    bm = bmesh.new(); add_cyl(bm, (-1.0, 2.5, 1.0), .06, .7, 14); add_cyl(bm, (-1.0, 2.88, 1.0), .09, .06, 14); new_obj('Exhaust', bm, STEEL, root, bevel=.008)
    bm = bmesh.new(); add_cyl(bm, (-.65, 3.85, 0), .1, .14, 20); new_obj('Beacon', bm, MAT['amber'], root)
    bm = bmesh.new()
    for s in (-1, 1): add_box(bm, (-1.38, 1.4, s * .6), (.04, .22, .28))
    new_obj('RearLamps', bm, MAT['red'], root)
    bm = bmesh.new()
    for s in (-1, 1): add_box(bm, (.3, 1.6, s * .965), (2.8, .12, .01))
    new_obj('Stripe', bm, MAT['stripe'], root)
    decal('Logo_Hood_L', MAT['logo'], root, (.35, 1.65, .96), 1.4); decal('Logo_Hood_R', MAT['logo'], root, (.35, 1.65, -.96), 1.4, side=-1)
    finish(root, 'om-group-paver', os.path.join(ROOT, 'assets', '3d', 'om-group-paver.glb'))

roller()
paver()
print('[road3d] done')
