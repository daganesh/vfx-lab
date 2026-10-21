import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

export class DeckStack3DEffect extends BaseEffect {
  static id = 'deck-stack-3d';
  static label = '🎴 3D Card Deck Stack';
  static attach = 'card';

  static getParameterSchema() {
    return [
      { name: 'deckSize', label: 'Stack Depth (Cards)', min: 3, max: 25, step: 1, default: 12 },
      { name: 'cardSpacing', label: 'Card Thickness Offset', min: 0.01, max: 0.15, step: 0.01, default: 0.04 },
      { name: 'fanAngle', label: 'Fan Out Angle (°)', min: 0, max: 45, step: 1, default: 15 }
    ];
  }

  onParamsUpdated() {
    this.buildDeck();
  }

  buildDeck() {
    this.deckMeshes?.forEach(m => this.group.remove(m));
    this.cardGeo?.dispose();

    const { cardWidth, cardDepth } = this.stage.params;
    this.builtFor = `${cardWidth}|${cardDepth}`;
    this.cardGeo = new THREE.BoxGeometry(cardWidth, this.stage.cardHeight, cardDepth);
    this.deckMeshes = [];

    const count = this.params.deckSize;
    const spacing = this.params.cardSpacing;
    const fan = (this.params.fanAngle * Math.PI) / 180;

    // The base card is the top of the deck; these sit behind it.
    for (let i = 1; i < count; i++) {
      const mesh = new THREE.Mesh(this.cardGeo, this.stage.materials);
      mesh.position.set(-i * spacing * 0.5, -i * spacing * 0.3, -i * (spacing + cardDepth));
      mesh.rotation.z = (i / count) * fan;
      this.deckMeshes.push(mesh);
      this.group.add(mesh);
    }
  }

  update() {
    const { cardWidth, cardDepth } = this.stage.params;
    if (this.builtFor !== `${cardWidth}|${cardDepth}`) this.buildDeck();
  }
}
