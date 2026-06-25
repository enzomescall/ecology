import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = mkdtempSync(join(tmpdir(), 'ecology-pending-move-'));
process.env.ECOLOGY_DB_PATH = join(tmp, 'db.json');

const gameService = await import('../dist/services/gameService.js');

test.after(() => rmSync(tmp, { recursive: true, force: true }));

test('game state includes the current player submitted move so refresh can restore pending card preview', () => {
  gameService.setTurnReminderEmailSenderForTests(async () => {});

  try {
    const game = gameService.createGame('host-pending', 'host-pending@example.com', 'Host', 'Pending Move Test');
    gameService.joinGame(game.id, 'guest-pending', 'guest-pending@example.com', 'Guest');
    gameService.startGame(game.id, 'host-pending');

    const beforeSubmit = gameService.getGameState(game.id, 'host-pending');
    const streamCard = beforeSubmit.hand.find(card => card.type === 'stream') ?? beforeSubmit.hand[0];
    const move = {
      cardId: streamCard.id,
      coord: { x: 0, y: 0 },
      swap: null,
    };

    gameService.submitMove(game.id, 'host-pending', move);

    const afterRefreshState = gameService.getGameState(game.id, 'host-pending');
    assert.equal(afterRefreshState.hasSubmitted, true);
    assert.deepEqual(afterRefreshState.submittedMove, move);
    assert.equal(afterRefreshState.submittedCard?.id, streamCard.id);
    assert.equal(afterRefreshState.submittedCard?.type, streamCard.type);
  } finally {
    gameService.setTurnReminderEmailSenderForTests(null);
  }
});
