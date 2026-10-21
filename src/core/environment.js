import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

let env = null;

// Glass has nothing to reflect in an empty scene, so give it a studio-lit room.
// Applied per material (not scene.environment) so other effects are unaffected.
export function studioEnvironment(renderer) {
  if (env) return env;
  const pmrem = new THREE.PMREMGenerator(renderer);
  env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return env;
}
