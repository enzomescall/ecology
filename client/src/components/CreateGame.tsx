import { useState } from 'react';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { createGame } from '../services/gameApi';
import type { User } from '../App';

interface CreateGameProps {
  user: User;
  onBack: () => void;
  onCreate: (gameId: string) => void;
}

export function CreateGame({ user, onBack, onCreate }: CreateGameProps) {
  const [gameName, setGameName] = useState('');
  const [invites, setInvites] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const addInviteField = () => {
    setInvites([...invites, '']);
  };

  const removeInviteField = (index: number) => {
    setInvites(invites.filter((_, i) => i !== index));
  };

  const updateInvite = (index: number, value: string) => {
    const newInvites = [...invites];
    newInvites[index] = value;
    setInvites(newInvites);
  };

  const handleCreate = async () => {
    setError('');
    setIsLoading(true);
    
    // Check if we have at least 2 players (host + at least 1 invite)
    const validInvites = invites.filter(email => email.trim());
    if (validInvites.length === 0) {
      setError('Add at least one player invite to create a game');
      setIsLoading(false);
      return;
    }
    
    try {
      const game = await createGame(
        user.userId,
        user.email,
        user.name,
        gameName || undefined,
        validInvites
      );
      onCreate(game.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
      setIsLoading(false);
    }
  };

  const validInvites = invites.filter(email => email.trim());
  const canCreate = validInvites.length > 0; // Require at least one invite to start with 2 players

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="page-header">
        <div className="page-header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={onBack}
              className="button-icon button-icon-sm"
              style={{ color: 'var(--color-forest-600)' }}
            >
              <ArrowLeft size={20} />
            </button>
            <h2 style={{ margin: 0 }}>Create game</h2>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="page-content">
        <div className="space-stack-lg">
          {/* Game Name */}
          <div className="form-group">
            <label 
              htmlFor="game-name" 
              className="form-label"
            >
              Game name (optional)
            </label>
            <input
              id="game-name"
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="e.g., Forest Friends"
              className="form-input"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-border-focus)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
            />
            <p 
              className="text-sm mt-2"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Leave blank for an auto-generated name
            </p>
          </div>

          {/* Invite Players */}
          <div className="form-group">
            <label 
              className="form-label"
            >
              Invite players
            </label>
            <div className="space-stack-sm">
              {invites.map((email, index) => (
                <div key={index} style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateInvite(index, e.target.value)}
                    placeholder="friend@example.com"
                    className="form-input"
                    style={{ flex: 1 }}
                  />
                  {invites.length > 1 && (
                    <button
                      onClick={() => removeInviteField(index)}
                      className="button-icon"
                      style={{
                        color: 'var(--color-error)',
                        border: '2px solid var(--color-border)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-error)';
                        e.currentTarget.style.backgroundColor = 'var(--color-sage-100)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addInviteField}
              className="button-ghost mt-3"
              style={{
                color: 'var(--color-forest-600)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-sage-100)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Plus size={20} />
              Add another player
            </button>
          </div>

          {/* Info Box */}
          <div 
            className="card"
            style={{ 
              backgroundColor: 'var(--color-sage-100)',
              border: '1px solid var(--color-sage-300)',
            }}
          >
            <p 
              className="text-sm"
              style={{ color: 'var(--color-forest-700)' }}
            >
              Players will receive an email invitation with a link to join your game.
              They'll need to sign in to play.
            </p>
          </div>

          {error && (
            <div 
              className="p-4 rounded-lg mt-4"
              style={{ 
                backgroundColor: 'var(--color-error-light)',
                color: 'var(--color-error)',
              }}
            >
              {error}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Action */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '1rem',
          backgroundColor: 'rgba(255,255,255,0.85)',
          backdropFilter: 'saturate(160%) blur(12px)',
          WebkitBackdropFilter: 'saturate(160%) blur(12px)',
          borderTop: '1px solid var(--color-border)',
          boxShadow: '0 -8px 24px -18px rgba(20,39,26,0.4)',
        }}
      >
        <div style={{ maxWidth: '42rem', margin: '0 auto' }}>
          <button
            onClick={handleCreate}
            disabled={!canCreate || isLoading}
            className="button-primary"
          >
            {isLoading ? 'Creating...' : 'Create game'}
          </button>
        </div>
      </div>
      <div style={{ height: '5rem' }} /> {/* Spacer for fixed button */}
    </div>
  );
}
