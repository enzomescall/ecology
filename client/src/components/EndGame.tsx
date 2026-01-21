import { useState } from 'react';
import { Trophy, ChevronDown, ChevronUp, Home, Plus } from 'lucide-react';

interface PlayerScore {
  name: string;
  rank: number;
  totalScore: number;
  breakdown: {
    trees: number;
    animals: number;
    plants: number;
    bonus: number;
  };
}

interface EndGameProps {
  gameId: string;
  user: { email: string; name: string };
  onReturnHome: () => void;
  onNewGame: () => void;
}

const mockScores: PlayerScore[] = [
  {
    name: 'You',
    rank: 1,
    totalScore: 42,
    breakdown: { trees: 15, animals: 12, plants: 10, bonus: 5 },
  },
  {
    name: 'Jordan',
    rank: 2,
    totalScore: 38,
    breakdown: { trees: 12, animals: 14, plants: 8, bonus: 4 },
  },
  {
    name: 'Alex',
    rank: 3,
    totalScore: 35,
    breakdown: { trees: 10, animals: 11, plants: 12, bonus: 2 },
  },
];

export function EndGame({ gameId, user, onReturnHome, onNewGame }: EndGameProps) {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'var(--color-amber-500)';
    if (rank === 2) return 'var(--color-sage-600)';
    if (rank === 3) return 'var(--color-earth-500)';
    return 'var(--color-sage-400)';
  };

  const toggleExpanded = (name: string) => {
    setExpandedPlayer(expandedPlayer === name ? null : name);
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header 
        className="px-4 py-6 text-center"
        style={{ 
          backgroundColor: 'var(--color-bg-card)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div className="max-w-2xl mx-auto">
          <div 
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-amber-500)' }}
          >
            <Trophy size={32} color="white" />
          </div>
          <h1>Game Over</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Forest Friends
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 max-w-2xl mx-auto">
        <h3 className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          Final Rankings
        </h3>

        <div className="space-y-3">
          {mockScores.map((player) => {
            const isExpanded = expandedPlayer === player.name;
            return (
              <div
                key={player.name}
                className="rounded-xl overflow-hidden transition-all"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  border: '2px solid var(--color-border)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <button
                  onClick={() => toggleExpanded(player.name)}
                  className="w-full p-4 flex items-center gap-4 transition-colors"
                  style={{
                    backgroundColor: player.name === 'You' 
                      ? 'var(--color-sage-100)' 
                      : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (player.name !== 'You') {
                      e.currentTarget.style.backgroundColor = 'var(--color-sage-100)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (player.name !== 'You') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {/* Rank Badge */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: getRankColor(player.rank),
                      color: 'white',
                    }}
                  >
                    {player.rank === 1 && <Trophy size={24} />}
                    {player.rank !== 1 && <span>#{player.rank}</span>}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <h3>{player.name}</h3>
                      {player.name === 'You' && (
                        <span
                          className="px-2 py-0.5 rounded text-xs"
                          style={{
                            backgroundColor: 'var(--color-forest-600)',
                            color: 'white',
                          }}
                        >
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {player.totalScore} points
                    </p>
                  </div>

                  {/* Expand Icon */}
                  <div style={{ color: 'var(--color-sage-600)' }}>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>

                {/* Expanded Breakdown */}
                {isExpanded && (
                  <div 
                    className="px-4 pb-4 pt-2"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                  >
                    <p 
                      className="text-sm mb-3"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Score breakdown
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          Trees
                        </span>
                        <span className="text-sm">{player.breakdown.trees} pts</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          Animals
                        </span>
                        <span className="text-sm">{player.breakdown.animals} pts</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          Plants
                        </span>
                        <span className="text-sm">{player.breakdown.plants} pts</span>
                      </div>
                      <div 
                        className="flex justify-between items-center pt-2"
                        style={{ borderTop: '1px solid var(--color-border)' }}
                      >
                        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          Bonus
                        </span>
                        <span className="text-sm">{player.breakdown.bonus} pts</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-8 space-y-3">
          <button
            onClick={onNewGame}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg transition-all"
            style={{
              backgroundColor: 'var(--color-forest-600)',
              color: 'white',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-forest-700)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-forest-600)'}
          >
            <Plus size={20} />
            Start new game
          </button>
          <button
            onClick={onReturnHome}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg transition-colors"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--color-forest-600)',
              border: '2px solid var(--color-border)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-forest-600)';
              e.currentTarget.style.backgroundColor = 'var(--color-sage-100)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Home size={20} />
            Return home
          </button>
        </div>
      </main>
    </div>
  );
}
