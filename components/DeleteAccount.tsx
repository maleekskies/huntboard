'use client';

import { useState } from 'react';

export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Couldn't delete the account (${res.status}).`);
        setBusy(false);
        return;
      }
      window.location.href = '/login';
    } catch {
      setError('Network error, nothing was deleted. Try again.');
      setBusy(false);
    }
  }

  return (
    <div className="mt-10 pt-8 border-t border-border">
      <h2 className="text-sm font-medium text-text mb-1">Your data</h2>
      <p className="text-xs text-muted mb-3">
        Export everything as JSON from the maintenance panel above at any time. Deleting your account
        permanently removes your profile, CV, jobs, kits and history. This can't be undone.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm text-danger border border-danger/40 rounded px-3 py-2 hover:bg-danger/10"
        >
          Delete my account
        </button>
      ) : (
        <div className="bg-surface border border-danger/40 rounded p-4 max-w-md">
          <label className="block text-xs text-muted mb-2" htmlFor="delete-confirm">
            Type DELETE to confirm
          </label>
          <input
            id="delete-confirm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text mb-3"
            autoComplete="off"
          />
          {error && <p className="text-xs text-danger mb-3">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || text !== 'DELETE'}
              onClick={handleDelete}
              className="text-sm bg-danger text-bg font-medium rounded px-3 py-2 disabled:opacity-40"
            >
              {busy ? 'Deleting...' : 'Permanently delete'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setText('');
                setError(null);
              }}
              className="text-sm text-muted px-3 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
