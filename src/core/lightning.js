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

const smooth = t => t * t * (3 - 2 * t);

// A forked bolt drawn as continuous ribbons (shared vertices, mitred joins) with a
// smooth cross-section glow. Each fork is narrower than its parent, and forking stops
// once a branch would be too thin or `splits` is reached. The topology is rolled once;
// every strike re-rolls only the jitter, and the shape morphs from the old strike to
// the new one so the bolt writhes instead of snapping.
export class ForkedBolt {
  constructor(group, bounds = null) {
    this.bounds = bounds;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uCore: { value: new THREE.Color('#e0ffff') },
        uHalo: { value: new THREE.Color('#7c4dff') },
        uCoreFrac: { value: 0.3 },
        uOpacity: { value: 1 }
      },
      vertexShader: `
        attribute float aSide;
        varying float vSide;
        void main() {
          vSide = aSide;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uCore, uHalo;
        uniform float uCoreFrac, uOpacity;
        varying float vSide;
        void main() {
          float d = abs(vSide);
          float core = 1.0 - smoothstep(uCoreFrac * 0.35, uCoreFrac, d);
          float halo = pow(1.0 - d, 2.5) * 0.55;
          vec3 c = mix(uHalo, uCore, core);
          gl_FragColor = vec4(c * (0.6 + core), max(core, halo) * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.mat);
    this.mesh.frustumCulled = false;
    group.add(this.mesh);
    this.lines = [];
    this.from = this.to = null;
  }

  setColors(core, halo) {
    this.mat.uniforms.uCore.value.set(core);
    this.mat.uniforms.uHalo.value.set(halo);
  }

  // Rolls the fork structure. `width` is the main trunk half-width.
  build(start, end, { width, jitter, splits, haloScale = 4, minWidthFrac = 0.18 }) {
    this.start = start; this.end = end;
    this.width = width; this.jitter = jitter; this.haloScale = haloScale;
    this.mat.uniforms.uCoreFrac.value = 1 / haloScale;

    const lines = [{ parent: -1, t: 0, w: 1, depth: 0, ang: 0, lenFrac: 1, levels: 6 }];
    const mainDir = Math.atan2(end.y - start.y, end.x - start.x);
    for (let tries = 0; lines.length <= splits && tries < splits * 6; tries++) {
      const parent = Math.floor(Math.random() * lines.length);
      const p = lines[parent];
      const w = p.w * 0.62;
      if (w < minWidthFrac) continue; // too thin to fork any further
      const side = Math.random() < 0.5 ? -1 : 1;
      lines.push({
        parent, t: 0.1 + Math.random() * 0.8, w, depth: p.depth + 1,
        ang: side * (0.35 + Math.random() * 0.6), lenFrac: 0.3 + Math.random() * 0.3,
        levels: Math.max(2, 5 - p.depth), baseAng: mainDir
      });
    }
    this.lines = lines;
    this.total = lines.reduce((n, l) => n + (1 << l.levels) + 1, 0);
    this.mainLen = Math.hypot(end.x - start.x, end.y - start.y);

    const verts = this.total * 2;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const side = new Float32Array(verts);
    const index = [];
    let v = 0;
    lines.forEach(l => {
      const n = (1 << l.levels) + 1;
      for (let i = 0; i < n; i++) {
        side[(v + i) * 2] = -1; side[(v + i) * 2 + 1] = 1;
        if (i < n - 1) {
          const a = (v + i) * 2, b = a + 2;
          index.push(a, a + 1, b, a + 1, b + 1, b);
        }
      }
      v += n;
    });
    geo.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
    geo.setIndex(index);
    this.mesh.geometry.dispose();
    this.mesh.geometry = geo;
    this.from = this.roll();
    this.to = this.roll();
    this.apply(1);
  }

  // New random shape for the existing structure -> array of polylines.
  roll() {
    const polys = [];
    this.lines.forEach((l, i) => {
      let a, b;
      if (l.parent < 0) { a = this.start; b = this.end; }
      else {
        const pp = polys[l.parent];
        a = pp[Math.round(l.t * (pp.length - 1))];
        const len = this.mainLen * l.lenFrac * Math.pow(0.7, l.depth - 1);
        const ang = l.baseAng + l.ang;
        b = new THREE.Vector3(a.x + Math.cos(ang) * len, a.y + Math.sin(ang) * len, a.z);
        if (this.bounds) {
          b.x = Math.max(-this.bounds.hw, Math.min(this.bounds.hw, b.x));
          b.y = Math.max(-this.bounds.hh, Math.min(this.bounds.hh, b.y));
        }
      }
      polys.push(jaggedLine(a, b, this.jitter, l.levels, { bounds: this.bounds, depth: 0 }));
    });
    return polys.map(p => p.map(q => q.clone()));
  }

  // Blend the previous and next shapes (k in 0..1) into the ribbon vertices.
  apply(k) {
    k = smooth(Math.min(1, Math.max(0, k)));
    const pos = this.mesh.geometry.attributes.position.array;
    let o = 0;
    this.lines.forEach((l, li) => {
      const A = this.from[li], B = this.to[li], n = A.length;
      const px = new Float32Array(n), py = new Float32Array(n), pz = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        px[i] = A[i].x + (B[i].x - A[i].x) * k;
        py[i] = A[i].y + (B[i].y - A[i].y) * k;
        pz[i] = A[i].z + (B[i].z - A[i].z) * k;
      }
      for (let i = 0; i < n; i++) {
        const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
        let tx = px[i1] - px[i0], ty = py[i1] - py[i0];
        const tl = Math.hypot(tx, ty) || 1e-6;
        tx /= tl; ty /= tl;
        // Thick at the root, tapering to a fine tip along each fork.
        const hw = this.width * l.w * this.haloScale * (1 - 0.7 * (i / (n - 1)));
        pos[o++] = px[i] + ty * hw; pos[o++] = py[i] - tx * hw; pos[o++] = pz[i];
        pos[o++] = px[i] - ty * hw; pos[o++] = py[i] + tx * hw; pos[o++] = pz[i];
      }
    });
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }

  // Start morphing toward a freshly rolled shape.
  strike() {
    this.from = this.to;
    this.to = this.roll();
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mat.dispose();
    this.mesh.parent?.remove(this.mesh);
  }
}
