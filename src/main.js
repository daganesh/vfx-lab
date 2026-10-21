import { VisualizerHarness } from './tests/VisualizerHarness.js';

import { HolographicFoilEffect } from './effects/HolographicFoilEffect.js';
import { ParticleEnergyPipsEffect } from './effects/ParticleEnergyPipsEffect.js';
import { KnockoutExplosionEffect } from './effects/KnockoutExplosionEffect.js';
import { ElectricBoltEffect } from './effects/ElectricBoltEffect.js';
import { ElectricCardEffect } from './effects/ElectricCardEffect.js';
import { DiamondGlassEffect } from './effects/DiamondGlassEffect.js';
import { FireEffect } from './effects/FireEffect.js';
import { SmokeHazeEffect } from './effects/SmokeHazeEffect.js';
import { TransparencyEffect } from './effects/TransparencyEffect.js';
import { CardFlip3DEffect } from './effects/CardFlip3DEffect.js';
import { DeckStack3DEffect } from './effects/DeckStack3DEffect.js';
import { FireAuraEffect } from './effects/FireAuraEffect.js';
import { MetallicCardEffect } from './effects/MetallicCardEffect.js';
import { WoodenCardEffect } from './effects/WoodenCardEffect.js';
import { LayerParallaxEffect } from './effects/LayerParallaxEffect.js';
import { PerspectivePitchEffect } from './effects/PerspectivePitchEffect.js';

const effectRegistry = [
  HolographicFoilEffect,
  ParticleEnergyPipsEffect,
  KnockoutExplosionEffect,
  ElectricBoltEffect,
  SmokeHazeEffect,
  FireEffect,
  ElectricCardEffect,
  TransparencyEffect,
  DiamondGlassEffect,
  CardFlip3DEffect,
  DeckStack3DEffect,
  PerspectivePitchEffect,
  FireAuraEffect,
  MetallicCardEffect,
  WoodenCardEffect,
  LayerParallaxEffect
];

// Card + particle combinations. An entry is an effect class, or [class, paramOverrides].
const presets = [
  { label: '🌟 Legendary Pull', effects: [HolographicFoilEffect, ParticleEnergyPipsEffect, [CardFlip3DEffect, { flipSpeed: 0.8 }]] },
  { label: '💥 KO Finisher', effects: [KnockoutExplosionEffect, [ElectricCardEffect, { boltColor: '#fff3a0', haloColor: '#ff3b3b' }], DeckStack3DEffect] },
  { label: '⚡ Storm Card', effects: [ElectricBoltEffect, SmokeHazeEffect, HolographicFoilEffect] },
  { label: '👻 Spirit Card', effects: [[TransparencyEffect, { cardOpacity: 0.55 }], SmokeHazeEffect, [ParticleEnergyPipsEffect, { pipColor: '#b388ff' }]] },
  { label: '🏟️ Matchday Reveal', effects: [PerspectivePitchEffect, [CardFlip3DEffect, { flipSpeed: 1.0 }], ParticleEnergyPipsEffect] },
  { label: '🔥 Burning Card', effects: [FireEffect, [SmokeHazeEffect, { smokeColor: '#555a66', driftSpeed: 0.7 }], ParticleEnergyPipsEffect] },
  { label: '⚡ Live Wire', effects: [ElectricCardEffect, SmokeHazeEffect, [ParticleEnergyPipsEffect, { pipColor: '#7aa8ff' }]] },
  { label: '💎 Diamond Card', effects: [DiamondGlassEffect, HolographicFoilEffect, [CardFlip3DEffect, { flipSpeed: 0.6 }], [ParticleEnergyPipsEffect, { pipColor: '#ffffff' }]] },
  { label: '🧊 Clear Glass', effects: [[DiamondGlassEffect, { facets: 0, ior: 1.5, iridescence: 0.2, sparkle: 0.2 }], SmokeHazeEffect] },
  { label: '🪵 Carved Wood', effects: [WoodenCardEffect, [ParticleEnergyPipsEffect, { pipColor: '#ffd36b' }]] },
  { label: '🥇 Gold Plated', effects: [[MetallicCardEffect, { metalPreset: 'gold' }], ParticleEnergyPipsEffect] },
  { label: '🔥 Fire Aura', effects: [FireAuraEffect, SmokeHazeEffect] },
  { label: '🎞️ Parallax Hero', effects: [LayerParallaxEffect, [ParticleEnergyPipsEffect, { pipColor: '#9fe8ff' }]], card: 'layered' },
  { label: '📦 Pack Opening', effects: [DeckStack3DEffect, KnockoutExplosionEffect, HolographicFoilEffect, SmokeHazeEffect] }
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
    cardSelect: $('card-select'),
    multiStackToggle: $('multi-stack-toggle')
  });

  effectRegistry.forEach(EffectClass => harness.registerEffect(EffectClass));
  presets.forEach(preset => harness.registerPreset(preset));
  harness.selectEffect(0);
  window.harness = harness; // handy for console poking
});
