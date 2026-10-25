import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  PI2,
  curveTube,
  makeCanvasTexture,
  ringExtrudeZ,
  shadowed,
  torusZ,
} from './utils.js';

const makeGroup = (name) => {
  const g = new THREE.Group();
  g.name = name;
  return g;
};

const SLOTS = 36;
const PITCH = PI2 / SLOTS;

function addArc(points, r, a0, a1, segments) {
  for (let i = 0; i <= segments; i++) {
    const a = a0 + ((a1 - a0) * i) / segments;
    points.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
}

function statorLaminationShape({ outer = 0.1025, bore = 0.0582, slotRadius = 0.0764 } = {}) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, 0, PI2, false);
  const points = [];
  const halfOpen = PITCH * 0.335;
  const halfBottom = PITCH * 0.315;
  for (let i = 0; i < SLOTS; i++) {
    const a = i * PITCH;
    // Slot opening at the bore, then the wider slot body
    points.push(new THREE.Vector2(Math.cos(a - halfOpen) * bore, Math.sin(a - halfOpen) * bore));
    points.push(new THREE.Vector2(Math.cos(a - halfBottom) * slotRadius, Math.sin(a - halfBottom) * slotRadius));
    addArc(points, slotRadius, a - halfBottom, a + halfBottom, 5);
    points.push(new THREE.Vector2(Math.cos(a + halfOpen) * bore, Math.sin(a + halfOpen) * bore));
    addArc(points, bore, a + halfOpen, a + PITCH - halfOpen, 6);
  }
  const hole = new THREE.Path(points);
  hole.closePath();
  shape.holes.push(hole);
  return shape;
}

function statorLaminationGeometry(thickness = 0.00225) {
  const shape = statorLaminationShape();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    steps: 1,
    curveSegments: 4,
    bevelEnabled: false,
  });
  geo.translate(0, 0, -thickness / 2);
  return geo;
}

export function buildStatorCore(kit) {
  const g = makeGroup('stator-core');
  const lam = kit.get('laminate');
  const dark = kit.get('steelDark');

  const geo = statorLaminationGeometry(0.00225);
  const count = 44;
  const spacing = 0.00312;
  const inst = new THREE.InstancedMesh(geo, lam, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    dummy.position.z = (i - (count - 1) / 2) * spacing;
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.castShadow = true;
  inst.receiveShadow = true;
  g.add(inst);

  const coreLen = count * spacing;

  // End plates, clamping fingers and outer locating keys
  for (const sign of [-1, 1]) {
    const endPlate = ringExtrudeZ(
      { outer: 0.1029, inner: 0.0865, depth: 0.0055, bevel: 0.0008, segments: 96 },
      dark,
    );
    endPlate.position.z = sign * (coreLen / 2 + 0.0018);
    shadowed(endPlate);
    g.add(endPlate);
  }

  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i / 4) * PI2;
    const finger = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.009, coreLen + 0.012), dark);
    finger.position.set(Math.cos(a) * 0.101, Math.sin(a) * 0.101, 0);
    finger.rotation.z = a;
    g.add(finger);
  }

  // Lamination key bars around the outside
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i / 3) * PI2;
    const key = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.004, coreLen + 0.016), kit.get('steel'));
    key.position.set(Math.cos(a) * 0.1025, Math.sin(a) * 0.1025, 0);
    key.rotation.z = a;
    g.add(key);
  }

  // Fine radial vent slots suggested by darker rings
  for (const sign of [-1, 1]) {
    for (const offset of [0.025, 0.05]) {
      const ring = torusZ(0.0905, 0.0012, dark, 5, 96);
      ring.position.z = sign * (coreLen / 2 - offset * coreLen);
      g.add(ring);
    }
  }

  return g;
}

function makeLeadLabelTexture(label, color) {
  return makeCanvasTexture(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1712';
    ctx.font = '800 48px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, w / 2, h / 2 + 2);
  });
}

export function buildStatorWinding(kit) {
  const g = makeGroup('stator-winding');
  const copper = kit.get('copper');
  const insulation = kit.get('insulation');
  const ties = kit.get('gasket');

  const coils = 36;
  const layerR = [0.0636, 0.0688];
  const endBulge = [0.0125, 0.0185];
  const endLayers = [0.084, 0.092];
  const coreHalf = 0.074;

  for (let k = 0; k < coils; k++) {
    const layer = k % 2;
    const a1 = k * PITCH;
    const a2 = a1 + Math.PI / 2;
    const r = layerR[layer];
    const bulge = endBulge[layer];
    const zEnd = endLayers[layer];

    const points = [];
    // Slot side 1 (front)
    points.push([Math.cos(a1) * r, Math.sin(a1) * r, -coreHalf]);
    points.push([Math.cos(a1) * r, Math.sin(a1) * r, coreHalf]);
    // Positive end-turn, sweeping to slot side 2
    for (let i = 1; i <= 5; i++) {
      const t = i / 6;
      const a = a1 + (a2 - a1) * t;
      const rr = r + bulge * Math.sin(Math.PI * t);
      const zz = zEnd + 0.009 * Math.sin(Math.PI * t);
      points.push([Math.cos(a) * rr, Math.sin(a) * rr, zz]);
    }
    points.push([Math.cos(a2) * r, Math.sin(a2) * r, coreHalf]);
    // Slot side 2 (rear)
    points.push([Math.cos(a2) * r, Math.sin(a2) * r, -coreHalf]);
    // Negative end-turn back to slot side 1
    for (let i = 1; i <= 5; i++) {
      const t = i / 6;
      const a = a2 - (a2 - a1) * t;
      const rr = r + bulge * Math.sin(Math.PI * t);
      const zz = -zEnd - 0.009 * Math.sin(Math.PI * t);
      points.push([Math.cos(a) * rr, Math.sin(a) * rr, zz]);
    }
    const tube = curveTube(points, 0.00255, copper, 92, 6, true);
    tube.castShadow = true;
    tube.receiveShadow = true;
    g.add(tube);
  }

  // Slot wedges close the stator slots over the winding
  for (let i = 0; i < SLOTS; i++) {
    const a = i * PITCH;
    const wedge = new THREE.Mesh(new THREE.BoxGeometry(0.0052, 0.0024, 0.148), insulation);
    wedge.position.set(Math.cos(a) * 0.0612, Math.sin(a) * 0.0612, 0);
    wedge.rotation.z = a;
    g.add(wedge);
  }

  // Phase insulation barriers at both ends of the core
  for (const sign of [-1, 1]) {
    const barrier = new THREE.Mesh(new THREE.TorusGeometry(0.081, 0.0016, 6, 96), insulation);
    barrier.position.z = sign * 0.087;
    g.add(barrier);
    const barrier2 = new THREE.Mesh(new THREE.TorusGeometry(0.089, 0.0014, 6, 96), insulation);
    barrier2.position.z = sign * 0.098;
    g.add(barrier2);
  }

  // Lacing ties around the end winding
  for (const sign of [-1, 1]) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI2;
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.0075, 0.00125, 5, 18, Math.PI * 1.15), ties);
      tie.position.set(Math.cos(a) * 0.0785, Math.sin(a) * 0.0785, sign * 0.1);
      tie.rotation.set(0, 0, a + Math.PI / 2);
      g.add(tie);
    }
  }

  // Three phase leads exiting toward the terminal box, with U/V/W ferrules.
  const leadDefs = [
    { angle: rad(56), color: 0x7e3f22, label: 'U', accent: '#d6a35b' },
    { angle: rad(90), color: 0x2e4a50, label: 'V', accent: '#b9c8c6' },
    { angle: rad(124), color: 0x54421f, label: 'W', accent: '#d6a35b' },
  ];
  function rad(d) {
    return (d * Math.PI) / 180;
  }
  const labels = new THREE.Group();
  for (const lead of leadDefs) {
    const startA = lead.angle;
    const start = [Math.cos(startA) * 0.086, Math.sin(startA) * 0.086, 0.096];
    const pts = [
      start,
      [Math.cos(startA) * 0.082, Math.sin(startA) * 0.082 + 0.012, 0.122],
      [0.035, 0.108, 0.145],
      [0.02, 0.13, 0.16],
    ];
    const cableMat = new THREE.MeshStandardMaterial({
      color: lead.color,
      roughness: 0.56,
      metalness: 0.05,
      envMapIntensity: 0.5,
    });
    const cable = curveTube(pts, 0.0036, cableMat, 40, 8, false);
    g.add(cable);

    const ferruleMat = new THREE.MeshStandardMaterial({
      color: 0xe0a34e,
      metalness: 0.7,
      roughness: 0.35,
    });
    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0052, 0.012, 16), ferruleMat);
    ferrule.rotation.x = Math.PI / 2;
    ferrule.position.set(0.02, 0.13, 0.16);
    g.add(ferrule);

    const tex = makeLeadLabelTexture(lead.label, lead.accent);
    const labelMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(labelMat);
    sprite.scale.setScalar(0.022);
    sprite.position.set(0.02, 0.145, 0.168);
    labels.add(sprite);
  }
  g.add(labels);

  return g;
}
