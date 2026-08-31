# Huntboard

Personal job-hunt agent + apply dashboard. Paste your CV, add a job, get a
tailored CV + cover letter + form answers — you review, then apply yourself.
Nothing auto-submits.

This is **Phase 0** from the build plan: manual job entry, kit generation,
downloads, status tracking. Board scanning (RemoteOK/Remotive/Himalayas) is
Phase 1 — the ingest endpoint is already wired for it, just not called yet.

## Stack

- Next.js 14.2.35 (App Router) on Vercel — free. Pinned to the 14.x line
  (patched — 14.2.5 and earlier have a known RSC RCE, fixed in 14.2.35)
  because `cookies()`/`headers()` are still synchronous there, which keeps
  the Supabase server client simple. Next.js 15/16 made these async — if you
  upgrade later, `lib/supabase/server.ts` and `middleware.ts` both need
  `await cookies()` instead of the current sync call.
- Supabase — Postgres + magic-link auth + (later) file storage — free tier
- Groq — free LLM API for scoring, CV tailoring, cover letters
- `@react-pdf/renderer` for ATS-safe single-column PDF export

## Setup

1. **Supabase project**
   - Create a free project at supabase.com
   - In the SQL editor, run `supabase/schema.sql`
   - In Authentication → Providers, make sure Email is enabled with magic link
     (it is by default)
   - Copy your Project URL and anon key from Settings → API

2. **Groq key**
   - Sign up free at console.groq.com/keys, no card required
   - Create an API key

3. **Environment**
   ```bash
   cp .env.example .env.local
   # fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, GROQ_API_KEY
   ```

4. **Install and run**
   ```bash
   npm install
   npm run dev
   ```
   Visit http://localhost:3000 — you'll be redirected to `/login`, sign in
   with a magic link sent to your email.

5. **First use**
   - Go to Settings, paste your master CV, fill in target titles and voice guide
   - Go to Inbox, click "Add job", paste a job URL + description
   - Open the job, click "Generate kit"
   - Review the tailored CV / cover letter / form packet tabs
   - Click "Open official apply page" and apply on the real site
   - Set status to Applied

## Deploy

Push to a GitHub repo, import into Vercel, add the same three env vars in
Vercel's project settings. Free Hobby tier covers this.

## Non-negotiable rules (baked into the prompts, not just docs)

1. Never invent experience, titles, dates, metrics, or employers — the LLM
   prompts in `lib/llm/prompts.ts` state this explicitly and are grounded
   only in `profile.master_cv_text`.
2. Tailoring = reorder + rephrase real facts, never fabrication.
3. Every kit stores a `facts_used` audit list, shown under the job detail page.
4. Apply is always manual — "Open official apply page" opens the real URL,
   there is no submit button anywhere in this app.
5. CV/cover letter text lives in your own Supabase project. The only third
   party that sees it is Groq, when generating.

## What's not built yet (see the original handoff for the full roadmap)

- **Phase 1**: automatic scanning of RemoteOK/Remotive/Himalayas/Arbeitnow/Jobicy
  into the Inbox via `/api/ingest/jobs` (already accepts the payload — needs
  a scanner script or GitHub Action to call it)
- **Phase 2**: Greenhouse/Lever/Ashby ATS-aware packets, scheduled daily scans
- **Phase 3 (optional)**: Playwright-assisted form fill with a confirm gate,
  email digests, STAR-story bank
- Kanban drag-and-drop (currently tap-to-open, change status on the job page)
- File storage for generated PDFs (currently generated on-demand, not persisted
  to Supabase Storage — add this if you want a history of exact PDFs sent)
