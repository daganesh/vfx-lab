import * as THREE from 'three';

export class BaseEffect {
  static isAbstract = true;

  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.params = {};

    this.setupBackdropAnchor();
  }

  /**
   * Adds a subtle dark backdrop plane behind standalone particle/VFX systems
   * so additive blending and soft particles render brightly without disappearing.
   */
  setupBackdropAnchor() {
    const backdropGeo = new THREE.PlaneGeometry(12, 12);
    const backdropMat = new THREE.MeshBasicMaterial({
      color: 0x080c14,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });

    this.backdropMesh = new THREE.Mesh(backdropGeo, backdropMat);
    this.backdropMesh.position.z = -0.5;
    this.group.add(this.backdropMesh);
  }

  static getParameterSchema() {
    return [];
  }

  onParamsUpdated() {}
  onTextureUpdated(texture) {}
  update(time, delta) {}

  destroy() {
    this.scene.remove(this.group);
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
