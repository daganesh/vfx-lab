import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

const COMMON = [
  { name: 'particleCount', label: 'Particle Count', min: 50, max: 2000, step: 50, default: 500 },
  { name: 'particleSize', label: 'Particle Size', min: 0.01, max: 0.5, step: 0.01, default: 0.1 },
  { name: 'randomness', label: 'Trajectory Randomness', min: 0.0, max: 2.0, step: 0.1, default: 0.5 },
  { name: 'density', label: 'Swarm Density / Radius', min: 0.2, max: 4.0, step: 0.1, default: 1.5 },
  { name: 'decay', label: 'Lifetime Decay Speed', min: 0.1, max: 3.0, step: 0.1, default: 1.0 }
];

// Shared plumbing for Points-based effects. Subclasses choose which of the
// common sliders apply so the GUI never shows controls that do nothing.
export class ParticleEffect extends BaseEffect {
  static category = 'particle';

  static commonSchema(names) {
    return COMMON.filter(item => names.includes(item.name));
  }

  // Swap in new geometry/material, disposing whatever was there.
  setPoints(geometry, material) {
    if (this.points) {
      this.group.remove(this.points);
      this.points.geometry.dispose();
      this.points.material.dispose();
    }
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.group.add(this.points);
  }
}
