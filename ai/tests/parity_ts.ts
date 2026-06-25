/**
 * Parity harness: reads JSON ecosystems from stdin, scores them with the real
 * server scoring engine, writes JSON totals/breakdowns to stdout.
 *
 * Input:  { "games": [ { "0": PlacedCard[], "1": PlacedCard[], ... }, ... ] }
 * Output: { "results": [ { "0": ScoreBreakdown, ... }, ... ] }
 *
 * Run:  node_modules/.bin/tsx ../ai/tests/parity_ts.ts   (cwd = server/)
 */
import { computeScores } from '../../server/src/services/scoring/index.js';
import type { PlacedCard } from '../../server/src/types/card.js';

type Eco = Record<string, PlacedCard[]>;

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

(async () => {
  const input = JSON.parse(await readStdin()) as { games: Eco[] };
  const results = input.games.map((eco) => computeScores(eco));
  process.stdout.write(JSON.stringify({ results }));
})();
