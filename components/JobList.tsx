'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Job } from '@/lib/types';
import { relativeAge } from '@/lib/format';

function scoreClass(score: number | null): string {
  if (score === null) return 'text-muted';
  if (score >= 85) return 'text-good';
  if (score >= 70) return 'grad-text';
  return 'text-danger';
}

function companyMark(company: string): string {
  const words = company.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function JobList({ jobs }: { jobs: Job[] }) {
  const router = useRouter();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fingerprintCounts = new Map<string, number>();
  for (const j of jobs) {
    if (!j.fingerprint) continue;
    fingerprintCounts.set(j.fingerprint, (fingerprintCounts.get(j.fingerprint) ?? 0) + 1);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === jobs.length ? new Set() : new Set(jobs.map((j) => j.id))));
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
    setError(null);
  }

  async function runBulkAction(action: 'ignore' | 'reject' | 'save') {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/jobs/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Bulk action failed (${res.status}).`);
        setBusy(false);
        return;
      }
      exitSelectMode();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk action failed to complete.');
    }
    setBusy(false);
  }

  if (jobs.length === 0) {
    return (
      <p className="text-muted text-sm py-8 text-center border border-dashed border-border rounded-lg">
        No matches yet. Huntboard scores roles against your titles and must-haves. Add a source or
        wait for the next scan.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        {!selectMode ? (
          <button
            onClick={() => setSelectMode(true)}
            className="text-xs text-muted hover:text-text border border-border rounded-full px-3 py-1"
          >
            Select
          </button>
        ) : (
          <div className="flex items-center gap-3 flex-wrap bg-surface border border-border rounded-lg px-4 py-2.5 w-full">
            <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
              <input
                type="checkbox"
                checked={selected.size === jobs.length}
                onChange={toggleSelectAll}
                className="accent-accent"
              />
              {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
            </label>
            {selected.size > 0 && (
              <>
                <button
                  onClick={() => runBulkAction('save')}
                  disabled={busy}
                  className="text-xs text-good hover:underline disabled:opacity-50"
                >
                  Save to pipeline
                </button>
                <button
                  onClick={() => runBulkAction('ignore')}
                  disabled={busy}
                  className="text-xs text-muted hover:underline disabled:opacity-50"
                >
                  Ignore
                </button>
                <button
                  onClick={() => runBulkAction('reject')}
                  disabled={busy}
                  className="text-xs text-danger hover:underline disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            )}
            <button onClick={exitSelectMode} className="text-xs text-muted hover:text-text ml-auto">
              Done
            </button>
          </div>
        )}
      </div>
      {error && <p className="text-danger text-xs mb-3">{error}</p>}

      <ul className="flex flex-col gap-2">
        {jobs.map((job) => {
          const age = relativeAge(job.posted_at);
          const why = job.match_why?.[0];
          const isDuplicate = job.fingerprint && (fingerprintCounts.get(job.fingerprint) ?? 0) > 1;
          const isSelected = selected.has(job.id);
          return (
            <li key={job.id} className="flex items-start gap-2">
              {selectMode && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(job.id)}
                  className="mt-6 accent-accent shrink-0"
                  aria-label={`Select ${job.title}`}
                />
              )}
              <Link
                href={`/jobs/${job.id}`}
                onClick={(e) => {
                  if (selectMode) {
                    e.preventDefault();
                    toggle(job.id);
                  }
                }}
                className={`flex-1 grid grid-cols-[52px_1fr_auto] gap-3 items-start bg-surface hover:bg-surfaceHover border rounded-lg px-4 py-4 transition-colors ${
                  isSelected ? 'border-accent' : 'border-border'
                }`}
              >
                <div className="w-[52px] h-[52px] rounded-lg bg-bg border border-border flex items-center justify-center text-accent font-semibold text-sm">
                  {companyMark(job.company)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-text font-medium truncate">{job.title}</p>
                    {isDuplicate && (
                      <span className="text-xs text-muted border border-border rounded-full px-2 py-0.5 shrink-0">
                        possible duplicate
                      </span>
                    )}
                  </div>
                  <p className="text-muted text-xs flex flex-wrap gap-x-2 mt-0.5">
                    <span>{job.company}</span>
                    {job.location && <span>· {job.location}</span>}
                    {age && <span>· {age}</span>}
                  </p>
                  {why && <p className="text-sm text-text/80 mt-2">{why}</p>}
                  {((job.fit_tags?.length ?? 0) > 0 || (job.match_gaps?.length ?? 0) > 0) && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {job.fit_tags?.slice(0, 3).map((tag) => (
                        <span
                          key={`fit-${tag}`}
                          className="text-xs text-good border border-good/30 bg-good/10 rounded-full px-2 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                      {job.match_gaps?.slice(0, 2).map((tag) => (
                        <span
                          key={`gap-${tag}`}
                          className="text-xs text-accent border border-accent/30 bg-accent/10 rounded-full px-2 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  {job.match_score !== null &&
                    (job.domain_score === null &&
                    job.skills_score === null &&
                    job.seniority_score === null &&
                    job.location_score === null ? (
                      <span className="text-xs text-muted">unscored</span>
                    ) : (
                      <span className={`text-xl font-display font-bold tabular-nums ${scoreClass(job.match_score)}`}>
                        {job.match_score}
                      </span>
                    ))}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
