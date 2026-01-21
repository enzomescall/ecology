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
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h2>Ecosystem</h2>
          </div>
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-forest-600)', color: 'white' }}
          >
            <span className="text-sm">{getInitials(user.name)}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 max-w-2xl mx-auto">
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={onCreateGame}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all"
            style={{
              backgroundColor: 'var(--color-forest-600)',
              color: 'white',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-forest-700)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-forest-600)'}
          >
            <Plus size={20} />
            Create game
          </button>
          <button
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              color: 'var(--color-forest-600)',
              border: '2px solid var(--color-border)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-forest-600)';
              e.currentTarget.style.backgroundColor = 'var(--color-sage-100)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.backgroundColor = 'var(--color-bg-card)';
            }}
          >
            <LogIn size={20} />
            Join game
          </button>
        </div>

        {/* Games List */}
        <div>
          <h3 className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            Your games
          </h3>
          <div className="space-y-3">
            {mockGames.map((game) => (
              <button
                key={game.id}
                onClick={() => onJoinGame(game.id)}
                className="w-full text-left p-4 rounded-lg transition-all"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  border: '2px solid var(--color-border)',
                  boxShadow: 'var(--shadow-sm)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-sage-400)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3>{game.name}</h3>
                    <p 
                      className="text-sm"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {game.playerCount} players
                    </p>
                  </div>
                  {game.status === 'your-turn' && (
                    <span
                      className="px-3 py-1 rounded-full text-sm inline-flex items-center gap-1"
                      style={{
                        backgroundColor: 'var(--color-success)',
                        color: 'white',
                      }}
                    >
                      <span 
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: 'white' }}
                      />
                      Your turn
                    </span>
                  )}
                  {game.status === 'waiting' && (
                    <span
                      className="px-3 py-1 rounded-full text-sm"
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
                      className="px-3 py-1 rounded-full text-sm"
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
                <div className="flex gap-2">
                  {game.players.map((player, idx) => (
                    <div
                      key={idx}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
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
