'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Job, Kit } from '@/lib/types';

const STATUSES = ['new', 'saved', 'kit_ready', 'applied', 'interview', 'rejected', 'offer', 'ignored'];
const TABS = ['Overview', 'Tailored CV', 'Cover letter', 'Form packet'] as const;
const REJECT_REASONS = ['wrong seniority', 'wrong domain', 'too thin'] as const;

export default function JobDetail({ job, kit }: { job: Job; kit: Kit | null }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState('Copy cover letter');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>(REJECT_REASONS[0]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [nextAction, setNextAction] = useState(job.next_action ?? '');
  const [nextDate, setNextDate] = useState(job.next_date ?? '');
  const [showUndo, setShowUndo] = useState(false);
  const [interviewNotes, setInterviewNotes] = useState(job.interview_notes ?? '');
  const [notesStatus, setNotesStatus] = useState<'idle' | 'saving' | 'error'>('idle');

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/generate-kit`, { method: 'POST' });
      if (res.ok) {
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        setGenError(body.error ?? `Kit generation failed (${res.status}).`);
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Kit generation request failed to complete.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextStatus = e.target.value;
    if (nextStatus === 'applied' && !nextDate) {
      setStatusError('Set a follow-up date below before moving this to Applied.');
      return;
    }
    const supabase = createClient();
    const update: Record<string, unknown> = { status: nextStatus, updated_at: new Date().toISOString() };
    if (nextStatus === 'applied') {
      update.next_action = nextAction || null;
      update.next_date = nextDate || null;
    }
    const { error } = await supabase.from('jobs').update(update).eq('id', job.id);
    if (error) {
      setStatusError(error.message);
    } else {
      setStatusError(null);
      router.refresh();
    }
  }

  async function handleSaveNextAction() {
    setActionBusy(true);
    setActionError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from('jobs')
      .update({ next_action: nextAction || null, next_date: nextDate || null, updated_at: new Date().toISOString() })
      .eq('id', job.id);
    setActionBusy(false);
    if (error) setActionError(error.message);
    else router.refresh();
  }

  async function handleSaveToPipeline() {
    setActionBusy(true);
    setActionError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'saved', updated_at: new Date().toISOString() })
      .eq('id', job.id);
    setActionBusy(false);
    if (error) setActionError(error.message);
    else router.refresh();
  }

  async function handleApproveKit() {
    if (!kit) return;
    setActionBusy(true);
    setActionError(null);
    const supabase = createClient();
    const { error: kitError } = await supabase
      .from('kits')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', kit.id);
    const { error: jobError } = await supabase
      .from('jobs')
      .update({ status: 'kit_ready', updated_at: new Date().toISOString() })
      .eq('id', job.id);
    setActionBusy(false);
    const error = kitError ?? jobError;
    if (error) setActionError(error.message);
    else router.refresh();
  }

  async function handleReject() {
    setActionBusy(true);
    setActionError(null);
    const supabase = createClient();
    const term = rejectReason === 'wrong domain' ? job.company : job.title;

    const { error: jobError } = await supabase
      .from('jobs')
      .update({ status: 'rejected', reject_reason: rejectReason, updated_at: new Date().toISOString() })
      .eq('id', job.id);
    const { error: rejectionError } = await supabase
      .from('rejections')
      .insert({ user_id: job.user_id, job_id: job.id, reason: rejectReason, term });

    setActionBusy(false);
    const error = jobError ?? rejectionError;
    if (error) setActionError(error.message);
    else {
      setShowRejectForm(false);
      setShowUndo(true);
      router.refresh();
    }
  }

  async function handleUndoReject() {
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/jobs/${job.id}/undo-reject`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setActionError(body.error ?? `Undo failed (${res.status}).`);
      } else {
        setShowUndo(false);
        router.refresh();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Undo failed to complete.');
    }
    setActionBusy(false);
  }

  async function handleSaveInterviewNotes() {
    setNotesStatus('saving');
    const supabase = createClient();
    const { error } = await supabase
      .from('jobs')
      .update({ interview_notes: interviewNotes || null, updated_at: new Date().toISOString() })
      .eq('id', job.id);
    setNotesStatus(error ? 'error' : 'idle');
    if (!error) router.refresh();
  }

  async function handleCopyLetter() {
    if (!kit?.cover_letter) return;
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
    <div className="px-6 py-8 pb-24 md:pb-10 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-text mb-1">{job.title}</h1>
          <p className="text-muted">
            {job.company}
            {job.location ? ` · ${job.location}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
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
          {statusError && <p className="text-danger text-xs max-w-[200px] text-right">{statusError}</p>}
        </div>
      </div>

      {job.match_score !== null && (
        <div className="bg-surface border border-border rounded-lg p-4 mb-4">
          {job.domain_score === null &&
          job.skills_score === null &&
          job.seniority_score === null &&
          job.location_score === null ? (
            <div className="flex items-center gap-3">
              <span className="text-muted text-sm">
                Scored before the current matcher existed, no breakdown available.
              </span>
              <span className="text-muted text-xs">Fix from Settings, Maintenance, Re-score all jobs.</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <span className="grad-text text-2xl font-display font-bold tabular-nums">{job.match_score}</span>
                <span className="text-muted text-sm">overall match</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <ScoreBar label="Domain" value={job.domain_score} />
                <ScoreBar label="Skills" value={job.skills_score} />
                <ScoreBar label="Seniority" value={job.seniority_score} />
                <ScoreBar label="Location" value={job.location_score} />
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="grad-bg text-bg font-medium rounded px-4 py-2.5 hover:opacity-90 transition-colors text-sm"
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

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={handleSaveToPipeline}
          disabled={actionBusy}
          className="bg-surface border border-border hover:border-accent text-text rounded px-4 py-2 text-sm transition-colors disabled:opacity-50"
        >
          Save to pipeline
        </button>
        {kit && kit.status !== 'approved' && (
          <button
            onClick={handleApproveKit}
            disabled={actionBusy}
            className="bg-surface border border-good hover:bg-good/10 text-good rounded px-4 py-2 text-sm transition-colors disabled:opacity-50"
          >
            Approve kit and queue send
          </button>
        )}
        {kit?.status === 'approved' && (
          <span className="text-good text-sm">Kit approved.</span>
        )}
        {!showRejectForm ? (
          <button
            onClick={() => setShowRejectForm(true)}
            disabled={actionBusy}
            className="text-danger text-sm hover:underline disabled:opacity-50"
          >
            Reject
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="bg-surface border border-border rounded px-2 py-1.5 text-text text-sm"
            >
              {REJECT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              onClick={handleReject}
              disabled={actionBusy}
              className="bg-danger text-bg rounded px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Confirm reject
            </button>
            <button onClick={() => setShowRejectForm(false)} className="text-muted text-sm hover:text-text">
              Cancel
            </button>
          </div>
        )}
      </div>
      {actionError && <p className="text-danger text-sm mb-4">{actionError}</p>}
      {showUndo && job.status === 'rejected' && (
        <div className="flex items-center gap-3 mb-4 bg-surface border border-border rounded-lg px-4 py-2.5">
          <span className="text-sm text-muted">Rejected.</span>
          <button
            onClick={handleUndoReject}
            disabled={actionBusy}
            className="text-sm text-accent hover:underline disabled:opacity-50"
          >
            Undo
          </button>
        </div>
      )}

      {(job.status === 'interview' || job.interview_notes) && (
        <div className="bg-surface border border-border rounded-lg p-4 mb-6">
          <h3 className="text-sm text-muted mb-2">Interview prep notes</h3>
          <textarea
            rows={4}
            value={interviewNotes}
            onChange={(e) => setInterviewNotes(e.target.value)}
            placeholder="What to prep, questions to ask, who you're meeting"
            className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent mb-2"
          />
          <button
            onClick={handleSaveInterviewNotes}
            disabled={notesStatus === 'saving'}
            className="bg-surface border border-border hover:border-accent text-text rounded px-4 py-2 text-sm transition-colors disabled:opacity-50"
          >
            {notesStatus === 'saving' ? 'Saving…' : 'Save notes'}
          </button>
          {notesStatus === 'error' && <span className="text-danger text-xs ml-2">Couldn't save.</span>}
        </div>
      )}

      <div className="bg-surface border border-border rounded-lg p-4 mb-6">
        <h3 className="text-sm text-muted mb-2">Next action</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            placeholder="e.g. Follow up with recruiter"
            className="flex-1 bg-bg border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
          />
          <input
            type="date"
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
            className="bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
          />
          <button
            onClick={handleSaveNextAction}
            disabled={actionBusy}
            className="bg-surface border border-border hover:border-accent text-text rounded px-4 py-2 text-sm transition-colors disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>

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
                  <h3 className="text-sm text-muted mb-2">Gaps to address in the kit</h3>
                  <ul className="list-disc list-inside text-text text-sm space-y-1">
                    {job.match_gaps.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}
              {kit.gap_note && (
                <div>
                  <h3 className="text-sm text-muted mb-2">Gap handling note</h3>
                  <p className="text-text text-sm">{kit.gap_note}</p>
                </div>
              )}
              {kit.talking_points && kit.talking_points.length > 0 && (
                <div>
                  <h3 className="text-sm text-muted mb-2">Talking points</h3>
                  <ul className="list-disc list-inside text-text text-sm space-y-1">
                    {kit.talking_points.map((t, i) => (
                      <li key={i}>{t}</li>
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

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const pct = value ?? 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted mb-1">
        <span>{label}</span>
        <span>{value === null ? 'n/a' : value}</span>
      </div>
      <div className="h-1.5 bg-bg rounded-full overflow-hidden">
        <div className="h-full grad-bg" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
