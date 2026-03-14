import { Plus, LogIn, RefreshCw, EyeOff, Eye, Search, BarChart2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { User as UserType } from '../App';
import type { GameSummary as Game } from '../services/gameApi';
import { getInvites, acceptInvite, declineInvite, getUserGames } from '../services/gameApi';
import type { Invite } from '../services/gameApi';
import { HowToPlayModal, HelpButton } from './HowToPlayModal';

type GameStatus = 'waiting' | 'active' | 'finished' | 'all-left';

interface GameDisplay {
  game: Game;
  status: GameStatus;
}

interface HomeProps {
  user: UserType;
  onCreateGame: () => void;
  onJoinGame: (gameId: string) => void;
  onAnalytics: () => void;
}

function getGameStatus(game: Game): GameStatus {
  if (game.status === 'finished') return 'finished';
  if (game.status === 'active') return 'active';
  if (game.players.every(p => p.leftGame)) return 'all-left';
  return 'waiting';
}

const STATUS_STYLES: Record<GameStatus, { bg: string; color: string; label: string }> = {
  waiting: { bg: 'var(--color-sky-100)', color: 'var(--color-sky-800)', label: 'Waiting' },
  active: { bg: '#dcfce7', color: '#166534', label: 'Active' },
  finished: { bg: 'var(--color-sage-300)', color: 'var(--color-text-primary)', label: 'Finished' },
  'all-left': { bg: '#fef3c7', color: '#92400e', label: 'Abandoned' },
};

export function Home({ user, onCreateGame, onJoinGame, onAnalytics }: HomeProps) {
  const [games, setGames] = useState<GameDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editedName, setEditedName] = useState(user.name);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [hideFinished, setHideFinished] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchGames = async () => {
    setIsLoading(true);
    try {
      const gamesList = await getUserGames(user.userId);
      setGames(gamesList.map((game: Game) => ({
        game,
        status: getGameStatus(game),
      })));
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvites = async () => {
    try {
      const list = await getInvites(user.email);
      setInvites(list);
    } catch {
      // ignore
    }
  };

  const handleAcceptInvite = async (invite: Invite) => {
    try {
      await acceptInvite(invite.id, user.userId, user.email, user.name);
      await fetchInvites();
      await fetchGames();
    } catch (err) {
      console.error('Failed to accept invite:', err);
    }
  };

  const handleDeclineInvite = async (invite: Invite) => {
    try {
      await declineInvite(invite.id);
      await fetchInvites();
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchGames();
    fetchInvites();
    const interval = setInterval(() => { fetchGames(); fetchInvites(); }, 30000);
    return () => clearInterval(interval);
  }, [user.userId]);

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const filteredGames = games.filter(({ game, status }) => {
    if (hideFinished && (status === 'finished' || status === 'all-left')) return false;
    if (searchQuery && game.name !== searchQuery) return false;
    return true;
  });

  const inactiveStatuses: GameStatus[] = ['finished', 'all-left'];

  return (
    <div className="min-h-screen pb-8">
      <header className="page-header">
        <div className="page-header-content">
          <h2>Ecosystem</h2>
          <div className="flex-between" style={{ gap: '0.5rem' }}>
            <HelpButton onClick={() => setShowHowToPlay(true)} />
            <button
              onClick={() => fetchGames()}
              className="button-icon"
              style={{ color: 'var(--color-forest-600)' }}
            >
              <RefreshCw size={20} />
            </button>
            <button
              onClick={onAnalytics}
              className="button-icon"
              style={{ color: 'var(--color-forest-600)' }}
              title="Analytics"
            >
              <BarChart2 size={20} />
            </button>
            <button
              onClick={() => setShowUserModal(true)}
              className="avatar-sm"
              style={{ backgroundColor: 'var(--color-forest-600)', color: 'white', border: 'none', cursor: 'pointer' }}
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

        {/* Pending Invites */}
        {invites.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-secondary">Pending invites</h3>
            <div className="space-stack-sm">
              {invites.map(invite => (
                <div
                  key={invite.id}
                  style={{
                    padding: '1rem',
                    backgroundColor: 'var(--color-sage-100)',
                    border: '1px solid var(--color-sage-300)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{invite.gameName}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                      Invited by {invite.invitedByName}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleAcceptInvite(invite)}
                      className="button-primary"
                      style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineInvite(invite)}
                      className="button-secondary"
                      style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="text-secondary" style={{ margin: 0 }}>Your games</h3>
            <button
              onClick={() => setHideFinished(!hideFinished)}
              className="button-ghost"
              style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', gap: '0.25rem', color: 'var(--color-text-muted)' }}
            >
              {hideFinished ? <Eye size={14} /> : <EyeOff size={14} />}
              {hideFinished ? 'Show inactive' : 'Hide inactive'}
            </button>
          </div>

          {/* Search Bar */}
          <div style={{ marginBottom: '1rem', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by game name..."
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem 0.625rem 2.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                color: 'var(--color-text-primary)',
                backgroundColor: 'var(--color-bg-primary)',
              }}
            />
          </div>

          {isLoading ? (
            <p>Loading games...</p>
          ) : filteredGames.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>
              {searchQuery ? 'No games match that name.' : 'No active games. Create or join one to get started!'}
            </p>
          ) : (
            <div className="space-stack-md">
              {filteredGames.map(({ game, status }) => {
                const statusStyle = STATUS_STYLES[status];
                const isInactive = inactiveStatuses.includes(status);
                return (
                  <button
                    key={game.id}
                    onClick={() => onJoinGame(game.id)}
                    style={{
                      padding: '1rem',
                      backgroundColor: 'var(--color-bg-card)',
                      border: `1px solid ${isInactive ? 'var(--color-border)' : status === 'active' ? '#86efac' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-lg)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      opacity: isInactive ? 0.7 : 1,
                      borderLeftWidth: '4px',
                      borderLeftColor: status === 'active' ? '#22c55e' : status === 'waiting' ? 'var(--color-sky-500)' : status === 'all-left' ? '#f59e0b' : 'var(--color-sage-300)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ marginBottom: '0.25rem' }}>{game.name}</h3>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                          {game.players.length} player{game.players.length !== 1 ? 's' : ''}
                          {status === 'active' && ` · Round ${game.round}, Turn ${game.turn}`}
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
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.color,
                        }}
                      >
                        <span>{statusStyle.label}</span>
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
                            backgroundColor: player.leftGame
                              ? 'var(--color-sage-300)'
                              : player.userId === user.userId
                                ? 'var(--color-forest-600)'
                                : 'var(--color-sky-500)',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            opacity: player.leftGame ? 0.5 : 1,
                          }}
                          title={`${player.name}${player.leftGame ? ' (left)' : ''}`}
                        >
                          {player.name.slice(0, 2).toUpperCase()}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
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
                disabled={false}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: `1px solid var(--color-error)`,
                  color: 'var(--color-error)',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(184, 93, 58, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Delete Account
              </button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: `1px solid var(--color-border)`,
                    color: 'var(--color-text-secondary)',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-sage-100)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: `1px solid var(--color-border)`,
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-sage-100)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: `1px solid var(--color-border)`,
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-sage-100)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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

      {/* How to Play Modal */}
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </div>
  );
}
