import type { Game, EcoMove, GameStateResponse } from '../types/game.js';
import type { PlacedCard } from '../types/card.js';
import * as gameStore from '../data/gameStore.js';
import * as deckService from './deckService.js';
import * as ecosystemService from './ecosystemService.js';
import { computeScores } from './scoring/index.js';
import { v4 as uuidv4 } from 'uuid';

export function createGame(userId: string, email: string, name: string, gameName?: string): Game {
  const id = uuidv4();
  const game: Game = {
    id,
    hostUserId: userId,
    name: gameName || `Game ${id.slice(0, 8)}`,
    status: 'lobby',
    round: 1,
    turn: 0,
    passDirection: 'left',
    playerOrder: [],
    players: [{ userId, email, name, joinedAt: new Date() }],
    handsByPlayerId: {},
    submittedMovesByPlayerId: {},
    ecosystemsByPlayerId: {},
    deck: [],
    createdAt: new Date(),
  };
  return gameStore.createGame(game);
}

export function joinGame(gameId: string, userId: string, email: string, name: string): Game {
  const game = requireGame(gameId);
  if (game.status !== 'lobby') throw new Error('Game is not in lobby');
  if (game.players.some(p => p.userId === userId)) throw new Error('Already in this game');
  if (game.players.length >= 6) throw new Error('Game is full (max 6 players)');

  game.players.push({ userId, email, name, joinedAt: new Date() });
  return gameStore.updateGame(gameId, game);
}

export function startGame(gameId: string, userId: string): Game {
  const game = requireGame(gameId);
  if (game.hostUserId !== userId) throw new Error('Only host can start');
  if (game.status !== 'lobby') throw new Error('Game already started');
  if (game.players.length < 2) throw new Error('Need at least 2 players');

  const deck = deckService.shuffle(deckService.createDeck());
  const playerIds = game.players.map(p => p.userId);
  const { hands, remaining } = deckService.dealHands(deck, playerIds, 10);

  game.status = 'active';
  game.round = 1;
  game.turn = 1;
  game.passDirection = 'left';
  game.playerOrder = playerIds;
  game.handsByPlayerId = hands;
  game.deck = remaining;
  game.startedAt = new Date();

  for (const id of playerIds) {
    game.ecosystemsByPlayerId[id] = [];
  }
  game.submittedMovesByPlayerId = {};

  return gameStore.updateGame(gameId, game);
}

export function submitMove(gameId: string, userId: string, move: EcoMove): Game {
  const game = requireGame(gameId);
  if (game.status !== 'active') throw new Error('Game is not active');
  requirePlayer(game, userId);
  if (game.submittedMovesByPlayerId[userId]) throw new Error('Already submitted this turn');

  const hand = game.handsByPlayerId[userId]!;
  const card = hand.find(c => c.id === move.cardId);
  if (!card) throw new Error('Card not in your hand');

  const eco = game.ecosystemsByPlayerId[userId]!;
  if (!ecosystemService.isValidPlacement(eco, move.coord)) throw new Error('Invalid placement');

  if (move.swap) {
    if (card.type !== 'rabbit') throw new Error('Only rabbits can swap');
    const ecoAfterPlace = ecosystemService.placeCard(eco, card, move.coord);
    const cardA = ecosystemService.getCardAt(ecoAfterPlace, move.swap.a);
    const cardB = ecosystemService.getCardAt(ecoAfterPlace, move.swap.b);
    if (!cardA || !cardB) throw new Error('Swap coords must both have cards after placement');

    const ecoAfterSwap = ecosystemService.applySwap(ecoAfterPlace, move.swap.a, move.swap.b);
    const box = ecosystemService.getBoundingBox(ecoAfterSwap);
    if (box.width > 5 || box.height > 4) throw new Error('Swap would exceed 5x4 grid');
  }

  game.submittedMovesByPlayerId[userId] = move;
  return checkAndResolveTurn(gameStore.updateGame(gameId, game));
}

function checkAndResolveTurn(game: Game): Game {
  const playerIds = game.playerOrder;
  if (playerIds.some(id => !game.submittedMovesByPlayerId[id])) return game;

  // 1 & 2: Remove card from hand, place in ecosystem
  for (const id of playerIds) {
    const move = game.submittedMovesByPlayerId[id]!;
    const hand = game.handsByPlayerId[id]!;
    const card = hand.find(c => c.id === move.cardId)!;

    game.handsByPlayerId[id] = hand.filter(c => c.id !== move.cardId);
    game.ecosystemsByPlayerId[id] = ecosystemService.placeCard(
      game.ecosystemsByPlayerId[id]!, card, move.coord
    );
  }

  // 3: Apply rabbit swaps
  for (const id of playerIds) {
    const move = game.submittedMovesByPlayerId[id]!;
    if (move.swap) {
      game.ecosystemsByPlayerId[id] = ecosystemService.applySwap(
        game.ecosystemsByPlayerId[id]!, move.swap.a, move.swap.b
      );
    }
  }

  // 4: Pass hands
  game.handsByPlayerId = deckService.passHands(
    game.handsByPlayerId, playerIds, game.passDirection
  );

  // 5: Clear submitted moves
  game.submittedMovesByPlayerId = {};

  // 6: Increment turn
  game.turn += 1;

  // 7: Check round/game end
  if (game.turn > 10) {
    if (game.round === 1) {
      const { hands, remaining } = deckService.dealHands(game.deck, playerIds, 10);
      game.handsByPlayerId = hands;
      game.deck = remaining;
      game.round = 2;
      game.turn = 1;
      game.passDirection = 'right';
    } else {
      game.status = 'finished';
      game.finishedAt = new Date();
      game.scoresByPlayerId = computeScores(game.ecosystemsByPlayerId);
    }
  }

  return gameStore.updateGame(game.id, game);
}

export function getGameState(gameId: string, userId: string): GameStateResponse {
  const game = requireGame(gameId);
  requirePlayer(game, userId);

  const opponentEcosystems: Record<string, PlacedCard[]> = {};
  for (const p of game.players) {
    if (p.userId !== userId) {
      opponentEcosystems[p.userId] = game.ecosystemsByPlayerId[p.userId] ?? [];
    }
  }

  const waitingFor = game.playerOrder
    .filter(id => !game.submittedMovesByPlayerId[id])
    .map(id => game.players.find(p => p.userId === id)!.name);

  return {
    game: {
      id: game.id,
      name: game.name,
      status: game.status,
      round: game.round,
      turn: game.turn,
      playerOrder: game.playerOrder,
      players: game.players,
    },
    hand: game.handsByPlayerId[userId]!,
    ecosystem: game.ecosystemsByPlayerId[userId]!,
    opponentEcosystems,
    hasSubmitted: !!game.submittedMovesByPlayerId[userId],
    waitingFor,
    ...(game.status === 'finished' && game.scoresByPlayerId ? { scores: game.scoresByPlayerId } : {}),
  };
}

export function leaveGame(gameId: string, userId: string): Game {
  const game = requireGame(gameId);
  const player = game.players.find(p => p.userId === userId);
  if (!player) throw new Error('User not in this game');

  player.leftGame = true;

  if (game.players.every(p => p.leftGame)) {
    game.status = 'finished';
    game.finishedAt = new Date();
  }

  return gameStore.updateGame(gameId, game);
}

export function getUserGames(userId: string): Game[] {
  return gameStore.getUserGames(userId);
}

function requireGame(id: string): Game {
  const game = gameStore.getGame(id);
  if (!game) throw new Error(`Game ${id} not found`);
  return game;
}

function requirePlayer(game: Game, userId: string): void {
  if (!game.players.some(p => p.userId === userId)) {
    throw new Error('User not in this game');
  }
}
