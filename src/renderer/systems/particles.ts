import * as THREE from "three";

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  fadeOut: boolean;
  scale: number;
}

type Preset = "crit" | "summon" | "levelup" | "victory" | "heal";

const PRESETS: Record<Preset, { count: number; color: number; speed: number; life: number; size: number; spread: number }> = {
  crit:    { count: 12, color: 0xffd700, speed: 3,   life: 0.6, size: 0.08, spread: 1.5 },
  summon:  { count: 30, color: 0xaa66ff, speed: 2,   life: 1.2, size: 0.12, spread: 2 },
  levelup: { count: 20, color: 0x00ff88, speed: 2.5, life: 0.8, size: 0.06, spread: 1 },
  victory: { count: 40, color: 0xffd700, speed: 4,   life: 1.5, size: 0.1,  spread: 3 },
  heal:    { count: 8,  color: 0x44ff88, speed: 1,   life: 1.0, size: 0.06, spread: 0.5 },
};

const _geometry = new THREE.SphereGeometry(1, 6, 6);

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private _enabled = true;
  private _reducedEffects = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  get enabled() { return this._enabled; }
  set enabled(v: boolean) { this._enabled = v; }

  get reducedEffects() { return this._reducedEffects; }
  set reducedEffects(v: boolean) { this._reducedEffects = v; }

  emit(preset: Preset, position: THREE.Vector3) {
    if (!this._enabled) return;

    const cfg = PRESETS[preset];
    const count = this._reducedEffects ? Math.ceil(cfg.count / 3) : cfg.count;

    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(_geometry, material);
      mesh.scale.setScalar(cfg.size);
      mesh.position.copy(position);

      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.3) * Math.PI;
      const speed = cfg.speed * (0.5 + Math.random() * 0.5);
      const velocity = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation) * speed,
        Math.sin(elevation) * speed + 1,
        Math.sin(angle) * Math.cos(elevation) * speed,
      );

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity,
        life: cfg.life,
        maxLife: cfg.life,
        fadeOut: true,
        scale: cfg.size,
      });
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.MeshBasicMaterial).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
      p.velocity.y -= 2 * dt;

      if (p.fadeOut) {
        const t = p.life / p.maxLife;
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = t;
        p.mesh.scale.setScalar(p.scale * (0.5 + 0.5 * t));
      }
    }
  }

  clear() {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      (p.mesh.material as THREE.MeshBasicMaterial).dispose();
    }
    this.particles.length = 0;
  }

  get activeCount() { return this.particles.length; }

  dispose() {
    this.clear();
    _geometry.dispose();
  }
}
