import { useState, useEffect } from 'react';
import { getGameState } from '../services/gameApi';
import type { ScoreBreakdown } from '../services/gameApi';

interface EndGameProps {
  gameId: string;
  user: { userId: string; email: string; name: string };
  onReturnHome: () => void;
  onNewGame: () => void;
}

const CATEGORIES = ['stream', 'meadow', 'wolf', 'fox', 'bear', 'trout', 'dragonfly', 'bee', 'eagle', 'deer'] as const;

interface PlayerRanking {
  userId: string;
  name: string;
  score: ScoreBreakdown;
}

export function EndGame({ gameId, user, onReturnHome, onNewGame }: EndGameProps) {
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getGameState(gameId, user.userId)
      .then(({ game, scores }) => {
        if (!scores) return;
        const ranked = game.players
          .filter((p) => !p.leftGame)
          .map((p) => ({ userId: p.userId, name: p.name, score: scores[p.userId] }))
          .sort((a, b) => b.score.total - a.score.total);
        setRankings(ranked);
      })
      .catch((e) => setError(e.message));
  }, [gameId, user.userId]);

  const rankLabel = (i: number) => ['1st', '2nd', '3rd'][i] ?? `${i + 1}th`;

  if (error) return <div className="page-content"><p className="text-error">{error}</p></div>;

  return (
    <div className="min-h-screen pb-8">
      <header className="card-header text-center">
        <h1>Game Over</h1>
      </header>

      <main className="page-content">
        <h3 className="mb-4">Final Rankings</h3>

        <div className="space-stack-md">
          {rankings.map((player, i) => {
            const isMe = player.userId === user.userId;
            const isExpanded = expandedPlayer === player.userId;
            return (
              <div key={player.userId} className="card" style={{ border: isMe ? '2px solid var(--color-forest-600)' : undefined }}>
                <button
                  className="card-button w-full p-4 flex items-center gap-4"
                  onClick={() => setExpandedPlayer(isExpanded ? null : player.userId)}
                >
                  <span className="rank-badge" style={{ fontWeight: 'bold', minWidth: '2.5rem' }}>
                    {rankLabel(i)}
                  </span>
                  <span className="flex-1 text-left">
                    <strong>{player.name}</strong>{isMe && ' (you)'}
                  </span>
                  <span>{player.score.total} pts</span>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <p className="text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>Score breakdown</p>
                    {CATEGORIES.map((cat) => (
                      <div key={cat} className="flex justify-between text-sm py-1">
                        <span>{cat}</span>
                        <span>{player.score[cat]} pts</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm py-1" style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-error, red)' }}>
                      <span>diversity penalty</span>
                      <span>{player.score.diversityPenalty} pts</span>
                    </div>
                    <div className="flex justify-between text-sm py-1 font-bold" style={{ borderTop: '1px solid var(--color-border)' }}>
                      <span>total</span>
                      <span>{player.score.total} pts</span>
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
