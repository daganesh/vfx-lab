import * as THREE from 'three';
import { CardEffect } from './CardEffect.js';

export class WoodenCardEffect extends CardEffect {
  static id = 'wooden-card';
  static label = '🪵 Wooden Card & Carved Grain';

  static WOOD_TYPES = {
    mahogany: { color: '#4a150b', grain: '#2b0a04', specular: '#ffaa88', roughness: 0.35 },
    oak: { color: '#8b5a2b', grain: '#4a2e11', specular: '#ffddaa', roughness: 0.45 },
    walnut: { color: '#3d2314', grain: '#1f1008', specular: '#d4aa7d', roughness: 0.3 },
    birch: { color: '#d7c4a1', grain: '#9c845c', specular: '#ffffff', roughness: 0.5 },
    ebony: { color: '#1a1412', grain: '#0a0706', specular: '#a89f91', roughness: 0.25 }
  };

  static getParameterSchema() {
    return [
      ...CardEffect.getParameterSchema(),
      {
        name: 'woodPreset',
        label: '1. Wood Type',
        options: {
          'Mahogany': 'mahogany',
          'Oak': 'oak',
          'Walnut': 'walnut',
          'Birch': 'birch',
          'Ebony': 'ebony'
        },
        default: 'mahogany'
      },
      { name: 'varnishGloss', label: 'Polished Varnish Gloss', min: 0.05, max: 1.0, step: 0.05, default: 0.35 },
      { name: 'grainFrequency', label: 'Wood Grain Ring Frequency', min: 2.0, max: 30.0, step: 1.0, default: 12.0 },
      { name: 'goldInlay', label: 'Gold Carved Inlay Shimmer', min: 0.0, max: 1.5, step: 0.1, default: 0.6 }
    ];
  }

  constructor(scene, camera, renderer) {
    super(scene, camera, renderer);
    this.camera.position.set(0, 0, 6.5);
    this.generateWoodBumpMap();
  }

  generateWoodBumpMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 512, 512);

    // Procedural carved wood grain normal lines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < 800; i++) {
      const y = Math.random() * 512;
      ctx.fillRect(0, y, 512, 1 + Math.random() * 3);
    }

    this.woodBumpMap = new THREE.CanvasTexture(canvas);
    this.woodBumpMap.wrapS = THREE.RepeatWrapping;
    this.woodBumpMap.wrapT = THREE.RepeatWrapping;
    this.woodBumpMap.repeat.set(1, 3);
    this.woodBumpMap.needsUpdate = true;
  }

  createSharedCardMesh() {
    if (this.cardMesh) {
      this.group.remove(this.cardMesh);
      if (this.cardGeometry) this.cardGeometry.dispose();
      if (this.woodenShaderMat) this.woodenShaderMat.dispose();
    }

    const w = this.params.cardWidth || this.cardWidth;
    const d = this.params.cardDepth || this.cardDepth;
    this.cardGeometry = new THREE.BoxGeometry(w, this.cardHeight, d);

    this.woodenShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCardTexture: { value: this.cardTexture },
        uBumpMap: { value: this.woodBumpMap },
        uWoodColor: { value: new THREE.Color('#4a150b') },
        uGrainColor: { value: new THREE.Color('#2b0a04') },
        uSpecularColor: { value: new THREE.Color('#ffaa88') },
        uRoughness: { value: 0.35 },
        uGrainFreq: { value: 12.0 },
        uGoldInlay: { value: 0.6 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform sampler2D uCardTexture;
        uniform sampler2D uBumpMap;
        uniform vec3 uWoodColor;
        uniform vec3 uGrainColor;
        uniform vec3 uSpecularColor;
        uniform float uRoughness;
        uniform float uGrainFreq;
        uniform float uGoldInlay;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vec4 texColor = texture2D(uCardTexture, vUv);
          vec3 bump = texture2D(uBumpMap, vUv * vec2(1.0, 3.0)).rgb - 0.5;
          vec3 N = normalize(vNormal + bump * 0.25);

          // Wood Grain Rings Shader Formula
          float ring = sin(length(vUv - vec2(0.5)) * uGrainFreq * 10.0 + bump.r * 4.0);
          vec3 woodBase = mix(uWoodColor, uGrainColor, smoothstep(-0.5, 0.5, ring));

          // Blinn-Phong Specular Varnish Shine
          vec3 V = normalize(vViewPosition);
          vec3 L = normalize(vec3(3.0, 5.0, 6.0));
          vec3 H = normalize(L + V);

          float NdotH = max(dot(N, H), 0.0);
          float varnishGain = pow(NdotH, (1.0 - uRoughness) * 128.0);
          vec3 varnishHighlight = uSpecularColor * varnishGain * 1.8;

          // Gold Inlay Shimmer Pass
          float goldFresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          vec3 goldInlay = vec3(1.0, 0.84, 0.0) * goldFresnel * uGoldInlay;

          vec3 finalColor = mix(woodBase, texColor.rgb, 0.65) + varnishHighlight + goldInlay;
          gl_FragColor = vec4(finalColor, texColor.a);
        }
      `,
      side: THREE.DoubleSide
    });

    const sideMat = new THREE.MeshStandardMaterial({ color: 0x4a150b, roughness: 0.6 });
    const backMat = new THREE.MeshStandardMaterial({ color: 0x1f1008, roughness: 0.7 });

    this.materials = [
      sideMat, sideMat, sideMat, sideMat,
      this.woodenShaderMat, backMat
    ];

    this.cardMesh = new THREE.Mesh(this.cardGeometry, this.materials);
    this.group.add(this.cardMesh);
  }

  onParamsUpdated() {
    super.onParamsUpdated();
    if (!this.woodenShaderMat) return;

    const uniforms = this.woodenShaderMat.uniforms;
    const presetKey = this.params.woodPreset || 'mahogany';
    const preset = WoodenCardEffect.WOOD_TYPES[presetKey] || WoodenCardEffect.WOOD_TYPES.mahogany;

    uniforms.uWoodColor.value.set(preset.color);
    uniforms.uGrainColor.value.set(preset.grain);
    uniforms.uSpecularColor.value.set(preset.specular);

    uniforms.uRoughness.value = this.params.varnishGloss !== undefined ? (1.0 - this.params.varnishGloss) : 0.35;
    uniforms.uGrainFreq.value = this.params.grainFrequency || 12.0;
    uniforms.uGoldInlay.value = this.params.goldInlay !== undefined ? this.params.goldInlay : 0.6;
  }

  onTextureUpdated(texture) {
    super.onTextureUpdated(texture);
    if (this.woodenShaderMat) {
      this.woodenShaderMat.uniforms.uCardTexture.value = texture;
    }
  }

  update(time, delta) {
    if (this.woodenShaderMat) {
      this.woodenShaderMat.uniforms.uTime.value = time;
    }
  }
}
