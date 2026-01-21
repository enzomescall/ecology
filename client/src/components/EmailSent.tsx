import { Mail, RefreshCw } from 'lucide-react';

interface EmailSentProps {
  email: string;
  onResend: () => void;
  onLogin: () => void;
}

export function EmailSent({ email, onResend, onLogin }: EmailSentProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-sage-200)' }}
          >
            <Mail size={40} style={{ color: 'var(--color-forest-600)' }} />
          </div>
        </div>

        {/* Message */}
        <h1 className="mb-3">Check your email</h1>
        <p 
          className="mb-2"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          We've sent a login link to:
        </p>
        <p 
          className="mb-6"
          style={{ color: 'var(--color-forest-600)' }}
        >
          {email}
        </p>
        <p 
          className="text-sm mb-8"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Click the link in the email to sign in. The link will expire in 15 minutes.
        </p>

        {/* Resend Button */}
        <button
          onClick={onResend}
          className="inline-flex items-center gap-2 px-6 py-2 rounded-lg transition-colors"
          style={{
            color: 'var(--color-forest-600)',
            border: '2px solid var(--color-border)',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-forest-600)';
            e.currentTarget.style.backgroundColor = 'var(--color-sage-100)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <RefreshCw size={16} />
          Resend link
        </button>

        {/* Demo: simulate login for prototype */}
        <div className="mt-8 pt-8" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p 
            className="text-sm mb-3"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Demo mode:
          </p>
          <button
            onClick={onLogin}
            className="text-sm px-4 py-2 rounded"
            style={{
              color: 'var(--color-sage-600)',
              textDecoration: 'underline',
            }}
          >
            Skip to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
