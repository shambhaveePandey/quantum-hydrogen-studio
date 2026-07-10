/**
 * UI Control Panel for Quantum State Selection
 * ---------------------------------------------------------------------------
 * Left-hand panel: orbital selection (quick presets + n/l/m sliders), force
 * field toggles, per-particle visibility toggles (inspect each part of the
 * atom in isolation) and scene options.
 */

import { ForceType } from '../../types/particle';

const ORBITAL_LETTERS: Record<number, string> = { 0: 's', 1: 'p', 2: 'd', 3: 'f', 4: 'g' };

/** Toggleable parts of the atom (mirrors the renderer's ParticleVisibility). */
export type ParticleVisibilityKey =
  | 'nucleus' | 'gluons' | 'electron' | 'spin' | 'cloud' | 'shells';

export interface ControlState {
  orbital_shell: number; // n
  orbital_angular_momentum: number; // l
  magnetic_quantum_number: number; // m
  force_fields: ForceType[];
  field_intensity: number;
}

const PARTICLE_TOGGLES: Array<{ key: ParticleVisibilityKey; label: string; dot: string }> = [
  { key: 'nucleus', label: 'Nucleus (uud quarks)', dot: '#ff8c33' },
  { key: 'gluons', label: 'Gluon flux tubes', dot: '#ff4500' },
  { key: 'electron', label: 'Electron', dot: '#00aaff' },
  { key: 'spin', label: 'Electron spin vector', dot: '#ffffff' },
  { key: 'cloud', label: 'Electron cloud (superposition |ψ|²)', dot: '#7cf5ff' },
  { key: 'shells', label: 'Probability shells ⟨r⟩', dot: '#66aaff' },
];

export class ControlPanel {
  private container: HTMLElement;
  private state: ControlState;
  private particleVis: Record<ParticleVisibilityKey, boolean> = {
    nucleus: true, gluons: true, electron: true, spin: true, cloud: true, shells: true,
  };
  private onStateChangeCallback: ((state: ControlState) => void) | null = null;
  private onParticleVisibilityCallback: ((key: ParticleVisibilityKey, value: boolean) => void) | null = null;

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) throw new Error(`Container ${containerId} not found`);

    this.container = element;
    this.state = {
      orbital_shell: 1,
      orbital_angular_momentum: 0,
      magnetic_quantum_number: 0,
      force_fields: ['electromagnetic'],
      field_intensity: 0.5,
    };

    this.render();
  }

  private orbitalName(): string {
    const { orbital_shell: n, orbital_angular_momentum: l } = this.state;
    return `${n}${ORBITAL_LETTERS[l] ?? '?'}`;
  }

  private shapeNote(): string {
    const { orbital_angular_momentum: l, magnetic_quantum_number: m } = this.state;
    if (l === 0) return 'a spherical (isotropic) cloud';
    if (l === 1) return m === 0 ? 'a dumbbell aligned along the z-axis' : 'two lobes in the xy-plane';
    if (l === 2) return m === 0 ? 'a z-aligned lobe with an equatorial ring' : 'a four-lobed cloverleaf';
    return 'a multi-lobed high-l cloud';
  }

  private presetsHtml(): string {
    const { orbital_shell: n, orbital_angular_momentum: l } = this.state;
    const buttons: string[] = [];
    for (let pn = 1; pn <= 5; pn++) {
      for (let pl = 0; pl < pn; pl++) {
        const active = n === pn && l === pl;
        buttons.push(
          `<button type="button" class="preset-btn${active ? ' active' : ''}" data-n="${pn}" data-l="${pl}">${pn}${ORBITAL_LETTERS[pl]}</button>`
        );
      }
    }
    return buttons.join('');
  }

  private render(): void {
    const { orbital_shell: n, orbital_angular_momentum: l, magnetic_quantum_number: m } = this.state;
    const lMax = Math.max(0, n - 1);
    const mMax = Math.max(0, l);

    this.container.innerHTML = `
      <div class="control-panel">

        <div class="control-section">
          <h3>Orbital Selection</h3>

          <div class="orbital-badge">
            <span class="orbital-badge-name">${this.orbitalName()}</span>
            <span class="orbital-badge-sub">currently viewing</span>
          </div>

          <div class="presets">
            <div class="presets-label">Quick orbital presets</div>
            <div class="presets-grid">${this.presetsHtml()}</div>
          </div>

          <label>
            Principal Quantum Number (n)
            <input type="range" id="orbital-n" min="1" max="5" step="1" value="${n}">
            <span id="orbital-n-display">${n}</span>
          </label>

          <label>
            Angular Momentum (l)
            <input type="range" id="orbital-l" min="0" max="${lMax}" step="1" value="${l}">
            <span id="orbital-l-display">${l} — ${ORBITAL_LETTERS[l] ?? '?'} orbital</span>
          </label>

          <label>
            Magnetic Number (m)
            <input type="range" id="orbital-m" min="${-mMax}" max="${mMax}" step="1" value="${m}">
            <span id="orbital-m-display">${m} — ${this.shapeNote()}</span>
          </label>
        </div>

        <div class="control-section">
          <h3>Force Field Visualisation</h3>

          <div class="force-field-toggles">
            <label>
              <input type="checkbox" id="force-electromagnetic"
                ${this.state.force_fields.includes('electromagnetic') ? 'checked' : ''}>
              Electromagnetic
            </label>
            <label>
              <input type="checkbox" id="force-weak"
                ${this.state.force_fields.includes('weak') ? 'checked' : ''}>
              Weak Nuclear
            </label>
            <label>
              <input type="checkbox" id="force-strong"
                ${this.state.force_fields.includes('strong') ? 'checked' : ''}>
              Strong Nuclear
            </label>
            <label>
              <input type="checkbox" id="force-higgs"
                ${this.state.force_fields.includes('higgs') ? 'checked' : ''}>
              Higgs Field
            </label>
          </div>

          <label>
            Field Intensity
            <input type="range" id="field-intensity" min="0" max="1" step="0.1" value="${this.state.field_intensity}">
            <span id="field-intensity-display">${(this.state.field_intensity * 100).toFixed(0)}%</span>
          </label>
        </div>

        <div class="control-section">
          <h3>Particles &amp; Superposition</h3>
          <p class="section-note">Toggle each part of the atom on/off to inspect it in isolation, as in a live simulation.</p>
          <div class="force-field-toggles">
            ${PARTICLE_TOGGLES.map(t => `
              <label>
                <input type="checkbox" data-vis="${t.key}" ${this.particleVis[t.key] ? 'checked' : ''}>
                <span class="vis-dot" style="background:${t.dot}"></span>
                ${t.label}
              </label>`).join('')}
          </div>
        </div>

        <div class="control-section">
          <h3>Scene</h3>
          <div class="force-field-toggles">
            <label>
              <input type="checkbox" id="toggle-spatial-grid" checked>
              Navigation planes &amp; grid (X/Y/Z)
            </label>
          </div>
        </div>

      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    // Quick orbital presets
    this.container.querySelectorAll<HTMLButtonElement>('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pn = parseInt(btn.dataset.n!, 10);
        const pl = parseInt(btn.dataset.l!, 10);
        this.state.orbital_shell = pn;
        this.state.orbital_angular_momentum = pl;
        this.state.magnetic_quantum_number = 0;
        this.render();
        this.notifyStateChange();
      });
    });

    // Orbital sliders
    const nInput = document.getElementById('orbital-n') as HTMLInputElement;
    const lInput = document.getElementById('orbital-l') as HTMLInputElement;
    const mInput = document.getElementById('orbital-m') as HTMLInputElement;

    nInput.addEventListener('input', (e) => {
      const n = parseInt((e.target as HTMLInputElement).value, 10);
      this.state.orbital_shell = n;
      this.state.orbital_angular_momentum = Math.min(this.state.orbital_angular_momentum, n - 1);
      this.state.magnetic_quantum_number =
        Math.min(Math.abs(this.state.magnetic_quantum_number), this.state.orbital_angular_momentum) *
        (this.state.magnetic_quantum_number >= 0 ? 1 : -1);
      this.render();
      this.notifyStateChange();
    });

    lInput.addEventListener('input', (e) => {
      const l = parseInt((e.target as HTMLInputElement).value, 10);
      this.state.orbital_angular_momentum = l;
      this.state.magnetic_quantum_number =
        Math.min(Math.abs(this.state.magnetic_quantum_number), l) *
        (this.state.magnetic_quantum_number >= 0 ? 1 : -1);
      this.render();
      this.notifyStateChange();
    });

    mInput.addEventListener('input', (e) => {
      const m = parseInt((e.target as HTMLInputElement).value, 10);
      this.state.magnetic_quantum_number = m;
      document.getElementById('orbital-m-display')!.textContent = `${m} — ${this.shapeNote()}`;
      this.notifyStateChange();
    });

    // Force field toggles
    const forceFields: ForceType[] = ['electromagnetic', 'weak', 'strong', 'higgs'];
    forceFields.forEach(force => {
      const checkbox = document.getElementById(`force-${force}`) as HTMLInputElement | null;
      checkbox?.addEventListener('change', (e) => {
        if ((e.target as HTMLInputElement).checked) {
          if (!this.state.force_fields.includes(force)) this.state.force_fields.push(force);
        } else {
          this.state.force_fields = this.state.force_fields.filter(f => f !== force);
        }
        this.notifyStateChange();
      });
    });

    // Field intensity
    const intensityInput = document.getElementById('field-intensity') as HTMLInputElement | null;
    intensityInput?.addEventListener('input', (e) => {
      this.state.field_intensity = parseFloat((e.target as HTMLInputElement).value);
      document.getElementById('field-intensity-display')!.textContent =
        `${(this.state.field_intensity * 100).toFixed(0)}%`;
      this.notifyStateChange();
    });

    // Particle visibility toggles
    this.container.querySelectorAll<HTMLInputElement>('input[data-vis]').forEach(box => {
      box.addEventListener('change', () => {
        const key = box.dataset.vis as ParticleVisibilityKey;
        this.particleVis[key] = box.checked;
        this.onParticleVisibilityCallback?.(key, box.checked);
      });
    });
  }

  public onStateChange(callback: (state: ControlState) => void): void {
    this.onStateChangeCallback = callback;
  }

  public onParticleVisibilityChange(callback: (key: ParticleVisibilityKey, value: boolean) => void): void {
    this.onParticleVisibilityCallback = callback;
  }

  private notifyStateChange(): void {
    this.onStateChangeCallback?.(this.state);
  }

  public getState(): ControlState {
    return { ...this.state };
  }
}
