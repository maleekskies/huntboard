'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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
}

export default function SettingsForm({ profile, userId }: { profile: Profile | null; userId: string }) {
  const [form, setForm] = useState<Profile>({
    name: profile?.name ?? '',
    email: profile?.email ?? '',
    phone: profile?.phone ?? '',
    location: profile?.location ?? '',
    portfolio_url: profile?.portfolio_url ?? '',
    linkedin_url: profile?.linkedin_url ?? '',
    work_auth_notes: profile?.work_auth_notes ?? '',
  });
  const [targetTitlesText, setTargetTitlesText] = useState(
    (profile?.target_titles ?? []).join(', ')
  );
  const [excludeCompaniesText, setExcludeCompaniesText] = useState(
    (profile?.exclude_companies ?? []).join(', ')
  );
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    const supabase = createClient();

    const { error } = await supabase.from('profile').upsert({
      id: userId,
      ...form,
      target_titles: targetTitlesText.split(',').map((t) => t.trim()).filter(Boolean),
      exclude_companies: excludeCompaniesText.split(',').map((t) => t.trim()).filter(Boolean),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
    } else {
      setStatus('saved');
    }
  }

  function field(key: keyof Profile) {
    return {
      value: form[key] ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LabeledInput label="Name" {...field('name')} />
        <LabeledInput label="Email" type="email" {...field('email')} />
        <LabeledInput label="Phone" {...field('phone')} />
        <LabeledInput label="Location" {...field('location')} />
        <LabeledInput label="Portfolio URL" {...field('portfolio_url')} />
        <LabeledInput label="LinkedIn URL" {...field('linkedin_url')} />
      </div>

      <div>
        <label className="block text-sm text-muted mb-1">
          Target titles (comma-separated) - drives what "Scan now" searches for
        </label>
        <input
          className="w-full bg-surface border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-accent"
          placeholder="e.g. Technical Writer, Web3 Content, Product Manager"
          value={targetTitlesText}
          onChange={(e) => setTargetTitlesText(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm text-muted mb-1">
          Excluded companies (comma-separated) - never shown, even if they'd match
        </label>
        <input
          className="w-full bg-surface border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-accent"
          placeholder="e.g. a former employer, a company you've already tried"
          value={excludeCompaniesText}
          onChange={(e) => setExcludeCompaniesText(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm text-muted mb-1">Work authorization notes</label>
        <input
          className="w-full bg-surface border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-accent"
          {...field('work_auth_notes')}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === 'saving'}
          className="bg-accent text-bg font-medium rounded px-5 py-2.5 hover:bg-accentDim transition-colors disabled:opacity-50 self-start"
        >
          {status === 'saving' ? 'Saving…' : 'Save settings'}
        </button>
        {status === 'saved' && <span className="text-good text-sm">Saved.</span>}
        {status === 'error' && errorMessage && <span className="text-danger text-sm">{errorMessage}</span>}
      </div>
    </form>
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
