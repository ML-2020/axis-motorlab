# AXIS MOTORLAB

YE3-132S-4 三相异步电动机 · 交互式三维工程档案与应用场景档案。

- 主站：<https://axis-motorlab.pages.dev/>
- 应用场景档案：<https://axis-motorlab.pages.dev/scenarios/>
- Blender 短片：<https://axis-motorlab.pages.dev/blender/>
- GitHub：<https://github.com/ML-2020/axis-motorlab>
- 机型：YE3-132S-4 · 5.5 kW · 4 极 · 380 V / 50 Hz · IE3 · IP55 · IC411 · IM B3 · S1
- 建模依据：GB/T 28575-2020、GB 18613-2020、GB/T 1032-2023、IEC 60034 / IEC 60072-1 等公开标准，以及 Wolong、WEG、Siemens 等公开样本。详见 [建模说明](docs/literature.md)。

![Hero](screenshots/final/01-hero.png)

## 主站

主站以 Three.js 程序化重建 22 个可独立拆解的三维部件，包含：

- 36 槽定子、28 槽铸铝鼠笼、端部绕组、6308 轴承、端盖、风扇、接线盒与铭牌；
- 滚动驱动的整机分解/装配动画、四段式分镜、滑块与自动演示；
- 22 部件档案、分类筛选、模型拾取、高亮、聚焦相机与 X-RAY 运行原理；
- 应用场景模型、工厂环境、产线档案、性能曲线、安装尺寸图；
- `/blender/` 独立 Blender 场景、爆炸短片、静帧和工程包下载。

## 应用场景档案

`/scenarios/` 现在只做一个深案例：**连续稻田灌溉 / 卧式端吸离心泵组**。参考照片只用于研究，不显示在网站中；页面使用 **Blender 4.2 建模并导出 glTF** 的泵站资产，Three.js 负责运行交互、工况计算和剖视控制。

### 资产管线

- Blender 脚本：`scripts/build-paddy-blender.py`；
- 源场景：`blender/paddy_pump_station.blend`；
- Web 资产：`public/models/paddy_pump_station.glb`；
- 建模内容：泵组、电机、联轴器护罩、吸入滤网、出口阀、管道、混凝土泵台、田埂、稻株、灌渠、棚架和树木；
- 命名对象：`PumpCasing`、`PumpSuction`、`PumpDischarge`、`Impeller`、`ValveWheel`、`GaugeNeedle`，用于网页端剖视和动画；
- 电机不再使用 GLB 里的简化替身：网页隐藏粗模电机，直接实例化主站同一个 22 部件 `Motor`，保证产品外观一致；
- Blender 场景导出 `Anchor_Motor_Mount`：电机位置和姿态直接来自该锚点，不再由 Three.js 猜测坐标；
- 机械约束集中在 `src/data/mechanical-constraints.js`（轴高 132 mm、轴径 38 mm、联轴器间隙 3 mm、IM B3）；
- 使用 RoomEnvironment PMREM 环境反射，并通过 `enforceIndustrialMaterials()` 强制金属/混凝土/水面的 PBR 参数与阴影；
- 泵组新增法兰螺栓、阀体/阀杆/手轮、底座槽钢、地脚螺栓、调平垫铁、排水塞和多个机械锚点；3D 场景文字标注已移除；
- 当前资产等级为 **Mechanical Accurate Mockup**；它还不是 PBR 贴图级 Production Asset；
- 协作规范见根目录 `AI_COLLABORATION_RULES.md`。

### 使用类型与工况

- 电机：YE3-132S-4 · 5.5 kW · 1440 r/min · 11.1 A · 36.5 N·m；
- 传动：直联、弹性联轴器；
- 工况点：90 m³/h @ 12 m；
- 水力功率约 2.94 kW，泵轴功率按泵效率校核；
- 安装：IP55 / IC411 / IM B3 / S1；
- 启动：充水排气 → 启动电机 → 缓开出口阀 → 检查压力/电流/振动。

页面控制台可切换启动/停机、调节出口阀开度、切换剖视模式。流量、扬程、水力功率、轴功率、电机负载和电流按照简化水力模型联动，而不是随机数字。

### 3D 场景

- 稻田水田、田埂、稻株、灌渠与混凝土泵台；
- 卧式端吸离心泵、黑色散热筋电机、联轴器护罩；
- 吸入滤网、出口止回阀、压力表、田间管网；
- 剖视模式可露出泵内叶轮和流道；
- 泵组/管道/基础的载荷路径和安装尺寸在页面中标注。

![Rice Paddy Pump](screenshots/final/21-scenario-lab.png)

### 工程资料

- [YE3 系列应用范围](https://www.changli-electric.com/low-voltage-motors/ye3-series-three-phase-asynchronous-motors.html)
- [Goulds 泵安装与运行手册](http://www.gouldspumps.com/ittgp/medialibrary/goulds/website/Literature/Instruction%20and%20Operation%20Manuals/Alphabetical/IOM-ICM-ICMP-en-us-2024-02_A4.pdf)
- [IEC 132S 尺寸参考](https://yaodamotor.com/ie3-to-ie4-motor-replacement/)

页面是解释性工程模拟，不是扫描资产，也未进行结构强度、轴承寿命、汽蚀、水锤或热平衡计算。

## 运行

```bash
npm install
npm run dev
```

- 本地主站：<http://127.0.0.1:5180/>
- 本地应用场景档案：<http://127.0.0.1:5180/scenarios/>

生产构建：

```bash
npm run build
npm run preview   # http://127.0.0.1:5181/
```

部署：Cloudflare Pages 项目 `axis-motorlab`，`dist/` 直接上传。

## 目录

```
.
├─ index.html                    # 主站单页叙事
├─ src/
│  ├─ model/                     # 22 个程序化部件、应用模型、材质
│  ├─ scene/                     # 舞台、相机、灯、工厂环境
│  ├─ data/                      # 机型、部件、应用与文献数据
│  └─ scenarios/                 # 应用场景档案：photo.js / photo.css
├─ scenarios/index.html          # /scenarios/ 页面
├─ public/
│  ├─ blender/                   # Blender 短片页、视频、静帧、工程包
│  ├─ docs/                      # 建模说明
│  └─ sitemap.xml
├─ vite.config.js                # 主站 + /scenarios/ 多页面构建
└─ scripts/                      # 构建与 Playwright 回归测试
```

## 验证

- Playwright 交互回归：18/18 通过；
- 主站桌面/移动端无控制台错误、无横向溢出；
- `/scenarios/` 四张场景卡、四个 WebGL 画布正常渲染；页面不加载参考照片；
- 移动端 390 px 无横向溢出；
- Cloudflare Pages 生产地址可访问。
