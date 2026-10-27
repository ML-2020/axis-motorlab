# 免费资产使用记录

## 已使用

### Poly Haven — spruit_sunrise HDRI

- 来源：<https://polyhaven.com/a/spruit_sunrise>
- 许可证：CC0
- 本地文件：`public/hdri/spruit-sunrise-2k.hdr`
- 用途：稻田泵站页面的环境反射与清晨光照
- 加载：`RGBELoader` → `PMREMGenerator` → `scene.environment`
- 回退：HDRI 加载失败时保留 `RoomEnvironment`

### Poly Haven — 混凝土 / 泥土 PBR 纹理

- `anti_slip_concrete`
- `aerial_mud_1`
- 许可证：CC0
- 用途：Blender 泵台和泥土地面，打包进 GLB

### TokenHub 混元 3D — 泵组 base mesh

- 模型：`hy-3d-3.1`
- 输入：用户生成的泵组参考图
- 处理：Blender 减面、贴图缩至 1K、去除电机
- 结果：`public/models/tokenhub_pump_web.glb`
- 约 5.5 MB、47,910 面
- 仅作为 base mesh，不作为最终 Production Asset

## 待补充

- 免费环境模型：草丛、树木、杂物
- 免费管件/阀门模型（需核对许可证与尺寸）
- 3D 场景装配后的最终 GLB

## 规则

- 只使用许可证明确的资产；
- 不上传未授权模型；
- 参考图片只用于研究，不进入网站；
- 生成/免费资产进入 Blender 后仍需校正尺寸和机械关系。
