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

// Card + particle combinations. An entry is an effect class, or [class, paramOverrides].
const presets = [
  { label: '🌟 Legendary Pull', effects: [HolographicFoilEffect, ParticleEnergyPipsEffect, [CardFlip3DEffect, { flipSpeed: 0.8 }]] },
  { label: '💥 KO Finisher', effects: [KnockoutExplosionEffect, [ElectricBoltEffect, { boltColor: '#ffea00', haloColor: '#ff0044' }], DeckStack3DEffect] },
  { label: '⚡ Storm Card', effects: [ElectricBoltEffect, SmokeHazeEffect, HolographicFoilEffect] },
  { label: '👻 Spirit Card', effects: [[TransparencyEffect, { cardOpacity: 0.55 }], SmokeHazeEffect, [ParticleEnergyPipsEffect, { pipColor: '#b388ff' }]] },
  { label: '🏟️ Matchday Reveal', effects: [PerspectivePitchEffect, [CardFlip3DEffect, { flipSpeed: 1.0 }], ParticleEnergyPipsEffect] },
  { label: '🔥 Pack Opening', effects: [DeckStack3DEffect, KnockoutExplosionEffect, HolographicFoilEffect, SmokeHazeEffect] }
];

window.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const harness = new VisualizerHarness({
    container: $('canvas-container'),
    guiContainer: $('gui-container'),
    effectList: $('effect-list'),
    presetList: $('preset-list'),
    fps: $('fps-counter'),
    imageInput: $('card-image-input'),
    multiStackToggle: $('multi-stack-toggle')
  });

  effectRegistry.forEach(EffectClass => harness.registerEffect(EffectClass));
  presets.forEach(preset => harness.registerPreset(preset));
  harness.selectEffect(0);
  window.harness = harness; // handy for console poking
});
