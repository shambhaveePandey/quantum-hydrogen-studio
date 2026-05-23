/**
 * Elementary Particles Type Definitions
 * Based on the Standard Model of Particle Physics
 * References: Particle Data Group (PDG), CERN publications
 */

export type ParticleType = 
  | 'electron' 
  | 'electron-neutrino'
  | 'muon'
  | 'muon-neutrino'
  | 'tau'
  | 'tau-neutrino'
  | 'up-quark'
  | 'down-quark'
  | 'charm-quark'
  | 'strange-quark'
  | 'top-quark'
  | 'bottom-quark'
  | 'photon'
  | 'w-boson'
  | 'z-boson'
  | 'higgs-boson'
  | 'gluon';

export type ParticleFamily = 'lepton' | 'quark' | 'boson' | 'gauge-boson';

export type ForceType = 'electromagnetic' | 'weak' | 'strong' | 'higgs' | 'gravity';

export interface ParticleProperties {
  name: string;
  symbol: string;
  type: ParticleType;
  family: ParticleFamily;
  
  // Mass in MeV/c² (from PDG)
  mass: number;
  charge: number; // in units of elementary charge
  spin: number; // in units of ℏ
  
  // Quantum numbers
  baryon_number: number;
  lepton_number: number;
  strangeness?: number;
  charm?: number;
  bottom?: number;
  top?: number;
  
  // Interaction properties
  interacts_with: ForceType[];
  lifetime?: number; // in seconds (Infinity for stable)
  
  // Color charge (for quarks and gluons)
  color_charge?: string; // 'red', 'green', 'blue', 'colorless'
}

export interface Particle {
  id: string;
  properties: ParticleProperties;
  position: [number, number, number]; // x, y, z in Ångströms
  velocity: [number, number, number]; // vx, vy, vz in units of c
  spin_state: 'up' | 'down' | 'superposition';
  energy: number; // in eV
}

export interface HydrogenAtomConfiguration {
  proton: Particle;
  electrons: Particle[];
  orbital_shell: number; // n (1, 2, 3, ...)
  orbital_angular_momentum: number; // l
  magnetic_quantum_number: number; // m_l
}

export interface VisualizationSettings {
  show_electron_cloud: boolean;
  show_probability_density: boolean;
  show_quark_structure: boolean;
  show_field_lines: boolean;
  show_particle_paths: boolean;
  particle_scale: number; // 0.1 to 10
  field_intensity: number; // 0 to 1
}

export interface ForceFieldVisualization {
  type: ForceType;
  enabled: boolean;
  intensity: number; // 0 to 1
  range: number; // in Ångströms
  color: string; // hex color
}
