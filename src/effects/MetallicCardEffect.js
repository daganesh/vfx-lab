import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

const METALS = {
  gold: { color: '#ffd700', specular: '#fff5b8', roughness: 0.25, metalness: 0.95 },
  silver: { color: '#c0c0c0', specular: '#ffffff', roughness: 0.2, metalness: 0.95 },
  bronze: { color: '#cd7f32', specular: '#f5c28b', roughness: 0.35, metalness: 0.85 },
  copper: { color: '#b87333', specular: '#f7c0a1', roughness: 0.3, metalness: 0.9 },
  platinum: { color: '#e5e4e2', specular: '#ffffff', roughness: 0.15, metalness: 0.98 },
  titanium: { color: '#878681', specular: '#d4d4d4', roughness: 0.4, metalness: 0.8 }
};

// Metal tint, specular glare, brushed grain and a rainbow rim, injected into the
// shared front material so it follows the art, the flip and other effects.
export class MetallicCardEffect extends BaseEffect {
  static id = 'metallic-card';
  static label = '🥇 Metallic & Shader Customizer';
  static category = 'card';
  static attach = 'card';

  static getParameterSchema() {
    return [
      { name: 'metalPreset', label: 'Metal Preset', options: { 'Custom Tint': 'custom', Gold: 'gold', Silver: 'silver', Bronze: 'bronze', Copper: 'copper', Platinum: 'platinum', Titanium: 'titanium' }, default: 'gold' },
      { name: 'baseColor', label: 'Custom Base Tint', type: 'color', default: '#002aff' },
      { name: 'specularColor', label: 'Custom Specular Highlight', type: 'color', default: '#ffffff' },
      { name: 'surfaceFinish', label: 'Finish Type', options: { Glossy: 0, Matte: 1, Satin: 2, 'Brushed Grain': 3, 'Anodized Shift': 4 }, default: 0 },
      { name: 'roughness', label: 'Surface Roughness (custom)', min: 0.05, max: 1.0, step: 0.02, default: 0.2 },
      { name: 'metalness', label: 'Metallic Intensity (custom)', min: 0.0, max: 1.0, step: 0.02, default: 0.95 },
      { name: 'reflectivity', label: 'Environment Reflectivity', min: 0.0, max: 2.0, step: 0.05, default: 1.35 },
      { name: 'lightIntensity', label: 'Light Specular Gain', min: 0.2, max: 4.0, step: 0.1, default: 2.4 },
      { name: 'foilIridescence', label: 'Holographic Rainbow Foil', min: 0.0, max: 1.5, step: 0.05, default: 0.5 },
      { name: 'foilFrequency', label: 'Foil Spectrum Frequency', min: 1.0, max: 20.0, step: 0.5, default: 13.5 }
    ];
  }

  constructor(stage) {
    super(stage);
    this.time = 0;
    this.uniforms = {
      uMetalTime: { value: 0 },
      uBase: { value: new THREE.Color() },
      uSpec: { value: new THREE.Color() },
      uRough: { value: 0.2 },
      uMetal: { value: 0.95 },
      uRefl: { value: 1.35 },
      uGain: { value: 2.4 },
      uIrid: { value: 0.5 },
      uFoilFreq: { value: 13.5 },
      uFinish: { value: 0 }
    };
    this.sideColor = stage.materials[0].color.clone();

    const mat = stage.frontMat;
    mat.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.fragmentShader = `
        uniform vec3 uBase, uSpec;
        uniform float uMetalTime, uRough, uMetal, uRefl, uGain, uIrid, uFoilFreq, uFinish;
      ` + shader.fragmentShader.replace('#include <opaque_fragment>', `
        {
          vec3 N = normalize(normal);
          if (uFinish > 2.5 && uFinish < 3.5) {
            // Brushed: fine horizontal streaks tilt the normal.
            float streak = fract(sin(floor(vMapUv.y * 600.0) * 91.7) * 4375.5) - 0.5;
            N = normalize(N + vec3(0.0, streak * 0.25, 0.0));
          }
          vec3 V = normalize(vViewPosition);
          vec3 H = normalize(normalize(vec3(2.0, 4.0, 5.0)) + V);
          float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          float spec = pow(max(dot(N, H), 0.0), max(1.0, (1.0 - uRough) * 128.0)) * uGain;
          vec3 rainbow = 0.5 + 0.5 * cos(uMetalTime * 2.0 + vMapUv.xyx * uFoilFreq + vec3(0.0, 2.0, 4.0));

          // Recolour with the metal but keep the art's light/dark so it stays readable.
          float lum = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
          vec3 metal = mix(outgoingLight, uBase * (0.25 + 1.3 * lum), uMetal * 0.9);
          vec3 glare = mix(uSpec, metal, uMetal) * spec * uRefl;
          if (uFinish > 0.5 && uFinish < 1.5) glare *= 0.15;
          else if (uFinish > 1.5 && uFinish < 2.5) glare *= 0.5;
          else if (uFinish > 3.5) metal *= mix(vec3(1.0), vec3(0.8, 0.2, 0.9), fres);
          outgoingLight = metal + glare + rainbow * fres * uIrid;
        }
        #include <opaque_fragment>
      `);
    };
    mat.customProgramCacheKey = () => 'metal-card';
    mat.needsUpdate = true;
  }

  onParamsUpdated() {
    const p = this.params, u = this.uniforms;
    const preset = METALS[p.metalPreset];
    u.uBase.value.set(preset ? preset.color : p.baseColor);
    u.uSpec.value.set(preset ? preset.specular : p.specularColor);
    u.uRough.value = preset ? preset.roughness : p.roughness;
    u.uMetal.value = preset ? preset.metalness : p.metalness;
    u.uRefl.value = p.reflectivity;
    u.uGain.value = p.lightIntensity;
    u.uIrid.value = p.foilIridescence;
    u.uFoilFreq.value = p.foilFrequency;
    u.uFinish.value = Number(p.surfaceFinish);
    this.stage.materials[0].color.set(u.uBase.value); // edges match the metal
  }

  update(time, delta) {
    this.uniforms.uMetalTime.value = time;
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
