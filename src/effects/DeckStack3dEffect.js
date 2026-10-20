import * as THREE from 'three';
import { CardEffect } from './CardEffect.js';

export class DeckStack3DEffect extends CardEffect {
  static id = 'deck-stack-3d';
  static label = '🎴 3D Card Deck Stack';

  static getParameterSchema() {
    return [
      ...CardEffect.getParameterSchema(),
      { name: 'deckSize', label: 'Stack Depth (Cards)', min: 3, max: 25, step: 1, default: 12 },
      { name: 'cardSpacing', label: 'Card Thickness Offset', min: 0.01, max: 0.15, step: 0.01, default: 0.04 },
      { name: 'fanAngle', label: 'Fan Out Angle (°)', min: 0, max: 45, step: 1, default: 15 }
    ];
  }

  constructor(scene, camera, renderer) {
    super(scene, camera, renderer);
    this.camera.position.set(0, 0, 7.5);
    this.deckMeshes = [];
    this.buildDeck();
  }

  buildDeck() {
    this.deckMeshes.forEach(m => this.group.remove(m));
    this.deckMeshes = [];

    const count = this.params.deckSize || 12;
    const spacing = this.params.cardSpacing || 0.04;
    const fan = ((this.params.fanAngle || 15) * Math.PI) / 180;
    const w = this.params.cardWidth || 2.5;

    const cardGeo = new THREE.BoxGeometry(w, 3.5, 0.04);

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(cardGeo, this.materials);
      mesh.position.set(-i * spacing * 0.5, -i * spacing * 0.3, -i * spacing);
      mesh.rotation.z = (i / count) * fan;
      this.deckMeshes.push(mesh);
      this.group.add(mesh);
    }
  }

  onParamsUpdated() {
    super.onParamsUpdated();
    this.buildDeck();
  }
}
