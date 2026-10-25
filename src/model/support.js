import * as THREE from 'three';
import {
  PI2,
  addBolts,
  boltGeometry,
  box,
  curveTube,
  decalPlane,
  makeWarningTexture,
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

export function buildBearing(kit) {
  const g = makeGroup('bearing');
  const steel = kit.get('steel');
  const darkSteel = kit.get('steelDark');
  const brass = kit.get('brass');

  const width = 0.023;

  const outer = ringExtrudeZ({ outer: 0.045, inner: 0.0402, depth: width, bevel: 0.0007, segments: 80 }, steel);
  shadowed(outer);
  g.add(outer);
  const outerGroove = torusZ(0.0426, 0.0008, darkSteel, 5, 80);
  outerGroove.position.z = width / 2 + 0.0002;
  g.add(outerGroove);

  const inner = ringExtrudeZ({ outer: 0.0249, inner: 0.0201, depth: width, bevel: 0.0007, segments: 64 }, steel);
  shadowed(inner);
  g.add(inner);

  // 9 ground balls on a 65 mm pitch circle (6308 proportions)
  const pitchRadius = 0.0326;
  const ballRadius = 0.00755;
  const ballGeo = new THREE.SphereGeometry(ballRadius, 24, 16);
  const balls = new THREE.InstancedMesh(ballGeo, steel, 9);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * PI2;
    dummy.position.set(Math.cos(a) * pitchRadius, Math.sin(a) * pitchRadius, 0);
    dummy.updateMatrix();
    balls.setMatrixAt(i, dummy.matrix);
  }
  balls.instanceMatrix.needsUpdate = true;
  balls.castShadow = true;
  g.add(balls);

  // Crown cage: two brass rails with pocket bars
  for (const sign of [-1, 1]) {
    const rail = torusZ(pitchRadius, 0.00115, brass, 6, 64);
    rail.position.z = sign * 0.0067;
    g.add(rail);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * PI2 + sign * 0.045;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.0017, 0.0058, 0.0022), brass);
      const rr = pitchRadius + ballRadius * 0.88;
      bar.position.set(Math.cos(a) * rr, Math.sin(a) * rr, sign * 0.0045);
      bar.rotation.z = a + Math.PI / 2;
      g.add(bar);
    }
  }

  // Snap ring relief visible on both faces
  for (const sign of [-1, 1]) {
    const chamfer = new THREE.Mesh(new THREE.TorusGeometry(0.0431, 0.00065, 4, 72), darkSteel);
    chamfer.position.z = sign * (width / 2 - 0.0004);
    g.add(chamfer);
  }

  return g;
}

export function buildShaftSeal(kit) {
  const g = makeGroup('shaft-seal');
  const steel = kit.get('steel');
  const rubber = kit.get('rubber');

  const caseRing = ringExtrudeZ({ outer: 0.0275, inner: 0.0218, depth: 0.008, bevel: 0.0005, segments: 64 }, steel);
  g.add(shadowed(caseRing));
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.0204, 0.0021, 8, 48), rubber);
  lip.position.z = 0.0018;
  g.add(lip);
  const dustLip = new THREE.Mesh(new THREE.ConeGeometry(0.0262, 0.006, 48, 1, true), rubber);
  dustLip.rotation.x = -Math.PI / 2;
  dustLip.position.z = -0.0028;
  g.add(dustLip);
  const garter = torusZ(0.0201, 0.00075, steel, 5, 48);
  garter.position.z = 0.0035;
  g.add(garter);
  return g;
}

export function buildWaveSpring(kit) {
  const g = makeGroup('wave-spring');
  const steel = kit.get('steel');
  const points = [];
  const segments = 160;
  const radius = 0.0405;
  const waves = 3;
  const amplitude = 0.0019;
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * PI2;
    const z = Math.sin(a * waves) * amplitude;
    points.push([Math.cos(a) * radius, Math.sin(a) * radius, z]);
  }
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), true, 'centripetal');
  const geo = new THREE.TubeGeometry(curve, 220, 0.00115, 5, true);
  const spring = new THREE.Mesh(geo, steel);
  spring.castShadow = true;
  g.add(spring);
  return g;
}

export function buildTerminalBox(kit) {
  const g = makeGroup('terminal-box');
  const paint = kit.get('paintDark');
  const interior = kit.get('terminal');
  const ceramic = kit.get('ceramic');
  const brass = kit.get('brass');
  const steel = kit.get('steelDark');
  const rubber = kit.get('rubber');
  const zinc = kit.get('zinc');

  // Frame mounting feet
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const foot = new THREE.Mesh(roundedBox(0.018, 0.008, 0.018, 0.003, 2), paint);
      foot.position.set(sx * 0.059, 0.002, sz * 0.061);
      g.add(foot);
    }
  }

  const floor = new THREE.Mesh(roundedBox(0.145, 0.012, 0.16, 0.006, 3), paint);
  floor.position.y = 0.008;
  g.add(shadowed(floor));

  // Four cast walls around a dark interior
  const walls = [
    [0, 0.04, 0.077, 0.146, 0.058, 0.012],
    [0, 0.04, -0.077, 0.146, 0.058, 0.012],
    [0.0675, 0.04, 0, 0.012, 0.058, 0.145],
    [-0.0675, 0.04, 0, 0.012, 0.058, 0.145],
  ];
  for (const [x, y, z, w, h, d] of walls) {
    const wall = new THREE.Mesh(roundedBox(w, h, d, 0.004, 2), paint);
    wall.position.set(x, y, z);
    g.add(shadowed(wall));
  }

  const cavity = new THREE.Mesh(roundedBox(0.122, 0.004, 0.138, 0.002, 1), interior);
  cavity.position.y = 0.017;
  g.add(cavity);

  // Top rim / gasket land
  for (const [x, z, w, d] of [
    [0, 0.0745, 0.152, 0.009],
    [0, -0.0745, 0.152, 0.009],
    [0.0715, 0, 0.009, 0.14],
    [-0.0715, 0, 0.009, 0.14],
  ]) {
    const lip = new THREE.Mesh(roundedBox(w, 0.008, d, 0.003, 1), paint);
    lip.position.set(x, 0.068, z);
    g.add(lip);
  }
  const gasket = new THREE.Mesh(roundedBox(0.142, 0.0045, 0.153, 0.003, 1), rubber);
  gasket.position.y = 0.0718;
  g.add(gasket);

  // Terminal board with six M8 studs and Y/Delta links
  const board = new THREE.Mesh(roundedBox(0.112, 0.009, 0.122, 0.004, 2), ceramic);
  board.position.y = 0.025;
  g.add(board);

  const studPositions = [];
  for (const x of [-0.033, 0, 0.033]) {
    for (const z of [-0.036, 0.036]) {
      studPositions.push([x, z]);
      const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.0056, 0.0056, 0.018, 14), brass);
      stud.position.set(x, 0.04, z);
      g.add(stud);
      const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.0084, 0.0084, 0.005, 6), brass);
      nut.position.set(x, 0.047, z);
      g.add(nut);
      const washer = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.0012, 20), steel);
      washer.position.set(x, 0.0435, z);
      g.add(washer);
    }
  }
  for (const z of [-0.036, 0.036]) {
    for (const x of [-0.033, 0, 0.033]) {
      const link = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.0028, 0.008), brass);
      link.position.set(0, 0.043, z);
      if (z > 0) link.rotation.set(0, 0, 0);
      g.add(link);
    }
  }

  // Phase labels etched onto the board
  const labelTex = (() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = '#212a2c';
    ctx.font = '700 52px Arial, sans-serif';
    ctx.fillText('W2', 30, 78);
    ctx.fillText('U2', 198, 78);
    ctx.fillText('V2', 366, 78);
    ctx.fillStyle = '#6b7778';
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText('Y / Δ  380 V', 30, 112);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
  const labels = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.025), labelMat);
  labels.rotation.x = -Math.PI / 2;
  labels.position.set(0, 0.0495, 0.052);
  g.add(labels);

  // Cable gland on the rear wall, with a service cable curling out
  const glandBody = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.026, 6), brass);
  glandBody.rotation.x = Math.PI / 2;
  glandBody.position.set(0, 0.038, -0.094);
  g.add(glandBody);
  const glandNut = new THREE.Mesh(new THREE.CylinderGeometry(0.0165, 0.0165, 0.009, 6), brass);
  glandNut.rotation.x = Math.PI / 2;
  glandNut.position.set(0, 0.038, -0.088);
  g.add(glandNut);
  const cable = curveTube(
    [
      [0, 0.038, -0.106],
      [0.015, 0.02, -0.125],
      [0.035, -0.015, -0.13],
      [0.03, -0.05, -0.12],
    ],
    0.0085,
    rubber,
    32,
    10,
    false,
  );
  g.add(cable);

  // Ground stud inside the box
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.023, 12), brass);
  ground.position.set(-0.05, 0.03, -0.055);
  g.add(ground);

  // Lid mounting studs
  addBolts(
    g,
    [
      [-0.06, 0.075, 0.064],
      [0.06, 0.075, 0.064],
      [-0.06, 0.075, -0.064],
      [0.06, 0.075, -0.064],
    ].map((position) => ({ position, scale: 0.8 })),
    zinc,
    { radius: 0.0044, headHeight: 0.0032, washerRadius: 0.0064, shank: 0.013 },
  );

  return g;
}

export function buildTerminalLid(kit) {
  const g = makeGroup('terminal-lid');
  const paint = kit.get('paintDark');
  const rubber = kit.get('rubber');
  const zinc = kit.get('zinc');

  const lid = new THREE.Mesh(roundedBox(0.162, 0.013, 0.178, 0.007, 3), paint);
  shadowed(lid);
  g.add(lid);

  const gasket = new THREE.Mesh(roundedBox(0.146, 0.004, 0.157, 0.004, 1), rubber);
  gasket.position.y = -0.0085;
  g.add(gasket);

  // stamped stiffening ribs
  for (const x of [-0.045, 0.045]) {
    const rib = new THREE.Mesh(roundedBox(0.012, 0.0035, 0.14, 0.002, 1), paint);
    rib.position.set(x, 0.0075, 0);
    g.add(rib);
  }
  for (const z of [-0.055, 0.055]) {
    const rib = new THREE.Mesh(roundedBox(0.13, 0.0035, 0.012, 0.002, 1), paint);
    rib.position.set(0, 0.0075, z);
    g.add(rib);
  }

  const warning = decalPlane(0.104, 0.05, makeWarningTexture(), { roughness: 0.5, metalness: 0.05 });
  warning.rotation.x = -Math.PI / 2;
  warning.position.y = 0.0105;
  g.add(warning);

  addBolts(
    g,
    [
      [-0.069, 0.009, 0.075],
      [0.069, 0.009, 0.075],
      [-0.069, 0.009, -0.075],
      [0.069, 0.009, -0.075],
    ].map((position) => ({ position, scale: 0.9 })),
    zinc,
    { radius: 0.0048, headHeight: 0.0038, washerRadius: 0.0068, shank: 0.016 },
  );

  return g;
}
