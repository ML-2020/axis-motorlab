# 稻田灌溉泵站 v2 · 概念方案

## 1. 目标

重建 `/scenarios/`，旧版稻田场景归档，不继续修补。

新场景不是“把泵放进稻田风景”，而是：

> 一台真实的 YE3-132S-4 驱动卧式端吸离心泵，在一个南方稻田灌渠取水点上连续运行。

## 2. 空间

- 地点：南方稻区，灌溉季，清晨；
- 场地：灌渠、混凝土泵台、田埂、水田、简易棚架、远景树线；
- 泵组：卧式端吸离心泵 + 132S 电机 + 公共底座；
- 管路：吸入滤网沉入灌渠，出口管跨越田埂进入稻田；
- 附件：闸阀、止回阀、压力表、排气/排水、管道支架；
- 不出现：文字标签、科幻元素、无关人物、参考照片贴图。

## 3. 镜头

- 35 mm 等效焦距；
- 人眼高度约 1.55 m；
- 3/4 前侧视角，泵组占画面中下部；
- 前景：湿泥田埂/杂草；
- 中景：泵组和混凝土台；
- 背景：水田、棚架、树线；
- 不用航拍，不用超广角畸变。

## 4. 光线

- 清晨阴天/雨后散射光；
- 主光从右后上方，柔和；
- 天空冷灰，地面湿泥有轻微反射；
- 金属泵壳有边缘高光，但不镜面；
- 不要戏剧化体积光，不要过度暖色。

## 5. 概念图提示词

### 中文

> 南方稻田灌溉季清晨，写实工业纪实摄影，一台卧式端吸离心泵安装在混凝土泵台上，绿色泵壳，黑色 5.5 kW 电机，联轴器护罩，镀锌吸入管和出口管，闸阀、压力表、吸入滤网，灌渠、水田、湿泥田埂、简易棚架、远景树线，阴天散射光，35mm 镜头，人眼高度，三分之四侧视角，真实材质，无文字，无人物，非航拍。

### English

> Photorealistic industrial documentary photograph, small rice paddy irrigation pump station in southern China at dawn, horizontal end-suction centrifugal pump with green casing and black 5.5 kW motor on a concrete pad, coupling guard, galvanized suction and discharge pipes, gate valve, pressure gauge, suction strainer in an irrigation canal, flooded rice paddies, wet muddy bunds, small corrugated shelter, distant tree line, overcast diffused dawn light, 35 mm lens, eye level, three-quarter view, realistic materials, no text, no people, no aerial view.

### Negative

> aerial view, drone, text, logo, watermark, people, sci-fi, neon, dramatic sunset, oversaturated, cartoon, plastic, low-poly, wrong motor, floating objects, duplicate pumps, distorted perspective

## 6. 从图拆资产

概念图确定后，按以下类别识别：

1. 空间：田埂、水田、灌渠、泵台、棚架、树线；
2. 设备：泵体、电机、联轴器、护罩、底座；
3. 管路：吸入管、滤网、出口管、弯头、支架；
4. 阀门/仪表：闸阀、止回阀、压力表；
5. 环境细节：杂草、泥痕、水渍、锈迹；
6. 镜头/灯光：主光方向、焦段、构图。

每项记录：

- 图上位置；
- 实际尺寸；
- 资产来源（CAD/CC0/手工/Three.js Motor）；
- 许可证；
- 资产等级；
- 是否需要动画/剖视。

## 7. 交付

- 新 `/scenarios/` 单场景页面；
- 主站同一台 22 部件电机；
- 锚点装配；
- 启停、阀门、剖视、数据联动保留；
- 图片数量为 0；
- 目标等级：Mechanical Accurate Mockup → Production Asset。

## 8. API 状态

外部生图 API 尚未配置：

- 环境中没有可用的图像 API key；
- 无 key 的公共端点首次返回了错误内容，随后返回 402 付款限制；
- 不能把错误的概念图当作方案基线。

需要先确定图像服务，再继续概念图阶段。
