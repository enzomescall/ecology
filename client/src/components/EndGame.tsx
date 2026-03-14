import { useState, useEffect } from 'react';
import { getGameState } from '../services/gameApi';
import type { ScoreBreakdown, PlacedCard, CardType } from '../services/gameApi';
import { computeCardScores } from '../services/cardScoring';
import type { CardScore } from '../services/cardScoring';
import { CardTile } from './CardTile';

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
  ecosystem: PlacedCard[];
}

function assignRanks(players: { userId: string; name: string; score: ScoreBreakdown }[]): PlayerRanking[] {
  const sorted = [...players].sort((a, b) => b.score.total - a.score.total);
  let rank = 1;
  return sorted.map((p, i) => {
    if (i > 0 && sorted[i - 1]!.score.total !== p.score.total) rank = i + 1;
    return { ...p, rank, ecosystem: [] };
  });
}

interface EcosystemBoardProps {
  ecosystem: PlacedCard[];
  cardScores: Map<string, CardScore>;
}

function EcosystemBoard({ ecosystem, cardScores }: EcosystemBoardProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  if (ecosystem.length === 0) return <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>No cards placed</p>;

  // Find grid bounds
  const minX = Math.min(...ecosystem.map(p => p.coord.x));
  const maxX = Math.max(...ecosystem.map(p => p.coord.x));
  const minY = Math.min(...ecosystem.map(p => p.coord.y));
  const maxY = Math.max(...ecosystem.map(p => p.coord.y));

  const cols = maxX - minX + 1;
  const rows = maxY - minY + 1;

  const grid: (PlacedCard | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (const p of ecosystem) {
    grid[p.coord.y - minY]![p.coord.x - minX] = p;
  }

  const cardKey = (x: number, y: number) => `${x + minX},${y + minY}`;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 2,
        width: 'fit-content',
      }}>
        {grid.map((row, y) =>
          row.map((cell, x) => {
            const key = cardKey(x, y);
            const isHovered = hoveredCard === key;
            return (
              <div
                key={key}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: cell ? undefined : 'var(--color-bg-primary)',
                  border: cell ? `1px solid ${isHovered ? 'var(--color-forest-600)' : 'var(--color-border)'}` : '1px dashed var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: cell ? 'pointer' : undefined,
                  transition: 'border-color 0.15s',
                  position: 'relative',
                }}
                onMouseEnter={() => cell && setHoveredCard(key)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {cell && <CardTile type={cell.card.type} size="sm" />}
              </div>
            );
          })
        )}
      </div>

      {/* Tooltip */}
      {hoveredCard && (() => {
        const [hx, hy] = hoveredCard.split(',').map(Number);
        const cell = ecosystem.find(p => p.coord.x === hx && p.coord.y === hy);
        if (!cell) return null;
        const score = cardScores.get(hoveredCard);
        if (!score) return null;

        return (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 8,
            padding: '0.625rem 0.75rem',
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 10,
            minWidth: 200,
            maxWidth: 280,
          }}>
            <p style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.375rem', textTransform: 'capitalize' }}>
              {cell.card.type}
            </p>
            {score.selfPoints > 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--color-forest-600)', fontWeight: 600, marginBottom: '0.25rem' }}>
                Earns: {score.selfPoints} pts
              </p>
            )}
            {score.breakdown.length > 0 && (
              <div style={{ marginBottom: score.givesTo.length > 0 ? '0.25rem' : 0 }}>
                {score.breakdown.map((b, i) => (
                  <p key={i} style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{b}</p>
                ))}
              </div>
            )}
            {score.givesTo.length > 0 && (
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.25rem', marginTop: '0.25rem' }}>
                <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.125rem' }}>Gives to others:</p>
                {score.givesTo.map((g, i) => (
                  <p key={i} style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{g}</p>
                ))}
              </div>
            )}
            {score.selfPoints === 0 && score.breakdown.length === 0 && score.givesTo.length === 0 && (
              <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>No points</p>
            )}
          </div>
        );
      })()}
    </div>
  );
}

export function EndGame({ gameId, user, onReturnHome, onNewGame }: EndGameProps) {
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [showBoard, setShowBoard] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getGameState(gameId, user.userId)
      .then(({ game, scores, ecosystem, opponentEcosystems }) => {
        if (!scores) return;
        const players = game.players
          .filter((p) => !p.leftGame)
          .map((p) => ({ userId: p.userId, name: p.name, score: scores[p.userId]! }));
        const ranked = assignRanks(players);
        // Attach ecosystems
        for (const r of ranked) {
          if (r.userId === user.userId) {
            r.ecosystem = ecosystem;
          } else {
            // Find opponent ecosystem by userId
            r.ecosystem = opponentEcosystems[r.userId] ?? [];
          }
        }
        setRankings(ranked);
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
            const isBoardVisible = showBoard === player.userId;
            const cardScores = computeCardScores(player.ecosystem);
            return (
              <div key={player.userId} className="card" style={{ border: isMe ? '2px solid var(--color-forest-600)' : undefined }}>
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
                    {isMe && <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> (you)</span>}
                  </span>
                  <span style={{ fontWeight: 600 }}>{player.score.total} pts</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{isExpanded ? '▲' : '▼'}</span>
                </button>
                {!isExpanded && (
                  <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--color-text-muted)', padding: '0 0 0.5rem', margin: 0, cursor: 'pointer' }}
                    onClick={() => setExpandedPlayer(player.userId)}>
                    Click for score breakdown
                  </p>
                )}

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

                    {/* Board toggle */}
                    <button
                      onClick={() => setShowBoard(isBoardVisible ? null : player.userId)}
                      style={{
                        width: '100%',
                        marginTop: '0.75rem',
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-bg-primary)',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {isBoardVisible ? 'Hide Board' : 'View Board'}
                    </button>

                    {isBoardVisible && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                          Hover over cards to see scoring details
                        </p>
                        <EcosystemBoard ecosystem={player.ecosystem} cardScores={cardScores} />
                      </div>
                    )}
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
