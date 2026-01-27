/**
 * Core type definitions for the turn-based game system.
 * Independent of database implementation.
 */

export interface User {
  id: string;
  email: string;
  name: string;
}

export type GameStatus = 'lobby' | 'active' | 'finished';

export interface GamePlayer {
  userId: string;
  email: string;
  name: string;
  joinedAt: Date;
  score?: number;
}

export interface Game {
  id: string;
  hostUserId: string;
  name: string;
  status: GameStatus;
  players: GamePlayer[];
  currentPlayerIndex: number;
  turnNumber: number;
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  moves: GameMove[];
}

export interface GameMove {
  id: string;
  gameId: string;
  playerId: string;
  turnNumber: number;
  moveData: Record<string, unknown>;
  submittedAt: Date;
}

export interface TurnState {
  gameId: string;
  currentPlayerIndex: number;
  currentPlayerId: string;
  turnNumber: number;
  isGameActive: boolean;
}

export interface CreateGameRequest {
  hostUserId: string;
  hostEmail: string;
  hostName: string;
  gameName?: string;
}

export interface JoinGameRequest {
  gameId: string;
  userId: string;
  email: string;
  name: string;
}

export interface StartGameRequest {
  gameId: string;
  userId: string;
}

export interface SubmitMoveRequest {
  gameId: string;
  userId: string;
  moveData: Record<string, unknown>;
}

export interface GameStateResponse {
  game: Game;
  turnState: TurnState;
  isCurrentPlayer: boolean;
}

export interface MoveResponse {
  success: boolean;
  message: string;
  game?: Game;
  turnState?: TurnState;
}
