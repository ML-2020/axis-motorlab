# 本地大文件存放位置

项目源码和 Git 仓库保留在：

```text
C:\Users\18313\Documents\deepseek-harness\default-workspace
```

大文件放在：

```text
D:\AXIS-MOTORLAB-ASSETS\
├─ blender\              Blender .blend、纹理、预演、渲染
├─ tokenhub-generated\   混元 3D 生成 GLB / 预览 / 任务 JSON
└─ axis-motorlab-site.zip
```

## 目录联接（Junction）

为避免改脚本路径，原位置保留 Junction：

```text
<repo>\blender
  → D:\AXIS-MOTORLAB-ASSETS\blender

<repo>\docs\concepts\tokenhub\generated
  → D:\AXIS-MOTORLAB-ASSETS\tokenhub-generated
```

应用和脚本仍然使用原相对路径，实际文件在 D 盘。

## 仍留在 C 盘

- `src/`、`scenarios/`、`docs/` 文本；
- `public/models/` 网站实际加载的 GLB；
- `node_modules/`（约 70 MB，避免构建变慢）；
- Git 仓库和历史。

## 注意

- D 盘未挂载时，Junction 会失效；
- 不要用删除 Junction 再建普通目录的方式清理，容易误删引用；
- Git 只跟踪源码和小资产，忽略 `blender/` 与混元生成目录。
