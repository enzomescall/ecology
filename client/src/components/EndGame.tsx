import { useState, useEffect } from 'react';
import { getGameState } from '../services/gameApi';
import type { ScoreBreakdown } from '../services/gameApi';

interface EndGameProps {
  gameId: string;
  user: { userId: string; email: string; name: string };
  onReturnHome: () => void;
  onNewGame: () => void;
}

const CATEGORIES: { key: keyof ScoreBreakdown; label: string; hint: string }[] = [
  { key: 'stream', label: 'Stream', hint: 'Longest connected stream vs opponents (8/5 pts)' },
  { key: 'meadow', label: 'Meadow', hint: 'Connected meadow groups (2→3, 3→6, 4→10, 5+→15)' },
  { key: 'wolf', label: 'Wolf', hint: 'Most wolves vs opponents (12/8/4 pts)' },
  { key: 'fox', label: 'Fox', hint: '3 pts per fox not adjacent to bear or wolf' },
  { key: 'bear', label: 'Bear', hint: '2 pts per adjacent trout or bee' },
  { key: 'trout', label: 'Trout', hint: '2 pts per adjacent stream or dragonfly' },
  { key: 'dragonfly', label: 'Dragonfly', hint: 'Score = size of each adjacent stream group' },
  { key: 'bee', label: 'Bee', hint: '3 pts per adjacent meadow group' },
  { key: 'eagle', label: 'Eagle', hint: '2 pts per rabbit/trout within 2 straight-line spaces' },
  { key: 'deer', label: 'Deer', hint: '2 pts per row + 2 pts per column with deer' },
];

interface PlayerRanking {
  userId: string;
  name: string;
  score: ScoreBreakdown;
  rank: number;
}

function assignRanks(players: { userId: string; name: string; score: ScoreBreakdown }[]): PlayerRanking[] {
  const sorted = [...players].sort((a, b) => b.score.total - a.score.total);
  let rank = 1;
  return sorted.map((p, i) => {
    if (i > 0 && sorted[i - 1]!.score.total !== p.score.total) rank = i + 1;
    return { ...p, rank };
  });
}

export function EndGame({ gameId, user, onReturnHome, onNewGame }: EndGameProps) {
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getGameState(gameId, user.userId)
      .then(({ game, scores }) => {
        if (!scores) return;
        const players = game.players
          .filter((p) => !p.leftGame)
          .map((p) => ({ userId: p.userId, name: p.name, score: scores[p.userId]! }));
        setRankings(assignRanks(players));
      })
      .catch((e) => setError(e.message));
  }, [gameId, user.userId]);

  if (error) return <div className="page-content"><p className="text-error">{error}</p></div>;

  return (
    <div className="min-h-screen pb-8">
      <header className="card-header text-center">
        <h1>Game Over</h1>
      </header>

      <main className="page-content">
        <div className="space-stack-md">
          {rankings.map((player) => {
            const isMe = player.userId === user.userId;
            const isExpanded = expandedPlayer === player.userId;
            return (
              <div key={player.userId} className="card" style={{ border: isMe ? '2px solid var(--color-forest-600)' : undefined, overflow: 'hidden' }}>
                {/* Rank number banner */}
                <div style={{
                  backgroundColor: player.rank === 1 ? 'var(--color-forest-600)' : 'var(--color-sage-300)',
                  color: player.rank === 1 ? 'white' : 'var(--color-text-primary)',
                  textAlign: 'center',
                  padding: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                }}>
                  #{player.rank}
                </div>

                <button
                  className="card-button w-full p-4 flex items-center gap-4"
                  onClick={() => setExpandedPlayer(isExpanded ? null : player.userId)}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                >
                  <span className="flex-1">
                    <strong>{player.name}</strong>
                  </span>
                  <span style={{ fontWeight: 600 }}>{player.score.total} pts</span>
                </button>

                {isExpanded && (
                  <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid var(--color-border)' }}>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0' }}>Score breakdown</p>
                    {CATEGORIES.map(({ key, label, hint }) => {
                      const val = player.score[key];
                      return (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0.25rem 0', fontSize: '0.875rem' }}>
                          <div>
                            <span>{label}</span>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>{hint}</span>
                          </div>
                          <span style={{ fontWeight: 500, minWidth: '3rem', textAlign: 'right' }}>{val}</span>
                        </div>
                      );
                    })}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.875rem', borderTop: '1px solid var(--color-border)', marginTop: '0.25rem', color: player.score.diversityPenalty < 0 ? 'var(--color-error)' : undefined }}>
                      <div>
                        <span>Diversity penalty</span>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                          {player.score.diversityPenalty === 0 ? '≤3 zero categories' : player.score.diversityPenalty === -2 ? '4 zero categories' : player.score.diversityPenalty === -5 ? '5 zero categories' : '6+ zero categories'}
                        </span>
                      </div>
                      <span style={{ fontWeight: 500, minWidth: '3rem', textAlign: 'right' }}>{player.score.diversityPenalty}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0 0', fontSize: '0.875rem', borderTop: '1px solid var(--color-border)', marginTop: '0.25rem', fontWeight: 700 }}>
                      <span>Total</span>
                      <span style={{ minWidth: '3rem', textAlign: 'right' }}>{player.score.total}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 space-stack-sm">
          <button className="button-primary" onClick={onNewGame}>New Game</button>
          <button className="button-secondary" onClick={onReturnHome}>Return Home</button>
        </div>
      </main>
    </div>
  );
}
