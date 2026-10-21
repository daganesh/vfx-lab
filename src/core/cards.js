import * as THREE from 'three';
import ronaldoCard from '../assets/ronaldo_card.webp';
import manifest from '../assets/layered-card/layers.json';

const layerUrls = import.meta.glob('../assets/layered-card/*.png', { eager: true, query: '?url', import: 'default' });
const urlOf = file => layerUrls[`../assets/layered-card/${file}`];

const loader = new THREE.TextureLoader();
const load = url => new Promise((resolve, reject) => {
  loader.load(url, texture => { texture.colorSpace = THREE.SRGBColorSpace; resolve(texture); }, undefined, reject);
});

// A card is a flat face texture, optionally with the separate layers it was built
// from (depth 0 = on the card surface, 1 = floating furthest out). Only cards with
// layers can use layer effects such as parallax.
export const CARDS = [
  { id: 'ronaldo', label: 'Ronaldo (image)', face: () => load(ronaldoCard) },
  {
    id: 'layered',
    label: 'Layered Card',
    face: () => load(urlOf(manifest.flat)),
    layers: async () => ({
      width: manifest.width,
      height: manifest.height,
      items: await Promise.all(manifest.layers.map(async l => ({ ...l, texture: await load(urlOf(l.file)) })))
    })
  }
];
