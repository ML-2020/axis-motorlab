import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  PI2,
  addBolts,
  box,
  circleDisc,
  cylinderZ,
  latheZ,
  plateExtrudeZ,
  rad,
  ringExtrudeZ,
  roundedBox,
  shadowed,
  torusZ,
} from './utils.js';

const makeGroup = (name) => {
  const g = new THREE.Group();
  g.name = name;
  return g;
};

function makeRadialBlade({
  rootR,
  tipR,
  maxWidth,
  sweep,
  curve,
  thickness,
  material,
  segments = 18,
  pitch = 0.24,
}) {
  const shape = new THREE.Shape();
  const leading = [];
  const trailing = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const r = rootR + (tipR - rootR) * t;
    const theta = sweep * t + curve * Math.sin(t * Math.PI);
    const width = maxWidth * (0.55 + 0.45 * Math.sin(Math.PI * Math.pow(t, 0.7)));
    leading.push(new THREE.Vector2(Math.cos(theta) * r, Math.sin(theta) * r));
    const theta2 = theta - width / Math.max(r, 0.02);
    trailing.push(new THREE.Vector2(Math.cos(theta2) * r, Math.sin(theta2) * r));
  }
  const pts = [...leading, ...trailing.reverse()];
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: Math.min(0.0012, thickness * 0.4),
    bevelSize: Math.min(0.0011, thickness * 0.35),
    bevelSegments: 1,
  });
  geo.translate(0, 0, -thickness / 2);
  geo.rotateX(pitch);
  const mesh = new THREE.Mesh(geo, material);
  return mesh;
}

export function buildFanBladeSet(opts, count) {
  const g = new THREE.Group();
  const phaseOffset = opts.phase ?? 0;
  for (let i = 0; i < count; i++) {
    const blade = makeRadialBlade(opts);
    blade.rotation.z = phaseOffset + (i / count) * PI2;
    blade.castShadow = true;
    blade.receiveShadow = true;
    g.add(blade);
  }
  return g;
}

export function buildShaft(kit) {
  const g = makeGroup('shaft');
  const steel = kit.get('steel');
  const dark = kit.get('blackOxide');

  // Full turned profile from rear fan extension to the front shaft end.
  // z (mm in model units), radius. Real YE3-132 frame shaft is 38 x 80 mm.
  const profile = [
    [0.0, -0.287],
    [0.01, -0.287],
    [0.011, -0.282],
    [0.014, -0.266],
    [0.014, -0.246],
    [0.0185, -0.226],
    [0.0185, -0.174],
    [0.022, -0.166],
    [0.0255, -0.152],
    [0.0255, 0.108],
    [0.022, 0.12],
    [0.022, 0.155],
    [0.0185, 0.168],
    [0.0185, 0.207],
    [0.022, 0.212],
    [0.022, 0.226],
    [0.0192, 0.233],
    [0.0192, 0.307],
    [0.0182, 0.311],
    [0.0, 0.311],
  ];
  const shaft = latheZ(profile, steel, 96);
  shadowed(shaft);
  g.add(shaft);

  // Machined relief rings / shoulders
  for (const [radius, z] of [
    [0.0187, -0.226],
    [0.0187, -0.174],
    [0.026, -0.152],
    [0.026, 0.108],
    [0.0187, 0.168],
    [0.0187, 0.207],
    [0.0222, 0.212],
    [0.0194, 0.233],
  ]) {
    const ring = torusZ(radius, 0.00075, dark, 4, 64);
    ring.position.z = z;
    if (z < -0.15) ring.rotation.y = Math.PI;
    g.add(ring);
  }

  // Front keyway: a dark machined recess with a straight key floating above it.
  const keyway = new THREE.Mesh(roundedBox(0.0105, 0.0018, 0.054, 0.0007, 2), dark);
  keyway.position.set(0, 0.0186, 0.269);
  g.add(keyway);

  // Centre holes on both shaft ends and a front chamfer
  const frontHole = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.002, 18), dark);
  frontHole.rotation.x = Math.PI / 2;
  frontHole.position.z = 0.3106;
  g.add(frontHole);
  const rearHole = frontHole.clone();
  rearHole.position.z = -0.2866;
  g.add(rearHole);

  const frontChamfer = new THREE.Mesh(new THREE.TorusGeometry(0.0182, 0.0012, 6, 64), kit.get('steelDark'));
  frontChamfer.position.z = 0.3095;
  g.add(frontChamfer);

  return g;
}

export function buildShaftKey(kit) {
  const g = makeGroup('shaft-key');
  const key = new THREE.Mesh(roundedBox(0.01, 0.0075, 0.05, 0.0018, 3), kit.get('steelBrushed'));
  shadowed(key);
  g.add(key);
  return g;
}

export function buildRotorCore(kit) {
  const g = makeGroup('rotor-core');
  const lamMat = kit.get('laminate');
  const darkMat = kit.get('steelDark');

  const count = 46;
  const lamination = ringExtrudeZ({ outer: 0.056, inner: 0.0261, depth: 0.00225, bevel: 0, segments: 64 }, lamMat);
  const inst = new THREE.InstancedMesh(lamination.geometry, lamMat, count);
  const dummy = new THREE.Object3D();
  const spacing = 0.00302;
  for (let i = 0; i < count; i++) {
    dummy.position.set(0, 0, (i - (count - 1) / 2) * spacing);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.castShadow = true;
  inst.receiveShadow = true;
  g.add(inst);

  // End plates
  for (const sign of [-1, 1]) {
    const endPlate = ringExtrudeZ({ outer: 0.0566, inner: 0.026, depth: 0.0045, bevel: 0.0008, segments: 64 }, darkMat);
    endPlate.position.z = sign * ((count * spacing) / 2 + 0.001);
    shadowed(endPlate);
    g.add(endPlate);
  }

  // Skewed rotor slot indentations visible when the cage is removed.
  const slotGeos = [];
  const slots = 28;
  const coreLength = count * spacing;
  const skew = 0.36;
  const segments = 16;
  for (let s = 0; s < slots; s++) {
    const base = (s / slots) * PI2;
    for (let i = 0; i < segments; i++) {
      const z = -coreLength / 2 + ((i + 0.5) / segments) * coreLength;
      const a = base + skew * (z / coreLength);
      const geo = new THREE.BoxGeometry(0.0064, 0.0024, (coreLength / segments) * 1.04);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -a);
      m.compose(
        new THREE.Vector3(Math.sin(a) * 0.055, Math.cos(a) * 0.055, z),
        q,
        new THREE.Vector3(1, 1, 1),
      );
      slotGeos.push(geo.applyMatrix4(m));
    }
  }
  const slotsMesh = new THREE.Mesh(mergeGeometries(slotGeos, false), darkMat);
  g.add(slotsMesh);

  // Shaft bore rim and lamination keyway
  const boreRim = new THREE.Mesh(new THREE.TorusGeometry(0.0263, 0.0011, 6, 56), darkMat);
  boreRim.position.z = 0.072;
  g.add(boreRim);
  const key = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.003, coreLength + 0.004), darkMat);
  key.position.set(0, 0.055, 0);
  g.add(key);

  return g;
}

export function buildRotorCage(kit) {
  const g = makeGroup('rotor-cage');
  const alu = kit.get('aluminum');
  const dark = kit.get('steelDark');

  const barGeos = [];
  const slots = 28;
  const segments = 18;
  const coreLength = 0.17;
  const skew = 0.36;
  for (let s = 0; s < slots; s++) {
    const base = (s / slots) * PI2;
    for (let i = 0; i < segments; i++) {
      const z = -coreLength / 2 + ((i + 0.5) / segments) * coreLength;
      const a = base + skew * (z / coreLength);
      const geo = new THREE.BoxGeometry(0.0072, 0.0075, (coreLength / segments) * 1.05);
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -a);
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(Math.sin(a) * 0.052, Math.cos(a) * 0.052, z),
        q,
        new THREE.Vector3(1, 1, 1),
      );
      barGeos.push(geo.applyMatrix4(m));
    }
  }
  const bars = new THREE.Mesh(mergeGeometries(barGeos, false), alu);
  barGeos.forEach((geo) => geo.dispose());
  shadowed(bars);
  g.add(bars);

  // Cast short-circuit end rings with cooling lugs
  for (const sign of [-1, 1]) {
    const ring = ringExtrudeZ({ outer: 0.0635, inner: 0.035, depth: 0.019, bevel: 0.0025, segments: 64 }, alu);
    ring.position.z = sign * 0.086;
    shadowed(ring);
    g.add(ring);

    const lip = torusZ(0.0608, 0.0018, alu, 8, 64);
    lip.position.z = sign * 0.096;
    g.add(lip);

    // balance lugs / casting bosses
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI2 + 0.3;
      const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.0075, 0.01, 12), alu);
      boss.rotation.x = Math.PI / 2;
      boss.position.set(Math.cos(a) * 0.0575, Math.sin(a) * 0.0575, sign * 0.099);
      g.add(boss);
      const balance = new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0032, 0.005, 12), dark);
      balance.rotation.x = Math.PI / 2;
      balance.position.set(Math.cos(a) * 0.0575, Math.sin(a) * 0.0575, sign * 0.1045);
      g.add(balance);
    }
  }

  return g;
}

export function buildRotorFan(kit) {
  const g = makeGroup('rotor-fan');
  const plastic = kit.get('plasticAmber');
  const steel = kit.get('steelDark');

  const hub = latheZ(
    [
      [0.0128, -0.021],
      [0.031, -0.021],
      [0.033, -0.017],
      [0.033, 0.016],
      [0.028, 0.021],
      [0.0128, 0.021],
      [0.0128, -0.021],
    ],
    plastic,
    48,
  );
  g.add(shadowed(hub));

  const blades = buildFanBladeSet(
    {
      rootR: 0.028,
      tipR: 0.085,
      maxWidth: 0.019,
      sweep: 0.86,
      curve: 0.3,
      thickness: 0.0032,
      material: plastic,
      pitch: 0.34,
      phase: 0.1,
    },
    9,
  );
  g.add(blades);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.033, 0.0018, 6, 48), steel);
  ring.position.z = -0.021;
  g.add(ring);
  return g;
}

export function buildExternalFan(kit) {
  const g = makeGroup('cooling-fan');
  const plastic = kit.get('plasticFan');
  const steel = kit.get('steel');
  const zinc = kit.get('zinc');

  const hub = latheZ(
    [
      [0.014, -0.016],
      [0.036, -0.016],
      [0.041, -0.011],
      [0.041, 0.012],
      [0.034, 0.016],
      [0.014, 0.016],
      [0.014, -0.016],
    ],
    plastic,
    56,
  );
  g.add(shadowed(hub));

  const blades = buildFanBladeSet(
    {
      rootR: 0.032,
      tipR: 0.111,
      maxWidth: 0.028,
      sweep: 0.72,
      curve: 0.34,
      thickness: 0.0038,
      material: plastic,
      pitch: 0.32,
      phase: 0.03,
    },
    11,
  );
  g.add(blades);

  const faceRing = torusZ(0.041, 0.0022, plastic, 8, 56);
  faceRing.position.z = 0.016;
  g.add(faceRing);

  const insert = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.008, 32), steel);
  insert.rotation.x = Math.PI / 2;
  insert.position.z = 0.019;
  g.add(insert);

  addBolts(
    g,
    [{ position: [0, 0, 0.024], rotationY: Math.PI, scale: 1.15 }],
    zinc,
    { radius: 0.0062, headHeight: 0.0045, washerRadius: 0.0092, shank: 0.018 },
  );

  return g;
}
