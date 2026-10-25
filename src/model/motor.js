import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createMaterialTemplates, createTextureSet, PartMaterials } from './materials.js';
import {
  buildEndshield,
  buildBearingCover,
  buildFanCover,
  buildLiftingEye,
  buildNameplate,
  buildStatorFrame,
} from './frame.js';
import { buildBearing, buildShaftSeal, buildTerminalBox, buildTerminalLid, buildWaveSpring } from './support.js';
import {
  buildExternalFan,
  buildRotorCage,
  buildRotorCore,
  buildRotorFan,
  buildShaft,
  buildShaftKey,
} from './rotor.js';
import { buildStatorCore, buildStatorWinding } from './stator.js';
import { clamp, smoothstep } from './utils.js';

const PART_SPECS = [
  {
    id: 'fan-cover',
    build: buildFanCover,
    home: [0, 0, -0.315],
    explode: [0, 0.035, -0.735],
    delay: 0.02,
    duration: 0.46,
    side: 'left',
  },
  {
    id: 'cooling-fan',
    build: buildExternalFan,
    home: [0, 0, -0.272],
    explode: [0, 0.02, -0.57],
    delay: 0.06,
    duration: 0.47,
    side: 'left',
    spin: true,
  },
  {
    id: 'rear-bearing-cover',
    build: (kit) => buildBearingCover(kit, { front: false }),
    home: [0, 0, -0.229],
    explode: [0, 0.015, -0.445],
    delay: 0.1,
    duration: 0.46,
    side: 'left',
  },
  {
    id: 'rear-bearing',
    build: buildBearing,
    home: [0, 0, -0.19],
    explode: [0, 0.005, -0.325],
    delay: 0.14,
    duration: 0.44,
    side: 'left',
  },
  {
    id: 'rear-endshield',
    build: (kit) => buildEndshield(kit, { front: false }),
    home: [0, 0, -0.19],
    explode: [0, 0.0, -0.205],
    delay: 0.17,
    duration: 0.44,
    side: 'left',
  },
  {
    id: 'rotor-fan',
    build: buildRotorFan,
    home: [0, 0, -0.145],
    explode: [0, -0.17, -0.185],
    delay: 0.2,
    duration: 0.46,
    side: 'bottom',
    spin: true,
  },
  {
    id: 'shaft-key',
    build: buildShaftKey,
    home: [0, 0.0226, 0.269],
    explode: [0, -0.245, 0.16],
    delay: 0.27,
    duration: 0.45,
    side: 'right',
  },
  {
    id: 'shaft',
    build: buildShaft,
    home: [0, 0, 0],
    explode: [0, -0.485, 0.02],
    delay: 0.34,
    duration: 0.5,
    side: 'bottom',
    spin: true,
  },
  {
    id: 'rotor-cage',
    build: buildRotorCage,
    home: [0, 0, 0],
    explode: [0, -0.315, 0.175],
    delay: 0.28,
    duration: 0.5,
    side: 'bottom',
    spin: true,
  },
  {
    id: 'rotor-core',
    build: buildRotorCore,
    home: [0, 0, 0],
    explode: [0, -0.305, -0.125],
    delay: 0.25,
    duration: 0.5,
    side: 'bottom',
    spin: true,
  },
  {
    id: 'stator-core',
    build: buildStatorCore,
    home: [0, 0, 0],
    explode: [0, 0.18, -0.06],
    delay: 0.3,
    duration: 0.52,
    side: 'top',
  },
  {
    id: 'stator-winding',
    build: buildStatorWinding,
    home: [0, 0, 0],
    explode: [0, 0.18, 0.285],
    delay: 0.26,
    duration: 0.54,
    side: 'top',
  },
  {
    id: 'stator-frame',
    build: buildStatorFrame,
    home: [0, 0, 0],
    explode: [0, 0.525, 0.02],
    delay: 0.38,
    duration: 0.5,
    side: 'top',
  },
  {
    id: 'terminal-box',
    build: buildTerminalBox,
    home: [0, 0.128, 0.035],
    explode: [0, 0.62, 0.02],
    delay: 0.08,
    duration: 0.44,
    side: 'top',
  },
  {
    id: 'terminal-lid',
    build: buildTerminalLid,
    home: [0, 0.198, 0.035],
    explode: [0, 0.71, 0.02],
    delay: 0.04,
    duration: 0.42,
    side: 'top',
  },
  {
    id: 'lifting-eye',
    build: buildLiftingEye,
    home: [0, 0.128, -0.088],
    explode: [0, 0.665, 0.02],
    delay: 0.12,
    duration: 0.44,
    side: 'top',
  },
  {
    id: 'nameplate',
    build: buildNameplate,
    home: [-0.132, 0.002, 0.035],
    explode: [-0.29, 0.31, 0.02],
    delay: 0.16,
    duration: 0.46,
    side: 'right',
  },
  {
    id: 'front-endshield',
    build: (kit) => buildEndshield(kit, { front: true }),
    home: [0, 0, 0.19],
    explode: [0, 0.0, 0.25],
    delay: 0.2,
    duration: 0.44,
    side: 'right',
  },
  {
    id: 'front-bearing',
    build: buildBearing,
    home: [0, 0, 0.19],
    explode: [0, 0.005, 0.37],
    delay: 0.24,
    duration: 0.44,
    side: 'right',
  },
  {
    id: 'front-bearing-cover',
    build: (kit) => buildBearingCover(kit, { front: true }),
    home: [0, 0, 0.229],
    explode: [0, 0.015, 0.495],
    delay: 0.15,
    duration: 0.46,
    side: 'right',
  },
  {
    id: 'shaft-seal',
    build: buildShaftSeal,
    home: [0, 0, 0.222],
    explode: [0, 0.12, 0.41],
    delay: 0.22,
    duration: 0.46,
    side: 'right',
  },
  {
    id: 'wave-spring',
    build: buildWaveSpring,
    home: [0, 0, -0.164],
    explode: [0, -0.165, -0.4],
    delay: 0.19,
    duration: 0.44,
    side: 'left',
  },
];

function mergePartMeshes(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  group.traverse((child) => {
    if (!child.isMesh || child.isInstancedMesh || child.isSprite) return;
    if (!child.geometry || Array.isArray(child.material)) return;
    const attrs = Object.keys(child.geometry.attributes).sort().join(',');
    const key = `${child.material.uuid}:${attrs}:${child.geometry.index ? 'i' : 'n'}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(child);
  });

  for (const meshes of buckets.values()) {
    if (meshes.length < 2) continue;
    const geometries = [];
    for (const mesh of meshes) {
      const geo = mesh.geometry.clone();
      geo.applyMatrix4(mesh.matrixWorld);
      if (!geo.attributes.uv) {
        const count = geo.attributes.position.count;
        geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
      }
      geometries.push(geo);
    }
    let merged = null;
    try {
      merged = mergeGeometries(geometries, false);
    } catch (error) {
      merged = null;
    }
    if (!merged) {
      geometries.forEach((geo) => geo.dispose());
      continue;
    }
    const mesh = new THREE.Mesh(merged, meshes[0].material);
    mesh.castShadow = meshes.some((m) => m.castShadow);
    mesh.receiveShadow = meshes.some((m) => m.receiveShadow);
    mesh.renderOrder = meshes[0].renderOrder;
    for (const old of meshes) {
      old.parent?.remove(old);
    }
    geometries.forEach((geo) => geo.dispose());
    group.add(mesh);
  }
}

export class Motor {
  constructor(renderer, content) {
    this.content = content;
    this.byId = new Map((content?.COMPONENTS ?? []).map((c) => [c.id, c]));
    this.textures = createTextureSet(renderer);
    this.templates = createMaterialTemplates(this.textures);
    this.root = new THREE.Group();
    this.root.name = 'motor-assembly';
    this.root.rotation.y = Math.PI / 2;
    this.root.position.y = 0.132;
    this.parts = new Map();
    this.spinAngle = 0;
    this.currentExplode = -1;
    this.currentSpin = -1;
    this.specs = PART_SPECS;
    this.build();
  }

  build() {
    for (const spec of PART_SPECS) {
      const kit = new PartMaterials(this.templates);
      const group = spec.build(kit);
      mergePartMeshes(group);
      group.position.fromArray(spec.home);
      group.userData.partId = spec.id;
      group.userData.home = new THREE.Vector3(...spec.home);
      group.userData.explode = new THREE.Vector3(...spec.explode);
      group.userData.side = spec.side;
      group.userData.baseRot = new THREE.Euler(0, 0, 0);
      group.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.userData.partId = spec.id;
        }
      });
      this.root.add(group);
      const record = {
        ...spec,
        group,
        kit,
        home: new THREE.Vector3(...spec.home),
        explode: new THREE.Vector3(...spec.explode),
        data: this.byId.get(spec.id),
        highlighted: false,
        ghosted: false,
      };
      this.parts.set(spec.id, record);
    }
    this.root.updateMatrixWorld(true);
    this.updateBounding();
  }

  updateBounding() {
    const box = new THREE.Box3().setFromObject(this.root);
    this.bounds = box;
    this.center = box.getCenter(new THREE.Vector3());
    this.size = box.getSize(new THREE.Vector3());
  }

  setExplode(value) {
    const t = clamp(value);
    if (Math.abs(t - this.currentExplode) < 0.0001) return;
    this.currentExplode = t;
    // Float the exploded diagram above the stage so no component intersects the floor.
    this.root.position.y = 0.132 + smoothstep(0.02, 0.55, t) * 0.42;

    for (const part of this.parts.values()) {
      const local = clamp((t - part.delay) / part.duration);
      const eased = smoothstep(0, 1, local);
      part.group.position
        .copy(part.home)
        .addScaledVector(part.explode, eased);

      // Rotor-key orbit while the machine runs; key position is off-axis.
      if (part.id === 'shaft-key' && t < 0.01) {
        const sx = Math.sin(this.spinAngle);
        const cx = Math.cos(this.spinAngle);
        const x = part.group.position.x * cx - part.group.position.y * sx;
        const y = part.group.position.x * sx + part.group.position.y * cx;
        part.group.position.x = x;
        part.group.position.y = y;
      }

      if (part.spin) {
        part.group.rotation.z = t < 0.01 ? this.spinAngle : 0;
      }
    }
    this.root.updateMatrixWorld(true);
    this.updateBounding();
  }

  setSpin(angle) {
    this.spinAngle = angle;
    if (this.currentExplode < 0.01) {
      for (const part of this.parts.values()) {
        if (part.spin) part.group.rotation.z = angle;
        if (part.id === 'shaft-key') {
          const sx = Math.sin(angle);
          const cx = Math.cos(angle);
          part.group.position.x = -part.home.y * sx;
          part.group.position.y = part.home.y * cx;
        }
      }
      this.root.updateMatrixWorld(true);
    }
  }

  highlight(id = null) {
    for (const part of this.parts.values()) {
      const on = part.id === id;
      if (part.highlighted !== on) {
        part.kit.setHighlight(on, 0xffa24c, part.id === 'stator-winding' ? 0.22 : 0.3);
        part.highlighted = on;
      }
    }
    this.selected = id;
  }

  setGhost(id = null) {
    for (const part of this.parts.values()) {
      const on = part.id === id;
      if (part.ghosted !== on) {
        part.kit.setGhost(on, 0.15);
        part.ghosted = on;
      }
    }
  }

  getPart(id) {
    return this.parts.get(id) || null;
  }

  getWorldCenter(id) {
    const part = this.parts.get(id);
    if (!part) return new THREE.Vector3();
    const box = new THREE.Box3().setFromObject(part.group);
    return box.getCenter(new THREE.Vector3());
  }

  getWorldBox(id, expand = 0) {
    const part = this.parts.get(id);
    if (!part) return null;
    const box = new THREE.Box3().setFromObject(part.group);
    if (expand) box.expandByScalar(expand);
    return box;
  }

  getLabelAnchors() {
    const anchors = [];
    for (const part of this.parts.values()) {
      const center = this.getWorldCenter(part.id);
      anchors.push({
        id: part.id,
        side: part.side,
        position: center,
        data: part.data,
      });
    }
    return anchors;
  }

  getPickTargets() {
    return [...this.parts.values()].map((p) => p.group);
  }
}
