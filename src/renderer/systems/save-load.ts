import type { GameState } from "../../shared/types";
import { createInitialState, GameStateManager } from "./game-state";

const SAVE_KEY = "oracle-legends-1412-save";
const AUTO_SAVE_INTERVAL_MS = 30_000;

export function saveGame(state: GameState): void {
  const data = JSON.stringify(state);
  localStorage.setItem(SAVE_KEY, data);
}

export function loadGame(): GameState | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameState;
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

export function initGameState(): GameStateManager {
  const saved = loadGame();
  const state = saved ?? createInitialState();
  return new GameStateManager(state);
}

export class AutoSaver {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private manager: GameStateManager;

  constructor(manager: GameStateManager) {
    this.manager = manager;
  }

  start() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.manager.updateLastOnline();
      saveGame(this.manager.current as GameState);
    }, AUTO_SAVE_INTERVAL_MS);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  saveNow() {
    this.manager.updateLastOnline();
    saveGame(this.manager.current as GameState);
  }
}
