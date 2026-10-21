import * as THREE from 'three';
import GUI from 'lil-gui';
import { Stage } from '../core/Stage.js';

export class VisualizerHarness {
  constructor({ container, guiContainer, effectList, presetList, fps, imageInput, multiStackToggle }) {
    this.container = container;
    this.guiContainer = guiContainer;
    this.effectListEl = effectList;
    this.presetListEl = presetList;
    this.fpsEl = fps;
    this.imageInputEl = imageInput;
    this.multiStackToggleEl = multiStackToggle;

    this.effectsRegistry = [];
    this.activeEffectsMap = new Map(); // registry index -> effect instance
    this.singleActiveIndex = -1;
    this.lastToggledIndex = -1;
    this.isMultiStack = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 0, 6.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    container.appendChild(this.renderer.domElement);

    this.stage = new Stage(this.scene, this.camera, this.renderer);

    this.clock = new THREE.Clock();
    this.frameCount = 0;
    this.lastFpsUpdate = 0;

    this.imageInputEl.addEventListener('change', e => this.handleImageUpload(e));
    this.multiStackToggleEl.addEventListener('change', e => this.setMultiStack(e.target.checked));

    window.addEventListener('resize', () => this.onResize());
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const texture = new THREE.Texture(img);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        this.stage.setTexture(texture);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  registerEffect(EffectClass) {
    const index = this.effectsRegistry.length;
    this.effectsRegistry.push(EffectClass);

    const btn = document.createElement('button');
    btn.className = 'effect-btn';
    const tag = document.createElement('span');
    tag.className = `tag tag-${EffectClass.category}`;
    tag.textContent = EffectClass.category;
    btn.append(EffectClass.label, tag);
    btn.addEventListener('click', () => this.toggleEffectSelection(index));
    this.effectListEl.appendChild(btn);
  }

  // preset: { label, effects: [EffectClass | [EffectClass, paramOverrides]] }
  registerPreset(preset) {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.textContent = preset.label;
    btn.title = preset.effects.map(e => (Array.isArray(e) ? e[0] : e).label).join(' + ');
    btn.addEventListener('click', () => this.applyPreset(preset));
    this.presetListEl.appendChild(btn);
  }

  applyPreset(preset) {
    this.multiStackToggleEl.checked = true;
    this.isMultiStack = true;
    this.clearEffects();
    preset.effects.forEach(entry => {
      const [EffectClass, overrides] = Array.isArray(entry) ? entry : [entry, null];
      const index = this.effectsRegistry.indexOf(EffectClass);
      if (index < 0) return;
      const effect = this.createEffect(index);
      if (overrides) {
        Object.assign(effect.params, overrides);
        effect.onParamsUpdated();
      }
      this.activeEffectsMap.set(index, effect);
    });
    this.refreshEffectSelection();
  }

  createEffect(index) {
    const effect = new this.effectsRegistry[index](this.stage);
    effect.onParamsUpdated();
    return effect;
  }

  clearEffects() {
    this.activeEffectsMap.forEach(effect => effect.destroy());
    this.activeEffectsMap.clear();
  }

  setMultiStack(enabled) {
    this.isMultiStack = enabled;
    if (!enabled) {
      // Collapse back to a single effect: the one last clicked, else the first active.
      const keep = this.activeEffectsMap.has(this.lastToggledIndex)
        ? this.lastToggledIndex
        : [...this.activeEffectsMap.keys()][0];
      this.activeEffectsMap.forEach((effect, i) => {
        if (i !== keep) { effect.destroy(); this.activeEffectsMap.delete(i); }
      });
      this.singleActiveIndex = keep ?? -1;
    }
    this.refreshEffectSelection();
  }

  toggleEffectSelection(index) {
    this.lastToggledIndex = index;
    if (!this.isMultiStack) {
      if (this.singleActiveIndex !== index) {
        this.clearEffects();
        this.singleActiveIndex = index;
        this.activeEffectsMap.set(index, this.createEffect(index));
      }
    } else if (this.activeEffectsMap.has(index)) {
      this.activeEffectsMap.get(index).destroy();
      this.activeEffectsMap.delete(index);
    } else {
      this.activeEffectsMap.set(index, this.createEffect(index));
    }
    this.refreshEffectSelection();
  }

  selectEffect(index) {
    this.toggleEffectSelection(index);
  }

  refreshEffectSelection() {
    this.effectListEl.querySelectorAll('.effect-btn').forEach((btn, i) => {
      btn.classList.toggle('active', this.activeEffectsMap.has(i));
    });
    this.rebuildGUI();
  }

  rebuildGUI() {
    if (this.gui) this.gui.destroy();
    this.gui = new GUI({ container: this.guiContainer, title: 'Effect Parameters' });

    this.addFolder('🃏 Base Card', Stage.getParameterSchema(), this.stage.params, () => this.stage.applyParams());

    this.activeEffectsMap.forEach((effect, index) => {
      const EffectClass = this.effectsRegistry[index];
      this.addFolder(EffectClass.label, EffectClass.getParameterSchema(), effect.params, () => effect.onParamsUpdated());
    });
  }

  addFolder(title, schema, params, onChange) {
    const folder = this.gui.addFolder(title);
    schema.forEach(item => {
      const controller = item.type === 'color'
        ? folder.addColor(params, item.name)
        : item.type === 'boolean'
          ? folder.add(params, item.name)
          : item.options
            ? folder.add(params, item.name, item.options)
            : folder.add(params, item.name, item.min, item.max, item.step);
      controller.name(item.label).onChange(onChange);
    });
    return folder;
  }

  onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  animate() {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1); // don't jump after a background tab
    const elapsedTime = this.clock.getElapsedTime();

    this.activeEffectsMap.forEach(effect => effect.update(elapsedTime, delta));
    this.stage.update(delta);

    this.renderer.render(this.scene, this.camera);

    this.frameCount++;
    if (elapsedTime - this.lastFpsUpdate >= 1.0) {
      this.fpsEl.innerText = `FPS: ${this.frameCount} | Calls: ${this.renderer.info.render.calls}`;
      this.frameCount = 0;
      this.lastFpsUpdate = elapsedTime;
    }
  }
}
