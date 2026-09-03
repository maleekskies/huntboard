'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Job, Kit } from '@/lib/types';

export default function KitReview({ job, kit }: { job: Job; kit: Kit }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState('Copy cover letter');

  async function setKitStatus(status: 'approved' | 'needs_edit') {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: kitError } = await supabase
      .from('kits')
      .update({
        status,
        approved_at: status === 'approved' ? new Date().toISOString() : null,
      })
      .eq('id', kit.id);

    if (kitError) {
      setBusy(false);
      setError(kitError.message);
      return;
    }

    if (status === 'approved') {
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ status: 'kit_ready', updated_at: new Date().toISOString() })
        .eq('id', job.id);
      if (jobError) {
        setBusy(false);
        setError(jobError.message);
        return;
      }
    }

    setBusy(false);
    router.refresh();
  }

  async function handleCopyLetter() {
    if (!kit.cover_letter) return;
    try {
      await navigator.clipboard.writeText(kit.cover_letter);
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy cover letter'), 1500);
    } catch {
      setCopyLabel('Copy failed, select the text manually');
      setTimeout(() => setCopyLabel('Copy cover letter'), 2000);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h1 className="font-display text-2xl text-text">{job.title}</h1>
          <p className="text-muted">{job.company}</p>
        </div>
        {job.match_score !== null && (
          <span className="grad-text text-xl font-display font-bold tabular-nums shrink-0">{job.match_score}</span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-6 mt-3">
        <StatusBadge status={kit.status} />
        {kit.status !== 'approved' && (
          <button
            onClick={() => setKitStatus('approved')}
            disabled={busy}
            className="bg-surface border border-good hover:bg-good/10 text-good rounded px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
          >
            Approve
          </button>
        )}
        {kit.status !== 'needs_edit' && (
          <button
            onClick={() => setKitStatus('needs_edit')}
            disabled={busy}
            className="bg-surface border border-border hover:border-accent text-text rounded px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
          >
            Needs edit
          </button>
        )}
      </div>
      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {kit.talking_points && kit.talking_points.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm text-muted mb-2">Talking points</h2>
          <ul className="list-disc list-inside text-text text-sm space-y-1">
            {kit.talking_points.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {kit.gap_note && (
        <div className="mb-6">
          <h2 className="text-sm text-muted mb-2">Gap handling note</h2>
          <p className="text-text text-sm">{kit.gap_note}</p>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-sm text-muted mb-2">Tailored CV</h2>
        <p className="text-xs text-muted mb-2">
          Reordered and rephrased from your master CV, not a line-level diff yet.
        </p>
        <pre className="text-text text-sm whitespace-pre-wrap font-sans bg-surface border border-border rounded-lg p-4">
          {kit.tailored_cv_md}
        </pre>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm text-muted">Cover letter</h2>
          <button
            onClick={handleCopyLetter}
            className="bg-surface border border-border hover:border-accent text-text rounded px-3 py-1.5 text-xs transition-colors"
          >
            {copyLabel}
          </button>
        </div>
        <p className="text-text text-sm whitespace-pre-wrap bg-surface border border-border rounded-lg p-4">
          {kit.cover_letter}
        </p>
      </div>

      <a href={`/jobs/${job.id}`} className="text-accent text-sm hover:underline">
        Open full job detail →
      </a>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'text-muted border-border',
    needs_edit: 'text-danger border-danger/40',
    approved: 'text-good border-good/40',
  };
  return (
    <span className={`text-xs border rounded-full px-2 py-0.5 ${styles[status] ?? styles.draft}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
