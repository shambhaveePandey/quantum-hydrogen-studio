/**
 * Quantum Field Theory Force Fields
 * Visualizations of fundamental forces in the Standard Model
 * 
 * References:
 * - Peskin & Schroeder "Introduction to Quantum Field Theory"
 * - Halzen & Martin "Quarks and Leptons"
 * - CERN publications on fundamental forces
 */

import { ForceType, ForceFieldVisualization } from '../../types/particle';
import { CONSTANTS } from '../constants/particles';

export interface FieldVector {
  position: [number, number, number];
  field: [number, number, number]; // Field strength vector
  magnitude: number;
}

export interface FieldConfiguration {
  type: ForceType;
  intensity: number; // 0 to 1
  range: number; // in Ångströms
  color: string;
  description: string;
}

/**
 * Electromagnetic Force Field
 * F = α * q1 * q2 / r²
 * Described by QED (Quantum Electrodynamics)
 * Coupling constant: α ≈ 1/137 (fine structure constant)
 */
export class ElectromagneticField {
  static readonly COUPLING_CONSTANT = CONSTANTS.FINE_STRUCTURE_CONSTANT;
  static readonly COLOR = '#FFD700'; // Gold
  static readonly RANGE = 1000; // Very long range
  
  static calculateFieldStrength(
    position: [number, number, number],
    sourceCharge: number,
    sourcePosition: [number, number, number]
  ): [number, number, number] {
    const dx = position[0] - sourcePosition[0];
    const dy = position[1] - sourcePosition[1];
    const dz = position[2] - sourcePosition[2];
    const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (r < 0.01) return [0, 0, 0]; // Avoid singularity
    
    // E = k * q / r² (in direction of r)
    const magnitude = this.COUPLING_CONSTANT * sourceCharge / (r * r);
    const ex = magnitude * dx / r;
    const ey = magnitude * dy / r;
    const ez = magnitude * dz / r;
    
    return [ex, ey, ez];
  }
  
  static getVisualization(intensity: number = 1): ForceFieldVisualization {
    return {
      type: 'electromagnetic',
      enabled: true,
      intensity,
      range: this.RANGE,
      color: this.COLOR,
    };
  }
}

/**
 * Weak Nuclear Force Field
 * Responsible for beta decay and neutrino interactions
 * Mediated by W and Z bosons
 * Coupling constant: α_w ≈ 0.65 at Z-boson mass scale
 * Range: ~0.001 fm (extremely short range due to massive mediators)
 */
export class WeakForceField {
  static readonly COUPLING_CONSTANT = 0.6518;
  static readonly BOSON_MASS = 80.377; // GeV (W boson)
  static readonly RANGE = 0.001; // Femtometers
  static readonly COLOR = '#FF69B4'; // Hot pink
  
  static calculateFieldStrength(
    position: [number, number, number],
    sourcePosition: [number, number, number]
  ): [number, number, number] {
    const dx = position[0] - sourcePosition[0];
    const dy = position[1] - sourcePosition[1];
    const dz = position[2] - sourcePosition[2];
    const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (r < 0.0001 || r > this.RANGE) return [0, 0, 0];
    
    // Yukawa potential: V(r) = -(g²/4π) * exp(-M*r) / r
    // Field strength proportional to derivative
    const M = this.BOSON_MASS;
    const exponentialFactor = Math.exp(-M * r);
    const magnitude = this.COUPLING_CONSTANT * exponentialFactor * (1 + M * r) / (r * r);
    
    const ex = magnitude * dx / r;
    const ey = magnitude * dy / r;
    const ez = magnitude * dz / r;
    
    return [ex, ey, ez];
  }
  
  static getVisualization(intensity: number = 1): ForceFieldVisualization {
    return {
      type: 'weak',
      enabled: true,
      intensity,
      range: this.RANGE * 1000, // Convert to Ångströms for visualization
      color: this.COLOR,
    };
  }
}

/**
 * Strong Nuclear Force Field
 * Responsible for binding quarks and nucleons
 * Mediated by gluons
 * Coupling constant: α_s ≈ 0.1179 at Z-boson mass scale
 * Exhibits asymptotic freedom and confinement
 * Range: ~1 fm (confined to nucleus)
 */
export class StrongForceField {
  static readonly COUPLING_CONSTANT = 0.1179;
  static readonly RANGE = 1; // Femtometer
  static readonly CONFINEMENT_SCALE = 0.2; // Femtometers
  static readonly COLOR = '#FF4500'; // Red-orange
  
  static calculateFieldStrength(
    position: [number, number, number],
    sourcePosition: [number, number, number],
    sourceColor: string = 'red'
  ): [number, number, number] {
    const dx = position[0] - sourcePosition[0];
    const dy = position[1] - sourcePosition[1];
    const dz = position[2] - sourcePosition[2];
    const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (r < 0.00001) return [0, 0, 0];
    
    // Running coupling constant (asymptotic freedom)
    // α_s(r) increases as r decreases (asymptotic freedom)
    const alphaS = this.COUPLING_CONSTANT / (1 - 0.1 * Math.log(Math.max(r, 0.001)));
    
    // Confinement: potential grows linearly at large distances
    let magnitude;
    if (r < this.CONFINEMENT_SCALE) {
      magnitude = alphaS / (r * r); // Coulomb-like at short range
    } else {
      magnitude = alphaS * r; // Linear confinement at large range
    }
    
    const ex = magnitude * dx / r;
    const ey = magnitude * dy / r;
    const ez = magnitude * dz / r;
    
    return [ex, ey, ez];
  }
  
  static getVisualization(intensity: number = 1): ForceFieldVisualization {
    return {
      type: 'strong',
      enabled: true,
      intensity,
      range: this.RANGE * 1000, // Convert to Ångströms
      color: this.COLOR,
    };
  }
}

/**
 * Higgs Field
 * Gives mass to elementary particles through electroweak symmetry breaking
 * Discovered at CERN in 2012
 * Vacuum expectation value: v ≈ 246 GeV
 * 
 * The Higgs field is a scalar field (0 spin)
 * Interaction strength: g = m / v (mass over VEV)
 */
export class HiggsField {
  static readonly VACUUM_EXPECTATION_VALUE = 246; // GeV
  static readonly HIGGS_MASS = 125.1; // GeV
  static readonly COLOR = '#00CED1'; // Dark turquoise
  static readonly RANGE = 0.1; // Very short effective range
  
  /**
   * Calculates Higgs field interaction strength
   * Particles gain mass through Yukawa coupling to Higgs VEV
   * m = g * v / sqrt(2), where g is coupling constant
   */
  static calculateFieldStrength(
    position: [number, number, number],
    particleMass: number // Mass of particle coupling to Higgs
  ): number {
    // Higgs field is scalar, so we return magnitude
    // Interaction strength proportional to coupling constant
    const coupling = particleMass / this.VACUUM_EXPECTATION_VALUE;
    
    // Gaussian profile centered at origin (simplified)
    const r = Math.sqrt(position[0] * position[0] + position[1] * position[1] + position[2] * position[2]);
    const fieldValue = this.HIGGS_MASS * coupling * Math.exp(-r * r / (this.RANGE * this.RANGE));
    
    return fieldValue;
  }
  
  /**
   * Yukawa coupling determines particle mass
   * m = g * v / sqrt(2)
   */
  static calculateParticleMass(couplingConstant: number): number {
    return (couplingConstant * this.VACUUM_EXPECTATION_VALUE) / Math.sqrt(2);
  }
  
  static getVisualization(intensity: number = 1): ForceFieldVisualization {
    return {
      type: 'higgs',
      enabled: true,
      intensity,
      range: this.RANGE * 1e-6, // Very short range
      color: this.COLOR,
    };
  }
}

/**
 * Gravity (not included in Standard Model, but for completeness)
 * Described by General Relativity
 * Coupling constant: G ≈ 6.674 × 10⁻¹¹ m³ kg⁻¹ s⁻²
 * (Much weaker than other forces at particle scale)
 */
export class GravityField {
  static readonly GRAVITATIONAL_CONSTANT = 6.67430e-11; // SI units
  static readonly COLOR = '#808080'; // Gray
  static readonly RANGE = Infinity; // Very long range
  
  static calculateFieldStrength(
    position: [number, number, number],
    sourceMass: number,
    sourcePosition: [number, number, number]
  ): [number, number, number] {
    const dx = position[0] - sourcePosition[0];
    const dy = position[1] - sourcePosition[1];
    const dz = position[2] - sourcePosition[2];
    const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (r < 0.01) return [0, 0, 0];
    
    // g = -G * M / r²
    const magnitude = -this.GRAVITATIONAL_CONSTANT * sourceMass / (r * r);
    const gx = magnitude * dx / r;
    const gy = magnitude * dy / r;
    const gz = magnitude * dz / r;
    
    return [gx, gy, gz];
  }
  
  static getVisualization(intensity: number = 0.1): ForceFieldVisualization {
    return {
      type: 'gravity',
      enabled: false, // Disabled by default (negligible at atomic scale)
      intensity,
      range: 10000,
      color: this.COLOR,
    };
  }
}

/**
 * Combined field visualization manager
 */
export function getForceFieldVisualization(
  forceType: ForceType,
  intensity: number = 1
): ForceFieldVisualization {
  switch (forceType) {
    case 'electromagnetic':
      return ElectromagneticField.getVisualization(intensity);
    case 'weak':
      return WeakForceField.getVisualization(intensity);
    case 'strong':
      return StrongForceField.getVisualization(intensity);
    case 'higgs':
      return HiggsField.getVisualization(intensity);
    case 'gravity':
      return GravityField.getVisualization(intensity);
    default:
      return {
        type: forceType,
        enabled: false,
        intensity: 0,
        range: 0,
        color: '#FFFFFF',
      };
  }
}
