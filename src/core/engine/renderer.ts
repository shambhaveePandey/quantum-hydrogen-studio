/**
 * 3D Visualization Engine using Three.js
 * Renders particle systems, orbitals, and force fields with interactive 3D controls
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Particle, VisualizationSettings, ForceType, HydrogenAtomConfiguration } from '../../types/particle';

export class VisualizationEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private particleMeshes: Map<string, THREE.Mesh> = new Map();
  private orbitMesh: THREE.Line | null = null;
  private fieldVisualization: THREE.Object3D | null = null;
  private settings: VisualizationSettings;
  private animationId: number | null = null;
  
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

    // OrbitControls — mouse/touch orbit, zoom, pan
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 20;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    // Handle window resize; also schedule one frame-deferred resize in case
    // flex layout hasn't settled yet when the constructor ran
    window.addEventListener('resize', () => this.onWindowResize());
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
   * Render electron orbital cloud (ground state 1s)
   */
  private renderElectronCloud(hydrogenConfig: HydrogenAtomConfiguration): void {
    if (this.orbitMesh) this.scene.remove(this.orbitMesh);
    
    const points: THREE.Vector3[] = [];
    const a0 = 0.5; // Bohr radius in Ångströms (scaled for visualization)
    const samples = 1000;
    
    for (let i = 0; i < samples; i++) {
      const theta = Math.acos(2 * Math.random() - 1);
      const phi = 2 * Math.PI * Math.random();
      const r = a0 * (-Math.log(Math.random())); // Exponential distribution
      
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
      opacity: 0.5,
      sizeAttenuation: true,
    });
    
    const pointsMesh = new THREE.Points(geometry, material);
    this.orbitMesh = pointsMesh as any;
    this.scene.add(pointsMesh);
  }
  
  /**
   * Render probability density isosurface
   */
  private renderProbabilityDensity(hydrogenConfig: HydrogenAtomConfiguration): void {
    // Simplified visualization: concentric spheres representing probability shells
    const shells = [0.5, 1.0, 1.5]; // Bohr radii
    
    shells.forEach((r, index) => {
      const geometry = new THREE.SphereGeometry(r, 32, 32);
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(0.6 + index * 0.1, 0.7, 0.5),
        wireframe: true,
        transparent: true,
        opacity: 0.2,
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      this.scene.add(mesh);
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
    this.controls.update(); // required for inertia/damping
    this.renderer.render(this.scene, this.camera);
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
   * Cleanup
   */
  public dispose(): void {
    this.stop();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
