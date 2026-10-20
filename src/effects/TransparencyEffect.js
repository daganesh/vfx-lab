import { CardEffect } from './CardEffect.js';

export class TransparencyEffect extends CardEffect {
  static id = 'transparency';
  static label = '👻 Transparency & Glass';

  static getParameterSchema() {
    return [
      ...CardEffect.getParameterSchema(),
      { name: 'cardOpacity', label: 'Card Alpha Opacity', min: 0.0, max: 1.0, step: 0.05, default: 0.35 }
    ];
  }

  constructor(scene, camera, renderer) {
    super(scene, camera, renderer);
    this.camera.position.set(0, 0, 6.5);
  }

  onParamsUpdated() {
    super.onParamsUpdated();
    if (this.materials) {
      const alpha = this.params.cardOpacity !== undefined ? this.params.cardOpacity : 0.35;
      this.materials.forEach(mat => {
        mat.transparent = true;
        mat.opacity = alpha;
        mat.needsUpdate = true;
      });
    }
  }
}
