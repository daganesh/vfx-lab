import * as THREE from 'three';
import { ParticleEffect } from './ParticleEffect.js';
import { pixelScale } from '../core/sprites.js';

export class FireAuraEffect extends ParticleEffect {
  static id = 'fire-aura';
  static label = '🔥 Continuous Border Fire Aura';
  static attach = 'card'; // moves, drags and flips with the card

  static getParameterSchema() {
    return [
      { name: 'particleCount', label: 'Flame Density', min: 400, max: 4000, step: 100, default: 2200 },
      { name: 'flameHeight', label: 'Flame Rise Height', min: 0.5, max: 4.0, step: 0.1, default: 2.2 },
      { name: 'particleSize', label: 'Flame Size', min: 0.03, max: 0.4, step: 0.01, default: 0.1 },
      { name: 'flameHeat', label: 'Heat Velocity', min: 0.2, max: 3.0, step: 0.1, default: 1.4 },
      { name: 'borderOffset', label: 'Border Distance Offset', min: 0.0, max: 0.5, step: 0.02, default: 0.05 },
      { name: 'coreColor', label: 'Core Flame Color', type: 'color', default: '#ffffff' },
      { name: 'midColor', label: 'Mid Flame Color', type: 'color', default: '#ffaa00' },
      { name: 'tipColor', label: 'Outer Flame Color', type: 'color', default: '#ff1100' }
    ];
  }

  constructor(stage) {
    super(stage);
    this.fireTexture = this.generateContinuousFireTexture();
  }

  generateContinuousFireTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.25, 'rgba(255, 200, 80, 0.85)');
    grad.addColorStop(0.6, 'rgba(255, 60, 0, 0.35)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Helper function: Samples a random point directly on the rectangular border of the card.
   */
  samplePointOnCardBorder(width, height, offset) {
    const halfW = width / 2.0 + offset;
    const halfH = height / 2.0 + offset;
    const perimeter = 2 * (width + height);
    let dist = Math.random() * perimeter;

    if (dist < width) {
      // Top Edge
      return { x: -halfW + dist, y: halfH };
    }
    dist -= width;

    if (dist < height) {
      // Right Edge
      return { x: halfW, y: halfH - dist };
    }
    dist -= height;

    if (dist < width) {
      // Bottom Edge
      return { x: halfW - dist, y: -halfH };
    }
    dist -= width;

    // Left Edge
    return { x: -halfW, y: -halfH + dist };
  }

  rebuildFireAura() {
    if (this.fireParticles) {
      this.group.remove(this.fireParticles);
      if (this.fireGeometry) this.fireGeometry.dispose();
      if (this.fireMaterial) this.fireMaterial.dispose();
    }

    const count = this.params.particleCount || 2200;
    this.fireGeometry = new THREE.BufferGeometry();

    const pos = new Float32Array(count * 3);
    const initialPos = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const speeds = new Float32Array(count);

    const cardW = this.stage.params.cardWidth;
    const cardH = this.stage.cardHeight;
    this.builtWidth = cardW;
    const borderOff = this.params.borderOffset !== undefined ? this.params.borderOffset : 0.05;
    const baseSize = (this.params.particleSize || 0.1) * 45.0;

    for (let i = 0; i < count; i++) {
      // Sample directly along the 2D perimeter of the card frame
      const borderPt = this.samplePointOnCardBorder(cardW, cardH, borderOff);
      const rx = borderPt.x + (Math.random() - 0.5) * 0.1;
      const ry = borderPt.y + (Math.random() - 0.5) * 0.1;
      const rz = (Math.random() - 0.5) * 0.1;

      pos[i * 3] = rx;
      pos[i * 3 + 1] = ry;
      pos[i * 3 + 2] = rz;

      initialPos[i * 3] = rx;
      initialPos[i * 3 + 1] = ry;
      initialPos[i * 3 + 2] = rz;

      sizes[i] = baseSize * (0.8 + Math.random() * 1.4);
      speeds[i] = 0.8 + Math.random() * 1.4;
    }

    this.initialPos = initialPos;
    this.speeds = speeds;

    this.fireGeometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.fireGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    this.fireMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCoreColor: { value: new THREE.Color(this.params.coreColor || '#ffffff') },
        uMidColor: { value: new THREE.Color(this.params.midColor || '#ffaa00') },
        uTipColor: { value: new THREE.Color(this.params.tipColor || '#ff1100') },
        uTexture: { value: this.fireTexture },
        uPixelScale: { value: 600 }
      },
      vertexShader: `
        uniform float uTime, uPixelScale;
        attribute float aSize;

        varying vec2 vUv;
        varying float vHeightProgress;

        void main() {
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          gl_PointSize = aSize * (uPixelScale / 40.0) / -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;

          vHeightProgress = clamp((position.y + 1.8) / 3.5, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uCoreColor;
        uniform vec3 uMidColor;
        uniform vec3 uTipColor;
        uniform sampler2D uTexture;

        varying float vHeightProgress;

        void main() {
          vec4 tex = texture2D(uTexture, gl_PointCoord);
          
          vec3 flameCol = mix(uCoreColor, uMidColor, smoothstep(0.0, 0.4, vHeightProgress));
          flameCol = mix(flameCol, uTipColor, smoothstep(0.4, 1.0, vHeightProgress));
          
          gl_FragColor = vec4(flameCol * tex.rgb * 1.3, tex.a * 0.22 * (1.0 - vHeightProgress * 0.8));
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.fireParticles = new THREE.Points(this.fireGeometry, this.fireMaterial);
    this.fireParticles.frustumCulled = false;
    this.group.add(this.fireParticles);
  }

  onParamsUpdated() {
    this.rebuildFireAura();
  }

  update(time, delta) {
    if (this.fireMaterial && this.fireGeometry) {
      this.fireMaterial.uniforms.uTime.value = time;
      this.fireMaterial.uniforms.uPixelScale.value = pixelScale(this.stage.renderer, this.stage.camera);
      if (this.builtWidth !== this.stage.params.cardWidth) this.rebuildFireAura();

      const pos = this.fireGeometry.attributes.position.array;
      const count = pos.length / 3;

      const heat = this.params.flameHeat || 1.4;
      const maxHeight = this.params.flameHeight || 2.2;

      for (let i = 0; i < count; i++) {
        const ind = i * 3;
        const spd = this.speeds[i] * heat;

        pos[ind + 1] += delta * spd;
        pos[ind] += Math.sin(time * 4.0 + i) * 0.3 * delta;

        if (pos[ind + 1] > this.initialPos[ind + 1] + maxHeight) {
          pos[ind] = this.initialPos[ind];
          pos[ind + 1] = this.initialPos[ind + 1];
          pos[ind + 2] = this.initialPos[ind + 2];
        }
      }

      this.fireGeometry.attributes.position.needsUpdate = true;
    }
  }

  destroy() {
    if (this.fireParticles) {
      this.group.remove(this.fireParticles);
      if (this.fireGeometry) this.fireGeometry.dispose();
      if (this.fireMaterial) this.fireMaterial.dispose();
    }
    super.destroy();
  }
}
