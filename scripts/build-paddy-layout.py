import bpy, math, os
from mathutils import Vector

ROOT = r"C:\Users\18313\Documents\deepseek-harness\default-workspace"
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 1600
scene.render.resolution_y = 900
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = os.path.join(ROOT, 'docs', 'concepts', 'generated', 'paddy-layout.png')
if scene.world is None:
    scene.world = bpy.data.worlds.new('World')
scene.world.color = (0.28, 0.34, 0.40)

def mat(name, color, rough=0.55):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = rough
    return m

GREEN = mat('pump green', (0.09, 0.24, 0.12), 0.42)
BLACK = mat('motor black', (0.018, 0.022, 0.024), 0.38)
YELLOW = mat('guard yellow', (0.75, 0.48, 0.04), 0.45)
STEEL = mat('galvanized steel', (0.52, 0.58, 0.60), 0.34)
BLUE = mat('valve blue', (0.03, 0.16, 0.45), 0.4)
GREY = mat('cabinet grey', (0.36, 0.39, 0.40), 0.45)
CONCRETE = mat('dry concrete', (0.47, 0.47, 0.43), 0.9)
WATER = mat('canal water', (0.08, 0.22, 0.24), 0.18)
PADDY = mat('paddy green', (0.16, 0.32, 0.12), 0.85)
ROOF = mat('shelter roof', (0.26, 0.30, 0.30), 0.5)
POST = mat('shelter post', (0.18, 0.20, 0.20), 0.5)

def add_box(name, loc, scale, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    return o

def add_cyl(name, p1, p2, radius, material):
    p1, p2 = Vector(p1), Vector(p2)
    d = p2 - p1
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius, depth=d.length, location=(p1+p2)/2)
    o = bpy.context.object
    o.name = name
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = d.to_track_quat('Z', 'Y')
    o.data.materials.append(material)
    return o

def add_sphere(name, loc, radius, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=radius, location=loc)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(material)
    return o

def add_torus(name, loc, radius, material):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=0.035, location=loc)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(material)
    return o

# ground / canal / paddy
add_box('pump pad', (0.6, 0, 0.12), (4.8, 3.2, 0.24), CONCRETE)
add_box('canal water', (-2.6, 0, 0.01), (2.0, 4.0, 0.02), WATER)
add_box('paddy field', (4.8, 0, 0.01), (3.0, 4.0, 0.02), PADDY)
# bank edges
add_box('canal bank', (-1.55, 0, 0.12), (0.5, 4.0, 0.24), CONCRETE)

# shelter
for x in (-1.3, 3.0):
    for y in (-1.5, 1.5):
        add_box('shelter post', (x, y, 1.45), (0.09, 0.09, 2.9), POST)
add_box('shelter roof', (0.85, 0, 2.95), (4.9, 3.5, 0.10), ROOF)
add_box('shelter back wall', (0.85, 1.55, 1.45), (4.9, 0.08, 2.8), ROOF)

# pump / motor / base
add_box('pump baseplate', (0.35, 0, 0.26), (2.1, 0.75, 0.08), GREEN)
add_cyl('pump casing', (-0.35, 0, 0.66), (-0.35, 0, 0.66), 0.36, GREEN)
# casing is a stubby cylinder along Y
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.36, depth=0.52, location=(-0.35, 0, 0.68), rotation=(math.pi/2,0,0))
o = bpy.context.object; o.name='pump casing'; o.data.materials.append(GREEN)
add_cyl('motor barrel', (0.48, 0, 0.64), (1.18, 0, 0.64), 0.27, BLACK)
add_cyl('motor fan cover', (1.18, 0, 0.64), (1.30, 0, 0.64), 0.23, BLACK)
add_cyl('coupling guard', (-0.02, 0, 0.64), (0.40, 0, 0.64), 0.22, YELLOW)
add_box('motor feet', (0.80, 0, 0.30), (0.95, 0.55, 0.12), BLACK)

# suction line: pump inlet left -> canal -> drop -> strainer
add_cyl('suction horizontal', (-0.72, 0, 0.58), (-2.05, 0, 0.58), 0.115, STEEL)
add_cyl('suction elbow', (-2.05, 0, 0.58), (-2.05, 0, 1.0), 0.115, STEEL)
add_cyl('suction drop', (-2.05, 0, 1.0), (-2.05, 0, 0.30), 0.115, STEEL)
add_cyl('suction strainer', (-2.05, 0, 0.18), (-2.05, 0, 0.42), 0.16, STEEL)
add_torus('strainer ring', (-2.05, 0, 0.32), 0.16, STEEL)

# discharge: pump top -> up -> right -> down over paddy
add_cyl('discharge riser', (-0.35, 0, 1.0), (-0.35, 0, 1.72), 0.105, STEEL)
add_cyl('discharge header', (-0.35, 0, 1.72), (4.25, 0, 1.72), 0.105, STEEL)
add_cyl('discharge drop', (4.25, 0, 1.72), (4.25, 0, 0.62), 0.105, STEEL)
add_torus('discharge outlet', (4.25, 0, 0.62), 0.105, STEEL)
# valve and gauge
add_cyl('valve body', (0.75, 0, 1.72), (0.95, 0, 1.72), 0.16, BLUE)
add_cyl('valve stem', (0.85, 0, 1.78), (0.85, 0, 2.08), 0.025, BLUE)
add_torus('valve handwheel', (0.85, 0, 2.08), 0.18, BLUE)
add_cyl('gauge stem', (-0.10, 0, 1.80), (-0.10, 0, 2.02), 0.022, STEEL)
add_cyl('gauge face', (-0.10, 0, 2.02), (-0.10, 0, 2.06), 0.09, STEEL)

# electrical cabinet under shelter, right wall
add_box('electrical cabinet', (2.95, 1.38, 1.30), (0.50, 0.16, 0.78), GREY)
add_box('cabinet door', (2.95, 1.29, 1.30), (0.38, 0.03, 0.62), GREY)
add_cyl('motor cable', (0.90, 0.24, 0.42), (2.72, 1.22, 0.42), 0.025, BLACK)
add_cyl('earth conductor', (0.95, 0.32, 0.28), (2.92, 1.22, 0.94), 0.018, YELLOW)


# pipe supports / saddles
def pipe_support(name, x, y, pipe_z, height):
    add_box(name + ' base plate', (x, y, 0.14), (0.24, 0.24, 0.04), STEEL)
    add_box(name + ' post', (x, y, pipe_z - height/2), (0.075, 0.075, height), POST)
    add_box(name + ' saddle', (x, y, pipe_z - 0.04), (0.22, 0.12, 0.07), STEEL)
    add_cyl(name + ' clamp left', (x - 0.10, y, pipe_z + 0.06), (x + 0.10, y, pipe_z + 0.06), 0.018, STEEL)
    add_cyl(name + ' clamp right', (x - 0.10, y, pipe_z + 0.14), (x + 0.10, y, pipe_z + 0.14), 0.018, STEEL)

pipe_support('suction support', -1.35, 0.30, 0.58, 0.44)
pipe_support('discharge support A', 0.75, 0.38, 1.72, 1.58)
pipe_support('discharge support B', 2.45, 0.38, 1.72, 1.58)
add_box('outlet stand base', (4.05, 0, 0.10), (0.28, 0.28, 0.05), STEEL)
add_box('outlet stand post', (4.05, 0, 0.36), (0.07, 0.07, 0.52), POST)
add_box('outlet stand cradle', (4.25, 0, 0.60), (0.18, 0.14, 0.06), STEEL)
# camera framing
bpy.ops.object.camera_add(location=(5.8, -9.0, 3.8))
cam = bpy.context.object
cam.data.lens = 35
target = Vector((0.9, 0.1, 0.95))
cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
scene.camera = cam

# light
bpy.ops.object.light_add(type='SUN', location=(3, -5, 7))
sun = bpy.context.object
sun.data.energy = 3.2
sun.rotation_euler = (math.radians(52), 0, math.radians(35))
bpy.ops.object.light_add(type='AREA', location=(-2, -3, 4))
area = bpy.context.object
area.data.energy = 500
area.data.size = 6
area.rotation_euler = (math.radians(50), 0, math.radians(-20))

bpy.ops.render.render(write_still=True)
print('LAYOUT_SAVED')



