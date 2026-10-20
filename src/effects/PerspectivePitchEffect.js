import * as THREE from 'three';
import { CardEffect } from './CardEffect.js';

export class PerspectivePitchEffect extends CardEffect {
  static id = 'perspective-pitch';
  static label = '📐 Tactical Perspective Pitch';

  static getParameterSchema() {
    return [
      ...CardEffect.getParameterSchema(),
      { name: 'pitchAngle', label: 'Field Tilt Angle (°)', min: 15, max: 80, step: 1, default: 45 },
      { name: 'pitchGlow', label: 'Line Glow Intensity', min: 0.2, max: 2.0, step: 0.1, default: 1.0 }
    ];
  }

  constructor(scene, camera, renderer) {
    super(scene, camera, renderer);

    const pitchGeo = new THREE.PlaneGeometry(8, 12);
    const pitchMat = new THREE.MeshStandardMaterial({ color: 0x0f2d1a, roughness: 0.8 });
    this.pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
    this.pitchMesh.rotation.x = -Math.PI / 2;
    this.pitchMesh.position.y = -1.8;
    this.group.add(this.pitchMesh);

    const grid = new THREE.GridHelper(12, 12, 0x00e5ff, 0x1b4332);
    grid.position.y = -1.79;
    this.group.add(grid);
  }

  onParamsUpdated() {
    super.onParamsUpdated();
    const rad = ((this.params.pitchAngle || 45) * Math.PI) / 180;
    this.camera.position.set(0, Math.sin(rad) * 8.0, Math.cos(rad) * 8.0);
    this.camera.lookAt(0, 0, 0);
  }
}
