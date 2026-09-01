'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Profile {
  master_cv_text?: string;
  voice_guide?: string;
  proof_points?: string;
}

export default function KitStudioForm({ profile, userId }: { profile: Profile | null; userId: string }) {
  const [form, setForm] = useState<Profile>({
    master_cv_text: profile?.master_cv_text ?? '',
    voice_guide: profile?.voice_guide ?? '',
    proof_points: profile?.proof_points ?? '',
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
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
      setForm((f) => ({ ...f, master_cv_text: data.text }));
      setUploadStatus('idle');
    } catch {
      setUploadStatus('error');
      setUploadError('Upload failed — try again.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    const supabase = createClient();

    const { error } = await supabase.from('profile').upsert({
      id: userId,
      ...form,
      updated_at: new Date().toISOString(),
    });

    setStatus(error ? 'error' : 'saved');
  }

  function field(key: keyof Profile) {
    return {
      value: form[key] ?? '',
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
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
        {uploadStatus === 'error' && uploadError && (
          <p className="text-danger text-xs mb-2">{uploadError}</p>
        )}
        <textarea
          rows={16}
          className="w-full bg-surface border border-border rounded px-3 py-3 text-text font-mono text-sm focus:outline-none focus:border-accent"
          placeholder="Paste your CV text here, or upload a PDF above — every generated kit pulls only from this."
          {...field('master_cv_text')}
        />
      </div>

      <div>
        <label className="block text-sm text-muted mb-1">Voice guide — how you actually sound</label>
        <textarea
          rows={3}
          className="w-full bg-surface border border-border rounded px-3 py-2 text-text focus:outline-none focus:border-accent"
          placeholder="e.g. Human, plain, specific. No corporate filler, no clichés."
          {...field('voice_guide')}
        />
      </div>

      <div>
        <label className="block text-sm text-muted mb-1">
          Proof points / STAR stories — real wins, in your own words
        </label>
        <textarea
          rows={8}
          className="w-full bg-surface border border-border rounded px-3 py-2 text-text text-sm focus:outline-none focus:border-accent"
          placeholder="One per line or paragraph — a project you shipped, a number you moved, a problem you solved. Cover letters draw on this for specifics beyond the CV."
          {...field('proof_points')}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === 'saving'}
          className="bg-accent text-bg font-medium rounded px-5 py-2.5 hover:bg-accentDim transition-colors disabled:opacity-50 self-start"
        >
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {status === 'saved' && <span className="text-good text-sm">Saved.</span>}
        {status === 'error' && <span className="text-danger text-sm">Couldn't save — try again.</span>}
      </div>
    </form>
  );
}
