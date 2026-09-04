'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddJobForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', company: '', url: '', location: '', description: '' });
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const { job } = await res.json();
        setOpen(false);
        setForm({ title: '', company: '', url: '', location: '', description: '' });
        router.push(`/jobs/${job.id}`);
      } else {
        const body = await res.json().catch(() => ({}));
        setStatus('error');
        setErrorMessage(body.error ?? `Request failed (${res.status}).`);
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Request failed to complete.');
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto bg-surface border border-border hover:border-accent text-text rounded px-4 py-3 text-sm transition-colors"
      >
        + Add job (paste URL or JD)
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          required
          placeholder="Job title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="bg-bg border border-border rounded px-3 py-2 text-text placeholder:text-muted focus:outline-none focus:border-accent"
        />
        <input
          required
          placeholder="Company"
          value={form.company}
          onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
          className="bg-bg border border-border rounded px-3 py-2 text-text placeholder:text-muted focus:outline-none focus:border-accent"
        />
      </div>
      <input
        required
        placeholder="Apply URL (LinkedIn link is fine)"
        value={form.url}
        onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
        className="bg-bg border border-border rounded px-3 py-2 text-text placeholder:text-muted focus:outline-none focus:border-accent"
      />
      <input
        placeholder="Location (optional)"
        value={form.location}
        onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
        className="bg-bg border border-border rounded px-3 py-2 text-text placeholder:text-muted focus:outline-none focus:border-accent"
      />
      <textarea
        rows={6}
        placeholder="Paste the full job description here"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        className="bg-bg border border-border rounded px-3 py-2 text-text placeholder:text-muted focus:outline-none focus:border-accent"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === 'saving'}
          className="grad-bg text-bg font-medium rounded px-4 py-2.5 hover:opacity-90 transition-colors disabled:opacity-50"
        >
          {status === 'saving' ? 'Adding…' : 'Add to inbox'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted text-sm hover:text-text"
        >
          Cancel
        </button>
        {status === 'error' && errorMessage && <span className="text-danger text-sm">{errorMessage}</span>}
      </div>
    </form>
  );
}
