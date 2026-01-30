/**
 * MOCK DATA STORE - In-memory game state persistence layer
 * 
 * ⚠️  IMPORTANT: This is the ONLY file that changes when migrating to a real DB.
 * Function signatures stay identical; implementation swaps Map → SQL.
 */

import type { Game, GameMove } from '../types/game.js';
import { v4 as uuidv4 } from 'uuid';

const gamesStore = new Map<string, Game>();
const movesStore = new Map<string, GameMove[]>();

export function createGame(game: Game): Game {
  gamesStore.set(game.id, game);
  movesStore.set(game.id, []);
  return game;
}

export function getGameById(gameId: string): Game | null {
  return gamesStore.get(gameId) || null;
}

export function listGamesForUser(userId: string): Game[] {
  const games = Array.from(gamesStore.values());
  return games.filter(
    game => game.hostUserId === userId || game.players.some(p => p.userId === userId)
  );
}

export function updateGame(game: Game): Game {
  gamesStore.set(game.id, game);
  return game;
}

export function recordMove(move: GameMove): GameMove {
  if (!movesStore.has(move.gameId)) {
    movesStore.set(move.gameId, []);
  }
  movesStore.get(move.gameId)!.push(move);
  return move;
}

export function getGameMoves(gameId: string): GameMove[] {
  return movesStore.get(gameId) || [];
}

export function getAllGames(): Game[] {
  return Array.from(gamesStore.values());
}

export function clearAllData(): void {
  gamesStore.clear();
  movesStore.clear();
}
