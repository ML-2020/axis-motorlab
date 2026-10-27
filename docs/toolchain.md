# 本地工具路由 / MCP Bridge

## 入口

```bash
node scripts/mcp-bridge.mjs list
node scripts/mcp-bridge.mjs tools <server>
node scripts/mcp-bridge.mjs call <server> <tool> '<json>'
```

配置：

```text
tools/mcp-servers.json
```

## 已接入

| 名称 | 类型 | 状态 | 用途 |
|---|---|---|---|
| hyper3d | HTTP MCP + OAuth | 已连接 | 文/图生 3D、绑骨、拆件 |
| spline | stdio MCP | 服务已连，编辑器 bridge 待连 | 快速 3D 构图、场景、截图 |
| tripo | stdio MCP | 已连接，0 credits | 文/图生 3D |

示例：

```bash
node scripts/mcp-bridge.mjs tools tripo
node scripts/mcp-bridge.mjs call tripo tripo_balance
node scripts/mcp-bridge.mjs tools hyper3d
```

## Spline 连接条件

Spline 不只是配置 MCP，还需要：

1. 打开一个 Spline 3D 文档；
2. 在文档左下角点击 **Connect with MCP**；
3. 选择 **Other agents**（不是 ChatGPT/Codex，因为当前 Agent 不是 Codex）；
4. 保持文档窗口开着。

否则调用会返回：

```text
No two editor is connected.
Open the document in the editor, enable the AI bridge, then retry.
```

## 后续可加适配器

| 软件 | 接入方式 | 优先级 |
|---|---|---|
| Blender | 已有 CLI/Python，可包成 MCP adapter | 高 |
| 3ds Max + V-Ray | MaxScript / 批处理 adapter | 中 |
| ComfyUI | HTTP API adapter | 中 |
| Poly Haven | HTTP API / 本地资产目录 | 高 |
| Fab | 手动下载 + 许可证清单 | 中 |
| Omniverse | 需先安装 USD Composer 和资产 | 低 |

## 路由原则

- 产品/机械尺寸：Blender / 3ds Max，不用 Spline；
- 快速构图/网页 3D：Spline；
- 3D base mesh：Hyper3D / Tripo；
- 材质/贴图：Blender / Substance / Fab；
- 最终网页：Three.js。

## 安全

- MCP bridge 不打印 token；
- Hyper3D 使用 `~/.hyper3d` 的 OAuth token；
- 签名下载 URL 在输出中自动脱敏；
- 不把 token 写入仓库。
