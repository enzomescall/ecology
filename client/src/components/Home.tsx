import { Plus, LogIn, User } from 'lucide-react';

interface Game {
  id: string;
  name: string;
  playerCount: number;
  status: 'your-turn' | 'waiting' | 'finished';
  players: string[];
}

interface HomeProps {
  user: { email: string; name: string };
  onCreateGame: () => void;
  onJoinGame: (gameId: string) => void;
}

// Mock data
const mockGames: Game[] = [
  {
    id: 'game-1',
    name: 'Forest Friends',
    playerCount: 3,
    status: 'your-turn',
    players: ['You', 'Alex', 'Jordan'],
  },
  {
    id: 'game-2',
    name: 'Sunday Game',
    playerCount: 4,
    status: 'waiting',
    players: ['You', 'Sam', 'Riley', 'Morgan'],
  },
  {
    id: 'game-3',
    name: 'Quick Match',
    playerCount: 2,
    status: 'waiting',
    players: ['You', 'Taylor'],
  },
  {
    id: 'game-4',
    name: 'Champions League',
    playerCount: 4,
    status: 'finished',
    players: ['You', 'Casey', 'Drew', 'Blake'],
  },
];

export function Home({ user, onCreateGame, onJoinGame }: HomeProps) {
  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header 
        className="px-4 py-4 sticky top-0 z-10"
        style={{ 
          backgroundColor: 'var(--color-bg-card)',
          borderBottom: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="max-w-2xl mx-auto flex-between">
          <div>
            <h2>Ecosystem</h2>
          </div>
          <div 
            className="avatar avatar-sm"
            style={{ backgroundColor: 'var(--color-forest-600)', color: 'white' }}
          >
            <span className="text-sm">{getInitials(user.name)}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="page-content">
        {/* Action Buttons */}
        <div className="grid-2col mb-6">
          <button
            onClick={onCreateGame}
            className="button-primary"
          >
            <Plus size={20} />
            Create game
          </button>
          <button
            className="button-secondary"
          >
            <LogIn size={20} />
            Join game
          </button>
        </div>

        {/* Games List */}
        <div>
          <h3 className="mb-4 text-secondary">
            Your games
          </h3>
          <div className="space-stack-sm">
            {mockGames.map((game) => (
              <button
                key={game.id}
                onClick={() => onJoinGame(game.id)}
                className="card card-button"
              >
                <div className="flex-start justify-between mb-3">
                  <div>
                    <h3>{game.name}</h3>
                    <p 
                      className="text-sm text-muted"
                    >
                      {game.playerCount} players
                    </p>
                  </div>
                  {game.status === 'your-turn' && (
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: 'var(--color-success)',
                        color: 'white',
                      }}
                    >
                      <span 
                        className="status-badge-pulse"
                        style={{ backgroundColor: 'white' }}
                      />
                      Your turn
                    </span>
                  )}
                  {game.status === 'waiting' && (
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: 'var(--color-sage-200)',
                        color: 'var(--color-forest-700)',
                      }}
                    >
                      Waiting
                    </span>
                  )}
                  {game.status === 'finished' && (
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: 'var(--color-earth-400)',
                        color: 'white',
                      }}
                    >
                      Finished
                    </span>
                  )}
                </div>

                {/* Player Avatars */}
                <div className="avatar-row">
                  {game.players.map((player, idx) => (
                    <div
                      key={idx}
                      className="avatar avatar-xs"
                      style={{
                        backgroundColor: player === 'You' 
                          ? 'var(--color-forest-600)' 
                          : 'var(--color-sage-400)',
                        color: 'white',
                      }}
                    >
                      {getInitials(player)}
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
