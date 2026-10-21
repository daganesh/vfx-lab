import * as THREE from 'three';
import GUI from 'lil-gui';
import { loadEffectConfigs } from '../config/configLoader.js';

export class VisualizerHarness {
  constructor(containerEl, guiContainerEl, effectListEl, fpsEl, imageInputEl, multiStackToggleEl) {
    this.container = containerEl;
    this.guiContainer = guiContainerEl;
    this.effectListEl = effectListEl;
    this.fpsEl = fpsEl;
    this.imageInputEl = imageInputEl;
    this.multiStackToggleEl = multiStackToggleEl;

    this.effectsRegistry = [];
    this.activeEffectsMap = new Map();
    this.singleActiveIndex = -1;
    this.isMultiStack = false;
    this.configMap = new Map();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, containerEl.clientWidth / containerEl.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 0, 6.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.frameCount = 0;
    this.lastFpsUpdate = 0;

    // Load default configs from /src/config/ on startup
    loadEffectConfigs().then(map => {
      this.configMap = map;
      this.refreshEffectSelection();
    });

    this.imageInputEl.addEventListener('change', (e) => this.handleImageUpload(e));
    this.multiStackToggleEl.addEventListener('change', (e) => {
      this.isMultiStack = e.target.checked;
      this.refreshEffectSelection();
    });

    window.addEventListener('resize', () => this.onResize());
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  registerEffect(EffectClass) {
    const index = this.effectsRegistry.length;
    this.effectsRegistry.push(EffectClass);

    const btn = document.createElement('button');
    btn.className = 'effect-btn';
    btn.innerText = EffectClass.label;

    btn.addEventListener('click', () => {
      this.toggleEffectSelection(index);
    });

    this.effectListEl.appendChild(btn);
  }

  applyConfigToEffect(EffectClass, effectInstance) {
    const schema = EffectClass.getParameterSchema();
    const loadedConfig = this.configMap.get(EffectClass.id);

    schema.forEach(item => {
      if (loadedConfig && loadedConfig[item.name] !== undefined) {
        effectInstance.params[item.name] = loadedConfig[item.name];
      } else {
        effectInstance.params[item.name] = item.default;
      }
    });

    effectInstance.onParamsUpdated();
  }

  toggleEffectSelection(index) {
    if (!this.isMultiStack) {
      this.singleActiveIndex = index;
    } else {
      if (this.activeEffectsMap.has(index)) {
        this.activeEffectsMap.get(index).destroy();
        this.activeEffectsMap.delete(index);
      } else {
        const EffectClass = this.effectsRegistry[index];
        const effectInstance = new EffectClass(this.scene, this.camera, this.renderer);
        this.applyConfigToEffect(EffectClass, effectInstance);

        if (this.uploadedTexture && typeof effectInstance.onTextureUpdated === 'function') {
          effectInstance.onTextureUpdated(this.uploadedTexture);
        }
        this.activeEffectsMap.set(index, effectInstance);
      }
    }
    this.refreshEffectSelection();
  }

  refreshEffectSelection() {
    const buttons = this.effectListEl.querySelectorAll('.effect-btn');

    if (!this.isMultiStack) {
      this.activeEffectsMap.forEach(effect => effect.destroy());
      this.activeEffectsMap.clear();

      if (this.singleActiveIndex >= 0) {
        const EffectClass = this.effectsRegistry[this.singleActiveIndex];
        const effectInstance = new EffectClass(this.scene, this.camera, this.renderer);
        this.applyConfigToEffect(EffectClass, effectInstance);

        if (this.uploadedTexture && typeof effectInstance.onTextureUpdated === 'function') {
          effectInstance.onTextureUpdated(this.uploadedTexture);
        }
        this.activeEffectsMap.set(this.singleActiveIndex, effectInstance);
      }

      buttons.forEach((btn, i) => {
        btn.classList.toggle('active', i === this.singleActiveIndex);
      });
    } else {
      buttons.forEach((btn, i) => {
        btn.classList.toggle('active', this.activeEffectsMap.has(i));
      });
    }

    this.rebuildGUI();
  }

  rebuildGUI() {
    if (this.gui) this.gui.destroy();
    this.gui = new GUI({ container: this.guiContainer, title: 'Effect Parameters' });

    this.activeEffectsMap.forEach((effectInstance, index) => {
      const EffectClass = this.effectsRegistry[index];
      const folder = this.gui.addFolder(EffectClass.label);
      const schema = EffectClass.getParameterSchema();

      schema.forEach(item => {
        let controller;
        if (item.type === 'color') {
          controller = folder.addColor(effectInstance.params, item.name).name(item.label);
        } else if (item.options) {
          controller = folder.add(effectInstance.params, item.name, item.options).name(item.label);
        } else if (item.min !== undefined && item.max !== undefined) {
          controller = folder.add(effectInstance.params, item.name, item.min, item.max, item.step).name(item.label);
        }

        if (controller) {
          controller.onChange(val => {
            effectInstance.params[item.name] = val;
            effectInstance.onParamsUpdated();
          });
        }
      });

      const fileFolder = folder.addFolder('📁 Config File Actions');
      const actionObj = {
        saveToFile: () => {
          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(effectInstance.params, null, 2));
          const anchor = document.createElement('a');
          anchor.setAttribute("href", dataStr);
          anchor.setAttribute("download", `${EffectClass.id}.json`);
          anchor.click();
        },
        resetDefault: () => {
          this.applyConfigToEffect(EffectClass, effectInstance);
          this.rebuildGUI();
        }
      };

      fileFolder.add(actionObj, 'saveToFile').name('💾 Save to JSON File');
      fileFolder.add(actionObj, 'resetDefault').name('↺ Reset to Config');
    });
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
    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.activeEffectsMap.forEach(effect => effect.update(elapsedTime, delta));

    this.renderer.render(this.scene, this.camera);

    this.frameCount++;
    if (elapsedTime - this.lastFpsUpdate >= 1.0) {
      this.fpsEl.innerText = `FPS: ${this.frameCount} | Calls: ${this.renderer.info.render.calls}`;
      this.frameCount = 0;
      this.lastFpsUpdate = elapsedTime;
    }
  }
}
