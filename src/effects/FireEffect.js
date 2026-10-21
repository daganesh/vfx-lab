import * as THREE from 'three';
import { ParticleEffect } from './ParticleEffect.js';
import { softDotTexture, pixelScale } from '../core/sprites.js';

// Flames licking up from the card's lower edges. Each particle has an age
// (fract(seed + phase)); colour runs white-hot -> hot -> flame -> dark ember
// and size shrinks toward the tip. Additive, so overlapping flames brighten.
export class FireEffect extends ParticleEffect {
  static id = 'fire';
  static label = '🔥 Fire / Burning Edge';

  static getParameterSchema() {
    return [
      { name: 'particleCount', label: 'Particle Count', min: 100, max: 2000, step: 50, default: 700 },
      { name: 'particleSize', label: 'Flame Size', min: 0.1, max: 1.2, step: 0.02, default: 0.45 },
      { name: 'flameHeight', label: 'Flame Height', min: 0.5, max: 4.0, step: 0.1, default: 2.2 },
      { name: 'burnSpeed', label: 'Burn Speed', min: 0.2, max: 3.0, step: 0.1, default: 1.0 },
      { name: 'turbulence', label: 'Turbulence', min: 0, max: 1.5, step: 0.05, default: 0.6 },
      { name: 'intensity', label: 'Intensity', min: 0.2, max: 2.0, step: 0.05, default: 1.0 },
      { name: 'hotColor', label: 'Hot Color', type: 'color', default: '#ffd36b' },
      { name: 'flameColor', label: 'Flame Color', type: 'color', default: '#ff4d00' }
    ];
  }

  constructor(stage) {
    super(stage);
    this.phase = 0;
  }

  onParamsUpdated() {
    const count = this.params.particleCount;
    const pos = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 2);
    const halfW = 1.25, bottom = -1.75;
    for (let i = 0; i < count; i++) {
      // Emit along the bottom edge and the lower half of both sides.
      const r = Math.random();
      if (r < 0.6) { pos[i * 3] = (Math.random() * 2 - 1) * halfW; pos[i * 3 + 1] = bottom; }
      else { pos[i * 3] = (r < 0.8 ? -1 : 1) * halfW; pos[i * 3 + 1] = bottom + Math.random() * 1.75; }
      pos[i * 3 + 2] = 0.02 + (Math.random() - 0.5) * 0.15;
      seeds[i * 2] = Math.random();
      seeds[i * 2 + 1] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 2));

    this.setPoints(geo, new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: softDotTexture() },
        uHot: { value: new THREE.Color(this.params.hotColor) },
        uFlame: { value: new THREE.Color(this.params.flameColor) },
        uSize: { value: this.params.particleSize },
        uHeight: { value: this.params.flameHeight },
        uTurb: { value: this.params.turbulence },
        uIntensity: { value: this.params.intensity },
        uPixelScale: { value: 600 },
        uPhase: { value: 0 },
        uTime: { value: 0 }
      },
      vertexShader: `
        attribute vec2 aSeed;
        uniform float uSize, uHeight, uTurb, uPixelScale, uPhase, uTime;
        varying float vAge;
        varying float vFlicker;
        void main() {
          float age = fract(aSeed.x + uPhase);
          vec3 p = position;
          // Rise with a slight ease-out; lick sideways more toward the tip.
          p.y += (age * (0.65 + aSeed.y * 0.35)) * uHeight;
          p.x += sin(age * 7.0 + aSeed.y * 50.0 + uTime * 2.0) * age * 0.45 * uTurb;
          p.z += cos(age * 6.0 + aSeed.y * 30.0) * age * 0.2 * uTurb;
          // Flames pull in toward the centre line as they climb.
          p.x *= 1.0 - age * 0.25;
          vAge = age;
          vFlicker = 0.75 + 0.25 * sin(uTime * 18.0 + aSeed.y * 100.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float s = uSize * (0.5 + aSeed.y * 0.7) * (1.0 - age * 0.75);
          gl_PointSize = s * uPixelScale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform vec3 uHot, uFlame;
        uniform float uIntensity;
        varying float vAge;
        varying float vFlicker;
        void main() {
          float a = texture2D(uMap, gl_PointCoord).a;
          vec3 c = mix(vec3(1.0, 0.96, 0.85), uHot, smoothstep(0.0, 0.25, vAge));
          c = mix(c, uFlame, smoothstep(0.2, 0.6, vAge));
          c = mix(c, uFlame * 0.12, smoothstep(0.6, 1.0, vAge));
          float life = smoothstep(0.0, 0.06, vAge) * pow(1.0 - vAge, 1.2);
          gl_FragColor = vec4(c, a * life * vFlicker * uIntensity * 0.4);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
  }

  update(time, delta) {
    if (!this.points) return;
    this.phase += delta * this.params.burnSpeed * 0.45;
    const u = this.points.material.uniforms;
    u.uPhase.value = this.phase;
    u.uTime.value = time;
    u.uPixelScale.value = pixelScale(this.stage.renderer, this.stage.camera);
    u.uHeight.value = this.params.flameHeight;
    u.uTurb.value = this.params.turbulence;
    u.uIntensity.value = this.params.intensity;
    this.group.scale.x = this.stage.params.cardWidth / 2.5;
  }
}
