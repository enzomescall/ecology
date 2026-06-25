/**
 * Integration: play a full game with 1 scripted human + 2 bots through the real
 * gameService + aiService (no HTTP). Verifies bots auto-move and the game
 * finishes & scores. Run from server/:
 *   AI_DIR=../ai node_modules/.bin/tsx ../ai/tests/integration_node.ts
 */
import * as gameService from '../../server/src/services/gameService.js';
import * as aiService from '../../server/src/services/aiService.js';
import * as ecosystemService from '../../server/src/services/ecosystemService.js';

function submitGreedyHumanMove(gameId: string, userId: string) {
  const state = gameService.getGameState(gameId, userId);
  const hand = state.hand;
  const eco = state.ecosystem;
  const cells = ecosystemService.getValidPlacements(eco);
  const card = hand[0]!;
  gameService.submitMove(gameId, userId, { cardId: card.id, coord: cells[0]!, swap: null });
}

async function main() {
  const human = 'user-human';
  let game = gameService.createGame(human, 'human@test.local', 'Human', 'Bot Test Game');
  game = aiService.addAiPlayer(game.id, human, 'easy');
  game = aiService.addAiPlayer(game.id, human, 'medium');
  console.log(`players: ${game.players.map(p => p.name).join(', ')}`);

  game = gameService.startGame(game.id, human);
  await aiService.driveAiTurns(game.id); // turn-1 bots

  let guard = 0;
  while (guard++ < 100) {
    const g = gameService.getGame(game.id);
    if (g.status === 'finished') break;
    if (!g.submittedMovesByPlayerId[human]) {
      submitGreedyHumanMove(g.id, human);
    }
    await aiService.driveAiTurns(g.id);
  }

  const finished = gameService.getGame(game.id);
  if (finished.status !== 'finished') {
    throw new Error(`game did not finish (status=${finished.status}, round=${finished.round}, turn=${finished.turn})`);
  }
  const scores = finished.scoresByPlayerId!;
  console.log('FINISHED. Final totals:');
  for (const pid of finished.playerOrder) {
    const name = finished.players.find(p => p.userId === pid)!.name;
    console.log(`  ${name.padEnd(16)} total=${scores[pid]!.total}`);
  }
  // sanity: each board fully placed
  for (const pid of finished.playerOrder) {
    const n = finished.ecosystemsByPlayerId[pid]!.length;
    if (n !== 20) throw new Error(`${pid} has ${n} cards, expected 20`);
  }
  console.log('OK: full game with bots completed, all boards filled, scored.');
}

main().catch((e) => { console.error(e); process.exit(1); });
