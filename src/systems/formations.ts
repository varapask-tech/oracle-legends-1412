import type { GameState } from "../shared/types";

export interface Formation {
  id: number;
  name: string;
  team: string[];
}

const MAX_FORMATIONS = 5;
const STORAGE_KEY = "oracle-legends-formations";

export function createDefaultFormation(team: string[]): Formation {
  return { id: 1, name: "Team 1", team: team.slice(0, 5) };
}

export function loadFormations(): Formation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Formation[];
  } catch {
    return [];
  }
}

export function saveFormations(formations: Formation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(formations));
}

export function saveCurrentAsFormation(
  name: string,
  team: string[],
  formations: Formation[],
): Formation[] {
  if (formations.length >= MAX_FORMATIONS) {
    formations.pop();
  }

  const id = formations.length > 0
    ? Math.max(...formations.map((f) => f.id)) + 1
    : 1;

  const formation: Formation = { id, name, team: team.slice(0, 5) };
  const updated = [formation, ...formations];
  saveFormations(updated);
  return updated;
}

export function deleteFormation(id: number, formations: Formation[]): Formation[] {
  const updated = formations.filter((f) => f.id !== id);
  saveFormations(updated);
  return updated;
}

export function renameFormation(
  id: number,
  name: string,
  formations: Formation[],
): Formation[] {
  const formation = formations.find((f) => f.id === id);
  if (formation) formation.name = name;
  saveFormations(formations);
  return formations;
}

export { MAX_FORMATIONS };
