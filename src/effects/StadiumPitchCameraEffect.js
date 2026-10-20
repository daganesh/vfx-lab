import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

export class StadiumPitchCameraEffect extends BaseEffect {
  static id = 'pitch-camera';
  static label = '3. Tactical Pitch & Camera View';

  static getParameterSchema() {
    return [
      { name: 'cameraPitchAngle', label: 'Camera Angle (°)', min: 15, max: 75, step: 1, default: 40 },
      { name: 'fieldGlow', label: 'Line Intensity', min: 0.2, max: 2.0, step: 0.1, default: 1.0 },
      { name: 'pitchColor', label: 'Turf Color', type: 'color', default: '#0d2818' },
      { name: 'lineColor', label: 'Pitch Line Color', type: 'color', default: '#2ec4b6' }
    ];
  }

  constructor(scene, camera, renderer) {
    super(scene, camera, renderer);

    // Create 3D Tactical Field Mesh
    const fieldGeo = new THREE.PlaneGeometry(10, 14);
    this.fieldMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.params.pitchColor || '#0d2818'),
      roughness: 0.6,
      metalness: 0.1
    });

    this.fieldMesh = new THREE.Mesh(fieldGeo, this.fieldMat);
    this.fieldMesh.rotation.x = -Math.PI / 2;
    this.group.add(this.fieldMesh);

    // Pitch Grid Overlay
    const grid = new THREE.GridHelper(14, 14, 0x2ec4b6, 0x1b4332);
    grid.position.y = 0.01;
    this.group.add(grid);

    // Lighting setup
    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(5, 10, 5);
    this.group.add(light);
    this.group.add(new THREE.AmbientLight(0xffffff, 0.4));
  }

  onParamsUpdated() {
    this.fieldMat.color.set(this.params.pitchColor);
  }

  update(time, delta) {
    const angleRad = (this.params.cameraPitchAngle || 40) * (Math.PI / 180);
    const distance = 12;

    this.camera.position.x = Math.sin(time * 0.2) * 1.5;
    this.camera.position.y = Math.sin(angleRad) * distance;
    this.camera.position.z = Math.cos(angleRad) * distance;
    this.camera.lookAt(0, 0, 0);
  }
}
