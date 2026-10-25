import * as THREE from 'three';
import { makeCanvasTexture, PI2, roundedBox, shadowed } from '../model/utils.js';

const steel = new THREE.MeshStandardMaterial({ color: 0x2a393c, metalness: 0.78, roughness: 0.42 });
const darkSteel = new THREE.MeshStandardMaterial({ color: 0x0b1518, metalness: 0.52, roughness: 0.58 });
const paint = new THREE.MeshStandardMaterial({ color: 0x183b42, metalness: 0.35, roughness: 0.55 });
const safety = new THREE.MeshStandardMaterial({ color: 0xb9893f, metalness: 0.22, roughness: 0.55 });
const concrete = new THREE.MeshStandardMaterial({ color: 0x10191b, metalness: 0.1, roughness: 0.88 });
const crateMat = new THREE.MeshStandardMaterial({ color: 0x384a45, metalness: 0.12, roughness: 0.82 });
const barrelMat = new THREE.MeshStandardMaterial({ color: 0x1d4c54, metalness: 0.4, roughness: 0.48 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x0a0e0f, metalness: 0.02, roughness: 0.9 });

function add(parent, geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, cast = false) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = cast;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

function wallTexture() {
  const tex = makeCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#0b1417';
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      ctx.fillStyle = x % 32 === 0 ? 'rgba(80,108,111,0.16)' : 'rgba(8,15,17,0.5)';
      ctx.fillRect(x, 0, 9, h);
      ctx.fillStyle = 'rgba(155,186,183,0.055)';
      ctx.fillRect(x + 10, 0, 1, h);
    }
    let seed = 807;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 180; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = 1 + rnd() * 20;
      ctx.fillStyle = `rgba(${80 + rnd() * 30},${90 + rnd() * 35},${88 + rnd() * 30},${0.008 + rnd() * 0.025})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, PI2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(100,130,132,0.14)';
    for (let y = 52; y < h; y += 112) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  return tex;
}

function letteringTexture(text, sub) {
  return makeCanvasTexture(1024, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(5,9,10,0.9)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(203,145,64,0.82)';
    ctx.lineWidth = 7;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#d7a65e';
    ctx.font = 'bold 76px Arial';
    ctx.fillText(text, 36, 112);
    ctx.fillStyle = 'rgba(185,204,198,0.7)';
    ctx.font = '28px Arial';
    ctx.fillText(sub, 38, 176);
    ctx.fillStyle = 'rgba(203,145,64,0.5)';
    ctx.fillRect(38, 200, 280, 6);
  });
}

function floorText(text, sub) {
  return makeCanvasTexture(1024, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(203,145,64,0.82)';
    ctx.font = 'bold 70px Arial';
    ctx.fillText(text, 20, 108);
    ctx.fillStyle = 'rgba(203,145,64,0.46)';
    ctx.font = '28px Arial';
    ctx.fillText(sub, 24, 168);
    ctx.fillRect(24, 198, 720, 6);
  });
}

function wallSign(text, sub) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 0.52),
    new THREE.MeshBasicMaterial({
      map: letteringTexture(text, sub),
      transparent: true,
      toneMapped: false,
      depthWrite: false,
    }),
  );
}

function cone(x, z, y = 0) {
  const g = new THREE.Group();
  const base = add(g, roundedBox(0.14, 0.018, 0.14, 0.004, 2), safety, 0, 0.009, 0);
  base.castShadow = false;
  add(g, new THREE.ConeGeometry(0.056, 0.18, 20), safety, 0, 0.1, 0, 0, 0, 0, false);
  add(g, new THREE.ConeGeometry(0.036, 0.05, 20), new THREE.MeshBasicMaterial({ color: 0xc9bda1 }), 0, 0.13, 0, 0, 0, 0, false);
  g.position.set(x, y, z);
  return g;
}

function pallet(x, z) {
  const g = new THREE.Group();
  add(g, roundedBox(0.58, 0.05, 0.44, 0.004, 2), crateMat, 0, 0.025, 0);
  for (const dx of [-0.2, 0, 0.2]) for (const dz of [-0.15, 0.15]) {
    add(g, new THREE.BoxGeometry(0.08, 0.045, 0.08), darkSteel, dx, 0.006, dz);
  }
  // Separate footprints on the pallet: no interpenetrating cartons.
  add(g, roundedBox(0.28, 0.3, 0.3, 0.007, 2), crateMat, -0.14, 0.2, 0);
  add(g, roundedBox(0.24, 0.22, 0.24, 0.006, 2), paint, 0.17, 0.16, -0.02);
  add(g, roundedBox(0.18, 0.12, 0.18, 0.005, 2), crateMat, -0.14, 0.41, 0.02);
  add(g, new THREE.BoxGeometry(0.02, 0.31, 0.02), safety, -0.14, 0.2, 0.155);
  g.position.set(x, 0, z);
  return g;
}

function cabinet(x, z) {
  const g = new THREE.Group();
  add(g, roundedBox(0.55, 1.2, 0.38, 0.008, 2), darkSteel, 0, 0.6, 0);
  add(g, roundedBox(0.48, 0.96, 0.008, 0.004, 2), paint, 0, 0.66, 0.195);
  add(g, new THREE.BoxGeometry(0.015, 0.23, 0.012), steel, 0.18, 0.67, 0.203);
  for (let i = 0; i < 3; i++) {
    add(g, new THREE.BoxGeometry(0.055, 0.012, 0.008), i === 0 ? new THREE.MeshBasicMaterial({ color: 0x7fe3a0 }) : safety, -0.14 + i * 0.12, 1.08, 0.2, 0, 0, 0, false);
  }
  add(g, new THREE.BoxGeometry(0.04, 0.7, 0.04), steel, -0.35, 0.4, 0.15);
  g.position.set(x, 0, z);
  return g;
}

function forklift(x, z, rotation = 0) {
  const g = new THREE.Group();
  add(g, roundedBox(0.55, 0.33, 0.36, 0.025, 2), safety, 0, 0.26, 0);
  add(g, roundedBox(0.25, 0.24, 0.32, 0.02, 2), paint, -0.17, 0.39, 0);
  add(g, new THREE.BoxGeometry(0.045, 1.0, 0.055), steel, 0.28, 0.52, 0);
  add(g, new THREE.BoxGeometry(0.04, 0.04, 0.38), steel, 0.32, 0.73, 0);
  add(g, new THREE.BoxGeometry(0.04, 0.04, 0.38), steel, 0.32, 0.1, 0);
  for (const dz of [-0.13, 0.13]) {
    add(g, new THREE.CylinderGeometry(0.07, 0.07, 0.045, 16), rubber, -0.17, 0.08, dz, Math.PI / 2, 0, 0);
    add(g, new THREE.CylinderGeometry(0.07, 0.07, 0.045, 16), rubber, 0.2, 0.08, dz, Math.PI / 2, 0, 0);
  }
  add(g, new THREE.BoxGeometry(0.34, 0.04, 0.055), darkSteel, 0.5, 0.18, 0);
  g.position.set(x, 0, z);
  g.rotation.y = rotation;
  return g;
}

function pipeRun(parent, y, z, length, colorMat) {
  add(parent, new THREE.CylinderGeometry(0.042, 0.042, length, 18), colorMat, 0, y, z, 0, 0, Math.PI / 2);
  for (let x = -length / 2 + 0.6; x < length / 2; x += 1.2) {
    add(parent, new THREE.CylinderGeometry(0.055, 0.055, 0.025, 18), steel, x, y, z, 0, 0, Math.PI / 2);
  }
}

export function createFactoryEnvironment() {
  const root = new THREE.Group();
  root.name = 'factory-environment';

  // Back wall and a low concrete plinth.
  const wall = add(root, new THREE.PlaneGeometry(12, 3.2), new THREE.MeshStandardMaterial({
    map: wallTexture(),
    color: 0x7d8e8f,
    roughness: 0.82,
    metalness: 0.25,
  }), 0, 1.6, -3.9);
  wall.receiveShadow = false;
  add(root, roundedBox(12, 0.16, 0.14, 0.01, 2), concrete, 0, 0.08, -3.82);

  // Roll-up door and signage.
  add(root, new THREE.BoxGeometry(1.42, 2.15, 0.035), darkSteel, 0.1, 1.08, -3.79);
  for (let i = 0; i < 12; i++) {
    add(root, new THREE.BoxGeometry(1.3, 0.005, 0.008), steel, 0.1, 0.1 + i * 0.165, -3.765);
  }
  add(root, new THREE.BoxGeometry(1.5, 0.045, 0.06), safety, 0.1, 2.18, -3.78);

  // Windows, wall pipes and cable tray.
  for (let i = 0; i < 3; i++) {
    add(root, new THREE.PlaneGeometry(0.9, 0.48), new THREE.MeshBasicMaterial({
      color: 0x1d4652,
      transparent: true,
      opacity: 0.3,
      toneMapped: false,
    }), -1.5 + i * 1.5, 2.35, -3.885);
  }
  pipeRun(root, 2.0, -3.75, 8.4, new THREE.MeshStandardMaterial({ color: 0x6e4b32, metalness: 0.5, roughness: 0.4 }));
  pipeRun(root, 2.15, -3.7, 8.4, steel);
  add(root, new THREE.BoxGeometry(8, 0.1, 0.26), darkSteel, 0, 2.62, -3.74);
  for (let x = -3.6; x <= 3.6; x += 1.2) {
    add(root, new THREE.BoxGeometry(0.04, 0.14, 0.3), steel, x, 2.54, -3.74);
  }

  // Structural columns and roof beam.
  for (const x of [-3.25, 3.25]) {
    add(root, new THREE.BoxGeometry(0.16, 3.0, 0.16), darkSteel, x, 1.5, -3.0);
    add(root, new THREE.BoxGeometry(0.42, 0.05, 0.36), concrete, x, 0.025, -3.0);
    for (const side of [-1, 1]) {
      add(root, new THREE.BoxGeometry(0.07, 2.9, 0.03), steel, x + side * 0.12, 1.5, -2.92);
    }
    add(root, new THREE.BoxGeometry(0.34, 2.6, 0.025), steel, x, 1.5, -2.9);
    add(root, new THREE.SphereGeometry(0.025, 12, 8), new THREE.MeshBasicMaterial({ color: 0xe0a04a }), x, 2.22, -2.83);
  }
  add(root, new THREE.BoxGeometry(6.9, 0.18, 0.22), darkSteel, 0, 2.86, -3.0);
  add(root, new THREE.BoxGeometry(5.8, 0.1, 0.14), steel, 0, 2.74, -3.0);

  // Overhead crane rail + trolley + hook.
  add(root, new THREE.BoxGeometry(6.4, 0.16, 0.2), safety, 0, 2.54, -2.1);
  const trolley = new THREE.Group();
  add(trolley, new THREE.BoxGeometry(0.3, 0.16, 0.22), darkSteel, 0, 0, 0);
  add(trolley, new THREE.CylinderGeometry(0.005, 0.005, 1.05, 8), steel, 0, -0.54, 0);
  add(trolley, new THREE.TorusGeometry(0.06, 0.009, 6, 20), safety, 0, -1.08, 0);
  trolley.position.set(0.55, 2.54, -2.1);
  root.add(trolley);

  // Ceiling light bars.
  for (const x of [-1.6, 0, 1.6]) {
    add(root, new THREE.BoxGeometry(0.65, 0.035, 0.12), new THREE.MeshBasicMaterial({ color: 0xf1e6cb, toneMapped: false }), x, 2.72, -1.35);
    add(root, new THREE.CylinderGeometry(0.006, 0.006, 0.32, 6), steel, x - 0.22, 2.87, -1.35);
    add(root, new THREE.CylinderGeometry(0.006, 0.006, 0.32, 6), steel, x + 0.22, 2.87, -1.35);
  }

  // Floor safety zone: rectangular dashed perimeter, corner brackets and bay stencil.
  const lineMat = new THREE.LineDashedMaterial({
    color: 0xc39149,
    transparent: true,
    opacity: 0.55,
    dashSize: 0.1,
    gapSize: 0.08,
    depthWrite: false,
  });
  const zx = 1.28;
  const zz = 0.94;
  const corners = [
    [-zx, -zz], [zx, -zz], [zx, zz], [-zx, zz], [-zx, -zz],
  ];
  const points = [];
  for (let i = 0; i < corners.length - 1; i++) {
    points.push(new THREE.Vector3(corners[i][0], 0.006, corners[i][1]));
    points.push(new THREE.Vector3(corners[i + 1][0], 0.006, corners[i + 1][1]));
  }
  const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.LineSegments(lineGeo, lineMat);
  line.computeLineDistances();
  root.add(line);
  for (const [x, z] of corners.slice(0, 4)) {
    const sx = x < 0 ? 1 : -1;
    const sz = z < 0 ? 1 : -1;
    add(root, new THREE.BoxGeometry(0.19, 0.008, 0.012), safety, x + sx * 0.085, 0.006, z);
    add(root, new THREE.BoxGeometry(0.012, 0.008, 0.19), safety, x, 0.006, z + sz * 0.085);
  }
  const floorSign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 0.14),
    new THREE.MeshBasicMaterial({ map: floorText('BAY 12', 'ASSEMBLY / SAFETY ZONE'), transparent: true, depthWrite: false, toneMapped: false }),
  );
  floorSign.rotation.x = -Math.PI / 2;
  floorSign.rotation.z = -0.08;
  floorSign.position.set(-0.62, 0.007, -0.68);
  root.add(floorSign);

  // Distant production equipment.
  root.add(cabinet(2.75, -2.35));
  root.add(pallet(-2.75, -2.25));
  root.add(forklift(3.35, -2.9, -0.28));
  for (const [x, z] of [[-1.9, -2.65], [-1.55, -2.85]]) {
    add(root, new THREE.CylinderGeometry(0.15, 0.15, 0.46, 20), barrelMat, x, 0.23, z);
    add(root, new THREE.TorusGeometry(0.153, 0.009, 6, 24), steel, x, 0.13, z, Math.PI / 2, 0, 0);
  }
  root.add(cone(-2.5, -1.55));
  root.add(cone(1.95, -1.7));
  root.add(cone(2.35, -1.55));

  // Drain channel and grates near the wall.
  add(root, new THREE.BoxGeometry(8.5, 0.012, 0.16), darkSteel, 0, 0.003, -2.38);
  for (let x = -4; x <= 4; x += 0.42) {
    add(root, new THREE.BoxGeometry(0.025, 0.006, 0.13), steel, x, 0.011, -2.38);
  }

  const beacon = add(root, new THREE.SphereGeometry(0.035, 14, 10), new THREE.MeshBasicMaterial({ color: 0xe0a04a, toneMapped: false }), 3.25, 2.27, -2.8);
  const beaconGlow = add(root, new THREE.SphereGeometry(0.08, 16, 12), new THREE.MeshBasicMaterial({
    color: 0xe0a04a,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }), 3.25, 2.27, -2.8);
  const hook = trolley;
  const hookMat = hook.children.find((c) => c.geometry?.type === 'TorusGeometry');
  root.userData = { trolley, beacon, beaconGlow, hookMat };

  return {
    root,
    update(dt, elapsed) {
      const sway = Math.sin(elapsed * 0.55) * 0.018;
      trolley.position.x = 0.55 + Math.sin(elapsed * 0.18) * 0.85;
      trolley.rotation.z = sway;
      const glow = 0.08 + (Math.sin(elapsed * 2.1) + 1) * 0.08;
      beaconGlow.material.opacity = glow;
      beaconGlow.scale.setScalar(1 + Math.sin(elapsed * 2.1) * 0.18);
      beacon.material.color.setHex(0xe0a04a);
    },
  };
}
