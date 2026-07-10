/**
 * 3D Visualization Engine using Three.js
 * Renders the hydrogen atom as its real constituents — a uud quark nucleus
 * bound by gluon flux tubes, an electron with a spin vector, and a
 * probability cloud sampled from the exact |ψ_nlm|² — plus force-field
 * overlays, all with interactive orbit/zoom/pan controls and filmic bloom.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Particle, VisualizationSettings, ForceType, HydrogenAtomConfiguration } from '../../types/particle';
import { createOrbitalSampler } from '../../physics/orbitals/hydrogen';

/** Toggleable parts of the atom, inspected in isolation like a live sim. */
export interface ParticleVisibility {
  nucleus: boolean;
  gluons: boolean;
  electron: boolean;
  spin: boolean;
  cloud: boolean;
  shells: boolean;
}

/** Human-readable properties shown when a particle is clicked in the scene. */
export interface ParticleInfo {
  name: string;
  symbol: string;
  mass: string;
  charge: string;
  spin: string;
  family: string;
}

const FORCE_COLORS: { [key in ForceType]: number } = {
  electromagnetic: 0xffd700,
  weak: 0xff69b4,
  strong: 0xff4500,
  higgs: 0x00ced1,
  gravity: 0x808080,
};

// Gluon flux tubes match the Strong Nuclear field colour.
const STRONG_COLOR = 0xff4500;

const PARTICLE_INFO: { [key: string]: ParticleInfo } = {
  electron: { name: 'Electron', symbol: 'e⁻', mass: '9.109×10⁻³¹ kg (0.511 MeV/c²)', charge: '−1 e', spin: '1/2 ħ', family: 'Lepton (fundamental — no substructure)' },
  up: { name: 'Up quark', symbol: 'u', mass: '~2.16 MeV/c²', charge: '+2/3 e', spin: '1/2 ħ', family: 'Quark — bound in the proton by gluons' },
  down: { name: 'Down quark', symbol: 'd', mass: '~4.67 MeV/c²', charge: '−1/3 e', spin: '1/2 ħ', family: 'Quark — bound in the proton by gluons' },
  proton: { name: 'Proton (2 up + 1 down)', symbol: 'p⁺', mass: '1.673×10⁻²⁷ kg (938.3 MeV/c²)', charge: '+1 e', spin: '1/2 ħ', family: 'Baryon — quarks held together by the strong force (gluons)' },
};

export class VisualizationEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private composer: EffectComposer;
  private settings: VisualizationSettings;
  private animationId: number | null = null;
  private clock: THREE.Clock = new THREE.Clock();

  // Persistent scene objects
  private spatialGroup: THREE.Group | null = null;   // X/Y/Z orientation grids
  private nucleusGroup: THREE.Group | null = null;   // uud quarks + boundary
  private gluonLines: THREE.Line[] = [];             // animated flux tubes
  private quarkMeshes: THREE.Object3D[] = [];        // click targets (+ boundary)

  // Per-state objects, rebuilt on each renderHydrogenAtom
  private electronMesh: THREE.Mesh | null = null;
  private electronSpinArrow: THREE.ArrowHelper | null = null;
  private cloudMesh: THREE.Points | null = null;
  private shellMeshes: THREE.Mesh[] = [];
  private fieldGroup: THREE.Group | null = null;

  // Interaction
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private pointer: THREE.Vector2 = new THREE.Vector2();
  private onParticleSelectCb: ((info: ParticleInfo | null) => void) | null = null;
  private glowTexture: THREE.Texture | null = null;
  private fitDistance = 5;

  private visibility: ParticleVisibility = {
    nucleus: true, gluons: true, electron: true, spin: true, cloud: true, shells: true,
  };

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

    // Scene + deep-space background
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050d1a);

    // Renderer with physically-based colour management + filmic tone mapping
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    const width  = container.clientWidth  || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);

    // Subtle studio reflections on the emissive spheres (PMREM-prefiltered)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
    this.camera.position.set(0, 0, 5);

    // Lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const pointLight = new THREE.PointLight(0xffffff, 0.9);
    pointLight.position.set(5, 5, 5);
    this.scene.add(pointLight);

    // Distant starfield for depth
    this.scene.add(this.makeStarfield());

    // Full-span, always-on-top X/Y/Z reference axes with labels
    this.buildAxes();

    // Three faintly-tinted orientation grids (XZ / XY / YZ), toggled together
    this.spatialGroup = this.buildSpatialGrids();
    this.scene.add(this.spatialGroup);

    // Nucleus: proton as 2 up + 1 down quarks joined by gluon flux tubes
    this.buildNucleus();

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 20;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    // Post-processing: filmic bloom so emissive/additive elements read as light
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.3, 0.4, 0.6);
    this.composer.addPass(bloomPass);

    // Click-to-inspect a particle (electron or a quark)
    this.renderer.domElement.addEventListener('click', (e) => this.onCanvasClick(e));

    // Resize handling (also cover mobile orientation changes)
    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('orientationchange', () => {
      this.onWindowResize();
      setTimeout(() => this.onWindowResize(), 300);
    });
    requestAnimationFrame(() => this.onWindowResize());
  }

  // ───────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────

  /** Render the electron, its spin vector, the probability cloud and shells. */
  public renderHydrogenAtom(hydrogenConfig: HydrogenAtomConfiguration): void {
    const n = Math.max(1, hydrogenConfig.orbital_shell);
    const l = Math.max(0, Math.min(hydrogenConfig.orbital_angular_momentum, n - 1));
    const m = Math.max(-l, Math.min(hydrogenConfig.magnetic_quantum_number, l));

    // Sample the electron marker at the same visualization scale as the cloud
    // (viz a₀ = 0.6) so the marker sits inside its own probability distribution.
    const markerPos = createOrbitalSampler(n, l, m, 0.6)();
    const spinState = hydrogenConfig.electrons[0]?.spin_state ?? 'up';
    this.renderElectron(markerPos, spinState);
    this.renderElectronCloud(n, l, m);
    this.renderProbabilityShells(n, l);
    this.frameOrbital(n, l);
    this.applyVisibility();
  }

  /** Render field lines for the (first) active force type. */
  public renderForceField(forceType: ForceType, intensity: number = 0.5): void {
    if (this.fieldGroup) this.scene.remove(this.fieldGroup);
    this.fieldGroup = new THREE.Group();

    const lineCount = Math.floor(20 * intensity);
    for (let i = 0; i < lineCount; i++) {
      const theta = (i / lineCount) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      const steps = 50;
      for (let step = 0; step < steps; step++) {
        const r = 0.1 + (step / steps) * 3;
        points.push(new THREE.Vector3(r * Math.cos(theta), r * Math.sin(theta), (step / steps - 0.5) * 0.5));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: FORCE_COLORS[forceType] || 0xffffff,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.fieldGroup.add(new THREE.Line(geometry, material));
    }
    this.scene.add(this.fieldGroup);
  }

  /** Clear all force-field lines (when no force is active). */
  public clearForceField(): void {
    if (this.fieldGroup) {
      this.scene.remove(this.fieldGroup);
      this.fieldGroup = null;
    }
  }

  /** Toggle one part of the atom on/off. */
  public setParticleVisibility(key: keyof ParticleVisibility, value: boolean): void {
    this.visibility[key] = value;
    this.applyVisibility();
  }

  /** Register a callback fired when a particle is clicked (null = cleared). */
  public onParticleSelect(cb: (info: ParticleInfo | null) => void): void {
    this.onParticleSelectCb = cb;
  }

  /** Ease the camera back to a three-quarter view framing the current orbital. */
  public recenter(): void {
    this.controls.target.set(0, 0, 0);
    const dir = new THREE.Vector3(0.5, 0.35, 1).normalize();
    this.camera.position.copy(dir.multiplyScalar(this.fitDistance));
    this.camera.up.set(0, 1, 0);
    this.controls.update();
  }

  public updateSettings(settings: Partial<VisualizationSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /** Toggle the X/Y/Z orientation grids. */
  public setSpatialGraphVisible(visible: boolean): void {
    if (this.spatialGroup) this.spatialGroup.visible = visible;
  }

  public animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls.update();

    // Pulse the gluon flux tubes so the strong-force binding looks alive.
    if (this.gluonLines.length) {
      const t = this.clock.getElapsedTime();
      this.gluonLines.forEach((line, i) => {
        (line.material as THREE.LineBasicMaterial).opacity = 0.45 + 0.35 * Math.sin(t * 2 + i * 2);
      });
    }

    this.composer.render();
  }

  public stop(): void {
    if (this.animationId !== null) cancelAnimationFrame(this.animationId);
  }

  public dispose(): void {
    this.stop();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  // ───────────────────────────────────────────────────────────────────────
  // Scene construction
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Build the proton from its real uud composition: 2 up-quarks + 1 down-quark
   * in a small triangle, joined by additive-blended gluon flux tubes, wrapped
   * in a faint boundary sphere marking the proton's charge-radius extent.
   * Every part is click-selectable for the properties overlay.
   */
  private buildNucleus(): void {
    const group = new THREE.Group();
    const quarkRadius = 0.045;
    const ringR = 0.075;
    const angles = [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3];
    const kinds: Array<'up' | 'down'> = ['up', 'up', 'down'];
    const colors = { up: 0xff8c33, down: 0x8a4bff };

    this.quarkMeshes = [];
    const positions: THREE.Vector3[] = [];
    kinds.forEach((kind, i) => {
      const a = angles[i];
      const pos = new THREE.Vector3(ringR * Math.cos(a), ringR * Math.sin(a), 0);
      positions.push(pos);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(quarkRadius, 24, 24),
        new THREE.MeshStandardMaterial({ color: colors[kind], emissive: colors[kind], emissiveIntensity: 0.7, roughness: 0.35, metalness: 0.15 })
      );
      mesh.position.copy(pos);
      mesh.userData.info = PARTICLE_INFO[kind];
      group.add(mesh);
      this.quarkMeshes.push(mesh);
    });

    // Gluon flux-tube lines connecting every quark pair (triangle)
    this.gluonLines = [];
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const geometry = new THREE.BufferGeometry().setFromPoints([positions[i], positions[j]]);
        const material = new THREE.LineBasicMaterial({ color: STRONG_COLOR, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
        const line = new THREE.Line(geometry, material);
        group.add(line);
        this.gluonLines.push(line);
      }
    }

    // Faint boundary sphere — the proton's effective (charge-radius) extent
    const boundary = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xff2200, wireframe: true, transparent: true, opacity: 0.12, depthWrite: false })
    );
    boundary.userData.info = PARTICLE_INFO.proton;
    group.add(boundary);
    this.quarkMeshes.push(boundary);

    this.nucleusGroup = group;
    this.scene.add(group);
  }

  /** Full-span coloured X/Y/Z axes drawn on top of everything, with labels. */
  private buildAxes(): void {
    const SPAN = 80;
    const axes = [
      { dir: [1, 0, 0], color: 0xff4455, label: 'X', css: '#ff6677' },
      { dir: [0, 1, 0], color: 0x44ff88, label: 'Y', css: '#66ffaa' },
      { dir: [0, 0, 1], color: 0x4499ff, label: 'Z', css: '#66aaff' },
    ];
    axes.forEach(({ dir, color, label, css }) => {
      const d = new THREE.Vector3(dir[0], dir[1], dir[2]);
      const geometry = new THREE.BufferGeometry().setFromPoints([
        d.clone().multiplyScalar(-SPAN), d.clone().multiplyScalar(SPAN),
      ]);
      const material = new THREE.LineBasicMaterial({
        color, transparent: true, opacity: 0.6, depthTest: false, depthWrite: false,
      });
      const line = new THREE.Line(geometry, material);
      line.renderOrder = 20;
      this.scene.add(line);

      const sprite = this.makeAxisLabel(label, css, dir[0] * 2.4, dir[1] * 2.4, dir[2] * 2.4);
      sprite.renderOrder = 21;
      sprite.material.depthTest = false;
      this.scene.add(sprite);
    });
  }

  private makeAxisLabel(text: string, cssColor: string, x: number, y: number, z: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.font = '700 40px system-ui, sans-serif';
    ctx.fillStyle = cssColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 34);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }));
    sprite.scale.set(0.35, 0.35, 1);
    sprite.position.set(x, y, z);
    return sprite;
  }

  /** Three orientation planes, each faintly tinted toward its perpendicular axis. */
  private buildSpatialGrids(): THREE.Group {
    const group = new THREE.Group();

    const grid = new THREE.GridHelper(16, 16, 0x224466, 0x16263b);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.25;

    const gridXY = new THREE.GridHelper(16, 16, 0x2a5540, 0x16263b);
    gridXY.rotation.x = Math.PI / 2;
    (gridXY.material as THREE.Material).transparent = true;
    (gridXY.material as THREE.Material).opacity = 0.14;

    const gridYZ = new THREE.GridHelper(16, 16, 0x552a3a, 0x16263b);
    gridYZ.rotation.z = Math.PI / 2;
    (gridYZ.material as THREE.Material).transparent = true;
    (gridYZ.material as THREE.Material).opacity = 0.14;

    group.add(grid, gridXY, gridYZ);
    return group;
  }

  private makeStarfield(): THREE.Points {
    const count = 600;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 40 + Math.random() * 60;
      const theta = Math.acos(2 * Math.random() - 1);
      const phi = 2 * Math.PI * Math.random();
      positions[i * 3] = r * Math.sin(theta) * Math.cos(phi);
      positions[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      positions[i * 3 + 2] = r * Math.cos(theta);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0x7fb8ff, size: 0.06, transparent: true, opacity: 0.5, sizeAttenuation: true }));
  }

  /** Soft radial gradient used as the additive sprite for cloud points. */
  private makeGlowTexture(): THREE.Texture {
    if (this.glowTexture) return this.glowTexture;
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    this.glowTexture = new THREE.CanvasTexture(canvas);
    return this.glowTexture;
  }

  // ───────────────────────────────────────────────────────────────────────
  // Per-state rendering
  // ───────────────────────────────────────────────────────────────────────

  private renderElectron(position: [number, number, number], spinState: Particle['spin_state']): void {
    if (this.electronMesh) this.scene.remove(this.electronMesh);
    if (this.electronSpinArrow) this.scene.remove(this.electronSpinArrow);

    const radius = 0.08 * this.settings.particle_scale;
    this.electronMesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 48, 48),
      new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x00aaff, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.15 })
    );
    this.electronMesh.position.set(...position);
    this.electronMesh.userData.info = PARTICLE_INFO.electron;
    this.scene.add(this.electronMesh);

    // Spin vector: ħ/2 along +y ('up') or −y ('down'), from the sampled state.
    const spinUp = spinState !== 'down';
    this.electronSpinArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, spinUp ? 1 : -1, 0),
      this.electronMesh.position,
      0.22, 0xffffff, 0.07, 0.045
    );
    (this.electronSpinArrow.line.material as THREE.LineBasicMaterial).transparent = true;
    (this.electronSpinArrow.line.material as THREE.LineBasicMaterial).opacity = 0.85;
    this.scene.add(this.electronSpinArrow);
  }

  /**
   * Render the electron cloud sampled from the exact |ψ_nlm|² via the shared
   * physics sampler (radial nodes + real-harmonic lobes). Points are coloured
   * from near (deep blue) to far (pale cyan) by radius and drawn as additive
   * glow sprites; point size scales with the orbital's mean radius so the
   * cloud stays visible after the camera zooms out for larger orbitals.
   */
  private renderElectronCloud(n: number, l: number, m: number): void {
    if (this.cloudMesh) { this.scene.remove(this.cloudMesh); this.cloudMesh.geometry.dispose(); }

    const a0 = 0.6;
    const sample = createOrbitalSampler(n, l, m, a0);
    const samples = 1400;

    const points: THREE.Vector3[] = [];
    let maxR = 1e-4;
    for (let i = 0; i < samples; i++) {
      const [x, y, z] = sample();
      const p = new THREE.Vector3(x, y, z);
      points.push(p);
      const r = p.length();
      if (r > maxR) maxR = r;
    }

    const near = new THREE.Color(0x4a8dff);
    const far = new THREE.Color(0xb0fbff);
    const colors: number[] = [];
    points.forEach((p) => {
      const t = Math.min(1, p.length() / maxR);
      const c = near.clone().lerp(far, t);
      colors.push(c.r, c.g, c.b);
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const meanRadius = (a0 / 2) * (3 * n * n - l * (l + 1));
    const cloudPointSize = Math.max(0.07, meanRadius * 0.09);
    this.cloudMesh = new THREE.Points(geometry, new THREE.PointsMaterial({
      size: cloudPointSize,
      map: this.makeGlowTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      sizeAttenuation: true,
      fog: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    }));
    this.scene.add(this.cloudMesh);
  }

  /**
   * Translucent wireframe reference shells at 0.5×, 1×, 1.5× the orbital's mean
   * radius ⟨r⟩ = (a₀/2)[3n² − l(l+1)], so they expand with the n² scaling.
   */
  private renderProbabilityShells(n: number, l: number): void {
    this.shellMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.shellMeshes = [];

    const a0 = 0.6;
    const meanRadius = (a0 / 2) * (3 * n * n - l * (l + 1));
    [0.5, 1.0, 1.5].forEach((f, index) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(0.01, meanRadius * f), 32, 32),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(0.6 + index * 0.1, 0.5, 0.4),
          wireframe: true,
          transparent: true,
          opacity: 0.09,
          depthWrite: false,
        })
      );
      this.scene.add(mesh);
      this.shellMeshes.push(mesh);
    });
  }

  /** Keep the whole orbital in frame; store the fit distance for recenter(). */
  private frameOrbital(n: number, l: number): void {
    const a0 = 0.6;
    const meanRadius = (a0 / 2) * (3 * n * n - l * (l + 1));
    const orbitalExtent = meanRadius * 2.2;
    this.controls.maxDistance = Math.max(20, orbitalExtent * 4);
    this.controls.minDistance = 0.5;

    const fitDistance = orbitalExtent / Math.tan((this.camera.fov * Math.PI) / 180 / 2) + 1.5;
    this.fitDistance = fitDistance;

    const currentDistance = this.camera.position.distanceTo(this.controls.target);
    if (currentDistance < fitDistance) {
      const dir = this.camera.position.clone().sub(this.controls.target).normalize();
      this.camera.position.copy(dir.multiplyScalar(fitDistance).add(this.controls.target));
      this.controls.update();
    }
  }

  /** Apply the current visibility flags to every toggleable object. */
  private applyVisibility(): void {
    const v = this.visibility;
    if (this.nucleusGroup) this.nucleusGroup.visible = v.nucleus;
    this.gluonLines.forEach(line => { line.visible = v.nucleus && v.gluons; });
    if (this.electronMesh) this.electronMesh.visible = v.electron;
    if (this.electronSpinArrow) this.electronSpinArrow.visible = v.electron && v.spin;
    if (this.cloudMesh) this.cloudMesh.visible = v.cloud;
    this.shellMeshes.forEach(mesh => { mesh.visible = v.shells; });
  }

  // ───────────────────────────────────────────────────────────────────────
  // Interaction / resize
  // ───────────────────────────────────────────────────────────────────────

  private onCanvasClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const targets = [this.electronMesh, ...this.quarkMeshes].filter((o): o is THREE.Object3D => !!o && o.visible);
    const hits = this.raycaster.intersectObjects(targets, false);
    const info = (hits.length ? (hits[0].object.userData.info as ParticleInfo) : null) || null;
    if (this.onParticleSelectCb) this.onParticleSelectCb(info);
  }

  private onWindowResize(): void {
    const parent = this.renderer.domElement.parentElement;
    const width = parent?.clientWidth || window.innerWidth;
    const height = parent?.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }
}
