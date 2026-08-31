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
  master_cv_text?: string;
  work_auth_notes?: string;
  target_titles?: string[];
  voice_guide?: string;
}

export default function SettingsForm({ profile, userId }: { profile: Profile | null; userId: string }) {
  const [form, setForm] = useState<Profile>({
    name: profile?.name ?? '',
    email: profile?.email ?? '',
    phone: profile?.phone ?? '',
    location: profile?.location ?? '',
    portfolio_url: profile?.portfolio_url ?? '',
    linkedin_url: profile?.linkedin_url ?? '',
    master_cv_text: profile?.master_cv_text ?? '',
    work_auth_notes: profile?.work_auth_notes ?? '',
    voice_guide: profile?.voice_guide ?? '',
  });
  const [targetTitlesText, setTargetTitlesText] = useState(
    (profile?.target_titles ?? []).join(', ')
  );
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    const supabase = createClient();

    const { error } = await supabase.from('profile').upsert({
      id: userId,
      ...form,
      target_titles: targetTitlesText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      updated_at: new Date().toISOString(),
    });

    setStatus(error ? 'error' : 'saved');
  }

  function field(key: keyof Profile) {
    return {
      value: form[key] ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
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

      <LabeledInput
        label="Target titles (comma-separated)"
        value={targetTitlesText}
        onChange={(e) => setTargetTitlesText(e.target.value)}
      />

      <div>
        <label className="block text-sm text-muted mb-1">Work authorization notes</label>
        <input
          className="w-full bg-surface border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-accent"
          {...field('work_auth_notes')}
        />
      </div>

      <div>
        <label className="block text-sm text-muted mb-1">Voice guide — how you actually sound</label>
        <textarea
          rows={3}
          className="w-full bg-surface border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-accent"
          {...field('voice_guide')}
        />
      </div>

      <div>
        <label className="block text-sm text-muted mb-1">Master CV (paste full text)</label>
        <textarea
          rows={16}
          className="w-full bg-surface border border-border rounded px-3 py-3 text-text font-mono text-sm focus:outline-none focus:border-accent"
          placeholder="Paste your CV text here — every generated kit pulls only from this."
          {...field('master_cv_text')}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === 'saving'}
          className="bg-accent text-bg font-medium rounded px-5 py-2.5 hover:bg-accentDim transition-colors disabled:opacity-50 self-start"
        >
          {status === 'saving' ? 'Saving…' : 'Save profile'}
        </button>
        {status === 'saved' && <span className="text-good text-sm">Saved.</span>}
        {status === 'error' && <span className="text-danger text-sm">Couldn't save — try again.</span>}
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
