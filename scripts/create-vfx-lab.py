import os

# Define project structure and code files
files = {}

# 1. package.json
files["package.json"] = """{
  "name": "draft-heroes-vfx-lab",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.160.0",
    "lil-gui": "^0.19.0"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
"""

# 2. index.html
files["index.html"] = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Draft Heroes - VFX Effects Lab</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0b0f19;
      color: #f5f5f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
      width: 100vw;
      height: 100vh;
    }
    #app {
      display: flex;
      width: 100%;
      height: 100%;
    }
    #sidebar {
      width: 260px;
      background: #121826;
      border-right: 1px solid #2a3447;
      display: flex;
      flex-direction: column;
      z-index: 10;
    }
    .header {
      padding: 16px;
      border-bottom: 1px solid #2a3447;
      background: #1a2332;
    }
    .header h1 {
      font-size: 1.1rem;
      color: #00bcd4;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .header p {
      font-size: 0.75rem;
      color: #8a99ad;
      margin-top: 4px;
    }
    .effect-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px 8px;
    }
    .effect-btn {
      width: 100%;
      text-align: left;
      padding: 10px 14px;
      margin-bottom: 6px;
      background: #1a2233;
      border: 1px solid #2a354d;
      border-radius: 6px;
      color: #c5d1e0;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .effect-btn:hover {
      background: #243047;
      color: #ffffff;
      border-color: #00bcd4;
    }
    .effect-btn.active {
      background: #00bcd4;
      color: #0b0f19;
      border-color: #00e5ff;
      font-weight: 700;
    }
    #viewport {
      flex: 1;
      position: relative;
      height: 100%;
    }
    #canvas-container {
      width: 100%;
      height: 100%;
    }
    #gui-container {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 20;
    }
    .fps-counter {
      position: absolute;
      bottom: 12px;
      left: 12px;
      background: rgba(18, 24, 38, 0.85);
      backdrop-filter: blur(4px);
      border: 1px solid #2a3447;
      padding: 6px 12px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.8rem;
      color: #00e5ff;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="app">
    <div id="sidebar">
      <div class="header">
        <h1>Draft Heroes VFX Lab</h1>
        <p>Effects & Parameter Sandbox</p>
      </div>
      <div class="effect-list" id="effect-list"></div>
    </div>
    <div id="viewport">
      <div id="canvas-container"></div>
      <div id="gui-container"></div>
      <div class="fps-counter" id="fps-counter">FPS: --</div>
    </div>
  </div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
"""

# 3. src/main.js
files["src/main.js"] = """import * as THREE from 'three';
import { HolographicFoilEffect } from './effects/HolographicFoilEffect.js';
import { ParticleEnergyPipsEffect } from './effects/ParticleEnergyPipsEffect.js';
import { StadiumPitchCameraEffect } from './effects/StadiumPitchCameraEffect.js';
import { KnockoutExplosionEffect } from './effects/KnockoutExplosionEffect.js';
import { VisualizerHarness } from './tests/VisualizerHarness.js';

// Register all available effects from the library
const registry = [
  HolographicFoilEffect,
  ParticleEnergyPipsEffect,
  StadiumPitchCameraEffect,
  KnockoutExplosionEffect
];

window.addEventListener('DOMContentLoaded', () => {
  const harness = new VisualizerHarness(
    document.getElementById('canvas-container'),
    document.getElementById('gui-container'),
    document.getElementById('effect-list'),
    document.getElementById('fps-counter')
  );

  registry.forEach(EffectClass => harness.registerEffect(EffectClass));
  harness.selectEffect(0);
});
"""

# 4. src/effects/BaseEffect.js
files["src/effects/BaseEffect.js"] = """import * as THREE from 'three';

export class BaseEffect {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.params = {};
  }

  // Returns configuration schema for lil-gui tweak parameters
  // Overridden by subclasses
  static getParameterSchema() {
    return [];
  }

  // Called when parameters change in the harness GUI
  onParamsUpdated() {}

  // Frame update loop
  update(time, delta) {}

  // Cleanup resources when switching effects
  destroy() {
    this.scene.remove(this.group);
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
"""

# 5. src/effects/HolographicFoilEffect.js
files["src/effects/HolographicFoilEffect.js"] = """import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

export class HolographicFoilEffect extends BaseEffect {
  static id = 'holographic-foil';
  static label = '1. Legendary Holographic Foil';

  static getParameterSchema() {
    return [
      { name: 'foilFrequency', label: 'Foil Frequency', min: 1.0, max: 20.0, step: 0.5, default: 8.0 },
      { name: 'foilSpeed', label: 'Animation Speed', min: 0.1, max: 5.0, step: 0.1, default: 1.5 },
      { name: 'iridescenceIntensity', label: 'Iridescence', min: 0.0, max: 2.0, step: 0.1, default: 1.2 },
      { name: 'cardTiltRange', label: 'Interactive Tilt', min: 0.0, max: 1.0, step: 0.05, default: 0.4 },
      { name: 'borderColor', label: 'Border Tint', type: 'color', default: '#ffd700' }
    ];
  }

  constructor(scene, camera, renderer) {
    super(scene, camera, renderer);
    this.camera.position.set(0, 0, 6);

    // Setup Custom GLSL Shader for Holographic Card
    this.shaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFoilFrequency: { value: 8.0 },
        uIridescence: { value: 1.2 },
        uBorderColor: { value: new THREE.Color('#ffd700') }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uFoilFrequency;
        uniform float uIridescence;
        uniform vec3 uBorderColor;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.0);

          // Spectral rainbow shift based on UV & Fresnel
          float rainbowPattern = sin(vUv.x * uFoilFrequency + vUv.y * uFoilFrequency + uTime) * 0.5 + 0.5;
          vec3 rainbowColor = 0.5 + 0.5 * cos(uTime + vUv.xyx * uFoilFrequency + vec3(0, 2, 4));

          // Card base artwork simulation
          vec3 baseCardArt = mix(vec3(0.05, 0.1, 0.25), vec3(0.1, 0.25, 0.5), vUv.y);
          
          // Outer Border check
          float borderX = step(vUv.x, 0.04) + step(0.96, vUv.x);
          float borderY = step(vUv.y, 0.04) + step(0.96, vUv.y);
          float isBorder = clamp(borderX + borderY, 0.0, 1.0);

          vec3 finalColor = mix(baseCardArt, rainbowColor, fresnel * uIridescence);
          finalColor = mix(finalColor, uBorderColor * (1.0 + rainbowPattern * 0.5), isBorder);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });

    const cardGeometry = new THREE.BoxGeometry(2.5, 3.5, 0.05);
    const materials = [
      new THREE.MeshBasicMaterial({ color: 0xffd700 }),
      new THREE.MeshBasicMaterial({ color: 0xffd700 }),
      new THREE.MeshBasicMaterial({ color: 0xffd700 }),
      new THREE.MeshBasicMaterial({ color: 0xffd700 }),
      this.shaderMaterial,
      new THREE.MeshBasicMaterial({ color: 0x0a1128 })
    ];

    this.cardMesh = new THREE.Mesh(cardGeometry, materials);
    this.group.add(this.cardMesh);

    // Track mouse for tilt
    this.targetTilt = { x: 0, y: 0 };
    this.pointerMoveHandler = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.targetTilt.x = -y * (this.params.cardTiltRange || 0.4);
      this.targetTilt.y = x * (this.params.cardTiltRange || 0.4);
    };
    window.addEventListener('pointermove', this.pointerMoveHandler);
  }

  onParamsUpdated() {
    this.shaderMaterial.uniforms.uFoilFrequency.value = this.params.foilFrequency;
    this.shaderMaterial.uniforms.uIridescence.value = this.params.iridescenceIntensity;
    this.shaderMaterial.uniforms.uBorderColor.value.set(this.params.borderColor);
  }

  update(time, delta) {
    this.shaderMaterial.uniforms.uTime.value = time * (this.params.foilSpeed || 1.0);

    // Smooth tilt lerp
    this.cardMesh.rotation.x += (this.targetTilt.x - this.cardMesh.rotation.x) * 0.1;
    this.cardMesh.rotation.y += (this.targetTilt.y - this.cardMesh.rotation.y) * 0.1;
  }

  destroy() {
    window.removeEventListener('pointermove', this.pointerMoveHandler);
    super.destroy();
  }
}
"""

# 6. src/effects/ParticleEnergyPipsEffect.js
files["src/effects/ParticleEnergyPipsEffect.js"] = """import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

export class ParticleEnergyPipsEffect extends BaseEffect {
  static id = 'energy-pips';
  static label = '2. Dynamic Energy Pips & Swarm';

  static getParameterSchema() {
    return [
      { name: 'particleCount', label: 'Particle Count', min: 100, max: 2000, step: 100, default: 600 },
      { name: 'orbitRadius', label: 'Orbit Radius', min: 0.5, max: 3.0, step: 0.1, default: 1.5 },
      { name: 'swarmSpeed', label: 'Swarm Speed', min: 0.2, max: 4.0, step: 0.2, default: 1.8 },
      { name: 'pipColor', label: 'Pip Glow Color', type: 'color', default: '#00e5ff' }
    ];
  }

  constructor(scene, camera, renderer) {
    super(scene, camera, renderer);
    this.camera.position.set(0, 0, 6);
    this.rebuildParticles();
  }

  rebuildParticles() {
    if (this.particleSystem) {
      this.group.remove(this.particleSystem);
      this.particleGeometry.dispose();
      this.particleMaterial.dispose();
    }

    const count = this.params.particleCount || 600;
    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const randomScales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = (this.params.orbitRadius || 1.5) * (0.8 + Math.random() * 0.4);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      randomScales[i] = Math.random();
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.particleMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(this.params.pipColor || '#00e5ff'),
      size: 0.08,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.group.add(this.particleSystem);
  }

  onParamsUpdated() {
    if (this.particleMaterial) {
      this.particleMaterial.color.set(this.params.pipColor);
    }
    this.rebuildParticles();
  }

  update(time, delta) {
    if (this.particleSystem) {
      const speed = this.params.swarmSpeed || 1.8;
      this.particleSystem.rotation.y = time * speed * 0.5;
      this.particleSystem.rotation.x = Math.sin(time * speed * 0.3) * 0.4;
    }
  }
}
"""

# 7. src/effects/StadiumPitchCameraEffect.js
files["src/effects/StadiumPitchCameraEffect.js"] = """import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

export class StadiumPitchCameraEffect extends BaseEffect {
  static id = 'pitch-camera';
  static label = '3. Tactical Pitch & Camera View';

  static getParameterSchema() {
    return [
      { name: 'cameraPitchAngle', label: 'Camera Angle (°)', min: 15, max: 75, step: 1, default: 40 },
      { name: 'fieldGlow', label: 'Line Intensity', min: 0.2, max: 2.0, step: 0.1, default: 1.0 },
      { name: 'pitchColor', label: 'Turf Color', type: 'color', default: '#0d2818' },
      { name: 'lineColor', label: 'Pitch Line Color', type: 'color', default: '#2ec4b6' }
    ];
  }

  constructor(scene, camera, renderer) {
    super(scene, camera, renderer);

    // Create 3D Tactical Field Mesh
    const fieldGeo = new THREE.PlaneGeometry(10, 14);
    this.fieldMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.params.pitchColor || '#0d2818'),
      roughness: 0.6,
      metalness: 0.1
    });

    this.fieldMesh = new THREE.Mesh(fieldGeo, this.fieldMat);
    this.fieldMesh.rotation.x = -Math.PI / 2;
    this.group.add(this.fieldMesh);

    // Pitch Grid Overlay
    const grid = new THREE.GridHelper(14, 14, 0x2ec4b6, 0x1b4332);
    grid.position.y = 0.01;
    this.group.add(grid);

    // Lighting setup
    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(5, 10, 5);
    this.group.add(light);
    this.group.add(new THREE.AmbientLight(0xffffff, 0.4));
  }

  onParamsUpdated() {
    this.fieldMat.color.set(this.params.pitchColor);
  }

  update(time, delta) {
    const angleRad = (this.params.cameraPitchAngle || 40) * (Math.PI / 180);
    const distance = 12;

    this.camera.position.x = Math.sin(time * 0.2) * 1.5;
    this.camera.position.y = Math.sin(angleRad) * distance;
    this.camera.position.z = Math.cos(angleRad) * distance;
    this.camera.lookAt(0, 0, 0);
  }
}
"""

# 8. src/effects/KnockoutExplosionEffect.js
files["src/effects/KnockoutExplosionEffect.js"] = """import * as THREE from 'three';
import { BaseEffect } from './BaseEffect.js';

export class KnockoutExplosionEffect extends BaseEffect {
  static id = 'knockout-explosion';
  static label = '4. Player KO & Goal Impact Effect';

  static getParameterSchema() {
    return [
      { name: 'explosionSpeed', label: 'Explosion Speed', min: 0.5, max: 3.0, step: 0.1, default: 1.5 },
      { name: 'particleCount', label: 'Debris Count', min: 50, max: 500, step: 10, default: 200 },
      { name: 'coreColor', label: 'Core Flare', type: 'color', default: '#ff0055' }
    ];
  }

  constructor(scene, camera, renderer) {
    super(scene, camera, renderer);
    this.camera.position.set(0, 0, 7);
    this.cycleTime = 0;

    this.rebuildSystem();
  }

  rebuildSystem() {
    if (this.particles) {
      this.group.remove(this.particles);
      this.geo.dispose();
      this.mat.dispose();
    }

    const count = this.params.particleCount || 200;
    this.geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      this.positions[i * 3] = 0;
      this.positions[i * 3 + 1] = 0;
      this.positions[i * 3 + 2] = 0;

      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(2 + Math.random() * 4);

      this.velocities[i * 3] = dir.x;
      this.velocities[i * 3 + 1] = dir.y;
      this.velocities[i * 3 + 2] = dir.z;
    }

    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    this.mat = new THREE.PointsMaterial({
      color: new THREE.Color(this.params.coreColor || '#ff0055'),
      size: 0.12,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(this.geo, this.mat);
    this.group.add(this.particles);
  }

  onParamsUpdated() {
    this.rebuildSystem();
  }

  update(time, delta) {
    this.cycleTime += delta * (this.params.explosionSpeed || 1.5);
    if (this.cycleTime > 2.0) {
      this.cycleTime = 0; // Loop explosion cycle
    }

    const pos = this.geo.attributes.position.array;
    const count = pos.length / 3;

    for (let i = 0; i < count; i++) {
      if (this.cycleTime === 0) {
        pos[i * 3] = 0;
        pos[i * 3 + 1] = 0;
        pos[i * 3 + 2] = 0;
      } else {
        pos[i * 3] += this.velocities[i * 3] * delta;
        pos[i * 3 + 1] += this.velocities[i * 3 + 1] * delta;
        pos[i * 3 + 2] += this.velocities[i * 3 + 2] * delta;
      }
    }

    this.geo.attributes.position.needsUpdate = true;
    this.mat.opacity = Math.max(0, 1.0 - (this.cycleTime / 2.0));
  }
}
"""

# 9. src/tests/VisualizerHarness.js
files["src/tests/VisualizerHarness.js"] = """import * as THREE from 'three';
import GUI from 'lil-gui';

export class VisualizerHarness {
  constructor(containerEl, guiContainerEl, effectListEl, fpsEl) {
    this.container = containerEl;
    this.guiContainer = guiContainerEl;
    this.effectListEl = effectListEl;
    this.fpsEl = fpsEl;

    this.effects = [];
    this.activeEffect = null;

    // Standard Three.js Scene Setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, containerEl.clientWidth / containerEl.clientHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    this.container.appendChild(this.renderer.domElement);

    // Frame Benchmark Stats
    this.clock = new THREE.Clock();
    this.frameCount = 0;
    this.lastFpsUpdate = 0;

    window.addEventListener('resize', () => this.onResize());
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  registerEffect(EffectClass) {
    this.effects.push(EffectClass);
    const btn = document.createElement('button');
    btn.className = 'effect-btn';
    btn.innerText = EffectClass.label;
    btn.onclick = () => this.selectEffect(this.effects.length - 1);
    this.effectListEl.appendChild(btn);
  }

  selectEffect(index) {
    if (this.activeEffect) {
      this.activeEffect.destroy();
      this.activeEffect = null;
    }

    // Update UI highlights
    const buttons = this.effectListEl.querySelectorAll('.effect-btn');
    buttons.forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
    });

    const EffectClass = this.effects[index];
    this.activeEffect = new EffectClass(this.scene, this.camera, this.renderer);

    this.setupGUI(EffectClass.getParameterSchema());
  }

  setupGUI(schema) {
    if (this.gui) {
      this.gui.destroy();
    }

    this.gui = new GUI({ container: this.guiContainer, title: 'Effect Parameters' });
    const params = {};

    schema.forEach(item => {
      params[item.name] = item.default;
      this.activeEffect.params[item.name] = item.default;

      let controller;
      if (item.type === 'color') {
        controller = this.gui.addColor(params, item.name).name(item.label);
      } else {
        controller = this.gui.add(params, item.name, item.min, item.max, item.step).name(item.label);
      }

      controller.onChange(val => {
        this.activeEffect.params[item.name] = val;
        this.activeEffect.onParamsUpdated();
      });
    });

    this.activeEffect.onParamsUpdated();
  }

  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    if (this.activeEffect) {
      this.activeEffect.update(elapsedTime, delta);
    }

    this.renderer.render(this.scene, this.camera);

    // FPS Counter
    this.frameCount++;
    if (elapsedTime - this.lastFpsUpdate >= 1.0) {
      this.fpsEl.innerText = `FPS: ${this.frameCount} | Draw Calls: ${this.renderer.info.render.calls}`;
      this.frameCount = 0;
      this.lastFpsUpdate = elapsedTime;
    }
  }
}
"""

# Write out the files using ds_python_interpreter
os.makedirs("draft-heroes-vfx-lab/src/effects", exist_ok=True)
os.makedirs("draft-heroes-vfx-lab/src/tests", exist_ok=True)

for path, content in files.items():
    full_path = os.path.join("draft-heroes-vfx-lab", path)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Project files written successfully.")