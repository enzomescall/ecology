import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import type { Game } from '../types/game.js';
import type { Invite } from '../data/inviteStore.js';
import type { StoredUser } from '../data/userStore.js';

interface DatabaseState {
  games: Game[];
  users: StoredUser[];
  invites: Invite[];
}

const DB_PATH = resolve(process.env.ECOLOGY_DB_PATH ?? './data/ecology-db.json');

const emptyState = (): DatabaseState => ({ games: [], users: [], invites: [] });

let state: DatabaseState = loadState();

function loadState(): DatabaseState {
  if (!existsSync(DB_PATH)) return emptyState();
  try {
    const parsed = JSON.parse(readFileSync(DB_PATH, 'utf8')) as Partial<DatabaseState>;
    return {
      games: (parsed.games ?? []).map(reviveGame),
      users: (parsed.users ?? []).map(reviveUser),
      invites: (parsed.invites ?? []).map(reviveInvite),
    };
  } catch (error) {
    console.error(`[DB] Failed to load ${DB_PATH}; starting with empty state`, error);
    return emptyState();
  }
}

function persist(): void {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const tmpPath = `${DB_PATH}.${process.pid}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(state, null, 2));
  renameSync(tmpPath, DB_PATH);
}

function reviveDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(String(value));
}

function reviveUser(user: StoredUser): StoredUser {
  return { ...user, createdAt: reviveDate(user.createdAt) ?? new Date() };
}

function reviveInvite(invite: Invite): Invite {
  return { ...invite, createdAt: reviveDate(invite.createdAt) ?? new Date() };
}

function reviveGame(game: Game): Game {
  const revived: Game = {
    ...game,
    createdAt: reviveDate(game.createdAt) ?? new Date(),
    players: game.players.map((player) => ({
      ...player,
      joinedAt: reviveDate(player.joinedAt) ?? new Date(),
    })),
  };
  const startedAt = reviveDate(game.startedAt);
  if (startedAt) revived.startedAt = startedAt;
  const finishedAt = reviveDate(game.finishedAt);
  if (finishedAt) revived.finishedAt = finishedAt;
  return revived;
}

export function getGames(): Game[] {
  return state.games;
}

export function saveGames(games: Game[]): void {
  state = { ...state, games };
  persist();
}

export function getUsers(): StoredUser[] {
  return state.users;
}

export function saveUsers(users: StoredUser[]): void {
  state = { ...state, users };
  persist();
}

export function getInvites(): Invite[] {
  return state.invites;
}

export function saveInvites(invites: Invite[]): void {
  state = { ...state, invites };
  persist();
}

export function getDatabasePath(): string {
  return DB_PATH;
}
