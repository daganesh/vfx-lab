import * as THREE from 'three';
import { ParticleEffect } from './ParticleEffect.js';
import { softDotTexture } from '../core/sprites.js';

export class ParticleEnergyPipsEffect extends ParticleEffect {
  static id = 'energy-pips';
  static label = '🔮 Energy Pips Swarm';

  static getParameterSchema() {
    return [
      { name: 'particleCount', label: 'Particle Count', min: 100, max: 1500, step: 100, default: 500 },
      { name: 'pipColor', label: 'Pip Glow Color', type: 'color', default: '#00e5ff' },
      { name: 'pipSize', label: 'Pip Size', min: 0.03, max: 0.4, step: 0.01, default: 0.14 },
      { name: 'orbitSpeed', label: 'Orbit Speed', min: 0, max: 3, step: 0.1, default: 0.8 }
    ];
  }

  onParamsUpdated() {
    const count = this.params.particleCount;
    this.theta = new Float32Array(count);
    this.rx = new Float32Array(count);
    this.ry = new Float32Array(count);
    this.z = new Float32Array(count);
    this.dir = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this.theta[i] = Math.random() * Math.PI * 2;
      this.rx[i] = 1.6 + Math.random() * 0.8;
      this.ry[i] = 2.2 + Math.random() * 0.8;
      this.z[i] = (Math.random() - 0.5) * 1.0;
      this.dir[i] = 0.6 + Math.random() * 0.8;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    this.setPoints(geo, new THREE.PointsMaterial({
      color: new THREE.Color(this.params.pipColor),
      size: this.params.pipSize,
      map: softDotTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    this.update(0, 0);
  }

  // Pips orbit an ellipse around the card (not a rigid spin) and follow its width.
  update(time, delta) {
    if (!this.points) return;
    const pos = this.points.geometry.attributes.position.array;
    const speed = this.params.orbitSpeed;
    for (let i = 0; i < this.theta.length; i++) {
      this.theta[i] += delta * speed * this.dir[i];
      pos[i * 3] = Math.cos(this.theta[i]) * this.rx[i];
      pos[i * 3 + 1] = Math.sin(this.theta[i]) * this.ry[i];
      pos[i * 3 + 2] = this.z[i];
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.group.scale.x = this.stage.params.cardWidth / 2.5;
    this.points.material.opacity = 0.75 + 0.25 * Math.sin(time * 3);
  }
}
