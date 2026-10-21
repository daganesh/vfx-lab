import * as THREE from 'three';

// Owns everything effects share: the base card, lights, drag-to-rotate and the
// camera. Effects are layers on top of it, which is what makes them combinable.
//
//   scene
//    ├─ lights
//    ├─ dragGroup        (user drag rotation)
//    │   └─ cardPivot    (effect-driven motion, e.g. flip; 'card'-attached effects live here)
//    └─ 'world'-attached effects (particles, pitch, bolts)
export class Stage {
  static getParameterSchema() {
    return [
      { name: 'showCard', label: 'Show Base Card', type: 'boolean', default: true },
      { name: 'cardWidth', label: 'Card Aspect Width', min: 1.5, max: 4.0, step: 0.1, default: 2.5 },
      { name: 'cardDepth', label: 'Card 3D Thickness', min: 0.01, max: 0.3, step: 0.01, default: 0.05 },
      { name: 'dragRotationSensitivity', label: 'Mouse Drag Sensitivity', min: 0.1, max: 2.0, step: 0.1, default: 1.0 }
    ];
  }

  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.cardHeight = 3.5;

    this.params = {};
    Stage.getParameterSchema().forEach(item => { this.params[item.name] = item.default; });

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 5, 7);
    scene.add(dirLight);

    this.dragGroup = new THREE.Group();
    this.cardPivot = new THREE.Group();
    this.dragGroup.add(this.cardPivot);
    scene.add(this.dragGroup);

    this.buildCard();

    this.defaultCamera = { position: new THREE.Vector3(0, 0, 6.5), fov: 45, lookAt: new THREE.Vector3() };
    this.cameraOverrides = new Map();
    this.lookTarget = new THREE.Vector3();

    this.setupDrag();
  }

  buildCard() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 716;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#121826';
    ctx.fillRect(0, 0, 512, 716);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 12;
    ctx.strokeRect(10, 10, 492, 696);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('DRAFT HEROES', 110, 80);
    ctx.fillStyle = '#00bcd4';
    ctx.fillRect(40, 120, 432, 400);
    ctx.fillStyle = '#ffffff';
    ctx.font = '28px sans-serif';
    ctx.fillText('ACTION CARD', 150, 320);
    this.cardTexture = new THREE.CanvasTexture(canvas);
    this.cardTexture.colorSpace = THREE.SRGBColorSpace;

    const side = new THREE.MeshStandardMaterial({ color: 0x00bcd4, metalness: 0.3, roughness: 0.4 });
    this.frontMat = new THREE.MeshStandardMaterial({ map: this.cardTexture });
    const back = new THREE.MeshStandardMaterial({ color: 0x0a1128 });
    // Box face order: +x, -x, +y, -y, +z (front), -z (back)
    this.materials = [side, side, side, side, this.frontMat, back];
    // Effects borrow these; BaseEffect.destroy must not dispose them.
    [side, this.frontMat, back].forEach(m => { m.userData.shared = true; });

    this.cardMesh = new THREE.Mesh(this.makeCardGeometry(), this.materials);
    this.cardPivot.add(this.cardMesh);
  }

  makeCardGeometry() {
    return new THREE.BoxGeometry(this.params.cardWidth, this.cardHeight, this.params.cardDepth);
  }

  applyParams() {
    this.cardMesh.geometry.dispose();
    this.cardMesh.geometry = this.makeCardGeometry();
    this.cardMesh.visible = this.params.showCard;
  }

  setTexture(texture) {
    this.frontMat.map = texture;
    this.frontMat.needsUpdate = true;
  }

  setupDrag() {
    let dragging = false;
    let last = { x: 0, y: 0 };

    this.renderer.domElement.addEventListener('pointerdown', e => {
      dragging = true;
      last = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('pointermove', e => {
      if (!dragging) return;
      const sens = this.params.dragRotationSensitivity * 0.01;
      this.dragGroup.rotation.y += (e.clientX - last.x) * sens;
      this.dragGroup.rotation.x += (e.clientY - last.y) * sens;
      if (e.shiftKey) this.dragGroup.rotation.z += ((e.clientX - last.x) + (e.clientY - last.y)) * sens * 0.5;
      last = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('pointerup', () => { dragging = false; });
    this.renderer.domElement.addEventListener('dblclick', () => this.dragGroup.rotation.set(0, 0, 0));
  }

  // Effects that want the camera (fov and/or position) register an override.
  // The most recently added wins, and clearing it restores the previous view.
  // spec: { position?: Vector3, fov?: number, lookAt?: Vector3 }
  setCameraOverride(owner, spec) {
    this.cameraOverrides.delete(owner); // re-insert so it becomes the latest
    this.cameraOverrides.set(owner, spec);
  }

  clearCameraOverride(owner) {
    this.cameraOverrides.delete(owner);
  }

  update(delta) {
    const base = this.defaultCamera;
    const target = { position: base.position, fov: base.fov, lookAt: base.lookAt };
    this.cameraOverrides.forEach(o => {
      if (o.position) target.position = o.position;
      if (o.fov !== undefined) target.fov = o.fov;
      if (o.lookAt) target.lookAt = o.lookAt;
    });

    const k = 1 - Math.exp(-delta * 6); // frame-rate independent easing
    this.camera.position.lerp(target.position, k);
    if (Math.abs(this.camera.fov - target.fov) > 0.01) {
      this.camera.fov += (target.fov - this.camera.fov) * k;
      this.camera.updateProjectionMatrix();
    }
    this.lookTarget.lerp(target.lookAt, k);
    this.camera.lookAt(this.lookTarget);
  }
}
