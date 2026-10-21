import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

const WOOD_TYPES = {
  mahogany: { color: '#4a150b', grain: '#2b0a04', specular: '#ffaa88' },
  oak: { color: '#8b5a2b', grain: '#4a2e11', specular: '#ffddaa' },
  walnut: { color: '#3d2314', grain: '#1f1008', specular: '#d4aa7d' },
  birch: { color: '#d7c4a1', grain: '#9c845c', specular: '#ffffff' },
  ebony: { color: '#1a1412', grain: '#0a0706', specular: '#a89f91' }
};

// Wood is a property of the card surface, so (like the foil) it is injected into
// the shared front material: ring grain, varnish highlight and a gold rim shimmer.
export class WoodenCardEffect extends BaseEffect {
  static id = 'wooden-card';
  static label = '🪵 Wooden Card & Carved Grain';
  static category = 'card';
  static attach = 'card';

  static getParameterSchema() {
    return [
      { name: 'woodPreset', label: 'Wood Type', options: { Mahogany: 'mahogany', Oak: 'oak', Walnut: 'walnut', Birch: 'birch', Ebony: 'ebony' }, default: 'mahogany' },
      { name: 'woodMix', label: 'Wood Over Art', min: 0, max: 1, step: 0.05, default: 0.75 },
      { name: 'varnishGloss', label: 'Polished Varnish Gloss', min: 0.05, max: 1.0, step: 0.05, default: 0.65 },
      { name: 'grainFrequency', label: 'Wood Grain Ring Frequency', min: 2.0, max: 30.0, step: 1.0, default: 12.0 },
      { name: 'goldInlay', label: 'Gold Carved Inlay Shimmer', min: 0.0, max: 1.5, step: 0.1, default: 0.6 }
    ];
  }

  constructor(stage) {
    super(stage);
    this.uniforms = {
      uWood: { value: new THREE.Color() },
      uGrain: { value: new THREE.Color() },
      uSpec: { value: new THREE.Color() },
      uMix: { value: 0.35 },
      uGloss: { value: 0.65 },
      uFreq: { value: 12 },
      uGold: { value: 0.6 }
    };
    this.sideColor = stage.materials[0].color.clone();

    const mat = stage.frontMat;
    mat.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.fragmentShader = `
        uniform vec3 uWood, uGrain, uSpec;
        uniform float uMix, uGloss, uFreq, uGold;
        float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float wNoise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(wHash(i), wHash(i + vec2(1, 0)), f.x), mix(wHash(i + vec2(0, 1)), wHash(i + vec2(1, 1)), f.x), f.y);
        }
      ` + shader.fragmentShader.replace('#include <opaque_fragment>', `
        {
          // Long vertical growth rings: stretched across x, slowly warped along y.
          float warp = wNoise(vec2(vMapUv.x * 4.0, vMapUv.y * 1.5)) * 2.0 + wNoise(vec2(vMapUv.x * 18.0, vMapUv.y * 3.0)) * 0.6;
          float ring = sin(vMapUv.x * uFreq * 6.0 + warp * 5.0);
          vec3 wood = mix(uWood, uGrain, smoothstep(-0.7, 0.7, ring));
          // Fine pores streaking along the grain.
          wood *= 0.8 + 0.4 * wNoise(vec2(vMapUv.x * 220.0, vMapUv.y * 6.0));

          vec3 V = normalize(vViewPosition);
          vec3 N = normalize(normal);
          vec3 H = normalize(normalize(vec3(3.0, 5.0, 6.0)) + V);
          float varnish = pow(max(dot(N, H), 0.0), (1.0 - uGloss * 0.9) * 128.0 + 4.0);
          float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);

          float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          // Wood replaces the colour but keeps the art's light/dark, so it stays readable.
          outgoingLight = mix(outgoingLight, wood * (0.7 + lum * 0.8), uMix) + uSpec * varnish * 1.2 * uGloss + vec3(1.0, 0.84, 0.0) * rim * uGold;
        }
        #include <opaque_fragment>
      `);
    };
    mat.customProgramCacheKey = () => 'wood-card';
    mat.needsUpdate = true;
  }

  onParamsUpdated() {
    const p = this.params, u = this.uniforms;
    const wood = WOOD_TYPES[p.woodPreset] || WOOD_TYPES.mahogany;
    u.uWood.value.set(wood.color);
    u.uGrain.value.set(wood.grain);
    u.uSpec.value.set(wood.specular);
    u.uMix.value = p.woodMix;
    u.uGloss.value = p.varnishGloss;
    u.uFreq.value = p.grainFrequency;
    u.uGold.value = p.goldInlay;
    this.stage.materials[0].color.set(wood.color); // card edges match the wood
  }

  destroy() {
    const mat = this.stage.frontMat;
    mat.onBeforeCompile = () => {};
    mat.customProgramCacheKey = () => '';
    mat.needsUpdate = true;
    this.stage.materials[0].color.copy(this.sideColor);
    super.destroy();
  }
}
