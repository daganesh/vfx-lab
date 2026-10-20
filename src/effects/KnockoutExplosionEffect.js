import * as THREE from 'three';
import { ParticleEffect } from './ParticleEffect.js';

export class KnockoutExplosionEffect extends ParticleEffect {
  static id = 'knockout-explosion';
  static label = '💥 KO Explosion';

  static getParameterSchema() {
    return [
      ...ParticleEffect.getParameterSchema(),
      { name: 'fromColor', label: '1. Core Origin Color', type: 'color', default: '#ffea00' },
      { name: 'toColor', label: '1. Extension Color', type: 'color', default: '#ff0044' },
      { name: 'explosionSpeed', label: 'Explosion Velocity', min: 0.5, max: 4.0, step: 0.1, default: 2.0 }
    ];
  }

  constructor(scene, camera, renderer) {
    super(scene, camera, renderer);
    this.camera.position.set(0, 0, 6.5);
    this.cycleTime = 0;
    this.rebuildParticles();
  }

  rebuildParticles() {
    const count = this.params.particleCount || 500;
    this.particleGeometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);

    const c1 = new THREE.Color(this.params.fromColor || '#ffea00');
    const c2 = new THREE.Color(this.params.toColor || '#ff0044');
    const noise = this.params.randomness || 0.5;

    for (let i = 0; i < count; i++) {
      this.positions[i * 3] = 0;
      this.positions[i * 3 + 1] = 0;
      this.positions[i * 3 + 2] = 0;

      const baseDir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();

      const noiseVec = new THREE.Vector3(
        (Math.random() - 0.5) * noise,
        (Math.random() - 0.5) * noise,
        (Math.random() - 0.5) * noise
      );

      const vel = baseDir.add(noiseVec).multiplyScalar(2 + Math.random() * 3);
      this.velocities[i * 3] = vel.x;
      this.velocities[i * 3 + 1] = vel.y;
      this.velocities[i * 3 + 2] = vel.z;

      const pColor = c1.clone().lerp(c2, Math.random());
      this.colors[i * 3] = pColor.r;
      this.colors[i * 3 + 1] = pColor.g;
      this.colors[i * 3 + 2] = pColor.b;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.particleMaterial = new THREE.PointsMaterial({
      size: this.params.particleSize || 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    this.particleSystem.geometry = this.particleGeometry;
    this.particleSystem.material = this.particleMaterial;
  }

  update(time, delta) {
    const speed = this.params.explosionSpeed || 2.0;
    this.cycleTime += delta * speed;

    if (this.cycleTime > 2.0) {
      this.cycleTime = 0;
    }

    const pos = this.particleGeometry.attributes.position.array;
    const count = pos.length / 3;

    for (let i = 0; i < count; i++) {
      if (this.cycleTime === 0) {
        pos[i * 3] = 0;
        pos[i * 3 + 1] = 0;
        pos[i * 3 + 2] = 0;
      } else {
        pos[i * 3] += this.velocities[i * 3] * delta;
        pos[i * 3 + 1] += this.velocities[i * 3 + 1] * delta;
        pos[i * 3 + 2] += this.velocities[i * 3 + 2] * delta;
      }
    }

    this.particleGeometry.attributes.position.needsUpdate = true;
    const decay = this.params.decay || 1.0;
    this.particleMaterial.opacity = Math.max(0, 1.0 - (this.cycleTime * decay / 2.0));
  }
}
