import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = mkdtempSync(join(tmpdir(), 'ecology-turn-reminders-'));
process.env.ECOLOGY_DB_PATH = join(tmp, 'db.json');
process.env.ECOLOGY_PUBLIC_URL = 'https://enzom.duckdns.org/ecology/';

const emailService = await import('../dist/services/emailService.js');
const gameService = await import('../dist/services/gameService.js');

test.after(() => rmSync(tmp, { recursive: true, force: true }));

test('turn reminder email includes a hyperlink to the Ecology login page', () => {
  const html = emailService.buildTurnReminderEmailHtml('Forest Game', 1, 2);

  assert.match(html, /<a\b[^>]*href="https:\/\/enzom\.duckdns\.org\/ecology\/"[^>]*>/);
  assert.match(html, /Forest Game/);
  assert.match(html, /Round 1/);
  assert.match(html, /Turn 2/);
});

test('all players are emailed when a game starts', () => {
  const sent = [];
  gameService.setTurnReminderEmailSenderForTests(async (to, gameName, round, turn) => {
    sent.push({ to, gameName, round, turn });
  });

  try {
    const game = gameService.createGame('host-start', 'host-start@example.com', 'Host', 'Start Email Test');
    gameService.joinGame(game.id, 'guest-start', 'guest-start@example.com', 'Guest');

    gameService.startGame(game.id, 'host-start');

    assert.deepEqual(
      sent.sort((a, b) => a.to.localeCompare(b.to)),
      [
        { to: 'guest-start@example.com', gameName: 'Start Email Test', round: 1, turn: 1 },
        { to: 'host-start@example.com', gameName: 'Start Email Test', round: 1, turn: 1 },
      ],
    );
  } finally {
    gameService.setTurnReminderEmailSenderForTests(null);
  }
});

test('all players are emailed when a turn resolves to the next turn', () => {
  const sent = [];
  gameService.setTurnReminderEmailSenderForTests(async (to, gameName, round, turn) => {
    sent.push({ to, gameName, round, turn });
  });

  try {
    const game = gameService.createGame('host-1', 'host@example.com', 'Host', 'Reminder Test');
    gameService.joinGame(game.id, 'guest-1', 'guest@example.com', 'Guest');
    gameService.startGame(game.id, 'host-1');

    assert.deepEqual(sent.map(call => call.turn), [1, 1]);
    sent.length = 0;

    const hostState = gameService.getGameState(game.id, 'host-1');
    gameService.submitMove(game.id, 'host-1', {
      cardId: hostState.hand[0].id,
      coord: { x: 0, y: 0 },
      swap: null,
    });

    assert.deepEqual(sent, []);

    const guestState = gameService.getGameState(game.id, 'guest-1');
    gameService.submitMove(game.id, 'guest-1', {
      cardId: guestState.hand[0].id,
      coord: { x: 0, y: 0 },
      swap: null,
    });

    assert.deepEqual(
      sent.sort((a, b) => a.to.localeCompare(b.to)),
      [
        { to: 'guest@example.com', gameName: 'Reminder Test', round: 1, turn: 2 },
        { to: 'host@example.com', gameName: 'Reminder Test', round: 1, turn: 2 },
      ],
    );
  } finally {
    gameService.setTurnReminderEmailSenderForTests(null);
  }
});

test('host can nudge selected players with follow-up turn emails', () => {
  const sent = [];
  gameService.setTurnReminderEmailSenderForTests(async (to, gameName, round, turn) => {
    sent.push({ to, gameName, round, turn });
  });

  try {
    const game = gameService.createGame('host-nudge', 'host-nudge@example.com', 'Host', 'Nudge Test');
    gameService.joinGame(game.id, 'guest-a', 'guest-a@example.com', 'Guest A');
    gameService.joinGame(game.id, 'guest-b', 'guest-b@example.com', 'Guest B');
    gameService.startGame(game.id, 'host-nudge');
    sent.length = 0;

    const nudged = gameService.nudgePlayers(game.id, 'host-nudge', ['guest-a', 'guest-b']);

    assert.deepEqual(nudged.map(player => player.email).sort(), ['guest-a@example.com', 'guest-b@example.com']);
    assert.deepEqual(
      sent.sort((a, b) => a.to.localeCompare(b.to)),
      [
        { to: 'guest-a@example.com', gameName: 'Nudge Test', round: 1, turn: 1 },
        { to: 'guest-b@example.com', gameName: 'Nudge Test', round: 1, turn: 1 },
      ],
    );
  } finally {
    gameService.setTurnReminderEmailSenderForTests(null);
  }
});

test('non-host cannot nudge players', () => {
  const game = gameService.createGame('host-no-nudge', 'host-no-nudge@example.com', 'Host', 'No Nudge Test');
  gameService.joinGame(game.id, 'guest-no-nudge', 'guest-no-nudge@example.com', 'Guest');
  gameService.startGame(game.id, 'host-no-nudge');

  assert.throws(
    () => gameService.nudgePlayers(game.id, 'guest-no-nudge', ['host-no-nudge']),
    /Only host can nudge players/,
  );
});
