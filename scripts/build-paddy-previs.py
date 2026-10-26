import bpy, math, random, os
from mathutils import Vector

ROOT = r"C:\Users\18313\Documents\deepseek-harness\default-workspace"
OUT_BLEND = os.path.join(ROOT, "blender", "previs", "paddy_v2_previs.blend")
OUT_DIR = os.path.join(ROOT, "docs", "concepts")
os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
os.makedirs(OUT_DIR, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
random.seed(2026)

def mat(name, color, metallic=0.0, roughness=0.6):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = roughness
    return m

M = {
    "earth": mat("Wet earth", (0.075, 0.055, 0.032), 0, 0.95),
    "mud": mat("Mud", (0.12, 0.085, 0.045), 0, 0.9),
    "water": mat("Paddy water", (0.035, 0.10, 0.085), 0.1, 0.15),
    "concrete": mat("Concrete", (0.42, 0.42, 0.36), 0, 0.95),
    "green": mat("Pump green", (0.035, 0.24, 0.11), 0.4, 0.42),
    "dark": mat("Dark steel", (0.035, 0.045, 0.043), 0.65, 0.36),
    "black": mat("Motor black", (0.012, 0.016, 0.016), 0.5, 0.38),
    "steel": mat("Galvanized", (0.42, 0.47, 0.45), 0.8, 0.32),
    "yellow": mat("Guard yellow", (0.55, 0.34, 0.04), 0.2, 0.5),
    "rice": mat("Rice", (0.13, 0.26, 0.105), 0, 0.8),
    "tree": mat("Tree", (0.035, 0.12, 0.055), 0, 0.9),
    "roof": mat("Roof", (0.10, 0.13, 0.12), 0.35, 0.55),
}

def box(name, loc, size, material, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    if bevel:
        m = o.modifiers.new("bevel", "BEVEL")
        m.width = bevel
        m.segments = 2
    return o

def cyl(name, loc, r, depth, material, axis="Z", verts=24):
    rot = (0, 0, 0)
    if axis == "X": rot = (0, math.pi/2, 0)
    if axis == "Y": rot = (math.pi/2, 0, 0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(material)
    return o

def pipe(name, a, b, r, material):
    a, b = Vector(a), Vector(b)
    d = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=r, depth=d.length, location=(a+b)/2)
    o = bpy.context.object
    o.name = name
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = Vector((0,0,1)).rotation_difference(d.normalized())
    o.data.materials.append(material)
    return o

def tree(x, y, scale):
    cyl(f"TreeTrunk_{x}_{y}", (x, y, 0.55*scale), 0.07*scale, 1.1*scale, M["tree"], "Z", 8)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.55*scale, location=(x, y, 1.3*scale))
    o = bpy.context.object
    o.name = f"TreeCrown_{x}_{y}"
    o.data.materials.append(M["tree"])
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.32*scale, location=(x+0.24*scale, y+0.06*scale, 1.5*scale))
    o2 = bpy.context.object
    o2.data.materials.append(M["tree"])

# Ground and paddy field
box("Earth", (0, 0, -0.08), (34, 26, 0.16), M["earth"])
water = box("PaddyWater", (0, 0, 0.012), (26, 20, 0.02), M["water"])
# bunds framing fields
for n, x, y, z, sx, sy, sz in [
    ("BundN", 0, -7.0, 0.09, 26, 0.34, 0.18),
    ("BundS", 0, 7.2, 0.09, 26, 0.34, 0.18),
    ("BundW", -13.0, 0, 0.09, 0.4, 14, 0.18),
    ("BundE", 13.0, 0, 0.09, 0.4, 14, 0.18),
    ("BundMid", 3.8, 0.4, 0.09, 0.3, 12, 0.18),
]:
    box(n, (x,y,z), (sx,sy,sz), M["mud"], 0.012)
# canal at left foreground, with banks
box("CanalBed", (-5.0, 0.6, -0.03), (2.2, 14, 0.06), M["earth"])
box("CanalWater", (-5.0, 0.6, 0.008), (1.35, 13.2, 0.02), M["water"])
for x in (-6.2, -3.8):
    box(f"CanalBank_{x}", (x, 0.6, 0.1), (0.28, 14, 0.18), M["mud"], 0.012)
# pump pad
box("PumpPad", (0.9, 0.1, 0.09), (3.5, 2.5, 0.18), M["concrete"], 0.03)
box("PadCurb", (0.9, 0.1, 0.02), (3.7, 2.7, 0.05), M["concrete"], 0.015)
# water paddy texture-ish strips (thin boxes for previs)
for i in range(8):
    box(f"PaddyRow_{i}", (7.5, -5.5 + i*1.5, 0.03), (10, 0.045, 0.02), M["mud"], 0)
# rice clusters, low proxies
bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.04, radius2=0.006, depth=0.55, location=(0,0,0.27))
plant = bpy.context.object
plant.name = "RiceTemplate"
plant.data.materials.append(M["rice"])
plants=[]
for i in range(260):
    x = random.uniform(-12, 12)
    y = random.uniform(-6.5, 6.5)
    if -7 < x < -3.2 and -6.5 < y < 7: continue
    if -0.9 < x < 2.7 and -1.2 < y < 1.4: continue
    bpy.ops.object.select_all(action="DESELECT")
    plant.select_set(True)
    bpy.context.view_layer.objects.active = plant
    bpy.ops.object.duplicate(linked=True)
    p = bpy.context.object
    p.location=(x,y,0.02)
    p.rotation_euler[2]=random.random()*math.tau
    p.scale=(1.0,1.0,0.7+random.random()*0.6)
    plants.append(p)
bpy.ops.object.select_all(action="DESELECT")
for p in plants: p.select_set(True)
bpy.context.view_layer.objects.active = plants[0]
bpy.ops.object.join()
rice = bpy.context.object
rice.name = "RiceField"
bpy.data.objects.remove(plant, do_unlink=True)

# shelter
box("ShelterFloor", (-1.8, -4.2, 0.08), (3.2, 2.2, 0.16), M["concrete"], 0.015)
for x in (-3.2, -0.4):
    for y in (-5.1, -3.3):
        box(f"ShelterPost_{x}_{y}", (x,y,1.15), (0.12,0.12,2.1), M["dark"], 0.01)
box("ShelterRoof", (-1.8, -4.2, 2.25), (3.6, 2.6, 0.12), M["roof"], 0.02)
box("ShelterBack", (-1.8, -5.25, 1.1), (3.2, 0.08, 1.9), M["dark"], 0.01)

# pump set blockout
box("Baseplate", (0.6, 0.1, 0.22), (1.8, 0.72, 0.1), M["dark"], 0.02)
box("SkidRailA", (0.6, -0.22, 0.16), (1.9, 0.12, 0.14), M["dark"], 0.01)
box("SkidRailB", (0.6, 0.42, 0.16), (1.9, 0.12, 0.14), M["dark"], 0.01)
cyl("PumpVolute", (-0.05, 0.1, 0.43), 0.27, 0.28, M["green"], "X", 32)
cyl("PumpSuction", (-0.42, 0.1, 0.43), 0.10, 0.52, M["green"], "X", 20)
cyl("PumpDischarge", (-0.05, 0.1, 0.69), 0.09, 0.34, M["green"], "Z", 20)
cyl("Motor", (1.02, 0.1, 0.43), 0.19, 0.58, M["black"], "X", 28)
for i in range(12):
    a=i/12*math.tau
    b=box(f"Fin_{i}", (1.02, 0.1+math.cos(a)*0.21, 0.43+math.sin(a)*0.21), (0.58,0.035,0.024), M["dark"], 0.002)
    b.rotation_euler[0]=a
box("TerminalBox", (1.0, 0.1, 0.65), (0.25,0.18,0.12), M["dark"], 0.01)
box("Guard", (0.38, 0.1, 0.43), (0.34,0.28,0.18), M["yellow"], 0.02)
# suction and discharge lines
pipe("SuctionPipe", (-0.68,0.1,0.43), (-3.8,0.1,0.43), 0.085, M["steel"])
pipe("SuctionDrop", (-3.8,0.1,0.43), (-3.8,0.1,0.02), 0.085, M["steel"])
cyl("Strainer", (-3.8,0.1,0.1), 0.14, 0.22, M["steel"], "Z", 20)
pipe("DischargeRiser", (-0.05,0.1,0.86), (-0.05,0.1,1.15), 0.08, M["steel"])
pipe("DischargeRun", (-0.05,0.1,1.15), (7.5,0.1,1.15), 0.08, M["steel"])
pipe("DischargeDrop", (7.5,0.1,1.15), (7.5,0.1,0.1), 0.08, M["steel"])
cyl("GateValve", (0.8,0.1,1.15), 0.13, 0.18, M["green"], "Z", 24)
bpy.ops.mesh.primitive_torus_add(major_radius=0.16, minor_radius=0.018, location=(0.8,0.1,1.36))
valve = bpy.context.object; valve.name="ValveWheel"; valve.data.materials.append(M["yellow"])
for x in (2.1, 4.2, 6.2):
    box(f"PipeSupport_{x}", (x,0.1,0.62), (0.08,0.08,1.0), M["steel"], 0.006)

# trees
for x,y,s in [(-9,-7,1.2), (-6,-8,0.9), (10,-7,1.0), (9,5,0.8), (-10,4,0.95)]:
    tree(x,y,s)

# camera and lights
cam_data = bpy.data.cameras.new("Camera")
cam_data.lens = 35
cam = bpy.data.objects.new("Camera", cam_data)
scene.collection.objects.link(cam)
cam.location = (6.0, -7.8, 1.65)
target = Vector((0.4, 0.2, 0.55))
cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
scene.camera = cam

sun_data = bpy.data.lights.new("Sun", "SUN")
sun_data.energy = 2.0
sun_data.angle = 0.25
sun = bpy.data.objects.new("Sun", sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = (0.65, 0.25, -0.8)

area_data = bpy.data.lights.new("SkyFill", "AREA")
area_data.energy = 600
area_data.shape = "DISK"
area_data.size = 8
area = bpy.data.objects.new("SkyFill", area_data)
scene.collection.objects.link(area)
area.location = (-2, -3, 7)
area.rotation_euler = (0.3, 0.2, 0.0)

world = bpy.data.worlds.new("World") if not bpy.data.worlds else bpy.data.worlds[0]
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.28, 0.34, 0.33, 1)
bg.inputs[1].default_value = 0.55

scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 1600
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = os.path.join(OUT_DIR, "paddy-v2-previs-01.png")
scene.view_settings.look = "AgX - Medium High Contrast"
bpy.ops.render.render(write_still=True)

# second camera: wider side view
cam2_data = bpy.data.cameras.new("CameraWide")
cam2_data.lens = 28
cam2 = bpy.data.objects.new("CameraWide", cam2_data)
scene.collection.objects.link(cam2)
cam2.location = (8.5, -2.2, 1.45)
target2 = Vector((1.0, 0.0, 0.5))
cam2.rotation_euler = (target2 - cam2.location).to_track_quat('-Z', 'Y').to_euler()
scene.camera = cam2
scene.render.filepath = os.path.join(OUT_DIR, "paddy-v2-previs-02.png")
bpy.ops.render.render(write_still=True)

bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
print("PREVIS DONE", OUT_BLEND)
