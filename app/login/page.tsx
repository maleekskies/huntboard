'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'busy' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('busy');
    setErrorMessage(null);
    const supabase = createClient();

    const { error } =
      mode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
      return;
    }

    window.location.href = '/';
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-bg px-6 py-16">
      <div className="w-full max-w-md">
        <h1 className="font-display text-4xl grad-text mb-3">Huntboard</h1>
        <p className="text-text text-lg mb-1">Roles scored against your profile.</p>
        <p className="text-muted mb-8">Nothing sends until you say so.</p>

        <ul className="flex flex-col gap-3 mb-8">
          <Fact label="Match" text="Every role gets a score and a reason." />
          <Fact label="Review" text="Gaps and talking points before you apply." />
          <Fact label="Send" text="You approve the kit." />
        </ul>

        <div className="flex gap-1 mb-4 bg-surface border border-border rounded-lg p-1">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
            }}
            className={`flex-1 text-sm py-2 rounded ${mode === 'signin' ? 'grad-bg text-bg font-medium' : 'text-muted'}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
            }}
            className={`flex-1 text-sm py-2 rounded ${mode === 'signup' ? 'grad-bg text-bg font-medium' : 'text-muted'}`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-surface border border-border rounded px-4 py-3 text-text placeholder:text-muted focus:outline-none focus:border-accent"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-surface border border-border rounded px-4 py-3 text-text placeholder:text-muted focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={status === 'busy'}
            className="grad-bg text-bg font-medium rounded px-4 py-3 hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {status === 'busy'
              ? mode === 'signup'
                ? 'Creating account…'
                : 'Signing in…'
              : mode === 'signup'
                ? 'Create account'
                : 'Sign in'}
          </button>
          {status === 'error' && errorMessage && <p className="text-danger text-sm">{errorMessage}</p>}
        </form>

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
