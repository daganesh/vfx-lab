import { VisualizerHarness } from './tests/VisualizerHarness.js';
import { DesktopDropTest } from './tests/DesktopDropTest.js';
import { loadEffectsDynamically } from './effects/loader.js';

window.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const tabHarnessBtn = document.getElementById('tab-btn-harness');
  const tabDropBtn = document.getElementById('tab-btn-drop');

  const pageHarness = document.getElementById('page-harness');
  const pageDrop = document.getElementById('page-drop');

  // Instance References
  let harnessInstance = null;
  let dropDemoHarnessInstance = null;

  // --- 1. Mount Page 1: Visualizer Harness Demo ---
  async function mountHarnessPage() {
    if (harnessInstance) return;

    harnessInstance = new VisualizerHarness(
      document.getElementById('harness-canvas-container'),
      document.getElementById('harness-gui-container'),
      document.getElementById('effect-list'),
      document.getElementById('harness-fps-counter'),
      document.getElementById('card-image-input'),
      document.getElementById('multi-stack-toggle')
    );

    // Auto-discover effects library
    const effects = await loadEffectsDynamically();
    effects.forEach(EffectClass => harnessInstance.registerEffect(EffectClass));

    if (effects.length > 0) {
      harnessInstance.selectEffect(0);
    }
  }

  // --- 2. Mount Page 2: Desktop Drop Test Demo ---
  function mountDesktopDropPage() {
    if (dropDemoHarnessInstance) return;

    // Use VisualizerHarness as container manager for the DesktopDropTest demo
    dropDemoHarnessInstance = new VisualizerHarness(
      document.getElementById('drop-canvas-container'),
      document.getElementById('drop-gui-container'),
      document.createElement('div'), // Mock sidebar
      document.getElementById('drop-fps-counter'),
      document.createElement('input'), // Mock image input
      document.createElement('input')  // Mock stack toggle
    );

    dropDemoHarnessInstance.registerEffect(DesktopDropTest);
    dropDemoHarnessInstance.selectEffect(0);
  }

  // --- 3. Unmount Pages to preserve WebGL Context & Memory ---
  function unmountHarnessPage() {
    if (harnessInstance) {
      const container = document.getElementById('harness-canvas-container');
      container.innerHTML = '';
      const guiContainer = document.getElementById('harness-gui-container');
      guiContainer.innerHTML = '';
      harnessInstance = null;
    }
  }

  function unmountDesktopDropPage() {
    if (dropDemoHarnessInstance) {
      const container = document.getElementById('drop-canvas-container');
      container.innerHTML = '';
      const guiContainer = document.getElementById('drop-gui-container');
      guiContainer.innerHTML = '';
      dropDemoHarnessInstance = null;
    }
  }

  // --- 4. Tab Switcher Controller ---
  function switchTab(target) {
    if (target === 'harness') {
      tabHarnessBtn.classList.add('active');
      tabDropBtn.classList.remove('active');

      pageHarness.classList.add('active');
      pageDrop.classList.remove('active');

      unmountDesktopDropPage();
      mountHarnessPage();
    } else if (target === 'drop') {
      tabDropBtn.classList.add('active');
      tabHarnessBtn.classList.remove('active');

      pageDrop.classList.add('active');
      pageHarness.classList.remove('active');

      unmountHarnessPage();
      mountDesktopDropPage();
    }
  }

  // Tab Navigation Click Listeners
  tabHarnessBtn.addEventListener('click', () => switchTab('harness'));
  tabDropBtn.addEventListener('click', () => switchTab('drop'));

  // Initial Load: Mount Visualizer Harness Demo
  mountHarnessPage();
});
