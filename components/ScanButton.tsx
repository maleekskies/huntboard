'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ScanResult {
  found: number;
  inserted: number;
  updated: number;
  sourceErrors: string[];
  dbErrors?: string[];
  message?: string;
  error?: string;
}

export default function ScanButton() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  async function handleScan() {
    setScanning(true);
    setResult(null);
    try {
      const res = await fetch('/api/scan', { method: 'POST' });
      const body = await res.json();
      setResult(body);
      if (res.ok) router.refresh();
    } catch (err) {
      setResult({
        found: 0,
        inserted: 0,
        updated: 0,
        sourceErrors: [],
        error: err instanceof Error ? err.message : 'Scan request failed to complete.',
      });
    }
    setScanning(false);
  }

  return (
    <div>
      <button
        onClick={handleScan}
        disabled={scanning}
        className="w-full sm:w-auto grad-bg text-bg font-medium rounded px-4 py-3 text-sm hover:opacity-90 transition-colors disabled:opacity-50"
      >
        {scanning ? 'Scanning boards…' : 'Scan now'}
      </button>

      {result && (
        <div className="mt-3 text-sm">
          {result.error ? (
            <p className="text-danger">{result.error}</p>
          ) : result.message ? (
            <p className="text-muted">{result.message}</p>
          ) : (
            <p className="text-muted">
              Found {result.found} matches, <span className="text-good">{result.inserted} new</span>,{' '}
              {result.updated} refreshed.
            </p>
          )}
          {result.sourceErrors?.length > 0 && (
            <p className="text-muted text-xs mt-1">
              {result.sourceErrors.length} board{result.sourceErrors.length > 1 ? 's' : ''} had trouble
              this scan (skipped, others still ran fine).
            </p>
          )}
          {result.dbErrors && result.dbErrors.length > 0 && (
            <div className="text-danger text-xs mt-1">
              <p>Something went wrong saving results:</p>
              <ul className="list-disc list-inside">
                {result.dbErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
