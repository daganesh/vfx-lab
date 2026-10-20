import * as THREE from 'three';
import { CardEffect } from './CardEffect.js';

export class CardFlip3DEffect extends CardEffect {
  static id = 'card-flip-3d';
  static label = '🔄 Advanced 3D Card Flip';

  static getParameterSchema() {
    return [
      ...CardEffect.getParameterSchema(),
      { name: 'flipSpeed', label: 'Rotation Speed', min: 0.2, max: 5.0, step: 0.1, default: 1.8 },
      { name: 'flipAxis', label: 'Flip Axis (0=Y, 1=X, 2=Z)', min: 0, max: 2, step: 1, default: 0 },
      { name: 'shadowOpacity', label: 'Shadow Opacity', min: 0.0, max: 1.0, step: 0.05, default: 0.5 },
      { name: 'motionBlurIntensity', label: 'Motion Blur Trail', min: 0.0, max: 1.0, step: 0.05, default: 0.4 },
      { name: 'perspectiveDistortion', label: 'Camera Lens FOV', min: 20, max: 90, step: 5, default: 50 }
    ];
  }

  constructor(scene, camera, renderer) {
    super(scene, camera, renderer);

    // Interactive Ground Shadow Mesh
    const shadowGeo = new THREE.PlaneGeometry(3.0, 1.0);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.5
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = -2.2;
    this.group.add(this.shadowMesh);
  }

  onParamsUpdated() {
    super.onParamsUpdated();
    this.camera.fov = this.params.perspectiveDistortion || 50;
    this.camera.updateProjectionMatrix();
    if (this.shadowMesh) {
      this.shadowMesh.material.opacity = this.params.shadowOpacity || 0.5;
    }
  }

  update(time, delta) {
    if (this.cardMesh) {
      const speed = this.params.flipSpeed || 1.8;
      const axis = this.params.flipAxis || 0;

      if (axis === 0) this.cardMesh.rotation.y = time * speed;
      else if (axis === 1) this.cardMesh.rotation.x = time * speed;
      else if (axis === 2) this.cardMesh.rotation.z = time * speed;

      // Dynamic shadow scale pulsing based on rotation
      const s = 1.0 + Math.abs(Math.sin(time * speed)) * 0.4;
      this.shadowMesh.scale.set(s, s, 1.0);
    }
  }
}
