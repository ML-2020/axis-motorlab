# AXIS MOTORLAB — Blender 电机主角场景

这是用 **Blender 4.2 + Python (`bpy`)** 独立制作的 YE3-132S-4 三相异步电动机场景，不是网站现有的 Three.js 程序化模型的替代品，也不依赖 MCP。

网站本身没有被改动；原文件 `F:\Blender\Girl_01.blend` 也保持原样。

## 最省事的使用方式

如果不想学 Blender，直接双击下面三个文件：

1. **`AXIS_MOTORLAB_presentation.html`** — 独立演示页，浏览器打开即可看大图、播放动画、浏览部件索引；
2. **`OPEN_RENDERS.bat`** — 打开渲染文件夹，直接看 `motor_hero.png`、`motor_exploded.png` 和动画 MP4；
3. **`OPEN_MOTOR_SCENE.bat`** — 用 Blender 4.2 打开可编辑场景；
4. **`RENDER_ANIMATION.bat`** — 不打开界面，直接重新渲染 7.5 秒动画。

> 如果 `.bat` 被系统安全策略拦截，优先双击桌面快捷方式 **“AXIS MOTORLAB 演示”**，或直接打开 `AXIS_MOTORLAB_presentation.html`。演示给朋友看时，最稳妥的是全屏播放 `renders/AXIS_YE3_exploded.mp4`。

> **关于“白模”**：Blender 默认的 **Solid** 视图不显示节点材质，而且材质原先的视口显示颜色是灰色，所以看起来像白模。场景本身一直有材质、舞台、灯光、摄影机和动画。现在材质视口显示颜色已经同步；通过桌面快捷方式 **“AXIS MOTORLAB Blender 场景”** 打开时，还会自动切到 **Rendered + 相机视角**。

## 五分钟上手

### 看模型

- **旋转视角**：按住鼠标中键拖动；
- **平移**：按住 `Shift` + 鼠标中键拖动；
- **缩放**：滚动滚轮；
- **把所有东西框进视野**：按 `Home`；
- **切到摄影机视角**：按小键盘 `0`（没有小键盘：菜单 `View → Cameras → Active Camera`）；
- **最大化当前窗口**：把鼠标放在 3D 视图上按 `Ctrl + Space`；
- **切换着色**：按 `Z`，再按 `M` 是材质预览，按 `R` 是渲染预览。
- 如果直接双击 `.blend` 后仍然觉得像白模，按 `Z` → `R`；或者用桌面快捷方式 **“AXIS MOTORLAB Blender 场景”** 打开。

### 播放爆炸动画

- 按 `Space` 播放，再按一次暂停；`Esc` 停止并回到第 1 帧；
- 时间轴在窗口底部，范围是 `1–180` 帧；
- 按小键盘 `0` 进入摄影机视角，再按 `Space`，看到的就是最终演示画面。

### 给部件上色

1. 先 `File → Save As` 另存为 `AXIS_YE3_my_edit.blend`，不要直接覆盖原文件；
2. 在 3D 视图里点选一个部件，或在右上角 **Outliner** 里点它的名字；
3. 右侧属性栏打开 **Material Properties**（红色圆形图标）；
4. 在材质槽里找到当前材质，例如：
   - 机身青绿色：`Paint_Teal`
   - 端盖/接线盒深色：`Paint_Deep`
   - 钢/铜/铝：`Steel`、`Copper`、`Aluminium`
5. 点开 **Base Color** 改颜色。

注意：很多部件共用同一个材质，直接改会把同色部件一起改。
如果只想改一个部件，先点材质名旁边的用户数按钮（显示为 `2`、`3` 等）做 **Make Single User**，再改颜色。

### 渲染一张静帧

- 先按小键盘 `0` 进入摄影机视角；
- 按 `F12` 渲染；
- 渲染窗口里 `Image → Save As` 保存 PNG。

## 交付内容

| 文件 | 说明 |
| --- | --- |
| `AXIS_YE3_132S_Motor.blend` | 完整 Blender 场景，22 个命名部件、材质、灯光、摄影机、爆炸动画 |
| `renders/motor_hero.png` | 装配状态产品渲染，1920 × 1080 |
| `renders/motor_exploded.png` | 完全爆炸状态渲染，1920 × 1080 |
| `renders/AXIS_YE3_exploded.mp4` | 7.5 秒爆炸动画，1600 × 900，24 fps，H.264，无音轨 |
| `AXIS_YE3_storyboard.png` | 四格分镜总览 |
| `AXIS_MOTORLAB_presentation.html` | 独立演示页，含视频、静帧、参数与 22 部件索引 |
| `OPEN_MOTOR_SCENE.bat` | 双击打开可编辑场景 |
| `OPEN_RENDERS.bat` | 双击打开渲染文件夹 |
| `RENDER_ANIMATION.bat` | 双击重新渲染动画 MP4 |
| `assets/` | 程序生成的铭牌、警告标签、品牌标签纹理 |
| `scripts/` | 可复现的建模、渲染和纹理生成脚本 |

## 模型信息

- 型号：**YE3-132S-4**
- 额定功率：5.5 kW
- 极数：4 极
- 电压 / 频率：380 V / 50 Hz
- 转速：1440 r/min
- 防护 / 冷却 / 安装：IP55 / IC411 / IM B3
- 能效：IE3
- 22 个部件，均带 `part_id`、`part_index`、`explode_offset` 自定义属性
- 定子 36 槽、转子 28 槽的工程可视化表达；内部细节为示意，不是制造图

## 场景结构

- `MOTOR` 集合：22 个电机会员对象（`StatorFrame`、`Shaft`、`StatorWinding` 等）
- `MOTOR_CONTROL` 集合：`MOTOR_ROOT` 控制器，动画中整体抬升 0.28 m
- `STUDIO`：圆形舞台、暗色地面、刻度环
- `LIGHTING`：四盏柔光面光 + 一盏暖色轮廓光
- `CAMERA`：`Product_Camera` 与 `CAM_TARGET`，装配近景到爆炸远景的镜头运动
- 动画范围：`1–180` 帧，24 fps，共 7.5 秒
- 工程单位：米（界面显示毫米），真实尺度约 0.68 m 长

## 自己打开 / 修改

直接用 Blender 4.2 打开：

```powershell
& "C:\Program Files\Blender Foundation\Blender 4.2\blender.exe" `
  "C:\Users\18313\Documents\deepseek-harness\default-workspace\blender\AXIS_YE3_132S_Motor.blend"
```

- 按空格播放爆炸动画。
- 选择 `MOTOR_ROOT` 可整体移动电机；每个部件是独立对象，可单独调整。
- 摄影机带 `Track To` 约束，移动 `CAM_TARGET` 可重新构图。
- 材质、灯光、渲染参数均在场景中，无需外部依赖。

## 重新生成

```powershell
# 生成纹理
python blender/scripts/make_textures.py

# 重建场景并渲染两张静帧
& "C:\Program Files\Blender Foundation\Blender 4.2\blender.exe" `
  -b --factory-startup --python blender/scripts/build_motor.py

# 从保存的 .blend 渲染动画
& "C:\Program Files\Blender Foundation\Blender 4.2\blender.exe" `
  -b blender/AXIS_YE3_132S_Motor.blend `
  --python blender/scripts/render_animation.py
```

渲染使用 EEVEE Next；两张静帧为 64 采样，动画为 48 采样。GPU 为 RTX 4070 Ti SUPER。

## 说明

这是一个**工程展示可视化**，尺寸、内部结构和材质取自公开的 YE3 系列资料与通用设计逻辑，用于展示和教学，不作为制造、装配或采购依据。定子/转子槽数、轴承布置等细节为视觉表达，可能与具体厂家图纸不同。
