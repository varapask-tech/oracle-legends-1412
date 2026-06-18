import * as THREE from "three";
import type { HeroTemplate } from "../../shared/types";
import { createBattleState, executeTurn, spawnNextWave, type BattleState } from "../systems/battle";
import { BattleRenderer } from "../systems/battle-renderer";

export interface WaveConfig {
  templates: HeroTemplate[];
  levels: number[];
}

export interface BattleSceneConfig {
  heroTemplates: HeroTemplate[];
  heroLevels: number[];
  waves: WaveConfig[];
  autoSpeed: number;
  onBattleEnd?: (result: "won" | "lost") => void;
}

export class BattleScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private battleRenderer: BattleRenderer;
  private battleState: BattleState | null = null;
  private config: BattleSceneConfig | null = null;
  private turnTimer = 0;
  private paused = false;
  private autoSpeed = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60, canvas.width / canvas.height, 0.1, 1000,
    );
    this.camera.position.set(0, 8, 12);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.width, canvas.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x0a0a2e);

    const ambient = new THREE.AmbientLight(0x404080, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffd700, 1.2);
    sun.position.set(5, 10, 5);
    this.scene.add(sun);

    this.createGround();
    this.battleRenderer = new BattleRenderer(this.scene);
  }

  private createGround(): void {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 14),
      new THREE.MeshStandardMaterial({ color: 0x2a4a2a }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    this.scene.add(ground);

    const grid = new THREE.GridHelper(20, 20, 0x3a5a3a, 0x1a3a1a);
    grid.position.y = -0.49;
    this.scene.add(grid);
  }

  startBattle(config: BattleSceneConfig): void {
    this.config = config;
    this.autoSpeed = config.autoSpeed;

    const firstWave = config.waves[0];
    this.battleState = createBattleState(
      config.heroTemplates,
      config.heroLevels,
      firstWave.templates,
      firstWave.levels,
      config.waves.length,
    );

    this.battleRenderer.createUnits(
      this.battleState.heroes,
      this.battleState.enemies,
    );
    this.turnTimer = 0;
    this.paused = false;
  }

  setAutoSpeed(speed: number): void {
    this.autoSpeed = Math.max(0.5, Math.min(4, speed));
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  getState(): BattleState | null {
    return this.battleState;
  }

  update(dt: number): void {
    this.battleRenderer.update(dt);

    if (!this.battleState || this.paused) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.battleState.status === "wave_clear") {
      this.handleWaveClear();
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.battleState.status === "won" || this.battleState.status === "lost") {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const turnInterval = 1.0 / this.autoSpeed;
    this.turnTimer += dt;

    if (this.turnTimer >= turnInterval) {
      this.turnTimer -= turnInterval;
      const action = executeTurn(this.battleState);
      if (action) {
        this.battleRenderer.queueAction(action);
      }

      const s = this.battleState.status as string;
      if (s === "won" || s === "lost") {
        const result = s as "won" | "lost";
        setTimeout(() => this.config?.onBattleEnd?.(result), 1500);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  private handleWaveClear(): void {
    if (!this.battleState || !this.config) return;
    const nextWaveIdx = this.battleState.wave;
    if (nextWaveIdx >= this.config.waves.length) return;

    const nextWave = this.config.waves[nextWaveIdx];
    spawnNextWave(this.battleState, nextWave.templates, nextWave.levels);
    this.battleRenderer.replaceEnemies(this.battleState.enemies);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  destroy(): void {
    this.battleRenderer.clear();
    this.battleState = null;
  }
}
