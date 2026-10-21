import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';
import { ForkedBolt } from '../core/lightning.js';

const START = new THREE.Vector3(-2.0, -2.5, 0.15);
const END = new THREE.Vector3(2.0, 2.5, 0.15);

export class ElectricBoltEffect extends BaseEffect {
  static id = 'electric-bolt';
  static label = '⚡ Electric Bolt';
  static category = 'particle';

  static getParameterSchema() {
    return [
      { name: 'boltWidth', label: 'Lightning Line Width', min: 0.01, max: 0.3, step: 0.01, default: 0.04 },
      { name: 'splits', label: 'Lightning Splits / Branches', min: 0, max: 100, step: 1, default: 14 },
      { name: 'boltColor', label: 'Bolt Core Color', type: 'color', default: '#e0ffff' },
      { name: 'haloColor', label: 'Halo Glow Color', type: 'color', default: '#7c4dff' },
      { name: 'randomness', label: 'Jitter / Randomness', min: 0.05, max: 0.8, step: 0.05, default: 0.3 },
      { name: 'flickerRate', label: 'Re-strike Rate (Hz)', min: 1, max: 30, step: 1, default: 6 }
    ];
  }

  constructor(stage) {
    super(stage);
    this.bolt = new ForkedBolt(this.group);
    this.acc = 0;
  }

  onParamsUpdated() {
    this.bolt.setColors(this.params.boltColor, this.params.haloColor);
    this.bolt.build(START, END, {
      width: this.params.boltWidth,
      jitter: this.params.randomness,
      splits: this.params.splits
    });
    this.acc = 0;
  }

  update(time, delta) {
    const interval = 1 / this.params.flickerRate;
    this.acc += delta;
    if (this.acc >= interval) {
      this.acc -= interval;
      this.bolt.strike();
      this.flash = 0.75 + Math.random() * 0.25;
    }
    this.bolt.apply(this.acc / (interval * 0.8));
    this.bolt.mat.uniforms.uOpacity.value = (this.flash ?? 1) * (0.9 + 0.1 * Math.sin(time * 40));
  }

  destroy() {
    this.bolt.dispose();
    super.destroy();
  }
}
