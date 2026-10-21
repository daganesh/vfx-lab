import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';
import { appendBolt, BoltMesh } from '../core/lightning.js';

// Lightning that arcs across the card face and makes the card itself flash.
export class ElectricCardEffect extends BaseEffect {
  static id = 'electric-card';
  static label = '⚡ Electric Card (Surface Bolts)';
  static category = 'card';
  static attach = 'card';

  static getParameterSchema() {
    return [
      { name: 'boltCount', label: 'Bolts per Strike', min: 1, max: 8, step: 1, default: 3 },
      { name: 'boltWidth', label: 'Bolt Width', min: 0.01, max: 0.1, step: 0.005, default: 0.03 },
      { name: 'jitter', label: 'Jaggedness', min: 0.05, max: 0.8, step: 0.05, default: 0.35 },
      { name: 'flickerRate', label: 'Strike Rate (Hz)', min: 2, max: 40, step: 1, default: 12 },
      { name: 'activity', label: 'Activity (chance per strike)', min: 0.1, max: 1, step: 0.05, default: 0.75 },
      { name: 'cardGlow', label: 'Card Flash Glow', min: 0, max: 1.5, step: 0.05, default: 0.7 },
      { name: 'boltColor', label: 'Bolt Core Color', type: 'color', default: '#d8f6ff' },
      { name: 'haloColor', label: 'Halo / Glow Color', type: 'color', default: '#3d7bff' }
    ];
  }

  constructor(stage) {
    super(stage);
    this.bolt = new BoltMesh(this.group);
    this.acc = 0;
    this.flash = 0;
  }

  // Random point on one edge of the card (side 0..3 = top, right, bottom, left).
  edgePoint(side, hw, hh, z) {
    const u = Math.random() * 2 - 1;
    if (side === 0) return new THREE.Vector3(u * hw, hh, z);
    if (side === 1) return new THREE.Vector3(hw, u * hh, z);
    if (side === 2) return new THREE.Vector3(u * hw, -hh, z);
    return new THREE.Vector3(-hw, u * hh, z);
  }

  strike() {
    const hw = this.stage.params.cardWidth / 2 - 0.03;
    const hh = this.stage.cardHeight / 2 - 0.03;
    const z = this.stage.params.cardDepth / 2 + 0.012;
    const core = [], halo = [];
    for (let i = 0; i < this.params.boltCount; i++) {
      const s1 = Math.floor(Math.random() * 4);
      const s2 = (s1 + 1 + Math.floor(Math.random() * 3)) % 4; // a different edge: crosses the face
      appendBolt(core, halo, this.edgePoint(s1, hw, hh, z), this.edgePoint(s2, hw, hh, z), {
        width: this.params.boltWidth,
        jitter: this.params.jitter,
        levels: 5,
        branches: 2,
        depth: 0, // stay flat on the surface
        bounds: { hw, hh }
      });
    }
    this.bolt.setVerts(core, halo);
  }

  onParamsUpdated() {
    this.bolt.setColors(this.params.boltColor, this.params.haloColor);
    this.strike();
  }

  update(time, delta) {
    this.acc += delta;
    if (this.acc >= 1 / this.params.flickerRate) {
      this.acc = 0;
      const live = Math.random() < this.params.activity;
      this.group.visible = live;
      if (live) {
        this.strike();
        this.flash = 1;
        this.bolt.core.material.opacity = 0.7 + Math.random() * 0.3;
      }
    }
    this.flash = Math.max(0, this.flash - delta * 6);

    // Light the card itself: surface flashes on strike, edges glow steadily.
    const { frontMat, materials } = this.stage;
    const glow = this.params.cardGlow;
    frontMat.emissive.set(this.params.haloColor);
    frontMat.emissiveIntensity = this.flash * glow * 0.5;
    materials[0].emissive.set(this.params.boltColor);
    materials[0].emissiveIntensity = (0.25 + this.flash * 0.75) * glow;
  }

  destroy() {
    const { frontMat, materials } = this.stage;
    [frontMat, materials[0]].forEach(m => { m.emissive.set(0x000000); m.emissiveIntensity = 1; });
    super.destroy();
  }
}
