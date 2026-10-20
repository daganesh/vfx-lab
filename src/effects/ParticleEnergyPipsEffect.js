// src/effects/ParticleEnergyPipsEffect.js
import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

export class ParticleEnergyPipsEffect extends BaseEffect {
  static id = 'energy-pips';
  static label = '🔮 Energy Pips Swarm';

  static getParameterSchema() {
    return [
      { name: 'particleCount', label: 'Particle Count', min: 100, max: 1500, step: 100, default: 500 },
      { name: 'pipColor', label: 'Pip Glow Color', type: 'color', default: '#00e5ff' }
    ];
  }

  constructor(scene, camera, renderer, sharedTarget) {
    super(scene, camera, renderer, sharedTarget);
    this.camera.position.set(0, 0, 6.5);
    this.rebuildParticles();
  }

  rebuildParticles() {
    if (this.particleSystem) {
      this.group.remove(this.particleSystem);
      this.geo.dispose();
      this.mat.dispose();
    }

    const count = this.params.particleCount || 500;
    this.geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = 1.2 + Math.random() * 0.8;
      pos[i * 3] = r * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(theta);
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }

    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.mat = new THREE.PointsMaterial({
      color: new THREE.Color(this.params.pipColor || '#00e5ff'),
      size: 0.08,
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    this.particleSystem = new THREE.Points(this.geo, this.mat);
    this.group.add(this.particleSystem);
  }

  onParamsUpdated() {
    this.rebuildParticles();
  }

  update(time, delta) {
    if (this.particleSystem) {
      this.particleSystem.rotation.z = time * 0.8;
    }
  }
}
