import { BaseEffect } from './BaseEffect.js';

export class TransparencyEffect extends BaseEffect {
  static id = 'transparency';
  static label = '👻 Transparency & Glass';

  static getParameterSchema() {
    return [
      { name: 'cardOpacity', label: 'Card Alpha Opacity', min: 0.0, max: 1.0, step: 0.05, default: 0.35 }
    ];
  }

  onParamsUpdated() {
    const alpha = this.params.cardOpacity;
    this.stage.materials.forEach(mat => {
      mat.transparent = alpha < 1;
      mat.depthWrite = alpha >= 1;
      mat.opacity = alpha;
      mat.needsUpdate = true;
    });
  }

  destroy() {
    this.stage.materials.forEach(mat => {
      mat.transparent = false;
      mat.depthWrite = true;
      mat.opacity = 1;
      mat.needsUpdate = true;
    });
    super.destroy();
  }
}
