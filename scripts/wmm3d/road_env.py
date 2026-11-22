# OM GROUP - WMM stills: the outdoor environment (ground, tree line, palms). exec'd by build-road.py after its helpers; overrides terrain() and far_land().

def mat_mix(name, mapsA, mapsB, nscale=.09, lo=.42, hi=.62, nstr=1.0):
    """two PBR texture sets blended by a large noise (soil / dry grass)"""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N_, L_ = nt.nodes, nt.links; P = next(x for x in N_ if x.type == 'BSDF_PRINCIPLED')
    uv = N_.new('ShaderNodeUVMap'); uv.uv_map = 'UVMap'
    def tex(arr, cs, sub):
        img = save_img(name + sub, arr, cs); t = N_.new('ShaderNodeTexImage'); t.image = img; t.interpolation = 'Cubic'; L_.new(uv.outputs['UV'], t.inputs['Vector']); return t.outputs['Color']
    tc = N_.new('ShaderNodeTexCoord'); nz = N_.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = nscale; nz.inputs['Detail'].default_value = 5; L_.new(tc.outputs['Object'], nz.inputs['Vector'])
    cr = N_.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].position = lo; cr.color_ramp.elements[1].position = hi; L_.new(nz.outputs['Fac'], cr.inputs['Fac'])
    def mix(a_, b_):
        mx = N_.new('ShaderNodeMix'); mx.data_type = 'RGBA'; L_.new(cr.outputs['Color'], mx.inputs['Factor']); L_.new(a_, mx.inputs[6]); L_.new(b_, mx.inputs[7]); return mx.outputs[2]
    col = mix(tex(mapsA[0], 'sRGB', '_aA'), tex(mapsB[0], 'sRGB', '_aB')); nrm = mix(tex(mapsA[1], 'Non-Color', '_nA'), tex(mapsB[1], 'Non-Color', '_nB'))
    rgh = mix(tex(mapsA[2], 'Non-Color', '_rA'), tex(mapsB[2], 'Non-Color', '_rB'))
    L_.new(col, P.inputs['Base Color']); L_.new(rgh, P.inputs['Roughness']); nm = N_.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nstr; L_.new(nrm, nm.inputs['Color']); L_.new(nm.outputs['Normal'], P.inputs['Normal'])
    try: P.inputs['Specular IOR Level'].default_value = .3
    except Exception: pass
    return m

def terrain():
    soil = speckle_maps(NS, 61, (.31, .20, .12), [(.44, .29, .17), (.24, .15, .09), (.52, .41, .29), (.36, .3, .15), (.18, .11, .07)], 30000, (2.0, 7.0), (.2, .9), .12, big=(70, 7, 15, [(.46, .3, .17), (.3, .2, .12), (.55, .5, .42)]), tone=.2, rough=(.92, .04))
    grass = speckle_maps(NS, 62, (.17, .21, .07), [(.28, .33, .1), (.12, .17, .05), (.4, .4, .14), (.21, .26, .08), (.34, .27, .1), (.09, .12, .04)], 42000, (1.4, 4.2), (.2, .9), .14, tone=.3, rough=(.94, .03))
    mat = mat_mix('Ground', soil, grass, nscale=.11, lo=.46, hi=.58)
    def h(x, z):
        d = max(0.0, abs(z) - ZH); edge = min(1.0, d / 4.0)
        return -.004 + (.07 * noise2(x, z, .5, 3) + .025 * noise2(x, z, 2.1, 8) + .008 * noise2(x, z, 9, 2)) * edge
    grid_surface('Ground', -110, 110, -110, 110, 520, 520, h, mat, uvs=3.4)
    return h

def leaf_mat(name, base, var=.35, rough=.55):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; P = next(x for x in nt.nodes if x.type == 'BSDF_PRINCIPLED')
    tc = nt.nodes.new('ShaderNodeTexCoord'); n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 3.2; n1.inputs['Detail'].default_value = 8; nt.links.new(tc.outputs['Object'], n1.inputs['Vector'])
    n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 38; n2.inputs['Detail'].default_value = 6; nt.links.new(tc.outputs['Object'], n2.inputs['Vector'])
    r = nt.nodes.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].color = (base[0] * (1 - var), base[1] * (1 - var * .6), base[2] * (1 - var), 1); r.color_ramp.elements[1].color = (base[0] * (1 + var * 1.2), base[1] * (1 + var * 1.1), base[2] * (1 + var * .4), 1)
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'FLOAT'; mx.inputs['Factor'].default_value = .5; nt.links.new(n1.outputs['Fac'], mx.inputs[2]); nt.links.new(n2.outputs['Fac'], mx.inputs[3]); nt.links.new(mx.outputs[0], r.inputs['Fac'])
    nt.links.new(r.outputs['Color'], P.inputs['Base Color']); P.inputs['Roughness'].default_value = rough
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = .5; nt.links.new(n2.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], P.inputs['Normal'])
    return m

_BARK = None
def tree(x, z, s, rng, mat, sub=4):
    """a broad-leaf tree: tapered trunk + a cluster of displaced lobes (a leafy silhouette, not smooth balls)"""
    global _BARK
    if _BARK is None: _BARK = mat_plain('Bark', (.12, .08, .055), .9, 0, 0)
    cyl('Trunk', (x, 0, z), (x + rng.uniform(-.2, .2) * s * .1, s * .62, z), s * .045, _BARK, 10, r1=s * .02)
    for k in range(rng.randint(7, 11)):
        r = s * rng.uniform(.26, .42); c = (x + rng.uniform(-.5, .5) * s * .5, s * rng.uniform(.62, 1.05), z + rng.uniform(-.5, .5) * s * .4)
        ob = sphere('Lobe', c, r, mat, sub, (rng.uniform(.9, 1.3), rng.uniform(.75, 1.0), rng.uniform(.9, 1.3)))
        tx = bpy.data.textures.new('lt', 'CLOUDS'); tx.noise_scale = .32; tx.noise_depth = 3
        d = ob.modifiers.new('d', 'DISPLACE'); d.texture = tx; d.strength = r * .9; d.mid_level = .45

def frond_mat():
    m = bpy.data.materials.new('Frond'); m.use_nodes = True; nt = m.node_tree; N_, L_ = nt.nodes, nt.links; P = next(x for x in N_ if x.type == 'BSDF_PRINCIPLED')
    uv = N_.new('ShaderNodeTexCoord'); sep = N_.new('ShaderNodeSeparateXYZ'); L_.new(uv.outputs['UV'], sep.inputs['Vector'])
    ab = N_.new('ShaderNodeMath'); ab.operation = 'SUBTRACT'; ab.inputs[1].default_value = .5; L_.new(sep.outputs['Y'], ab.inputs[0])
    ab2 = N_.new('ShaderNodeMath'); ab2.operation = 'ABSOLUTE'; L_.new(ab.outputs[0], ab2.inputs[0])
    ab3 = N_.new('ShaderNodeMath'); ab3.operation = 'MULTIPLY'; ab3.inputs[1].default_value = 2.0; L_.new(ab2.outputs[0], ab3.inputs[0])             # 0 on the rib .. 1 at the leaflet tips
    sx = N_.new('ShaderNodeMath'); sx.operation = 'MULTIPLY'; sx.inputs[1].default_value = 34; L_.new(sep.outputs['X'], sx.inputs[0])
    sk = N_.new('ShaderNodeMath'); sk.operation = 'MULTIPLY'; sk.inputs[1].default_value = 2.6; L_.new(ab3.outputs[0], sk.inputs[0])
    ad = N_.new('ShaderNodeMath'); ad.operation = 'ADD'; L_.new(sx.outputs[0], ad.inputs[0]); L_.new(sk.outputs[0], ad.inputs[1])
    fr = N_.new('ShaderNodeMath'); fr.operation = 'FRACT'; L_.new(ad.outputs[0], fr.inputs[0]); lt = N_.new('ShaderNodeMath'); lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = .6; L_.new(fr.outputs[0], lt.inputs[0])
    tp = N_.new('ShaderNodeMath'); tp.operation = 'SUBTRACT'; tp.inputs[0].default_value = 1.0; L_.new(sep.outputs['X'], tp.inputs[1])
    tp2 = N_.new('ShaderNodeMath'); tp2.operation = 'LESS_THAN'; L_.new(ab3.outputs[0], tp2.inputs[0]); L_.new(tp.outputs[0], tp2.inputs[1])                    # leaflets taper toward the tip of the frond
    rib = N_.new('ShaderNodeMath'); rib.operation = 'LESS_THAN'; rib.inputs[1].default_value = .06; L_.new(ab3.outputs[0], rib.inputs[0])
    al = N_.new('ShaderNodeMath'); al.operation = 'MULTIPLY'; L_.new(lt.outputs[0], al.inputs[0]); L_.new(tp2.outputs[0], al.inputs[1])
    al2 = N_.new('ShaderNodeMath'); al2.operation = 'MAXIMUM'; L_.new(al.outputs[0], al2.inputs[0]); L_.new(rib.outputs[0], al2.inputs[1])
    L_.new(al2.outputs[0], P.inputs['Alpha']); P.inputs['Base Color'].default_value = (.06, .17, .04, 1); P.inputs['Roughness'].default_value = .45
    return m

def palm(x, z, h, rng, fm):
    bark = mat_plain('PalmBark', (.2, .15, .1), .85, 0, 0)
    bend = rng.uniform(-.8, .8) * h * .16; pts = [(x + bend * (t * t), h * t, z + rng.uniform(-.05, .05) * h * .1 * t) for t in (0, .2, .4, .6, .8, 1.0)]
    for i in range(len(pts) - 1): cyl('Pt', pts[i], pts[i + 1], .26 - .09 * i / 5, bark, 9, r1=.26 - .09 * (i + 1) / 5)
    top = pts[-1]
    for k in range(15):
        ang = k * 2 * math.pi / 15 + rng.uniform(-.2, .2); L = rng.uniform(2.6, 3.4); droop = rng.uniform(1.1, 2.0); lift = rng.uniform(.4, 1.1)
        bm = bmesh.new(); g = {}; nu, nv = 18, 6
        for i in range(nu + 1):
            u = i / nu; wd = .55 * math.sin(math.pi * min(1, u * .9 + .08)) ** .8
            for j in range(nv + 1):
                v = j / nv - .5; px = L * u; py = lift * u - droop * u * u; pz = v * 2 * wd
                g[(i, j)] = bm.verts.new(V(top[0] + math.cos(ang) * px - math.sin(ang) * pz, top[1] + py + .3, top[2] + math.sin(ang) * px + math.cos(ang) * pz))
        for i in range(nu):
            for j in range(nv): bm.faces.new([g[(i, j)], g[(i, j + 1)], g[(i + 1, j + 1)], g[(i + 1, j)]])
        me = bpy.data.meshes.new('Fr'); bm.to_mesh(me); bm.free(); ob = new_obj('Fr', me); me.materials.append(fm); uv = me.uv_layers.new(name='UVMap')
        for p in me.polygons:
            for li in p.loop_indices:
                vi = me.loops[li].vertex_index; uv.data[li].uv = ((vi // (nv + 1)) / nu, (vi % (nv + 1)) / nv)
        for p in me.polygons: p.use_smooth = True

def far_land():
    """a layered tree line (three depths), a few coconut palms, so the horizon reads like a photograph"""
    rng = random.Random(5)
    layers = [(115, 150, (.17, .26, .21), 12, 46), (78, 108, (.11, .20, .10), 9.5, 46), (52, 72, (.07, .15, .055), 7.5, 38)]
    for (r0, r1, base, ss, n) in layers:
        lm = leaf_mat('Leaf%d' % r0, base, .4, .6)
        for k in range(n):
            ang = rng.uniform(-1.25, 1.25); R = rng.uniform(r0, r1); x = R * math.sin(ang) - 8 + rng.uniform(-4, 4); z = -R * math.cos(ang) - 6
            tree(x, z, ss * rng.uniform(.8, 1.5), rng, lm, 3)
    fm = frond_mat()
    for k in range(9):
        ang = rng.uniform(-1.0, 1.0); R = rng.uniform(44, 86); palm(R * math.sin(ang) - 8, -R * math.cos(ang) - 5, rng.uniform(9, 14), rng, fm)
