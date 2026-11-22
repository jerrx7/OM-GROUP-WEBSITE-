# OM GROUP - WMM stills: leafy foliage cards (alpha-cut clumps) instead of displaced balls. exec'd after road_env.py; overrides tree() and far_land().

def foliage_mat(name, base, var=.35, shade=.55):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N_, L_ = nt.nodes, nt.links; P = next(x for x in N_ if x.type == 'BSDF_PRINCIPLED')
    uv = N_.new('ShaderNodeTexCoord'); sep = N_.new('ShaderNodeSeparateXYZ'); L_.new(uv.outputs['UV'], sep.inputs['Vector'])
    gen = N_.new('ShaderNodeTexCoord')
    nz = N_.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 11; nz.inputs['Detail'].default_value = 9; nz.inputs['Roughness'].default_value = .66; L_.new(gen.outputs['Object'], nz.inputs['Vector'])
    du = N_.new('ShaderNodeMath'); du.operation = 'SUBTRACT'; du.inputs[1].default_value = .5; L_.new(sep.outputs['X'], du.inputs[0]); dv = N_.new('ShaderNodeMath'); dv.operation = 'SUBTRACT'; dv.inputs[1].default_value = .5; L_.new(sep.outputs['Y'], dv.inputs[0])
    du2 = N_.new('ShaderNodeMath'); du2.operation = 'MULTIPLY'; L_.new(du.outputs[0], du2.inputs[0]); L_.new(du.outputs[0], du2.inputs[1]); dv2 = N_.new('ShaderNodeMath'); dv2.operation = 'MULTIPLY'; L_.new(dv.outputs[0], dv2.inputs[0]); L_.new(dv.outputs[0], dv2.inputs[1])
    ad = N_.new('ShaderNodeMath'); ad.operation = 'ADD'; L_.new(du2.outputs[0], ad.inputs[0]); L_.new(dv2.outputs[0], ad.inputs[1]); sq = N_.new('ShaderNodeMath'); sq.operation = 'SQRT'; L_.new(ad.outputs[0], sq.inputs[0])
    rd = N_.new('ShaderNodeMath'); rd.operation = 'MULTIPLY'; rd.inputs[1].default_value = 1.7; L_.new(sq.outputs[0], rd.inputs[0])
    nn = N_.new('ShaderNodeMath'); nn.operation = 'MULTIPLY'; nn.inputs[1].default_value = 1.35; L_.new(nz.outputs['Fac'], nn.inputs[0])
    sb = N_.new('ShaderNodeMath'); sb.operation = 'SUBTRACT'; L_.new(nn.outputs[0], sb.inputs[0]); L_.new(rd.outputs[0], sb.inputs[1])
    mr = N_.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = -.04; mr.inputs['From Max'].default_value = .12; L_.new(sb.outputs[0], mr.inputs['Value']); L_.new(mr.outputs['Result'], P.inputs['Alpha'])
    n2 = N_.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 26; n2.inputs['Detail'].default_value = 6; L_.new(gen.outputs['Object'], n2.inputs['Vector'])
    cr = N_.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].color = (base[0] * (1 - var), base[1] * (1 - var * .5), base[2] * (1 - var), 1); cr.color_ramp.elements[1].color = (base[0] * (1 + var), base[1] * (1 + var), base[2] * (1 + var * .3), 1); L_.new(n2.outputs['Fac'], cr.inputs['Fac'])
    vg = N_.new('ShaderNodeMath'); vg.operation = 'MULTIPLY_ADD'; vg.inputs[1].default_value = 1.0 - shade; vg.inputs[2].default_value = shade; L_.new(sep.outputs['Y'], vg.inputs[0])
    mx = N_.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1.0; L_.new(cr.outputs['Color'], mx.inputs[6])
    gr = N_.new('ShaderNodeCombineColor'); L_.new(vg.outputs[0], gr.inputs[0]); L_.new(vg.outputs[0], gr.inputs[1]); L_.new(vg.outputs[0], gr.inputs[2]); L_.new(gr.outputs[0], mx.inputs[7])
    L_.new(mx.outputs[2], P.inputs['Base Color']); P.inputs['Roughness'].default_value = .62
    try: P.inputs['Subsurface Weight'].default_value = .0
    except Exception: pass
    return m

def card(name, c, w, h, yaw, tilt, mat):
    bm = bmesh.new(); vs = [bm.verts.new(p) for p in ((-w / 2, 0, -h / 2), (w / 2, 0, -h / 2), (w / 2, 0, h / 2), (-w / 2, 0, h / 2))]; bm.faces.new(vs)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = new_obj(name, me); me.materials.append(mat); uv = me.uv_layers.new(name='UVMap')
    for p in me.polygons:
        for li, (u, v) in zip(p.loop_indices, ((0, 0), (1, 0), (1, 1), (0, 1))): uv.data[li].uv = (u, v)
    ob.location = V(*c); ob.rotation_euler = (math.radians(tilt), 0, yaw)
    return ob

def tree(x, z, s, rng, mat, sub=4):
    global _BARK
    if _BARK is None: _BARK = mat_plain('Bark', (.12, .08, .055), .9, 0, 0)
    cyl('Trunk', (x, 0, z), (x + rng.uniform(-.2, .2) * s * .1, s * .6, z), s * .04, _BARK, 8, r1=s * .018)
    for k in range(9):
        cy = s * rng.uniform(.62, 1.1); cx = x + rng.uniform(-.3, .3) * s; cz = z + rng.uniform(-.3, .3) * s
        card('Fol', (cx, cy, cz), s * rng.uniform(.95, 1.5), s * rng.uniform(.7, 1.1), rng.uniform(0, 3.14), rng.uniform(-14, 14), mat)

def far_land():
    rng = random.Random(5)
    layers = [(115, 150, (.17, .26, .21), 12, 70, .22), (78, 108, (.11, .20, .10), 9.5, 80, .3), (52, 72, (.07, .15, .055), 7.5, 60, .38)]
    for (r0, r1, base, ss, n, vr) in layers:
        fm_ = foliage_mat('Fol%d' % r0, base, vr, .5)
        for k in range(n):
            ang = rng.uniform(-1.3, 1.3); R = rng.uniform(r0, r1); x = R * math.sin(ang) - 8 + rng.uniform(-4, 4); z = -R * math.cos(ang) - 6
            tree(x, z, ss * rng.uniform(.8, 1.5), rng, fm_)
    fm = frond_mat()
    for k in range(9):
        ang = rng.uniform(-1.0, 1.0); R = rng.uniform(44, 86); palm(R * math.sin(ang) - 8, -R * math.cos(ang) - 5, rng.uniform(9, 14), rng, fm)
