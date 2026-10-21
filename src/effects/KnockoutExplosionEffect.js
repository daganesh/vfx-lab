import * as THREE from 'three';
import { ParticleEffect } from './ParticleEffect.js';
import { softDotTexture } from '../core/sprites.js';

const PAUSE = 0.35; // seconds of calm between bursts

export class KnockoutExplosionEffect extends ParticleEffect {
  static id = 'knockout-explosion';
  static label = '💥 KO Explosion';

  static getParameterSchema() {
    return [
      ...ParticleEffect.commonSchema(['particleCount', 'particleSize', 'randomness', 'decay']),
      { name: 'fromColor', label: 'Core Origin Color', type: 'color', default: '#ffea00' },
      { name: 'toColor', label: 'Extension Color', type: 'color', default: '#ff0044' },
      { name: 'explosionSpeed', label: 'Explosion Velocity', min: 0.5, max: 4.0, step: 0.1, default: 2.0 }
    ];
  }

  onParamsUpdated() {
    const count = this.params.particleCount;
    this.velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const c1 = new THREE.Color(this.params.fromColor);
    const c2 = new THREE.Color(this.params.toColor);
    const noise = this.params.randomness;
    const v = new THREE.Vector3();
    const c = new THREE.Color();

    for (let i = 0; i < count; i++) {
      v.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      v.x += (Math.random() - 0.5) * noise;
      v.y += (Math.random() - 0.5) * noise;
      v.z += (Math.random() - 0.5) * noise;
      v.multiplyScalar(2 + Math.random() * 3);
      this.velocities.set([v.x, v.y, v.z], i * 3);
      c.copy(c1).lerp(c2, Math.random());
      colors.set([c.r, c.g, c.b], i * 3);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.setPoints(geo, new THREE.PointsMaterial({
      size: this.params.particleSize * 1.5,
      map: softDotTexture(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    this.age = 0;
    this.update(0, 0);
  }

  update(time, delta) {
    if (!this.points) return;
    const life = 1.6 / this.params.decay;
    this.age += delta;
    if (this.age > life + PAUSE) this.age = 0;

    // Positions are a pure function of age: decelerating outward burst, no drift.
    const t = Math.min(this.age, life);
    const ease = (1 - Math.exp(-4 * t)) / 4;
    const k = ease * this.params.explosionSpeed * 1.6;
    const pos = this.points.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i++) pos[i] = this.velocities[i] * k;
    this.points.geometry.attributes.position.needsUpdate = true;

    this.points.material.opacity = Math.pow(Math.max(0, 1 - t / life), 1.5);
  }
}
