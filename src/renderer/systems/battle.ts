import type { HeroTemplate, HeroStats, SkillTemplate } from "../../shared/types";

export interface BattleUnit {
  id: string;
  name: string;
  team: "hero" | "enemy";
  template: HeroTemplate;
  level: number;
  stats: HeroStats;
  currentHp: number;
  maxHp: number;
  skillCooldowns: Map<string, number>;
  alive: boolean;
}

export interface BattleAction {
  attacker: BattleUnit;
  target: BattleUnit;
  damage: number;
  isCrit: boolean;
  skill: SkillTemplate | null;
  isAoe: boolean;
  aoeTargets?: Array<{ target: BattleUnit; damage: number; isCrit: boolean }>;
}

export interface BattleState {
  heroes: BattleUnit[];
  enemies: BattleUnit[];
  turnOrder: BattleUnit[];
  currentTurn: number;
  wave: number;
  totalWaves: number;
  status: "fighting" | "won" | "lost" | "wave_clear";
  actionLog: BattleAction[];
}

function computeStats(template: HeroTemplate, level: number): HeroStats {
  const b = template.baseStats;
  const g = template.growthPerLevel;
  const l = level - 1;
  return {
    hp: Math.round(b.hp + g.hp * l),
    atk: Math.round(b.atk + g.atk * l),
    def: Math.round(b.def + g.def * l),
    spd: Math.round(b.spd + g.spd * l),
    critRate: Math.min(1, b.critRate + g.critRate * l),
    critDmg: b.critDmg + g.critDmg * l,
  };
}

function createUnit(
  template: HeroTemplate,
  level: number,
  team: "hero" | "enemy",
  idSuffix?: string,
): BattleUnit {
  const stats = computeStats(template, level);
  return {
    id: `${template.id}${idSuffix ? `-${idSuffix}` : ""}`,
    name: template.name,
    team,
    template,
    level,
    stats,
    currentHp: stats.hp,
    maxHp: stats.hp,
    skillCooldowns: new Map(template.skills.map((s) => [s.id, 0])),
    alive: true,
  };
}

function calcDamage(
  attacker: BattleUnit,
  defender: BattleUnit,
  multiplier: number,
): { damage: number; isCrit: boolean } {
  const base = Math.max(1, attacker.stats.atk * multiplier - defender.stats.def);
  const variance = 0.9 + Math.random() * 0.2;
  const isCrit = Math.random() < attacker.stats.critRate;
  const critMul = isCrit ? attacker.stats.critDmg : 1.0;
  return { damage: Math.round(base * variance * critMul), isCrit };
}

function pickTarget(allies: BattleUnit[], enemies: BattleUnit[]): BattleUnit | null {
  const alive = enemies.filter((e) => e.alive);
  if (alive.length === 0) return null;
  return alive[Math.floor(Math.random() * alive.length)];
}

function getAvailableSkill(unit: BattleUnit): SkillTemplate | null {
  for (const skill of unit.template.skills) {
    const cd = unit.skillCooldowns.get(skill.id) ?? 0;
    if (cd <= 0) return skill;
  }
  return null;
}

function tickCooldowns(unit: BattleUnit): void {
  unit.skillCooldowns.forEach((cd, id) => {
    if (cd > 0) unit.skillCooldowns.set(id, cd - 1);
  });
}

function applyDamage(target: BattleUnit, damage: number): void {
  target.currentHp = Math.max(0, target.currentHp - damage);
  if (target.currentHp <= 0) target.alive = false;
}

export function createBattleState(
  heroTemplates: HeroTemplate[],
  heroLevels: number[],
  enemyTemplates: HeroTemplate[],
  enemyLevels: number[],
  totalWaves: number,
): BattleState {
  const heroes = heroTemplates.map((t, i) =>
    createUnit(t, heroLevels[i] ?? 1, "hero"),
  );
  const enemies = enemyTemplates.map((t, i) =>
    createUnit(t, enemyLevels[i] ?? 1, "enemy", `w1-${i}`),
  );

  const allUnits = [...heroes, ...enemies];
  const turnOrder = allUnits.sort((a, b) => b.stats.spd - a.stats.spd);

  return {
    heroes,
    enemies,
    turnOrder,
    currentTurn: 0,
    wave: 1,
    totalWaves,
    status: "fighting",
    actionLog: [],
  };
}

export function executeTurn(state: BattleState): BattleAction | null {
  if (state.status !== "fighting") return null;

  let unit = state.turnOrder[state.currentTurn % state.turnOrder.length];
  let safety = 0;
  while (!unit.alive && safety < state.turnOrder.length) {
    state.currentTurn++;
    unit = state.turnOrder[state.currentTurn % state.turnOrder.length];
    safety++;
  }
  if (!unit.alive) return null;

  tickCooldowns(unit);

  const isHero = unit.team === "hero";
  const friendlies = isHero ? state.heroes : state.enemies;
  const foes = isHero ? state.enemies : state.heroes;

  const skill = getAvailableSkill(unit);
  const multiplier = skill?.damageMultiplier ?? 1.0;

  let action: BattleAction;

  if (skill && skill.targetType === "aoe") {
    const aoeTargets = foes.filter((f) => f.alive).map((target) => {
      const { damage, isCrit } = calcDamage(unit, target, multiplier);
      applyDamage(target, damage);
      return { target, damage, isCrit };
    });
    unit.skillCooldowns.set(skill.id, skill.cooldown);
    action = {
      attacker: unit,
      target: aoeTargets[0]?.target ?? foes[0],
      damage: aoeTargets.reduce((s, t) => s + t.damage, 0),
      isCrit: aoeTargets.some((t) => t.isCrit),
      skill,
      isAoe: true,
      aoeTargets,
    };
  } else {
    const target = pickTarget(friendlies, foes);
    if (!target) return null;
    const { damage, isCrit } = calcDamage(unit, target, multiplier);
    applyDamage(target, damage);
    if (skill) unit.skillCooldowns.set(skill.id, skill.cooldown);
    action = { attacker: unit, target, damage, isCrit, skill, isAoe: false };
  }

  state.actionLog.push(action);
  state.currentTurn++;

  if (foes.every((f) => !f.alive)) {
    state.status = state.wave >= state.totalWaves ? "won" : "wave_clear";
  } else if (friendlies.every((f) => !f.alive)) {
    state.status = "lost";
  }

  return action;
}

export function spawnNextWave(
  state: BattleState,
  enemyTemplates: HeroTemplate[],
  enemyLevels: number[],
): void {
  state.wave++;
  state.enemies = enemyTemplates.map((t, i) =>
    createUnit(t, enemyLevels[i] ?? 1, "enemy", `w${state.wave}-${i}`),
  );
  const allAlive = [...state.heroes.filter((h) => h.alive), ...state.enemies];
  state.turnOrder = allAlive.sort((a, b) => b.stats.spd - a.stats.spd);
  state.currentTurn = 0;
  state.status = "fighting";
}
