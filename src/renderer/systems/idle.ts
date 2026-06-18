import type { IdleReward, GameState } from "../../shared/types";

const BASE_GOLD_PER_SEC = 1;
const BASE_EXP_PER_SEC = 0.5;
const STAGE_GOLD_MULTIPLIER = 0.15;
const STAGE_EXP_MULTIPLIER = 0.1;
const MAX_OFFLINE_HOURS = 12;
const MAX_OFFLINE_SECONDS = MAX_OFFLINE_HOURS * 3600;

function parseStageProgress(stageId: string): number {
  const parts = stageId.split("-");
  const chapter = parseInt(parts[0] ?? "1", 10);
  const stage = parseInt(parts[1] ?? "1", 10);
  return (chapter - 1) * 10 + stage;
}

export function calculateIdleRewards(
  currentStage: string,
  elapsedSeconds: number,
  teamSize: number,
): IdleReward {
  const capped = Math.min(Math.max(0, elapsedSeconds), MAX_OFFLINE_SECONDS);
  const stageProgress = parseStageProgress(currentStage);
  const teamBonus = 1 + (teamSize - 1) * 0.05;

  const goldPerSec = (BASE_GOLD_PER_SEC + stageProgress * STAGE_GOLD_MULTIPLIER) * teamBonus;
  const expPerSec = (BASE_EXP_PER_SEC + stageProgress * STAGE_EXP_MULTIPLIER) * teamBonus;

  return {
    gold: Math.floor(goldPerSec * capped),
    exp: Math.floor(expPerSec * capped),
    elapsedSeconds: capped,
  };
}

export function calculateOfflineRewards(state: GameState): IdleReward {
  const now = Date.now();
  const elapsed = Math.floor((now - state.lastOnlineAt) / 1000);
  if (elapsed <= 0) return { gold: 0, exp: 0, elapsedSeconds: 0 };
  return calculateIdleRewards(state.currentStage, elapsed, state.team.length);
}

export function formatIdleTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export const IDLE_CONFIG = {
  baseGoldPerSec: BASE_GOLD_PER_SEC,
  baseExpPerSec: BASE_EXP_PER_SEC,
  stageGoldMultiplier: STAGE_GOLD_MULTIPLIER,
  stageExpMultiplier: STAGE_EXP_MULTIPLIER,
  maxOfflineHours: MAX_OFFLINE_HOURS,
} as const;
