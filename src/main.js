import { VisualizerHarness } from './tests/VisualizerHarness.js';

import { HolographicFoilEffect } from './effects/HolographicFoilEffect.js';
import { ParticleEnergyPipsEffect } from './effects/ParticleEnergyPipsEffect.js';
import { KnockoutExplosionEffect } from './effects/KnockoutExplosionEffect.js';
import { ElectricBoltEffect } from './effects/ElectricBoltEffect.js';
import { SmokeHazeEffect } from './effects/SmokeHazeEffect.js';
import { TransparencyEffect } from './effects/TransparencyEffect.js';
import { CardFlip3DEffect } from './effects/CardFlip3DEffect.js';
import { DeckStack3DEffect } from './effects/DeckStack3DEffect.js';
import { PerspectivePitchEffect } from './effects/PerspectivePitchEffect.js';

const effectRegistry = [
  HolographicFoilEffect,
  ParticleEnergyPipsEffect,
  KnockoutExplosionEffect,
  ElectricBoltEffect,
  SmokeHazeEffect,
  TransparencyEffect,
  CardFlip3DEffect,
  DeckStack3DEffect,
  PerspectivePitchEffect
];

window.addEventListener('DOMContentLoaded', () => {
  const harness = new VisualizerHarness(
    document.getElementById('canvas-container'),
    document.getElementById('gui-container'),
    document.getElementById('effect-list'),
    document.getElementById('fps-counter'),
    document.getElementById('card-image-input'),
    document.getElementById('multi-stack-toggle')
  );

  effectRegistry.forEach(EffectClass => harness.registerEffect(EffectClass));
  harness.selectEffect(0);
});
