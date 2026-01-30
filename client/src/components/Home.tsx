import { Plus, LogIn, User, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { User as UserType } from '../App';
import type { Game } from '../services/gameApi';

interface GameDisplay {
  game: Game;
  status: 'your-turn' | 'waiting' | 'finished';
}

interface HomeProps {
  user: UserType;
  onCreateGame: () => void;
  onJoinGame: (gameId: string) => void;
}

export function Home({ user, onCreateGame, onJoinGame }: HomeProps) {
  const [games, setGames] = useState<GameDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editedName, setEditedName] = useState(user.name);
  const [isSaving, setIsSaving] = useState(false);

  const fetchGames = async () => {
    setIsLoading(true);
    try {
      const url = `http://localhost:4000/api/game/user-games?userId=${encodeURIComponent(user.userId)}`;
      console.log('Fetching games from:', url);
      const response = await fetch(url);
      const gamesList = await response.json();
      console.log('Games response:', gamesList);
      if (response.ok && Array.isArray(gamesList)) {
        setGames(gamesList.map((game: Game) => {
          let status: 'your-turn' | 'waiting' | 'finished';
          
          if (game.status === 'finished') {
            status = 'finished';
          } else if (game.status === 'lobby') {
            status = 'waiting';
          } else if (game.status === 'active') {
            const currentPlayer = game.players[game.currentPlayerIndex];
            status = currentPlayer?.userId === user.userId ? 'your-turn' : 'waiting';
          } else {
            status = 'waiting';
          }
          
          return { game, status };
        }));
      } else {
        console.error('Response not ok or not array:', response.ok, Array.isArray(gamesList));
      }
    } catch (err) {
      console.error('Failed to fetch games:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 30000);
    return () => clearInterval(interval);
  }, [user.userId]);

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen pb-8">
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchGames()}
              className="button-icon"
              style={{ color: 'var(--color-forest-600)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-sage-200)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <RefreshCw size={20} />
            </button>
            <button
              onClick={() => setShowUserModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.5rem',
                backgroundColor: 'var(--color-forest-600)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 'bold',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-forest-700)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-forest-600)'}
              title="User profile"
            >
              {getInitials(user.name)}
            </button>
          </div>
        </div>
      </header>

      <main className="page-content">
        <div className="grid-2col mb-6">
          <button
            onClick={onCreateGame}
            className="button-primary"
          >
            <Plus size={20} />
            Create game
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="button-secondary"
          >
            <LogIn size={20} />
            Join game
          </button>
        </div>

        <div>
          <h3 className="mb-4 text-secondary">
            Your games
          </h3>
          {isLoading ? (
            <p>Loading games...</p>
          ) : games.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>
              No active games. Create or join one to get started!
            </p>
          ) : (
            <div className="space-stack-md">
              {games.map(({ game, status }) => (
                <button
                  key={game.id}
                  onClick={() => onJoinGame(game.id)}
                  style={{
                    padding: '1rem',
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ marginBottom: '0.25rem' }}>{game.name}</h3>
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                        {game.players.length} player{game.players.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        backgroundColor: 
                          status === 'your-turn' ? 'var(--color-success)' :
                          status === 'finished' ? 'var(--color-sage-300)' :
                          'var(--color-sky-100)',
                        color: 
                          status === 'finished' ? 'var(--color-text-primary)' :
                          status === 'your-turn' ? 'white' :
                          'var(--color-sky-800)',
                      }}
                    >
                      {status === 'your-turn' && <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', backgroundColor: 'white', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />}
                      <span>
                        {status === 'your-turn' ? 'Your turn' :
                         status === 'finished' ? 'Finished' :
                         'Waiting'}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {game.players.map((player) => (
                      <div
                        key={player.userId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '2rem',
                          height: '2rem',
                          borderRadius: '0.5rem',
                          backgroundColor: player.userId === user.userId 
                            ? 'var(--color-forest-600)' 
                            : 'var(--color-sky-500)',
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                        }}
                        title={player.name}
                      >
                        {player.name.slice(0, 2).toUpperCase()}
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Join Game - Not Supported Modal */}
      {showJoinModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(26, 46, 26, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setShowJoinModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-bg-card)',
              borderRadius: '0.75rem',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              padding: '1.5rem',
              maxWidth: '28rem',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 
              style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: 'var(--color-text-primary)',
              }}
            >
              Join Game
            </h2>
            <p 
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-muted)',
                marginBottom: '1.5rem',
                lineHeight: '1.5',
              }}
            >
              This functionality is not supported yet.
            </p>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setShowJoinModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  color: 'white',
                  backgroundColor: 'var(--color-forest-600)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-forest-700)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-forest-600)'}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showUserModal && !showLogoutConfirm && !showDeleteConfirm && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(26, 46, 26, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setShowUserModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-bg-card)',
              borderRadius: '0.75rem',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              padding: '1.5rem',
              maxWidth: '28rem',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 
              style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: 'var(--color-text-primary)',
              }}
            >
              Account
            </h2>

            {/* Name Field */}
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  marginBottom: '0.5rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Name
              </label>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'var(--color-bg-primary)',
                }}
              />
            </div>

            {/* Email Field */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  marginBottom: '0.5rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                  color: 'var(--color-text-muted)',
                  backgroundColor: 'var(--color-sage-100)',
                  cursor: 'not-allowed',
                }}
              />
            </div>

            {/* Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'space-between',
              }}
            >
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSaving}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: `1px solid var(--color-error)`,
                  color: 'var(--color-error)',
                  backgroundColor: 'transparent',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.5 : 1,
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
                onMouseEnter={(e) => !isSaving && (e.currentTarget.style.backgroundColor = 'rgba(184, 93, 58, 0.1)')}
                onMouseLeave={(e) => !isSaving && (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Delete Account
              </button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  disabled={isSaving}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: `1px solid var(--color-border)`,
                    color: 'var(--color-text-secondary)',
                    backgroundColor: 'transparent',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.5 : 1,
                    fontSize: '0.875rem',
                    fontWeight: '500',
                  }}
                  onMouseEnter={(e) => !isSaving && (e.currentTarget.style.backgroundColor = 'var(--color-sage-100)')}
                  onMouseLeave={(e) => !isSaving && (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(26, 46, 26, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 51,
          }}
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-bg-card)',
              borderRadius: '0.75rem',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              padding: '1.5rem',
              maxWidth: '28rem',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 
              style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: 'var(--color-text-primary)',
              }}
            >
              Log Out?
            </h2>
            <p 
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-muted)',
                marginBottom: '1.5rem',
                lineHeight: '1.5',
              }}
            >
              You'll have to log back in with your email.
            </p>
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isSaving}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: `1px solid var(--color-border)`,
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'transparent',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.5 : 1,
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
                onMouseEnter={(e) => !isSaving && (e.currentTarget.style.backgroundColor = 'var(--color-sage-100)')}
                onMouseLeave={(e) => !isSaving && (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('gameUser');
                  location.reload();
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  color: 'white',
                  backgroundColor: 'var(--color-forest-600)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-forest-700)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-forest-600)'}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(26, 46, 26, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 51,
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--color-bg-card)',
              borderRadius: '0.75rem',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              padding: '1.5rem',
              maxWidth: '28rem',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 
              style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: 'var(--color-error)',
              }}
            >
              Delete Account?
            </h2>
            <p 
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-muted)',
                marginBottom: '1.5rem',
                lineHeight: '1.5',
              }}
            >
              You will lose all games associated to this email.
            </p>
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSaving}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: `1px solid var(--color-border)`,
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'transparent',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.5 : 1,
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
                onMouseEnter={(e) => !isSaving && (e.currentTarget.style.backgroundColor = 'var(--color-sage-100)')}
                onMouseLeave={(e) => !isSaving && (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('gameUser');
                  location.reload();
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  color: 'white',
                  backgroundColor: 'var(--color-error)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a85030'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-error)'}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
