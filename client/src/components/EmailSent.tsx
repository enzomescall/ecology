import { Mail, RefreshCw } from 'lucide-react';

interface EmailSentProps {
  email: string;
  onResend: () => void;
  onLogin: () => void;
}

export function EmailSent({ email, onResend, onLogin }: EmailSentProps) {
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
        <h1 className="mb-3">Check your email</h1>
        <p 
          className="mb-2 text-secondary"
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
          className="mb-8 text-sm text-muted"
        >
          Click the link in the email to sign in. The link will expire in 15 minutes.
        </p>

        {/* Resend Button */}
        <button
          onClick={onResend}
          className="button-ghost"
        >
          <RefreshCw size={16} />
          Resend link
        </button>

        {/* Demo: simulate login for prototype */}
        <div className="mt-8 pt-8" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p 
            className="text-sm mb-3 text-muted"
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
