import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

export class ElectricBoltEffect extends BaseEffect {
  static id = 'electric-bolt';
  static label = '⚡ Evolving Radial Lightning';

  static getParameterSchema() {
    return [
      // Restored Geometry & Branching Controls
      { name: 'mainTrunks', label: '1. Radial Trunks', min: 2, max: 16, step: 1, default: 8 },
      { name: 'sectionLength', label: '1. Base Section Length', min: 0.05, max: 0.8, step: 0.02, default: 0.25 },
      { name: 'sectionLengthNoise', label: '1. Section Length Jitter', min: 0.0, max: 1.0, step: 0.05, default: 0.4 },
      
      { name: 'directionRandomness', label: '2. Direction Randomness', min: 0.05, max: 1.0, step: 0.05, default: 0.35 },
      { name: 'splitChance', label: '2. Split Probability', min: 0.05, max: 0.9, step: 0.05, default: 0.3 },
      { name: 'recursionDepth', label: '2. Fractal Depth', min: 2, max: 6, step: 1, default: 4 },

      // Growth & Decay Controls (Fixes Crowding)
      { name: 'growthSpeed', label: '3. Growth Velocity', min: 0.2, max: 4.0, step: 0.1, default: 1.5 },
      { name: 'tipDecaySpeed', label: '3. Tip Dissipation / Decay', min: 0.2, max: 5.0, step: 0.1, default: 2.2 },

      // Visual Styling & Colors
      { name: 'startWidth', label: 'Source Core Width', min: 0.02, max: 0.4, step: 0.01, default: 0.18 },
      { name: 'color1', label: 'Source Color (Core)', type: 'color', default: '#ffffff' },
      { name: 'color2', label: 'Tip Color (Fade)', type: 'color', default: '#0066ff' },
      { name: 'glowHalo', label: 'Aura Glow Color', type: 'color', default: '#7c4dff' }
    ];
  }

  constructor(scene, camera, renderer) {
    super(scene, camera, renderer);
    this.camera.position.set(0, 0, 7.0);

    this.branches = [];
    this.activeSegments = [];
    this.initEvolvingBranches();
  }

  initEvolvingBranches() {
    if (this.boltGroup) {
      this.group.remove(this.boltGroup);
      this.boltGroup.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }

    this.boltGroup = new THREE.Group();
    this.activeSegments = [];

    const mainTrunks = this.params.mainTrunks || 8;
    const startW = this.params.startWidth || 0.18;
    const col1 = new THREE.Color(this.params.color1 || '#ffffff');
    const col2 = new THREE.Color(this.params.color2 || '#0066ff');
    const haloCol = new THREE.Color(this.params.glowHalo || '#7c4dff');

    this.shaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor1: { value: col1 },
        uColor2: { value: col2 },
        uHaloColor: { value: haloCol }
      },
      vertexShader: `
        attribute float aProgress;
        attribute float aOpacity;
        varying vec2 vUv;
        varying float vProgress;
        varying float vOpacity;

        void main() {
          vUv = uv;
          vProgress = aProgress;
          vOpacity = aOpacity;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uHaloColor;
        varying vec2 vUv;
        varying float vProgress;
        varying float vOpacity;

        void main() {
          float dist = abs(vUv.x - 0.5) * 2.0;
          vec3 baseColor = mix(uColor1, uColor2, vProgress);
          float core = smoothstep(0.3, 0.0, dist);
          float halo = pow(1.0 - dist, 2.0);

          vec3 finalColor = mix(uHaloColor, baseColor, core);
          float alpha = max(core, halo) * vOpacity;

          gl_FragColor = vec4(finalColor * 1.5, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    // Central core flare
    const coreGeo = new THREE.PlaneGeometry(startW * 3.5, startW * 3.5);
    const coreMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: col1 } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uColor; varying vec2 vUv; void main() { float d = length(vUv - vec2(0.5)) * 2.0; float alpha = smoothstep(1.0, 0.0, d); gl_FragColor = vec4(uColor * 2.0, alpha); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.boltGroup.add(new THREE.Mesh(coreGeo, coreMat));

    // Initialize radial evolving branch heads
    this.branches = [];
    const centerPt = new THREE.Vector3(0, 0, 0);

    for (let i = 0; i < mainTrunks; i++) {
      const angle = (i / mainTrunks) * Math.PI * 2.0 + (Math.random() - 0.5) * 0.2;
      const dir = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0).normalize();

      this.branches.push({
        currPt: centerPt.clone(),
        dir: dir,
        progress: 0.0,
        depth: this.params.recursionDepth || 4,
        maxRadius: 3.5 + Math.random() * 0.5
      });
    }

    this.group.add(this.boltGroup);
  }

  onParamsUpdated() {
    this.initEvolvingBranches();
  }

  update(time, delta) {
    if (!this.branches || this.branches.length === 0) return;

    const speed = (this.params.growthSpeed || 1.5) * delta * 2.5;
    const decaySpeed = (this.params.tipDecaySpeed || 2.2) * delta;
    const startW = this.params.startWidth || 0.18;
    const maxDepth = this.params.recursionDepth || 4;
    const splitChance = this.params.splitChance || 0.3;
    const baseSecLen = this.params.sectionLength || 0.25;
    const lenNoise = this.params.sectionLengthNoise || 0.4;
    const dirRandom = this.params.directionRandomness || 0.35;

    // 1. Decay and prune old segments fast to prevent crowding
    for (let j = this.activeSegments.length - 1; j >= 0; j--) {
      const seg = this.activeSegments[j];
      seg.opacity -= decaySpeed;

      if (seg.opacity <= 0) {
        this.boltGroup.remove(seg.mesh);
        seg.mesh.geometry.dispose();
        this.activeSegments.splice(j, 1);
      } else {
        const opacityAttr = seg.mesh.geometry.attributes.aOpacity;
        const opArray = opacityAttr.array;
        opArray[0] = seg.opacity;
        opArray[1] = seg.opacity;
        opArray[2] = seg.opacity * 0.8;
        opArray[3] = seg.opacity * 0.8;
        opacityAttr.needsUpdate = true;
      }
    }

    // 2. Evolve branch heads
    const newBranches = [];

    for (let i = this.branches.length - 1; i >= 0; i--) {
      const b = this.branches[i];

      if (b.progress >= 1.0 || b.currPt.length() >= b.maxRadius) {
        b.currPt.set(0, 0, 0);
        b.progress = 0.0;
        const angle = Math.random() * Math.PI * 2.0;
        b.dir.set(Math.cos(angle), Math.sin(angle), 0).normalize();
        continue;
      }

      const p1 = b.currPt.clone();
      const stepDist = baseSecLen * (0.6 + Math.random() * lenNoise * 1.2);
      const jitterAngle = (Math.random() - 0.5) * dirRandom * 1.5;
      b.dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), jitterAngle);

      const p2 = p1.clone().add(b.dir.clone().multiplyScalar(stepDist));
      const nextProgress = Math.min(1.0, b.progress + stepDist / b.maxRadius);

      const w1 = startW * Math.pow(1.0 - b.progress, 1.8) * (b.depth / maxDepth);
      const w2 = startW * Math.pow(1.0 - nextProgress, 1.8) * Math.max(0.05, (b.depth - 0.5) / maxDepth);

      const op1 = Math.pow(1.0 - b.progress, 1.2);
      const op2 = Math.pow(1.0 - nextProgress, 1.2);

      const perp = new THREE.Vector3(-b.dir.y, b.dir.x, 0).normalize();

      const geo = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        p1.x - perp.x * w1, p1.y - perp.y * w1, p1.z,
        p1.x + perp.x * w1, p1.y + perp.y * w1, p1.z,
        p2.x + perp.x * w2, p2.y + perp.y * w2, p2.z,
        p2.x - perp.x * w2, p2.y - perp.y * w2, p2.z
      ]);

      geo.setIndex([0, 1, 2, 0, 2, 3]);
      geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0,0, 1,0, 1,1, 0,1]), 2));
      geo.setAttribute('aProgress', new THREE.BufferAttribute(new Float32Array([b.progress, b.progress, nextProgress, nextProgress]), 1));
      geo.setAttribute('aOpacity', new THREE.BufferAttribute(new Float32Array([op1, op1, op2, op2]), 1));

      const mesh = new THREE.Mesh(geo, this.shaderMat);
      this.boltGroup.add(mesh);

      this.activeSegments.push({
        mesh: mesh,
        opacity: op1
      });

      b.currPt.copy(p2);
      b.progress = nextProgress;

      if (Math.random() < splitChance && b.depth > 1 && this.branches.length < 32) {
        const sideDir = b.dir.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), (Math.random() - 0.5) * dirRandom * 2.0);
        newBranches.push({
          currPt: p2.clone(),
          dir: sideDir,
          progress: nextProgress,
          depth: b.depth - 1,
          maxRadius: b.maxRadius
        });
      }
    }

    if (newBranches.length > 0) {
      this.branches.push(...newBranches);
    }
  }

  destroy() {
    if (this.boltGroup) {
      this.group.remove(this.boltGroup);
      this.boltGroup.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }
    super.destroy();
  }
}
