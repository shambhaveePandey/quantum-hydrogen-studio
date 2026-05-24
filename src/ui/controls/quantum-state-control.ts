/**
 * UI Control Panel for Quantum State Selection
 */

import { VisualizationSettings, ForceType } from '../../types/particle';

export interface ControlState {
  orbital_shell: number; // n
  orbital_angular_momentum: number; // l
  magnetic_quantum_number: number; // m
  force_fields: ForceType[];
  field_intensity: number;
}

export class ControlPanel {
  private container: HTMLElement;
  private state: ControlState;
  private onStateChangeCallback: ((state: ControlState) => void) | null = null;
  
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
  
  private render(): void {
    this.container.innerHTML = `
      <div class="control-panel">

        <div class="control-section">
          <h3>Orbital Selection</h3>

          <label>
            Principal Quantum Number (n)
            <input type="range" id="orbital-n"
              min="1" max="5" value="${this.state.orbital_shell}">
            <span id="orbital-n-display">${this.state.orbital_shell}</span>
          </label>

          <label>
            Angular Momentum (l)
            <input type="range" id="orbital-l"
              min="0" max="${Math.max(0, this.state.orbital_shell - 1)}"
              value="${this.state.orbital_angular_momentum}">
            <span id="orbital-l-display">${this.state.orbital_angular_momentum}</span>
          </label>

          <label>
            Magnetic Number (m)
            <input type="range" id="orbital-m"
              min="${-Math.max(0, this.state.orbital_angular_momentum)}"
              max="${Math.max(0, this.state.orbital_angular_momentum)}"
              value="${this.state.magnetic_quantum_number}">
            <span id="orbital-m-display">${this.state.magnetic_quantum_number}</span>
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
            <input type="range" id="field-intensity"
              min="0" max="1" step="0.1" value="${this.state.field_intensity}">
            <span id="field-intensity-display">${(this.state.field_intensity * 100).toFixed(0)}%</span>
          </label>
        </div>

      </div>
    `;
    
    this.attachEventListeners();
    this.updateQuantumInfo();
  }
  
  private attachEventListeners(): void {
    // Orbital controls
    const nInput = document.getElementById('orbital-n') as HTMLInputElement;
    const lInput = document.getElementById('orbital-l') as HTMLInputElement;
    const mInput = document.getElementById('orbital-m') as HTMLInputElement;
    
    nInput.addEventListener('input', (e) => {
      const n = parseInt((e.target as HTMLInputElement).value);
      this.state.orbital_shell = n;
      this.state.orbital_angular_momentum = Math.min(
        this.state.orbital_angular_momentum,
        n - 1
      );
      this.state.magnetic_quantum_number = Math.min(
        Math.abs(this.state.magnetic_quantum_number),
        this.state.orbital_angular_momentum
      ) * (this.state.magnetic_quantum_number >= 0 ? 1 : -1);
      
      document.getElementById('orbital-n-display')!.textContent = String(n);
      (document.getElementById('orbital-l') as HTMLInputElement).max = String(n - 1);
      this.render();
      this.notifyStateChange();
    });
    
    lInput.addEventListener('input', (e) => {
      const l = parseInt((e.target as HTMLInputElement).value);
      this.state.orbital_angular_momentum = l;
      this.state.magnetic_quantum_number = Math.min(
        Math.abs(this.state.magnetic_quantum_number),
        l
      ) * (this.state.magnetic_quantum_number >= 0 ? 1 : -1);
      
      document.getElementById('orbital-l-display')!.textContent = String(l);
      (document.getElementById('orbital-m') as HTMLInputElement).max = String(l);
      (document.getElementById('orbital-m') as HTMLInputElement).min = String(-l);
      this.render();
      this.notifyStateChange();
    });
    
    mInput.addEventListener('input', (e) => {
      const m = parseInt((e.target as HTMLInputElement).value);
      this.state.magnetic_quantum_number = m;
      document.getElementById('orbital-m-display')!.textContent = String(m);
      this.notifyStateChange();
    });
    
    // Force field toggles
    const forceFields = ['electromagnetic', 'weak', 'strong', 'higgs'] as ForceType[];
    forceFields.forEach(force => {
      const checkbox = document.getElementById(`force-${force}`) as HTMLInputElement;
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          if ((e.target as HTMLInputElement).checked) {
            if (!this.state.force_fields.includes(force)) {
              this.state.force_fields.push(force);
            }
          } else {
            this.state.force_fields = this.state.force_fields.filter(f => f !== force);
          }
          this.notifyStateChange();
        });
      }
    });
    
    // Field intensity
    const intensityInput = document.getElementById('field-intensity') as HTMLInputElement;
    if (intensityInput) {
      intensityInput.addEventListener('input', (e) => {
        this.state.field_intensity = parseFloat((e.target as HTMLInputElement).value);
        document.getElementById('field-intensity-display')!.textContent = 
          `${(this.state.field_intensity * 100).toFixed(0)}%`;
        this.notifyStateChange();
      });
    }
  }
  
  private updateQuantumInfo(): void {
    const { orbital_shell: n, orbital_angular_momentum: l, magnetic_quantum_number: m } = this.state;
    
    // Orbital names
    const orbitalNames: { [key: number]: string } = { 0: 's', 1: 'p', 2: 'd', 3: 'f', 4: 'g' };
    const orbitalName = `${n}${orbitalNames[l] || '?'}`;
    
    // Binding energy: E_n = -13.6 eV / n²
    const bindingEnergy = -13.605693122994 / (n * n);
    
    // Maximum radius: a_n = n² * a0 (Bohr radius ≈ 0.529 Å)
    const maxRadius = (n * n * 0.529).toFixed(2);
    
    // Electron configuration info
    const maxElectrons = 2 * n * n;
    
    const infoHtml = `
      <div class="info-item">
        <strong>Orbital:</strong> ${orbitalName}
      </div>
      <div class="info-item">
        <strong>Quantum Numbers:</strong> (n=${n}, l=${l}, m=${m})
      </div>
      <div class="info-item">
        <strong>Binding Energy:</strong> ${bindingEnergy.toFixed(2)} eV
      </div>
      <div class="info-item">
        <strong>Bohr Radius Scale:</strong> ${maxRadius} Å
      </div>
      <div class="info-item">
        <strong>Max Electrons (n=1):</strong> ${maxElectrons}
      </div>
      <div class="info-item">
        <strong>Active Force Fields:</strong> ${this.state.force_fields.join(', ')}
      </div>
    `;
    
    const infoPanel = document.getElementById('quantum-info');
    if (infoPanel) {
      infoPanel.innerHTML = infoHtml;
    }
  }
  
  public onStateChange(callback: (state: ControlState) => void): void {
    this.onStateChangeCallback = callback;
  }
  
  private notifyStateChange(): void {
    this.updateQuantumInfo();
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.state);
    }
  }
  
  public getState(): ControlState {
    return { ...this.state };
  }
}
