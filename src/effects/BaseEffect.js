import * as THREE from 'three';

// Effects are layers on a shared Stage.
//   static attach = 'card'  -> group is a child of the card pivot (moves/flips with the card)
//   static attach = 'world' -> group is a child of the scene (particles, pitch, bolts)
export class BaseEffect {
  static attach = 'world';
  static category = 'card';

  static getParameterSchema() {
    return [];
  }

  constructor(stage) {
    this.stage = stage;
    this.params = {};
    this.constructor.getParameterSchema().forEach(item => { this.params[item.name] = item.default; });

    this.group = new THREE.Group();
    this.parent = this.constructor.attach === 'card' ? stage.cardPivot : stage.scene;
    this.parent.add(this.group);
  }

  onParamsUpdated() {}
  update(time, delta) {}

  destroy() {
    this.stage.clearCameraOverride(this);
    this.parent.remove(this.group);
    this.group.traverse(child => {
      if (child.geometry && !child.geometry.userData.shared) child.geometry.dispose();
      const mats = Array.isArray(child.material) ? child.material : child.material ? [child.material] : [];
      mats.forEach(m => { if (!m.userData.shared) m.dispose(); });
    });
  }
}
