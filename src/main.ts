import './main.css';
import { VisualizationEngine, ParticleInfo } from './core/engine/renderer';
import { ControlPanel, ControlState } from './ui/controls/quantum-state-control';
import { PhysicsExplainer } from './ui/panels/physics-explainer';
import { createHydrogenAtom, createExcitedHydrogenAtom } from './physics/orbitals/hydrogen';

// Catch any uncaught promise rejections or JS errors and show them on screen
window.addEventListener('error', (e) => showFatalError(String(e.error ?? e.message)));
window.addEventListener('unhandledrejection', (e) => showFatalError(String(e.reason)));

const ORBITAL_LETTERS: Record<number, string> = { 0: 's', 1: 'p', 2: 'd', 3: 'f', 4: 'g' };

function showFatalError(msg: string): void {
  const container = document.getElementById('renderer-container');
  if (container) {
    container.innerHTML = `
      <div class="error-state">
        <h3>Initialisation Error</h3>
        <pre>${msg}</pre>
      </div>`;
  }
  console.error('[Quantum Hydrogen Studio]', msg);
}

/** Build the atom configuration for the given quantum numbers. */
function buildAtom(n: number, l: number, m: number) {
  return (n === 1 && l === 0) ? createHydrogenAtom() : createExcitedHydrogenAtom(n, l, m);
}

/** Update the readout chips beneath the 3D view. */
function updateChips(state: ControlState): void {
  const { orbital_shell: n, orbital_angular_momentum: l, magnetic_quantum_number: m, force_fields } = state;
  const name = `${n}${ORBITAL_LETTERS[l] ?? '?'}`;
  const bindingEnergy = -13.605693122994 / (n * n);
  const bohrRadius = (n * n * 0.529).toFixed(2);

  const set = (id: string, text: string) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  set('chip-orbital', `${name} (n=${n}, l=${l}, m=${m})`);
  set('chip-energy', `${bindingEnergy.toFixed(2)} eV`);
  set('chip-bohr', `${bohrRadius} Å`);
  set('chip-fields', force_fields.length ? force_fields.join(', ') : 'none');
}

/** Show/hide the clicked-particle properties overlay. */
function showParticleOverlay(info: ParticleInfo | null): void {
  const overlay = document.getElementById('particle-overlay');
  if (!overlay) return;
  if (!info) {
    overlay.hidden = true;
    return;
  }
  const title = document.getElementById('particle-overlay-title');
  const body = document.getElementById('particle-overlay-body');
  if (title) title.textContent = `${info.symbol} — ${info.name}`;
  if (body) {
    body.innerHTML = `
      <div><strong>Mass:</strong> ${info.mass}</div>
      <div><strong>Charge:</strong> ${info.charge}</div>
      <div><strong>Spin:</strong> ${info.spin}</div>
      <div style="margin-top:4px;color:var(--color-text-secondary)">${info.family}</div>`;
  }
  overlay.hidden = false;
}

function init(): void {
  // Remove the "JS not running" diagnostic badge immediately
  document.getElementById('js-status-badge')?.remove();

  const rendererContainer = document.getElementById('renderer-container');
  const renderingLoading  = document.getElementById('renderer-loading');

  if (!rendererContainer) {
    throw new Error('Missing #renderer-container in DOM — check index.html');
  }

  // --- 3-D engine --------------------------------------------------------------
  let engine: VisualizationEngine;
  try {
    engine = new VisualizationEngine(rendererContainer, {
      show_electron_cloud:      true,
      show_probability_density: true,
      show_quark_structure:     true,
      show_field_lines:         true,
      show_particle_paths:      false,
      particle_scale:           1,
      field_intensity:          0.5,
    });
  } catch (err) {
    showFatalError(`WebGL / Three.js init failed:\n${String(err)}`);
    return;
  }

  if (renderingLoading) renderingLoading.style.display = 'none';

  // --- scene -------------------------------------------------------------------
  try {
    engine.renderHydrogenAtom(createHydrogenAtom());
    engine.renderForceField('electromagnetic', 0.5);
    engine.animate();
  } catch (err) {
    showFatalError(`Scene render failed:\n${String(err)}`);
    return;
  }

  // Clicked-particle inspection overlay
  engine.onParticleSelect(showParticleOverlay);
  document.getElementById('particle-overlay-close')?.addEventListener('click', () => showParticleOverlay(null));
  document.getElementById('recenter-btn')?.addEventListener('click', () => engine.recenter());

  // --- physics explainer -------------------------------------------------------
  let explainer: PhysicsExplainer | null = null;
  try {
    explainer = new PhysicsExplainer('physics-explainer');
    explainer.update({ n: 1, l: 0, m: 0 });
  } catch (err) {
    console.error('Physics explainer init failed:', err);
  }

  // --- control panel -----------------------------------------------------------
  try {
    const controlPanel = new ControlPanel('quantum-controls');

    controlPanel.onStateChange((state) => {
      const { orbital_shell: n, orbital_angular_momentum: l,
              magnetic_quantum_number: m, force_fields, field_intensity } = state;

      engine.renderHydrogenAtom(buildAtom(n, l, m));
      if (force_fields.length > 0) {
        engine.renderForceField(force_fields[0], field_intensity);
      } else {
        engine.clearForceField();
      }
      engine.updateSettings({ field_intensity });
      updateChips(state);
      explainer?.update({ n, l, m });
    });

    controlPanel.onParticleVisibilityChange((key, value) => {
      engine.setParticleVisibility(key, value);
    });

    // Initial chip values
    updateChips(controlPanel.getState());
  } catch (err) {
    console.error('Control panel init failed:', err);
  }

  // --- spatial-grid toggle (event-delegated; survives control re-renders) ------
  document.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target && target.id === 'toggle-spatial-grid') {
      engine.setSpatialGraphVisible(target.checked);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
