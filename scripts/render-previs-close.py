import bpy, os
from mathutils import Vector
ROOT=r"C:\Users\18313\Documents\deepseek-harness\default-workspace"
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,"blender","previs","paddy_v2_previs.blend"))
scene=bpy.context.scene
cam=bpy.data.objects.get("Camera")
cam.data.lens=35
cam.location=(4.3,-5.8,1.58)
target=Vector((0.35,0.15,0.52))
cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
scene.camera=cam
scene.render.filepath=os.path.join(ROOT,"docs","concepts","paddy-v2-previs-03.png")
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,"blender","previs","paddy_v2_previs.blend"))
print("DONE")
