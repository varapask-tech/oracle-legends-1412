import type { HeroInstance, Rarity } from "../shared/types";
import { getHeroById } from "../shared/heroes";
import { GameStateManager, type ActionResult } from "./game-state";

const SHARD_YIELD: Record<Rarity, number> = {
  common: 5,
  uncommon: 10,
  rare: 25,
  epic: 80,
  legendary: 200,
};

export interface ShardShopItem {
  id: string;
  name: string;
  description: string;
  shardCost: number;
  type: "summon-ticket" | "gold-pack" | "crystal-pack" | "hero-selector";
  value: number;
}

export const SHARD_SHOP: ShardShopItem[] = [
  { id: "ticket-1", name: "Summon Ticket", description: "Free single pull", shardCost: 50, type: "summon-ticket", value: 1 },
  { id: "gold-5k", name: "Gold Pack (5K)", description: "5,000 Gold", shardCost: 30, type: "gold-pack", value: 5000 },
  { id: "crystal-50", name: "Crystal Pack (50)", description: "50 Crystals", shardCost: 100, type: "crystal-pack", value: 50 },
  { id: "hero-rare", name: "Rare Hero Selector", description: "Choose any rare hero", shardCost: 200, type: "hero-selector", value: 0 },
  { id: "hero-epic", name: "Epic Hero Selector", description: "Choose any epic hero", shardCost: 500, type: "hero-selector", value: 0 },
];

export function shardValueForHero(hero: HeroInstance): number {
  const template = getHeroById(hero.templateId);
  if (!template) return 5;
  const base = SHARD_YIELD[template.rarity] ?? 5;
  return base + (hero.level - 1) * 2;
}

export function dismantleHero(
  heroInstanceId: string,
  gsm: GameStateManager,
): ActionResult & { shardsGained?: number } {
  const hero = gsm.findHero(heroInstanceId);
  if (!hero) return { ok: false, reason: "Hero not found" };

  if (gsm.current.team.includes(heroInstanceId)) {
    return { ok: false, reason: "Cannot dismantle a hero in your team" };
  }

  const shardsGained = shardValueForHero(hero);

  const state = gsm.current as any;
  state.heroes = state.heroes.filter(
    (h: HeroInstance) => h.instanceId !== heroInstanceId,
  );

  if (!state.shards) state.shards = 0;
  state.shards += shardsGained;

  return { ok: true, shardsGained };
}

export function buyShardShopItem(
  itemId: string,
  gsm: GameStateManager,
): ActionResult {
  const item = SHARD_SHOP.find((i) => i.id === itemId);
  if (!item) return { ok: false, reason: "Item not found" };

  const state = gsm.current as any;
  const currentShards = state.shards ?? 0;
  if (currentShards < item.shardCost) {
    return { ok: false, reason: `Need ${item.shardCost} shards (have ${currentShards})` };
  }

  state.shards = currentShards - item.shardCost;

  switch (item.type) {
    case "gold-pack":
      gsm.addGold(item.value);
      break;
    case "crystal-pack":
      gsm.addCrystals(item.value);
      break;
    case "summon-ticket":
      if (!state.summonTickets) state.summonTickets = 0;
      state.summonTickets += item.value;
      break;
  }

  return { ok: true };
}
