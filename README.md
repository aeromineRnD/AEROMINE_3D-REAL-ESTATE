# AEROMINE 3D Real Estate

An interactive 3D apartment complex viewer built with [Three.js](https://threejs.org/) and [Vite](https://vitejs.dev/). Users explore a full building overview, then drill into individual floor plans with a single click — no page reloads, no frameworks.

---

## Features

- **Full-building overview** — loads the complete apartment complex on startup
- **Floor-level exploration** — switch between Floor 1 and Floor 2 floor plans instantly
- **Zero-flash model swap** — old scene is removed and the new GLB is streamed in while the UI dims and a spinner shows progress
- **Auto-fit camera** — every model swap resets the camera to a clean isometric overview of the new scene
- **Orbit controls** — rotate, pan, and zoom freely; damped for smooth feel
- **DRACO + KTX2 support** — compressed geometry and textures load out of the box
- **Fully responsive** — layout and hint pills adapt to mobile widths

---

## Tech Stack

| Layer | Library / Tool |
|---|---|
| 3D rendering | [Three.js](https://threejs.org/) `0.176` |
| Controls | `OrbitControls` |
| Model format | GLTF 2.0 / GLB |
| Compression | DRACOLoader, KTX2Loader |
| Bundler | [Vite](https://vitejs.dev/) `5` |
| Language | Vanilla JavaScript (ES Modules) |
| Fonts | Inter + Raleway via Google Fonts |

---

## Project Structure

```
AEROMINE_3D_REAL_ESTATE/
├── public/
│   └── models/
│       ├── modern_homes_complex.glb          # Full building overview
│       ├── Floor_1_apartment_floor_plan.glb  # Floor 1 floor plan
│       └── Floor_2_apartment_floor_plan.glb  # Floor 2 floor plan
├── src/
│   ├── main.js      # App entry — floor selector logic, loading states
│   └── viewer.js    # Viewer class — scene, camera, renderer, model swap
├── index.html
├── style.css
└── package.json
```

### `src/viewer.js` — `Viewer` class

| Method | Description |
|---|---|
| `constructor(container)` | Initializes scene, camera, renderer, OrbitControls, PMREMGenerator environment, and the shared GLTFLoader |
| `load(url)` | Loads a GLB, centers it at the world origin, fits the camera, and adds it to the scene |
| `swapModel(url)` | Removes the current model from the scene, then delegates to `load()` |
| `_fitCamera(object)` | Computes the bounding box, re-centers the model, and positions the camera for a clean isometric overview |

### `src/main.js`

Boots the `Viewer`, loads the initial overview model, then wires up the floor selector buttons. Each button click calls `viewer.swapModel()` with the corresponding GLB path and manages the loading/disabled state of all buttons during the swap.

---

## Getting Started

### Prerequisites

- Node.js `18+`
- npm `9+`

### Install

```bash
npm install
```

### Develop

```bash
npm run dev
# → http://localhost:3001
```

### Build for production

```bash
npm run build
# output → dist/
```

### Preview production build

```bash
npm run preview
```

---

## Adding Models

Drop any `.glb` file into `public/models/`, then register it in `src/main.js`:

```js
const MODELS = {
  all:    '/models/modern_homes_complex.glb',
  floor1: '/models/Floor_1_apartment_floor_plan.glb',
  floor2: '/models/Floor_2_apartment_floor_plan.glb',
  // floor3: '/models/Floor_3_apartment_floor_plan.glb',  ← add here
};
```

Add a corresponding button in `index.html` inside `.floor-selector`:

```html
<button class="floor-btn" data-floor="3">
  <span class="floor-btn-icon">&#x33;</span>
  Floor 3
</button>
```

---

## Controls

| Action | Input |
|---|---|
| Rotate | Left drag |
| Pan | Right drag |
| Zoom | Scroll wheel |
| Reset view | Select a floor button |

---

## Browser Support

Any browser with WebGL 2 support — Chrome, Firefox, Safari 15+, Edge.

---

## License

MIT — © [AEROMINE R&D Team](https://www.aeromine.info/)
