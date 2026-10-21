import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

export class HolographicFoilEffect extends BaseEffect {
  static id = 'holographic-foil';
  static label = '✨ Legendary Holographic Foil';
  static attach = 'card';

  static getParameterSchema() {
    return [
      { name: 'foilFrequency', label: 'Foil Frequency', min: 1.0, max: 20.0, step: 0.5, default: 8.0 },
      { name: 'foilSpeed', label: 'Animation Speed', min: 0.1, max: 5.0, step: 0.1, default: 1.5 },
      { name: 'iridescenceIntensity', label: 'Iridescence', min: 0.0, max: 2.0, step: 0.1, default: 1.2 }
    ];
  }

  constructor(stage) {
    super(stage);
    this.phase = 0;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFoilFrequency: { value: 8.0 },
        uIridescence: { value: 1.2 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalV;
        varying vec3 vViewDir;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormalV = normalize(normalMatrix * normal);
          vViewDir = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uFoilFrequency;
        uniform float uIridescence;
        varying vec2 vUv;
        varying vec3 vNormalV;
        varying vec3 vViewDir;

        void main() {
          // Tilting the card shifts the hue, like real foil.
          float fres = 1.0 - abs(dot(normalize(vNormalV), normalize(vViewDir)));
          float hue = (vUv.x + vUv.y) * uFoilFrequency * 0.15 + fres * 2.0 + uTime * 0.15;
          vec3 rainbow = 0.5 + 0.5 * cos(6.28318 * (hue + vec3(0.0, 0.33, 0.67)));
          // Diagonal glint sweeping across the face.
          float sweep = pow(max(0.0, 1.0 - abs(fract(vUv.x * 0.8 - vUv.y * 0.4 - uTime * 0.12) - 0.5) * 6.0), 3.0);
          gl_FragColor = vec4(rainbow * uIridescence + sweep, 0.28);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.foilMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 3.5), this.material);
    this.foilMesh.renderOrder = 1;
    this.group.add(this.foilMesh);
  }

  onParamsUpdated() {
    this.material.uniforms.uFoilFrequency.value = this.params.foilFrequency;
    this.material.uniforms.uIridescence.value = this.params.iridescenceIntensity;
  }

  update(time, delta) {
    this.phase += delta * this.params.foilSpeed;
    this.material.uniforms.uTime.value = this.phase;
    // Track the shared card's size.
    this.foilMesh.scale.x = this.stage.params.cardWidth / 2.5;
    this.foilMesh.position.z = this.stage.params.cardDepth / 2 + 0.004;
  }
}
