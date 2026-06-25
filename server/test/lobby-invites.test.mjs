import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = mkdtempSync(join(tmpdir(), 'ecology-lobby-invites-'));
process.env.ECOLOGY_DB_PATH = join(tmp, 'db.json');

const inviteStore = await import('../dist/data/inviteStore.js');
const gameService = await import('../dist/services/gameService.js');

test.after(() => rmSync(tmp, { recursive: true, force: true }));

test('hosts can add, list, and remove pending invited emails for a lobby game', () => {
  const game = gameService.createGame('host-1', 'host@example.com', 'Host', 'Invite Test');
  inviteStore.createInvite(game.id, game.name, 'pending@example.com', 'Host');

  assert.deepEqual(
    inviteStore.getInvitesForGame(game.id).map((invite) => invite.invitedEmail),
    ['pending@example.com'],
  );

  assert.equal(inviteStore.deleteInviteForGameByEmail(game.id, 'pending@example.com'), true);
  assert.deepEqual(inviteStore.getInvitesForGame(game.id), []);
});

test('hosts can remove accepted players from a lobby game by email', () => {
  const game = gameService.createGame('host-2', 'host2@example.com', 'Host 2', 'Accepted Test');
  gameService.joinGame(game.id, 'guest-1', 'guest@example.com', 'Guest');

  const updated = gameService.removeLobbyPlayer(game.id, 'host-2', 'guest@example.com');

  assert.deepEqual(updated.players.map((player) => player.email), ['host2@example.com']);
});
