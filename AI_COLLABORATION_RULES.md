# AI_COLLABORATION_RULES.md

## 3D 工业场景协作守则（AI 必读）

本项目已经从“让 AI 即兴搭积木”切换为 **Blender 资产 + Three.js 装配** 的工作流。任何 AI 修改 `/scenarios/` 或 3D 场景前，必须先阅读并遵守本文件。

---

## 1. 资产等级

本项目区分三级资产，禁止混用描述：

1. **Technical Blockout**：只用于布局、锚点、碰撞和交互验证，不得作为最终展示资产；
2. **Mechanical Accurate Mockup**：尺寸、轴系、法兰、底座、管件连接可信，允许暂缺贴图；
3. **Production Asset**：具备 PBR、倒角、螺栓、焊缝、AO、磨损和真实环境细节。

当前 `/scenarios/` 的泵站资产定位为 **Mechanical Accurate Mockup**，不是 Production Asset。不得在汇报或页面文案中把它描述成写实工业资产。

---

## 2. 禁止在 Three.js 里捏造工业几何体

- 禁止用 `BoxGeometry`、`CylinderGeometry`、`SphereGeometry` 等基础几何体临时拼工业部件（泵、电机、管道、底座、阀门、法兰、棚架等）。
- 复杂视觉元素必须在 Blender 中完成，并导出为 `.glb`。
- Three.js 只负责：
  - `GLTFLoader` 加载；
  - 锚点对齐；
  - 实例化主站电机；
  - 交互、剖视、数据面板；
  - 必要的粒子/后处理/灯光。

新增视觉部件必须来自：

```text
public/models/paddy_pump_station.glb
src/model/motor.js
```

---

## 2. 锚点驱动对齐，禁止硬编码电机坐标

### Blender 端

泵组场景必须包含一个空物体：

```text
Anchor_Motor_Mount
```

要求：

- 原点位于电机安装轴心；
- 世界 Z 高度满足 `IEC_132S_SPECS.shaftHeightM`（底座安装面 + 132 mm）；
- 朝向与电机安装方向一致；
- 导出到 GLB。

### Three.js 端

必须通过锚点复制位置和姿态：

```js
const anchor = gltf.scene.getObjectByName(IEC_132S_SPECS.anchorName);
if (!anchor) throw new Error('Missing Anchor_Motor_Mount in GLB');
motor.root.position.copy(anchor.getWorldPosition(new THREE.Vector3()));
motor.root.quaternion.copy(anchor.getWorldQuaternion(new THREE.Quaternion()));
```

禁止：

```js
motor.root.position.set(0.38, 0.351, 0.1); // 禁止
```

如果锚点缺失，宁可报错，也不要猜测坐标。

---

## 3. 机械参数必须数据化

所有机械约束统一放在：

```text
src/data/mechanical-constraints.js
```

至少包含：

- 机座号；
- 轴高；
- 轴径；
- 安装方式；
- 联轴器轴向间隙；
- 锚点名称；
- 电机朝向。

任何移动、缩放、对齐电机的代码都必须 `import` 这个文件，严禁硬编码 `0.13`、`132`、`0.38` 之类的数值。

---

## 4. 材质防降级

场景 `onLoad` 后必须调用：

```js
enforceIndustrialMaterials(scene);
```

该函数负责：

- 强制 `castShadow = true`、`receiveShadow = true`；
- 对金属部件设置合理的 `metalness`、`roughness`；
- 保持 `envMapIntensity`；
- 防止 AI 重构时把 PBR 材质覆盖成默认灰色塑料。

禁止在未说明原因的情况下整体替换已有材质。

---

## 5. 禁止破坏现有交互

修改场景加载逻辑时，不得移除或破坏：

- 启动 / 停机按钮；
- 出口阀开度滑杆；
- 剖视模式；
- 流量、扬程、功率、负载、电流数据联动；
- 移动端布局。

修改后必须检查：

- 控制台无错误；
- 页面图片数量仍为 0（参考照片不得展示）；
- 电机仍来自主站同一个 `Motor`；
- 390 px 移动端无横向溢出。

---

## 6. 参考图规则

- 网络参考图片只用于研究结构与比例；
- 不得把参考照片放到 `public/` 或页面中；
- 不得把照片直接当纹理贴到泵组/场景上伪装成 3D。

---

## 7. 资产修改流程

1. 修改 `scripts/build-paddy-blender.py`；
2. 用 Blender 4.2 重新生成 `public/models/paddy_pump_station.glb`；
3. 检查 `Anchor_Motor_Mount` 是否在 GLB 中；
4. 修改 `src/scenarios/paddy-gltf.js`；
5. `npm run build`；
6. 用 Playwright 检查控制台、锚点对齐、交互、移动端；
7. 部署 Cloudflare Pages。

---

## 8. 负面清单

禁止：

- 用随机坐标 “看起来差不多” 对齐电机；
- 用包围盒中心代替真实安装轴心；
- 用程序化几何体补管道、底座、阀门、棚架；
- 用参考图片铺满背景；
- 把主站电机替换成 Blender 里的简化替身；
- 为了画面而破坏机械关系。
