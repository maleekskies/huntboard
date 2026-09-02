'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ScoreUrlForm() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage(null);
    try {
      const res = await fetch('/api/jobs/score-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setErrorMessage(data.error ?? `Request failed (${res.status}).`);
        return;
      }
      router.push(`/jobs/${data.job.id}`);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Request failed to complete.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
      <input
        type="url"
        required
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste a job posting URL to score it instantly"
        className="flex-1 bg-surface border border-border rounded px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="bg-surface border border-border hover:border-accent text-text rounded px-4 py-2.5 text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {status === 'loading' ? 'Scoring…' : 'Score this URL'}
      </button>
      {status === 'error' && errorMessage && (
        <p className="text-danger text-xs sm:self-center">{errorMessage}</p>
      )}
    </form>
  );
}
