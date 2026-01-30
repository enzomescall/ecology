import { useState } from 'react';
import { Mail, User } from 'lucide-react';

interface LandingProps {
  onEmailSubmit: (email: string) => void;
}

export function Landing({ onEmailSubmit }: LandingProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && name.trim()) {
      // Store name for next screen
      localStorage.setItem('playerName', name.trim());
      onEmailSubmit(email.trim());
    }
  };

  return (
    <div className="page-container">
      <div className="page-constraint">
        {/* Logo/Icon */}
        <div className="flex-center mb-6">
          <div 
            className="avatar avatar-lg"
            style={{ backgroundColor: 'var(--color-forest-600)' }}
          >
            <svg 
              width="48" 
              height="48" 
              viewBox="0 0 48 48" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M24 8L32 20H16L24 8Z" 
                fill="var(--color-sage-100)" 
                opacity="0.9"
              />
              <path 
                d="M24 16L30 26H18L24 16Z" 
                fill="var(--color-sage-200)" 
                opacity="0.8"
              />
              <path 
                d="M24 24L28 32H20L24 24Z" 
                fill="var(--color-sage-300)" 
                opacity="0.7"
              />
              <rect 
                x="22" 
                y="32" 
                width="4" 
                height="8" 
                fill="var(--color-earth-500)"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="mb-3">Ecosystem</h1>
          <p 
            className="text-lg"
            style={{ color: 'var(--color-text-muted)' }}
          >
            An async nature-themed drafting game for friends
          </p>
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

          <button
            type="submit"
            disabled={!email.trim() || !name.trim()}
            className="button-primary mt-8 mb-8"
            style={{
              opacity: (!email.trim() || !name.trim()) ? 0.5 : 1,
              cursor: (!email.trim() || !name.trim()) ? 'not-allowed' : 'pointer',
            }}
          >
            Continue
          </button>

          <p 
            className="text-sm text-center text-muted"
          >
            No passwords. We'll verify your email with a magic link.
          </p>
        </form>
      </div>
    </div>
  );
}
