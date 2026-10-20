// src/effects/HolographicFoilEffect.js
import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

export class HolographicFoilEffect extends BaseEffect {
  static id = 'holographic-foil';
  static label = '✨ Legendary Holographic Foil';

  static getParameterSchema() {
    return [
      { name: 'foilFrequency', label: 'Foil Frequency', min: 1.0, max: 20.0, step: 0.5, default: 8.0 },
      { name: 'foilSpeed', label: 'Animation Speed', min: 0.1, max: 5.0, step: 0.1, default: 1.5 },
      { name: 'iridescenceIntensity', label: 'Iridescence', min: 0.0, max: 2.0, step: 0.1, default: 1.2 }
    ];
  }

  constructor(scene, camera, renderer, sharedTarget) {
    super(scene, camera, renderer, sharedTarget);
    this.camera.position.set(0, 0, 6.5);

    this.shaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFoilFrequency: { value: 8.0 },
        uIridescence: { value: 1.2 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uFoilFrequency;
        uniform float uIridescence;
        varying vec2 vUv;

        void main() {
          vec3 rainbowColor = 0.5 + 0.5 * cos(uTime + vUv.xyx * uFoilFrequency + vec3(0, 2, 4));
          gl_FragColor = vec4(rainbowColor * uIridescence, 0.4);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    const foilGeo = new THREE.PlaneGeometry(2.5, 3.5);
    this.foilMesh = new THREE.Mesh(foilGeo, this.shaderMaterial);
    this.foilMesh.position.z = 0.03;
    this.group.add(this.foilMesh);
  }

  onParamsUpdated() {
    this.shaderMaterial.uniforms.uFoilFrequency.value = this.params.foilFrequency;
    this.shaderMaterial.uniforms.uIridescence.value = this.params.iridescenceIntensity;
  }

  update(time, delta) {
    this.shaderMaterial.uniforms.uTime.value = time * (this.params.foilSpeed || 1.5);
  }
}
