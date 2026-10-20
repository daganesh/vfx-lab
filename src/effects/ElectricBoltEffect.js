import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

export class ElectricBoltEffect extends BaseEffect {
  static id = 'electric-bolt';
  static label = '⚡ Electric Bolt';

  static getParameterSchema() {
    return [
      { name: 'boltWidth', label: 'Lightning Line Width', min: 0.01, max: 0.3, step: 0.01, default: 0.08 },
      { name: 'splits', label: 'Lightning Splits / Branches', min: 1, max: 100, step: 1, default: 15 },
      { name: 'boltColor', label: 'Bolt Core Color', type: 'color', default: '#00e5ff' },
      { name: 'haloColor', label: 'Halo Glow Color', type: 'color', default: '#7c4dff' },
      { name: 'randomness', label: 'Jitter / Randomness', min: 0.05, max: 0.8, step: 0.05, default: 0.3 }
    ];
  }

  constructor(scene, camera, renderer) {
    super(scene, camera, renderer);
    this.camera.position.set(0, 0, 6.5);
    this.buildLightning();
  }

  buildLightning() {
    if (this.linesGroup) this.group.remove(this.linesGroup);
    this.linesGroup = new THREE.Group();

    const splits = this.params.splits || 15;
    const width = this.params.boltWidth || 0.08;
    const noise = this.params.randomness || 0.3;

    const mainStart = new THREE.Vector3(-2.0, -2.5, 0);
    const mainEnd = new THREE.Vector3(2.0, 2.5, 0);

    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.params.boltColor || '#00e5ff'),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });

    // Recursive fractal split branch generation
    const generateBranch = (start, end, depth, currentSplits) => {
      if (depth <= 0) return;

      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      mid.x += (Math.random() - 0.5) * noise * 2.0;
      mid.y += (Math.random() - 0.5) * noise * 2.0;
      mid.z += (Math.random() - 0.5) * noise * 2.0;

      // Build thick ribbon geometry for adjustable line width
      const dir = new THREE.Vector3().subVectors(end, start).normalize();
      const perp = new THREE.Vector3(-dir.y, dir.x, 0).multiplyScalar(width * (depth / 4.0));

      const quadGeo = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        start.x - perp.x, start.y - perp.y, start.z,
        start.x + perp.x, start.y + perp.y, start.z,
        mid.x + perp.x, mid.y + perp.y, mid.z,
        mid.x - perp.x, mid.y - perp.y, mid.z
      ]);
      quadGeo.setIndex([0, 1, 2, 0, 2, 3]);
      quadGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

      this.linesGroup.add(new THREE.Mesh(quadGeo, mat));

      generateBranch(start, mid, depth - 1, currentSplits);
      generateBranch(mid, end, depth - 1, currentSplits);

      // Hierarchical split branching based on `splits` count
      if (Math.random() < currentSplits / 100.0) {
        const sideBranchEnd = mid.clone().add(
          new THREE.Vector3((Math.random() - 0.5) * 2.0, (Math.random() - 0.5) * 2.0, 0)
        );
        generateBranch(mid, sideBranchEnd, depth - 1, currentSplits * 0.5);
      }
    };

    const recursionDepth = Math.min(6, Math.max(2, Math.floor(Math.log2(splits) + 1)));
    generateBranch(mainStart, mainEnd, recursionDepth, splits);

    this.group.add(this.linesGroup);
  }

  onParamsUpdated() {
    this.buildLightning();
  }

  update(time, delta) {
    if (Math.random() > 0.4) {
      this.buildLightning();
    }
  }
}
