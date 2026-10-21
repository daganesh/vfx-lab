import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

export class CardFlip3DEffect extends BaseEffect {
  static id = 'card-flip-3d';
  static label = '🔄 Advanced 3D Card Flip';

  static getParameterSchema() {
    return [
      { name: 'flipSpeed', label: 'Rotation Speed', min: 0.2, max: 5.0, step: 0.1, default: 1.8 },
      { name: 'flipAxis', label: 'Flip Axis (0=Y, 1=X, 2=Z)', min: 0, max: 2, step: 1, default: 0 },
      { name: 'shadowOpacity', label: 'Shadow Opacity', min: 0.0, max: 1.0, step: 0.05, default: 0.5 },
      { name: 'perspectiveDistortion', label: 'Camera Lens FOV', min: 20, max: 90, step: 5, default: 50 }
    ];
  }

  constructor(stage) {
    super(stage);
    this.angle = 0;

    // Soft blob shadow on the "floor" under the card.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);

    this.shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 2.4),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false })
    );
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = -2.2;
    this.group.add(this.shadowMesh);
  }

  onParamsUpdated() {
    this.stage.cardPivot.rotation.set(0, 0, 0);
    this.shadowMesh.material.opacity = this.params.shadowOpacity;
    this.stage.setCameraOverride(this, { fov: this.params.perspectiveDistortion });
  }

  update(time, delta) {
    this.angle += delta * this.params.flipSpeed;
    const r = this.stage.cardPivot.rotation;
    const axis = Math.round(this.params.flipAxis);
    if (axis === 0) r.y = this.angle;
    else if (axis === 1) r.x = this.angle;
    else r.z = this.angle;

    // Shadow narrows when the card is edge-on.
    const s = 0.7 + 0.3 * Math.abs(Math.cos(this.angle));
    this.shadowMesh.scale.set(s, s, 1);
  }

  destroy() {
    this.stage.cardPivot.rotation.set(0, 0, 0);
    this.shadowMesh.material.map.dispose();
    super.destroy();
  }
}
