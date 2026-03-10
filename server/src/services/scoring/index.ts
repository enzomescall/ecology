import type { PlacedCard } from './groups.js';
import { scoreMeadow } from './meadow.js';
import { scoreFox } from './fox.js';
import { scoreBear } from './bear.js';
import { scoreTrout } from './trout.js';
import { scoreDeer } from './deer.js';
import { scoreEagle } from './eagle.js';
import { scoreDragonfly } from './dragonfly.js';
import { scoreBee } from './bee.js';
import { scoreStream } from './stream.js';
import { scoreWolf } from './wolf.js';

export interface ScoreBreakdown {
  stream: number;
  meadow: number;
  wolf: number;
  fox: number;
  bear: number;
  trout: number;
  dragonfly: number;
  bee: number;
  eagle: number;
  deer: number;
  diversityPenalty: number;
  total: number;
}

const SOLO_SCORERS = {
  meadow: scoreMeadow,
  fox: scoreFox,
  bear: scoreBear,
  trout: scoreTrout,
  deer: scoreDeer,
  eagle: scoreEagle,
  dragonfly: scoreDragonfly,
  bee: scoreBee,
} as const;

const PENALTY = [0, 0, 0, 0, -2, -5, -10] as const;
const CATEGORIES = ['stream', 'meadow', 'wolf', 'fox', 'bear', 'trout', 'dragonfly', 'bee', 'eagle', 'deer'] as const;

function diversityPenalty(breakdown: Record<string, number>): number {
  const zeros = CATEGORIES.filter(c => breakdown[c] === 0).length;
  return PENALTY[Math.min(zeros, 6)] ?? -10;
}

export function computeScores(ecosystems: Record<string, PlacedCard[]>): Record<string, ScoreBreakdown> {
  const streamScores = scoreStream(ecosystems);
  const wolfScores = scoreWolf(ecosystems);
  const results: Record<string, ScoreBreakdown> = {};

  for (const [pid, eco] of Object.entries(ecosystems)) {
    const breakdown: Record<string, number> = {
      stream: streamScores[pid] ?? 0,
      wolf: wolfScores[pid] ?? 0,
    };
    for (const [cat, fn] of Object.entries(SOLO_SCORERS)) {
      breakdown[cat] = fn(eco);
    }
    const penalty = diversityPenalty(breakdown);
    const total = CATEGORIES.reduce((s, c) => s + (breakdown[c] ?? 0), 0) + penalty;

    results[pid] = { ...breakdown, diversityPenalty: penalty, total } as ScoreBreakdown;
  }
  return results;
}

export type { PlacedCard, Card, CardType, Coord } from './groups.js';
