import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';
import { softDotTexture } from '../core/sprites.js';
import { starTexture, cloudTexture, ringTexture, blobTexture, wordTexture } from '../core/cartoon.js';

const DURATION = 1.7;  // seconds of action per blast
const BLAST = 2.8;     // outer starburst diameter in world units at size 1
const GRAVITY = -3.4;
const WORDS = ['KO!', 'POW!', 'BAM!', 'BOOM!'];
const PUFFS = 9;

const clamp01 = x => Math.max(0, Math.min(1, x));
const easeOutCubic = x => 1 - Math.pow(1 - clamp01(x), 3);
const easeOutBack = x => { const c = 2.2, t = clamp01(x) - 1; return 1 + (c + 1) * t * t * t + c * t * t; };
const smooth = x => { const t = clamp01(x); return t * t * (3 - 2 * t); };

// Comic-book blast: flash, layered outlined starburst with a pop-and-shake,
// shockwave ring, cartoon smoke clouds, tumbling debris and a "POW!" word.
// Everything is a camera-facing sprite drawn on top of the card.
export class KnockoutExplosionEffect extends BaseEffect {
  static id = 'knockout-explosion';
  static label = '💥 KO Explosion (Cartoon)';
  static category = 'particle';

  static getParameterSchema() {
    return [
      { name: 'explosionSize', label: 'Blast Size', min: 0.5, max: 2.0, step: 0.05, default: 1.0 },
      { name: 'explosionSpeed', label: 'Playback Speed', min: 0.3, max: 3.0, step: 0.1, default: 1.0 },
      { name: 'pause', label: 'Pause Between Blasts (s)', min: 0, max: 4, step: 0.1, default: 0.8 },
      { name: 'shake', label: 'Impact Shake', min: 0, max: 1.5, step: 0.05, default: 0.6 },
      { name: 'debrisCount', label: 'Debris Chunks', min: 0, max: 200, step: 5, default: 60 },
      { name: 'showText', label: 'Show Comic Word', type: 'boolean', default: true },
      { name: 'outerColor', label: 'Outer Blast Color', type: 'color', default: '#ff2d2d' },
      { name: 'midColor', label: 'Middle Blast Color', type: 'color', default: '#ff9500' },
      { name: 'coreColor', label: 'Core Blast Color', type: 'color', default: '#ffe600' }
    ];
  }

  constructor(stage) {
    super(stage);
    this.age = 0;
    this.word = WORDS[0];

    const quad = new THREE.PlaneGeometry(1, 1);
    const sprite = (map, order, extra = {}) => {
      const mesh = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({
        map, transparent: true, depthWrite: false, depthTest: false, ...extra
      }));
      mesh.renderOrder = order;
      mesh.visible = false;
      this.group.add(mesh);
      return mesh;
    };

    this.puffs = Array.from({ length: PUFFS }, (_, i) => ({
      mesh: sprite(cloudTexture(i % 3), 10),
      angle: (i / PUFFS) * Math.PI * 2 + Math.random() * 0.5,
      dist: 0.7 + Math.random() * 0.5,
      size: 0.8 + Math.random() * 0.6,
      spin: (Math.random() - 0.5) * 0.6
    }));
    this.puffs.forEach(p => p.mesh.material.color.set('#fff1dc'));

    this.ring = sprite(ringTexture(), 11);
    this.layers = [
      { scale: 1.0, seed: 1, spin: 0.25, key: 'outerColor' },
      { scale: 0.78, seed: 2, spin: -0.35, key: 'midColor' },
      { scale: 0.56, seed: 3, spin: 0.5, key: 'coreColor' },
      { scale: 0.3, seed: 4, spin: -0.6, key: null }
    ].map((l, i) => ({ ...l, mesh: sprite(starTexture(l.seed), 12 + i) }));
    this.layers[3].mesh.material.color.set('#ffffff');

    this.flash = sprite(softDotTexture(), 16, { blending: THREE.AdditiveBlending });
    this.text = sprite(wordTexture(this.word), 18);
  }

  onParamsUpdated() {
    this.layers.forEach(l => { if (l.key) l.mesh.material.color.set(this.params[l.key]); });
    this.buildDebris();
  }

  buildDebris() {
    if (this.debris) {
      this.group.remove(this.debris);
      this.debris.geometry.dispose();
      this.debris.material.dispose();
    }
    const count = this.params.debrisCount;
    this.debrisVel = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [this.params.outerColor, this.params.midColor, this.params.coreColor, '#ffffff'].map(c => new THREE.Color(c));
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 1.8 + Math.random() * 3.2;
      this.debrisVel.set([Math.cos(a) * speed, Math.sin(a) * speed + 1.0, (Math.random() - 0.5)], i * 3);
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.debris = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.22, map: blobTexture(), vertexColors: true,
      transparent: true, depthWrite: false, depthTest: false, alphaTest: 0.05
    }));
    this.debris.frustumCulled = false;
    this.debris.renderOrder = 17;
    this.group.add(this.debris);
  }

  update(time, delta) {
    const p = this.params;
    this.age += delta * p.explosionSpeed;
    if (this.age > DURATION + p.pause) {
      this.age = 0;
      this.word = WORDS[Math.floor(Math.random() * WORDS.length)];
      this.text.material.map = wordTexture(this.word);
      this.text.material.needsUpdate = true;
    }
    const t = this.age;

    // Face the camera, sit just in front of the card, scale with blast size.
    this.group.quaternion.copy(this.stage.camera.quaternion);
    this.group.position.set(0, 0, 0.6);
    this.group.scale.setScalar(p.explosionSize);

    // Starburst layers: pop with overshoot, shake on impact, then shrink and fade.
    const shake = t < 0.45 ? Math.sin(t * 90) * 0.06 * p.shake * (1 - t / 0.45) : 0;
    const fade = 1 - smooth((t - 1.05) / 0.5);
    const shrink = 1 - 0.25 * smooth((t - 1.0) / 0.7);
    this.layers.forEach((l, i) => {
      const pop = easeOutBack((t - i * 0.03) / 0.22);
      const pulse = t < 0.8 ? 1 + 0.03 * Math.sin(t * 30 + i) : 1;
      const s = BLAST * l.scale * pop * shrink * pulse;
      l.mesh.visible = t < 1.6 && s > 0.001;
      l.mesh.scale.set(s, s, 1);
      l.mesh.rotation.z = i * 0.35 + l.spin * t;
      l.mesh.position.set(shake, shake * 0.6, i * 0.01);
      l.mesh.material.opacity = fade;
    });

    // White flash right at impact.
    const f = t / 0.2;
    this.flash.visible = f < 1;
    if (this.flash.visible) {
      const s = BLAST * (0.6 + f * 2.2);
      this.flash.scale.set(s, s, 1);
      this.flash.material.opacity = 0.9 * (1 - f);
    }

    // Shockwave ring.
    const rp = (t - 0.04) / 0.86;
    this.ring.visible = rp > 0 && rp < 1;
    if (this.ring.visible) {
      const s = BLAST * (0.4 + 1.7 * easeOutCubic(rp));
      this.ring.scale.set(s, s, 1);
      this.ring.material.opacity = 0.9 * Math.pow(1 - rp, 1.2);
    }

    // Smoke clouds billow outward behind the blast.
    this.puffs.forEach(pf => {
      const pp = (t - 0.03) / 1.15;
      pf.mesh.visible = pp > 0 && pp < 1;
      if (!pf.mesh.visible) return;
      const e = easeOutCubic(pp);
      const d = pf.dist * e * BLAST * 0.6;
      const s = pf.size * (0.3 + 0.9 * e) * BLAST * 0.5;
      pf.mesh.position.set(Math.cos(pf.angle) * d, Math.sin(pf.angle) * d + pp * 0.3, -0.05);
      pf.mesh.scale.set(s, s, 1);
      pf.mesh.rotation.z = pf.spin * pp;
      pf.mesh.material.opacity = pp < 0.6 ? 1 : 1 - (pp - 0.6) / 0.4;
    });

    // Debris: ballistic arcs, a pure function of age.
    const tt = Math.max(0, t - 0.02);
    const pos = this.debris.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i] = this.debrisVel[i] * tt;
      pos[i + 1] = this.debrisVel[i + 1] * tt + 0.5 * GRAVITY * tt * tt;
      pos[i + 2] = this.debrisVel[i + 2] * tt;
    }
    this.debris.geometry.attributes.position.needsUpdate = true;
    this.debris.visible = t < 1.45 && t > 0.02;
    this.debris.material.opacity = 1 - smooth((t - 0.9) / 0.5);

    // Comic word pops in over the blast.
    const wp = (t - 0.08) / 0.2;
    this.text.visible = p.showText && t > 0.08 && t < 1.5;
    if (this.text.visible) {
      const s = 2.3 * easeOutBack(wp);
      this.text.scale.set(s, s * 0.5, 1);
      this.text.rotation.z = -0.14 + Math.sin(t * 12) * 0.015;
      this.text.position.set(shake, 0.05 + shake, 0.2);
      this.text.material.opacity = 1 - smooth((t - 1.2) / 0.3);
    }
  }
}
