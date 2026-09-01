'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

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
    setStatus(error ? 'error' : 'sent');
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl text-text mb-2">Huntboard</h1>
        <p className="text-muted mb-8">Sign in with a magic link. No password to remember.</p>

        {status === 'sent' ? (
          <p className="text-text bg-surface border border-border rounded p-4">
            Check <span className="text-accent">{email}</span> for the sign-in link.
          </p>
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
            {status === 'error' && (
              <p className="text-danger text-sm">Something went wrong. Try again.</p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
