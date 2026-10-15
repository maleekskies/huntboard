'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MaintenancePanel() {
  const router = useRouter();
  const [rescoring, setRescoring] = useState(false);
  const [rescoreResult, setRescoreResult] = useState<string | null>(null);
  const [clearScope, setClearScope] = useState('rejected');
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [testingDigest, setTestingDigest] = useState(false);
  const [digestResult, setDigestResult] = useState<string | null>(null);

  async function handleRescore() {
    setRescoring(true);
    setRescoreResult(null);
    try {
      const res = await fetch('/api/jobs/rescore-all', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setRescoreResult(data.error ?? `Rescore failed (${res.status}).`);
      } else {
        setRescoreResult(`Rescored ${data.rescored}. ${data.excluded} moved to rejected on deal-breakers.`);
        router.refresh();
      }
    } catch (err) {
      setRescoreResult(err instanceof Error ? err.message : 'Rescore failed to complete.');
    }
    setRescoring(false);
  }

  async function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setClearing(true);
    setClearResult(null);
    try {
      const res = await fetch('/api/jobs/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: clearScope }),
      });
      const data = await res.json();
      if (!res.ok) {
        setClearResult(data.error ?? `Clear failed (${res.status}).`);
      } else {
        setClearResult(`Deleted ${data.deleted} job${data.deleted === 1 ? '' : 's'}.`);
        router.refresh();
      }
    } catch (err) {
      setClearResult(err instanceof Error ? err.message : 'Clear failed to complete.');
    }
    setClearing(false);
    setConfirmClear(false);
  }

  async function handleTestDigest() {
    setTestingDigest(true);
    setDigestResult(null);
    try {
      const res = await fetch('/api/digest/test', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setDigestResult(data.error ?? `Test send failed (${res.status}).`);
      } else {
        setDigestResult(
          data.matchCount > 0
            ? `Sent, ${data.matchCount} match${data.matchCount === 1 ? '' : 'es'} included.`
            : 'Sent (nothing above your cutoff right now, so an empty digest went out).'
        );
      }
    } catch (err) {
      setDigestResult(err instanceof Error ? err.message : 'Test send failed to complete.');
    }
    setTestingDigest(false);
  }

  return (
    <div className="mt-10 pt-8 border-t border-border flex flex-col gap-6">
      <h2 className="text-sm font-medium text-text">Maintenance</h2>

      <div>
        <p className="text-sm text-text mb-1">Re-score all jobs</p>
        <p className="text-xs text-muted mb-2">
          Applies your current target titles, must-haves, and deal-breakers to every job already in
          the Inbox, not just new scans. Anything hitting a deal-breaker moves to Rejected.
        </p>
        <button
          onClick={handleRescore}
          disabled={rescoring}
          className="bg-surface border border-border hover:border-accent text-text rounded px-4 py-2 text-sm transition-colors disabled:opacity-50"
        >
          {rescoring ? 'Rescoring…' : 'Re-score all jobs'}
        </button>
        {rescoreResult && <p className="text-xs text-muted mt-2">{rescoreResult}</p>}
      </div>

      <div>
        <p className="text-sm text-text mb-1">Clear the board</p>
        <p className="text-xs text-muted mb-2">
          Deletes jobs matching the scope below. This can't be undone.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={clearScope}
            onChange={(e) => {
              setClearScope(e.target.value);
              setConfirmClear(false);
            }}
            className="bg-surface border border-border rounded px-2 py-1.5 text-text text-sm"
          >
            <option value="rejected">Rejected jobs</option>
            <option value="ignored">Ignored jobs</option>
            <option value="stale">Stale, untouched 30+ days</option>
            <option value="all">Everything</option>
          </select>
          <button
            onClick={handleClear}
            disabled={clearing}
            className={`rounded px-4 py-2 text-sm transition-colors disabled:opacity-50 ${
              confirmClear
                ? 'bg-danger text-bg'
                : 'bg-surface border border-danger/40 text-danger hover:bg-danger/10'
            }`}
          >
            {clearing ? 'Clearing…' : confirmClear ? 'Confirm delete' : 'Clear'}
          </button>
          {confirmClear && (
            <button onClick={() => setConfirmClear(false)} className="text-xs text-muted hover:text-text">
              Cancel
            </button>
          )}
        </div>
        {clearResult && <p className="text-xs text-muted mt-2">{clearResult}</p>}
      </div>

      <div>
        <p className="text-sm text-text mb-1">Test the daily digest</p>
        <p className="text-xs text-muted mb-2">
          Sends one digest to your email right now, regardless of the toggle above. Needs
          RESEND_API_KEY set on the server.
        </p>
        <button
          onClick={handleTestDigest}
          disabled={testingDigest}
          className="bg-surface border border-border hover:border-accent text-text rounded px-4 py-2 text-sm transition-colors disabled:opacity-50"
        >
          {testingDigest ? 'Sending…' : 'Send test digest'}
        </button>
        {digestResult && <p className="text-xs text-muted mt-2">{digestResult}</p>}
      </div>

      <div>
        <p className="text-sm text-text mb-1">Export your data</p>
        <p className="text-xs text-muted mb-2">
          Downloads your profile, jobs, kits, and history as one JSON file.
        </p>
        <a
          href="/api/export"
          className="inline-block bg-surface border border-border hover:border-accent text-text rounded px-4 py-2 text-sm transition-colors"
        >
          Export as JSON
        </a>
      </div>
    </div>
  );
}
