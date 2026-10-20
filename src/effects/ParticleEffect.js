import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

export class ParticleEffect extends BaseEffect {
  static getParameterSchema() {
    return [
      { name: 'particleCount', label: 'Particle Count', min: 50, max: 2000, step: 50, default: 500 },
      { name: 'particleSize', label: 'Particle Size', min: 0.01, max: 0.5, step: 0.01, default: 0.1 },
      { name: 'randomness', label: 'Trajectory Randomness', min: 0.0, max: 2.0, step: 0.1, default: 0.5 },
      { name: 'density', label: 'Swarm Density / Radius', min: 0.2, max: 4.0, step: 0.1, default: 1.5 },
      { name: 'decay', label: 'Lifetime Decay Speed', min: 0.1, max: 3.0, step: 0.1, default: 1.0 }
    ];
  }

  constructor(scene, camera, renderer) {
    super(scene, camera, renderer);
    this.particleGeometry = new THREE.BufferGeometry();
    this.particleMaterial = new THREE.PointsMaterial({ transparent: true });
    this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.group.add(this.particleSystem);
  }

  rebuildParticles() {
    if (this.particleGeometry) this.particleGeometry.dispose();
    this.particleGeometry = new THREE.BufferGeometry();

    const count = this.params.particleCount || 500;
    const positions = new Float32Array(count * 3);
    const radius = this.params.density || 1.5;
    const noise = this.params.randomness || 0.5;

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * radius * 2 + (Math.random() - 0.5) * noise;
      positions[i * 3 + 1] = (Math.random() - 0.5) * radius * 2 + (Math.random() - 0.5) * noise;
      positions[i * 3 + 2] = (Math.random() - 0.5) * radius * 2 + (Math.random() - 0.5) * noise;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleMaterial.size = this.params.particleSize || 0.1;
    this.particleSystem.geometry = this.particleGeometry;
  }

  onParamsUpdated() {
    this.rebuildParticles();
  }
}
