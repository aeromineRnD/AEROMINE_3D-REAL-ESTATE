import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader }      from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader }     from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader }      from 'three/addons/loaders/KTX2Loader.js';
import { OrbitControls }   from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export class Viewer {
  constructor(container) {
    this.container = container;
    this.scene     = null;
    this.camera    = null;
    this.renderer  = null;
    this.controls  = null;
    this.content   = null;   // current model root
    this._loader   = null;

    this._init();
    this._addLights();
    this._setupResize();
    this._animate();
  }

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------

  _init() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    this.scene = new Scene();
    this.scene.background = new Color('#f0f2f5');

    this.camera = new PerspectiveCamera(60, w / h, 0.01, 1000);

    this.renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(w, h);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.screenSpacePanning = true;
    this.controls.enableDamping      = true;
    this.controls.dampingFactor      = 0.05;

    const pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment()).texture;
    pmrem.dispose();

    // Build loader once - reused for every model swap
    this._loader = new GLTFLoader();

    const draco = new DRACOLoader();
    draco.setDecoderPath(
      'https://unpkg.com/three@0.176.0/examples/jsm/libs/draco/gltf/'
    );
    this._loader.setDRACOLoader(draco);

    const ktx2 = new KTX2Loader();
    ktx2
      .setTranscoderPath('https://unpkg.com/three@0.176.0/examples/jsm/libs/basis/')
      .detectSupport(this.renderer);
    this._loader.setKTX2Loader(ktx2);
  }

  _addLights() {
    const ambient     = new AmbientLight('#ffffff', 0.3);
    const directional = new DirectionalLight('#ffffff', 0.8 * Math.PI);
    directional.position.set(0.5, 0, 0.866);

    // Attach to camera so shading stays consistent as user orbits
    this.camera.add(ambient);
    this.camera.add(directional);
    this.scene.add(this.camera);
  }

  // ---------------------------------------------------------------------------
  // Render loop
  // ---------------------------------------------------------------------------

  _animate() {
    requestAnimationFrame(() => this._animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  // ---------------------------------------------------------------------------
  // Resize
  // ---------------------------------------------------------------------------

  _setupResize() {
    window.addEventListener('resize', () => this._resize(), false);
  }

  _resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  resetView() {
    this.controls.reset();
  }

  setBackground(hex) {
    this.scene.background.set(hex);
  }

  screenshot(filename = 'aeromine-3d.png') {
    const link = document.createElement('a');
    link.download = filename;
    link.href = this.renderer.domElement.toDataURL('image/png');
    link.click();
  }

  // ---------------------------------------------------------------------------
  // Model loading / swapping
  // ---------------------------------------------------------------------------

  /** Load the initial model (no previous model to remove). */
  async load(url, onProgress) {
    const root = await this._loadGLTF(url, onProgress);
    const { position, target } = this._fitCamera(root);
    this.camera.position.copy(position);
    this.controls.target.copy(target);
    this.controls.update();
    this.controls.saveState();
    this.scene.add(root);
    this.content = root;
    return root;
  }

  /** Replace the current model with a new one, tweening the camera to the new position. */
  async swapModel(url, onProgress) {
    if (this.content) {
      this.scene.remove(this.content);
      this.content = null;
    }
    const root = await this._loadGLTF(url, onProgress);
    const { position, target } = this._fitCamera(root);
    this.scene.add(root);
    this.content = root;
    await this._tweenCamera(position, target);
    return root;
  }

  _tweenCamera(toPosition, toTarget, duration = 800) {
    return new Promise(resolve => {
      const fromPosition = this.camera.position.clone();
      const fromTarget   = this.controls.target.clone();
      const startTime    = performance.now();

      this.controls.enabled = false;

      const tick = (now) => {
        const t    = Math.min((now - startTime) / duration, 1);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        this.camera.position.lerpVectors(fromPosition, toPosition, ease);
        this.controls.target.lerpVectors(fromTarget, toTarget, ease);
        this.controls.update();

        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          this.controls.enabled = true;
          this.controls.saveState();
          resolve();
        }
      };

      requestAnimationFrame(tick);
    });
  }

  _loadGLTF(url, onProgress) {
    return new Promise((resolve, reject) => {
      this._loader.load(
        url,
        (gltf) => {
          const root = gltf.scene ?? gltf.scenes[0];
          if (!root) { reject(new Error(`No scene found in GLTF: ${url}`)); return; }
          resolve(root);
        },
        (event) => {
          if (onProgress && event.lengthComputable) {
            onProgress(event.loaded / event.total);
          }
        },
        reject,
      );
    });
  }

  // ---------------------------------------------------------------------------
  // Camera fit
  // ---------------------------------------------------------------------------

  _fitCamera(object) {
    object.updateMatrixWorld();

    const box    = new Box3().setFromObject(object);
    const size   = box.getSize(new Vector3()).length();
    const center = box.getCenter(new Vector3());

    // Center model at world origin
    object.position.x -= center.x;
    object.position.y -= center.y;
    object.position.z -= center.z;

    this.controls.maxDistance = size * 10;
    this.camera.near = size / 100;
    this.camera.far  = size * 100;
    this.camera.updateProjectionMatrix();

    return {
      position: new Vector3(size * 0.6, size * 0.5, size * 0.6),
      target:   new Vector3(0, 0, 0),
    };
  }
}
