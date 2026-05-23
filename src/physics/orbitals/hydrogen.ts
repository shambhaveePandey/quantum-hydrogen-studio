/**
 * Hydrogen Atom Structure and Orbitals
 * Based on Schrödinger equation solutions for hydrogen
 * References: Griffiths "Introduction to Quantum Mechanics", NIST ASD
 */

import { Particle, ParticleProperties, HydrogenAtomConfiguration } from '../../types/particle';
import { CONSTANTS, PARTICLE_DATA } from '../constants/particles';

/**
 * Hydrogen Wavefunction: ψ_nlm(r, θ, φ)
 * Radial wavefunction for hydrogen atom orbitals
 * 
 * ψ_nlm = R_nl(r) · Y_lm(θ, φ)
 * where:
 *   n = principal quantum number (1, 2, 3, ...)
 *   l = angular momentum quantum number (0, 1, ..., n-1)
 *   m = magnetic quantum number (-l, ..., 0, ..., l)
 */

interface QuantumNumbers {
  n: number; // principal quantum number
  l: number; // angular momentum quantum number
  m: number; // magnetic quantum number
}

/**
 * Generates electron position based on hydrogen atom probability distribution
 * Using 1s orbital (ground state) as default
 */
export function generateElectronPosition(
  quantumNumbers: QuantumNumbers = { n: 1, l: 0, m: 0 }
): [number, number, number] {
  const { n, l } = quantumNumbers;
  
  // Bohr radius in Ångströms
  const a0 = CONSTANTS.BOHR_RADIUS / CONSTANTS.ANGSTROM_TO_METERS;
  
  // Characteristic length scale for orbital
  const charLength = n * a0;
  
  // Generate random position with exponential distribution
  // for radial component (based on |R_nl(r)|²)
  const r = charLength * (-Math.log(Math.random())); // Exponential distribution
  const theta = Math.acos(2 * Math.random() - 1); // Uniform in cos(theta)
  const phi = 2 * Math.PI * Math.random(); // Uniform in phi
  
  // Convert spherical to Cartesian
  const x = r * Math.sin(theta) * Math.cos(phi);
  const y = r * Math.sin(theta) * Math.sin(phi);
  const z = r * Math.cos(theta);
  
  return [x, y, z];
}

/**
 * Hydrogen 1s orbital radial wavefunction (normalized)
 * R_1s(r) = 2 * (1/a0)^(3/2) * exp(-r/a0)
 */
function radialWavefunction1s(r: number, a0: number): number {
  return 2 * Math.pow(1 / a0, 1.5) * Math.exp(-r / a0);
}

/**
 * Probability density for 1s orbital
 * ρ(r) = |ψ_1s(r)|² = |R_1s(r)|²
 */
export function probabilityDensity1s(r: number, a0: number): number {
  const R = radialWavefunction1s(r, a0);
  return R * R;
}

/**
 * Creates a hydrogen atom with electron in ground state (1s)
 */
export function createHydrogenAtom(
  protonId: string = 'proton-0',
  electronId: string = 'electron-0'
): HydrogenAtomConfiguration {
  const electronPosition = generateElectronPosition({ n: 1, l: 0, m: 0 });
  
  // Create proton (nucleus)
  const proton: Particle = {
    id: protonId,
    properties: createParticleProperties('up-quark'), // Simplified: proton = uud
    position: [0, 0, 0], // At origin
    velocity: [0, 0, 0], // Essentially stationary (mass ratio ~1836)
    spin_state: 'up',
    energy: CONSTANTS.PROTON_REST_ENERGY * CONSTANTS.EV_TO_JOULES,
  };
  
  // Create electron
  const electron: Particle = {
    id: electronId,
    properties: createParticleProperties('electron'),
    position: electronPosition,
    velocity: generateElectronVelocity(), // Quantum fluctuation
    spin_state: Math.random() > 0.5 ? 'up' : 'down',
    energy: -CONSTANTS.RYDBERG_ENERGY, // Binding energy
  };
  
  return {
    proton,
    electrons: [electron],
    orbital_shell: 1,
    orbital_angular_momentum: 0,
    magnetic_quantum_number: 0,
  };
}

/**
 * Creates excited hydrogen atom (n=2 level)
 */
export function createExcitedHydrogenAtom(
  n: number = 2,
  l: number = 0,
  m: number = 0
): HydrogenAtomConfiguration {
  const electronPosition = generateElectronPosition({ n, l, m });
  
  const proton: Particle = {
    id: 'proton-excited',
    properties: createParticleProperties('up-quark'),
    position: [0, 0, 0],
    velocity: [0, 0, 0],
    spin_state: 'up',
    energy: CONSTANTS.PROTON_REST_ENERGY * CONSTANTS.EV_TO_JOULES,
  };
  
  // Energy for n-th level: E_n = -13.6 eV / n²
  const electronEnergy = -CONSTANTS.RYDBERG_ENERGY / (n * n);
  
  const electron: Particle = {
    id: 'electron-excited',
    properties: createParticleProperties('electron'),
    position: electronPosition,
    velocity: generateElectronVelocity(),
    spin_state: Math.random() > 0.5 ? 'up' : 'down',
    energy: electronEnergy,
  };
  
  return {
    proton,
    electrons: [electron],
    orbital_shell: n,
    orbital_angular_momentum: l,
    magnetic_quantum_number: m,
  };
}

/**
 * Generates quantum fluctuation velocity for electron
 * Based on uncertainty principle: Δx · Δp ≥ ℏ/2
 */
function generateElectronVelocity(): [number, number, number] {
  const scale = 0.001; // Small velocity in units of c
  return [
    scale * (Math.random() - 0.5) * 2,
    scale * (Math.random() - 0.5) * 2,
    scale * (Math.random() - 0.5) * 2,
  ];
}

/**
 * Helper function to create particle properties
 */
function createParticleProperties(type: string): ParticleProperties {
  const baseData = (PARTICLE_DATA as any)[type.replace('-', '_')] || {};
  
  const properties: ParticleProperties = {
    name: baseData.name || 'Unknown',
    symbol: baseData.symbol || '?',
    type: type as any,
    family: type.includes('quark') ? 'quark' : 
            type.includes('electron') || type.includes('neutrino') ? 'lepton' :
            'boson',
    mass: baseData.mass || 0,
    charge: baseData.charge || 0,
    spin: baseData.spin || 0,
    baryon_number: baseData.baryon_number || 0,
    lepton_number: baseData.lepton_number || 0,
    interacts_with: ['electromagnetic'],
    lifetime: baseData.lifetime || Infinity,
    color_charge: baseData.color_charge || 'colorless',
  };
  
  return properties;
}

/**
 * Calculates binding energy of electron in hydrogen
 * E_n = -13.6 eV / n² (Rydberg formula)
 */
export function calculateBindingEnergy(n: number): number {
  return -CONSTANTS.RYDBERG_ENERGY / (n * n);
}

/**
 * Calculates Bohr radius for hydrogen-like atoms
 * a_n = n² * a0 / Z (where Z is nuclear charge)
 */
export function calculateBohrRadius(n: number, Z: number = 1): number {
  const a0 = CONSTANTS.BOHR_RADIUS / CONSTANTS.ANGSTROM_TO_METERS;
  return (n * n * a0) / Z;
}

/**
 * Calculates transition frequency (for photon emission)
 * Using Rydberg formula: ν = R * c * (1/n1² - 1/n2²)
 */
export function calculateTransitionFrequency(n1: number, n2: number): number {
  const rydbergFreq = CONSTANTS.RYDBERG_ENERGY / (CONSTANTS.REDUCED_PLANCK / (2 * Math.PI));
  return rydbergFreq * (1 / (n1 * n1) - 1 / (n2 * n2));
}
