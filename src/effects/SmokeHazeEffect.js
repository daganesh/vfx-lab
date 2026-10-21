import * as THREE from 'three';
import { ParticleEffect } from './ParticleEffect.js';

const RANGE = 6.0; // vertical wrap height, -3..3

export class SmokeHazeEffect extends ParticleEffect {
  static id = 'smoke-haze';
  static label = '🌫️ Soft Smoke / Haze';

  static getParameterSchema() {
    return [
      ...ParticleEffect.commonSchema(['particleCount', 'particleSize', 'density']),
      { name: 'smokeColor', label: 'Smoke Tint', type: 'color', default: '#6f86b8' },
      { name: 'driftSpeed', label: 'Upward Drift Speed', min: 0.1, max: 2.0, step: 0.1, default: 0.6 }
    ];
  }

  constructor(stage) {
    super(stage);
    this.phase = 0;
  }

  onParamsUpdated() {
    const count = this.params.particleCount;
    const pos = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * this.params.density * 2;
      pos[i * 3 + 1] = Math.random() * RANGE - RANGE / 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2;
      scales[i] = 0.5 + Math.random() * 1.5;
      seeds[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

    // Motion is computed on the GPU from a single phase uniform; no per-frame CPU loop.
    this.setPoints(geo, new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(this.params.smokeColor) },
        uSize: { value: this.params.particleSize * 12.0 }, // world units
        uPixelScale: { value: 600 },
        uPhase: { value: 0 }
      },
      vertexShader: `
        attribute float aScale;
        attribute float aSeed;
        uniform float uSize;
        uniform float uPixelScale;
        uniform float uPhase;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          p.y = mod(position.y + uPhase + 3.0, 6.0) - 3.0;
          p.x += sin(uPhase * 0.7 + aSeed * 6.28318) * 0.25;
          // Fade near the wrap points so puffs never pop.
          vAlpha = smoothstep(-3.0, -1.8, p.y) * (1.0 - smoothstep(1.8, 3.0, p.y));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uSize * aScale * uPixelScale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, dist) * 0.35 * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false
    }));
  }

  update(time, delta) {
    if (!this.points) return;
    this.phase += delta * this.params.driftSpeed;
    const u = this.points.material.uniforms;
    u.uPhase.value = this.phase;
    // Pixels per world unit at distance 1 for the current viewport and fov.
    const h = this.stage.renderer.domElement.height;
    u.uPixelScale.value = h / (2 * Math.tan((this.stage.camera.fov * Math.PI) / 360));
  }
}
