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

    this.renderer = new WebGLRenderer({ antialias: true });
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

    // Build loader once — reused for every model swap
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

  // ---------------------------------------------------------------------------
  // Model loading / swapping
  // ---------------------------------------------------------------------------

  /** Load the initial model (no previous model to remove). */
  async load(url) {
    const root = await this._loadGLTF(url);
    this._fitCamera(root);
    this.scene.add(root);
    this.content = root;
    return root;
  }

  /**
   * Replace the current model with a new one.
   * Removes the old model, loads the new one, and resets the camera view.
   */
  async swapModel(url) {
    if (this.content) {
      this.scene.remove(this.content);
      this.content = null;
    }
    return this.load(url);
  }

  async _loadGLTF(url) {
    const gltf = await this._loader.loadAsync(url);
    const root = gltf.scene ?? gltf.scenes[0];
    if (!root) throw new Error(`No scene found in GLTF: ${url}`);
    return root;
  }

  // ---------------------------------------------------------------------------
  // Camera fit
  // ---------------------------------------------------------------------------

  _fitCamera(object) {
    object.updateMatrixWorld();

    const box    = new Box3().setFromObject(object);
    const size   = box.getSize(new Vector3()).length();
    const center = box.getCenter(new Vector3());

    this.controls.reset();

    // Center model at world origin
    object.position.x -= center.x;
    object.position.y -= center.y;
    object.position.z -= center.z;

    this.controls.maxDistance = size * 10;
    this.camera.near = size / 100;
    this.camera.far  = size * 100;
    this.camera.updateProjectionMatrix();

    // Isometric-ish overview from top-front-right
    this.camera.position.set(size * 0.6, size * 0.5, size * 0.6);
    this.camera.lookAt(new Vector3(0, 0, 0));
    this.controls.saveState();
  }
}
