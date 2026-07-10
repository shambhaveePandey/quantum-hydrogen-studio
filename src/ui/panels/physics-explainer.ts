/**
 * Physics Explainer Panel
 * -----------------------------------------------------------------------------
 * Renders, INSIDE the app, the mathematical logic that drives the 3D viewer:
 *   1. Radial probability sampling          P(r) = r²·|R_nl(r)|²
 *   2. Angular shape via spherical harmonics |Y_lm(θ,φ)|²
 *   3. Probability reference shells          <r> = (a₀/2)[3n² − l(l+1)]
 *   4. Binding energy                        E_n = −13.6/n² eV
 *   5. Transition frequency (Rydberg)        ν = (E_Ry/h)(1/n₁² − 1/n₂²)
 *   6. Planck-length spatial scaling         a₀ / Lₚ ≈ 3.3 × 10²⁴
 *
 * Each block states the equation, what it controls in the renderer, and a
 * primary reference. A live "effect on the 3D view" line updates as the user
 * changes n, l, m so the maths is tied directly to what they see on screen.
 *
 * References:
 *  - HyperPhysics, Hydrogen Wavefunctions:
 *    http://hyperphysics.phy-astr.gsu.edu/hbase/quantum/hydwf.html
 *  - HyperPhysics, Hydrogen radial probability:
 *    http://hyperphysics.phy-astr.gsu.edu/hbase/quantum/hydr.html
 *  - NIST CODATA recommended values: https://physics.nist.gov/cuu/Constants/
 *  - Griffiths, Introduction to Quantum Mechanics (Ch. 4, Hydrogen atom)
 */

interface QuantumState {
  n: number;
  l: number;
  m: number;
}

const ORBITAL_LETTERS: Record<number, string> = { 0: 's', 1: 'p', 2: 'd', 3: 'f', 4: 'g' };

export class PhysicsExplainer {
  private container: HTMLElement;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`PhysicsExplainer: #${containerId} not found`);
    this.container = el;
    this.renderShell();
  }

  /** Build the static explainer once (collapsible sections). */
  private renderShell(): void {
    this.container.innerHTML = `
      <div class="physics-explainer">

        <div class="pe-live" id="pe-live">
          <span class="pe-live-label">Effect on the 3D view</span>
          <p id="pe-live-text">Adjust n, l, m to see how the visualisation responds.</p>
        </div>

        <details class="pe-block">
          <summary>0 · Nucleus — quarks &amp; gluons</summary>
          <div class="pe-body">
            <p>Protons and neutrons aren't fundamental — each is 3 quarks bound by
            the strong force, carried by gluons. A proton is <strong>uud</strong>
            (2 up + 1 down quark, charge +1e); a neutron is <strong>udd</strong>
            (charge 0). Protium (¹H, this app's default) has a nucleus of a single
            proton and no neutron.</p>
            <p>The orange flux-tube lines in the 3D view are a simplified stand-in
            for gluon exchange — real confinement grows the binding energy with
            separation instead of a fixed-length line.</p>
            <p class="pe-effect"><strong>Viewer:</strong> click any quark sphere or
            the electron to see its real mass, charge and spin.</p>
            <a class="pe-ref" href="https://pdg.lbl.gov/" target="_blank" rel="noopener">Ref: Particle Data Group ↗</a>
          </div>
        </details>

        <details class="pe-block" open>
          <summary>1 · Electron cloud — radial probability P(r)</summary>
          <div class="pe-body">
            <code class="pe-eq">P(r) = r²·|R<sub>nl</sub>(r)|²,  R<sub>nl</sub> ∝ ρ<sup>l</sup>·e<sup>−ρ/2</sup>·L<sub>n−l−1</sub><sup>2l+1</sup>(ρ),  ρ = 2r/(n·a₀)</code>
            <p>The blue point cloud is drawn from the <em>exact</em> radial
            probability by inverse-CDF sampling — not a smooth approximation.
            R<sub>nl</sub> carries the generalized Laguerre polynomial
            L<sub>n−l−1</sub><sup>2l+1</sup>, which has <strong>n−l−1 radial
            nodes</strong>. Those zeros appear as concentric shells (2s = inner
            sphere + outer shell, 3s = three shells, …). The r² factor pushes the
            most-probable radius away from the nucleus — exactly a₀ for 1s.</p>
            <p class="pe-effect"><strong>Viewer:</strong> raising <em>n</em> swells the
            cloud (~n²·a₀) and adds shells; raising <em>l</em> removes nodes and
            pushes the outer shell further out.</p>
            <a class="pe-ref" href="http://hyperphysics.phy-astr.gsu.edu/hbase/quantum/hydr.html" target="_blank" rel="noopener">Ref: HyperPhysics — radial probability ↗</a>
          </div>
        </details>

        <details class="pe-block">
          <summary>2 · Orbital shape — spherical harmonics |Y<sub>lm</sub>|²</summary>
          <div class="pe-body">
            <code class="pe-eq">accept if  random() ≤ |Y<sub>lm</sub>(θ, φ)|²</code>
            <p>The direction of each point is accepted/rejected against the squared
            <em>real</em> spherical harmonic — including its φ dependence — so the
            orbitals form true lobes rather than φ-averaged rings:</p>
            <ul class="pe-list">
              <li><strong>s</strong> (l=0): isotropic sphere</li>
              <li><strong>p</strong> (l=1): m=0 → dumbbell along z; |m|=1 → lobes in the xy-plane (p<sub>x</sub>, p<sub>y</sub>)</li>
              <li><strong>d</strong> (l=2): (3cos²θ−1) axial cloud; |m|=1,2 → four-lobed cloverleaves</li>
            </ul>
            <p class="pe-effect"><strong>Viewer:</strong> changing <em>l</em> and
            <em>m</em> reshapes the cloud from a sphere to dumbbells and
            cloverleaves — rotate with the ViewCube to inspect the lobes.</p>
            <a class="pe-ref" href="http://hyperphysics.phy-astr.gsu.edu/hbase/quantum/hydwf.html" target="_blank" rel="noopener">Ref: HyperPhysics — hydrogen wavefunctions ↗</a>
          </div>
        </details>

        <details class="pe-block">
          <summary>3 · Probability shells — mean radius ⟨r⟩</summary>
          <div class="pe-body">
            <code class="pe-eq">⟨r⟩ = (a₀/2)·[3n² − l(l+1)]</code>
            <p>The translucent wireframe spheres mark the orbital's characteristic
            radii (0.5×, 1×, 1.5× of ⟨r⟩). They are computed from the quantum
            numbers, not hardcoded, so they expand with the n² scaling of hydrogen.</p>
            <p class="pe-effect"><strong>Viewer:</strong> the shells grow and the
            camera auto-frames to keep large (high-n) orbitals in view.</p>
            <a class="pe-ref" href="https://physics.nist.gov/cuu/Constants/" target="_blank" rel="noopener">Ref: NIST CODATA constants ↗</a>
          </div>
        </details>

        <details class="pe-block">
          <summary>4 · Binding energy &amp; 5 · spectral lines</summary>
          <div class="pe-body">
            <code class="pe-eq">E<sub>n</sub> = −13.6 eV / n²</code>
            <code class="pe-eq">ν = (E<sub>Ry</sub>/h)·(1/n₁² − 1/n₂²)</code>
            <p>The info panel's binding energy follows the Bohr/Rydberg result.
            The transition frequency uses the Planck constant h = 2πħ (a corrected
            unit factor); the Lyman-α line evaluates to 121.5 nm, matching the
            textbook 121.567 nm.</p>
            <p class="pe-effect"><strong>Viewer:</strong> raising <em>n</em> drives the
            binding energy toward 0 eV (less tightly bound) as shown live in the
            info panel.</p>
            <a class="pe-ref" href="http://hyperphysics.phy-astr.gsu.edu/hbase/hyde.html" target="_blank" rel="noopener">Ref: HyperPhysics — hydrogen energies ↗</a>
          </div>
        </details>

        <details class="pe-block">
          <summary>6 · Planck-length spatial graph (background)</summary>
          <div class="pe-body">
            <code class="pe-eq">a₀ / L<sub>p</sub> = 5.29×10⁻¹¹ / 1.62×10⁻³⁵ ≈ 3.3×10²⁴</code>
            <p>The faint background grid and concentric rings form a multi-axis
            spatial reference. Because the atom is ~24.5 orders of magnitude larger
            than the Planck length L<sub>p</sub>, the rings are spaced
            <strong>logarithmically</strong>: each ring inward represents a factor
            of ~10 smaller real length, from the Bohr radius down toward L<sub>p</sub>.</p>
            <p class="pe-effect"><strong>Viewer:</strong> the grid gives a sense of
            scale; toggle it with the "Spatial grid" checkbox.</p>
            <a class="pe-ref" href="https://physics.nist.gov/cgi-bin/cuu/Value?plkl" target="_blank" rel="noopener">Ref: NIST — Planck length ↗</a>
          </div>
        </details>

      </div>
    `;
  }

  /** Update the live "effect on the 3D view" line for the current state. */
  public update(state: QuantumState): void {
    const { n, l, m } = state;
    const name = `${n}${ORBITAL_LETTERS[l] ?? '?'}`;
    const meanRadius = (0.529 / 2) * (3 * n * n - l * (l + 1));
    const nodes = n - l - 1; // number of radial nodes → concentric shells
    let shapeNote: string;
    if (l === 0) shapeNote = 'a spherical (isotropic) cloud';
    else if (l === 1) shapeNote = m === 0 ? 'a dumbbell aligned along the z-axis' : 'two lobes in the xy-plane';
    else if (l === 2) shapeNote = m === 0 ? 'a z-aligned lobe with an equatorial ring' : 'a four-lobed cloverleaf';
    else shapeNote = 'a multi-lobed high-l cloud';

    const shellNote = nodes > 0
      ? ` with ${nodes} radial node${nodes > 1 ? 's' : ''} (${nodes + 1} concentric shells)`
      : ' (a single nodeless shell)';

    const text = document.getElementById('pe-live-text');
    if (text) {
      text.innerHTML =
        `<strong>${name}</strong> (n=${n}, l=${l}, m=${m}): the cloud samples the exact ` +
        `P(r) = r²·|R<sub>${n}${l}</sub>|²${shellNote}, peaking near ` +
        `⟨r⟩ ≈ ${meanRadius.toFixed(2)} Å, and the real |Y<sub>${l}${m}</sub>|² factor produces ` +
        `${shapeNote}. Reference shells scale to ⟨r⟩ and the camera re-frames.`;
    }
  }
}
