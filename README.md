# Huntboard

A personal job-search desk. Paste your CV and target titles, scan free job
boards or paste a specific listing, and Huntboard scores each role against
your profile with a plain-language reason. Approve a kit (tailored CV, cover
letter, talking points) before you apply. Nothing sends on its own; every
application goes out through you, on the real job posting's own site.

Live at: https://huntboard-nu.vercel.app

## What it actually does

- **Onboarding**: a four-step setup (target titles, locations, must-haves and
  deal-breakers, master CV) before the Inbox has anything to show.
- **Inbox**: scans RemoteOK, Remotive, Himalayas, Arbeitnow, Jobicy, and
  Adzuna, or scores a single pasted job URL instantly. Every row shows a
  score, a one-sentence reason, and fit/gap tags. Sortable by recency or
  score, searchable, with bulk select for Save/Ignore/Reject. Duplicate
  postings from different boards are flagged, not merged. Untouched listings
  auto-archive after 30 days.
- **Job detail**: score breakdown (domain, skills, seniority, location),
  a next-action/date field, Approve kit / Save to pipeline / Reject-with-reason
  actions. Rejecting softly downranks similar roles for 14 days.
- **Pipeline**: a 4-column board (Saved, Ready to send, Applied, Interview).
  Applied requires a follow-up date; Interview cards show the date and any
  prep notes.
- **Kit Studio**: the per-role kit (tailored CV, cover letter, talking
  points, gap-handling note) with a draft/needs-edit/approved status.
- **Settings**: target titles, locations, must-haves, deal-breakers, min
  match cutoff, seniority, master CV (paste or upload a PDF), voice guide,
  proof points, and a maintenance panel (re-score all jobs against current
  filters, clear the board, export your data as JSON, send a test digest).
- **Digest**: an optional daily email of new matches above your cutoff, via
  Resend, triggered by Vercel Cron.

## Stack

- Next.js 14.2.35 (App Router) on Vercel. Pinned to the 14.x line (patched:
  14.2.5 and earlier have a known RSC RCE, fixed in 14.2.35) because
  `cookies()`/`headers()` are still synchronous there, which keeps the
  Supabase server client simple. Next.js 15/16 made these async; upgrading
  later means `lib/supabase/server.ts` and `middleware.ts` both need
  `await cookies()`.
- Supabase: Postgres, magic-link auth, row-level security on every table.
- Groq: free LLM for per-role scoring, CV tailoring, and cover letters.
- A cheap keyword-based scorer (`lib/scan/score.ts`) runs on every scanned
  or pasted job before any LLM call, so Groq is only spent on roles you
  actually open.
- `@react-pdf/renderer` for ATS-safe single-column PDF export.
- `pdf-parse` for extracting text from an uploaded CV PDF.
- Resend for the daily digest email.

## Setup

1. **Supabase project**
   - Create a free project at supabase.com
   - Run `supabase/schema.sql` in the SQL editor
   - Email auth with magic link is on by default; confirm under
     Authentication → Providers
   - Copy the Project URL and anon key from Settings → API
   - Copy the service role key too (Settings → API, the secret one), only
     needed for the digest cron

2. **Groq key**: free, no card, from console.groq.com/keys

3. **Adzuna key**: free, no card, from developer.adzuna.com/signup (app_id
   and app_key)

4. **Resend key**: free, from resend.com, only needed if you want the daily
   digest email

5. **Environment**
   ```bash
   cp .env.example .env.local
   # fill in every value in .env.example
   ```

6. **Install and run**
   ```bash
   npm install
   npm run dev
   ```
   Visit http://localhost:3000. You'll be redirected to `/login`, sign in
   with the magic link sent to your email, then land on the four-step setup.

## Deploy

`npx vercel --prod`, or push to GitHub and import into Vercel. Add every
variable from `.env.example` in the project's Environment Variables
settings, plus `CRON_SECRET` if you want the digest endpoint to require a
shared secret (optional; Vercel Cron can call it either way).

`vercel.json` schedules `/api/digest` once a day. It only sends to accounts
with the digest toggle on in Settings, and only when there's something above
their cutoff to report.

## Non-negotiable rules (baked into the prompts, not just docs)

1. Never invent experience, titles, dates, metrics, or employers. The
   prompts in `lib/llm/prompts.ts` say this explicitly and are grounded only
   in `profile.master_cv_text`.
2. Tailoring means reordering and rephrasing real facts, never fabrication.
3. Every kit stores a `facts_used` audit list, shown on the job detail page.
4. Applying is always manual. "Open official apply page" opens the real URL;
   there is no submit button anywhere in this app.
5. Your CV and cover letters live in your own Supabase project. The only
   third party that sees them is Groq, at generation time.

## What's not built

- The job detail page is a full page, not a slide-out drawer.
- The tailored CV shown in Kit Studio is reordered and rephrased, not a
  true line-level diff against the master CV.
- Kanban drag-and-drop; status changes happen from a dropdown on the job
  page.
- Company-specific ATS integrations (Greenhouse, Lever, Ashby job boards).
