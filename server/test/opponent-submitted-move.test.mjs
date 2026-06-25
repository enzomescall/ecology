import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = mkdtempSync(join(tmpdir(), 'ecology-opponent-move-'));
process.env.ECOLOGY_DB_PATH = join(tmp, 'db.json');

const gameService = await import('../dist/services/gameService.js');

test.after(() => rmSync(tmp, { recursive: true, force: true }));

test('game state exposes only opponent submitted coordinates for hidden pending-card previews', () => {
  gameService.setTurnReminderEmailSenderForTests(async () => {});

  try {
    const game = gameService.createGame('host-opponent', 'host-opponent@example.com', 'Host', 'Opponent Move Test');
    gameService.joinGame(game.id, 'guest-opponent', 'guest-opponent@example.com', 'Guest');
    gameService.startGame(game.id, 'host-opponent');

    const guestState = gameService.getGameState(game.id, 'guest-opponent');
    const guestCard = guestState.hand[0];
    const move = {
      cardId: guestCard.id,
      coord: { x: 0, y: 0 },
      swap: null,
    };

    gameService.submitMove(game.id, 'guest-opponent', move);

    const hostState = gameService.getGameState(game.id, 'host-opponent');
    assert.deepEqual(hostState.opponentSubmittedMoves['guest-opponent'], { coord: move.coord });
    assert.equal('cardId' in hostState.opponentSubmittedMoves['guest-opponent'], false);
    assert.equal(hostState.submittedMove, undefined);
    assert.equal(hostState.submittedCard, undefined);
  } finally {
    gameService.setTurnReminderEmailSenderForTests(null);
  }
});
