import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

// Pulls the layers of a layered card apart: each one floats at its own depth in
// front of the card and slides against the others as you move the pointer over
// the view (or, when idle, as the card gently sways). Real perspective parallax
// also comes for free when the card is dragged or flipped, because the layers are
// physically separated in z. Needs a card with layers (see core/cards.js).
export class LayerParallaxEffect extends BaseEffect {
  static id = 'layer-parallax';
  static label = '🎞️ Layer Parallax';
  static category = 'card';
  static attach = 'card';
  static requiresLayers = true;

  static getParameterSchema() {
    return [
      { name: 'depthSpread', label: 'Layer Separation (z)', min: 0, max: 0.8, step: 0.02, default: 0.3 },
      { name: 'parallax', label: 'Parallax Strength', min: 0, max: 3, step: 0.05, default: 1.0 },
      { name: 'followPointer', label: 'Follow Pointer', type: 'boolean', default: true },
      { name: 'idleSway', label: 'Idle Sway', min: 0, max: 1.5, step: 0.05, default: 0.7 },
      { name: 'shadow', label: 'Drop Shadows', min: 0, max: 1, step: 0.05, default: 0.6 },
      { name: 'ballFloat', label: 'Ball Float', min: 0, max: 1, step: 0.05, default: 0.5 }
    ];
  }

  constructor(stage) {
    super(stage);
    this.layerSet = null;
    this.meshes = [];
    this.tilt = new THREE.Vector2();
    this.target = new THREE.Vector2();
    this.lastPointer = -Infinity;

    this.onPointerMove = e => {
      const r = this.stage.renderer.domElement.getBoundingClientRect();
      this.target.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
      this.lastPointer = performance.now();
    };
    window.addEventListener('pointermove', this.onPointerMove);
  }

  clearMeshes() {
    this.meshes.forEach(({ mesh }) => {
      this.group.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose(); // textures belong to the stage
    });
    this.meshes = [];
  }

  build(layerSet) {
    this.clearMeshes();
    this.layerSet = layerSet;
    if (!layerSet) return;
    const byId = Object.fromEntries(layerSet.items.map(l => [l.id, l]));
    layerSet.items.forEach((layer, order) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: layer.texture,
          color: layer.shadowOf ? 0x000000 : 0xffffff,
          transparent: true,
          depthWrite: false,
          toneMapped: false
        })
      );
      mesh.renderOrder = 10 + order;
      mesh.userData = { layer, order, owner: layer.shadowOf ? byId[layer.shadowOf] : null };
      this.group.add(mesh);
      this.meshes.push({ mesh, layer, order });
    });
  }

  update(time, delta) {
    if (this.stage.layers !== this.layerSet) this.build(this.stage.layers);
    if (!this.layerSet) return;

    const p = this.params;
    // Pointer drives the tilt; after a pause it hands over to a slow sway.
    const idle = !p.followPointer || performance.now() - this.lastPointer > 2500;
    if (idle) this.target.set(Math.sin(time * 0.8) * 0.8 * p.idleSway, Math.cos(time * 0.55) * 0.5 * p.idleSway);
    this.tilt.lerp(this.target, 1 - Math.exp(-delta * 6));

    const { cardWidth, cardDepth } = this.stage.params;
    const h = this.stage.cardHeight;
    const z0 = cardDepth / 2 + 0.004;
    const unit = 0.16 * p.parallax;
    const float = Math.sin(time * 1.6) * 0.5 * p.ballFloat;

    this.meshes.forEach(({ mesh, layer, order }) => {
      const d = layer.depth;
      // A shadow sits on the layer below its owner and trails it, offset away from the light.
      const shadow = !!layer.shadowOf;
      const lift = shadow ? 0.35 : 1;
      let x = this.tilt.x * unit * d * lift;
      let y = this.tilt.y * unit * d * lift;
      let z = z0 + order * 0.002 + d * p.depthSpread * (shadow ? 0.2 : 1);
      if (shadow) { x += 0.02 + d * 0.05; y -= 0.03 + d * 0.06; }
      if (layer.id === 'ball' || layer.shadowOf === 'ball') y += float * 0.08 * (shadow ? 0.3 : 1);
      mesh.position.set(x, y, z);
      mesh.scale.set(cardWidth, h, 1);
      mesh.material.opacity = shadow ? p.shadow : 1;
      mesh.visible = !shadow || p.shadow > 0;
    });
  }

  destroy() {
    window.removeEventListener('pointermove', this.onPointerMove);
    this.clearMeshes();
    super.destroy();
  }
}
