import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

const MAX = 8;

// Tap the card and it behaves like a pool: rings spread from the touch point,
// refracting the art and catching the light on their crests. Done in the card's
// own material (chained after any other effect that also patches it), so it works
// with the art, foil and flips, and several drops can overlap.
export class RippleEffect extends BaseEffect {
  static id = 'ripples';
  static label = '💧 Ripples (tap the card)';
  static category = 'card';
  static attach = 'card';

  static getParameterSchema() {
    return [
      { name: 'strength', label: 'Refraction Strength', min: 0, max: 3, step: 0.05, default: 1.8 },
      { name: 'speed', label: 'Wave Speed', min: 0.3, max: 3, step: 0.05, default: 1.1 },
      { name: 'frequency', label: 'Ring Frequency', min: 4, max: 30, step: 1, default: 14 },
      { name: 'decay', label: 'Fade Out Speed', min: 0.2, max: 3, step: 0.05, default: 0.7 },
      { name: 'shine', label: 'Crest Shine', min: 0, max: 1, step: 0.05, default: 0.7 },
      { name: 'autoDrip', label: 'Auto Drip (sec, 0 = off)', min: 0, max: 6, step: 0.5, default: 0 }
    ];
  }

  constructor(stage) {
    super(stage);
    this.clock = 0;
    this.nextSlot = 0;
    this.drip = 0;
    this.ripples = Array.from({ length: MAX }, () => new THREE.Vector4(0, 0, 0, 0)); // u, v, start time, active
    this.uniforms = {
      uRipples: { value: this.ripples },
      uRTime: { value: 0 },
      uRStrength: { value: 1.8 },
      uRSpeed: { value: 1.1 },
      uRFreq: { value: 14 },
      uRDecay: { value: 0.7 },
      uRShine: { value: 0.7 },
      uRSize: { value: new THREE.Vector2(2.5, 3.5) }
    };

    const mat = stage.frontMat;
    this.prevCompile = mat.onBeforeCompile;
    this.prevKey = mat.customProgramCacheKey;
    mat.onBeforeCompile = (shader, renderer) => {
      this.prevCompile.call(mat, shader, renderer);
      Object.assign(shader.uniforms, this.uniforms);
      shader.fragmentShader = `
        uniform vec4 uRipples[${MAX}];
        uniform float uRTime, uRStrength, uRSpeed, uRFreq, uRDecay, uRShine;
        uniform vec2 uRSize;
        // Sum of expanding wave packets: returns the UV displacement, crest brightness via 'crest'.
        vec2 rippleUv(vec2 uv, out float crest) {
          vec2 off = vec2(0.0);
          crest = 0.0;
          for (int i = 0; i < ${MAX}; i++) {
            vec4 r = uRipples[i];
            float age = uRTime - r.z;
            if (r.w < 0.5 || age < 0.0) continue;
            vec2 d = (uv - r.xy) * uRSize;
            float dist = length(d);
            float x = dist - age * uRSpeed;            // < 0 behind the wavefront
            float env = smoothstep(0.12, 0.0, x) * exp(min(x, 0.0) * 1.1);
            float wave = sin(x * uRFreq) * env * exp(-age * uRDecay) / (1.0 + dist * 1.5);
            off += (d / max(dist, 1e-4)) * wave * 0.03 * uRStrength / uRSize;
            crest += wave;
          }
          return uv + off;
        }
      ` + shader.fragmentShader
        .replace('#include <map_fragment>', `
          float rCrest;
          vec2 rUv = rippleUv(vMapUv, rCrest);
          #define vMapUv rUv
          #include <map_fragment>
          #undef vMapUv
        `)
        .replace('#include <opaque_fragment>', `
          outgoingLight += vec3(max(rCrest, 0.0) * 1.6 + rCrest * 0.3) * uRShine;
          #include <opaque_fragment>
        `);
    };
    mat.customProgramCacheKey = () => `${this.prevKey.call(mat)}|ripple`;
    mat.needsUpdate = true;

    this.unsubscribe = stage.onTap(({ uv }) => this.drop(uv.x, uv.y));
  }

  drop(u, v) {
    this.ripples[this.nextSlot].set(u, v, this.clock, 1);
    this.nextSlot = (this.nextSlot + 1) % MAX;
  }

  onParamsUpdated() {
    const p = this.params, u = this.uniforms;
    u.uRStrength.value = p.strength;
    u.uRSpeed.value = p.speed;
    u.uRFreq.value = p.frequency;
    u.uRDecay.value = p.decay;
    u.uRShine.value = p.shine;
  }

  update(time, delta) {
    this.clock += delta;
    this.uniforms.uRTime.value = this.clock;
    this.uniforms.uRSize.value.set(this.stage.params.cardWidth, this.stage.cardHeight);
    this.ripples.forEach(r => { if (r.w && this.clock - r.z > 8) r.w = 0; });
    if (this.params.autoDrip > 0 && (this.drip -= delta) <= 0) {
      this.drip = this.params.autoDrip;
      this.drop(0.15 + Math.random() * 0.7, 0.15 + Math.random() * 0.7);
    }
  }

  destroy() {
    this.unsubscribe();
    const mat = this.stage.frontMat;
    mat.onBeforeCompile = this.prevCompile;
    mat.customProgramCacheKey = this.prevKey;
    mat.needsUpdate = true;
    super.destroy();
  }
}
