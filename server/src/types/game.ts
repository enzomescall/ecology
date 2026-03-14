import type { Card, CardType, Coord, PlacedCard } from './card.js';

export interface GamePlayer {
  userId: string;
  email: string;
  name: string;
  joinedAt: Date;
  leftGame?: boolean;
}

export type GameStatus = 'lobby' | 'active' | 'finished';

export interface EcoMove {
  cardId: string;
  coord: Coord;
  swap: { a: Coord; b: Coord } | null;
}

import type { ScoreBreakdown } from '../services/scoring/index.js';

export interface Game {
  id: string;
  hostUserId: string;
  name: string;
  status: GameStatus;
  round: 1 | 2;
  turn: number;
  playerOrder: string[];
  players: GamePlayer[];
  passDirection: 'left' | 'right';
  handsByPlayerId: Record<string, Card[]>;
  submittedMovesByPlayerId: Record<string, EcoMove>;
  ecosystemsByPlayerId: Record<string, PlacedCard[]>;
  scoresByPlayerId?: Record<string, ScoreBreakdown>;
  deck: Card[];
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
}

export interface GameStateResponse {
  game: {
    id: string;
    name: string;
    status: GameStatus;
    round: 1 | 2;
    turn: number;
    playerOrder: string[];
    players: GamePlayer[];
  };
  hand: Card[];
  ecosystem: PlacedCard[];
  opponentEcosystems: Record<string, PlacedCard[]>;
  hasSubmitted: boolean;
  waitingFor: string[];
  scores?: Record<string, ScoreBreakdown>;
}
