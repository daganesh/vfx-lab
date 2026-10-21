import * as THREE from 'three';

// Midpoint displacement: repeatedly split each segment and push the midpoint
// sideways. `bounds` ({hw, hh}) keeps points inside a rectangle; `depth` is the
// z wobble as a fraction of segment length (0 keeps the bolt flat).
export function jaggedLine(start, end, jitter, levels, { bounds = null, depth = 0.3 } = {}) {
  let pts = [start, end];
  for (let l = 0; l < levels; l++) {
    const next = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1e-6;
      const off = (Math.random() - 0.5) * jitter * len;
      let x = (a.x + b.x) / 2 - (dy / len) * off;
      let y = (a.y + b.y) / 2 + (dx / len) * off;
      if (bounds) {
        x = Math.max(-bounds.hw, Math.min(bounds.hw, x));
        y = Math.max(-bounds.hh, Math.min(bounds.hh, y));
      }
      next.push(a, new THREE.Vector3(x, y, (a.z + b.z) / 2 + (Math.random() - 0.5) * jitter * len * depth));
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  return pts;
}

// Appends a flat ribbon (two triangles per segment) along the polyline.
export function addRibbon(out, pts, halfWidth) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1e-6;
    const px = (-(b.y - a.y) / len) * halfWidth;
    const py = ((b.x - a.x) / len) * halfWidth;
    out.push(
      a.x - px, a.y - py, a.z, a.x + px, a.y + py, a.z, b.x + px, b.y + py, b.z,
      a.x - px, a.y - py, a.z, b.x + px, b.y + py, b.z, b.x - px, b.y - py, b.z
    );
  }
}

// One bolt with side branches, written into the core and halo vertex arrays.
export function appendBolt(core, halo, start, end, { width, jitter, levels = 6, branches = 0, haloScale = 3.5, bounds = null, depth = 0.3 }) {
  const main = jaggedLine(start, end, jitter, levels, { bounds, depth });
  const lines = [{ pts: main, w: 1 }];
  const mainDir = Math.atan2(end.y - start.y, end.x - start.x);
  for (let b = 0; b < branches; b++) {
    const from = main[Math.floor(Math.random() * (main.length - 1))];
    const ang = mainDir + (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.7);
    const len = 0.5 + Math.random() * 0.9;
    const to = new THREE.Vector3(from.x + Math.cos(ang) * len, from.y + Math.sin(ang) * len, from.z);
    if (bounds) {
      to.x = Math.max(-bounds.hw, Math.min(bounds.hw, to.x));
      to.y = Math.max(-bounds.hh, Math.min(bounds.hh, to.y));
    }
    lines.push({ pts: jaggedLine(from, to, jitter, 3, { bounds, depth }), w: 0.5 });
  }
  lines.forEach(({ pts, w }) => {
    addRibbon(core, pts, width * w);
    addRibbon(halo, pts, width * w * haloScale);
  });
}

// Two additive meshes (bright core + wide soft halo) whose geometry is replaced on each strike.
export class BoltMesh {
  constructor(group) {
    const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide };
    this.core = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ ...additive, opacity: 0.95 }));
    this.halo = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ ...additive, opacity: 0.35 }));
    group.add(this.halo, this.core);
  }

  setColors(coreColor, haloColor) {
    this.core.material.color.set(coreColor);
    this.halo.material.color.set(haloColor);
  }

  setVerts(coreVerts, haloVerts) {
    [[this.core, coreVerts], [this.halo, haloVerts]].forEach(([mesh, verts]) => {
      mesh.geometry.dispose();
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
      mesh.geometry = geo;
    });
  }
}
