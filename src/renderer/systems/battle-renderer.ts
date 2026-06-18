import * as THREE from "three";
import type { BattleUnit, BattleAction } from "./battle";

interface UnitVisual {
  group: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  hpBar: THREE.Mesh;
  hpBarBg: THREE.Mesh;
  basePos: THREE.Vector3;
  unit: BattleUnit;
}

interface DamageText {
  mesh: THREE.Sprite;
  velocity: number;
  life: number;
}

const HERO_POSITIONS = [
  new THREE.Vector3(-3, 0, -2),
  new THREE.Vector3(-4, 0, 0),
  new THREE.Vector3(-3, 0, 2),
  new THREE.Vector3(-5, 0, -1),
  new THREE.Vector3(-5, 0, 1),
];

const ENEMY_POSITIONS = [
  new THREE.Vector3(3, 0, -1.5),
  new THREE.Vector3(4, 0, 0.5),
  new THREE.Vector3(3, 0, 2),
];

export class BattleRenderer {
  private scene: THREE.Scene;
  private heroVisuals: Map<string, UnitVisual> = new Map();
  private enemyVisuals: Map<string, UnitVisual> = new Map();
  private damageTexts: DamageText[] = [];
  private animationQueue: Array<() => Promise<void>> = [];
  private isAnimating = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  createUnits(heroes: BattleUnit[], enemies: BattleUnit[]): void {
    this.clear();
    heroes.forEach((unit, i) => {
      const pos = HERO_POSITIONS[i % HERO_POSITIONS.length];
      const visual = this.createUnitVisual(unit, pos);
      this.heroVisuals.set(unit.id, visual);
    });
    enemies.forEach((unit, i) => {
      const pos = ENEMY_POSITIONS[i % ENEMY_POSITIONS.length];
      const visual = this.createUnitVisual(unit, pos);
      visual.group.rotation.y = Math.PI;
      this.enemyVisuals.set(unit.id, visual);
    });
  }

  private createUnitVisual(unit: BattleUnit, pos: THREE.Vector3): UnitVisual {
    const group = new THREE.Group();
    const height = 0.7 + (unit.template.heroClass === "tank" ? 0.3 : unit.template.heroClass === "mage" ? 0 : 0.1);

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.3, height, 4, 8),
      new THREE.MeshStandardMaterial({ color: unit.template.modelColor }),
    );
    body.position.y = height / 2 + 0.3;
    group.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffcc99 }),
    );
    head.position.y = height + 0.6;
    group.add(head);

    const hpBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x333333 }),
    );
    hpBarBg.position.y = height + 1.0;
    group.add(hpBarBg);

    const hpBar = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.08),
      new THREE.MeshBasicMaterial({ color: unit.team === "hero" ? 0x44ff44 : 0xff4444 }),
    );
    hpBar.position.y = height + 1.0;
    hpBar.position.z = 0.001;
    group.add(hpBar);

    group.position.copy(pos);
    this.scene.add(group);

    return { group, body, head, hpBar, hpBarBg, basePos: pos.clone(), unit };
  }

  queueAction(action: BattleAction): void {
    this.animationQueue.push(() => this.animateAction(action));
    if (!this.isAnimating) this.processQueue();
  }

  private async processQueue(): Promise<void> {
    this.isAnimating = true;
    while (this.animationQueue.length > 0) {
      const next = this.animationQueue.shift()!;
      await next();
    }
    this.isAnimating = false;
  }

  private getVisual(unit: BattleUnit): UnitVisual | undefined {
    return this.heroVisuals.get(unit.id) ?? this.enemyVisuals.get(unit.id);
  }

  private async animateAction(action: BattleAction): Promise<void> {
    const attackerVisual = this.getVisual(action.attacker);
    const targetVisual = this.getVisual(action.target);
    if (!attackerVisual || !targetVisual) return;

    const attackPos = targetVisual.basePos.clone().lerp(attackerVisual.basePos, 0.3);
    await this.tweenPosition(attackerVisual.group, attackPos, 200);
    await this.wait(100);

    if (action.isAoe && action.aoeTargets) {
      for (const aoe of action.aoeTargets) {
        const tv = this.getVisual(aoe.target);
        if (tv) {
          this.showDamage(tv, aoe.damage, aoe.isCrit);
          this.updateHpBar(tv);
          this.flashUnit(tv);
          if (!aoe.target.alive) this.fadeOutUnit(tv);
        }
      }
    } else {
      this.showDamage(targetVisual, action.damage, action.isCrit);
      this.updateHpBar(targetVisual);
      this.flashUnit(targetVisual);
      if (!action.target.alive) this.fadeOutUnit(targetVisual);
    }

    await this.wait(200);
    await this.tweenPosition(attackerVisual.group, attackerVisual.basePos, 200);
    await this.wait(100);
  }

  private showDamage(visual: UnitVisual, damage: number, isCrit: boolean): void {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.font = isCrit ? "bold 40px Arial" : "bold 32px Arial";
    ctx.fillStyle = isCrit ? "#ffdd00" : "#ffffff";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    const text = `${isCrit ? "CRIT " : ""}${damage}`;
    ctx.strokeText(text, 10, 45);
    ctx.fillText(text, 10, 45);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.2, 0.6, 1);
    sprite.position.copy(visual.group.position);
    sprite.position.y += 1.8;
    sprite.position.x += (Math.random() - 0.5) * 0.4;
    this.scene.add(sprite);

    this.damageTexts.push({ mesh: sprite, velocity: 0.02, life: 1.0 });
  }

  private updateHpBar(visual: UnitVisual): void {
    const ratio = Math.max(0, visual.unit.currentHp / visual.unit.maxHp);
    visual.hpBar.scale.x = ratio;
    visual.hpBar.position.x = -(1 - ratio) * 0.4 * 0.5;

    const mat = visual.hpBar.material as THREE.MeshBasicMaterial;
    if (ratio > 0.5) mat.color.setHex(visual.unit.team === "hero" ? 0x44ff44 : 0xff4444);
    else if (ratio > 0.25) mat.color.setHex(0xffaa00);
    else mat.color.setHex(0xff0000);
  }

  private flashUnit(visual: UnitVisual): void {
    const mat = visual.body.material as THREE.MeshStandardMaterial;
    const originalColor = mat.color.clone();
    mat.color.setHex(0xffffff);
    setTimeout(() => mat.color.copy(originalColor), 150);
  }

  private fadeOutUnit(visual: UnitVisual): void {
    const duration = 500;
    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / duration);
      visual.group.scale.setScalar(1 - t * 0.7);
      visual.group.position.y = visual.basePos.y - t * 0.5;
      if (t < 1) requestAnimationFrame(tick);
      else visual.group.visible = false;
    };
    requestAnimationFrame(tick);
  }

  private tweenPosition(obj: THREE.Object3D, target: THREE.Vector3, durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      const start = obj.position.clone();
      const startTime = performance.now();
      const tick = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(1, elapsed / durationMs);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        obj.position.lerpVectors(start, target, ease);
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  update(_dt: number): void {
    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const dt = this.damageTexts[i];
      dt.mesh.position.y += dt.velocity;
      dt.life -= 0.02;
      (dt.mesh.material as THREE.SpriteMaterial).opacity = Math.max(0, dt.life);
      if (dt.life <= 0) {
        this.scene.remove(dt.mesh);
        dt.mesh.material.dispose();
        this.damageTexts.splice(i, 1);
      }
    }
  }

  replaceEnemies(enemies: BattleUnit[]): void {
    this.enemyVisuals.forEach((visual) => {
      this.scene.remove(visual.group);
    });
    this.enemyVisuals.clear();
    enemies.forEach((unit, i) => {
      const pos = ENEMY_POSITIONS[i % ENEMY_POSITIONS.length];
      const visual = this.createUnitVisual(unit, pos);
      visual.group.rotation.y = Math.PI;
      this.enemyVisuals.set(unit.id, visual);
    });
  }

  clear(): void {
    this.heroVisuals.forEach((v) => this.scene.remove(v.group));
    this.enemyVisuals.forEach((v) => this.scene.remove(v.group));
    for (const dt of this.damageTexts) {
      this.scene.remove(dt.mesh);
      dt.mesh.material.dispose();
    }
    this.heroVisuals.clear();
    this.enemyVisuals.clear();
    this.damageTexts = [];
    this.animationQueue = [];
  }
}
