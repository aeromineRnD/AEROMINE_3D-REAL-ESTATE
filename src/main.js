import { Viewer } from './viewer.js';

const MODELS = {
  all:    '/models/modern_homes_complex.glb',
  floor1: '/models/Floor_1_apartment_floor_plan.glb',
  floor2: '/models/Floor_2_apartment_floor_plan.glb',
};

async function init() {
  const appEl         = document.getElementById('app');
  const spinnerEl     = document.getElementById('spinner');
  const floorBtns     = document.querySelectorAll('.floor-btn');
  const resetBtn      = document.getElementById('resetView');
  const screenshotBtn = document.getElementById('saveScreenshot');
  const themeBtn      = document.getElementById('themeToggle');
  const progressBar   = document.getElementById('progressBar');
  const progressFill  = document.getElementById('progressFill');

  function setProgress(ratio) {
    if (ratio === null) {
      progressBar.classList.remove('active');
      progressFill.style.width = '0%';
    } else {
      progressBar.classList.add('active');
      progressFill.style.width = `${Math.round(ratio * 100)}%`;
    }
  }

  const viewer = new Viewer(appEl);

  // -------------------------------------------------------------------------
  // Initial load - show all apartments
  // -------------------------------------------------------------------------

  setLoading(true, appEl, spinnerEl, floorBtns);
  try {
    await viewer.load(MODELS.all, setProgress);
  } catch (err) {
    showError(appEl, MODELS.all, err);
  } finally {
    setLoading(false, appEl, spinnerEl, floorBtns);
    setProgress(null);
  }

  const THEME_BG = { light: '#f0f2f5', dark: '#0d0f14' };

  function applyTheme(isDark) {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    themeBtn.innerHTML                     = isDark ? '&#9728;' : '&#9790;';
    themeBtn.title                         = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    viewer.setBackground(isDark ? THEME_BG.dark : THEME_BG.light);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  const savedTheme = localStorage.getItem('theme');
  applyTheme(savedTheme === 'dark');

  themeBtn.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme !== 'dark');
  });

  resetBtn.addEventListener('click', () => viewer.resetView());

  screenshotBtn.addEventListener('click', () => {
    const activeFloor = document.querySelector('.floor-btn.active')?.dataset.floor ?? 'view';
    const label = activeFloor === 'all' ? 'all-floors' : `floor-${activeFloor}`;
    viewer.screenshot(`aeromine-${label}.png`);
  });

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
        await viewer.swapModel(url, setProgress);
      } catch (err) {
        showError(appEl, url, err);
      } finally {
        setLoading(false, appEl, spinnerEl, floorBtns);
        setProgress(null);
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
