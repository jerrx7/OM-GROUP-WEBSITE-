"""OM GROUP - the 8x4 tipper for the Hot Mix paving scene: the same truck as scripts/excavator3d/build-tipper.py, with the tailgate as its own node
`Tailgate` (hinged at the top bar of the body), so it can swing open while the body discharges the mix into the paver hopper.

  blender -b --factory-startup -P scripts/hma3d/build-tipper-hma.py -- <repo root>

Output
  assets/3d/om-group-tipper-hma.glb / .json, _review/excavator3d/om-group-tipper-hma.blend
The original om-group-tipper.glb (used on other pages) is not touched: this script patches the source text of build-tipper.py in memory.
"""
import os, sys
_argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
_ROOT = os.path.abspath(_argv[0] if _argv else os.getcwd())
src = open(os.path.join(_ROOT, 'scripts', 'excavator3d', 'build-tipper.py')).read()

def swap(old, new):
    global src
    if src.count(old) != 1: raise SystemExit('[tipper-hma] patch failed: ' + old[:60])
    src = src.replace(old, new)

swap("GLB = os.path.join(ROOT, 'assets', '3d', 'om-group-tipper.glb')", "GLB = os.path.join(ROOT, 'assets', '3d', 'om-group-tipper-hma.glb')")
swap("open(os.path.join(ROOT, 'assets', '3d', 'om-group-tipper.json'), 'w')", "open(os.path.join(ROOT, 'assets', '3d', 'om-group-tipper-hma.json'), 'w')")
swap("filepath=os.path.join(OUT, 'om-group-tipper.blend')", "filepath=os.path.join(OUT, 'om-group-tipper-hma.blend')")
# the tailgate plate and its stiffeners leave the body shell; the top bar (the hinge) stays on the body
swap("add_box(bm, (-.04, .78, 0), (.09, 1.5, 2 * BZ - .12))                                       # tailgate\n", "")
swap("add_box(bm, (-.08, 1.55, 0), (.12, .1, 2 * BZ)); add_box(bm, (-.1, .78, 0), (.04, .1, 2 * BZ - .2)); add_box(bm, (-.1, .4, 0), (.04, .1, 2 * BZ - .2)); add_box(bm, (-.1, 1.15, 0), (.04, .1, 2 * BZ - .2))",
     "add_box(bm, (-.08, 1.55, 0), (.12, .1, 2 * BZ))")
swap("decal('Logo_Tailgate', MAT['logo'], bed, (-.108, .78, 0), 1.3, plane='x')",
     """tg = empty('Tailgate', bed, (-.06, 1.52, 0))                    # hinge on the top bar; the plate hangs below it (rotation.z < 0 swings the bottom out)
bm = bmesh.new(); add_box(bm, (.02, -.74, 0), (.09, 1.5, 2 * BZ - .12))
for yy in (-.74, -1.12, -.37): add_box(bm, (-.04, yy, 0), (.04, .1, 2 * BZ - .2))
for s in (-1, 1): add_box(bm, (-.03, -.74, s * (BZ - .1)), (.06, 1.46, .07))
new_obj('TailgatePlate', bm, MAT['body'], tg, bevel=.015, bev_seg=2)
bm = bmesh.new()
for s in (-1, 1): add_cyl(bm, (0, 0, s * (BZ - .2)), .055, .16, 16, axis='z')
new_obj('TailgateHinges', bm, MAT['graphite'], tg, bevel=.006)
bm = bmesh.new()
for s in (-1, 1): add_box(bm, (-.05, -1.4, s * (BZ - .28)), (.1, .1, .16))
new_obj('TailgateLatches', bm, MAT['graphite'], tg, bevel=.008)
decal('Logo_Tailgate', MAT['logo'], tg, (-.068, -.74, 0), 1.3, plane='x')""")
exec(compile(src, 'build-tipper-hma', 'exec'))
