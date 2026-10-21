import * as THREE from 'three';
import { ParticleEffect } from './ParticleEffect.js';
import { softDotTexture, sparkleTexture, pixelScale } from '../core/sprites.js';

// Glittering four-point stars drifting around the card. Each one twinkles on its
// own rhythm (flaring from a dim glow to a bright, spinning glint), orbits on its
// own ellipse, and slowly breathes in and out so the swarm never looks rigid.
export class ParticleEnergyPipsEffect extends ParticleEffect {
  static id = 'energy-pips';
  static label = '✨ Sparkle Swarm';

  static getParameterSchema() {
    return [
      { name: 'particleCount', label: 'Sparkle Count', min: 50, max: 1500, step: 50, default: 300 },
      { name: 'pipColor', label: 'Sparkle Tint', type: 'color', default: '#ffe9a8' },
      { name: 'pipSize', label: 'Sparkle Size', min: 0.05, max: 0.6, step: 0.01, default: 0.22 },
      { name: 'orbitSpeed', label: 'Orbit Speed', min: 0, max: 3, step: 0.1, default: 0.5 },
      { name: 'twinkleSpeed', label: 'Twinkle Speed', min: 0.2, max: 4, step: 0.1, default: 1.2 }
    ];
  }

  onParamsUpdated() {
    const count = this.params.particleCount;
    const seeds = new Float32Array(count * 4);
    const shape = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      seeds.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
      // rx, ry, z, direction
      shape.set([1.45 + Math.random() * 0.9, 2.05 + Math.random() * 0.9, (Math.random() - 0.5) * 1.0, Math.random() < 0.5 ? -1 : 1], i * 4);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    geo.setAttribute('aShape', new THREE.BufferAttribute(shape, 4));

    this.setPoints(geo, new THREE.ShaderMaterial({
      uniforms: {
        uGlint: { value: sparkleTexture() },
        uDot: { value: softDotTexture() },
        uTint: { value: new THREE.Color(this.params.pipColor) },
        uSize: { value: this.params.pipSize },
        uOrbit: { value: 0 },
        uTwinkle: { value: 0 },
        uPixelScale: { value: 600 }
      },
      vertexShader: `
        attribute vec4 aSeed;
        attribute vec4 aShape;
        uniform float uSize, uOrbit, uTwinkle, uPixelScale;
        varying float vFlare;
        varying float vFade;
        varying float vSpin;
        varying float vWhite;
        void main() {
          float a = aSeed.x * 6.28318 + uOrbit * (0.6 + aSeed.y * 0.8) * aShape.w;
          // Slow in/out breathing so sparkles drift off and back instead of ringing the card.
          float breathe = 1.0 + 0.12 * sin(uTwinkle * 0.5 + aSeed.z * 20.0);
          vec3 p = vec3(cos(a) * aShape.x * breathe, sin(a) * aShape.y * breathe + sin(uTwinkle * 0.7 + aSeed.w * 30.0) * 0.12, aShape.z);
          // Twinkle: brief, sharp flares at a per-sparkle rhythm; a faint glow in between.
          float t = sin(uTwinkle * (0.8 + aSeed.y * 1.6) + aSeed.w * 60.0);
          vFlare = pow(max(0.0, t), 6.0);
          vFade = 0.25 + 0.75 * (0.5 + 0.5 * sin(uTwinkle * 0.6 + aSeed.x * 40.0));
          vSpin = aSeed.z * 6.28318 + uTwinkle * 0.5 * (aSeed.w - 0.5);
          vWhite = aSeed.y;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uSize * (0.35 + aSeed.z * 0.65) * (0.45 + vFlare * 1.4) * uPixelScale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform sampler2D uGlint, uDot;
        uniform vec3 uTint;
        varying float vFlare, vFade, vSpin, vWhite;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float s = sin(vSpin), co = cos(vSpin);
          vec2 uv = vec2(co * c.x - s * c.y, s * c.x + co * c.y) + 0.5;
          float glint = texture2D(uGlint, uv).a;
          float dot = texture2D(uDot, gl_PointCoord).a;
          float a = max(glint * (0.35 + vFlare), dot * 0.35) * vFade;
          // Flaring sparkles burn white; resting ones show the tint.
          vec3 col = mix(uTint, vec3(1.0), clamp(vFlare + vWhite * 0.4, 0.0, 1.0));
          gl_FragColor = vec4(col * 1.4, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
  }

  update(time, delta) {
    if (!this.points) return;
    this.orbit = (this.orbit || 0) + delta * this.params.orbitSpeed;
    this.twinkle = (this.twinkle || 0) + delta * this.params.twinkleSpeed;
    const u = this.points.material.uniforms;
    u.uOrbit.value = this.orbit;
    u.uTwinkle.value = this.twinkle * 3;
    u.uPixelScale.value = pixelScale(this.stage.renderer, this.stage.camera);
    u.uSize.value = this.params.pipSize;
    this.group.scale.x = this.stage.params.cardWidth / 2.5;
  }
}
