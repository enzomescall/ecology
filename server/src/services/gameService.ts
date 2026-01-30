/**
 * GAME SERVICE - Core turn-based game logic
 * 
 * Contains NO database calls; all data goes through gameStore.
 * Pure business logic: validation, turn progression, rules.
 */

import type { Game, GamePlayer, GameMove, TurnState } from '../types/game.js';
import * as gameStore from '../data/gameStore.js';
import { v4 as uuidv4 } from 'uuid';

export function createGame(
  hostUserId: string,
  hostEmail: string,
  hostName: string,
  gameName?: string
): Game {
  const gameId = uuidv4();

  const game: Game = {
    id: gameId,
    hostUserId,
    name: gameName || `Game ${gameId.slice(0, 8)}`,
    status: 'lobby',
    players: [
      {
        userId: hostUserId,
        email: hostEmail,
        name: hostName,
        joinedAt: new Date(),
        score: 0,
      },
    ],
    currentPlayerIndex: 0,
    turnNumber: 0,
    createdAt: new Date(),
    moves: [],
  };

  return gameStore.createGame(game);
}

export function joinGame(
  gameId: string,
  userId: string,
  email: string,
  name: string
): Game {
  const game = gameStore.getGameById(gameId);

  if (!game) {
    throw new Error(`Game ${gameId} not found`);
  }

  if (game.status !== 'lobby') {
    throw new Error(`Cannot join: game is in '${game.status}' status`);
  }

  if (game.players.some(p => p.userId === userId)) {
    throw new Error(`User ${userId} already in this game`);
  }

  game.players.push({
    userId,
    email,
    name,
    joinedAt: new Date(),
    score: 0,
  });

  return gameStore.updateGame(game);
}

export function startGame(gameId: string, userId: string): Game {
  const game = gameStore.getGameById(gameId);

  if (!game) {
    throw new Error(`Game ${gameId} not found`);
  }

  if (game.hostUserId !== userId) {
    throw new Error(`Only host can start game`);
  }

  if (game.status !== 'lobby') {
    throw new Error(`Game already started`);
  }

  if (game.players.length < 2) {
    throw new Error(`Need at least 2 players`);
  }

  game.status = 'active';
  game.startedAt = new Date();
  game.currentPlayerIndex = 0;
  game.turnNumber = 1;

  return gameStore.updateGame(game);
}

export function getTurnState(gameId: string): TurnState {
  const game = gameStore.getGameById(gameId);

  if (!game) {
    throw new Error(`Game ${gameId} not found`);
  }

  const currentPlayer = game.players[game.currentPlayerIndex];
  if (!currentPlayer) {
    throw new Error('No current player');
  }

  return {
    gameId,
    currentPlayerIndex: game.currentPlayerIndex,
    currentPlayerId: currentPlayer.userId,
    turnNumber: game.turnNumber,
    isGameActive: game.status === 'active',
  };
}

export function getGameState(gameId: string, userId: string): { game: Game; isCurrentPlayer: boolean } {
  const game = gameStore.getGameById(gameId);

  if (!game) {
    throw new Error(`Game ${gameId} not found`);
  }

  if (!game.players.some(p => p.userId === userId)) {
    throw new Error(`User not in this game`);
  }

  const currentPlayer = game.players[game.currentPlayerIndex];
  if (!currentPlayer) {
    throw new Error('No current player');
  }
  const isCurrentPlayer = currentPlayer.userId === userId;

  return { game, isCurrentPlayer };
}

export function submitMove(
  gameId: string,
  userId: string,
  moveData: Record<string, unknown>
): Game {
  const game = gameStore.getGameById(gameId);

  if (!game) {
    throw new Error(`Game ${gameId} not found`);
  }

  if (game.status !== 'active') {
    throw new Error(`Game not active`);
  }

  const currentPlayer = game.players[game.currentPlayerIndex];
  if (!currentPlayer) {
    throw new Error('No current player');
  }

  if (currentPlayer.userId !== userId) {
    throw new Error(`Not your turn. Current: ${currentPlayer.name}`);
  }

  const move: GameMove = {
    id: uuidv4(),
    gameId,
    playerId: userId,
    turnNumber: game.turnNumber,
    moveData,
    submittedAt: new Date(),
  };

  gameStore.recordMove(move);
  game.moves.push(move);

  // Advance turn
  game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;

  if (game.currentPlayerIndex === 0) {
    game.turnNumber += 1;
  }

  return gameStore.updateGame(game);
}

export function finishGame(gameId: string, userId: string): Game {
  const game = gameStore.getGameById(gameId);

  if (!game) {
    throw new Error(`Game ${gameId} not found`);
  }

  if (game.hostUserId !== userId) {
    throw new Error(`Only host can finish game`);
  }

  game.status = 'finished';
  game.finishedAt = new Date();

  return gameStore.updateGame(game);
}

export function getUserGames(userId: string): Game[] {
  return gameStore.listGamesForUser(userId);
}

export function debugGetAllGames(): Game[] {
  // Returns all games in the store for debugging
  return gameStore.getAllGames();
}

export function debugActivateGame(gameId: string): Game {
  const game = gameStore.getGameById(gameId);
  if (!game) {
    throw new Error(`Game ${gameId} not found`);
  }
  game.status = 'active';
  game.startedAt = new Date();
  game.currentPlayerIndex = 0;
  game.turnNumber = 1;
  return gameStore.updateGame(game);
}
export function leaveGame(gameId: string, userId: string): Game {
  const game = gameStore.getGameById(gameId);

  if (!game) {
    throw new Error(`Game ${gameId} not found`);
  }

  const player = game.players.find(p => p.userId === userId);
  if (!player) {
    throw new Error(`User ${userId} not in this game`);
  }

  // Mark player as left
  player.left_game = true;

  // Count active players (not left)
  const activePlayers = game.players.filter(p => !p.left_game);

  // If last person leaves, mark game as finished/deleted
  if (activePlayers.length === 0) {
    game.status = 'finished';
    game.finishedAt = new Date();
  }

  return gameStore.updateGame(game);
}