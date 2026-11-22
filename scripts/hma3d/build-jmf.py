"""OM GROUP - Hot Mix Asphalt page: the Job Mix Formula proportioning figure, as a Blender Cycles still.
  blender -b --factory-startup -P scripts/hma3d/build-jmf.py -- <repo root> [--quick]
Out: _review/hma3d/jmf.png (RGBA, shadow catcher so the contact shadow sits on the page) + jmf-anchors.json (label anchors, 0-1 of the frame).
Scene: four aggregate / filler / bitumen heaps on a concrete plinth, a dark control panel with four proportion sliders behind them (no numbers: the
page states that the proportions come from the approved JMF), a drum mixer on the right pouring finished mix into an orange-lit tray."""
import os
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'common.py'), encoding='utf8').read())
W, H = 2400, 1560
sc = setup_scene(W, H, 220)
world_studio(.8, (.97, .96, .94), (.70, .70, .72))

# ---------------------------------------------------------------- materials
CONC = bump(mat('concrete', (.12, .118, .115), 0, .78, spec=.2), 120, .16); rough_var(CONC, .72, .92)
CONC_EDGE = bump(mat('concrete2', (.1, .098, .096), 0, .55, coat=.1), 200, .08)
PANEL = mat('panel', (.006, .006, .008), .0, .6, coat=.0, spec=.12)
PANEL_IN = mat('panelin', (.011, .0115, .015), .0, .55, coat=.0, spec=.18)
TRACK = mat('track', (.12, .125, .14), .2, .35)
KNOB = mat('knob', (.86, .86, .88), .85, .16)
FILL = mat('fill', (.04, .01, .0), 0, 1.0, emit=(1, .27, .015), estr=.95, spec=0)
ORANGE = mat('orange', (.92, .27, .07), .2, .32, coat=.6)
STEEL = bump(mat('steel', (.78, .79, .81), 1, .22), 400, .04, 4); rough_var(STEEL, .16, .34, 40)
DARKSTEEL = mat('dsteel', (.12, .12, .13), .9, .35)
GLOW = mat('glow', (1, .45, .1), 0, .5, emit=(1, .42, .08), estr=9)
MIXDARK = mat('mixdark', (.012, .012, .014), 0, .22, coat=.3)
BITUMEN = bump(mat('bitumen', (.004, .004, .006), 0, .16, coat=.5, spec=.6), 5, .07, 3)
FILLER = bump(mat('filler', (.74, .73, .71), 0, .96), 140, .10, 8)
FINE_BASE = mat('finebase', (.30, .30, .31), 0, .9)
COARSE = stone_mat('coarse', .06, .26, .72, (1, 1.0, 1.04), 55, .7)
FINE = stone_mat('fine', .12, .42, .74, (1.03, 1.0, .95), 150, .6)
MIXSTONE = stone_mat('mixstone', .018, .06, .28, (1, 1, 1.02), 120, .25)

# ---------------------------------------------------------------- plinth + piles
shadow_floor(22)
box('plinth', (8.6, 2.3, .34), (.3, -.85, .17), CONC, r=.05)
box('plinth_top', (8.4, 2.12, .03), (.3, -.85, .355), CONC_EDGE, r=.01)
PILES = {'coarse': (-3.0, -.9), 'fine': (-1.35, -.9), 'filler': (.3, -.9), 'bitumen': (1.9, -.9)}
heap('coarse', 'c', (PILES['coarse'][0], PILES['coarse'][1], .37), .95, 1.12, 820, .21, COARSE, mat('cb', (.07, .07, .075), 0, .9), seed=3)
heap('fine', 'f', (PILES['fine'][0], PILES['fine'][1], .37), .92, 1.0, 3600, .055, FINE, FINE_BASE, seed=5)
soft_heap('filler', (PILES['filler'][0], PILES['filler'][1], .37), .92, 1.0, FILLER, seed=3, amp=.018, freq=11)
# bitumen: glossy black dome, flatter, with a slow sag skirt
soft_heap('bitumen', (PILES['bitumen'][0], PILES['bitumen'][1], .37), 1.0, .62, BITUMEN, seed=7, amp=.035, freq=2.2, grid=220, sharp=2.6)

# ---------------------------------------------------------------- the panel
box('panel', (8.6, .22, 3.7), (.55, .75, 2.2), PANEL, r=.14, seg=6)
box('panel_in', (8.3, .02, 3.4), (.55, .63, 2.2), PANEL_IN, r=.1, seg=5)
box('divider', (.02, .02, 3.0), (1.25, .62, 2.2), mat('div', (.5, .5, .52), 0, .4, emit=(.5, .5, .55), estr=.15), r=0)
FR = [.62, .48, .34, .21]
SLZ = [3.22, 2.62, 2.02, 1.42]
for i, (z, f) in enumerate(zip(SLZ, FR)):
    x0, x1 = -3.1, .85
    box('trk%d' % i, (x1 - x0, .05, .17), ((x0 + x1) / 2, .59, z), TRACK, r=.08, seg=6)
    fw = (x1 - x0) * f
    box('fil%d' % i, (fw, .06, .17), (x0 + fw / 2, .575, z), FILL, r=.08, seg=6)
    kx = x0 + fw
    for t in range(21):
        box('tk%d_%d' % (i, t), (.012, .02, .045 if t % 5 else .07), (x0 + (x1 - x0) * t / 20, .6, z - .21), mat('tkm', (.4, .4, .43), 0, .5), r=0)
    cyl('knob%d' % i, .17, .07, (kx, .54, z), (math.radians(90), 0, 0), KNOB, 64)
    cyl('knobc%d' % i, .075, .075, (kx, .50, z), (math.radians(90), 0, 0), mat('kc%d' % i, (.05, .02, .0), 0, 1.0, emit=(1, .3, .02), estr=1.1, spec=0), 32)

# ---------------------------------------------------------------- the mixer (drum on an orange cradle) + finished-mix tray
MX, MY, MZ = 2.85, .2, 2.65
d = Vector((.38, -.8, -.46)).normalized()                      # axis, mouth end toward the camera and down
rotq = d.to_track_quat('Z', 'Y'); rot = rotq.to_euler()
shell = cyl('drum', .9, 1.7, (MX, MY, MZ), rot, STEEL, 96, caps=False)
bmm = bmesh.new(); bmm.from_mesh(shell.data)
back = cyl('drum_back', .9, .04, (MX - d.x * .85, MY - d.y * .85, MZ - d.z * .85), rot, STEEL, 96)
mod = shell.modifiers.new('sol', 'SOLIDIFY'); mod.thickness = .045; mod.offset = -1
bmm.free()
rim = torus('rim', .9, .04, (MX + d.x * .845, MY + d.y * .845, MZ + d.z * .845), rot, STEEL)
inner = cyl('drum_in', .83, .06, (MX + d.x * .15, MY + d.y * .15, MZ + d.z * .15), rot, GLOW, 72)
mixdisc = sphere('drum_mix', .8, (MX + d.x * .25, MY + d.y * .25, MZ + d.z * .25), MIXDARK, scale=(1, 1, .36), seg=48); mixdisc.rotation_euler = rot
for k in (-.4, .4):
    torus('ring%d' % int(k * 10), .91, .05, (MX + d.x * k, MY + d.y * k, MZ + d.z * k), rot, ORANGE)
# cradle: two legs + base frame
for sx in (-1, 1):
    box('leg%d' % sx, (.2, .5, 2.05), (MX + sx * .78, MY + .1, 1.0 + .17), ORANGE, r=.05)
box('cradle_base', (1.7, .55, .12), (MX, MY + .1, .34 + .06), ORANGE, r=.03)
box('cradle_top', (1.55, .14, .13), (MX, MY + .12, 1.75), ORANGE, r=.03)
# drive motor + chain housing
cyl('motor', .2, .5, (MX + .95, MY + .3, 1.7), (0, math.radians(90), 0), DARKSTEEL, 32)

# finished-mix tray (orange lit rim) in front of the mixer
TX, TY = 3.15, -.9
box('tray', (2.0, 1.35, .22), (TX, TY, .45), mat('traymat', (.04, .04, .045), .2, .3), r=.06)
box('tray_glow', (2.06, 1.41, .04), (TX, TY, .575), GLOW, r=.015)
box('tray_in', (1.9, 1.25, .04), (TX, TY, .6), MIXDARK, r=.01)
heap('mixheap', 'm', (TX, TY, .62), .72, .62, 650, .095, MIXSTONE, mat('mb', (.01, .01, .012), 0, .3), seed=9)
# stream of mix from the mouth into the heap
mouth = Vector((MX, MY, MZ)) + d * .9
tube('stream', [mouth + Vector((0, 0, -.1)), Vector((mouth.x + .12, mouth.y - .1, mouth.z - .8)), Vector((TX, TY + .02, 1.15)), Vector((TX, TY, .98))], .1, MIXDARK)

# ---------------------------------------------------------------- lights + camera
area_light('key', (-5.5, -7.5, 7.5), (0, 0, 1.4), 1300, 6.5, (1, .97, .93), sy=4.5)
area_light('fill', (7.0, -6.5, 3.5), (0, 0, 1.2), 520, 5, (.93, .96, 1))
area_light('rim', (1.0, 5.5, 6.0), (1, .5, 1.8), 800, 4, (1, .94, .88))
area_light('under', (0, -6, 1.0), (0, 0, 1.0), 120, 8, (1, 1, 1))
cam = camera((.35, -14.0, 3.7), (.35, 0, 1.7), 50, (0, 0))

anch = {
  'sl0': (-3.1, .55, 3.22 + .17), 'sl1': (-3.1, .55, 2.62 + .17), 'sl2': (-3.1, .55, 2.02 + .17), 'sl3': (-3.1, .55, 1.42 + .17),
  'pcoarse': (PILES['coarse'][0], -2.0, .38), 'pfine': (PILES['fine'][0], -1.95, .38), 'pfiller': (PILES['filler'][0], -1.95, .38), 'pbitumen': (PILES['bitumen'][0], -1.95, .38),
  'mixer': (1.5, .55, 3.78), 'finished': (TX, TY - .72, .5),
}
json.dump(project(cam, anch), open(os.path.join(OUT, 'jmf-anchors.json'), 'w'))
render(os.path.join(OUT, 'jmf.png'))
print('[jmf] done')
