"""Z-fighting finder: imports a GLB and lists pairs of large flat faces from DIFFERENT parts that lie in the same plane and overlap.
  blender -b --factory-startup -P scripts/hma3d/find-coplanar.py -- <glb> [tolerance m, default .006] [min face area m2, default .01]
same-direction pairs fight on the outside; opposite-direction pairs (back to back) fight wherever a material is drawn double-sided (the paver's cut-away)."""
import bpy, sys, numpy as np
a = sys.argv[sys.argv.index('--') + 1:]; glb = a[0]; TOL = float(a[1]) if len(a) > 1 else .006; AMIN = float(a[2]) if len(a) > 2 else .01
bpy.ops.wm.read_factory_settings(use_empty=True); bpy.ops.import_scene.gltf(filepath=glb)
P = []   # (obj name, normal, d, bbox min, bbox max)
for ob in bpy.data.objects:
    if ob.type != 'MESH': continue
    me = ob.data; M = ob.matrix_world; R = M.to_3x3()
    for pl in me.polygons:
        if pl.area * (abs(M.to_scale()[0]) ** 2) < AMIN: continue
        vs = np.array([(M @ me.vertices[i].co)[:] for i in pl.vertices]); n = np.array((R @ pl.normal)[:]); L = np.linalg.norm(n)
        if L < 1e-6: continue
        n /= L; c = vs.mean(0); P.append((ob.name, n, float(n @ c), vs.min(0), vs.max(0)))
print('faces considered', len(P))
seen = {}; N = len(P)
for i in range(N):
    for j in range(i + 1, N):
        A, B = P[i], P[j]
        if A[0] == B[0]: continue
        dot = float(A[1] @ B[1])
        if abs(dot) < .999: continue
        dd = abs(A[2] - B[2]) if dot > 0 else abs(A[2] + B[2])
        if dd > TOL: continue
        lo = np.maximum(A[3], B[3]); hi = np.minimum(A[4], B[4]); ex = hi - lo
        if (ex < -1e-4).any(): continue
        ax = int(np.argmax(np.abs(A[1]))); dims = [k for k in range(3) if k != ax]
        area = float(max(ex[dims[0]], 0) * max(ex[dims[1]], 0))
        if area < 5e-3: continue
        key = (A[0], B[0], 'same' if dot > 0 else 'back-to-back'); r = seen.setdefault(key, [0, 0.0, dd, lo, hi]); r[0] += 1; r[1] += area
for (x, y, k), (n, ar, dd, lo, hi) in sorted(seen.items(), key=lambda t: -t[1][1]):
    print('%-12s %-26s %-26s faces %-3d overlap %.3f m2  gap %.4f  at x %.2f..%.2f y %.2f..%.2f z %.2f..%.2f' % (k, x, y, n, ar, dd, lo[0], hi[0], lo[1], hi[1], lo[2], hi[2]))
