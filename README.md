# vfx-lab
A test laboratory of JS visual effects


## Architecture

- `src/core/Stage.js` owns the shared card, lights, drag-rotate (double-click resets) and camera.
- Effects (`src/effects/*`) are layers on the stage. `static attach = 'card'` makes an effect move with the card; `'world'` puts it in the scene. Effects that need the camera call `stage.setCameraOverride(this, …)`; it is released automatically on `destroy()`.
- Turn on **Combine Multiple Effects**, or pick a preset under **Combos**, to stack card and particle effects (presets live in `src/main.js`).

## Run
npm install
npm run dev
