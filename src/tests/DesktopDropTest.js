import * as THREE from 'three';
import { BaseEffect } from '../effects/BaseEffect.js';
import ronaldoCardAsset from '../assets/ronaldo_card.webp';

export class DesktopDropTest extends BaseEffect {
  static id = 'desktop-drop-test';
  static label = '🎲 Desktop Card Drop Test';

  static getParameterSchema() {
    return [
      { name: 'dropInterval', label: '1. Drop Frequency (Sec)', min: 0.2, max: 3.0, step: 0.1, default: 0.8 },
      { name: 'fadeTimeout', label: '1. Card Fade Timeout (Sec)', min: 1.0, max: 10.0, step: 0.5, default: 4.0 },
      { name: 'desktopColor', label: '2. Desktop Flat Color', type: 'color', default: '#556b2f' }, // Olive Green
      { name: 'cameraPerspective', label: '2. Camera Perspective (°)', min: 20, max: 75, step: 1, default: 45 },
      { name: 'cardScale', label: '2. Card Scale Factor', min: 0.5, max: 2.0, step: 0.1, default: 1.0 },
      { name: 'shadowFuzziness', label: '3. Soft Shadow Spread', min: 0.5, max: 5.0, step: 0.2, default: 2.5 }
    ];
  }

  constructor(scene, camera, renderer) {
    super(scene, camera, renderer);

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.cardsOnTable = [];
    this.droppingCards = [];
    this.dropTimer = 0;
    this.tableHeight = 0;

    this.setupCameraPerspective();
    this.setupDesktopAndLighting();
    this.loadRonaldoTexture();
  }

  setupCameraPerspective() {
    const angleRad = ((this.params.cameraPerspective || 45) * Math.PI) / 180;
    const distance = 9.5;

    this.camera.fov = 50;
    this.camera.position.set(0, Math.sin(angleRad) * distance, Math.cos(angleRad) * distance);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
  }

  setupDesktopAndLighting() {
    // 1. Olive Green Desktop Mesh
    const deskGeo = new THREE.PlaneGeometry(28, 20);
    this.deskMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.params.desktopColor || '#556b2f'),
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    this.desktopMesh = new THREE.Mesh(deskGeo, this.deskMat);
    this.desktopMesh.rotation.x = -Math.PI / 2;
    this.desktopMesh.position.y = this.tableHeight;
    this.desktopMesh.receiveShadow = true;
    
    this.deskMat.needsUpdate = true;
    this.group.add(this.desktopMesh);

    // 2. Ambient & Directional Shadow Lights
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.group.add(this.ambientLight);

    this.shadowLight = new THREE.DirectionalLight(0xffffff, 1.8);
    this.shadowLight.position.set(6, 12, 6);
    this.shadowLight.castShadow = true;
    
    this.shadowLight.target.position.set(0, 0, 0);
    this.group.add(this.shadowLight.target);

    this.shadowLight.shadow.mapSize.width = 2048;
    this.shadowLight.shadow.mapSize.height = 2048;
    this.shadowLight.shadow.camera.near = 0.5;
    this.shadowLight.shadow.camera.far = 30;
    this.shadowLight.shadow.camera.left = -12;
    this.shadowLight.shadow.camera.right = 12;
    this.shadowLight.shadow.camera.top = 12;
    this.shadowLight.shadow.camera.bottom = -12;
    this.shadowLight.shadow.radius = this.params.shadowFuzziness || 2.5;

    this.group.add(this.shadowLight);
  }

  loadRonaldoTexture() {
    const loader = new THREE.TextureLoader();
    loader.load(
      ronaldoCardAsset,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        this.cardTexture = tex;
      },
      undefined,
      () => {
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
        ctx.fillText('RONALDO 95', 130, 80);
        this.cardTexture = new THREE.CanvasTexture(canvas);
        this.cardTexture.colorSpace = THREE.SRGBColorSpace;
      }
    );
  }

  /**
   * Builds a dynamic shader material for dropped cards (Holographic Foil, Gold Metal, or Electric Aura)
   */
  createRandomCardFrontShader() {
    const effectTypes = ['holographic', 'goldMetal', 'electricAura'];
    const chosenType = effectTypes[Math.floor(Math.random() * effectTypes.length)];

    if (chosenType === 'holographic') {
      return new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uTexture: { value: this.cardTexture },
          uOpacity: { value: 1.0 }
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
          uniform sampler2D uTexture;
          uniform float uOpacity;
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vViewPosition;

          void main() {
            vec4 texColor = texture2D(uTexture, vUv);
            vec3 viewDir = normalize(vViewPosition);
            float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.0);
            vec3 rainbow = 0.5 + 0.5 * cos(uTime * 2.0 + vUv.xyx * 8.0 + vec3(0.0, 2.0, 4.0));
            gl_FragColor = vec4(texColor.rgb + (rainbow * fresnel * 1.4), texColor.a * uOpacity);
          }
        `,
        transparent: true
      });
    } else if (chosenType === 'goldMetal') {
      return new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uTexture: { value: this.cardTexture },
          uOpacity: { value: 1.0 }
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
          uniform sampler2D uTexture;
          uniform float uOpacity;
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec3 vViewPosition;

          void main() {
            vec4 texColor = texture2D(uTexture, vUv);
            vec3 viewDir = normalize(vViewPosition);
            float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);
            vec3 goldTint = vec3(1.0, 0.85, 0.3) * fresnel * 2.0;
            gl_FragColor = vec4(texColor.rgb + goldTint, texColor.a * uOpacity);
          }
        `,
        transparent: true
      });
    } else {
      return new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uTexture: { value: this.cardTexture },
          uOpacity: { value: 1.0 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform sampler2D uTexture;
          uniform float uOpacity;
          varying vec2 vUv;

          void main() {
            vec4 texColor = texture2D(uTexture, vUv);
            float scanline = sin(vUv.y * 60.0 + uTime * 8.0) * 0.25;
            vec3 cyanGlow = vec3(0.0, 0.9, 1.0) * scanline;
            gl_FragColor = vec4(texColor.rgb + cyanGlow, texColor.a * uOpacity);
          }
        `,
        transparent: true
      });
    }
  }

  spawnDroppingCard() {
    if (!this.cardTexture) return;

    const scale = this.params.cardScale || 1.0;
    const cardW = 1.8 * scale;
    const cardH = 2.5 * scale;
    const cardThick = 0.08 * scale;

    const cardGeo = new THREE.BoxGeometry(cardW, cardH, cardThick);

    const sideMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });
    const frontMat = this.createRandomCardFrontShader();
    const backMat = new THREE.MeshStandardMaterial({ color: 0x0a1128, transparent: true });

    const materials = [sideMat, sideMat, sideMat, sideMat, frontMat, backMat];
    const cardGroup = new THREE.Group();
    const cardMesh = new THREE.Mesh(cardGeo, materials);
    cardMesh.castShadow = true;
    cardMesh.receiveShadow = true;
    cardGroup.add(cardMesh);

    const targetX = (Math.random() - 0.5) * 16.0;
    const targetZ = (Math.random() - 0.5) * 10.0;
    const targetRotZ = (Math.random() - 0.5) * Math.PI * 1.5;

    cardGroup.position.set(targetX, 6.0, targetZ);
    cardGroup.rotation.set(-Math.PI / 2, 0, targetRotZ);

    this.group.add(cardGroup);

    this.droppingCards.push({
      group: cardGroup,
      mesh: cardMesh,
      frontMat: frontMat,
      targetY: this.tableHeight + cardThick / 2.0,
      velocityY: 0.0,
      age: 0.0,
      landed: false
    });
  }

  onParamsUpdated() {
    this.setupCameraPerspective();

    if (this.deskMat) {
      this.deskMat.color.set(this.params.desktopColor || '#556b2f');
      this.deskMat.needsUpdate = true;
    }
  }

  update(time, delta) {
    const interval = this.params.dropInterval || 0.8;
    this.dropTimer += delta;

    if (this.dropTimer >= interval) {
      this.spawnDroppingCard();
      this.dropTimer = 0;
    }

    const gravity = 22.0;
    const fadeTimeout = this.params.fadeTimeout || 4.0;

    for (let i = this.droppingCards.length - 1; i >= 0; i--) {
      const item = this.droppingCards[i];

      if (item.frontMat && item.frontMat.uniforms && item.frontMat.uniforms.uTime) {
        item.frontMat.uniforms.uTime.value = time;
      }

      if (!item.landed) {
        item.velocityY += gravity * delta;
        item.group.position.y -= item.velocityY * delta;

        if (item.group.position.y <= item.targetY) {
          item.group.position.y = item.targetY;
          item.landed = true;
          this.cardsOnTable.push(item);
          this.droppingCards.splice(i, 1);
        }
      }
    }

    for (let i = this.cardsOnTable.length - 1; i >= 0; i--) {
      const item = this.cardsOnTable[i];
      item.age += delta;

      if (item.frontMat && item.frontMat.uniforms && item.frontMat.uniforms.uTime) {
        item.frontMat.uniforms.uTime.value = time;
      }

      if (item.age >= fadeTimeout) {
        const fadeProgress = (item.age - fadeTimeout) / 1.5;
        const opacity = Math.max(0.0, 1.0 - fadeProgress);

        if (item.frontMat.uniforms && item.frontMat.uniforms.uOpacity) {
          item.frontMat.uniforms.uOpacity.value = opacity;
        }

        if (opacity <= 0) {
          this.group.remove(item.group);
          item.mesh.geometry.dispose();
          this.cardsOnTable.splice(i, 1);
        }
      }
    }
  }

  clearTable() {
    const all = [...this.cardsOnTable, ...this.droppingCards];
    for (const item of all) {
      this.group.remove(item.group);
      if (item.mesh.geometry) item.mesh.geometry.dispose();
    }
    this.cardsOnTable = [];
    this.droppingCards = [];
  }

  destroy() {
    this.clearTable();
    this.renderer.shadowMap.enabled = false;
    super.destroy();
  }
}
