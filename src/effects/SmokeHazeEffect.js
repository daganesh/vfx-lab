import * as THREE from 'three';
import { ParticleEffect } from './ParticleEffect.js';

export class SmokeHazeEffect extends ParticleEffect {
  static id = 'smoke-haze';
  static label = '🌫️ Soft Smoke / Haze';

  static getParameterSchema() {
    return [
      ...ParticleEffect.getParameterSchema(),
      { name: 'smokeColor', label: 'Smoke Tint', type: 'color', default: '#3a4b6e' },
      { name: 'driftSpeed', label: 'Upward Drift Speed', min: 0.1, max: 2.0, step: 0.1, default: 0.6 }
    ];
  }

  constructor(scene, camera, renderer) {
    super(scene, camera, renderer);
    this.camera.position.set(0, 0, 6.5);
    this.rebuildSmokeShader();
  }

  rebuildSmokeShader() {
    if (this.smokeMesh) this.group.remove(this.smokeMesh);

    const count = this.params.particleCount || 300;
    this.particleGeometry = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * (this.params.density || 2.0) * 2;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2;
      scales[i] = 0.5 + Math.random() * 1.5;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    // Custom GLSL Shader for organic, soft-edge radial smoke billows
    this.smokeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(this.params.smokeColor || '#3a4b6e') },
        uBaseSize: { value: (this.params.particleSize || 0.1) * 200.0 }
      },
      vertexShader: `
        uniform float uBaseSize;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uBaseSize * (1.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist) * 0.35;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.smokeMesh = new THREE.Points(this.particleGeometry, this.smokeMaterial);
    this.group.add(this.smokeMesh);
  }

  onParamsUpdated() {
    this.rebuildSmokeShader();
  }

  update(time, delta) {
    if (this.smokeMesh) {
      const pos = this.particleGeometry.attributes.position.array;
      const speed = this.params.driftSpeed || 0.6;

      for (let i = 0; i < pos.length / 3; i++) {
        pos[i * 3 + 1] += delta * speed;
        if (pos[i * 3 + 1] > 3.0) pos[i * 3 + 1] = -3.0;
      }
      this.particleGeometry.attributes.position.needsUpdate = true;
    }
  }
}
