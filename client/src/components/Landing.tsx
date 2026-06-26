import { useState } from 'react';
import { Mail, User } from 'lucide-react';
import { sendAuthCode } from '../services/gameApi';

interface LandingProps {
  onEmailSubmit: (email: string) => void;
}

export function Landing({ onEmailSubmit }: LandingProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;

    setLoading(true);
    setError('');
    try {
      localStorage.setItem('playerName', name.trim());
      await sendAuthCode(email.trim(), name.trim());
      onEmailSubmit(email.trim());
    } catch {
      setError('Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-card">
        {/* Logo/Icon */}
        <div className="flex-center mb-6">
          <div className="landing-logo">
            <svg
              width="52"
              height="52"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M24 6L33 20H15L24 6Z" fill="#eef7ee" opacity="0.95" />
              <path d="M24 15L31 27H17L24 15Z" fill="#dcecdc" opacity="0.9" />
              <path d="M24 23L29 33H19L24 23Z" fill="#cbe0cb" opacity="0.85" />
              <rect x="22" y="33" width="4" height="9" rx="1.2" fill="var(--color-earth-400)" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="mb-2">Ecology</h1>
          <p className="text-lg" style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            A nature-themed card game for friends
          </p>
        </div>

        {/* Decorative card showcase */}
        <div className="landing-card-fan" aria-hidden>
          {[
            ['🌊', '#5ba3e8', '#3a7bc4'],
            ['🌿', '#8ec84f', '#69a338'],
            ['🦊', '#f56a1f', '#d24e00'],
            ['🐻', '#8a6650', '#664636'],
            ['🦅', '#9e7d6b', '#7a5d4b'],
          ].map(([emoji, g1, g2], i) => {
            const offset = i - 2; // -2..2
            return (
              <span
                key={i}
                className="landing-card-chip"
                style={{
                  background: `linear-gradient(160deg, ${g1}, ${g2})`,
                  transform: `rotate(${offset * 6}deg) translateY(${Math.abs(offset) * 5}px)`,
                }}
              >
                {emoji}
              </span>
            );
          })}
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="form-group stacked">
          <div>
            <label 
              htmlFor="name" 
              className="form-label"
            >
              Your name
            </label>
            <div className="form-input-wrapper">
              <User 
                className="form-input-icon" 
                size={20}
                style={{ color: 'var(--color-sage-600)' }}
              />
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="form-input form-input-with-icon"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-border-focus)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
              />
            </div>
          </div>

          <div>
            <label 
              htmlFor="email" 
              className="form-label"
            >
              Email address
            </label>
            <div className="form-input-wrapper">
              <Mail 
                className="form-input-icon" 
                size={20}
                style={{ color: 'var(--color-sage-600)' }}
              />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="form-input form-input-with-icon"
                style={{
                  backgroundColor: 'var(--color-bg-card)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-border-focus)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: 'var(--color-error, #dc2626)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!email.trim() || !name.trim() || loading}
            className="button-primary mt-8 mb-8"
            style={{
              opacity: (!email.trim() || !name.trim() || loading) ? 0.5 : 1,
              cursor: (!email.trim() || !name.trim() || loading) ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Sending...' : 'Continue'}
          </button>

          <p
            className="text-sm text-center text-muted"
          >
            No passwords. We'll send you a one-time code.
          </p>
        </form>
      </div>
    </div>
  );
}
