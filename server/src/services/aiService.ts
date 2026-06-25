import { execFile } from 'node:child_process';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import type { Game, EcoMove } from '../types/game.js';
import type { Card, PlacedCard } from '../types/card.js';
import * as gameStore from '../data/gameStore.js';
import * as gameService from './gameService.js';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'impossible';
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'impossible'];

const AI_PREFIX = 'ai:';
const AI_DIR = process.env.AI_DIR ?? path.resolve(process.cwd(), '..', 'ai');
const AI_PYTHON = process.env.AI_PYTHON ?? 'python3';
const AI_SCRIPT = path.join(AI_DIR, 'serve', 'ai_move.py');
// Cap each AI move; hard/impossible search can run a few seconds (async game).
const AI_MOVE_TIMEOUT_MS = Number(process.env.AI_MOVE_TIMEOUT_MS ?? 60_000);

const driving = new Set<string>(); // gameIds currently being driven, avoid re-entrancy

export function isAiUserId(userId: string): boolean {
  return userId.startsWith(AI_PREFIX);
}

export function difficultyOf(userId: string): Difficulty {
  const part = userId.slice(AI_PREFIX.length).split(':')[0] as Difficulty;
  return DIFFICULTIES.includes(part) ? part : 'medium';
}

function botLabel(difficulty: Difficulty): string {
  const cap = difficulty[0]!.toUpperCase() + difficulty.slice(1);
  return `🤖 ${cap} Bot`;
}

/** Add an AI player to a lobby. Host only. */
export function addAiPlayer(gameId: string, hostUserId: string, difficulty: Difficulty): Game {
  const game = gameStore.getGame(gameId);
  if (!game) throw new Error(`Game ${gameId} not found`);
  if (game.status !== 'lobby') throw new Error('Bots can only be added in the lobby');
  if (game.hostUserId !== hostUserId) throw new Error('Only host can add bots');
  if (!DIFFICULTIES.includes(difficulty)) throw new Error(`Invalid difficulty: ${difficulty}`);
  if (game.players.length >= 6) throw new Error('Game is full (max 6 players)');

  const userId = `${AI_PREFIX}${difficulty}:${uuidv4().slice(0, 8)}`;
  game.players.push({
    userId,
    email: `${userId}@bot.local`,
    name: botLabel(difficulty),
    joinedAt: new Date(),
  });
  return gameStore.updateGame(gameId, game);
}

export function removeAiPlayer(gameId: string, hostUserId: string, botUserId: string): Game {
  const game = gameStore.getGame(gameId);
  if (!game) throw new Error(`Game ${gameId} not found`);
  if (game.status !== 'lobby') throw new Error('Bots can only be removed in the lobby');
  if (game.hostUserId !== hostUserId) throw new Error('Only host can remove bots');
  if (!isAiUserId(botUserId)) throw new Error('Not a bot');
  game.players = game.players.filter(p => p.userId !== botUserId);
  return gameStore.updateGame(gameId, game);
}

interface Snapshot {
  seat: number;
  numPlayers: number;
  round: number;
  turn: number;
  passDirection: 'left' | 'right';
  hands: Record<string, Card[]>;
  ecosystems: Record<string, PlacedCard[]>;
  deck: Card[];
}

function buildSnapshot(game: Game, seat: number): Snapshot {
  const order = game.playerOrder;
  const hands: Record<string, Card[]> = {};
  const ecosystems: Record<string, PlacedCard[]> = {};
  order.forEach((pid, i) => {
    hands[String(i)] = game.handsByPlayerId[pid] ?? [];
    ecosystems[String(i)] = game.ecosystemsByPlayerId[pid] ?? [];
  });
  return {
    seat,
    numPlayers: order.length,
    round: game.round,
    turn: game.turn,
    passDirection: game.passDirection,
    hands,
    ecosystems,
    deck: game.deck,
  };
}

function runAiMove(snapshot: Snapshot, difficulty: Difficulty): Promise<EcoMove> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      AI_PYTHON,
      [AI_SCRIPT, '--difficulty', difficulty],
      { timeout: AI_MOVE_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(`AI move failed: ${err.message}\n${stderr}`));
        try {
          const wire = JSON.parse(stdout.trim());
          resolve({ cardId: wire.cardId, coord: wire.coord, swap: wire.swap ?? null });
        } catch (e) {
          reject(new Error(`Bad AI output: ${stdout}\n${stderr}`));
        }
      },
    );
    child.stdin?.write(JSON.stringify(snapshot));
    child.stdin?.end();
  });
}

/**
 * Drive every AI seat that still owes a move for the current turn, repeating
 * across turn/round boundaries until no bot is pending or the game ends.
 * Fire-and-forget: callers should not await (the game is asynchronous).
 */
export async function driveAiTurns(gameId: string): Promise<void> {
  if (driving.has(gameId)) return;
  driving.add(gameId);
  try {
    // Bounded loop: at most 20 turns * players iterations.
    for (let guard = 0; guard < 200; guard++) {
      const game = gameStore.getGame(gameId);
      if (!game || game.status !== 'active') return;

      const pendingBot = game.playerOrder.find(
        pid => isAiUserId(pid) && !game.submittedMovesByPlayerId[pid],
      );
      if (!pendingBot) return; // waiting on a human, or all submitted

      const seat = game.playerOrder.indexOf(pendingBot);
      const difficulty = difficultyOf(pendingBot);
      let move: EcoMove;
      try {
        move = await runAiMove(buildSnapshot(game, seat), difficulty);
      } catch (err) {
        console.error(`[ai] ${pendingBot} move error:`, (err as Error).message);
        return; // leave the turn pending rather than crash; a human can nudge/retry
      }
      try {
        gameService.submitMove(gameId, pendingBot, move);
      } catch (err) {
        console.error(`[ai] ${pendingBot} submit rejected:`, (err as Error).message);
        return;
      }
    }
  } finally {
    driving.delete(gameId);
  }
}
