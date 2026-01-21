import { useState } from 'react';
import { Mail } from 'lucide-react';

interface LandingProps {
  onEmailSubmit: (email: string) => void;
}

export function Landing({ onEmailSubmit }: LandingProps) {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onEmailSubmit(email.trim());
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-6">
          <div 
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="email" 
              className="block mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Email address
            </label>
            <div className="relative">
              <Mail 
                className="absolute left-3 top-1/2 -translate-y-1/2" 
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
                className="w-full pl-11 pr-4 py-3 rounded-lg border-2 transition-colors outline-none"
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
            className="w-full py-3 px-6 rounded-lg transition-all"
            style={{
              backgroundColor: 'var(--color-forest-600)',
              color: 'white',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-forest-700)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-forest-600)'}
          >
            Send login link
          </button>

          <p 
            className="text-sm text-center"
            style={{ color: 'var(--color-text-muted)' }}
          >
            No passwords. We'll email you a magic link.
          </p>
        </form>
      </div>
    </div>
  );
}
