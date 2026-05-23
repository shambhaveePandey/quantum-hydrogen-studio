# ⚛️ Quantum Hydrogen Studio

> An interactive web application for visualising elementary particles, quantum orbitals, and force field theories of the hydrogen atom — built for scientists, students, and the curious.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Three.js](https://img.shields.io/badge/3D-Three.js-black)](https://threejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-orange.svg)](#contributing)

---

## 🌌 Overview

**Quantum Hydrogen Studio** is a browser-based 3D visualisation platform focused on the hydrogen atom — the simplest and most studied system in quantum mechanics. Rather than a static textbook diagram, this app renders the atom as a living, interactive model where users can inspect every elementary particle it contains, observe their properties and motion in real time, and switch between established quantum mechanical models and proposed theoretical extensions.

The hydrogen atom is the perfect entry point: one proton, one electron, and an electromagnetic field binding them together — yet this single system encodes the foundations of the Standard Model, quantum field theory, and some of the most intriguing open questions in physics.

---

## 🧪 Core Features

### 1. Elementary Particle Explorer
- **Full particle inventory** of the hydrogen atom rendered in 3D:
  - **Electron** — visualised as a probability cloud / wave function with adjustable quantum numbers (n, l, m)
  - **Proton** — rendered as a composite particle, showing its constituent **up quarks (×2)** and **down quark (×1)**, bound by **gluons**
  - **Photons** — virtual photon exchange between electron and proton visualised as dynamic force carriers
  - **Gluons** — shown as colour-charged flux tubes connecting quarks inside the proton
- Clicking any particle opens a **properties panel** showing:
  - Mass, charge, spin, colour charge (for quarks/gluons)
  - Quantum numbers where applicable
  - Role in the Standard Model

### 2. Motion & Spin Visualisation
- **Electron orbital motion** — animated probability density across all hydrogen orbitals (1s, 2s, 2p, 3d, etc.), rendered as volumetric point clouds
- **Quark confinement jiggling** — stochastic motion of quarks inside the proton, reflecting QCD colour confinement
- **Spin vectors** — rendered as animated arrows on each particle, showing intrinsic angular momentum (½ for quarks and electron, 1 for photons and gluons)
- **Proton spin decomposition** — toggle between naive quark model spin and QCD sea quark / gluon spin contributions (the "proton spin crisis" visualised)

### 3. Quantum Orbital Viewer
- Render any hydrogen orbital by entering quantum numbers **(n, l, m)**
- Switch between:
  - **Wave function phase** (colour-coded by sign/complex phase)
  - **Probability density** |ψ|² as a 3D point cloud
  - **Radial probability distribution** chart overlay
- Animate superpositions of two orbitals to observe interference and beat patterns
- Export current orbital as a PNG screenshot

### 4. Standard Model Context Panel
- A side panel classifying all particles present in the scene within the **Standard Model taxonomy**:
  - Fermions (quarks, leptons) vs Bosons (gauge bosons, Higgs)
  - Generation, isospin, and colour charge columns
  - Animated Feynman diagram of the dominant interaction (electron ↔ proton via γ exchange)

### 5. Force Field Theory Modes *(Theory Lab)*
Switch the entire scene into alternative or extended theoretical frameworks. Each mode is **clearly labelled as theoretical/speculative** with references:

| Mode | What Changes | Status |
|------|-------------|--------|
| **QED (default)** | Electromagnetic field lines, virtual photon exchange | Established |
| **QCD Flux Tubes** | Colour confinement strings between quarks rendered explicitly | Established |
| **Electroweak Unified** | W/Z bosons shown at high-energy limit; symmetry restoration visualised | Established |
| **Kaluza–Klein** | Extra compact spatial dimension added to field geometry; field lines curve through a 5th axis | Proposed |
| **String Theory Mode** | Quarks replaced by vibrating 1D strings; vibrational modes mapped to particle properties | Proposed |
| **Loop Quantum Gravity** | Space around the atom is quantised into a spin network; geometry is discrete | Proposed |
| **Dark Sector Coupling** | A hypothetical dark photon mediator shown coupling weakly to the electron | Speculative |

> ⚠️ All Theory Lab modes are clearly labelled with their scientific status and include citations to foundational papers.

---

## 🎛️ UI / UX Design

- **Dark-first interface** with a space-black background and particle-colour accent system
- **Scene controls**: orbit, zoom, pan via mouse/touch; reset to canonical view
- **Info overlays** toggle on/off per-particle or globally
- **Annotation layer**: label force field lines, orbital lobes, spin vectors independently
- **Timeline scrubber**: step through a virtual interaction event (e.g., photon absorption and re-emission)
- **Responsive**: works on desktop and tablet; mobile view shows simplified 2D orbital slice

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| 3D Rendering | [Three.js](https://threejs.org/) |
| Shader / VFX | GLSL custom shaders (volume rendering, probability clouds) |
| UI Framework | Vanilla JS + CSS custom properties |
| Charts | D3.js (radial probability plots) |
| Math | math.js / custom hydrogen wave-function solver |
| Build | Vite |
| Deployment | GitHub Pages / Vercel |

---

## 🗂️ Project Structure
quantum-hydrogen-studio/
├── index.html
├── src/
│ ├── main.js # App entry point
│ ├── scene/
│ │ ├── AtomScene.js # Three.js scene graph
│ │ ├── Electron.js # Electron orbital rendering
│ │ ├── Proton.js # Quark/gluon sub-structure
│ │ └── ForceField.js # Force field visualisers
│ ├── physics/
│ │ ├── HydrogenWaveFunction.js # Analytical ψ(n,l,m) solver
│ │ ├── ParticleProperties.js # Particle data registry
│ │ └── TheoryModes.js # Extended theory configurations
│ ├── ui/
│ │ ├── PropertiesPanel.js # Particle info panel
│ │ ├── OrbitalControls.js # n, l, m sliders
│ │ └── TheorySelector.js # Theory Lab mode switcher
│ ├── shaders/
│ │ ├── orbital.vert / .frag # Probability cloud volume shaders
│ │ └── gluon.vert / .frag # Flux tube rendering
│ └── assets/
│ ├── icons/
│ └── textures/
├── public/
│ └── favicon.svg
├── tests/
├── package.json
├── vite.config.js
└── README.md


---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### Install & Run

```bash
git clone https://github.com/shambhaveePandey/quantum-hydrogen-studio.git
cd quantum-hydrogen-studio
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🔭 Physics Reference

The wave functions are computed analytically from the exact hydrogen solution to the Schrödinger equation:

ψ(n,l,m) = R_nl(r) · Y_l^m(θ, φ)


Where `R_nl` are the associated Laguerre polynomial radial functions and `Y_l^m` are the real spherical harmonics. Quark colour charge is modelled using SU(3) colour algebra. All physical constants use CODATA 2022 recommended values.

**Key references:**
- Griffiths, D. J. — *Introduction to Quantum Mechanics* (3rd ed.)
- Griffiths, D. J. — *Introduction to Elementary Particles* (2nd ed.)
- Peskin & Schroeder — *An Introduction to Quantum Field Theory*
- Kaluza (1921), Klein (1926) — original Kaluza–Klein papers
- Polchinski — *String Theory* (Vol. 1 & 2)
- Rovelli & Smolin (1995) — Loop Quantum Gravity (spin networks)

---

## 🤝 Contributing

Contributions are welcome! Areas where help is especially valuable:

- **New theory modes** — implement additional beyond-Standard-Model extensions
- **Improved shaders** — more physically accurate orbital density rendering
- **Mobile support** — optimised touch controls and 2D fallback views
- **Accessibility** — screen-reader labels for particle properties panel
- **Localisation** — translate UI text and theory descriptions

Please read [CONTRIBUTING.md](CONTRIBUTING.md) and open an issue before submitting large PRs.

---

## 📄 License

MIT © [Shambhavee Pandey](https://github.com/shambhaveePandey)

---

## ✨ Acknowledgements

Inspired by the beauty of quantum mechanics and the conviction that physics should be explorable by anyone with a browser. Special thanks to the Three.js community and every physicist who has written accessible explanations of the Standard Model.
