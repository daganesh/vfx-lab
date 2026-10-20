import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

export class CardEffect extends BaseEffect {
  static getParameterSchema() {
    return [
      { name: 'cardWidth', label: 'Card Aspect Width', min: 1.5, max: 4.0, step: 0.1, default: 2.5 },
      { name: 'cardDepth', label: 'Card 3D Thickness', min: 0.01, max: 0.3, step: 0.01, default: 0.05 },
      { name: 'dragRotationSensitivity', label: 'Mouse Drag Sensitivity', min: 0.1, max: 2.0, step: 0.1, default: 1.0 }
    ];
  }

  constructor(scene, camera, renderer) {
    super(scene, camera, renderer);

    this.cardWidth = 2.5;
    this.cardHeight = 3.5;
    this.cardDepth = 0.05;

    this.createSharedCardMesh();
    this.setup3DragRotation();
  }

  createSharedCardMesh() {
    // Add lighting so MeshStandardMaterial is visible
    if (!this.lightsAdded) {
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
      dirLight.position.set(5, 5, 7);
      this.group.add(ambientLight);
      this.group.add(dirLight);
      this.lightsAdded = true;
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
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 12;
      ctx.strokeRect(10, 10, 492, 696);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('DRAFT HEROES', 110, 80);
      ctx.fillStyle = '#00bcd4';
      ctx.fillRect(40, 120, 432, 400);
      ctx.fillStyle = '#ffffff';
      ctx.font = '28px sans-serif';
      ctx.fillText('⚽ ACTION CARD', 130, 320);

      this.cardTexture = new THREE.CanvasTexture(canvas);
    }

    const sideMat = new THREE.MeshStandardMaterial({ color: 0x00bcd4, metalness: 0.3, roughness: 0.4 });
    this.frontMat = new THREE.MeshStandardMaterial({ map: this.cardTexture, transparent: true, opacity: 1.0 });
    const backMat = new THREE.MeshStandardMaterial({ color: 0x0a1128 });

    this.materials = [sideMat, sideMat, sideMat, sideMat, this.frontMat, backMat];
    this.cardMesh = new THREE.Mesh(this.cardGeometry, this.materials);
    this.group.add(this.cardMesh);
  }

  setup3DragRotation() {
    this.isDragging = false;
    this.previousPointerPosition = { x: 0, y: 0 };

    this.onPointerDown = (e) => {
      this.isDragging = true;
      this.previousPointerPosition = { x: e.clientX, y: e.clientY };
    };

    this.onPointerMove = (e) => {
      if (!this.isDragging || !this.cardMesh) return;
      const deltaX = e.clientX - this.previousPointerPosition.x;
      const deltaY = e.clientY - this.previousPointerPosition.y;

      const sens = (this.params.dragRotationSensitivity || 1.0) * 0.01;
      this.cardMesh.rotation.y += deltaX * sens;
      this.cardMesh.rotation.x += deltaY * sens;

      if (e.shiftKey) {
        this.cardMesh.rotation.z += (deltaX + deltaY) * sens * 0.5;
      }

      this.previousPointerPosition = { x: e.clientX, y: e.clientY };
    };

    this.onPointerUp = () => {
      this.isDragging = false;
    };

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  onTextureUpdated(texture) {
    this.cardTexture = texture;
    if (this.frontMat) {
      this.frontMat.map = texture;
      this.frontMat.needsUpdate = true;
    }
  }

  onParamsUpdated() {
    this.createSharedCardMesh();
  }

  destroy() {
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    super.destroy();
  }
}
