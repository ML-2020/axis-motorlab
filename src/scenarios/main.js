import '@fontsource-variable/archivo';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as DATA from '../data/motor-data.js';
import { Motor } from '../model/motor.js';
import { createApplications } from '../model/applications.js';
import { clamp, makeCanvasTexture, roundedBox } from '../model/utils.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const PI2 = Math.PI * 2;
const TAU = PI2;

// ---------------------------------------------------------------------------
// Renderer / camera / scene
// ---------------------------------------------------------------------------
const canvas = $('#scenario-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0b1518, 0.032);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.03, 80);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.minDistance = 2.2;
controls.maxDistance = 10;
controls.minPolarAngle = 0.35;
controls.maxPolarAngle = Math.PI * 0.48;
controls.enabled = !window.matchMedia('(pointer: coarse)').matches;

// ---------------------------------------------------------------------------
// Lighting
// ---------------------------------------------------------------------------
const hemi = new THREE.HemisphereLight(0x9fc6cf, 0x17201b, 0.85);
scene.add(hemi);
const ambient = new THREE.AmbientLight(0x8ea6a5, 0.4);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffd9ae, 2.0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -5;
sun.shadow.camera.right = 5;
sun.shadow.camera.top = 5;
sun.shadow.camera.bottom = -3;
sun.shadow.camera.near = 0.2;
sun.shadow.camera.far = 30;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun);
scene.add(sun.target);

const indoorPointA = new THREE.PointLight(0xffd4a0, 0, 6, 2);
indoorPointA.position.set(-2.0, 2.3, 0.5);
const indoorPointB = new THREE.PointLight(0x9fd8df, 0, 6, 2);
indoorPointB.position.set(2.3, 2.25, -0.5);
scene.add(indoorPointA, indoorPointB);
const poleLight = new THREE.PointLight(0xffb568, 0, 8, 2);
poleLight.position.set(3.2, 2.8, -4.8);
scene.add(poleLight);
const windowLight = new THREE.DirectionalLight(0xbddde4, 0.7);
windowLight.position.set(0, 2.8, -6);
windowLight.target.position.set(0, 0.35, 1.2);
scene.add(windowLight, windowLight.target);

// ---------------------------------------------------------------------------
// Sky shader
// ---------------------------------------------------------------------------
const skyUniforms = {
  topColor: { value: new THREE.Color(0x193f52) },
  bottomColor: { value: new THREE.Color(0x8aa2a0) },
  horizonColor: { value: new THREE.Color(0xe3a35b) },
  sunColor: { value: new THREE.Color(0xfff0d0) },
  sunDir: { value: new THREE.Vector3(0.4, 0.8, -0.3).normalize() },
  sunIntensity: { value: 1.0 },
  horizonIntensity: { value: 0.18 },
  night: { value: 0.0 },
};
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(35, 48, 26),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: skyUniforms,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform vec3 horizonColor;
      uniform vec3 sunColor;
      uniform vec3 sunDir;
      uniform float sunIntensity;
      uniform float horizonIntensity;
      uniform float night;
      float hash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      void main() {
        vec3 dir = normalize(vDir);
        float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 col = mix(bottomColor, topColor, smoothstep(0.34, 0.78, h));
        float nearHorizon = pow(1.0 - abs(dir.y), 9.0);
        col += horizonColor * nearHorizon * horizonIntensity;
        float s = max(dot(dir, normalize(sunDir)), 0.0);
        col += sunColor * pow(s, 700.0) * 2.4 * sunIntensity;
        col += sunColor * pow(s, 18.0) * 0.08 * sunIntensity;
        float star = step(0.9984, hash(floor(dir * 420.0)));
        col += vec3(0.72, 0.82, 0.86) * star * night * (1.0 - smoothstep(0.05, 0.35, dir.y));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  }),
);
sky.frustumCulled = false;
scene.add(sky);

// ---------------------------------------------------------------------------
// Materials and small helpers
// ---------------------------------------------------------------------------
const mat = (color, metalness = 0.2, roughness = 0.65) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
const M = {
  concrete: mat(0x66716a, 0.05, 0.84),
  wetConcrete: mat(0x43524e, 0.24, 0.5),
  steel: mat(0x53686a, 0.68, 0.34),
  dark: mat(0x1d2c30, 0.3, 0.58),
  paint: mat(0x2c626b, 0.32, 0.45),
  safety: mat(0xd2a85a, 0.15, 0.5),
  grass: mat(0x3b5947, 0.02, 0.94),
  wood: mat(0x6d634b, 0.02, 0.8),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0x9fc2c5,
    metalness: 0.05,
    roughness: 0.08,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
  }),
  water: new THREE.MeshPhysicalMaterial({
    color: 0x183e46,
    metalness: 0.45,
    roughness: 0.18,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  }),
};

function add(parent, geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, cast = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addBox(parent, w, h, d, material, x, y, z, ry = 0, cast = true) {
  return add(parent, new THREE.BoxGeometry(w, h, d), material, x, y, z, 0, ry, 0, cast);
}

function addCyl(parent, rt, rb, h, material, x, y, z, rx = 0, ry = 0, rz = 0, seg = 20) {
  return add(parent, new THREE.CylinderGeometry(rt, rb, h, seg), material, x, y, z, rx, ry, rz);
}

// ---------------------------------------------------------------------------
// Motor and applications
// ---------------------------------------------------------------------------
const motor = new Motor(renderer, DATA);
motor.root.rotation.y = Math.PI / 2;
motor.root.position.set(0, 0.132, 0);
scene.add(motor.root);

const apps = createApplications();
const pump = apps.pump;
const conveyor = apps.conveyor;
const fan = apps.fan;
apps.root.remove(pump, conveyor);
pump.scale.setScalar(1.32);
pump.rotation.y = 0.2;
conveyor.scale.setScalar(1.2);
conveyor.rotation.y = 0;
fan.visible = false;

// ---------------------------------------------------------------------------
// Outdoor pump station
// ---------------------------------------------------------------------------
const outdoor = new THREE.Group();
outdoor.name = 'scenario-outdoor';
scene.add(outdoor);

// Ground, pad and wet patches.
const meadow = add(outdoor, new THREE.PlaneGeometry(34, 34), M.grass, 0, -0.02, 0, -Math.PI / 2, 0, 0, false);
add(outdoor, roundedBox(2.6, 0.075, 1.7, 0.01, 2), M.concrete, 0.2, 0.035, 0.15);
const puddles = [];
for (const [x, z, sx, sz] of [[-1.15, 1.1, 0.55, 0.26], [1.55, 1.42, 0.36, 0.18], [0.1, 1.78, 0.6, 0.22], [1.15, -0.82, 0.32, 0.15]]) {
  const p = add(outdoor, new THREE.CircleGeometry(1, 32), M.water, x, 0.014, z, -Math.PI / 2, 0, 0, false);
  p.scale.set(sx, sz, 1);
  puddles.push(p);
}

// A low farm fence, a yard light and a distant farm instead of an industrial wall.
for (const x of [-4.8, -3.0, -1.2, 0.6, 2.4, 4.2]) {
  add(outdoor, new THREE.BoxGeometry(0.06, 0.9, 0.06), M.wood, x, 0.45, -5.1, 0, 0, 0, false);
}
for (const y of [0.36, 0.72]) {
  add(outdoor, new THREE.BoxGeometry(9.2, 0.045, 0.045), M.wood, -0.3, y, -5.1, 0, 0, 0, false);
}
add(outdoor, new THREE.CylinderGeometry(0.06, 0.075, 3.2, 16), M.steel, 3.2, 1.6, -4.8, 0, 0, 0, false);
add(outdoor, new THREE.BoxGeometry(0.9, 0.045, 0.08), M.steel, 2.82, 3.15, -4.8, 0, 0, 0, false);
add(outdoor, new THREE.BoxGeometry(0.3, 0.08, 0.18), new THREE.MeshBasicMaterial({ color: 0xe8c17f, toneMapped: false }), 2.45, 3.12, -4.8, 0, 0, 0, false);
add(outdoor, new THREE.CylinderGeometry(0.12, 0.16, 0.07, 20), M.dark, 3.2, 0.035, -4.8, 0, 0, 0, false);

const pumpGuard = addBox(outdoor, 0.22, 0.1, 0.16, M.dark, 0.5, 0.16, 0.18);
pump.position.set(0.95, 0, 0.18);
outdoor.add(pump);

// Common pump-set base and visible coupling.
addBox(outdoor, 2.15, 0.014, 0.32, M.steel, 0.32, 0.012, 0.18);
addCyl(outdoor, 0.028, 0.028, 0.42, M.dark, 0.34, 0.145, 0.18, 0, 0, Math.PI / 2);
addBox(outdoor, 0.3, 0.08, 0.16, M.dark, 0.36, 0.155, 0.18);
addCyl(outdoor, 0.035, 0.045, 0.18, M.steel, 0.98, 0.145, 0.18, 0, 0, Math.PI / 2);

// Rain field outdoors.
const rainOutdoor = makeRain(900, 12, 8);
outdoor.add(rainOutdoor.group);

// ---------------------------------------------------------------------------
// Arable landscape: wheat, trees, farm buildings, birds and a deer
// ---------------------------------------------------------------------------
const wheatMat = new THREE.MeshStandardMaterial({ color: 0x80934f, roughness: 0.92 });
const wheatHeadMat = new THREE.MeshStandardMaterial({ color: 0xbba75f, roughness: 0.8 });
const wheatGroup = new THREE.Group();
const WHEAT_COUNT = 1180;
const wheatStalks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.007, 0.013, 0.33, 3, 1), wheatMat, WHEAT_COUNT);
const wheatHeads = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.017, 0.035, 0.13, 5), wheatHeadMat, WHEAT_COUNT);
const wheatDummy = new THREE.Object3D();
let wheatPlaced = 0;
for (let attempts = 0; attempts < 6000 && wheatPlaced < WHEAT_COUNT; attempts++) {
  const x = (Math.random() - 0.5) * 18;
  const z = (Math.random() - 0.5) * 13;
  if (Math.abs(x - 0.2) < 2.05 && Math.abs(z - 0.15) < 1.4) continue;
  if (Math.abs(x - 3.2) < 1.0 && Math.abs(z + 4.8) < 0.8) continue;
  const s = 0.72 + Math.random() * 0.56;
  const ry = Math.random() * TAU;
  wheatDummy.position.set(x, 0.165 * s, z);
  wheatDummy.rotation.set(0, ry, 0);
  wheatDummy.scale.set(0.8 + (s - 0.72) * 0.25, s, 0.8 + (s - 0.72) * 0.25);
  wheatDummy.updateMatrix();
  wheatStalks.setMatrixAt(wheatPlaced, wheatDummy.matrix);
  wheatDummy.position.y = 0.33 * s + 0.055;
  wheatDummy.scale.set(0.8, 0.8, 0.8);
  wheatDummy.updateMatrix();
  wheatHeads.setMatrixAt(wheatPlaced, wheatDummy.matrix);
  wheatPlaced++;
}
wheatStalks.castShadow = false;
wheatStalks.receiveShadow = true;
wheatHeads.castShadow = false;
wheatGroup.add(wheatStalks, wheatHeads);
outdoor.add(wheatGroup);

const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4d3d2c, roughness: 0.95 });
const treeLeafMat = new THREE.MeshStandardMaterial({ color: 0x3d6a4b, roughness: 0.9 });
const snowCapMat = new THREE.MeshStandardMaterial({ color: 0xe9f0ed, roughness: 0.8 });
const treeGroup = new THREE.Group();
const treeData = [];
for (const [x, z, s] of [[-5.6, -1.2, 1.15], [-6.1, 2.6, 0.92], [5.7, -1.6, 1.0], [6.1, 2.2, 0.82], [-4.8, -4.9, 0.74], [4.9, -4.7, 0.88]]) {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  tree.scale.setScalar(s);
  add(tree, new THREE.CylinderGeometry(0.055, 0.09, 0.85, 7), treeTrunkMat, 0, 0.42, 0, 0, 0, 0, false);
  const crown = add(tree, new THREE.IcosahedronGeometry(0.52, 1), treeLeafMat, 0, 1.05, 0, 0, 0, 0, false);
  crown.scale.set(1, 1.15, 0.9);
  add(tree, new THREE.IcosahedronGeometry(0.34, 0), treeLeafMat, 0.25, 1.36, 0.1, 0, 0, 0, false);
  add(tree, new THREE.IcosahedronGeometry(0.3, 0), treeLeafMat, -0.28, 1.24, -0.12, 0, 0, 0, false);
  const snow = add(tree, new THREE.DodecahedronGeometry(0.45, 0), snowCapMat, 0, 1.6, 0, 0, 0, 0, false);
  snow.scale.set(1, 0.28, 0.8);
  snow.visible = false;
  tree.userData.snow = snow;
  tree.userData.baseRot = 0;
  treeData.push(tree);
  treeGroup.add(tree);
}
outdoor.add(treeGroup);

// Flowers appear in spring; snow patches appear in winter and snowfall.
const flowerGroup = new THREE.Group();
const flowerColors = [0xe8c36a, 0xc17b82, 0xd7d2aa, 0xa9c1a0];
for (let i = 0; i < 26; i++) {
  const f = add(flowerGroup, new THREE.SphereGeometry(0.035, 5, 4), new THREE.MeshBasicMaterial({ color: flowerColors[i % flowerColors.length] }), (Math.random() - 0.5) * 13, 0.11 + Math.random() * 0.04, (Math.random() - 0.5) * 9, 0, 0, 0, false);
  f.scale.set(1, 0.7, 1);
}
outdoor.add(flowerGroup);

const snowPatchGroup = new THREE.Group();
for (let i = 0; i < 18; i++) {
  const x = (Math.random() - 0.5) * 13;
  const z = (Math.random() - 0.5) * 9;
  if (Math.abs(x - 0.2) < 1.9 && Math.abs(z - 0.15) < 1.2) continue;
  const patch = add(snowPatchGroup, new THREE.DodecahedronGeometry(0.18 + Math.random() * 0.18, 0), snowCapMat, x, 0.055, z, 0, 0, 0, false);
  patch.scale.set(1.4, 0.16, 0.9);
}
outdoor.add(snowPatchGroup);

// Distant farm: barn, silos and a small wind turbine.
const barn = new THREE.Group();
barn.position.set(-3.4, 0, -10.2);
addBox(barn, 2.6, 1.45, 1.7, M.wood, 0, 0.72, 0);
add(barn, new THREE.BoxGeometry(2.9, 0.18, 2.0), M.dark, 0, 1.53, 0, 0, 0, 0.42, false);
addBox(barn, 0.5, 0.6, 0.05, M.dark, 0, 0.62, 0.88, 0, false);
addBox(barn, 0.4, 0.28, 0.02, new THREE.MeshBasicMaterial({ color: 0xd9c48e }), 0, 0.92, 0.91, 0, false);
outdoor.add(barn);
for (const [x, z, h] of [[4.4, -10.2, 2.4], [5.2, -10.5, 2.8]]) {
  add(outdoor, new THREE.CylinderGeometry(0.3, 0.34, h, 12), M.concrete, x, h / 2, z, 0, 0, 0, false);
  add(outdoor, new THREE.ConeGeometry(0.34, 0.24, 12), M.dark, x, h + 0.12, z, 0, 0, 0, false);
}
const turbine = new THREE.Group();
turbine.position.set(-6.2, 0, -12.5);
add(turbine, new THREE.CylinderGeometry(0.045, 0.07, 3.5, 8), M.steel, 0, 1.75, 0, 0, 0, 0, false);
add(turbine, new THREE.BoxGeometry(0.18, 0.12, 0.18), M.dark, 0, 3.55, 0, 0, 0, 0, false);
const turbineRotor = new THREE.Group();
turbineRotor.position.set(0, 3.55, 0.12);
for (let i = 0; i < 3; i++) {
  const blade = add(turbineRotor, new THREE.BoxGeometry(0.05, 0.85, 0.025), M.steel, 0, 0.45, 0, 0, 0, 0, false);
  blade.rotation.z = (i / 3) * TAU;
}
turbine.add(turbineRotor);
outdoor.add(turbine);

// Birds circling above the wheat.
const birdGroup = new THREE.Group();
const birds = [];
const birdMat = new THREE.MeshBasicMaterial({ color: 0x1b2528 });
for (let i = 0; i < 7; i++) {
  const bird = new THREE.Group();
  const left = add(bird, new THREE.BoxGeometry(0.14, 0.012, 0.025), birdMat, -0.07, 0, 0, 0, 0, 0.22, false);
  const right = add(bird, new THREE.BoxGeometry(0.14, 0.012, 0.025), birdMat, 0.07, 0, 0, 0, 0, -0.22, false);
  bird.userData = { phase: i * 0.9, radius: 2.6 + i * 0.45, y: 3.2 + (i % 3) * 0.55, left, right };
  birds.push(bird);
  birdGroup.add(bird);
}
outdoor.add(birdGroup);

// A low-poly deer grazing at the edge of the field.
const deer = new THREE.Group();
deer.position.set(-2.6, 0, -3.45);
deer.rotation.y = 0.42;
deer.scale.setScalar(0.78);
const deerMat = new THREE.MeshStandardMaterial({ color: 0x7f5d3f, roughness: 0.92 });
const deerDark = new THREE.MeshStandardMaterial({ color: 0x4e3828, roughness: 0.95 });
const deerBody = add(deer, new THREE.SphereGeometry(0.32, 8, 6), deerMat, 0, 0.55, 0);
deerBody.scale.set(1.25, 0.72, 0.66);
for (const [x, z] of [[-0.22, -0.13], [0.22, -0.13], [-0.22, 0.13], [0.22, 0.13]]) {
  add(deer, new THREE.CylinderGeometry(0.022, 0.028, 0.45, 5), deerDark, x, 0.24, z);
}
const deerNeck = new THREE.Group();
deerNeck.position.set(0.35, 0.62, 0);
add(deerNeck, new THREE.CylinderGeometry(0.05, 0.075, 0.36, 6), deerMat, 0.05, 0.14, 0, 0, 0, -0.35);
add(deerNeck, new THREE.SphereGeometry(0.1, 6, 5), deerMat, 0.14, 0.3, 0);
add(deerNeck, new THREE.ConeGeometry(0.035, 0.18, 5), deerMat, 0.2, 0.4, 0, 0, 0, -0.3);
for (const s of [-1, 1]) {
  add(deerNeck, new THREE.CylinderGeometry(0.012, 0.012, 0.3, 4), deerDark, 0.1, 0.48, 0.08 * s, 0.35, 0, 0.15 * s);
  add(deerNeck, new THREE.CylinderGeometry(0.012, 0.012, 0.2, 4), deerDark, 0.08, 0.58, 0.14 * s, 0.5, 0, 0.5 * s);
}
deer.add(deerNeck);
outdoor.add(deer);

// A small rabbit at the edge of the wheat; it keeps the scale human.
const rabbit = new THREE.Group();
rabbit.position.set(1.85, 0, 2.35);
rabbit.rotation.y = -0.65;
rabbit.scale.setScalar(0.55);
const rabbitBody = add(rabbit, new THREE.SphereGeometry(0.14, 6, 5), deerMat, 0, 0.16, 0);
rabbitBody.scale.set(1.25, 0.8, 0.85);
add(rabbit, new THREE.SphereGeometry(0.09, 6, 5), deerMat, 0.14, 0.24, 0);
add(rabbit, new THREE.ConeGeometry(0.025, 0.22, 4), deerDark, 0.12, 0.38, 0.05, 0, 0, -0.2);
add(rabbit, new THREE.ConeGeometry(0.025, 0.22, 4), deerDark, 0.16, 0.38, -0.03, 0, 0, 0.2);
outdoor.add(rabbit);

// 3D snowfall only for the outdoor scene; the page also carries a CSS snow layer.
const snowOutdoor = makeSnow(650, 13, 9, 8);
outdoor.add(snowOutdoor.group);

// ---------------------------------------------------------------------------
// Indoor assembly line
// ---------------------------------------------------------------------------
const indoor = new THREE.Group();
indoor.name = 'scenario-indoor';
indoor.visible = false;
scene.add(indoor);

add(indoor, new THREE.PlaneGeometry(10, 9), M.concrete, 0, -0.01, 0.4, -Math.PI / 2, 0, 0, false);
add(indoor, new THREE.BoxGeometry(9.4, 0.004, 0.05), M.safety, 0, 0.002, -2.0);
for (let x = -4.2; x <= 4.2; x += 0.6) add(indoor, new THREE.BoxGeometry(0.02, 0.004, 0.1), M.dark, x, 0.004, -2.0, 0);

// Back wall with window openings.
const wallZ = -3.35;
addBox(indoor, 8.6, 1.1, 0.16, M.concrete, 0, 0.55, wallZ);
addBox(indoor, 8.6, 0.95, 0.16, M.concrete, 0, 2.75, wallZ);
for (const x of [-3.55, -1.1, 1.1, 3.55]) addBox(indoor, x === -3.55 || x === 3.55 ? 1.3 : 0.8, 1.35, 0.16, M.concrete, x, 1.7, wallZ);
for (const x of [-2.2, 0, 2.2]) {
  add(indoor, new THREE.PlaneGeometry(1.36, 1.28), M.glass, x, 1.7, wallZ + 0.09, 0, 0, 0, false);
  add(indoor, new THREE.BoxGeometry(1.46, 0.035, 0.08), M.steel, x, 2.41, wallZ + 0.04);
  add(indoor, new THREE.BoxGeometry(1.46, 0.035, 0.08), M.steel, x, 0.99, wallZ + 0.04);
}
addBox(indoor, 8.7, 0.2, 0.2, M.dark, 0, 3.3, wallZ);
for (const x of [-4.25, 4.25]) addBox(indoor, 0.18, 3.3, 6.8, M.concrete, x, 1.65, -0.5);
addBox(indoor, 8.7, 0.12, 6.8, M.dark, 0, 3.42, -0.5);
for (const z of [-2.2, -0.6, 1.0]) {
  add(indoor, new THREE.BoxGeometry(8.4, 0.12, 0.16), M.steel, 0, 2.88, z);
  for (const x of [-3.5, 3.5]) add(indoor, new THREE.BoxGeometry(0.16, 2.8, 0.16), M.steel, x, 1.45, z);
}
for (const x of [-2.2, 0, 2.2]) {
  add(indoor, new THREE.BoxGeometry(0.78, 0.025, 0.12), new THREE.MeshBasicMaterial({ color: 0xf2e1bf, toneMapped: false }), x, 2.48, 0.2);
  add(indoor, new THREE.CylinderGeometry(0.008, 0.008, 0.52, 6), M.steel, x - 0.26, 2.75, 0.2);
  add(indoor, new THREE.CylinderGeometry(0.008, 0.008, 0.52, 6), M.steel, x + 0.26, 2.75, 0.2);
}
// Control cabinet and crates.
addBox(indoor, 0.62, 1.35, 0.42, M.dark, 3.15, 0.675, -1.7);
addBox(indoor, 0.52, 0.95, 0.01, M.paint, 3.15, 0.7, -1.48);
for (let i = 0; i < 3; i++) add(indoor, new THREE.BoxGeometry(0.045, 0.01, 0.01), i === 0 ? new THREE.MeshBasicMaterial({ color: 0x7fe3a0 }) : M.safety, 2.97 + i * 0.09, 1.25, -1.47, 0, 0, 0, false);
addBox(indoor, 0.95, 0.42, 0.55, M.wood, -2.95, 0.21, -1.8);
addBox(indoor, 0.55, 0.32, 0.4, M.wood, -2.95, 0.53, -1.8);
addBox(indoor, 0.36, 0.28, 0.34, M.paint, -3.15, 0.14, -0.8);
for (const [x, z] of [[-1.8, -2.2], [1.7, -2.2]]) add(indoor, new THREE.ConeGeometry(0.07, 0.22, 16), M.safety, x, 0.11, z);
add(indoor, new THREE.CylinderGeometry(0.11, 0.11, 0.32, 16), M.paint, -2.5, 0.17, -2.2);

const lineGuard = addBox(indoor, 0.25, 0.1, 0.18, M.dark, -0.18, 0.16, 0.28);
addCyl(indoor, 0.028, 0.028, 0.56, M.dark, -0.24, 0.145, 0.28, 0, 0, Math.PI / 2);
addBox(indoor, 0.32, 0.1, 0.2, M.dark, -0.2, 0.15, 0.28);
conveyor.position.set(0.65, 0, 0.28);
indoor.add(conveyor);
const rainWindow = makeRain(300, 4.2, 1.2, 4.2);
rainWindow.group.position.z = -4.4;
rainWindow.group.position.y = 1.7;
indoor.add(rainWindow.group);

// ---------------------------------------------------------------------------
// Rooftop cooling fan
// ---------------------------------------------------------------------------
const rooftop = new THREE.Group();
rooftop.name = 'scenario-rooftop';
rooftop.visible = false;
scene.add(rooftop);
addBox(rooftop, 8.4, 0.18, 6.4, M.concrete, 0, -0.09, -0.2);
addBox(rooftop, 8.6, 0.58, 0.16, M.concrete, 0, 0.28, -3.38);
addBox(rooftop, 8.6, 0.58, 0.16, M.concrete, 0, 0.28, 3.0);
for (const x of [-4.25, 4.25]) addBox(rooftop, 0.16, 0.58, 6.4, M.concrete, x, 0.28, -0.2);
for (const x of [-3.2, -1.1, 1.1, 3.2]) {
  add(rooftop, new THREE.CylinderGeometry(0.025, 0.025, 0.75, 10), M.steel, x, 0.37, 2.82, 0, 0, 0, false);
  add(rooftop, new THREE.CylinderGeometry(0.025, 0.025, 0.75, 10), M.steel, x, 0.37, -3.22, 0, 0, 0, false);
}
add(rooftop, new THREE.BoxGeometry(3.2, 0.055, 0.08), M.safety, 0, 0.72, 2.82, 0, 0, 0, false);
add(rooftop, new THREE.BoxGeometry(3.2, 0.055, 0.08), M.safety, 0, 0.72, -3.22, 0, 0, 0, false);
// Rooftop plant silhouettes.
for (const [x, z, w, h, d] of [[-3.0, -4.6, 1.6, 0.7, 1.0], [-1.2, -4.9, 2.0, 1.1, 1.0], [2.9, -4.7, 1.8, 0.6, 1.1], [4.5, -4.8, 1.2, 1.4, 1.0]]) {
  addBox(rooftop, w, h, d, M.dark, x, h / 2, z, 0, false);
}
addBox(rooftop, 2.4, 0.95, 1.3, M.paint, -1.4, 0.48, -2.3);
addBox(rooftop, 2.5, 0.08, 1.4, M.dark, -1.4, 0.99, -2.3);
add(rooftop, new THREE.CylinderGeometry(0.19, 0.19, 0.7, 24), M.steel, 2.1, 0.35, -2.1, 0, 0, 0, false);
add(rooftop, new THREE.TorusGeometry(0.2, 0.025, 8, 28), M.steel, 2.1, 0.7, -2.1, Math.PI / 2, 0, 0, false);
// Fan and motor skid.
addBox(rooftop, 1.75, 0.03, 0.5, M.steel, 0.1, 0.015, 0.1);
conveyor.visible = false;
fan.visible = true;
fan.scale.setScalar(1.55);
fan.position.set(0.75, 0, 0.1);
rooftop.add(fan);
const roofGuard = addBox(rooftop, 0.32, 0.1, 0.2, M.dark, 0.26, 0.155, 0.1);
const rainRooftop = makeRain(600, 9, 7);
rooftop.add(rainRooftop.group);

// ---------------------------------------------------------------------------
// Water treatment mixing tank
// ---------------------------------------------------------------------------
const water = new THREE.Group();
water.name = 'scenario-water';
water.visible = false;
scene.add(water);
add(water, new THREE.PlaneGeometry(24, 24), M.grass, 0, -0.02, 0, -Math.PI / 2, 0, 0, false);
addBox(water, 4.4, 0.07, 2.3, M.concrete, 0, 0.035, 0.2);
const tankMat = new THREE.MeshStandardMaterial({ color: 0x27434a, metalness: 0.55, roughness: 0.4, side: THREE.DoubleSide });
const tank = add(water, new THREE.CylinderGeometry(0.62, 0.66, 0.5, 40, 1, true), tankMat, 0.62, 0.25, 0.18, 0, 0, 0, false);
add(water, new THREE.TorusGeometry(0.63, 0.025, 8, 40), M.steel, 0.62, 0.5, 0.18, Math.PI / 2, 0, 0, false);
const waterSurface = add(water, new THREE.CircleGeometry(0.6, 40), new THREE.MeshPhysicalMaterial({
  color: 0x1f5863, metalness: 0.35, roughness: 0.12, transparent: true, opacity: 0.7, side: THREE.DoubleSide,
}), 0.62, 0.43, 0.18, -Math.PI / 2, 0, 0, false);
const mixerImpeller = new THREE.Group();
mixerImpeller.position.set(0.62, 0.3, 0.18);
water.add(mixerImpeller);
add(mixerImpeller, new THREE.CylinderGeometry(0.035, 0.035, 0.08, 16), M.steel, 0, 0.1, 0, 0, 0, Math.PI / 2);
for (let i = 0; i < 4; i++) {
  const a = (i / 4) * TAU;
  add(mixerImpeller, new THREE.BoxGeometry(0.02, 0.36, 0.045), M.steel, 0, Math.cos(a) * 0.14, Math.sin(a) * 0.14, a, 0, 0);
}
add(water, new THREE.CylinderGeometry(0.045, 0.045, 0.55, 20), M.steel, 0.28, 0.3, 0.18, 0, 0, Math.PI / 2, false);
add(water, new THREE.CylinderGeometry(0.16, 0.16, 0.045, 20), M.steel, 0.62, 0.62, 0.18, 0, 0, 0, false);
addBox(water, 1.8, 0.035, 0.55, M.steel, -0.1, 0.017, 0.18);
addCyl(water, 0.028, 0.028, 0.62, M.dark, -0.25, 0.145, 0.18, 0, 0, Math.PI / 2);
addBox(water, 0.3, 0.1, 0.2, M.dark, -0.22, 0.15, 0.18);
add(water, new THREE.CylinderGeometry(0.075, 0.075, 0.8, 20), M.steel, 1.35, 0.4, 0.18, 0, 0, 0, false);
add(water, new THREE.CylinderGeometry(0.075, 0.075, 1.1, 20), M.steel, 1.35, 0.4, -0.5, 0, 0, Math.PI / 2, false);
for (const [x, z] of [[-1.45, 1.0], [1.55, 1.0], [-1.45, -0.75], [1.55, -0.75]]) {
  add(water, new THREE.BoxGeometry(0.05, 0.8, 0.05), M.safety, x, 0.4, z, 0, 0, 0, false);
}
const rainWater = makeRain(700, 10, 7);
water.add(rainWater.group);

// ---------------------------------------------------------------------------
// Motor placement per scenario
// ---------------------------------------------------------------------------
function placeMotor(group, x, z) {
  if (motor.root.parent) motor.root.parent.remove(motor.root);
  group.add(motor.root);
  motor.root.rotation.y = Math.PI / 2;
  motor.root.position.set(x, 0.132, z);
}

// ---------------------------------------------------------------------------
// Scenario configuration
// ---------------------------------------------------------------------------
const SCENARIOS = {
  outdoor: {
    code: 'SCN-01',
    status: 'PUMPING / CONTINUOUS',
    description: '麦田泵站。离心泵从低位水池取水，经出口管路送入管网。麦浪、树木、鸟群与季节天气共同构成现场环境。',
    camera: { pos: [2.4, 2.0, 4.0], target: [0.2, 0.27, 0.12], fov: 37 },
    metricA: ['FLOW', 'm³/h'],
  },
  indoor: {
    code: 'SCN-02',
    status: 'ASSEMBLY / SHIFT A',
    description: '室内装配线。电机通过皮带驱动输送机，完成箱体转运。窗外天气与昼夜变化，室内照明维持稳定班次。',
    camera: { pos: [2.35, 1.85, 3.35], target: [0.1, 0.3, 0.1], fov: 36 },
    metricA: ['THROUGHPUT', 'pcs/h'],
  },
  rooftop: {
    code: 'SCN-03',
    status: 'COOLING / CONTINUOUS',
    description: '屋顶冷却。电机驱动轴流风机，为屋顶空调机组排热。高处的风、日晒和降雨直接改变风机负载与环境温度。',
    camera: { pos: [2.65, 2.25, 4.3], target: [0.12, 0.32, 0.02], fov: 37 },
    metricA: ['AIRFLOW', 'm³/h'],
  },
  water: {
    code: 'SCN-04',
    status: 'MIXING / TREATMENT',
    description: '水处理搅拌。电机经联轴器驱动侧入式搅拌器，使药剂与水体均匀混合。搅拌轴、叶轮与水面持续运动。',
    camera: { pos: [2.8, 2.15, 4.2], target: [0.16, 0.32, 0.1], fov: 37 },
    metricA: ['MIXER', 'rpm'],
  },
};

const SEASONS = {
  spring: { ground: 0x4e6c4b, wheat: 0x759d58, head: 0x9dbb72, tree: 0x5d8751, patch: false },
  summer: { ground: 0x3b5947, wheat: 0x80934f, head: 0xbba75f, tree: 0x3d6a4b, patch: false },
  autumn: { ground: 0x665b3c, wheat: 0xa5823f, head: 0xc9a75d, tree: 0x9b6138, patch: false },
  winter: { ground: 0x929e9a, wheat: 0x7f795f, head: 0x948c6d, tree: 0x59635c, patch: true },
};

let scenario = 'outdoor';
let season = 'summer';
let simMinutes = 9 * 60 + 30;
let timeMode = 'timelapse';
let weather = 'clear';
let spinAngle = 0;
let last = performance.now();
let toastTimer = null;
const targetWeather = { overcast: 0, rain: 0, snow: 0, wind: 0.05 };
const weatherMix = { overcast: 0, rain: 0, snow: 0, wind: 0.05 };

const ui = {
  clock: $('#clock'),
  time: $('#time-readout'),
  slider: $('#time-slider'),
  sun: $('#sun-label'),
  code: $('#scenario-code'),
  status: $('#scenario-status'),
  description: $('#scenario-description'),
  modeLabel: $('#mode-label'),
  note: $('#telemetry-note'),
  load: $('#metric-load'),
  temp: $('#metric-temp'),
  a: $('#metric-a'),
  aLabel: $('#metric-a-label'),
  aUnit: $('#metric-a-unit'),
  current: $('#metric-current'),
  toast: $('#toast'),
};

function setScenario(next) {
  scenario = next;
  document.body.dataset.scenario = next;
  $$('.scenario-tab').forEach((btn) => {
    const on = btn.dataset.scenario === next;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', String(on));
  });
  $$('.module-card').forEach((card) => card.classList.toggle('active', card.dataset.module === next));
  outdoor.visible = next === 'outdoor';
  indoor.visible = next === 'indoor';
  rooftop.visible = next === 'rooftop';
  water.visible = next === 'water';
  pump.visible = next === 'outdoor';
  conveyor.visible = next === 'indoor';
  fan.visible = next === 'rooftop';
  if (next === 'outdoor') {
    placeMotor(outdoor, -0.22, 0.18);
    pump.position.set(0.95, 0, 0.18);
  } else if (next === 'indoor') {
    placeMotor(indoor, -0.62, 0.28);
    conveyor.position.set(0.65, 0, 0.28);
  } else if (next === 'rooftop') {
    placeMotor(rooftop, -0.32, 0.1);
    fan.position.set(0.62, 0, 0.1);
  } else {
    placeMotor(water, -0.58, 0.18);
  }
  const cfg = SCENARIOS[next];
  ui.code.textContent = cfg.code;
  ui.status.textContent = cfg.status;
  ui.description.textContent = cfg.description;
  ui.aLabel.textContent = cfg.metricA[0];
  ui.aUnit.textContent = cfg.metricA[1];
  controls.target.set(...cfg.camera.target);
  camera.position.set(...cfg.camera.pos);
  camera.fov = cfg.camera.fov;
  camera.updateProjectionMatrix();
  const toastCopy = {
    outdoor: '麦田泵站 · 风、雪、季节与昼夜已接入',
    indoor: '室内产线 · 窗外天气与室内班次已接入',
    rooftop: '屋顶冷却 · 风机负载跟随天气',
    water: '水处理搅拌 · 叶轮与水面持续运行',
  };
  showToast(toastCopy[next]);
  updateTelemetry(0);
}

function showToast(text) {
  ui.toast.textContent = text;
  ui.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 2200);
}

// ---------------------------------------------------------------------------
// Weather / rain / sky
// ---------------------------------------------------------------------------
function makeRain(count, spreadX, spreadZ, height = 8) {
  const positions = new Float32Array(count * 6);
  const drops = [];
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * spreadX * 2;
    const y = Math.random() * height;
    const z = (Math.random() - 0.5) * spreadZ * 2;
    const len = 0.08 + Math.random() * 0.16;
    positions.set([x, y, z, x - 0.01, y - len, z], i * 6);
    drops.push({ x, y, z, len, speed: 7 + Math.random() * 7 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: 0xa8d4dc,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const group = new THREE.LineSegments(geo, material);
  group.frustumCulled = false;
  return {
    group,
    drops,
    update(dt, visible) {
      material.opacity = visible ? 0.55 : 0;
      if (!visible) return;
      const attr = group.geometry.getAttribute('position');
      for (let i = 0; i < drops.length; i++) {
        const p = drops[i];
        p.y -= p.speed * dt;
        if (p.y < 0) {
          p.y = height;
          p.x = (Math.random() - 0.5) * spreadX * 2;
          p.z = (Math.random() - 0.5) * spreadZ * 2;
        }
        const j = i * 6;
        attr.array[j] = p.x;
        attr.array[j + 1] = p.y;
        attr.array[j + 2] = p.z;
        attr.array[j + 3] = p.x - 0.01;
        attr.array[j + 4] = p.y - p.len;
        attr.array[j + 5] = p.z;
      }
      attr.needsUpdate = true;
    },
  };
}

function makeSnow(count, spreadX, spreadZ, height = 8) {
  const positions = new Float32Array(count * 3);
  const flakes = [];
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * spreadX * 2;
    const y = Math.random() * height;
    const z = (Math.random() - 0.5) * spreadZ * 2;
    positions.set([x, y, z], i * 3);
    flakes.push({ x, y, z, speed: 0.9 + Math.random() * 1.6, drift: (Math.random() - 0.5) * 0.35 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xf3f8f6,
    size: 0.045,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const group = new THREE.Points(geo, material);
  group.frustumCulled = false;
  return {
    group,
    update(dt, visible, wind = 0) {
      material.opacity = visible ? 0.9 : 0;
      if (!visible) return;
      const attr = group.geometry.getAttribute('position');
      for (let i = 0; i < flakes.length; i++) {
        const p = flakes[i];
        p.y -= p.speed * dt;
        p.x += p.drift * dt + wind * dt * 0.65;
        if (p.y < 0.02) {
          p.y = height;
          p.x = (Math.random() - 0.5) * spreadX * 2;
          p.z = (Math.random() - 0.5) * spreadZ * 2;
        }
        attr.array[i * 3] = p.x;
        attr.array[i * 3 + 1] = p.y;
        attr.array[i * 3 + 2] = p.z;
      }
      attr.needsUpdate = true;
    },
  };
}

function weatherTargets() {
  const isRain = weather === 'rain';
  const isSnow = weather === 'snow';
  const isWind = weather === 'wind';
  targetWeather.overcast = weather === 'overcast' ? 1 : isRain ? 0.86 : isSnow ? 0.8 : isWind ? 0.16 : 0;
  targetWeather.rain = isRain ? 1 : 0;
  targetWeather.snow = isSnow ? 1 : 0;
  targetWeather.wind = isWind ? 1 : isSnow ? 0.42 : isRain ? 0.24 : 0.05;
  if (snowPatchGroup) snowPatchGroup.visible = season === 'winter' || isSnow;
}

function updateSkyAndLights(dt) {
  const overcast = weatherMix.overcast;
  const rain = weatherMix.rain;
  const snow = weatherMix.snow;
  const wind = weatherMix.wind;
  const hour = simMinutes / 60;
  const sunAngle = ((hour - 6) / 12) * Math.PI;
  const elevation = Math.sin(sunAngle);
  const daylight = clamp(elevation * 3.2 + 0.12);
  const night = 1 - clamp(elevation * 5 + 0.55);
  const golden = Math.exp(-Math.pow(elevation / 0.23, 2)) * clamp(elevation + 0.1);
  const clearTop = new THREE.Color(0x4f8097).lerp(new THREE.Color(0x07111d), night);
  const clearBottom = new THREE.Color(0xc6d2c9).lerp(new THREE.Color(0x122230), night);
  const overcastTop = new THREE.Color(0x788481).lerp(new THREE.Color(0x172125), night);
  const overcastBottom = new THREE.Color(0xaeb5ab).lerp(new THREE.Color(0x273033), night);
  const top = clearTop.lerp(overcastTop, overcast);
  const bottom = clearBottom.lerp(overcastBottom, overcast);
  const horizon = new THREE.Color(0xd58b50).lerp(new THREE.Color(0x6a7370), overcast).lerp(new THREE.Color(0x111a20), night);
  skyUniforms.topColor.value.copy(top);
  skyUniforms.bottomColor.value.copy(bottom);
  skyUniforms.horizonColor.value.copy(horizon);
  skyUniforms.horizonIntensity.value = 0.08 + golden * 0.55 * (1 - overcast * 0.7);
  skyUniforms.sunDir.value.set(Math.cos(sunAngle) * 0.72, Math.max(0.02, elevation), -0.35).normalize();
  skyUniforms.sunIntensity.value = clamp(1.5 - overcast * 1.25 - rain * 0.18) * (0.15 + daylight * 0.85);
  skyUniforms.night.value = night;

  const sunHeight = Math.max(0.02, elevation);
  sun.position.set(Math.cos(sunAngle) * 8, sunHeight * 8 + 0.5, -3);
  sun.target.position.set(0, 0.2, 0);
  sun.color.setHex(golden > 0.25 ? 0xffb16e : 0xffe4c4);

  if (scenario === 'indoor') {
    sun.intensity = 0.35 + daylight * 1.4;
    hemi.intensity = 1.0 + daylight * 0.55;
    ambient.intensity = 0.42;
    windowLight.intensity = 2.2 + daylight * 2.2;
    windowLight.color.copy(bottom).lerp(new THREE.Color(0xd8e6e5), 0.42);
    indoorPointA.intensity = 7.0 + night * 8.0;
    indoorPointB.intensity = 5.5 + night * 6.0;
    poleLight.intensity = 0;
    scene.fog.density = 0.008 + overcast * 0.008;
  } else {
    sun.intensity = (0.7 + daylight * 3.1) * (1 - overcast * 0.62) * (1 - rain * 0.16);
    hemi.intensity = 0.5 + daylight * 0.9 * (1 - overcast * 0.3);
    ambient.intensity = 0.24 + daylight * 0.4;
    windowLight.intensity = 0;
    indoorPointA.intensity = 0;
    indoorPointB.intensity = 0;
    poleLight.intensity = (1 - daylight) * 9 * (1 - overcast * 0.25);
    scene.fog.density = 0.014 + overcast * 0.014 + rain * 0.01;
  }
  scene.fog.color.copy(bottom).multiplyScalar(0.8);

  // Wet ground / puddles respond to weather.
  puddles.forEach((p) => {
    p.visible = rain > 0.02 || weatherMix.overcast > 0.5;
    p.material.opacity = 0.14 + rain * 0.62;
  });
  rainOutdoor.update(dt, rain > 0.025 && scenario === 'outdoor');
  rainRooftop.update(dt, rain > 0.025 && scenario === 'rooftop');
  rainWater.update(dt, rain > 0.025 && scenario === 'water');
  rainWindow.update(dt, rain > 0.025 && scenario === 'indoor');
  snowOutdoor.update(dt, snow > 0.025 && scenario === 'outdoor', wind);
  M.glass.opacity = 0.12 + overcast * 0.12;
  M.water.opacity = 0.2 + rain * 0.5;
}

// ---------------------------------------------------------------------------
// Time / telemetry / controls
// ---------------------------------------------------------------------------
function updateClock() {
  const minute = Math.floor(simMinutes) % 1440;
  const h = String(Math.floor(minute / 60)).padStart(2, '0');
  const m = String(minute % 60).padStart(2, '0');
  const hour = simMinutes / 60;
  const sunElevation = Math.sin(((hour - 6) / 12) * Math.PI);
  const elevationDeg = Math.round(Math.asin(clamp(sunElevation, -1, 1)) * 180 / Math.PI);
  ui.clock.textContent = `${h}:${m}`;
  ui.time.textContent = `${h}:${m}`;
  ui.sun.textContent = `${sunElevation > 0 ? 'SUN' : 'MOON'} / ${Math.abs(elevationDeg)}°`;
  if (document.activeElement !== ui.slider) ui.slider.value = String(Math.floor(simMinutes) % 1440);
}

function updateTelemetry(dt) {
  const overcast = weatherMix.overcast;
  const rain = weatherMix.rain;
  const day = clamp(Math.sin(((simMinutes / 60 - 6) / 12) * Math.PI) * 3);
  const isOutdoor = scenario === 'outdoor';
  const isIndoor = scenario === 'indoor';
  const isRooftop = scenario === 'rooftop';
  const isWater = scenario === 'water';
  let ambient = isIndoor ? 25 + day * 3 - overcast * 0.8 : 19 + day * 11 - overcast * 1.5 - rain * 2;
  if (isRooftop) ambient = 16 + day * 14 - overcast * 1.8 - rain * 2.5;
  if (isWater) ambient = 18 + day * 9 - overcast * 1.4 - rain * 1.8;
  const load = isIndoor
    ? 64 + Math.sin(performance.now() * 0.0004) * 3
    : isRooftop
      ? 58 + Math.sin(performance.now() * 0.00036) * 4 + (1 - day) * 1.5
      : isWater
        ? 72 + Math.sin(performance.now() * 0.00032) * 4
        : 71 + Math.sin(performance.now() * 0.0003) * 4 + (1 - day) * 2;
  const current = 8.8 + load * 0.036;
  if (dt > 0) {
    ui.load.textContent = String(Math.round(load));
    ui.temp.textContent = String(Math.round(ambient));
    ui.current.textContent = current.toFixed(1);
    if (isOutdoor) {
      ui.a.textContent = String(Math.round(40 + (100 - load) * 0.22 + Math.sin(performance.now() * 0.0005) * 1.2));
    } else if (isIndoor) {
      ui.a.textContent = String(Math.round(1150 + (100 - load) * 8 + Math.sin(performance.now() * 0.0007) * 22));
    } else if (isRooftop) {
      ui.a.textContent = String(Math.round(16000 + (100 - load) * 110 + Math.sin(performance.now() * 0.0006) * 120));
    } else {
      ui.a.textContent = String(Math.round(128 + (100 - load) * 0.7 + Math.sin(performance.now() * 0.0008) * 2));
    }
  }
}

function setWeather(next) {
  weather = next;
  document.body.dataset.weather = next;
  weatherTargets();
  $$('.weather-buttons button').forEach((btn) => btn.classList.toggle('active', btn.dataset.weather === next));
  const copy = {
    clear: '晴天', overcast: '阴天', rain: '降雨', snow: '降雪', wind: '强风',
  };
  showToast(`天气切换为 ${copy[next] || next}`);
}

function applySeason(next) {
  const cfg = SEASONS[next] || SEASONS.summer;
  meadow.material.color.setHex(cfg.ground);
  wheatMat.color.setHex(cfg.wheat);
  wheatHeadMat.color.setHex(cfg.head);
  treeLeafMat.color.setHex(cfg.tree);
  wheatGroup.visible = next !== 'winter';
  flowerGroup.visible = next === 'spring';
  snowPatchGroup.visible = next === 'winter' || weather === 'snow';
  treeData.forEach((tree) => { tree.userData.snow.visible = next === 'winter'; });
  document.body.dataset.season = next;
}

function setSeason(next) {
  season = next;
  $$('.season-buttons button').forEach((btn) => btn.classList.toggle('active', btn.dataset.season === next));
  applySeason(next);
  const copy = { spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季' };
  showToast(`季节切换为 ${copy[next] || next}`);
}

function setTimeMode(next) {
  timeMode = next;
  $('#mode-timelapse').classList.toggle('active', next === 'timelapse');
  $('#mode-realtime').classList.toggle('active', next === 'realtime');
  ui.modeLabel.textContent = next === 'timelapse' ? 'TIME-LAPSE' : 'REAL-TIME';
  ui.note.textContent = next === 'timelapse' ? '延时模拟 · 1 秒 ≈ 40 分钟' : '实时运行 · 设备与环境数据持续更新';
  showToast(next === 'timelapse' ? '时间延时已启用' : '实时运行模式已启用');
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
$$('.scenario-tab').forEach((btn) => btn.addEventListener('click', () => setScenario(btn.dataset.scenario)));
$$('.weather-buttons button').forEach((btn) => btn.addEventListener('click', () => setWeather(btn.dataset.weather)));
$$('.season-buttons button').forEach((btn) => btn.addEventListener('click', () => setSeason(btn.dataset.season)));
$$('.module-enter').forEach((btn) => btn.addEventListener('click', () => {
  setScenario(btn.dataset.target);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}));
$('#mode-timelapse').addEventListener('click', () => setTimeMode('timelapse'));
$('#mode-realtime').addEventListener('click', () => setTimeMode('realtime'));
ui.slider.addEventListener('input', () => {
  simMinutes = Number(ui.slider.value);
  updateClock();
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 820 ? 1.5 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
});

// ---------------------------------------------------------------------------
// Animation loop
// ---------------------------------------------------------------------------
placeMotor(outdoor, -0.22, 0.18);
pump.position.set(0.95, 0, 0.18);
document.body.dataset.weather = 'clear';
setScenario('outdoor');
setSeason('summer');
setTimeMode('timelapse');
weatherTargets();
updateClock();

function animateNature(dt, now) {
  const t = now * 0.001;
  const wind = weatherMix.wind;
  wheatGroup.rotation.z = Math.sin(t * 0.72) * 0.012 * (0.4 + wind * 2.8);
  wheatGroup.rotation.x = Math.cos(t * 0.51) * 0.006 * (0.4 + wind * 2.0);
  treeData.forEach((tree, i) => {
    tree.rotation.z = Math.sin(t * (0.55 + i * 0.03) + i) * 0.018 * (0.3 + wind * 2.5);
  });
  birds.forEach((bird, i) => {
    const p = bird.userData;
    const a = t * (0.18 + wind * 0.2) + p.phase;
    bird.position.set(Math.cos(a) * p.radius, p.y + Math.sin(a * 1.8 + i) * 0.22, -0.5 + Math.sin(a) * p.radius * 0.55);
    bird.rotation.y = -a + Math.PI / 2;
    const flap = Math.sin(t * 7 + p.phase) * 0.3;
    p.left.rotation.z = 0.22 + flap;
    p.right.rotation.z = -0.22 - flap;
  });
  turbineRotor.rotation.z += dt * (0.35 + wind * 4.2);
  deerNeck.rotation.z = Math.sin(t * 1.3) * 0.035;
  flowerGroup.rotation.y = Math.sin(t * 0.3) * 0.01;
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;

  if (timeMode === 'timelapse') {
    simMinutes = (simMinutes + dt * 40) % 1440;
    updateClock();
  }
  weatherMix.overcast += (targetWeather.overcast - weatherMix.overcast) * Math.min(1, dt * 1.8);
  weatherMix.rain += (targetWeather.rain - weatherMix.rain) * Math.min(1, dt * 1.8);
  weatherMix.snow += (targetWeather.snow - weatherMix.snow) * Math.min(1, dt * 1.8);
  weatherMix.wind += (targetWeather.wind - weatherMix.wind) * Math.min(1, dt * 1.4);
  updateSkyAndLights(dt);
  animateNature(dt, now);

  spinAngle = (spinAngle + dt * (scenario === 'outdoor' ? 5.2 : scenario === 'water' ? 3.0 : 4.2)) % TAU;
  motor.setSpin(spinAngle);
  mixerImpeller.rotation.x += dt * 3.2;
  waterSurface.rotation.z += dt * 0.35;
  waterSurface.scale.setScalar(1 + Math.sin(now * 0.002) * 0.008);
  apps.update(dt, now / 1000);
  updateTelemetry(dt);
  controls.update();
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
