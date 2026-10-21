import * as THREE from 'three';
import { ParticleEffect } from './ParticleEffect.js';

export class SmokeHazeEffect extends ParticleEffect {
  static id = 'smoke-haze';
  static label = '🌫️ Border Volumetric Smoke';

  static getParameterSchema() {
    return [
      ...ParticleEffect.getParameterSchema(),
      { name: 'particleCount', label: 'Particle Count', min: 200, max: 3000, step: 100, default: 1200 },
      { name: 'particleSize', label: 'Base Particle Size', min: 0.1, max: 5.0, step: 0.1, default: 2.0 },
      { name: 'borderOffset', label: 'Border Distance Offset', min: 0.0, max: 0.5, step: 0.02, default: 0.05 },
      { name: 'opacity', label: 'Layer Opacity', min: 0.02, max: 0.5, step: 0.01, default: 0.15 },
      { name: 'driftSpeed', label: 'Drift Velocity', min: 0.1, max: 2.0, step: 0.1, default: 0.5 },
      { name: 'smokeColor', label: 'Core Smoke Tint', type: 'color', default: '#3a4b6e' }
    ];
  }

  constructor(scene, camera, renderer) {
    super(scene, camera, renderer);
    this.camera.position.set(0, 0, 6.5);

    this.smokePuffTexture = this.generateContinuousSmokeTexture();
    this.rebuildSmokeShader();
  }

  generateContinuousSmokeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.3, 'rgba(230, 230, 230, 0.55)');
    gradient.addColorStop(0.7, 'rgba(170, 170, 170, 0.12)');
    gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  samplePointOnCardBorder(width, height, offset) {
    const halfW = width / 2.0 + offset;
    const halfH = height / 2.0 + offset;
    const perimeter = 2 * (width + height);
    let dist = Math.random() * perimeter;

    if (dist < width) return { x: -halfW + dist, y: halfH };
    dist -= width;
    if (dist < height) return { x: halfW, y: halfH - dist };
    dist -= height;
    if (dist < width) return { x: halfW - dist, y: -halfH };
    dist -= width;
    return { x: -halfW, y: -halfH + dist };
  }

  rebuildSmokeShader() {
    if (this.smokeParticles) {
      this.group.remove(this.smokeParticles);
      if (this.smokeGeometry) this.smokeGeometry.dispose();
      if (this.smokeMaterial) this.smokeMaterial.dispose();
    }

    const count = this.params.particleCount || 1200;
    this.smokeGeometry = new THREE.BufferGeometry();

    const positions = new Float32Array(count * 3);
    const initialPositions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const speeds = new Float32Array(count);

    const cardW = this.params.cardWidth || 2.5;
    const cardH = 3.5;
    const borderOff = this.params.borderOffset !== undefined ? this.params.borderOffset : 0.05;
    const baseSize = (this.params.particleSize || 2.0) * 25.0;

    for (let i = 0; i < count; i++) {
      const borderPt = this.samplePointOnCardBorder(cardW, cardH, borderOff);
      const px = borderPt.x + (Math.random() - 0.5) * 0.2;
      const py = borderPt.y + (Math.random() - 0.5) * 0.2;
      const pz = (Math.random() - 0.5) * 0.2;

      positions[i * 3] = px;
      positions[i * 3 + 1] = py;
      positions[i * 3 + 2] = pz;

      initialPositions[i * 3] = px;
      initialPositions[i * 3 + 1] = py;
      initialPositions[i * 3 + 2] = pz;

      sizes[i] = baseSize * (0.8 + Math.random() * 1.2);
      speeds[i] = 0.5 + Math.random() * 0.8;
    }

    this.initialPositions = initialPositions;
    this.speeds = speeds;

    this.smokeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.smokeGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    this.smokeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(this.params.smokeColor || '#3a4b6e') },
        uOpacity: { value: this.params.opacity !== undefined ? this.params.opacity : 0.15 },
        uTexture: { value: this.smokePuffTexture }
      },
      vertexShader: `
        uniform float uTime;
        attribute float aSize;

        varying vec2 vUv;

        void main() {
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (35.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform sampler2D uTexture;

        void main() {
          vec4 texColor = texture2D(uTexture, gl_PointCoord);
          gl_FragColor = vec4(uColor * texColor.rgb, texColor.a * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.smokeParticles = new THREE.Points(this.smokeGeometry, this.smokeMaterial);
    this.group.add(this.smokeParticles);
  }

  onParamsUpdated() {
    this.rebuildSmokeShader();
  }

  update(time, delta) {
    if (this.smokeMaterial && this.smokeGeometry) {
      this.smokeMaterial.uniforms.uTime.value = time;

      const pos = this.smokeGeometry.attributes.position.array;
      const count = pos.length / 3;
      const speed = this.params.driftSpeed || 0.5;

      for (let i = 0; i < count; i++) {
        const ind = i * 3;
        pos[ind + 1] += delta * speed * this.speeds[i];
        pos[ind] += Math.sin(time * 1.2 + i) * 0.1 * delta;

        if (pos[ind + 1] > 3.5) {
          pos[ind] = this.initialPositions[ind];
          pos[ind + 1] = -3.5;
          pos[ind + 2] = this.initialPositions[ind + 2];
        }
      }

      this.smokeGeometry.attributes.position.needsUpdate = true;
    }
  }

  destroy() {
    if (this.smokeParticles) {
      this.group.remove(this.smokeParticles);
      if (this.smokeGeometry) this.smokeGeometry.dispose();
      if (this.smokeMaterial) this.smokeMaterial.dispose();
    }
    super.destroy();
  }
}
