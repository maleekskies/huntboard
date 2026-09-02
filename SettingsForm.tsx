'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import ChipInput from './ChipInput';

interface Profile {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  portfolio_url?: string;
  linkedin_url?: string;
  work_auth_notes?: string;
  target_titles?: string[];
  exclude_companies?: string[];
  locations?: string[];
  must_haves?: string[];
  deal_breakers?: string[];
  min_match?: number;
  seniority?: string;
  comp_floor?: string;
  master_cv_text?: string;
  voice_guide?: string;
  proof_points?: string;
  notify_digest?: boolean;
}

const SENIORITY_OPTIONS = ['', 'junior', 'mid', 'senior', 'lead'];

export default function SettingsForm({ profile, userId }: { profile: Profile | null; userId: string }) {
  const [name, setName] = useState(profile?.name ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [portfolioUrl, setPortfolioUrl] = useState(profile?.portfolio_url ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedin_url ?? '');
  const [workAuthNotes, setWorkAuthNotes] = useState(profile?.work_auth_notes ?? '');
  const [targetTitles, setTargetTitles] = useState<string[]>(profile?.target_titles ?? []);
  const [excludeCompaniesText, setExcludeCompaniesText] = useState(
    (profile?.exclude_companies ?? []).join(', ')
  );
  const [locations, setLocations] = useState<string[]>(profile?.locations ?? []);
  const [mustHaves, setMustHaves] = useState<string[]>(profile?.must_haves ?? []);
  const [dealBreakers, setDealBreakers] = useState<string[]>(profile?.deal_breakers ?? []);
  const [minMatch, setMinMatch] = useState(profile?.min_match ?? 70);
  const [seniority, setSeniority] = useState(profile?.seniority ?? '');
  const [compFloor, setCompFloor] = useState(profile?.comp_floor ?? '');
  const [masterCvText, setMasterCvText] = useState(profile?.master_cv_text ?? '');
  const [voiceGuide, setVoiceGuide] = useState(profile?.voice_guide ?? '');
  const [proofPoints, setProofPoints] = useState(profile?.proof_points ?? '');
  const [notifyDigest, setNotifyDigest] = useState(profile?.notify_digest ?? false);

  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus('uploading');
    setUploadError(null);
    const body = new FormData();
    body.append('file', file);
    try {
      const res = await fetch('/api/profile/parse-cv', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) {
        setUploadStatus('error');
        setUploadError(data.error ?? 'Upload failed');
        return;
      }
      setMasterCvText(data.text);
      setUploadStatus('idle');
    } catch (err) {
      setUploadStatus('error');
      setUploadError(err instanceof Error ? err.message : 'Upload request failed to complete.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    const supabase = createClient();

    const { error } = await supabase.from('profile').upsert({
      id: userId,
      name,
      email,
      phone,
      location,
      portfolio_url: portfolioUrl,
      linkedin_url: linkedinUrl,
      work_auth_notes: workAuthNotes,
      target_titles: targetTitles,
      exclude_companies: excludeCompaniesText.split(',').map((t) => t.trim()).filter(Boolean),
      locations,
      must_haves: mustHaves,
      deal_breakers: dealBreakers,
      min_match: minMatch,
      seniority: seniority || null,
      comp_floor: compFloor || null,
      master_cv_text: masterCvText,
      voice_guide: voiceGuide,
      proof_points: proofPoints,
      notify_digest: notifyDigest,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
    } else {
      setStatus('saved');
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LabeledInput label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <LabeledInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <LabeledInput label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <LabeledInput label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <LabeledInput label="Portfolio URL" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} />
        <LabeledInput label="LinkedIn URL" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
      </div>

      <Field label="Target titles" hint="Drives both scanning and scoring.">
        <ChipInput values={targetTitles} onChange={setTargetTitles} placeholder="Add a title" />
      </Field>

      <Field label="Locations" hint="Remote, cities, regions you'll take a role in.">
        <ChipInput values={locations} onChange={setLocations} placeholder="Remote, Lagos, EU..." />
      </Field>

      <Field label="Must-haves">
        <ChipInput values={mustHaves} onChange={setMustHaves} placeholder="e.g. Web3 or AI" />
      </Field>

      <Field label="Deal-breakers" hint="A role mentioning any of these is excluded, not just downranked.">
        <ChipInput values={dealBreakers} onChange={setDealBreakers} placeholder="e.g. unpaid ambassador-only" />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-muted mb-1">Min match cutoff</label>
          <input
            type="number"
            min={0}
            max={100}
            value={minMatch}
            onChange={(e) => setMinMatch(Number(e.target.value))}
            className="w-full bg-surface border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">Seniority band</label>
          <select
            value={seniority}
            onChange={(e) => setSeniority(e.target.value)}
            className="w-full bg-surface border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-accent"
          >
            {SENIORITY_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s || 'Not set'}
              </option>
            ))}
          </select>
        </div>
        <LabeledInput
          label="Comp floor (optional)"
          value={compFloor}
          onChange={(e) => setCompFloor(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm text-muted mb-1">
          Excluded companies (comma-separated), never shown, even if they'd match
        </label>
        <input
          className="w-full bg-surface border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-accent"
          placeholder="e.g. a former employer, a company you've already tried"
          value={excludeCompaniesText}
          onChange={(e) => setExcludeCompaniesText(e.target.value)}
        />
      </div>

      <LabeledInput
        label="Work authorization notes"
        value={workAuthNotes}
        onChange={(e) => setWorkAuthNotes(e.target.value)}
      />

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm text-muted">Master CV (paste full text, or upload a PDF)</label>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="cv-upload"
            />
            <label
              htmlFor="cv-upload"
              className="cursor-pointer text-xs bg-surface border border-border hover:border-accent text-text rounded px-3 py-1.5 transition-colors"
            >
              {uploadStatus === 'uploading' ? 'Extracting text…' : 'Upload PDF'}
            </label>
          </div>
        </div>
        {uploadStatus === 'error' && uploadError && <p className="text-danger text-xs mb-2">{uploadError}</p>}
        <textarea
          rows={14}
          value={masterCvText}
          onChange={(e) => setMasterCvText(e.target.value)}
          placeholder="Paste your CV text here, or upload a PDF above. Every generated kit pulls only from this."
          className="w-full bg-surface border border-border rounded px-3 py-3 text-text font-mono text-sm focus:outline-none focus:border-accent"
        />
      </div>

      <Field label="Voice guide" hint="How you actually sound. Feeds every generated cover letter.">
        <textarea
          rows={3}
          value={voiceGuide}
          onChange={(e) => setVoiceGuide(e.target.value)}
          placeholder="e.g. Human, plain, specific. No corporate filler, no clichés."
          className="w-full bg-surface border border-border rounded px-3 py-2 text-text text-sm focus:outline-none focus:border-accent"
        />
      </Field>

      <Field label="Proof points / STAR stories" hint="Real wins, in your own words. Cover letters draw on this for specifics beyond the CV.">
        <textarea
          rows={6}
          value={proofPoints}
          onChange={(e) => setProofPoints(e.target.value)}
          placeholder="One per line or paragraph: a project you shipped, a number you moved, a problem you solved."
          className="w-full bg-surface border border-border rounded px-3 py-2 text-text text-sm focus:outline-none focus:border-accent"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={notifyDigest}
          onChange={(e) => setNotifyDigest(e.target.checked)}
          className="accent-accent"
        />
        Email me a daily digest of new matches above cutoff
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === 'saving'}
          className="grad-bg text-bg font-medium rounded px-5 py-2.5 hover:opacity-90 transition-colors disabled:opacity-50 self-start"
        >
          {status === 'saving' ? 'Saving…' : 'Save settings'}
        </button>
        {status === 'saved' && <span className="text-good text-sm">Saved.</span>}
        {status === 'error' && errorMessage && <span className="text-danger text-sm">{errorMessage}</span>}
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-muted mb-1">{label}</label>
      {hint && <p className="text-xs text-muted mb-2">{hint}</p>}
      {children}
    </div>
  );
}

function LabeledInput({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-sm text-muted mb-1">{label}</label>
      <input
        className="w-full bg-surface border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-accent"
        {...props}
      />
    </div>
  );
}
