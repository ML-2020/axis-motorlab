# 腾讯云 TokenHub · 混元生 3D

## 接口

- 提交：`POST https://tokenhub.tencentmaas.com/v1/api/3d/submit`
- 查询：`POST https://tokenhub.tencentmaas.com/v1/api/3d/query`
- 鉴权：`Authorization: Bearer <API Key>`
- 模型：`hy-3d-3.1`（或 `hy-3d-3.0`）

## 配置

在本地 `.env` 中写入：

```text
TOKENHUB_API_KEY=你的 key
TOKENHUB_3D_MODEL=hy-3d-3.1
TOKENHUB_BASE_URL=https://tokenhub.tencentmaas.com
```

不要把 key 发到聊天里，也不要提交到 Git。

## 使用

先用泵组裁图：

```powershell
node scripts/generate-3d-tokenhub.mjs --image docs/concepts/tokenhub/pump-crop.jpg --dry-run
```

确认请求结构后正式生成：

```powershell
node scripts/generate-3d-tokenhub.mjs --image docs/concepts/tokenhub/pump-crop.jpg
```

生成结果：

```text
docs/concepts/tokenhub/generated/<task-id>.glb
docs/concepts/tokenhub/generated/<task-id>-preview.png
docs/concepts/tokenhub/generated/<task-id>.json
```

## 参数

- `generate_type: Normal`：带纹理几何；
- `enable_pbr: true`：PBR 材质；
- `face_count: 150000`：控制网页资产面数；
- 图片 base64 需小于 6 MB。

## 注意

- 这是 image-to-3D，不会恢复真实泵组尺寸；
- 生成后必须在 Blender 里校正轴高、法兰和底座；
- 电机最终仍用主站 22 部件 Motor；
- 生成结果只作为 base mesh，不是 Production Asset。
