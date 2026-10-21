import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

export class PerspectivePitchEffect extends BaseEffect {
  static id = 'perspective-pitch';
  static label = '📐 Tactical Perspective Pitch';
  static category = 'camera';

  static getParameterSchema() {
    return [
      { name: 'pitchAngle', label: 'Camera Tilt Angle (°)', min: 15, max: 80, step: 1, default: 45 },
      { name: 'pitchGlow', label: 'Line Glow Intensity', min: 0.2, max: 2.0, step: 0.1, default: 1.0 },
      { name: 'cameraSway', label: 'Camera Sway', min: 0, max: 3, step: 0.1, default: 1.0 }
    ];
  }

  constructor(stage) {
    super(stage);

    const turf = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshStandardMaterial({ color: 0x0f2d1a, roughness: 0.8 })
    );
    turf.rotation.x = -Math.PI / 2;
    turf.position.y = -1.8;
    this.group.add(turf);

    this.grid = new THREE.GridHelper(12, 12, 0x00e5ff, 0x1b4332);
    this.grid.position.y = -1.79;
    this.group.add(this.grid);

    this.cameraPos = new THREE.Vector3();
    this.lookAt = new THREE.Vector3();
  }

  onParamsUpdated() {
    this.grid.material.color.setScalar(this.params.pitchGlow); // multiplies the vertex colours
    this.update(0);
  }

  update(time) {
    const rad = (this.params.pitchAngle * Math.PI) / 180;
    this.cameraPos.set(
      Math.sin(time * 0.2) * this.params.cameraSway * 1.5,
      Math.sin(rad) * 8.0,
      Math.cos(rad) * 8.0
    );
    this.stage.setCameraOverride(this, { position: this.cameraPos, lookAt: this.lookAt });
  }
}
