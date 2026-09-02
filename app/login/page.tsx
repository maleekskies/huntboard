'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
    } else {
      setStatus('sent');
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-bg px-6 py-16">
      <div className="w-full max-w-md">
        <h1 className="font-display text-4xl text-text mb-3">
          Hunt<span className="text-accent">board</span>
        </h1>
        <p className="text-text text-lg mb-1">Roles scored against your profile.</p>
        <p className="text-muted mb-8">Nothing sends until you say so.</p>

        <ul className="flex flex-col gap-3 mb-8">
          <Fact label="Match" text="Every role gets a score and a reason." />
          <Fact label="Review" text="Gaps and talking points before you apply." />
          <Fact label="Send" text="You approve the kit." />
        </ul>

        {status === 'sent' ? (
          <div className="bg-surface border border-border rounded-lg p-4">
            <p className="text-text">
              Check <span className="text-accent">{email}</span> for the sign-in link.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-surface border border-border rounded px-4 py-3 text-text placeholder:text-muted focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="bg-accent text-bg font-medium rounded px-4 py-3 hover:bg-accentDim transition-colors disabled:opacity-50"
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
            {status === 'error' && errorMessage && (
              <p className="text-danger text-sm">{errorMessage}</p>
            )}
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-muted uppercase tracking-wide mb-3">What happens after sign-in</p>
          <ol className="text-sm text-muted flex flex-col gap-1.5">
            <li>1. You set target titles and must-haves</li>
            <li>2. Inbox fills with scored roles</li>
            <li>3. You review a kit, then send</li>
          </ol>
        </div>

        <p className="text-xs text-muted mt-8 text-center">Personal desk. Not a job board.</p>
      </div>
    </main>
  );
}

function Fact({ label, text }: { label: string; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="text-accent text-sm font-medium w-14 shrink-0">{label}</span>
      <span className="text-muted text-sm">{text}</span>
    </li>
  );
}
