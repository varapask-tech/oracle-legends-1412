import type { GameState } from "../shared/types";
import { createInitialState, GameStateManager } from "./game-state";
import { calculateOfflineRewards } from "../renderer/systems/idle";

const SAVE_KEY = "oracle-legends-1412-save";
const SAVE_VERSION = 2;
const AUTO_SAVE_MS = 30_000;

interface SaveData {
  version: number;
  state: GameState;
  savedAt: number;
}

export function saveGame(gsm: GameStateManager): void {
  gsm.updateLastOnline();
  const data: SaveData = {
    version: SAVE_VERSION,
    state: gsm.toJSON(),
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // storage full — silently fail
  }
}

export function loadGame(): GameState | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SaveData;
    if (data.version && data.state) {
      return data.state;
    }
    return data as unknown as GameState;
  } catch {
    return null;
  }
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export interface OfflineRewards {
  gold: number;
  exp: number;
  elapsedSeconds: number;
}

export function checkOfflineRewards(state: GameState): OfflineRewards | null {
  const rewards = calculateOfflineRewards(state);
  if (rewards.elapsedSeconds < 60) return null;
  return rewards;
}

export class SaveManager {
  private gsm: GameStateManager;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private unloadHandler: (() => void) | null = null;

  constructor(gsm: GameStateManager) {
    this.gsm = gsm;
  }

  start() {
    this.intervalId = setInterval(() => saveGame(this.gsm), AUTO_SAVE_MS);

    this.unloadHandler = () => saveGame(this.gsm);
    window.addEventListener("beforeunload", this.unloadHandler);

    this.gsm.onChange(() => {
      // debounced save on state change not needed — auto-save covers it
    });
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.unloadHandler) {
      window.removeEventListener("beforeunload", this.unloadHandler);
      this.unloadHandler = null;
    }
  }

  saveNow() {
    saveGame(this.gsm);
  }
}

export function initGame(): {
  gsm: GameStateManager;
  isNewGame: boolean;
  offlineRewards: OfflineRewards | null;
} {
  const saved = loadGame();
  const isNewGame = !saved;
  const state = saved ?? createInitialState();

  const offlineRewards = saved ? checkOfflineRewards(state) : null;

  const gsm = new GameStateManager(state);
  return { gsm, isNewGame, offlineRewards };
}
