import * as THREE from 'three';

// Hand-drawn comic-book sprites, generated on canvas: white fills with a dark
// outline so materials can tint them while the outline stays inked.
const OUTLINE = '#2a0a0a';
const cache = new Map();

function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

function canvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function seeded(seed) {
  let s = seed * 9301 + 49297;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// Spiky comic starburst. Different seeds give different spike patterns.
export function starTexture(seed) {
  return cached(`star${seed}`, () => canvasTexture(256, 256, ctx => {
    const rnd = seeded(seed);
    const n = 10 + (seed % 3) * 2;
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (i * Math.PI) / n + rnd() * 0.08;
      const r = (i % 2 === 0 ? 0.84 + rnd() * 0.16 : 0.46 + rnd() * 0.14) * 118;
      const x = 128 + Math.cos(a) * r, y = 128 + Math.sin(a) * r;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 14;
    ctx.stroke(); // centred on the path; the fill then leaves ~7px of outline outside
    ctx.fillStyle = '#fff';
    ctx.fill();
  }));
}

// Lumpy outlined cartoon cloud.
export function cloudTexture(seed) {
  return cached(`cloud${seed}`, () => canvasTexture(256, 256, ctx => {
    const rnd = seeded(seed);
    const circles = [[128, 150, 58], [76, 140, 44], [180, 140, 46], [100, 98, 44], [156, 96, 42], [128, 76, 38], [128, 126, 54]]
      .map(([x, y, r]) => [x + (rnd() - 0.5) * 12, y + (rnd() - 0.5) * 12, r * (0.9 + rnd() * 0.2)]);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 12;
    circles.forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); });
    ctx.fillStyle = '#fff';
    circles.forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); });
  }));
}

// Thick outlined shockwave ring.
export function ringTexture() {
  return cached('ring', () => canvasTexture(256, 256, ctx => {
    ctx.beginPath();
    ctx.arc(128, 128, 108, 0, 7);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 30;
    ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 16;
    ctx.stroke();
  }));
}

// Small outlined blob for debris chunks.
export function blobTexture() {
  return cached('blob', () => canvasTexture(64, 64, ctx => {
    ctx.beginPath();
    ctx.arc(32, 32, 26, 0, 7);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fill();
  }));
}

// "POW!"-style word: yellow fill, red then black outline.
export function wordTexture(word) {
  return cached(`word${word}`, () => canvasTexture(512, 256, (ctx, w, h) => {
    let size = 150;
    ctx.font = `italic 900 ${size}px "Arial Black", Impact, sans-serif`;
    const maxW = w - 70;
    const measured = ctx.measureText(word).width;
    if (measured > maxW) {
      size = Math.floor((size * maxW) / measured);
      ctx.font = `italic 900 ${size}px "Arial Black", Impact, sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 44;
    ctx.strokeText(word, w / 2, h / 2);
    ctx.strokeStyle = '#e8102a';
    ctx.lineWidth = 26;
    ctx.strokeText(word, w / 2, h / 2);
    ctx.fillStyle = '#ffe100';
    ctx.fillText(word, w / 2, h / 2);
  }));
}
