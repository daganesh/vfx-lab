import * as THREE from 'three';
import { ParticleEffect } from './ParticleEffect.js';
import { puffTexture, pixelScale } from '../core/sprites.js';

// Each puff has its own age (fract(seed + phase)): it is born small and faint
// at the bottom, swells and slowly spins as it rises, then fades out. Motion
// is entirely in the vertex shader.
export class SmokeHazeEffect extends ParticleEffect {
  static id = 'smoke-haze';
  static label = '🌫️ Soft Smoke / Haze';

  static getParameterSchema() {
    return [
      ...ParticleEffect.commonSchema(['particleCount', 'particleSize', 'density']),
      { name: 'smokeColor', label: 'Smoke Tint', type: 'color', default: '#8d9bb8' },
      { name: 'smokeOpacity', label: 'Opacity', min: 0.1, max: 1.5, step: 0.05, default: 0.45 },
      { name: 'driftSpeed', label: 'Upward Drift Speed', min: 0.1, max: 2.0, step: 0.1, default: 0.5 },
      { name: 'turbulence', label: 'Turbulence', min: 0, max: 1.5, step: 0.05, default: 0.5 },
      { name: 'wind', label: 'Wind', min: -1, max: 1, step: 0.05, default: 0.15 }
    ];
  }

  constructor(stage) {
    super(stage);
    this.phase = 0;
  }

  onParamsUpdated() {
    const count = this.params.particleCount;
    const pos = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 2); // x: age offset, y: random
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * this.params.density * 2;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2;
      seeds[i * 2] = Math.random();
      seeds[i * 2 + 1] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 2));

    this.setPoints(geo, new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: puffTexture() },
        uColor: { value: new THREE.Color(this.params.smokeColor) },
        uOpacity: { value: this.params.smokeOpacity },
        uSize: { value: this.params.particleSize * 7.0 }, // world units
        uPixelScale: { value: 600 },
        uPhase: { value: 0 },
        uTurb: { value: this.params.turbulence },
        uWind: { value: this.params.wind }
      },
      vertexShader: `
        attribute vec2 aSeed;
        uniform float uSize, uPixelScale, uPhase, uTurb, uWind;
        varying float vAge;
        varying float vRot;
        void main() {
          float age = fract(aSeed.x + uPhase);
          vec3 p = position;
          p.y = -2.6 + age * 5.4;
          // Sway grows with age; wind pushes the older, higher smoke more.
          p.x += sin(age * 5.0 + aSeed.y * 40.0) * 0.35 * uTurb + uWind * age * age * 3.0;
          p.z += cos(age * 4.0 + aSeed.y * 30.0) * 0.3 * uTurb;
          vAge = age;
          vRot = aSeed.y * 6.28318 + age * (aSeed.y - 0.5) * 3.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float grow = 0.55 + age * 1.7;
          gl_PointSize = uSize * (0.6 + aSeed.y * 0.9) * grow * uPixelScale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAge;
        varying float vRot;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float s = sin(vRot), co = cos(vRot);
          vec2 uv = vec2(co * c.x - s * c.y, s * c.x + co * c.y) + 0.5;
          float a = texture2D(uMap, uv).a;
          // Fade in quickly, out slowly.
          float life = smoothstep(0.0, 0.15, vAge) * (1.0 - smoothstep(0.55, 1.0, vAge));
          // Older smoke thins and lightens.
          vec3 col = mix(uColor * 0.55, uColor * 1.15, vAge);
          gl_FragColor = vec4(col, a * life * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false
    }));
  }

  update(time, delta) {
    if (!this.points) return;
    // Calmer than 1:1 with the slider.
    this.phase += delta * this.params.driftSpeed * 0.2;
    const u = this.points.material.uniforms;
    u.uPhase.value = this.phase;
    u.uPixelScale.value = pixelScale(this.stage.renderer, this.stage.camera);
    u.uTurb.value = this.params.turbulence;
    u.uWind.value = this.params.wind;
    u.uOpacity.value = this.params.smokeOpacity;
  }
}
