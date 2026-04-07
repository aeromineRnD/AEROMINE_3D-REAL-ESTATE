import { Viewer } from './viewer.js';

const MODELS = {
  all:    '/models/modern_homes_complex.glb',
  floor1: '/models/Floor_1_apartment_floor_plan.glb',
  floor2: '/models/Floor_2_apartment_floor_plan.glb',
};

async function init() {
  const appEl     = document.getElementById('app');
  const spinnerEl = document.getElementById('spinner');
  const floorBtns = document.querySelectorAll('.floor-btn');

  const viewer = new Viewer(appEl);

  // -------------------------------------------------------------------------
  // Initial load — show all apartments
  // -------------------------------------------------------------------------

  setLoading(true, appEl, spinnerEl, floorBtns);
  try {
    await viewer.load(MODELS.all);
  } catch (err) {
    showError(appEl, MODELS.all, err);
  } finally {
    setLoading(false, appEl, spinnerEl, floorBtns);
  }

  // -------------------------------------------------------------------------
  // Floor selector
  // -------------------------------------------------------------------------

  floorBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.classList.contains('active')) return;

      const floor = btn.dataset.floor;
      const url   = MODELS[floor === 'all' ? 'all' : `floor${floor}`];

      // Update active button
      floorBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      setLoading(true, appEl, spinnerEl, floorBtns);
      try {
        await viewer.swapModel(url);
      } catch (err) {
        showError(appEl, url, err);
      } finally {
        setLoading(false, appEl, spinnerEl, floorBtns);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setLoading(on, appEl, spinnerEl, btns) {
  spinnerEl.style.display = on ? '' : 'none';
  appEl.classList.toggle('loading', on);
  btns.forEach(b => { b.disabled = on; });
}

function showError(container, url, err) {
  console.error('[3D Real Estate] Failed to load model:', url, err);
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    font-family: system-ui, sans-serif; color: #b10026;
    font-size: 0.9rem; text-align: center; padding: 2rem;
    background: rgba(240,242,245,0.85);
    z-index: 99;
  `;
  overlay.innerHTML = `
    <div>
      <strong>Could not load 3D model.</strong><br>
      <code style="font-size:0.8em;color:#666">${url}</code><br>
      <small style="color:#888;margin-top:6px;display:block">${err.message}</small>
    </div>
  `;
  container.appendChild(overlay);
  // Auto-dismiss after 5 s so user can try again
  setTimeout(() => overlay.remove(), 5000);
}

document.addEventListener('DOMContentLoaded', init);
