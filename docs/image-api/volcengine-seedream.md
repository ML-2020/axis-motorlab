# 火山方舟 Seedream 生图配置

## 1. 控制台

1. 登录火山引擎；
2. 进入 **火山方舟**；
3. 开通 **Seedream 5.0 lite**（或 pro）；
4. 创建 **API Key**；
5. 记录 Model ID。

默认脚本使用：

```text
doubao-seedream-5-0-lite-260128
```

## 2. 环境变量

在 PowerShell 里设置，不要写进仓库：

```powershell
$env:ARK_API_KEY="你的 key"
$env:ARK_IMAGE_MODEL="doubao-seedream-5-0-lite-260128"
```

可选：

```powershell
$env:ARK_BASE_URL="https://ark.cn-beijing.volces.com/api/v3"
```

## 3. 先做 dry run

```powershell
node scripts/generate-concepts-ark.mjs --mode wide --dry-run
```

不会调用 API，只打印请求体，用来检查模型 ID 和提示词。

## 4. 生成全景

```powershell
node scripts/generate-concepts-ark.mjs --mode wide --count 2
```

输出：

```text
docs/concepts/generated/wide-*.png
docs/concepts/generated/wide-*.json
```

## 5. 用全景做参考，生成近景

拿一张全景 PNG：

```powershell
node scripts/generate-concepts-ark.mjs --mode close --ref docs/concepts/generated/wide-xxxx.png --count 2
```

## 6. 注意

- 图片 URL 24 小时失效，脚本会立即下载；
- `watermark: false` 必须保留，避免水印进入参考图；
- 参考图仅用于 `docs/`，不进入 `public/`，不上网站；
- 生成图只作为构图/空间参考，实际尺寸仍按 `IEC_132S_SPECS` 和机械约束；
- 不把 API key 写进 `.env.example` 或 Git。

## 7. 生成后

1. 检查构图、泵组朝向、水面、棚架、光线；
2. 选一张全景 + 一张近景；
3. 在 Blender 里按图重建 v3；
4. 旧 v2 页面归档，v3 替换 `/scenarios/`。
