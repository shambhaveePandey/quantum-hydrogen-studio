/**
 * Physical Constants (SI Units and Natural Units)
 * References: NIST, CODATA 2018, PDG
 */

export const CONSTANTS = {
  // Fundamental constants
  PLANCK_CONSTANT: 6.62607015e-34, // J·s
  REDUCED_PLANCK: 1.054571817e-34, // J·s (ℏ = h/2π)
  SPEED_OF_LIGHT: 299792458, // m/s
  ELEMENTARY_CHARGE: 1.602176634e-19, // C
  FINE_STRUCTURE_CONSTANT: 1 / 137.035999084, // α
  
  // Atomic/Nuclear units
  BOHR_RADIUS: 5.29177210903e-11, // m (0.529 Å)
  COMPTON_WAVELENGTH_ELECTRON: 2.42631023867e-12, // m
  CLASSICAL_ELECTRON_RADIUS: 2.8179403262e-15, // m
  
  // Energy scales
  RYDBERG_ENERGY: 13.605693122994, // eV
  ELECTRON_REST_ENERGY: 0.5109989461, // MeV
  PROTON_REST_ENERGY: 938.27208816, // MeV
  HIGGS_MASS_ENERGY: 125.1, // GeV (Higgs boson mass)
  
  // Coupling constants (at Z-boson mass scale)
  ELECTROMAGNETIC_COUPLING: 1 / 127.944, // α_em
  WEAK_COUPLING: 0.6518, // α_w
  STRONG_COUPLING: 0.1179, // α_s
  
  // Conversion factors
  EV_TO_JOULES: 1.602176634e-19, // J/eV
  ANGSTROM_TO_METERS: 1e-10,
  FEMTOMETER_TO_METERS: 1e-15,
};

export const PARTICLE_DATA = {
  // Leptons
  electron: {
    name: 'Electron',
    symbol: 'e⁻',
    mass: 0.5109989461, // MeV
    charge: -1,
    spin: 0.5,
    baryon_number: 0,
    lepton_number: 1,
    lifetime: Infinity,
    color_charge: 'colorless',
  },
  
  electron_neutrino: {
    name: 'Electron Neutrino',
    symbol: 'νₑ',
    mass: 0.0000022, // MeV (upper limit)
    charge: 0,
    spin: 0.5,
    baryon_number: 0,
    lepton_number: 1,
    lifetime: Infinity,
    color_charge: 'colorless',
  },
  
  // Quarks (constituent masses)
  up_quark: {
    name: 'Up Quark',
    symbol: 'u',
    mass: 2.16, // MeV
    charge: 2 / 3,
    spin: 0.5,
    baryon_number: 1 / 3,
    lepton_number: 0,
    lifetime: Infinity,
    color_charge: 'red', // Can be red, green, or blue
  },
  
  down_quark: {
    name: 'Down Quark',
    symbol: 'd',
    mass: 4.67, // MeV
    charge: -1 / 3,
    spin: 0.5,
    baryon_number: 1 / 3,
    lepton_number: 0,
    lifetime: Infinity,
    color_charge: 'green',
  },
  
  // Gauge Bosons
  photon: {
    name: 'Photon',
    symbol: 'γ',
    mass: 0,
    charge: 0,
    spin: 1,
    baryon_number: 0,
    lepton_number: 0,
    lifetime: Infinity,
    color_charge: 'colorless',
  },
  
  w_boson: {
    name: 'W Boson',
    symbol: 'W±',
    mass: 80.377, // GeV
    charge: 1,
    spin: 1,
    baryon_number: 0,
    lepton_number: 0,
    lifetime: 3.157e-25, // seconds
    color_charge: 'colorless',
  },
  
  z_boson: {
    name: 'Z Boson',
    symbol: 'Z⁰',
    mass: 91.1876, // GeV
    charge: 0,
    spin: 1,
    baryon_number: 0,
    lepton_number: 0,
    lifetime: 2.6411e-25, // seconds
    color_charge: 'colorless',
  },
  
  higgs_boson: {
    name: 'Higgs Boson',
    symbol: 'H⁰',
    mass: 125.1, // GeV
    charge: 0,
    spin: 0,
    baryon_number: 0,
    lepton_number: 0,
    lifetime: 1.56e-22, // seconds
    color_charge: 'colorless',
  },
  
  gluon: {
    name: 'Gluon',
    symbol: 'g',
    mass: 0, // approximately massless
    charge: 0,
    spin: 1,
    baryon_number: 0,
    lepton_number: 0,
    lifetime: Infinity,
    color_charge: 'color-anticolor pair', // carries color charge
  },
  
  // Composite particles
  proton: {
    name: 'Proton',
    symbol: 'p⁺',
    mass: 938.27208816, // MeV
    charge: 1,
    spin: 0.5,
    baryon_number: 1,
    lepton_number: 0,
    lifetime: Infinity,
    color_charge: 'colorless',
  },
};
