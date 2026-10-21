import { BaseEffect } from './BaseEffect.js';

// Foil is a property of the card surface, so it is injected into the shared
// front material rather than drawn as an overlay. It follows the art, the flip
// and any opacity set by other effects.
export class HolographicFoilEffect extends BaseEffect {
  static id = 'holographic-foil';
  static label = '✨ Legendary Holographic Foil';
  static category = 'card';
  static attach = 'card';

  static getParameterSchema() {
    return [
      { name: 'foilFrequency', label: 'Foil Frequency', min: 1.0, max: 20.0, step: 0.5, default: 8.0 },
      { name: 'foilSpeed', label: 'Animation Speed', min: 0.1, max: 5.0, step: 0.1, default: 1.5 },
      { name: 'iridescenceIntensity', label: 'Iridescence', min: 0.0, max: 2.0, step: 0.1, default: 1.0 }
    ];
  }

  constructor(stage) {
    super(stage);
    this.phase = 0;
    this.uniforms = {
      uFoilTime: { value: 0 },
      uFoilFreq: { value: 8 },
      uFoilIrid: { value: 1 }
    };

    const mat = stage.frontMat;
    mat.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.fragmentShader = `
        uniform float uFoilTime;
        uniform float uFoilFreq;
        uniform float uFoilIrid;
      ` + shader.fragmentShader.replace('#include <opaque_fragment>', `
        {
          // Tilting the card shifts the hue, like real foil.
          vec3 foilV = normalize(vViewPosition);
          float fres = 1.0 - abs(dot(normalize(normal), foilV));
          float hue = (vMapUv.x + vMapUv.y) * uFoilFreq * 0.15 + fres * 2.0 + uFoilTime * 0.15;
          vec3 rainbow = 0.5 + 0.5 * cos(6.28318 * (hue + vec3(0.0, 0.33, 0.67)));
          float sweep = pow(max(0.0, 1.0 - abs(fract(vMapUv.x * 0.8 - vMapUv.y * 0.4 - uFoilTime * 0.12) - 0.5) * 6.0), 3.0);
          // Brighter art catches more foil.
          float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          outgoingLight += (rainbow * uFoilIrid * 0.45 + sweep * 0.5) * mix(0.55, 1.0, lum);
        }
        #include <opaque_fragment>
      `);
    };
    mat.customProgramCacheKey = () => 'holo-foil';
    mat.needsUpdate = true;
  }

  onParamsUpdated() {
    this.uniforms.uFoilFreq.value = this.params.foilFrequency;
    this.uniforms.uFoilIrid.value = this.params.iridescenceIntensity;
  }

  update(time, delta) {
    this.phase += delta * this.params.foilSpeed;
    this.uniforms.uFoilTime.value = this.phase;
  }

  destroy() {
    const mat = this.stage.frontMat;
    mat.onBeforeCompile = () => {};
    mat.customProgramCacheKey = () => '';
    mat.needsUpdate = true;
    super.destroy();
  }
}
