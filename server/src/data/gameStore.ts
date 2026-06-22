import type { Game } from '../types/game.js';
import { getGames, saveGames } from '../db/jsonStore.js';

const gamesStore = new Map<string, Game>(getGames().map((game) => [game.id, game]));

function persist(): void {
  saveGames(Array.from(gamesStore.values()));
}

export function createGame(game: Game): Game {
  gamesStore.set(game.id, game);
  persist();
  return game;
}

export function getGame(id: string): Game | null {
  return gamesStore.get(id) ?? null;
}

export function updateGame(id: string, game: Game): Game {
  gamesStore.set(id, game);
  persist();
  return game;
}

export function getUserGames(userId: string): Game[] {
  return Array.from(gamesStore.values()).filter(
    g => g.players.some(p => p.userId === userId)
  );
}

export function getAllGames(): Game[] {
  return Array.from(gamesStore.values());
}

export function clearAll(): void {
  gamesStore.clear();
  persist();
}
