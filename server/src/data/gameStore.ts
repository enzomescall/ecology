import type { Game } from '../types/game.js';

const gamesStore = new Map<string, Game>();

export function createGame(game: Game): Game {
  gamesStore.set(game.id, game);
  return game;
}

export function getGame(id: string): Game | null {
  return gamesStore.get(id) ?? null;
}

export function updateGame(id: string, game: Game): Game {
  gamesStore.set(id, game);
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
}
