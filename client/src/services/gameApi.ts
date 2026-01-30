/**
 * Game API Service
 * Handles all communication with the backend
 */

const BASE_URL = 'http://localhost:4000/api/game';

export interface GamePlayer {
  userId: string;
  email: string;
  name: string;
  joinedAt: string;
  score: number;
  left_game?: boolean;
}

export interface GameMove {
  id: string;
  gameId: string;
  playerId: string;
  turnNumber: number;
  moveData: Record<string, unknown>;
  submittedAt: string;
}

export interface Game {
  id: string;
  hostUserId: string;
  name: string;
  status: 'lobby' | 'active' | 'finished';
  players: GamePlayer[];
  currentPlayerIndex: number;
  turnNumber: number;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  moves: GameMove[];
}

export interface ApiError {
  error: string;
  issues?: Array<{ path: string[]; message: string }>;
}

// Check if response is an error
function isError(response: any): response is ApiError {
  return response && typeof response === 'object' && 'error' in response;
}

/**
 * Create a new game
 */
export async function createGame(
  userId: string,
  email: string,
  name: string,
  gameName?: string
): Promise<Game> {
  const response = await fetch(`${BASE_URL}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, email, name, gameName }),
  });

  const data = await response.json();

  if (!response.ok || isError(data)) {
    throw new Error(data.error || 'Failed to create game');
  }

  return data;
}

/**
 * Join an existing game
 */
export async function joinGame(
  gameId: string,
  userId: string,
  email: string,
  name: string
): Promise<Game> {
  const response = await fetch(`${BASE_URL}/${gameId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, email, name }),
  });

  const data = await response.json();

  if (!response.ok || isError(data)) {
    throw new Error(data.error || 'Failed to join game');
  }

  return data;
}

/**
 * Start a game (host only)
 */
export async function startGame(gameId: string, userId: string): Promise<Game> {
  const response = await fetch(`${BASE_URL}/${gameId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  const data = await response.json();

  if (!response.ok || isError(data)) {
    throw new Error(data.error || 'Failed to start game');
  }

  return data;
}

/**
 * Get game state
 */
export async function getGameState(
  gameId: string,
  userId: string
): Promise<{ game: Game; isCurrentPlayer: boolean }> {
  const response = await fetch(
    `${BASE_URL}/${gameId}?userId=${encodeURIComponent(userId)}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const data = await response.json();

  if (!response.ok || isError(data)) {
    throw new Error(data.error || 'Failed to get game state');
  }

  return data;
}

/**
 * Submit a move
 */
export async function submitMove(
  gameId: string,
  userId: string,
  moveData: Record<string, unknown>
): Promise<Game> {
  const response = await fetch(`${BASE_URL}/${gameId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, moveData }),
  });

  const data = await response.json();

  if (!response.ok || isError(data)) {
    throw new Error(data.error || 'Failed to submit move');
  }

  return data;
}

/**
 * Finish a game (host only)
 */
export async function finishGame(gameId: string, userId: string): Promise<Game> {
  const response = await fetch(`${BASE_URL}/${gameId}/finish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  const data = await response.json();

  if (!response.ok || isError(data)) {
    throw new Error(data.error || 'Failed to finish game');
  }

  return data;
}

/**
 * Leave or delete a game
 */
export async function leaveGame(gameId: string, userId: string): Promise<Game> {
  const response = await fetch(`${BASE_URL}/${gameId}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  const data = await response.json();

  if (!response.ok || isError(data)) {
    throw new Error(data.error || 'Failed to leave game');
  }

  return data;
}
/**
 * DEBUG: Force game to active status
 */
export async function debugActivateGame(gameId: string): Promise<Game> {
  const response = await fetch(`${BASE_URL}/${gameId}/debug/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok || isError(data)) {
    throw new Error(data.error || 'Failed to activate game');
  }

  return data;
}
