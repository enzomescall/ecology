import { useState } from 'react';
import { Mail, RefreshCw } from 'lucide-react';
import { verifyAuthCode } from '../services/gameApi';

interface EmailSentProps {
  email: string;
  onResend: () => void;
  onLogin: (user: { userId: string; email: string; name: string }) => void;
}

export function EmailSent({ email, onResend, onLogin }: EmailSentProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;

    setLoading(true);
    setError('');
    try {
      const user = await verifyAuthCode(email, code);
      localStorage.setItem('gameUser', JSON.stringify(user));
      onLogin(user);
    } catch {
      setError('Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-constraint text-center">
        {/* Icon */}
        <div className="flex-center mb-6">
          <div
            className="avatar avatar-lg"
            style={{ backgroundColor: 'var(--color-sage-200)' }}
          >
            <Mail size={40} style={{ color: 'var(--color-forest-600)' }} />
          </div>
        </div>

        {/* Message */}
        <h1 className="mb-3">Enter your code</h1>
        <p className="mb-2 text-secondary">
          We've sent a 6-digit code to:
        </p>
        <p className="mb-6" style={{ color: 'var(--color-forest-600)' }}>
          {email}
        </p>

        {/* Code Input */}
        <form onSubmit={handleVerify} className="form-group stacked">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="form-input text-center"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
              fontSize: '1.5rem',
              letterSpacing: '0.5rem',
            }}
            autoFocus
          />

          {error && (
            <p className="text-sm" style={{ color: 'var(--color-error, #dc2626)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={code.length !== 6 || loading}
            className="button-primary mt-4"
            style={{
              opacity: (code.length !== 6 || loading) ? 0.5 : 1,
              cursor: (code.length !== 6 || loading) ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        <p className="mb-8 mt-4 text-sm text-muted">
          The code will expire in 15 minutes.
        </p>

        {/* Resend Button */}
        <button onClick={onResend} className="button-ghost">
          <RefreshCw size={16} />
          Resend code
        </button>
      </div>
    </div>
  );
}
