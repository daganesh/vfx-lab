import * as THREE from 'three';

let softDot = null;

// Shared round, soft-edged sprite so Points render as glows instead of squares.
export function softDotTexture() {
  if (softDot) return softDot;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  softDot = new THREE.CanvasTexture(canvas);
  return softDot;
}

let puff = null;

// Cloudy, irregular blob (several overlapping soft discs) for smoke.
export function puffTexture() {
  if (puff) return puff;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2, d = rnd() * 22;
    const x = 64 + Math.cos(a) * d, y = 64 + Math.sin(a) * d, r = 18 + rnd() * 20;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.22)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  // Fade the rim to zero so the quad edge never shows.
  ctx.globalCompositeOperation = 'destination-in';
  const m = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  m.addColorStop(0, 'rgba(0,0,0,1)');
  m.addColorStop(0.7, 'rgba(0,0,0,1)');
  m.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = m;
  ctx.fillRect(0, 0, size, size);
  puff = new THREE.CanvasTexture(canvas);
  return puff;
}

// Pixels per world unit at distance 1, for sizing gl_PointSize in custom shaders.
export function pixelScale(renderer, camera) {
  return renderer.domElement.height / (2 * Math.tan((camera.fov * Math.PI) / 360));
}
