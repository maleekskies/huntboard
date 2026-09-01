'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Job, Kit } from '@/lib/types';

const STATUSES = ['new', 'saved', 'kit_ready', 'applied', 'interview', 'rejected', 'offer', 'ignored'];
const TABS = ['Overview', 'Tailored CV', 'Cover letter', 'Form packet'] as const;

export default function JobDetail({ job, kit }: { job: Job; kit: Kit | null }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState('Copy cover letter');

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    const res = await fetch(`/api/jobs/${job.id}/generate-kit`, { method: 'POST' });
    if (res.ok) {
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setGenError(body.error ?? 'Kit generation failed. Try again.');
    }
    setGenerating(false);
  }

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const supabase = createClient();
    await supabase
      .from('jobs')
      .update({ status: e.target.value, updated_at: new Date().toISOString() })
      .eq('id', job.id);
    router.refresh();
  }

  async function handleCopyLetter() {
    if (!kit?.cover_letter) return;
    await navigator.clipboard.writeText(kit.cover_letter);
    setCopyLabel('Copied!');
    setTimeout(() => setCopyLabel('Copy cover letter'), 1500);
  }

  return (
    <div className="px-6 py-8 pb-24 md:pb-10 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-text mb-1">{job.title}</h1>
          <p className="text-muted">
            {job.company}
            {job.location ? ` · ${job.location}` : ''}
          </p>
        </div>
        <select
          value={job.status}
          onChange={handleStatusChange}
          className="bg-surface border border-border rounded px-3 py-2 text-text text-sm self-start"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-accent text-bg font-medium rounded px-4 py-2.5 hover:bg-accentDim transition-colors text-sm"
        >
          Open official apply page ↗
        </a>
        {!kit && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-surface border border-border hover:border-accent text-text rounded px-4 py-2.5 text-sm transition-colors disabled:opacity-50"
          >
            {generating ? 'Generating kit…' : 'Generate kit'}
          </button>
        )}
        {kit && (
          <a
            href={`/api/jobs/${job.id}/pdf`}
            className="bg-surface border border-border hover:border-accent text-text rounded px-4 py-2.5 text-sm transition-colors"
          >
            Download CV (PDF)
          </a>
        )}
      </div>
      {genError && <p className="text-danger text-sm mb-4">{genError}</p>}

      {job.match_score !== null && (
        <div className="bg-surface border border-border rounded-lg px-4 py-3 mb-6 flex items-center gap-3">
          <span className="text-accent text-2xl font-display tabular-nums">{job.match_score}</span>
          <span className="text-muted text-sm">match score</span>
        </div>
      )}

      {!kit ? (
        <p className="text-muted text-sm border border-dashed border-border rounded-lg p-6 text-center">
          No kit yet. Generate one to see the tailored CV, cover letter, and form answers.
        </p>
      ) : (
        <>
          <div className="flex gap-1 border-b border-border mb-4 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  tab === t ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'Overview' && (
            <div className="flex flex-col gap-4">
              {job.match_why && job.match_why.length > 0 && (
                <div>
                  <h3 className="text-sm text-muted mb-2">Why it matches</h3>
                  <ul className="list-disc list-inside text-text text-sm space-y-1">
                    {job.match_why.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
              {job.match_gaps && job.match_gaps.length > 0 && (
                <div>
                  <h3 className="text-sm text-muted mb-2">Gaps</h3>
                  <ul className="list-disc list-inside text-text text-sm space-y-1">
                    {job.match_gaps.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}
              {job.visa_location_risk && (
                <div>
                  <h3 className="text-sm text-muted mb-2">Visa / location risk</h3>
                  <p className="text-text text-sm">{job.visa_location_risk}</p>
                </div>
              )}
              {job.description && (
                <div>
                  <h3 className="text-sm text-muted mb-2">Job description</h3>
                  <p className="text-text text-sm whitespace-pre-wrap">{job.description}</p>
                </div>
              )}
            </div>
          )}

          {tab === 'Tailored CV' && (
            <pre className="text-text text-sm whitespace-pre-wrap font-sans bg-surface border border-border rounded-lg p-4">
              {kit.tailored_cv_md}
            </pre>
          )}

          {tab === 'Cover letter' && (
            <div>
              <button
                onClick={handleCopyLetter}
                className="mb-3 bg-surface border border-border hover:border-accent text-text rounded px-3 py-1.5 text-sm transition-colors"
              >
                {copyLabel}
              </button>
              <p className="text-text text-sm whitespace-pre-wrap bg-surface border border-border rounded-lg p-4">
                {kit.cover_letter}
              </p>
            </div>
          )}

          {tab === 'Form packet' && kit.form_answers_json && (
            <dl className="flex flex-col gap-3">
              {Object.entries(kit.form_answers_json).map(([key, value]) => (
                <div key={key} className="bg-surface border border-border rounded-lg p-3">
                  <dt className="text-xs text-muted mb-1">{key.replace(/_/g, ' ')}</dt>
                  <dd className="text-text text-sm">{String(value)}</dd>
                </div>
              ))}
            </dl>
          )}

          {kit.facts_used && kit.facts_used.length > 0 && (
            <details className="mt-6 text-sm text-muted">
              <summary className="cursor-pointer hover:text-text">Facts used (audit)</summary>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {kit.facts_used.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
