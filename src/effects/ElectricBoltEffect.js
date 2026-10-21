import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';
import { appendBolt, BoltMesh } from '../core/lightning.js';

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
    this.bolt = new BoltMesh(this.group);
    this.acc = 0;
  }

  strike() {
    const core = [], halo = [];
    appendBolt(core, halo, START, END, {
      width: this.params.boltWidth,
      jitter: this.params.randomness,
      levels: 6,
      branches: Math.round(this.params.splits * 0.4)
    });
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
      this.strike();
      this.bolt.core.material.opacity = 0.6 + Math.random() * 0.4;
    }
  }
}
