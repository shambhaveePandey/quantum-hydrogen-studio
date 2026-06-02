/**
 * 3D Visualization Engine using Three.js
 * Renders particle systems, orbitals, and force fields with interactive 3D controls
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ViewHelper } from 'three/examples/jsm/helpers/ViewHelper.js';
import { Particle, VisualizationSettings, ForceType, HydrogenAtomConfiguration } from '../../types/particle';

export class VisualizationEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private particleMeshes: Map<string, THREE.Mesh> = new Map();
  private orbitMesh: THREE.Points | null = null;
  private probabilityShells: THREE.Mesh[] = [];
  private fieldVisualization: THREE.Object3D | null = null;
  private settings: VisualizationSettings;
  private animationId: number | null = null;

  // Navigation gizmo (ViewCube) + its frame clock
  private viewHelper: ViewHelper;
  private clock: THREE.Clock = new THREE.Clock();

  // Background multi-axis spatial reference graph (Planck-scale grid)
  private spatialGraph: THREE.Group | null = null;
  
  constructor(
    container: HTMLElement,
    settings: VisualizationSettings = {
      show_electron_cloud: true,
      show_probability_density: true,
      show_quark_structure: false,
      show_field_lines: false,
      show_particle_paths: false,
      particle_scale: 1,
      field_intensity: 0.5,
    }
  ) {
    this.settings = settings;

    // Scene setup — use a deep-blue that is visibly different from the dark panel background
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050d1a);

    // Renderer setup (no alpha — opaque background so the canvas is always visible)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // We render the main scene and the ViewCube gizmo in two passes, so disable
    // automatic buffer clearing and clear once manually at the top of the frame.
    this.renderer.autoClear = false;
    container.appendChild(this.renderer.domElement);

    // Read dimensions after DOM insertion; fall back to window size if flex hasn't resolved yet
    const width  = container.clientWidth  || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer.setSize(width, height);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
    this.camera.position.set(0, 0, 5);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(5, 5, 5);
    this.scene.add(pointLight);

    // Axes helper: X = red, Y = green, Z = blue (length 2 Å units)
    this.scene.add(new THREE.AxesHelper(2));

    // Background multi-axis spatial reference graph (Planck-length scaling)
    this.spatialGraph = this.createSpatialGraph();
    this.scene.add(this.spatialGraph);

    // OrbitControls — mouse/touch orbit, zoom, pan
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 20;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    // Navigation ViewCube gizmo (bottom-right overlay). It re-orients the
    // camera to ±X/±Y/±Z when its faces are clicked, animating the transition.
    this.viewHelper = new ViewHelper(this.camera, this.renderer.domElement);
    this.viewHelper.setLabels('X', 'Y', 'Z');
    // Route clicks in the gizmo's bottom-right region to the helper.
    this.renderer.domElement.addEventListener('pointerdown', (event) => {
      if (this.isPointerOnGizmo(event)) {
        this.viewHelper.handleClick(event);
      }
    });

    // Handle window resize; also schedule one frame-deferred resize in case
    // flex layout hasn't settled yet when the constructor ran
    window.addEventListener('resize', () => this.onWindowResize());
    // Mobile browsers don't always fire 'resize' on rotation; cover both,
    // with a deferred pass to let the new layout settle before re-measuring.
    window.addEventListener('orientationchange', () => {
      this.onWindowResize();
      setTimeout(() => this.onWindowResize(), 300);
    });
    requestAnimationFrame(() => this.onWindowResize());
  }
  
  /**
   * Render hydrogen atom configuration
   */
  public renderHydrogenAtom(hydrogenConfig: HydrogenAtomConfiguration): void {
    // Clear previous meshes
    this.particleMeshes.forEach(mesh => this.scene.remove(mesh));
    this.particleMeshes.clear();
    
    // Render proton (nucleus)
    this.renderProton(hydrogenConfig.proton);
    
    // Render electrons
    hydrogenConfig.electrons.forEach((electron: Particle, index: number) => {
      this.renderElectron(electron, index);
    });
    
    // Render electron cloud/orbital
    if (this.settings.show_electron_cloud) {
      this.renderElectronCloud(hydrogenConfig);
    }
    
    // Render probability density visualization
    if (this.settings.show_probability_density) {
      this.renderProbabilityDensity(hydrogenConfig);
    }

    // Adaptively frame the camera so larger (high-n) orbitals stay in view.
    this.frameOrbital(hydrogenConfig);
  }

  /**
   * Adjust the camera/controls so the current orbital fits the viewport.
   * Orbital extent grows as the mean radius <r> = a₀/2·[3n² − l(l+1)], plus
   * headroom for the radial tail. We raise OrbitControls.maxDistance and, if
   * the camera is currently too close to see the whole cloud, ease it back.
   */
  private frameOrbital(hydrogenConfig: HydrogenAtomConfiguration): void {
    const n = Math.max(1, hydrogenConfig.orbital_shell);
    const l = Math.max(0, Math.min(hydrogenConfig.orbital_angular_momentum, n - 1));
    const a0 = 0.6;
    const meanRadius = (a0 / 2) * (3 * n * n - l * (l + 1));
    const orbitalExtent = meanRadius * 2.2; // include the radial tail

    // Keep zoom limits sensible for the current orbital size
    this.controls.maxDistance = Math.max(20, orbitalExtent * 4);
    this.controls.minDistance = 0.5;

    // Desired viewing distance to comfortably frame the orbital (FOV 75°)
    const fitDistance = orbitalExtent / Math.tan((this.camera.fov * Math.PI) / 180 / 2) + 1.5;
    const currentDistance = this.camera.position.distanceTo(this.controls.target);
    if (currentDistance < fitDistance) {
      const dir = this.camera.position.clone().sub(this.controls.target).normalize();
      this.camera.position.copy(dir.multiplyScalar(fitDistance).add(this.controls.target));
      this.controls.update();
    }
  }
  
  /**
   * Render proton at nucleus
   */
  private renderProton(proton: Particle): void {
    const radius = 0.15 * this.settings.particle_scale;
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: 0xff2200,
      emissive: 0xff4400,
      emissiveIntensity: 0.4,
      shininess: 100,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...proton.position);
    mesh.userData = { particle: proton, type: 'proton' };
    
    this.scene.add(mesh);
    this.particleMeshes.set(proton.id, mesh);
  }
  
  /**
   * Render electron
   */
  private renderElectron(electron: Particle, index: number): void {
    const radius = 0.08 * this.settings.particle_scale;
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: 0x00aaff,
      emissive: 0x0044ff,
      emissiveIntensity: 0.5,
      shininess: 100,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...electron.position);
    mesh.userData = { particle: electron, type: 'electron', index };
    
    this.scene.add(mesh);
    this.particleMeshes.set(electron.id, mesh);
  }
  
  /**
   * Render the electron orbital cloud as a Monte-Carlo point cloud sampled
   * from the hydrogen probability density |ψ_nlm|².
   *
   * Radial part: the RADIAL PROBABILITY P(r) = r²·|R_nl(r)|² (not |R|² alone).
   *   For the 1s state P(r) ∝ r²·e^(−2r/a₀), a Gamma distribution peaking at
   *   the most-probable radius r = a₀ — NOT at the nucleus. We sample it with a
   *   sum-of-exponentials trick (Gamma(shape) ≈ Σ of `shape` exponentials).
   * Angular part: |Y_lm(θ,φ)|² gives the orbital its characteristic shape
   *   (s = spherical, p = two-lobed, d = four-lobed) via rejection sampling.
   * Scale: the orbital size grows as ≈ n²·a₀, the correct hydrogen scaling.
   */
  private renderElectronCloud(hydrogenConfig: HydrogenAtomConfiguration): void {
    if (this.orbitMesh) {
      this.scene.remove(this.orbitMesh);
      this.orbitMesh.geometry.dispose();
    }

    const n = Math.max(1, hydrogenConfig.orbital_shell);
    const l = Math.max(0, Math.min(hydrogenConfig.orbital_angular_momentum, n - 1));
    const m = Math.max(-l, Math.min(hydrogenConfig.magnetic_quantum_number, l));

    // Visualization Bohr radius (Ångström-scaled for a comfortable camera frame)
    const a0 = 0.6;
    // Exponential decay length of |R_nl|² scales as n·a₀
    const decay = n * a0;

    const points: THREE.Vector3[] = [];
    const samples = 1400;
    let attempts = 0;
    const maxAttempts = samples * 40;

    while (points.length < samples && attempts < maxAttempts) {
      attempts++;

      // --- Radial sample via Gamma-like distribution P(r) ∝ r^(2+2l)·e^(−2r/(n·a₀))
      // Sum of (l+2) exponentials approximates the radial-probability peak that
      // moves outward with n and l, reproducing the most-probable-radius shift.
      let r = 0;
      const radialShape = l + 2; // 1s → 2 exponentials → peak away from nucleus
      for (let k = 0; k < radialShape; k++) {
        r += -Math.log(Math.random());
      }
      r *= decay / 2; // normalise so the 1s peak sits near a₀

      // --- Angular sample with |Y_lm|² rejection sampling
      const theta = Math.acos(2 * Math.random() - 1); // uniform in cos θ
      const phi = 2 * Math.PI * Math.random();
      const angularProb = this.angularProbability(l, m, theta);
      if (Math.random() > angularProb) continue; // reject

      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(theta);
      points.push(new THREE.Vector3(x, y, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.PointsMaterial({
      color: 0x00aaff,
      size: 0.05,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
    });

    const pointsMesh = new THREE.Points(geometry, material);
    this.orbitMesh = pointsMesh;
    this.scene.add(pointsMesh);
  }

  /**
   * Normalised |Y_lm(θ)|² shape factor (φ-independent magnitude) used for
   * rejection sampling the angular distribution. Returns a value in [0,1].
   *   l=0 (s): isotropic sphere
   *   l=1 (p): m=0 → cos²θ (dumbbell along z); |m|=1 → sin²θ (torus)
   *   l=2 (d): m=0 → (3cos²θ−1)²; |m|=1 → sin²θcos²θ; |m|=2 → sin⁴θ
   */
  private angularProbability(l: number, m: number, theta: number): number {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const am = Math.abs(m);
    if (l === 0) return 1;
    if (l === 1) {
      return am === 0 ? c * c : s * s;
    }
    if (l === 2) {
      if (am === 0) { const v = (3 * c * c - 1); return (v * v) / 4; }
      if (am === 1) return s * s * c * c * 4;
      return s * s * s * s; // |m|=2
    }
    // l ≥ 3 (f and beyond): approximate with an l-lobed band, keeps it lively
    return Math.pow(Math.abs(Math.cos((l) * theta)), 2);
  }
  
  /**
   * Render probability-density reference shells.
   *
   * These translucent wireframe spheres mark characteristic radii of the
   * current orbital. They scale with the orbital's mean radius
   * <r> = a₀/2 · [3n² − l(l+1)], so the shells visibly expand as n increases
   * — reflecting the real n² growth of hydrogen orbitals. Old shells are
   * disposed of on every call to avoid mesh build-up.
   */
  private renderProbabilityDensity(hydrogenConfig: HydrogenAtomConfiguration): void {
    // Remove previous shells (fixes the mesh-leak that accumulated spheres)
    this.probabilityShells.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.probabilityShells = [];

    const n = Math.max(1, hydrogenConfig.orbital_shell);
    const l = Math.max(0, Math.min(hydrogenConfig.orbital_angular_momentum, n - 1));
    const a0 = 0.6;
    const meanRadius = (a0 / 2) * (3 * n * n - l * (l + 1));

    // Three reference shells at 0.5×, 1× and 1.5× the mean orbital radius
    const fractions = [0.5, 1.0, 1.5];
    fractions.forEach((f, index) => {
      const geometry = new THREE.SphereGeometry(meanRadius * f, 32, 32);
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(0.6 + index * 0.1, 0.7, 0.5),
        wireframe: true,
        transparent: true,
        opacity: 0.18,
      });
      const mesh = new THREE.Mesh(geometry, material);
      this.scene.add(mesh);
      this.probabilityShells.push(mesh);
    });
  }
  
  /**
   * Render force field visualization
   */
  public renderForceField(forceType: ForceType, intensity: number = 0.5): void {
    if (this.fieldVisualization) {
      this.scene.remove(this.fieldVisualization);
    }
    
    this.fieldVisualization = new THREE.Group();
    
    // Create field lines based on force type
    const fieldLines = this.generateFieldLines(forceType, intensity);
    fieldLines.forEach(line => this.fieldVisualization!.add(line));
    
    this.scene.add(this.fieldVisualization);
  }
  
  /**
   * Generate field line geometry
   */
  private generateFieldLines(forceType: ForceType, intensity: number): THREE.Line[] {
    const lines: THREE.Line[] = [];
    const lineCount = Math.floor(20 * intensity);
    
    const colorMap: { [key in ForceType]: number } = {
      electromagnetic: 0xFFD700,
      weak: 0xFF69B4,
      strong: 0xFF4500,
      higgs: 0x00CED1,
      gravity: 0x808080,
    };
    
    for (let i = 0; i < lineCount; i++) {
      const theta = (i / lineCount) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      
      const steps = 50;
      for (let step = 0; step < steps; step++) {
        const r = 0.1 + (step / steps) * 3;
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        const z = (step / steps - 0.5) * 0.5;
        
        points.push(new THREE.Vector3(x, y, z));
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: colorMap[forceType] || 0xFFFFFF,
        transparent: true,
        opacity: 0.5,
        linewidth: 2,
      });
      
      lines.push(new THREE.Line(geometry, material));
    }
    
    return lines;
  }
  
  /**
   * Update particle positions
   */
  public updateParticlePositions(particles: Particle[]): void {
    particles.forEach(particle => {
      const mesh = this.particleMeshes.get(particle.id);
      if (mesh) {
        mesh.position.set(...particle.position);
      }
    });
  }
  
  /**
   * Update visualization settings
   */
  public updateSettings(settings: Partial<VisualizationSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }
  
  /**
   * Start animation loop
   */
  public animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    // Advance the ViewCube's re-orientation animation when a face was clicked.
    if (this.viewHelper.animating) {
      this.viewHelper.update(delta);
    } else {
      this.controls.update(); // required for inertia/damping
    }

    // Main scene first, then overlay the gizmo without clearing the frame.
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.viewHelper.render(this.renderer);
  }
  
  /**
   * Stop animation
   */
  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
  }
  
  /**
   * Handle window resize
   */
  private onWindowResize(): void {
    const width = this.renderer.domElement.parentElement?.clientWidth || window.innerWidth;
    const height = this.renderer.domElement.parentElement?.clientHeight || window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  
  /**
   * Hit-test whether a pointer event landed inside the ViewCube gizmo, which
   * occupies a fixed 128x128 px square in the bottom-right of the canvas.
   */
  private isPointerOnGizmo(event: PointerEvent): boolean {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const size = 128;
    return x >= rect.width - size && y >= rect.height - size;
  }

  /**
   * Build a background multi-axis spatial reference graph that conveys the
   * staggering range of physical length scales involved.
   *
   * Scene units: 1 unit = the visualisation Bohr radius a0_vis = 0.6 (which
   * stands in for the real Bohr radius a0 = 5.29e-11 m). The grid therefore
   * shows how the Bohr radius compares with the Planck length
   * Lp = 1.616e-35 m: the ratio a0 / Lp ~ 3.27e24, i.e. the atom is ~24.5
   * orders of magnitude larger than the Planck length. Because that span
   * cannot be drawn linearly, the back-plane uses a LOGARITHMIC (base-10)
   * radial grid: each concentric ring is one decade (x10) smaller in real
   * size as you move inward, with the innermost ring annotated near the
   * Planck scale. The three coloured axes (X/Y/Z) provide spatial reference
   * for orbiting the camera.
   */
  private createSpatialGraph(): THREE.Group {
    const group = new THREE.Group();

    // --- A faint Cartesian grid plane behind the atom (XZ plane) ----------
    const grid = new THREE.GridHelper(16, 16, 0x224466, 0x16263b);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.25;
    group.add(grid);

    // A second grid rotated to the XY plane gives the multi-axis feel.
    const gridXY = new THREE.GridHelper(16, 16, 0x224466, 0x16263b);
    gridXY.rotation.x = Math.PI / 2;
    (gridXY.material as THREE.Material).transparent = true;
    (gridXY.material as THREE.Material).opacity = 0.12;
    group.add(gridXY);

    // --- Logarithmic decade rings: each ring = x10 in real length scale ---
    // Map: outermost ring (radius 7) = Bohr radius scale (~1e-10 m); each
    // step inward divides the real size by 10 until we approach Lp (~1e-35 m).
    const a0Meters = 5.29177e-11;      // Bohr radius (m)
    const planckMeters = 1.616255e-35; // Planck length (m)
    const decades = Math.round(Math.log10(a0Meters / planckMeters)); // ~24-25
    const maxRingRadius = 7;
    const ringsToDraw = 6; // draw the outer 6 decades; label endpoints
    for (let i = 0; i < ringsToDraw; i++) {
      const radius = maxRingRadius * Math.pow(0.62, i); // shrink ~per decade
      const segments = 96;
      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= segments; s++) {
        const a = (s / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color().setHSL(0.55, 0.6, 0.45 - i * 0.03),
        transparent: true,
        opacity: 0.35,
      });
      group.add(new THREE.LineLoop(geo, mat));
    }

    // --- Decade labels via sprite canvases (outer = atomic, inner = Planck)
    const labelData: Array<{ r: number; text: string }> = [
      { r: maxRingRadius, text: 'Bohr radius a0 = 5.3e-11 m' },
      { r: maxRingRadius * Math.pow(0.62, ringsToDraw - 1), text: `${decades} decades to Planck Lp = 1.6e-35 m` },
    ];
    labelData.forEach(({ r, text }) => {
      const sprite = this.makeTextSprite(text);
      sprite.position.set(0, 0.05, -r);
      group.add(sprite);
    });

    return group;
  }

  /**
   * Create a small text label as a camera-facing sprite (for the spatial graph).
   */
  private makeTextSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(120, 200, 255, 0.85)';
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(4, 0.5, 1);
    return sprite;
  }

  /**
   * Toggle visibility of the background spatial reference graph.
   */
  public setSpatialGraphVisible(visible: boolean): void {
    if (this.spatialGraph) this.spatialGraph.visible = visible;
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    this.stop();
    this.viewHelper.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
