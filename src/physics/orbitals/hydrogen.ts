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

// ---------------------------------------------------------------------------
// Exact hydrogen wavefunctions ψ_nlm = R_nl(r)·Y_lm(θ,φ)
//
// The electron cloud is sampled from the FULL probability density |ψ_nlm|²,
// not a smooth approximation. This reproduces two features that a simple
// exponential/Gamma blob cannot:
//   • Radial nodes — R_nl carries the generalized Laguerre polynomial
//     L_{n−l−1}^{2l+1}, which has (n−l−1) zeros. These produce the concentric
//     shell structure of s/p/d orbitals (e.g. 2s = inner sphere + outer shell).
//   • Angular lobes — the real spherical harmonics depend on φ as well as θ,
//     so p and d orbitals render as true lobes (p_x, d_xy, …) rather than the
//     φ-averaged rings a θ-only rejection would give.
// References: Griffiths, "Introduction to Quantum Mechanics" Ch. 4;
//             HyperPhysics — hydrogen wavefunctions.
// ---------------------------------------------------------------------------

/**
 * Generalized Laguerre polynomial L_k^α(x) via the stable upward recurrence
 *   (k+1)·L_{k+1}^α = (2k+1+α−x)·L_k^α − (k+α)·L_{k−1}^α.
 */
function generalizedLaguerre(k: number, alpha: number, x: number): number {
  if (k < 0) return 0;
  let lPrev = 1; // L_0^α = 1
  if (k === 0) return lPrev;
  let lCurr = 1 + alpha - x; // L_1^α = 1 + α − x
  for (let i = 1; i < k; i++) {
    const lNext = ((2 * i + 1 + alpha - x) * lCurr - (i + alpha) * lPrev) / (i + 1);
    lPrev = lCurr;
    lCurr = lNext;
  }
  return lCurr;
}

/**
 * Radial wavefunction R_nl(r) for hydrogen (Z = 1), normalized.
 *   R_nl(r) = √[(2/(n·a₀))³ · (n−l−1)! / (2n·(n+l)!)] · e^(−ρ/2)·ρ^l·L_{n−l−1}^{2l+1}(ρ)
 * with ρ = 2r/(n·a₀).
 */
export function radialWavefunction(n: number, l: number, r: number, a0: number): number {
  const rho = (2 * r) / (n * a0);
  const norm = Math.sqrt(
    Math.pow(2 / (n * a0), 3) * (factorial(n - l - 1) / (2 * n * factorial(n + l)))
  );
  const laguerre = generalizedLaguerre(n - l - 1, 2 * l + 1, rho);
  return norm * Math.exp(-rho / 2) * Math.pow(rho, l) * laguerre;
}

/** Small-integer factorial (n ≤ ~10 here, so exact and cheap). */
function factorial(k: number): number {
  let f = 1;
  for (let i = 2; i <= k; i++) f *= i;
  return f;
}

/**
 * Radial probability density P(r) = r²·|R_nl(r)|². This — not |R|² alone — is
 * what governs where the electron is found; the r² surface-area factor pushes
 * the most-probable radius away from the nucleus (exactly a₀ for 1s).
 */
export function radialProbability(n: number, l: number, r: number, a0: number): number {
  const R = radialWavefunction(n, l, r, a0);
  return r * r * R * R;
}

/**
 * Unnormalized associated Legendre function P_l^m(x), |x| ≤ 1, m ≥ 0
 * (Numerical Recipes recurrence, Condon–Shortley phase included).
 */
function associatedLegendre(l: number, m: number, x: number): number {
  let pmm = 1;
  if (m > 0) {
    const somx2 = Math.sqrt(Math.max(0, (1 - x) * (1 + x)));
    let fact = 1;
    for (let i = 1; i <= m; i++) {
      pmm *= -fact * somx2;
      fact += 2;
    }
  }
  if (l === m) return pmm;
  let pmmp1 = x * (2 * m + 1) * pmm;
  if (l === m + 1) return pmmp1;
  let pll = 0;
  for (let ll = m + 2; ll <= l; ll++) {
    pll = ((2 * ll - 1) * x * pmmp1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pmmp1;
    pmmp1 = pll;
  }
  return pll;
}

/**
 * Angular probability |Y_lm(θ,φ)|² for the REAL spherical harmonics, up to a
 * positive constant (the constant is irrelevant for rejection sampling).
 *   m = 0 : [P_l^0(cosθ)]²                         (axial, z-aligned)
 *   m > 0 : [P_l^m(cosθ)]²·cos²(m·φ)               (cosine-type real lobe)
 *   m < 0 : [P_l^|m|(cosθ)]²·sin²(|m|·φ)           (sine-type real lobe)
 * The φ dependence is what turns |m|>0 states into lobes rather than rings.
 */
export function angularProbability(l: number, m: number, theta: number, phi: number): number {
  const am = Math.abs(m);
  const p = associatedLegendre(l, am, Math.cos(theta));
  const base = p * p;
  if (m === 0) return base;
  const azimuth = m > 0 ? Math.cos(am * phi) : Math.sin(am * phi);
  return base * azimuth * azimuth;
}

/**
 * Builds a sampler that draws electron positions from |ψ_nlm|² for a fixed
 * orbital. Radius is drawn by inverse-CDF sampling of P(r)=r²|R_nl|² on a fine
 * grid (which faithfully reproduces radial nodes); the angular direction is
 * drawn by rejection against |Y_lm(θ,φ)|² (which reproduces the lobes).
 *
 * @param a0  Bohr radius expressed in the caller's length units (real Å for
 *            physics, or the visualization's scene-unit Bohr radius).
 */
export function createOrbitalSampler(
  n: number,
  l: number,
  m: number,
  a0: number
): () => [number, number, number] {
  n = Math.max(1, Math.round(n));
  l = Math.max(0, Math.min(Math.round(l), n - 1));
  m = Math.max(-l, Math.min(Math.round(m), l));

  // --- Radial inverse-CDF table -------------------------------------------
  // Cover the full radial extent: <r> ≈ n²·a₀ with a tail out to a few times
  // that. rMax = n·(n+8)·a₀ safely captures essentially all probability.
  const rMax = n * (n + 8) * a0;
  const steps = 1024;
  const dr = rMax / steps;
  const cdf = new Float64Array(steps + 1);
  let acc = 0;
  cdf[0] = 0;
  for (let i = 1; i <= steps; i++) {
    const r = i * dr;
    // Trapezoidal accumulation of the radial probability.
    const p0 = radialProbability(n, l, (i - 1) * dr, a0);
    const p1 = radialProbability(n, l, r, a0);
    acc += 0.5 * (p0 + p1) * dr;
    cdf[i] = acc;
  }
  const total = acc || 1;
  for (let i = 0; i <= steps; i++) cdf[i] /= total;

  const sampleRadius = (): number => {
    const u = Math.random();
    // Binary search for the first CDF entry ≥ u, then linearly interpolate.
    let lo = 0;
    let hi = steps;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < u) lo = mid + 1;
      else hi = mid;
    }
    const i = Math.max(1, lo);
    const c0 = cdf[i - 1];
    const c1 = cdf[i];
    const frac = c1 > c0 ? (u - c0) / (c1 - c0) : 0;
    return (i - 1 + frac) * dr;
  };

  // --- Angular envelope for rejection sampling ----------------------------
  // Peak of |P_l^m(cosθ)|² over a θ grid; cos²/sin²(mφ) ≤ 1 handles φ.
  let angularMax = 1e-12;
  const gridT = 400;
  for (let i = 0; i <= gridT; i++) {
    const ct = -1 + (2 * i) / gridT;
    const p = associatedLegendre(l, Math.abs(m), ct);
    if (p * p > angularMax) angularMax = p * p;
  }

  const sampleAngles = (): [number, number] => {
    for (let attempt = 0; attempt < 200; attempt++) {
      const theta = Math.acos(2 * Math.random() - 1); // uniform on the sphere
      const phi = 2 * Math.PI * Math.random();
      if (Math.random() * angularMax <= angularProbability(l, m, theta, phi)) {
        return [theta, phi];
      }
    }
    // Fallback (should be rare): return a random direction.
    return [Math.acos(2 * Math.random() - 1), 2 * Math.PI * Math.random()];
  };

  return () => {
    const r = sampleRadius();
    const [theta, phi] = sampleAngles();
    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.sin(theta) * Math.sin(phi);
    const z = r * Math.cos(theta);
    return [x, y, z];
  };
}

/**
 * Generates a single electron position drawn from |ψ_nlm|².
 * Using the 1s orbital (ground state) as default.
 */
export function generateElectronPosition(
  quantumNumbers: QuantumNumbers = { n: 1, l: 0, m: 0 }
): [number, number, number] {
  const { n, l, m } = quantumNumbers;
  // Bohr radius in Ångströms
  const a0 = CONSTANTS.BOHR_RADIUS / CONSTANTS.ANGSTROM_TO_METERS;
  return createOrbitalSampler(n, l, m, a0)();
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
  // Photon frequency ν = ΔE / h, where ΔE = E_Ry·(1/n1² − 1/n2²).
  // REDUCED_PLANCK is already ħ = h/2π, so the Planck constant is h = 2πħ.
  // (The previous version divided by ħ/2π, introducing a spurious (2π)² factor.)
  const rydbergEnergyJoules = CONSTANTS.RYDBERG_ENERGY * CONSTANTS.EV_TO_JOULES;
  const planckConstant = 2 * Math.PI * CONSTANTS.REDUCED_PLANCK; // h in J·s
  return (rydbergEnergyJoules / planckConstant) * (1 / (n1 * n1) - 1 / (n2 * n2));
}
