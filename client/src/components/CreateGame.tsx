import { useState } from 'react';
import { ArrowLeft, Plus, X } from 'lucide-react';

interface CreateGameProps {
  user: { email: string; name: string };
  onBack: () => void;
  onCreate: (gameId: string) => void;
}

export function CreateGame({ user, onBack, onCreate }: CreateGameProps) {
  const [gameName, setGameName] = useState('');
  const [invites, setInvites] = useState<string[]>(['']);

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

  const handleCreate = () => {
    const validInvites = invites.filter(email => email.trim());
    if (validInvites.length > 0) {
      onCreate('new-game-' + Date.now());
    }
  };

  const canCreate = invites.some(email => email.trim());

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header 
        className="px-4 py-4 sticky top-0 z-10"
        style={{ 
          backgroundColor: 'var(--color-bg-card)',
          borderBottom: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
            style={{
              color: 'var(--color-forest-600)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-sage-200)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={24} />
          </button>
          <h2>Create game</h2>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 max-w-2xl mx-auto">
        <div className="space-y-6">
          {/* Game Name */}
          <div>
            <label 
              htmlFor="game-name" 
              className="block mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Game name (optional)
            </label>
            <input
              id="game-name"
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="e.g., Forest Friends"
              className="w-full px-4 py-3 rounded-lg border-2 transition-colors outline-none"
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
          <div>
            <label 
              className="block mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Invite players
            </label>
            <div className="space-y-3">
              {invites.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => updateInvite(index, e.target.value)}
                    placeholder="friend@example.com"
                    className="flex-1 px-4 py-3 rounded-lg border-2 transition-colors outline-none"
                    style={{
                      backgroundColor: 'var(--color-bg-card)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-border-focus)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                  />
                  {invites.length > 1 && (
                    <button
                      onClick={() => removeInviteField(index)}
                      className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors"
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
              className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
              style={{
                color: 'var(--color-forest-600)',
                backgroundColor: 'transparent',
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
            className="p-4 rounded-lg"
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
        </div>
      </main>

      {/* Bottom Action */}
      <div 
        className="fixed bottom-0 left-0 right-0 p-4"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderTop: '1px solid var(--color-border)',
          boxShadow: '0 -4px 6px -1px rgb(0 0 0 / 0.05)',
        }}
      >
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="w-full py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: canCreate ? 'var(--color-forest-600)' : 'var(--color-sage-400)',
              color: 'white',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={(e) => {
              if (canCreate) {
                e.currentTarget.style.backgroundColor = 'var(--color-forest-700)';
              }
            }}
            onMouseLeave={(e) => {
              if (canCreate) {
                e.currentTarget.style.backgroundColor = 'var(--color-forest-600)';
              }
            }}
          >
            Create game
          </button>
        </div>
      </div>
      <div className="h-20" /> {/* Spacer for fixed button */}
    </div>
  );
}
