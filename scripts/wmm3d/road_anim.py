# OM GROUP - WMM motion loops: the same road-works scenes, with the machines driving. exec'd by build-road.py before the stage files.
# usage:  ANIM=1 STAGE=<stage> [FRAMES=72] [W=1280] [SAMPLES=28] blender -b --factory-startup -P scripts/wmm3d/build-road.py -- <repo> [--quick]
# writes _review/wmm3d/anim/<stage>.mp4 (H.264, seamless loop: every move goes out and comes back, wheels turn with the distance travelled)
MACH = []      # (glb name, root empty, nodes by name, yaw) in import order
STREAM = []    # stones falling from the tipper into the paver hopper

def _find(nodes, prefix):
    return [o for k, o in sorted(nodes.items()) if k.split('.')[0] == prefix]

def _ease(u):          # 0 -> 1 -> 0 over one loop, at rest at both ends
    return .5 * (1 - math.cos(2 * math.pi * u))

def _plan():
    """per stage: [(machine name, occurrence, dx metres, spin turns of the auger)]"""
    st = STAGE
    if st == 'transport': return [('tipper', 0, -3.4), ('paver', 0, 0.0)]
    if st == 'spread': return [('paver', 0, 1.2), ('tipper', 0, 0.0)]
    if st == 'roll': return [('roller', 0, -2.4)]
    if st == 'check': return [('roller', 0, 2.6)]
    if st[:4] in ('thin', 'thic') or st[:3] == 'med': return [('roller', 0, 3.4)]
    if st == 'edge': return [('roller', 0, 2.6), ('roller', 1, -2.6)]
    return []

def _setup_motion():
    plan = _plan(); seen = {}; movers = []
    for name, root, nodes, yaw in MACH:
        k = seen.get(name, 0); seen[name] = k + 1
        for pn, occ, dx in plan:
            if pn == name and occ == k:
                wheels = [(o, R) for pre, R in (('Drum', .82), ('RearWheelL', .72), ('RearWheelR', .72)) for o in _find(nodes, pre)]
                wheels += [(o, .55) for kk, o in nodes.items() if kk.startswith('Wheel_')]
                auger = _find(nodes, 'Auger')
                for o, _ in wheels + [(a, 0) for a in auger]: o.rotation_mode = 'XYZ'
                movers.append(dict(name=name, root=root, nodes=nodes, x0=root.location.x, dx=dx, yaw=yaw, wheels=wheels, auger=auger))
    return movers

def _pinmap():
    st = STAGE
    if st == 'transport': return {'tipper': ('tipper', 0)}
    if st == 'spread': return {'paver': ('paver', 0), 'hopper': ('paver', 0)}
    if st in ('roll', 'check') or st[:4] in ('thin', 'thic') or st[:3] == 'med': return {'roller': ('roller', 0)}
    if st == 'edge': return {'confined': ('roller', 0), 'unconfined': ('roller', 1)}
    return {}

def animate_stage(co, pts):
    movers = _setup_motion(); N = int(os.environ.get('FRAMES', '72')); sc = scene
    pm = _pinmap(); PIN = {k: [] for k in pm}; seen2 = {}; owner = {}
    for name, root, nodes, yaw in MACH:
        k = seen2.get(name, 0); seen2[name] = k + 1; owner[(name, k)] = root
    shift = -2.0 if (STAGE[:4] in ('thin', 'thic') or STAGE[:3] == 'med' or STAGE == 'edge') else 0.0
    tipper = next((m for m in movers if m['name'] == 'tipper'), None)
    tn = next((n for nm, r, n, y in MACH if nm == 'tipper'), None)
    def pose(s):
        u = (sc.frame_current - 1) / N
        for m in movers:
            d = m['dx'] * _ease(u); m['root'].location.x = m['x0'] + d; s_loc = d * math.cos(m['yaw'])
            for o, R in m['wheels']: o.rotation_euler.y = s_loc / R
            for a in m['auger']: a.rotation_euler.y = 4 * math.pi * u * (1 if m['name'] == 'paver' else 0) * 2
        if STAGE == 'spread' and tn: tipper_pose(tn, 24.0 + 6.0 * _ease(u))
        bpy.context.view_layer.update()
        for key, mk in pm.items():
            mv = next((m for m in movers if m['name'] == mk[0] and m['root'] is owner.get(mk)), None); dx = (mv['dx'] * _ease(u)) if mv else 0.0
            p = pts[key]; c = world_to_camera_view(sc, co, V(p[0] + dx, p[1] + (shift if key in ('roller', 'confined', 'unconfined') else 0.0), p[2])); PIN[key].append([round(c.x, 4), round(1 - c.y, 4)])
        for (ob, t, jx, zo, jy, p0, p1, _r) in STREAM:
            t2 = (t + 2 * u) % 1.0; raw = zo / (.6 + .5 * t)
            x = p0[0] + (p1[0] - p0[0]) * t2 + jx; z = p0[2] + raw * (.6 + .5 * t2); y = p0[1] + (p1[1] - p0[1]) * t2 * t2 + .12 * math.sin(math.pi * t2) + jy
            ob.location = V(x, y, z)
    bpy.app.handlers.frame_change_pre.clear(); bpy.app.handlers.frame_change_pre.append(pose)
    sc.frame_start, sc.frame_end = 1, N; sc.render.fps = 24
    sc.cycles.samples = int(os.environ.get('SAMPLES', '28')); sc.render.use_persistent_data = True
    sc.render.resolution_x = int(os.environ.get('W', '1280')); sc.render.resolution_y = sc.render.resolution_x // 2; sc.render.resolution_percentage = 100
    sc.render.image_settings.media_type = 'VIDEO'; sc.render.image_settings.file_format = 'FFMPEG'; ff = sc.render.ffmpeg; ff.format = 'MPEG4'; ff.codec = 'H264'; ff.constant_rate_factor = 'HIGH'; ff.ffmpeg_preset = 'GOOD'; ff.gopsize = 24
    d = os.path.join(OUT, 'anim'); os.makedirs(d, exist_ok=True); sc.render.filepath = os.path.join(d, STAGE + '.mp4')
    if os.environ.get('PINSONLY'):
        for f in range(1, N + 1): sc.frame_set(f)
        json.dump(PIN, open(os.path.join(d, STAGE + '.pins.json'), 'w')); print('[wmm3d] pins', STAGE); return
    bpy.ops.render.render(animation=True); json.dump(PIN, open(os.path.join(d, STAGE + '.pins.json'), 'w')); print('[wmm3d] wrote', sc.render.filepath)
