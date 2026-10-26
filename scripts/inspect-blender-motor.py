import bpy
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\18313\Documents\deepseek-harness\default-workspace\blender\AXIS_YE3_132S_Motor.blend")
print("SCENE", bpy.context.scene.name)
for col in bpy.data.collections:
    print("COLL", col.name, len(col.objects))
for o in bpy.data.objects:
    if o.type == 'MESH':
        print("OBJ", o.name, tuple(round(v,4) for v in o.dimensions), tuple(round(v,4) for v in o.location))
