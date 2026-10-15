'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Shows which account this device is signed in as, with a Sign out button.
// Everything in Huntboard is stored against the account, so two devices only
// show the same jobs and progress if they are signed in as the SAME email.
export default function AccountBar({ className = '' }: { className?: string }) {
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function signOut() {
    setBusy(true);
    await createClient().auth.signOut();
    window.location.href = '/login';
  }

  if (!email) return null;

  return (
    <div className={`text-xs ${className}`}>
      <p className="text-muted">Signed in as</p>
      <p className="text-text break-all mb-2">{email}</p>
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className="text-muted underline hover:text-text disabled:opacity-50"
      >
        {busy ? 'Signing out...' : 'Sign out'}
      </button>
    </div>
  );
}
