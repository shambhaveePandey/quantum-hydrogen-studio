# ⚛️ Quantum Hydrogen Studio

> An interactive 3D web application for exploring the hydrogen atom — its particles, quantum orbitals, and fundamental force fields.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Three.js](https://img.shields.io/badge/3D-Three.js-black)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Build-Vite-646cff)](https://vitejs.dev/)
[![Deploy to GitHub Pages](https://github.com/shambhaveePandey/quantum-hydrogen-studio/actions/workflows/deploy.yml/badge.svg)](https://github.com/shambhaveePandey/quantum-hydrogen-studio/actions/workflows/deploy.yml)

**🔗 Live demo: [shambhaveepandey.github.io/quantum-hydrogen-studio](https://shambhaveepandey.github.io/quantum-hydrogen-studio/)**

---

## Documentation

| Document | For whom | Link |
|----------|----------|------|
| **User Instruction Manual** | End users / students / educators | [Open in Notion](https://www.notion.so/373ff97a754181da937fd5f851edd6dc) |
| **API Documentation** | Developers / contributors | [Open in Notion](https://www.notion.so/373ff97a754181d9b09bdf8932684bf9) |

---

## Overview

**Quantum Hydrogen Studio** is a browser-based 3D visualisation platform built around the hydrogen atom. It renders the atom as a live, interactive scene using Three.js WebGL, letting you orbit the scene freely, adjust quantum numbers, and toggle force field overlays — all in real time.

The hydrogen atom is the perfect entry point: one proton, one electron, and an electromagnetic field binding them together, yet this single system encodes the foundations of the Standard Model and quantum mechanics.

---

## Features

### Interactive 3D Viewer
- Full orbit, zoom, and pan via mouse or touch (Three.js `OrbitControls`)
- Inertia / damping for smooth camera movement
- X / Y / Z axis reference lines (red / green / blue) centred on the nucleus
- Opaque deep-space background; scene is always visible regardless of panel colour

### Hydrogen Atom Visualisation
| Element | Representation |
|---------|----------------|
| **Proton** (nucleus) | Red emissive sphere at the origin |
| **Electron** | Blue emissive sphere at a quantum-mechanically sampled position |
| **Orbital cloud** | 1 000-point probability-density point cloud (1s distribution by default) |
| **Probability shells** | Three concentric wireframe spheres at 0.5, 1.0, 1.5 Å representing radial probability |

### Quantum State Controls (left panel)
- **Principal quantum number n** (1 – 5)
- **Angular momentum l** (0 – n−1, constrained automatically)
- **Magnetic quantum number m** (−l – l, constrained automatically)
- Changing any slider re-samples the electron position and re-renders the orbital cloud using the correct hydrogen wave-function scaling

### Force Field Visualisation
Five force types, each with distinct colour-coded field lines radiating from the nucleus:

| Force | Colour |
|-------|--------|
| Electromagnetic (default) | Gold |
| Weak nuclear | Hot pink |
| Strong nuclear | Red-orange |
| Higgs field | Teal |
| Gravity | Grey |

- **Field intensity slider** (0 – 100 %) scales the number of field lines in real time
- Force fields can be toggled independently via checkboxes

### Quantum State Info (right panel)
Live readout that updates whenever the quantum state changes:
- Orbital name (e.g. `2p`)
- Quantum numbers `(n, l, m)`
- Electron binding energy (Rydberg formula: E_n = −13.6 eV / n²)
- Bohr radius scale (a_n = n² × 0.529 Å)
- Active force fields

---

## Physics

Wave functions are based on the exact hydrogen solutions to the Schrödinger equation:

```
ψ(n,l,m) = R_nl(r) · Y_l^m(θ, φ)
```

- Radial wave function `R_nl` built from the generalized Laguerre polynomials `L_{n-l-1}^{2l+1}` (so radial nodes / concentric shells appear correctly)
- Electron positions sampled from the exact `|ψ_nlm|² = |R_nl(r)|²·|Y_lm(θ,φ)|²`: the radius by inverse-CDF sampling of `P(r)=r²|R_nl|²`, the direction by rejection sampling the real spherical harmonics `|Y_lm(θ,φ)|²` (see `createOrbitalSampler` in `src/physics/orbitals/hydrogen.ts`)
- Physical constants use **NIST / CODATA 2018 & PDG** recommended values (see `src/physics/constants/particles.ts`)

> **Accuracy note:** This studio is built for intuition and teaching, not laboratory-grade simulation. Electron positions are sampled from the exact hydrogen `|ψ_nlm|²` (radial nodes and angular lobes included); the wireframe probability shells remain simplified reference surfaces scaled to ⟨r⟩.

**Key references:**
- Griffiths, D. J. — *Introduction to Quantum Mechanics* (3rd ed.)
- Griffiths, D. J. — *Introduction to Elementary Particles* (2nd ed.)
- Peskin & Schroeder — *An Introduction to Quantum Field Theory*

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| 3D rendering | [Three.js](https://threejs.org/) |
| 3D interaction | `OrbitControls` (Three.js examples) |
| Language | TypeScript 5 |
| UI | Vanilla TypeScript + CSS custom properties |
| Build | [Vite](https://vitejs.dev/) 5 |

---

## Project Structure

```
quantum-hydrogen-studio/
├── index.html                        # Static HTML shell (all DOM nodes pre-declared)
├── src/
│   ├── main.ts                       # App entry — wires DOM to engine & controls
│   ├── main.css                      # Dark space theme
│   ├── core/engine/
│   │   └── renderer.ts              # Three.js scene, OrbitControls, particle meshes
│   ├── physics/
│   │   ├── orbitals/hydrogen.ts     # ψ(n,l,m) solver, atom factory functions
│   │   ├── fields/fundamental-forces.ts  # Coulomb / Yukawa / Higgs field maths
│   │   └── constants/particles.ts   # CODATA 2022 constants, Standard Model data
│   ├── ui/controls/
│   │   └── quantum-state-control.ts # n / l / m sliders + force-field checkboxes
│   └── types/particle.ts            # Shared TypeScript interfaces
├── public/
│   └── favicon.svg                  # App icon (atom motif)
├── .github/workflows/deploy.yml     # CI: build + publish to gh-pages
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### Install & run

```bash
git clone https://github.com/shambhaveePandey/quantum-hydrogen-studio.git
cd quantum-hydrogen-studio
npm install
npm run dev
```

Open **`http://localhost:5173`** in your browser (Chrome, Edge, Firefox — any browser with WebGL support).

> **Note:** Do not open the HTML file directly or use a Live Preview extension — TypeScript compilation requires the Vite dev server.

### Production build

```bash
npm run build   # outputs to dist/
npm run preview # serve the production build locally
```

---

## Deployment

The app is hosted on **GitHub Pages** at [shambhaveepandey.github.io/quantum-hydrogen-studio](https://shambhaveepandey.github.io/quantum-hydrogen-studio/).

Deployment is fully automated via GitHub Actions (`.github/workflows/deploy.yml`):

1. Every push to `main` triggers a type-check + Vite production build.
2. The built `dist/` output is published to the **`gh-pages`** branch via `peaceiris/actions-gh-pages`.
3. **GitHub Pages is configured to serve from the `gh-pages` branch** (Settings → Pages → Source = `gh-pages`, `/` root).

> **Important:** Pages must serve the built `gh-pages` branch — **not** `main`. The `main` branch contains raw TypeScript source (`index.html` loads `/src/main.ts`), which the browser cannot execute directly; serving it produces a blank page. Vite's `base: '/quantum-hydrogen-studio/'` ensures every asset URL is correctly prefixed for project-page hosting.

---

## Controls reference

| Input | Action |
|-------|--------|
| Left-drag | Orbit around the atom |
| Right-drag / two-finger drag | Pan |
| Scroll wheel / pinch | Zoom in / out |
| n slider | Change principal quantum number |
| l slider | Change angular momentum (auto-clamped to n−1) |
| m slider | Change magnetic quantum number (auto-clamped to ±l) |
| Force checkboxes | Toggle field line overlays |
| Intensity slider | Scale field line density |

---

## Contributing

Contributions welcome. Areas of particular interest:

- **Quark sub-structure** — render the proton's uud quark content with colour-flux tubes
- **Mobile / touch** — optimise controls and layout for small screens
- **Accessibility** — ARIA labels for the info panel and controls

Please open an issue before submitting large PRs.

---

## License

MIT © [Shambhavee Pandey](https://github.com/shambhaveePandey)
