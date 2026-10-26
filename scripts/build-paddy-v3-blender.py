import bpy, math, random, os
from mathutils import Vector, Euler

ROOT = r"C:\Users\18313\Documents\deepseek-harness\default-workspace"
OUT_BLEND = os.path.join(ROOT, "blender", "paddy_pump_station_v3.blend")
OUT_GLB = os.path.join(ROOT, "public", "models", "paddy_pump_station_v3.glb")
PREVIEW = os.path.join(ROOT, "screenshots", "paddy-v3-asset-preview.png")
os.makedirs(os.path.dirname(OUT_BLEND), exist_ok=True)
os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
os.makedirs(os.path.dirname(PREVIEW), exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
random.seed(132)

def material(name, color, metallic=0.0, roughness=0.5, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, alpha)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if alpha < 1:
        bsdf.inputs["Alpha"].default_value = alpha
        m.surface_render_method = "DITHERED"
        m.use_transparency_overlap = False
    return m

def textured_material(name, texture_dir, prefix):
    """CC0 PBR texture material. Images are packed into the exported GLB."""
    m = material(name, (0.5, 0.5, 0.5), 0.0, 0.9)
    nodes = m.node_tree.nodes
    links = m.node_tree.links
    bsdf = nodes.get("Principled BSDF")

    def image(file_name, non_color=False):
        path = os.path.join(ROOT, "blender", "assets", "textures", texture_dir, file_name)
        img = bpy.data.images.load(path, check_existing=True)
        if non_color:
            img.colorspace_settings.name = "Non-Color"
        node = nodes.new("ShaderNodeTexImage")
        node.image = img
        node.interpolation = "Linear"
        return node

    diffuse = image(f"{prefix}_diff_1k.jpg")
    links.new(diffuse.outputs["Color"], bsdf.inputs["Base Color"])

    rough = image(f"{prefix}_rough_1k.jpg", True)
    links.new(rough.outputs["Color"], bsdf.inputs["Roughness"])

    normal = image(f"{prefix}_nor_gl_1k.jpg", True)
    normal_node = nodes.new("ShaderNodeNormalMap")
    normal_node.inputs["Strength"].default_value = 0.85
    links.new(normal.outputs["Color"], normal_node.inputs["Color"])
    links.new(normal_node.outputs["Normal"], bsdf.inputs["Normal"])
    return m

MAT = {
    "concrete": material("Concrete", (0.36, 0.38, 0.34), 0.0, 0.88),
    "earth": material("Earth", (0.20, 0.17, 0.11), 0.0, 0.96),
    "water": material("PaddyWater", (0.06, 0.20, 0.17), 0.15, 0.12, 0.68),
    "rice": material("RiceGreen", (0.17, 0.30, 0.13), 0.0, 0.82),
    "rice_head": material("RiceHead", (0.46, 0.44, 0.23), 0.0, 0.78),
    "green": material("PumpGreen", (0.07, 0.29, 0.15), 0.35, 0.32),
    "green_dark": material("PumpGreenDark", (0.035, 0.16, 0.085), 0.3, 0.4),
    "blue": material("ValveBlue", (0.025, 0.10, 0.25), 0.35, 0.38),
    "black": material("MotorBlack", (0.018, 0.022, 0.022), 0.65, 0.35),
    "black_fin": material("MotorFins", (0.033, 0.04, 0.04), 0.55, 0.42),
    "steel": material("Steel", (0.30, 0.34, 0.33), 0.75, 0.28),
    "dark_steel": material("DarkSteel", (0.075, 0.09, 0.09), 0.6, 0.34),
    "yellow": material("SafetyYellow", (0.62, 0.40, 0.07), 0.2, 0.45),
    "wood": material("Timber", (0.17, 0.11, 0.06), 0.0, 0.82),
    "roof": material("ShelterRoof", (0.16, 0.19, 0.17), 0.3, 0.55),
    "leaf": material("LeafGreen", (0.10, 0.24, 0.11), 0.0, 0.82),
    "label": material("Label", (0.65, 0.56, 0.36), 0.1, 0.5),
}

# Real CC0 PBR textures from Poly Haven, packed into the GLB.
MAT["concrete"] = textured_material("ConcretePBR", "anti_slip_concrete", "anti_slip_concrete")
MAT["earth"] = textured_material("MudPBR", "aerial_mud_1", "aerial_mud_1")

def select_only(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

def bevel(obj, width=0.006, segments=2):
    if width <= 0:
        return obj
    mod = obj.modifiers.new("EdgeBevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    select_only(obj)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj

def box(name, x, y, z, sx, sy, sz, mat, bevel_w=0.005):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = (sx, sy, sz)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    bevel(obj, bevel_w)
    return obj

def cyl(name, x, y, z, r, depth, mat, axis="Z", verts=32, bevel_w=0.003):
    rot = (0, 0, 0)
    if axis == "X":
        rot = (0, math.pi / 2, 0)
    elif axis == "Y":
        rot = (math.pi / 2, 0, 0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=(x, y, z), rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    bevel(obj, bevel_w)
    return obj

def torus(name, x, y, z, major, minor, mat, axis="Z"):
    rot = (0, 0, 0)
    if axis == "X":
        rot = (0, math.pi / 2, 0)
    elif axis == "Y":
        rot = (math.pi / 2, 0, 0)
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=32, minor_segments=10, location=(x, y, z), rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj

def pipe(name, a, b, radius, mat):
    a, b = Vector(a), Vector(b)
    d = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=radius, depth=d.length, location=(a + b) / 2)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    obj.data.materials.append(mat)
    bevel(obj, 0.002)
    return obj

def bolt_circle(prefix, center, radius, count, axis, mat, depth=0.018, head_radius=0.008):
    cx, cy, cz = center
    for i in range(count):
        a = (i / count) * math.tau
        if axis == "X":
            x, y, z = cx, cy + math.cos(a) * radius, cz + math.sin(a) * radius
        elif axis == "Y":
            x, y, z = cx + math.cos(a) * radius, cy, cz + math.sin(a) * radius
        else:
            x, y, z = cx + math.cos(a) * radius, cy + math.sin(a) * radius, cz
        cyl(f"{prefix}_Bolt{i}", x, y, z, head_radius, depth, mat, axis=axis, verts=8, bevel_w=0.001)
        cyl(f"{prefix}_Nut{i}", x, y, z, head_radius * 1.45, depth * 0.55, MAT["dark_steel"], axis=axis, verts=6, bevel_w=0.001)

def text_mesh(name, body, x, y, z, size=0.06, rot=(math.pi/2, 0, -math.pi/2), mat=None):
    bpy.ops.object.text_add(location=(x, y, z), rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.data.body = body
    obj.data.align_x = "CENTER"
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.extrude = 0.001
    obj.data.materials.append(mat or MAT["label"])
    bpy.ops.object.convert(target="MESH")
    return bpy.context.object

# ---------------------------------------------------------------------------
# Pump pad and paddy field
# ---------------------------------------------------------------------------
box("PaddyEarth", 0, 0.2, -0.045, 13, 11, 0.09, MAT["earth"], 0)
box("PumpPad", 0, 0.1, 0.06, 3.2, 2.2, 0.12, MAT["concrete"], 0.025)
box("PumpPadCurb", 0, 0.1, 0.02, 3.35, 2.35, 0.04, MAT["concrete"], 0.015)
# shallow water films on the wet pad
for i, (x, y, sx, sy) in enumerate([(0.35, 0.75, 1.2, 0.35), (-0.2, -0.55, 0.8, 0.28), (1.7, 0.3, 0.7, 0.4)]):
    box(f"PadPuddle{i}", x, y, 0.123, sx, sy, 0.004, MAT["water"], 0)
# shallow paddy water surfaces
box("PaddyWaterA", -3.6, 0.3, 0.012, 4.5, 8.0, 0.025, MAT["water"], 0)
box("PaddyWaterB", 3.6, 0.3, 0.012, 4.5, 8.0, 0.025, MAT["water"], 0)
box("PaddyWaterC", 0, -3.2, 0.012, 5.0, 2.0, 0.025, MAT["water"], 0)
# bunds separating paddies and framing the pump pad
for name, x, y, z, sx, sy, sz in [
    ("BundN", 0, -2.25, 0.12, 10.5, 0.28, 0.24),
    ("BundW", -5.3, 0.2, 0.12, 0.3, 8.0, 0.24),
    ("BundE", 5.3, 0.2, 0.12, 0.3, 8.0, 0.24),
    ("BundPath", 0, 2.55, 0.11, 10.4, 0.24, 0.22),
]:
    box(name, x, y, z, sx, sy, sz, MAT["earth"], 0.018)

# ---------------------------------------------------------------------------
# Pump set: common base, end-suction pump, black finned motor
# ---------------------------------------------------------------------------
base_z = 0.12
box("Skid", 0.1, 0.1, base_z + 0.045, 1.55, 0.62, 0.09, MAT["dark_steel"], 0.015)
box("SkidTop", 0.1, 0.1, base_z + 0.092, 1.42, 0.5, 0.014, MAT["black"], 0.006)
# 132S shaft centre = common-base top + 132 mm IEC shaft height.
shaft_z = 0.351
# motor
cyl("MotorBarrel", 0.38, 0.1, shaft_z, 0.175, 0.46, MAT["black"], axis="X", verts=40, bevel_w=0.008)
for i in range(15):
    a = i / 15 * math.tau
    obj = box("MotorFin", 0.38, 0.1 + math.cos(a) * 0.182, shaft_z + math.sin(a) * 0.182, 0.42, 0.032, 0.018, MAT["black_fin"], 0.003)
    obj.rotation_euler[0] = a
cyl("MotorEndA", 0.145, 0.1, shaft_z, 0.195, 0.065, MAT["dark_steel"], axis="X", verts=32, bevel_w=0.008)
cyl("MotorEndB", 0.615, 0.1, shaft_z, 0.195, 0.065, MAT["dark_steel"], axis="X", verts=32, bevel_w=0.008)
cyl("MotorFanCowl", 0.11, 0.1, shaft_z, 0.145, 0.10, MAT["black"], axis="X", verts=24, bevel_w=0.005)
cyl("MotorFanHub", 0.055, 0.1, shaft_z, 0.055, 0.12, MAT["steel"], axis="X", verts=16, bevel_w=0.003)
for i in range(6):
    a = i / 6 * math.tau
    obj = box("MotorFanBlade", 0.08, 0.1 + math.cos(a) * 0.075, shaft_z + math.sin(a) * 0.075, 0.03, 0.09, 0.014, MAT["dark_steel"], 0.002)
    obj.rotation_euler[0] = a
cyl("MotorShaft", 0.69, 0.1, shaft_z, 0.032, 0.22, MAT["steel"], axis="X", verts=18, bevel_w=0.002)
box("TerminalBox", 0.37, 0.1, shaft_z + 0.185, 0.23, 0.17, 0.105, MAT["dark_steel"], 0.012)
box("TerminalLid", 0.37, 0.1, shaft_z + 0.24, 0.24, 0.18, 0.015, MAT["black_fin"], 0.004)
# motor feet and anchor blocks
for x in (0.2, 0.55):
    for y in (-0.14, 0.36):
        box("MotorFoot", x, y, base_z + 0.115, 0.13, 0.09, 0.15, MAT["dark_steel"], 0.006)
        box("AnchorPlate", x, y - 0.03, base_z + 0.205, 0.085, 0.04, 0.018, MAT["steel"], 0.002)
# pump
pump_x = -0.65
cyl("PumpCasing", pump_x, 0.1, shaft_z, 0.235, 0.22, MAT["green"], axis="X", verts=40, bevel_w=0.008)
torus("PumpCasingRing", pump_x + 0.01, 0.1, shaft_z, 0.235, 0.035, MAT["green_dark"], axis="X")
cyl("PumpSuction", pump_x - 0.34, 0.1, shaft_z, 0.085, 0.42, MAT["green"], axis="X", verts=24, bevel_w=0.004)
torus("PumpSuctionFlange", pump_x - 0.56, 0.1, shaft_z, 0.095, 0.022, MAT["green_dark"], axis="X")
cyl("PumpDischarge", pump_x, 0.1, shaft_z + 0.27, 0.08, 0.34, MAT["green"], axis="Z", verts=24, bevel_w=0.004)
torus("PumpDischargeFlange", pump_x, 0.1, shaft_z + 0.45, 0.092, 0.022, MAT["green_dark"], axis="Z")
cyl("PumpBearingHousing", pump_x + 0.22, 0.1, shaft_z, 0.07, 0.18, MAT["green_dark"], axis="X", verts=24, bevel_w=0.004)
# feet
for x in (-0.76, -0.52):
    for y in (-0.1, 0.3):
        box("PumpFoot", x, y, base_z + 0.14, 0.12, 0.08, 0.12, MAT["green_dark"], 0.005)
# internal impeller (visible in cutaway)
cyl("ImpellerHub", pump_x, 0.1, shaft_z, 0.055, 0.1, MAT["steel"], axis="X", verts=20, bevel_w=0.002)
imp = None
for i in range(6):
    a = i / 6 * math.tau
    blade = box("ImpellerBlade", pump_x + 0.015, 0.1 + math.cos(a) * 0.105, shaft_z + math.sin(a) * 0.105, 0.035, 0.18, 0.05, MAT["steel"], 0.002)
    blade.rotation_euler[0] = a + 0.35
    if imp is None:
        imp = blade
    else:
        # join all blades into one named object for web animation
        pass
# simplify: create an impeller empty-like joined object by joining blades
blades = [o for o in bpy.context.scene.objects if o.name.startswith("ImpellerBlade")]
select_only(blades[0])
for o in blades[1:]:
    o.select_set(True)
bpy.ops.object.join()
impeller = bpy.context.object
impeller.name = "Impeller"
# coupling guard
box("CouplingGuard", -0.18, 0.1, shaft_z, 0.28, 0.26, 0.15, MAT["yellow"], 0.018)
box("CouplingGuardTop", -0.18, 0.1, shaft_z + 0.085, 0.3, 0.28, 0.02, MAT["dark_steel"], 0.005)
# pressure gauge riser and needle
cyl("GaugeStem", pump_x + 0.12, 0.1, shaft_z + 0.40, 0.025, 0.22, MAT["steel"], axis="Z", verts=12, bevel_w=0.002)
cyl("GaugeBody", pump_x + 0.12, 0.1, shaft_z + 0.53, 0.085, 0.035, MAT["dark_steel"], axis="Y", verts=28, bevel_w=0.004)
cyl("GaugeNeedle", pump_x + 0.12, 0.074, shaft_z + 0.53, 0.006, 0.06, MAT["yellow"], axis="Y", verts=8, bevel_w=0.0)
# valve wheel on discharge
torus("ValveWheel", pump_x, 0.1, shaft_z + 0.58, 0.105, 0.016, MAT["blue"], axis="Z")
# gate valve body, stem and packing gland
cyl("GateValveBody", pump_x, 0.1, shaft_z + 0.50, 0.115, 0.18, MAT["blue"], axis="Z", verts=24, bevel_w=0.004)
torus("GateValveFlangeLow", pump_x, 0.1, shaft_z + 0.41, 0.105, 0.018, MAT["blue"], axis="Z")
torus("GateValveFlangeHigh", pump_x, 0.1, shaft_z + 0.59, 0.105, 0.018, MAT["blue"], axis="Z")
cyl("ValveStem", pump_x, 0.1, shaft_z + 0.64, 0.014, 0.16, MAT["steel"], axis="Z", verts=10, bevel_w=0.001)
cyl("ValveGland", pump_x, 0.1, shaft_z + 0.60, 0.034, 0.04, MAT["steel"], axis="Z", verts=12, bevel_w=0.001)
# flange bolt groups
bolt_circle("SuctionFlangeBolt", (pump_x - 0.565, 0.1, shaft_z), 0.078, 8, "X", MAT["steel"])
bolt_circle("DischargeFlangeBolt", (pump_x, 0.1, shaft_z + 0.455), 0.075, 8, "Z", MAT["steel"])
bolt_circle("ValveFlangeBolt", (pump_x, 0.1, shaft_z + 0.595), 0.078, 8, "Z", MAT["steel"])
# coupling guard fasteners
for x in (-0.3, -0.06):
    for z in (-0.055, 0.055):
        box("GuardScrew", x, 0.1, shaft_z + z, 0.018, 0.3, 0.018, MAT["steel"], 0.001)
# baseplate rails, grout pads and holding-down bolts
for y in (-0.2, 0.4):
    box("BaseRail", 0.1, y, base_z + 0.07, 1.68, 0.12, 0.16, MAT["dark_steel"], 0.012)
for x in (-0.55, 0.1, 0.75):
    for y in (-0.28, 0.48):
        cyl("HoldingDownBolt", x, y, base_z + 0.05, 0.018, 0.24, MAT["steel"], axis="Z", verts=10, bevel_w=0.001)
        cyl("LevelingShim", x, y, base_z + 0.012, 0.055, 0.012, MAT["steel"], axis="Z", verts=12, bevel_w=0.001)
# casing drain plug
cyl("PumpDrainPlug", pump_x, 0.1, shaft_z - 0.245, 0.026, 0.055, MAT["steel"], axis="Z", verts=10, bevel_w=0.001)

# ---------------------------------------------------------------------------
# Suction and discharge piping
# ---------------------------------------------------------------------------
pipe("SuctionPipe", (-1.35, 0.1, shaft_z), (-1.62, 0.32, 0.18), 0.075, MAT["green"])
pipe("SuctionDrop", (-1.62, 0.32, 0.18), (-1.62, 0.32, 0.035), 0.075, MAT["green"])
cyl("Strainer", -1.62, 0.32, 0.12, 0.13, 0.2, MAT["steel"], axis="Z", verts=20, bevel_w=0.003)
for i in range(6):
    box("StrainerBar", -1.62, 0.32, 0.035 + i * 0.032, 0.3, 0.018, 0.018, MAT["steel"], 0)
pipe("DischargeRiser", (pump_x, 0.1, shaft_z + 0.45), (pump_x, 0.1, shaft_z + 0.74), 0.07, MAT["steel"])
pipe("DischargeRun", (pump_x, 0.1, shaft_z + 0.74), (2.8, 0.1, shaft_z + 0.74), 0.07, MAT["steel"])
pipe("DischargeDrop", (2.8, 0.1, shaft_z + 0.74), (2.8, 0.1, 0.06), 0.07, MAT["steel"])
for x in (-0.2, 0.9, 1.9):
    box("PipeSupport", x, 0.1, 0.48, 0.06, 0.06, 0.9, MAT["steel"], 0.004)
# small pump house / electrical shed on the right, matching the reference
box("ShedFloor", 3.35, -1.75, 0.12, 3.0, 1.9, 0.16, MAT["concrete"], 0.015)
for x in (2.05, 4.65):
    for y in (-2.55, -0.95):
        box("ShedPost", x, y, 1.05, 0.11, 0.11, 1.9, MAT["dark_steel"], 0.004)
box("ShedRoof", 3.35, -1.75, 2.05, 3.2, 2.15, 0.12, MAT["roof"], 0.008)
box("ShedBackWall", 3.35, -2.58, 1.15, 2.9, 0.08, 1.9, MAT["dark_steel"], 0.008)
box("ShedSideWall", 4.76, -1.75, 1.15, 0.08, 1.7, 1.9, MAT["dark_steel"], 0.008)
box("ElectricalCabinet", 3.55, -2.48, 1.0, 0.7, 0.18, 1.4, MAT["blue"], 0.012)
box("CabinetDoor", 3.55, -2.38, 1.0, 0.52, 0.03, 1.15, MAT["steel"], 0.004)
for i in range(3):
    cyl(f"CabinetKnob{i}", 3.55, -2.34, 0.72 + i * 0.22, 0.018, 0.025, MAT["yellow"], axis="Y", verts=10, bevel_w=0.001)

# ---------------------------------------------------------------------------
# Trees and a simple paddy bund / field edge
# ---------------------------------------------------------------------------
for i, (x, y, s) in enumerate([(-5.6, -2.7, 1.05), (-5.9, 0.9, 0.8), (5.8, -2.2, 0.95), (6.0, 1.5, 0.72)]):
    cyl(f"TreeTrunk{i}", x, y, 0.55 * s, 0.07 * s, 1.1 * s, MAT["wood"], axis="Z", verts=8, bevel_w=0.006)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.55 * s, location=(x, y, 1.25 * s))
    leaf = bpy.context.object
    leaf.name = f"TreeCrown{i}"
    leaf.data.materials.append(MAT["leaf"])
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.33 * s, location=(x + 0.28, y + 0.08, 1.5 * s))
    leaf2 = bpy.context.object
    leaf2.name = f"TreeCrownB{i}"
    leaf2.data.materials.append(MAT["leaf"])

# ---------------------------------------------------------------------------
# Rice field: one plant mesh duplicated and joined for glTF efficiency
# ---------------------------------------------------------------------------
bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.018, radius2=0.004, depth=0.42, location=(0, 0, 0.21))
plant = bpy.context.object
plant.name = "RicePlantMetric"
plant.data.materials.append(MAT["rice"])
for i in range(3):
    a = (i / 3) * math.tau
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.014, radius2=0.003, depth=0.34, location=(math.cos(a) * 0.035, math.sin(a) * 0.035, 0.17), rotation=(0.06, 0.08, a))
    p = bpy.context.object
    p.data.materials.append(MAT["rice"])
    bpy.ops.object.select_all(action="DESELECT")
    plant.select_set(True)
    p.select_set(True)
    bpy.context.view_layer.objects.active = plant
    bpy.ops.object.join()
# panicle
bpy.ops.mesh.primitive_cone_add(vertices=5, radius1=0.012, radius2=0.025, depth=0.14, location=(0, 0, 0.42))
head = bpy.context.object
head.data.materials.append(MAT["rice_head"])
select_only(plant)
head.select_set(True)
bpy.context.view_layer.objects.active = plant
bpy.ops.object.join()
plant.name = "RicePlantTemplate"
plant.location = (0, 0, 0.02)
# duplicate as linked copies and join into one field mesh
plants = []
for i in range(420):
    x = (random.random() - 0.5) * 10.2
    y = (random.random() - 0.5) * 7.4
    if abs(x) < 2.2 and abs(y - 0.1) < 1.5:
        continue
    if y < -2.45:
        continue
    bpy.ops.object.select_all(action="DESELECT")
    plant.select_set(True)
    bpy.context.view_layer.objects.active = plant
    bpy.ops.object.duplicate(linked=True)
    p = bpy.context.object
    p.location = (x, y, 0.02)
    p.rotation_euler[2] = random.random() * math.tau
    p.scale = (1.0 + random.random() * 0.25, 1.0 + random.random() * 0.25, 0.8 + random.random() * 0.35)
    plants.append(p)
bpy.ops.object.select_all(action="DESELECT")
for p in plants:
    p.select_set(True)
bpy.context.view_layer.objects.active = plants[0]
bpy.ops.object.join()
rice = bpy.context.object
rice.name = "RiceField"
# remove template
bpy.data.objects.remove(plant, do_unlink=True)

# ---------------------------------------------------------------------------
# Machine-readable mounting anchor for the Three.js assembly.
# ---------------------------------------------------------------------------
bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.38, 0.1, shaft_z), rotation=(0, math.pi / 2, 0))
anchor = bpy.context.object
anchor.name = "Anchor_Motor_Mount"
anchor["mounting_type"] = "IM_B3"
anchor["shaft_height_m"] = 0.132
anchor["shaft_diameter_m"] = 0.038
anchor["coupling_gap_m"] = 0.003

for anchor_name, loc in [
    ("Anchor_Baseplate_TopSurface", (0.1, 0.1, 0.219)),
    ("Anchor_Motor_Base", (0.38, 0.1, 0.219)),
    ("Anchor_Motor_Shaft_End", (0.69, 0.1, shaft_z)),
    ("Anchor_Pump_Shaft_Center", (pump_x, 0.1, shaft_z)),
    ("Anchor_Coupling_Center", (-0.18, 0.1, shaft_z)),
    ("Anchor_Suction_Centerline", (-1.35, 0.1, shaft_z)),
    ("Anchor_Discharge_Centerline", (pump_x, 0.1, shaft_z + 0.74)),
]:
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=loc)
    a = bpy.context.object
    a.name = anchor_name

# Make sun and camera for a preview render, not included in glTF export.
sun_data = bpy.data.lights.new("Sun", type="SUN")
sun = bpy.data.objects.new("Sun", sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = (0.65, 0.2, -0.7)
sun_data.energy = 4.0
sun_data.angle = 0.12
world = bpy.data.worlds.new("World") if not bpy.data.worlds else bpy.data.worlds[0]
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.32, 0.46, 0.44, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.55
cam_data = bpy.data.cameras.new("Camera")
cam = bpy.data.objects.new("Camera", cam_data)
scene.collection.objects.link(cam)
cam.location = (2.1, -7.2, 1.55)
target = Vector((0.15, 0.48, 0.02))
cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
cam_data.lens = 35
scene.camera = cam
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 1400
scene.render.resolution_y = 900
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.render.filepath = PREVIEW
bpy.ops.render.render(write_still=True)

# Export geometry only (exclude camera, lights, originals not needed).
bpy.ops.object.select_all(action="SELECT")
for o in (cam, sun):
    o.select_set(False)
bpy.ops.export_scene.gltf(
    filepath=OUT_GLB,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_cameras=False,
    export_lights=False,
)
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
print("SAVED", OUT_GLB)
