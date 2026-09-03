'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ChipInput from './ChipInput';

const TOTAL_STEPS = 4;

const TITLE_SUGGESTIONS = ['Senior Research Analyst', 'Community Lead', 'AI Content Strategist'];
const LOCATION_SUGGESTIONS = ['Remote', 'Lagos', 'EU', 'US', 'On-site'];
const MUST_HAVE_SUGGESTIONS = ['Web3 or AI', 'Writing-heavy', 'Paid role'];
const DEAL_BREAKER_SUGGESTIONS = ['Unpaid ambassador-only', 'No writing sample', 'Relocation required'];

export default function OnboardingWizard({ userId }: { userId: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [targetTitles, setTargetTitles] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [timezone, setTimezone] = useState('');
  const [mustHaves, setMustHaves] = useState<string[]>([]);
  const [dealBreakers, setDealBreakers] = useState<string[]>([]);
  const [masterCvText, setMasterCvText] = useState('');
  const [wins, setWins] = useState('');

  const canAdvance =
    (step === 1 && targetTitles.length >= 2) ||
    (step === 2 && locations.length >= 1) ||
    step === 3 ||
    (step === 4 && masterCvText.trim().length > 0);

  async function handleFinish() {
    setSaving(true);
    setErrorMessage(null);
    const supabase = createClient();

    const { error } = await supabase.from('profile').upsert({
      id: userId,
      target_titles: targetTitles,
      locations,
      timezone: timezone || null,
      must_haves: mustHaves,
      deal_breakers: dealBreakers,
      master_cv_text: masterCvText,
      wins: wins || null,
      min_match: 70,
      onboarded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setSaving(false);
      setErrorMessage(error.message);
      return;
    }

    router.push('/?first_run=1');
    router.refresh();
  }

  return (
    <div className="w-full max-w-lg">
      <p className="text-xs text-muted mb-2">
        Step {step} of {TOTAL_STEPS}
      </p>
      <div className="h-1 bg-surface rounded-full mb-8 overflow-hidden">
        <div
          className="h-full grad-bg transition-all"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {step === 1 && (
        <StepShell title="What roles are you hunting?" hint="Add 2 to 5 target titles.">
          <ChipInput
            values={targetTitles}
            onChange={setTargetTitles}
            suggestions={TITLE_SUGGESTIONS}
            placeholder="Type a title and press Enter"
          />
        </StepShell>
      )}

      {step === 2 && (
        <StepShell title="Where can you work?" hint="Pick as many as apply.">
          <ChipInput
            values={locations}
            onChange={setLocations}
            suggestions={LOCATION_SUGGESTIONS}
            placeholder="Remote, Lagos, EU..."
          />
          <input
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="Timezone (optional)"
            className="w-full mt-4 bg-surface border border-border rounded px-3 py-2 text-text placeholder:text-muted focus:outline-none focus:border-accent"
          />
        </StepShell>
      )}

      {step === 3 && (
        <StepShell title="Must-haves and deal-breakers" hint="Both are optional, but sharpen the match a lot.">
          <p className="text-xs text-muted mb-2">Must-haves</p>
          <ChipInput
            values={mustHaves}
            onChange={setMustHaves}
            suggestions={MUST_HAVE_SUGGESTIONS}
            placeholder="e.g. Web3 or AI"
          />
          <p className="text-xs text-muted mb-2 mt-5">Deal-breakers</p>
          <ChipInput
            values={dealBreakers}
            onChange={setDealBreakers}
            suggestions={DEAL_BREAKER_SUGGESTIONS}
            placeholder="e.g. unpaid ambassador-only"
          />
        </StepShell>
      )}

      {step === 4 && (
        <StepShell title="Paste the raw material" hint="This is what the matcher reads.">
          <textarea
            rows={10}
            value={masterCvText}
            onChange={(e) => setMasterCvText(e.target.value)}
            placeholder="Paste your CV or LinkedIn about section"
            className="w-full bg-surface border border-border rounded px-3 py-3 text-text font-mono text-sm focus:outline-none focus:border-accent"
          />
          <textarea
            rows={3}
            value={wins}
            onChange={(e) => setWins(e.target.value)}
            placeholder="3 wins, optional"
            className="w-full mt-3 bg-surface border border-border rounded px-3 py-2 text-text text-sm focus:outline-none focus:border-accent"
          />
        </StepShell>
      )}

      {errorMessage && <p className="text-danger text-sm mt-4">{errorMessage}</p>}

      <div className="flex items-center justify-between mt-8">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="text-muted text-sm hover:text-text disabled:opacity-0"
        >
          Back
        </button>
        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance}
            className="grad-bg text-bg font-medium rounded px-5 py-2.5 hover:opacity-90 transition-colors disabled:opacity-40"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={!canAdvance || saving}
            className="grad-bg text-bg font-medium rounded px-5 py-2.5 hover:opacity-90 transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Finish'}
          </button>
        )}
      </div>
    </div>
  );
}

function StepShell({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-2xl text-text mb-1">{title}</h1>
      <p className="text-muted text-sm mb-5">{hint}</p>
      {children}
    </div>
  );
}
