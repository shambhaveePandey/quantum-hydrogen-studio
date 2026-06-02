import './main.css';
import { VisualizationEngine } from './core/engine/renderer';
import { ControlPanel } from './ui/controls/quantum-state-control';
import { PhysicsExplainer } from './ui/panels/physics-explainer';
import { createHydrogenAtom, createExcitedHydrogenAtom } from './physics/orbitals/hydrogen';

// Catch any uncaught promise rejections or JS errors and show them on screen
window.addEventListener('error', (e) => showFatalError(String(e.error ?? e.message)));
window.addEventListener('unhandledrejection', (e) => showFatalError(String(e.reason)));

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

async function init(): Promise<void> {
  // Remove the "JS not running" diagnostic badge immediately
  document.getElementById('js-status-badge')?.remove();

  // --- grab DOM nodes that exist in index.html ---------------------------------
  const rendererContainer = document.getElementById('renderer-container');
  const renderingLoading  = document.getElementById('renderer-loading');
  const infoContainer     = document.getElementById('quantum-info');

  if (!rendererContainer) {
    throw new Error('Missing #renderer-container in DOM — check index.html');
  }

  // --- 3-D engine --------------------------------------------------------------
  let engine: VisualizationEngine;
  try {
    engine = new VisualizationEngine(rendererContainer, {
      show_electron_cloud:      true,
      show_probability_density: true,
      show_quark_structure:     false,
      show_field_lines:         true,
      show_particle_paths:      false,
      particle_scale:           1,
      field_intensity:          0.5,
    });
  } catch (err) {
    showFatalError(`WebGL / Three.js init failed:\n${String(err)}`);
    return;
  }

  // Hide the "Initialising…" overlay now that the canvas is mounted
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

  // --- physics explainer (in-app maths + references) ---------------------------
  let explainer: PhysicsExplainer | null = null;
  try {
    explainer = new PhysicsExplainer('physics-explainer');
    explainer.update({ n: 1, l: 0, m: 0 });
  } catch (err) {
    console.error('Physics explainer init failed:', err);
  }

  // --- spatial-grid toggle (event-delegated; survives control re-renders) ------
  document.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target && target.id === 'toggle-spatial-grid') {
      engine.setSpatialGraphVisible(target.checked);
    }
  });

  // --- control panel -----------------------------------------------------------
  try {
    const controlPanel = new ControlPanel('quantum-controls');

    controlPanel.onStateChange((state) => {
      const { orbital_shell: n, orbital_angular_momentum: l,
              magnetic_quantum_number: m, force_fields, field_intensity } = state;

      const atom = (n === 1 && l === 0)
        ? createHydrogenAtom()
        : createExcitedHydrogenAtom(n, l, m);

      engine.renderHydrogenAtom(atom);
      if (force_fields.length > 0) {
        engine.renderForceField(force_fields[0], field_intensity);
      }
      engine.updateSettings({ field_intensity });
      explainer?.update({ n, l, m });
    });
  } catch (err) {
    // Controls failing is non-fatal — log but keep the canvas running
    console.error('Control panel init failed:', err);
    if (infoContainer) {
      infoContainer.innerHTML =
        `<p class="info-placeholder" style="color:var(--color-error)">
           Controls unavailable: ${String(err)}
         </p>`;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
