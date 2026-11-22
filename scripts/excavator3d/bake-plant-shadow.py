"""Contact shadow / ambient-occlusion pass of the RMC plant on its ground (alpha only), rendered top-down with Cycles from the saved plant .blend.
  blender -b _review/excavator3d/om-group-rmc-plant.blend -P scripts/excavator3d/bake-plant-shadow.py -- <repo root>
Output: _review/excavator3d/plant-shadow.png (RGBA). scripts/excavator3d/finish-plant-shadow.js turns it into assets/3d/om-group-rmc-plant-shadow.webp."""
import bpy, math, os, sys
ROOT = os.path.abspath(sys.argv[sys.argv.index('--') + 1]); NAME = os.environ.get('BAKE_NAME', 'plant-shadow'); OUT = os.path.join(ROOT, '_review', 'excavator3d', NAME + '.png')
scene = bpy.context.scene; scene.render.engine = 'CYCLES'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for kind in ('OPTIX', 'CUDA'):
        try: prefs.compute_device_type = kind
        except Exception: continue
        prefs.get_devices(); devs = [d for d in prefs.devices if d.type == kind]
        if devs:
            for d in prefs.devices: d.use = d.type == kind
            scene.cycles.device = 'GPU'; break
except Exception as e: print('gpu', e)
for o in bpy.data.objects:
    if o.type == 'MESH':
        if o.name == os.environ.get('BAKE_GROUND', 'Ground'): o.is_shadow_catcher = True
        else: o.visible_camera = False
W, D, CX, CZ = [float(v) for v in os.environ.get('BAKE_FRAME', '50,21,18,.5').split(',')]
cam = bpy.data.cameras.new('Top'); cam.type = 'ORTHO'; cam.ortho_scale = W; co = bpy.data.objects.new('Top', cam); scene.collection.objects.link(co); co.location = (CX, -CZ, 60); co.rotation_euler = (0, 0, 0); scene.camera = co
w = bpy.data.worlds.new('AO'); w.use_nodes = True; bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (1, 1, 1, 1); bg.inputs['Strength'].default_value = 1.0; scene.world = w
scene.render.film_transparent = True; scene.render.resolution_x = 2048; scene.render.resolution_y = int(2048 * D / W); scene.render.resolution_percentage = 100
scene.cycles.samples = 160; scene.cycles.use_denoising = True; scene.cycles.max_bounces = 3
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGBA'; scene.render.filepath = OUT
scene.view_settings.view_transform = 'Standard'
bpy.ops.render.render(write_still=True); print('[plant3d] shadow done', OUT)
