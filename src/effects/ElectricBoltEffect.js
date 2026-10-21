import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

const START = new THREE.Vector3(-2.0, -2.5, 0.15);
const END = new THREE.Vector3(2.0, 2.5, 0.15);

export class ElectricBoltEffect extends BaseEffect {
  static id = 'electric-bolt';
  static label = '⚡ Electric Bolt';
  static category = 'particle';

  static getParameterSchema() {
    return [
      { name: 'boltWidth', label: 'Lightning Line Width', min: 0.01, max: 0.3, step: 0.01, default: 0.05 },
      { name: 'splits', label: 'Lightning Splits / Branches', min: 1, max: 100, step: 1, default: 15 },
      { name: 'boltColor', label: 'Bolt Core Color', type: 'color', default: '#e0ffff' },
      { name: 'haloColor', label: 'Halo Glow Color', type: 'color', default: '#7c4dff' },
      { name: 'randomness', label: 'Jitter / Randomness', min: 0.05, max: 0.8, step: 0.05, default: 0.3 },
      { name: 'flickerRate', label: 'Re-strike Rate (Hz)', min: 2, max: 60, step: 1, default: 20 }
    ];
  }

  constructor(stage) {
    super(stage);
    const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide };
    this.coreMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ ...additive, opacity: 0.95 }));
    this.haloMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ ...additive, opacity: 0.35 }));
    this.group.add(this.haloMesh, this.coreMesh);
    this.acc = 0;
  }

  // Midpoint displacement: repeatedly split each segment and push the midpoint sideways.
  jaggedLine(start, end, jitter, levels) {
    let pts = [start, end];
    for (let l = 0; l < levels; l++) {
      const next = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1e-6;
        const off = (Math.random() - 0.5) * jitter * len;
        next.push(a, new THREE.Vector3(
          (a.x + b.x) / 2 - (dy / len) * off,
          (a.y + b.y) / 2 + (dx / len) * off,
          (a.z + b.z) / 2 + (Math.random() - 0.5) * jitter * len * 0.3
        ));
      }
      next.push(pts[pts.length - 1]);
      pts = next;
    }
    return pts;
  }

  // Appends a flat ribbon (two triangles per segment) along the polyline.
  addRibbon(out, pts, halfWidth) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1e-6;
      const px = (-(b.y - a.y) / len) * halfWidth;
      const py = ((b.x - a.x) / len) * halfWidth;
      out.push(
        a.x - px, a.y - py, a.z, a.x + px, a.y + py, a.z, b.x + px, b.y + py, b.z,
        a.x - px, a.y - py, a.z, b.x + px, b.y + py, b.z, b.x - px, b.y - py, b.z
      );
    }
  }

  strike() {
    const { boltWidth, splits, randomness } = this.params;
    const main = this.jaggedLine(START, END, randomness, 6);
    const lines = [{ pts: main, w: 1 }];

    const branches = Math.round(splits * 0.4);
    const mainDir = Math.atan2(END.y - START.y, END.x - START.x);
    for (let b = 0; b < branches; b++) {
      const from = main[Math.floor(Math.random() * (main.length - 1))];
      const ang = mainDir + (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.7);
      const len = 0.6 + Math.random() * 1.0;
      const to = new THREE.Vector3(from.x + Math.cos(ang) * len, from.y + Math.sin(ang) * len, from.z);
      lines.push({ pts: this.jaggedLine(from, to, randomness, 3), w: 0.5 });
    }

    const core = [], halo = [];
    lines.forEach(({ pts, w }) => {
      this.addRibbon(core, pts, boltWidth * w);
      this.addRibbon(halo, pts, boltWidth * w * 3.5);
    });
    this.setGeometry(this.coreMesh, core);
    this.setGeometry(this.haloMesh, halo);
    this.group.visible = true;
  }

  setGeometry(mesh, verts) {
    mesh.geometry.dispose();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
    mesh.geometry = geo;
  }

  onParamsUpdated() {
    this.coreMesh.material.color.set(this.params.boltColor);
    this.haloMesh.material.color.set(this.params.haloColor);
    this.strike();
  }

  update(time, delta) {
    this.acc += delta;
    if (this.acc >= 1 / this.params.flickerRate) {
      this.acc = 0;
      this.strike();
      this.coreMesh.material.opacity = 0.6 + Math.random() * 0.4;
    }
  }
}
