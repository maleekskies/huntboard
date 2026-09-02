'use client';

import { useState } from 'react';

export default function ChipInput({
  values,
  onChange,
  suggestions = [],
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');

  function commit(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setDraft('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  function remove(v: string) {
    onChange(values.filter((x) => x !== v));
  }

  const unusedSuggestions = suggestions.filter((s) => !values.includes(s));

  return (
    <div>
      <div className="flex flex-wrap gap-2 bg-surface border border-border rounded px-3 py-2 focus-within:border-accent">
        {values.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1.5 bg-accentDim/30 text-accent text-sm rounded-full px-3 py-1"
          >
            {v}
            <button
              type="button"
              onClick={() => remove(v)}
              className="text-accent/70 hover:text-accent leading-none"
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => commit(draft)}
          placeholder={values.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-text placeholder:text-muted focus:outline-none py-1"
        />
      </div>
      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {unusedSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => commit(s)}
              className="text-xs text-muted border border-border rounded-full px-3 py-1 hover:border-accent hover:text-text transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
