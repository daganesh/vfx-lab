import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

const WORDS = ['PEW!', 'ZAP!', 'KA-POW!', 'BZZZT!', 'PIU PIU!', 'BLAM!'];
const clamp01 = v => Math.min(1, Math.max(0, v));
const easeOutBack = t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);

// Pointed comic explosion with a heavy outline; `word` (if any) is lettered on top.
function burstTexture(inner, word) {
  const S = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  const star = (r1, r2, n, rot) => {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i * Math.PI) / n;
      const r = (i % 2 ? r1 : r2) * (i % 2 ? 1 : 0.85 + 0.15 * Math.sin(i * 12.9898));
      ctx[i ? 'lineTo' : 'moveTo'](S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r);
    }
    ctx.closePath();
  };
  ctx.lineJoin = 'round';
  star(150, 250, 11, 0.2);
  ctx.fillStyle = '#111'; ctx.fill();
  ctx.lineWidth = 22; ctx.strokeStyle = '#111'; ctx.stroke();
  star(140, 232, 11, 0.2);
  ctx.fillStyle = inner; ctx.fill();
  star(85, 150, 11, 0.2);
  ctx.fillStyle = '#fff'; ctx.fill();
  if (word) {
    ctx.font = 'italic 900 112px Impact, "Arial Black", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.save(); ctx.translate(S / 2, S / 2); ctx.rotate(-0.12);
    ctx.lineWidth = 26; ctx.strokeStyle = '#111'; ctx.strokeText(word, 0, 0);
    ctx.fillStyle = '#ffe600'; ctx.fillText(word, 0, 0);
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A cartoon laser: tap the card and a fat, cel-shaded beam blasts out of the touch
// point with a starburst, a lettered "PEW!", and a kick that shakes the card.
export class ComicLaserEffect extends BaseEffect {
  static id = 'comic-laser';
  static label = '🔫 Comic Laser (tap the card)';
  static category = 'card';
  static attach = 'card';

  static getParameterSchema() {
    return [
      { name: 'laserColor', label: 'Laser Color', type: 'color', default: '#ff2a6d' },
      { name: 'beamWidth', label: 'Beam Width', min: 0.08, max: 0.8, step: 0.02, default: 0.3 },
      { name: 'beamLength', label: 'Beam Length', min: 2, max: 14, step: 0.5, default: 8 },
      { name: 'burstSize', label: 'Starburst Size', min: 0.3, max: 2.5, step: 0.05, default: 1.1 },
      { name: 'comicText', label: 'Comic Lettering', type: 'boolean', default: true },
      { name: 'shake', label: 'Recoil / Shake', min: 0, max: 2, step: 0.05, default: 1 },
      { name: 'autoFire', label: 'Auto Fire (sec, 0 = off)', min: 0, max: 6, step: 0.5, default: 0 }
    ];
  }

  constructor(stage) {
    super(stage);
    this.shots = [];
    this.recoil = new THREE.Vector3(); // offset currently applied to the card pivot
    this.kick = 0;
    this.kickDir = new THREE.Vector2();
    this.clock = 0;
    this.auto = 0;
    this.textures = {};
    this.unsubscribe = stage.onTap(({ point }) => this.fire(point));
  }

  texture(color, word) {
    const key = `${color}|${word}`;
    return this.textures[key] || (this.textures[key] = burstTexture(color, word));
  }

  fire(point) {
    const p = this.params;
    const z = this.stage.params.cardDepth / 2 + 0.06;
    // Shoot outward from the middle of the card, with a little wobble.
    const base = Math.hypot(point.x, point.y) > 0.25 ? Math.atan2(point.y, point.x) : Math.random() * Math.PI * 2;
    const ang = base + (Math.random() - 0.5) * 0.7;
    const dir = new THREE.Vector2(Math.cos(ang), Math.sin(ang));

    const beamMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(p.laserColor) },
        uT: { value: 0 },
        uLen: { value: p.beamLength },
        uHead: { value: 0 }
      },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        uniform vec3 uColor; uniform float uT, uLen, uHead;
        varying vec2 vUv;
        void main() {
          float across = abs(vUv.y - 0.5) * 2.0;
          float along = vUv.x * uLen;
          // Rounded cap at the head, hard cel edges everywhere.
          float cap = length(vec2(max(0.0, along - (uHead * uLen - 0.15)) / 0.15, across));
          if (along > uHead * uLen || cap > 1.0) discard;
          vec3 col = across > 0.8 ? vec3(0.07) : across > 0.42 ? uColor : vec3(1.0);
          // Energy stripes racing along the body.
          float stripe = step(0.5, fract(along * 3.0 - uT * 14.0));
          if (across <= 0.8 && across > 0.42) col = mix(col, vec3(1.0, 0.85, 0.9), stripe * 0.35);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      transparent: true,
      depthWrite: false
    });
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), beamMat);
    beam.renderOrder = 20;
    beam.position.set(point.x, point.y, z);
    beam.rotation.z = ang;

    const sprite = (tex, order) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
      s.renderOrder = order;
      s.position.set(point.x, point.y, z + 0.05);
      return s;
    };
    const burst = sprite(this.texture('#ff8a00', null), 22);
    const word = p.comicText ? sprite(this.texture('#ff2a6d', WORDS[Math.floor(Math.random() * WORDS.length)]), 23) : null;
    const endBurst = sprite(this.texture('#ffe600', null), 21);
    const end = new THREE.Vector2(point.x, point.y).addScaledVector(dir, p.beamLength * 0.55);
    endBurst.position.set(end.x, end.y, z + 0.05);
    word && word.position.set(point.x - dir.y * 0.5 + dir.x * 0.3, point.y + dir.x * 0.5 + dir.y * 0.3, z + 0.1);

    const parts = [beam, burst, endBurst, word].filter(Boolean);
    parts.forEach(m => this.group.add(m));
    this.shots.push({ t: 0, origin: new THREE.Vector2(point.x, point.y), beam, burst, word, endBurst, parts, dir, spin: (Math.random() - 0.5) * 0.5, wordRot: (Math.random() - 0.5) * 0.5 });
    if (this.shots.length > 6) this.removeShot(this.shots.shift());

    this.kick = 1;
    this.kickDir.copy(dir).multiplyScalar(-1);
  }

  removeShot(shot) {
    shot.parts.forEach(m => {
      this.group.remove(m);
      m.geometry?.dispose();
      m.material.dispose(); // burst textures are cached and reused
    });
  }

  update(time, delta) {
    this.clock += delta;
    const p = this.params;
    if (p.autoFire > 0 && (this.auto -= delta) <= 0) {
      this.auto = p.autoFire;
      this.fire(new THREE.Vector3((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 2.4, 0));
    }

    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.t += delta;
      const t = s.t;
      // Beam: instant extension, fat overshoot, hold, then thin out.
      const thick = t < 0.05 ? t / 0.05 * 0.3 : t < 0.14 ? 0.3 + easeOutBack(clamp01((t - 0.05) / 0.09)) * 0.95 : t < 0.5 ? 1 + 0.06 * Math.sin(t * 90) : 1 - clamp01((t - 0.5) / 0.25);
      const head = clamp01(t / 0.07);
      const len = p.beamLength, w = p.beamWidth * Math.max(thick, 0.001);
      s.beam.scale.set(len, w, 1);
      // The plane is centred, so shift it half a length along the beam.
      s.beam.position.set(s.origin.x + s.dir.x * len / 2, s.origin.y + s.dir.y * len / 2, s.beam.position.z);
      s.beam.material.uniforms.uT.value = t;
      s.beam.material.uniforms.uLen.value = len;
      s.beam.material.uniforms.uHead.value = head;
      s.beam.visible = t < 0.78;

      // Starbursts pop with overshoot, spin a little and shrink away.
      const pop = (start, life, size) => {
        const k = clamp01((t - start) / life);
        return t < start ? 0 : (k < 0.3 ? easeOutBack(k / 0.3) : 1 - (k - 0.3) / 0.7) * size;
      };
      const b = pop(0, 0.55, 1.5 * p.burstSize);
      s.burst.scale.set(b, b, 1); s.burst.material.rotation = s.spin * t * 4;
      const e = pop(0.06, 0.5, 0.9 * p.burstSize);
      s.endBurst.scale.set(e, e, 1); s.endBurst.material.rotation = -s.spin * t * 3;
      if (s.word) {
        const wsz = pop(0.04, 0.95, 1.9 * p.burstSize);
        s.word.scale.set(wsz, wsz, 1); s.word.material.rotation = s.wordRot;
      }
      if (t > 1.05) { this.removeShot(s); this.shots.splice(i, 1); }
    }

    // Recoil: shove the card away from the shot, then rattle back to rest.
    this.kick *= Math.exp(-delta * 7);
    const shake = p.shake * this.kick;
    const target = new THREE.Vector3(
      this.kickDir.x * 0.12 * shake + Math.sin(this.clock * 70) * 0.025 * shake,
      this.kickDir.y * 0.12 * shake + Math.cos(this.clock * 83) * 0.025 * shake,
      0
    );
    this.stage.cardPivot.position.add(target).sub(this.recoil); // additive: other effects can move the pivot too
    this.recoil.copy(target);
  }

  destroy() {
    this.unsubscribe();
    this.stage.cardPivot.position.sub(this.recoil);
    this.shots.forEach(s => this.removeShot(s));
    Object.values(this.textures).forEach(t => t.dispose());
    super.destroy();
  }
}
