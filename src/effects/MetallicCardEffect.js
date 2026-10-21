import * as THREE from 'three';
import { CardEffect } from './CardEffect.js';

export class MetallicCardEffect extends CardEffect {
  static id = 'metallic-card';
  static label = '🥇 Metallic & Shader Customizer';

  static METAL_PRESETS = {
    gold: { color: '#ffd700', specular: '#fff5b8', roughness: 0.25, metalness: 0.95 },
    silver: { color: '#c0c0c0', specular: '#ffffff', roughness: 0.2, metalness: 0.95 },
    bronze: { color: '#cd7f32', specular: '#f5c28b', roughness: 0.35, metalness: 0.85 },
    copper: { color: '#b87333', specular: '#f7c0a1', roughness: 0.3, metalness: 0.9 },
    platinum: { color: '#e5e4e2', specular: '#ffffff', roughness: 0.15, metalness: 0.98 },
    titanium: { color: '#878681', specular: '#d4d4d4', roughness: 0.4, metalness: 0.8 }
  };

  static getParameterSchema() {
    return [
      ...CardEffect.getParameterSchema(),
      // 1. Metal Preset Selection Dropdown
      { 
        name: 'metalPreset', 
        label: '1. Metal Preset', 
        options: {
          'Custom Tint': 'custom',
          'Gold': 'gold',
          'Silver': 'silver',
          'Bronze': 'bronze',
          'Copper': 'copper',
          'Platinum': 'platinum',
          'Titanium': 'titanium'
        }, 
        default: 'custom' 
      },
      { name: 'baseColor', label: 'Custom Base Tint', type: 'color', default: '#002aff' },
      { name: 'specularColor', label: 'Custom Specular Highlight', type: 'color', default: '#ffffff' },

      // 2. Surface Finish Selection Dropdown
      { 
        name: 'surfaceFinish', 
        label: '2. Finish Type', 
        options: {
          'Glossy': 0,
          'Matte': 1,
          'Satin': 2,
          'Brushed Grain': 3,
          'Anodized Shift': 4
        }, 
        default: 0 
      },
      { name: 'roughness', label: 'Surface Roughness', min: 0.05, max: 1.0, step: 0.02, default: 0.2 },
      { name: 'metalness', label: 'Metallic Intensity', min: 0.0, max: 1.0, step: 0.02, default: 0.95 },

      // 3. Reflectivity & Lighting
      { name: 'reflectivity', label: 'Environment Reflectivity', min: 0.0, max: 2.0, step: 0.05, default: 1.35 },
      { name: 'lightIntensity', label: 'Light Specular Gain', min: 0.2, max: 4.0, step: 0.1, default: 2.4 },

      // 4. Holographic Foil Overlay
      { name: 'foilIridescence', label: '4. Holographic Rainbow Foil', min: 0.0, max: 1.5, step: 0.05, default: 0.5 },
      { name: 'foilFrequency', label: 'Foil Spectrum Frequency', min: 1.0, max: 20.0, step: 0.5, default: 13.5 }
    ];
  }

  constructor(scene, camera, renderer) {
    super(scene, camera, renderer);
    this.camera.position.set(0, 0, 6.5);
    this.generateProceduralBumpMap();
  }

  generateProceduralBumpMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 600; i++) {
      const y = Math.random() * 256;
      ctx.fillRect(0, y, 256, 1 + Math.random() * 2);
    }

    this.brushedBumpMap = new THREE.CanvasTexture(canvas);
    this.brushedBumpMap.wrapS = THREE.RepeatWrapping;
    this.brushedBumpMap.wrapT = THREE.RepeatWrapping;
    this.brushedBumpMap.repeat.set(1, 4);
    this.brushedBumpMap.needsUpdate = true;
  }

  createSharedCardMesh() {
    if (this.cardMesh) {
      this.group.remove(this.cardMesh);
      if (this.cardGeometry) this.cardGeometry.dispose();
      if (this.metallicShaderMat) this.metallicShaderMat.dispose();
    }

    const w = this.params.cardWidth || this.cardWidth;
    const d = this.params.cardDepth || this.cardDepth;
    this.cardGeometry = new THREE.BoxGeometry(w, this.cardHeight, d);

    if (!this.cardTexture) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 716;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#121826';
      ctx.fillRect(0, 0, 512, 716);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 14;
      ctx.strokeRect(10, 10, 492, 696);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('MARCO ROSSI', 110, 80);

      ctx.fillStyle = '#1a237e';
      ctx.fillRect(40, 120, 432, 400);
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('⚽ LEGEND PLAYER', 125, 320);

      this.cardTexture = new THREE.CanvasTexture(canvas);
      this.cardTexture.colorSpace = THREE.SRGBColorSpace;
    }

    this.metallicShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCardTexture: { value: this.cardTexture },
        uBumpMap: { value: this.brushedBumpMap },
        uBaseColor: { value: new THREE.Color('#002aff') },
        uSpecularColor: { value: new THREE.Color('#ffffff') },
        uRoughness: { value: 0.2 },
        uMetalness: { value: 0.95 },
        uReflectivity: { value: 1.35 },
        uLightIntensity: { value: 2.4 },
        uFoilIridescence: { value: 0.5 },
        uFoilFrequency: { value: 13.5 },
        uFinishType: { value: 0 }
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
        uniform vec3 uBaseColor;
        uniform vec3 uSpecularColor;
        uniform float uRoughness;
        uniform float uMetalness;
        uniform float uReflectivity;
        uniform float uLightIntensity;
        uniform float uFoilIridescence;
        uniform float uFoilFrequency;
        uniform int uFinishType;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vec4 texColor = texture2D(uCardTexture, vUv);
          vec3 N = normalize(vNormal);

          if (uFinishType == 3) {
            vec3 bump = texture2D(uBumpMap, vUv * vec2(1.0, 4.0)).rgb - 0.5;
            N = normalize(N + bump * 0.2);
          }

          vec3 V = normalize(vViewPosition);
          vec3 L = normalize(vec3(2.0, 4.0, 5.0));
          vec3 H = normalize(L + V);

          float NdotV = max(dot(N, V), 0.0);
          float fresnel = pow(1.0 - NdotV, 3.0);

          float NdotH = max(dot(N, H), 0.0);
          float shininess = (1.0 - uRoughness) * 128.0;
          float specularGain = pow(NdotH, max(1.0, shininess)) * uLightIntensity;

          vec3 rainbow = 0.5 + 0.5 * cos(uTime * 2.0 + vUv.xyx * uFoilFrequency + vec3(0.0, 2.0, 4.0));

          // Multiply color tint over card texture for dynamic coloring
          vec3 metalBase = mix(texColor.rgb, texColor.rgb * uBaseColor, uMetalness);
          vec3 metallicSpecular = mix(uSpecularColor, metalBase, uMetalness) * specularGain * uReflectivity;

          if (uFinishType == 1) { // Matte
            metallicSpecular *= 0.15;
          } else if (uFinishType == 2) { // Satin
            metallicSpecular *= 0.5;
          } else if (uFinishType == 4) { // Anodized
            metalBase *= mix(vec3(1.0), vec3(0.8, 0.2, 0.9), fresnel);
          }

          vec3 finalColor = metalBase + metallicSpecular + (rainbow * fresnel * uFoilIridescence);
          gl_FragColor = vec4(finalColor, texColor.a);
        }
      `,
      side: THREE.DoubleSide
    });

    const sideMat = new THREE.MeshStandardMaterial({ color: 0xcd7f32, metalness: 0.9, roughness: 0.3 });
    const backMat = new THREE.MeshStandardMaterial({ color: 0x0a1128 });

    this.materials = [
      sideMat, sideMat, sideMat, sideMat,
      this.metallicShaderMat, backMat
    ];

    this.cardMesh = new THREE.Mesh(this.cardGeometry, this.materials);
    this.group.add(this.cardMesh);
  }

  onParamsUpdated() {
    super.onParamsUpdated();
    if (!this.metallicShaderMat) return;

    const uniforms = this.metallicShaderMat.uniforms;

    const presetKey = this.params.metalPreset || 'custom';
    let baseCol = new THREE.Color(this.params.baseColor || '#002aff');
    let specCol = new THREE.Color(this.params.specularColor || '#ffffff');
    let rough = this.params.roughness !== undefined ? this.params.roughness : 0.2;
    let metal = this.params.metalness !== undefined ? this.params.metalness : 0.95;

    if (presetKey !== 'custom' && MetallicCardEffect.METAL_PRESETS[presetKey]) {
      const p = MetallicCardEffect.METAL_PRESETS[presetKey];
      baseCol.set(p.color);
      specCol.set(p.specular);
      rough = p.roughness;
      metal = p.metalness;
    }

    uniforms.uBaseColor.value = baseCol;
    uniforms.uSpecularColor.value = specCol;
    uniforms.uRoughness.value = rough;
    uniforms.uMetalness.value = metal;

    uniforms.uFinishType.value = parseInt(this.params.surfaceFinish !== undefined ? this.params.surfaceFinish : 0, 10);
    uniforms.uReflectivity.value = this.params.reflectivity !== undefined ? this.params.reflectivity : 1.35;
    uniforms.uLightIntensity.value = this.params.lightIntensity || 2.4;
    uniforms.uFoilIridescence.value = this.params.foilIridescence !== undefined ? this.params.foilIridescence : 0.5;
    uniforms.uFoilFrequency.value = this.params.foilFrequency || 13.5;
  }

  onTextureUpdated(texture) {
    super.onTextureUpdated(texture);
    if (this.metallicShaderMat) {
      this.metallicShaderMat.uniforms.uCardTexture.value = texture;
    }
  }

  update(time, delta) {
    if (this.metallicShaderMat) {
      this.metallicShaderMat.uniforms.uTime.value = time;
    }
  }
}
