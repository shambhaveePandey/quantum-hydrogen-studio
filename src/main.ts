/**
 * Quantum Hydrogen Studio - Main Application Entry Point
 * 
 * This interactive web application visualizes elementary particles in hydrogen atoms
 * with quantum orbital mechanics and force field visualizations.
 * 
 * References:
 * - Schrödinger Equation solutions for Hydrogen
 * - Standard Model of Particle Physics
 * - Quantum Electrodynamics (QED)
 * - Electroweak Theory
 * - Quantum Chromodynamics (QCD)
 */

import "./main.css";

// Create the application shell
function initializeApplication(): void {
  const appElement = document.getElementById('app');
  
  if (!appElement) {
    console.error('App root element (#app) not found.');
    return;
  }

  // Create the application shell HTML
  appElement.innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <h1>⚛️ Quantum Hydrogen Studio</h1>
        <p>Interactive visualization of hydrogen atom elementary particles and quantum force fields</p>
      </header>

      <section class="app-content">
        <!-- LEFT PANEL: CONTROLS -->
        <aside class="panel panel-left" id="controls-panel">
          <h2>Quantum State Controls</h2>
          <div id="quantum-controls"></div>
        </aside>

        <!-- CENTER PANEL: 3D VISUALIZATION -->
        <section class="panel panel-center" id="visualization-panel">
          <h2>3D Particle Visualization</h2>
          <div class="visualization-placeholder" id="renderer-container">
            Initializing 3D engine...
          </div>
        </section>

        <!-- RIGHT PANEL: INFORMATION -->
        <aside class="panel panel-right" id="info-panel">
          <h2>Quantum State Info</h2>
          <div id="quantum-info">
            <p>Loading quantum information...</p>
          </div>
        </aside>
      </section>
    </div>
  `;

  // Dynamically import and initialize components after DOM is ready
  initializeComponents();
}

async function initializeComponents(): Promise<void> {
  try {
    // Import components
    const { VisualizationEngine } = await import('./core/engine/renderer');
    const { ControlPanel } = await import('./ui/controls/quantum-state-control');
    const { createHydrogenAtom } = await import('./physics/orbitals/hydrogen');
    const { getForceFieldVisualization } = await import('./physics/fields/fundamental-forces');

    // Initialize the 3D visualization engine
    const rendererContainer = document.getElementById('renderer-container');
    if (rendererContainer) {
      rendererContainer.innerHTML = '';
      
      const visualizationEngine = new VisualizationEngine(rendererContainer, {
        show_electron_cloud: true,
        show_probability_density: true,
        show_quark_structure: false,
        show_field_lines: true,
        show_particle_paths: false,
        particle_scale: 1,
        field_intensity: 0.5,
      });

      // Render initial hydrogen atom
      const hydrogenAtom = createHydrogenAtom();
      visualizationEngine.renderHydrogenAtom(hydrogenAtom);
      visualizationEngine.renderForceField('electromagnetic', 0.5);
      visualizationEngine.animate();

      // Initialize control panel
      const controlsPanel = document.getElementById('quantum-controls');
      if (controlsPanel) {
        const controlPanel = new ControlPanel('quantum-controls');

        // Listen for state changes from control panel
        controlPanel.onStateChange((state: any) => {
          // Update hydrogen atom based on selected orbital
          const { orbital_shell, orbital_angular_momentum, magnetic_quantum_number, force_fields, field_intensity } = state;
          
          const { createExcitedHydrogenAtom } = await import('./physics/orbitals/hydrogen');
          const newHydrogenAtom = orbital_shell === 1 && orbital_angular_momentum === 0
            ? createHydrogenAtom()
            : createExcitedHydrogenAtom(orbital_shell, orbital_angular_momentum, magnetic_quantum_number);

          visualizationEngine.renderHydrogenAtom(newHydrogenAtom);

          // Update force field visualizations
          if (force_fields.length > 0) {
            visualizationEngine.renderForceField(force_fields[0], field_intensity);
          }

          visualizationEngine.updateSettings({ field_intensity });
        });
      }
    }
  } catch (error) {
    console.error('Failed to initialize application:', error);
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div style="color: red; font-family: monospace; padding: 20px;">
          <h1>Initialization Error</h1>
          <pre>${String(error)}</pre>
        </div>
      `;
    }
  }
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApplication);
} else {
  initializeApplication();
}

