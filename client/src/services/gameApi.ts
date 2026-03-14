const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/game';
const AUTH_URL = import.meta.env.VITE_API_URL?.replace('/game', '/auth') ?? 'http://localhost:4000/api/auth';

export type CardType = 'stream' | 'meadow' | 'wolf' | 'fox' | 'bear' | 'trout' | 'dragonfly' | 'bee' | 'eagle' | 'deer' | 'rabbit';

export interface Card { id: string; type: CardType; }
export interface Coord { x: number; y: number; }
export interface PlacedCard { card: Card; coord: Coord; }

export interface GamePlayer {
  userId: string;
  email: string;
  name: string;
  joinedAt: string;
  leftGame?: boolean;
}

export interface ScoreBreakdown {
  stream: number;
  meadow: number;
  wolf: number;
  fox: number;
  bear: number;
  trout: number;
  dragonfly: number;
  bee: number;
  eagle: number;
  deer: number;
  diversityPenalty: number;
  total: number;
}

export interface GameSummary {
  id: string;
  name: string;
  status: 'lobby' | 'active' | 'finished';
  round: number;
  turn: number;
  playerOrder: string[];
  players: GamePlayer[];
}

export interface GameStateResponse {
  game: GameSummary;
  hand: Card[];
  ecosystem: PlacedCard[];
  opponentEcosystems: Record<string, PlacedCard[]>;
  hasSubmitted: boolean;
  waitingFor: string[];
  scores?: Record<string, ScoreBreakdown>;
}

export interface ApiError {
  error: string;
  issues?: Array<{ path: string[]; message: string }>;
}

function isError(response: unknown): response is ApiError {
  return typeof response === 'object' && response !== null && 'error' in response;
}

async function post<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok || isError(data)) throw new Error(data.error || 'Request failed');
  return data;
}

async function get<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || isError(data)) throw new Error(data.error || 'Request failed');
  return data;
}

export const createGame = (userId: string, email: string, name: string, gameName?: string, inviteEmails?: string[]) =>
  post<GameSummary>(`${BASE_URL}/`, { userId, email, name, gameName, inviteEmails });

export const joinGame = (gameId: string, userId: string, email: string, name: string) =>
  post<GameSummary>(`${BASE_URL}/${gameId}/join`, { userId, email, name });

export const startGame = (gameId: string, userId: string) =>
  post<GameSummary>(`${BASE_URL}/${gameId}/start`, { userId });

export const getGameState = (gameId: string, userId: string) =>
  get<GameStateResponse>(`${BASE_URL}/${gameId}?userId=${encodeURIComponent(userId)}`);

export const submitMove = (
  gameId: string,
  userId: string,
  move: { cardId: string; coord: Coord; swap: { a: Coord; b: Coord } | null }
) => post<GameStateResponse>(`${BASE_URL}/${gameId}/move`, { userId, ...move });

export const leaveGame = (gameId: string, userId: string) =>
  post<GameSummary>(`${BASE_URL}/${gameId}/leave`, { userId });

export async function sendAuthCode(email: string, name: string): Promise<void> {
  const response = await fetch(`${AUTH_URL}/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });
  if (!response.ok) throw new Error('Failed to send code');
}

export const verifyAuthCode = (email: string, code: string) =>
  post<{ userId: string; email: string; name: string }>(`${AUTH_URL}/verify`, { email, code });

// Invites

export interface Invite {
  id: string;
  gameId: string;
  gameName: string;
  invitedEmail: string;
  invitedByName: string;
  createdAt: string;
}

export const getInvites = (email: string) =>
  get<Invite[]>(`${BASE_URL}/invites?email=${encodeURIComponent(email)}`);

export const acceptInvite = (inviteId: string, userId: string, email: string, name: string) =>
  post<GameSummary>(`${BASE_URL}/invites/${inviteId}/accept`, { userId, email, name });

export const declineInvite = (inviteId: string) =>
  post<{ success: boolean }>(`${BASE_URL}/invites/${inviteId}/decline`, {});

export const getUserGames = (userId: string) =>
  get<GameSummary[]>(`${BASE_URL}/user-games?userId=${encodeURIComponent(userId)}`);

export interface UserAnalytics {
  overview: {
    gamesPlayed: number;
    gamesWon: number;
    winRate: number;
    totalGamesActive: number;
  };
  scoring: {
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    categoryAverages: Record<string, number>;
    diversityPenaltyAverage: number;
    diversityPenaltyFrequency: Record<string, number>;
  };
  cards: {
    totalCardsPlaced: number;
    cardTypeDistribution: Record<CardType, number>;
    averagePointsPerCard: Record<CardType, number>;
    mostValuableCard: { type: CardType; avgPoints: number };
    rabbitSwapsUsed: number;
    rabbitSwapRate: number;
  };
  ecosystem: {
    averageWidth: number;
    averageHeight: number;
    averageCardCount: number;
    mostCommonShape: string;
  };
  opponents: {
    mostPlayedAgainst: { name: string; games: number } | null;
    winRateVsOpponents: Record<string, { name: string; wins: number; losses: number; winRate: number }>;
  };
}

export const getUserAnalytics = (userId: string) =>
  get<UserAnalytics>(`${BASE_URL}/analytics?userId=${encodeURIComponent(userId)}`);
