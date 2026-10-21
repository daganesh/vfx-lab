import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';
import { studioEnvironment } from '../core/environment.js';
import { sparkleTexture, pixelScale } from '../core/sprites.js';

// Random triangular facets baked into a normal map. Turning "Diamond Facets"
// up scales the normals, taking the slab from clear glass to a cut gem.
function facetNormalMap() {
  const S = 256, N = 7;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgb(128,128,255)';
  ctx.fillRect(0, 0, S, S);
  const cell = S / N;
  const pts = [];
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      const edge = i === 0 || j === 0 || i === N || j === N;
      pts.push([i * cell + (edge ? 0 : (Math.random() - 0.5) * cell * 0.7), j * cell + (edge ? 0 : (Math.random() - 0.5) * cell * 0.7)]);
    }
  }
  const at = (i, j) => pts[j * (N + 1) + i];
  const tri = (a, b, c) => {
    const col = `rgb(${Math.round(128 + (Math.random() * 2 - 1) * 127)},${Math.round(128 + (Math.random() * 2 - 1) * 127)},255)`;
    ctx.fillStyle = ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.closePath();
    ctx.fill(); ctx.stroke(); // stroke hides hairline seams
  };
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      tri(at(i, j), at(i + 1, j), at(i + 1, j + 1));
      tri(at(i, j), at(i + 1, j + 1), at(i, j + 1));
    }
  }
  return new THREE.CanvasTexture(canvas);
}

// Transmissive glass slab over the card, with environment reflections,
// optional diamond facets, thin-film iridescence and twinkling glints.
export class DiamondGlassEffect extends BaseEffect {
  static id = 'diamond-glass';
  static label = '💎 Crystal Glass / Diamond';
  static category = 'card';
  static attach = 'card';

  static getParameterSchema() {
    return [
      { name: 'facets', label: 'Diamond Facets (0 = clear glass)', min: 0, max: 1, step: 0.05, default: 0.6 },
      { name: 'glassTint', label: 'Glass Tint', type: 'color', default: '#d6ecff' },
      { name: 'ior', label: 'Refraction (IOR)', min: 1.2, max: 2.33, step: 0.01, default: 1.8 },
      { name: 'thickness', label: 'Thickness', min: 0, max: 2, step: 0.05, default: 0.4 },
      { name: 'iridescence', label: 'Iridescence', min: 0, max: 1, step: 0.05, default: 0.7 },
      { name: 'reflectivity', label: 'Reflections', min: 0, max: 3, step: 0.05, default: 1.3 },
      { name: 'sparkle', label: 'Sparkle', min: 0, max: 1, step: 0.05, default: 0.7 }
    ];
  }

  constructor(stage) {
    super(stage);
    this.normalMap = facetNormalMap();
    this.material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.04,
      transmission: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      iridescenceIOR: 1.6,
      attenuationDistance: 1.5,
      envMap: studioEnvironment(stage.renderer),
      normalMap: this.normalMap
    });
    this.glass = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.material);
    this.glass.renderOrder = 5;
    this.group.add(this.glass);

    this.buildSparkles();
    this.phase = 0;
  }

  buildSparkles() {
    const count = 40;
    const pos = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos.set([(Math.random() - 0.5) * 2.3, (Math.random() - 0.5) * 3.3, 0], i * 3);
      seeds[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    this.sparkles = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: sparkleTexture() },
        uTime: { value: 0 },
        uAmount: { value: 0.7 },
        uPixelScale: { value: 600 }
      },
      vertexShader: `
        attribute float aSeed;
        uniform float uTime, uAmount, uPixelScale;
        varying float vTwinkle;
        void main() {
          // Each glint flashes briefly, at its own rhythm.
          vTwinkle = pow(max(0.0, sin(uTime * (1.5 + aSeed * 2.0) + aSeed * 40.0)), 10.0) * uAmount;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (0.15 + aSeed * 0.25) * (0.3 + vTwinkle) * uPixelScale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        varying float vTwinkle;
        void main() {
          gl_FragColor = vec4(1.0, 1.0, 1.0, texture2D(uMap, gl_PointCoord).a * vTwinkle);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    this.sparkles.frustumCulled = false;
    this.sparkles.renderOrder = 6;
    this.group.add(this.sparkles);
  }

  onParamsUpdated() {
    const p = this.params;
    const m = this.material;
    m.color.set(p.glassTint);
    m.attenuationColor.set(p.glassTint);
    m.ior = p.ior;
    m.thickness = p.thickness;
    m.iridescence = p.iridescence;
    m.envMapIntensity = p.reflectivity;
    m.normalScale.setScalar(p.facets * 0.18);
    this.sparkles.material.uniforms.uAmount.value = p.sparkle;
  }

  update(time, delta) {
    // Slab hugs the card, slightly larger, tracking its size.
    const { cardWidth, cardDepth } = this.stage.params;
    this.glass.scale.set(cardWidth + 0.05, this.stage.cardHeight + 0.05, cardDepth + 0.08);
    this.sparkles.scale.x = cardWidth / 2.5;
    this.sparkles.position.z = cardDepth / 2 + 0.06;

    const u = this.sparkles.material.uniforms;
    u.uTime.value = time;
    u.uPixelScale.value = pixelScale(this.stage.renderer, this.stage.camera);
  }

  destroy() {
    this.normalMap.dispose();
    super.destroy();
  }
}
