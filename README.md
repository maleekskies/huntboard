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
- **Automated scan**: runs 3x a day via a GitHub Actions schedule for every
  account with target titles set, same logic as the "Scan now" button.
  Vercel's own cron can't run more than once a day on the Hobby plan, so
  this uses GitHub Actions instead. No action needed beyond setting target
  titles in Settings.
- **Digest**: an optional daily email of new matches above your cutoff, via
  Resend, triggered by Vercel Cron.

## Stack

- Next.js 14.2.35 (App Router) on Vercel. Pinned to the 14.x line (patched:
  14.2.5 and earlier have a known RSC RCE, fixed in 14.2.35) because
  `cookies()`/`headers()` are still synchronous there, which keeps the
  Supabase server client simple. Next.js 15/16 made these async; upgrading
  later means `lib/supabase/server.ts` and `middleware.ts` both need
  `await cookies()`.
- Supabase: Postgres, email/password auth, row-level security on every table.
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
   - Under Authentication → Sign In / Providers → Email, turn **off**
     "Confirm email". Auth is email + password with no verification step;
     magic-link and its email-sending limits were dropped entirely rather
     than worked around. This is a real tradeoff: anyone can sign up with
     any email address, since nothing confirms they own it, and there's no
     password-reset path (that would need to send email too). Fine for a
     personal tool with a small set of known testers, not fine for a
     public-facing product
   - Copy the Project URL and anon key from Settings → API
   - Copy the service role key too (Settings → API, the secret one), needed
     for the digest and automated scan

2. **Groq key**: free, no card, from console.groq.com/keys

3. **Adzuna key**: free, no card, from developer.adzuna.com/signup (app_id
   and app_key)

4. **Resend key**: free, from resend.com, used for the daily digest email

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
   Visit http://localhost:3000. You'll be redirected to `/login`, create an
   account with an email and password (or sign in if you already have one),
   then land on the four-step setup.

## Deploy

`npx vercel --prod`, or push to GitHub and import into Vercel. Add every
variable from `.env.example` in the project's Environment Variables
settings, including `CRON_SECRET`, a secret string you make up yourself.
Unlike the digest (called by Vercel's own trusted cron), the scan endpoint
is called from GitHub Actions over the public internet, so `CRON_SECRET`
actually needs to be set this time, not left optional.

`vercel.json` schedules the digest at 8am UTC, after the automated scan
(below) has had a chance to run, so there's something fresh to report.

### Automated scanning (3x/day)

Vercel's Hobby plan caps cron at once a day, so scanning is triggered from outside:

- **GitHub Actions** (`.github/workflows/scan.yml`, default): calls `/api/cron/scan` page by page (25 users per call) until every user is scanned. Set the repo secret `CRON_SECRET` to the same value as on Vercel. GitHub pauses scheduled workflows after 60 days with no repo activity, so for a public product prefer the option below.
- **Supabase pg_cron** (`supabase/cron.sql`): runs inside your database, independent of the repo. Run it yourself in the SQL editor with your URL and secret filled in.

The job boards are downloaded once per call and shared by every user in the batch, so cost does not grow per user.

**`CRON_SECRET` is required** (16+ characters). `/api/cron/scan` and `/api/digest` refuse to run without it, because they use the service-role key.

## Before you launch publicly

- [ ] `CRON_SECRET` set on Vercel and GitHub; `SUPABASE_SERVICE_ROLE_KEY` set on Vercel only.
- [ ] Sign-in is email + password with "Confirm email" off, so anyone can sign up with any address. For a public launch turn **Confirm email on**, and note that confirmation and password-reset emails need working email: Supabase's built-in sender only delivers to your own team's addresses, so set up custom SMTP (Authentication → SMTP Settings) with a Resend-verified domain first.
- [ ] In Supabase, Authentication → URL Configuration, add `https://YOUR-APP-URL/auth/callback` to Redirect URLs (the password-reset link lands there).
- [ ] Resend domain is also needed for the daily digest: verify it and set `RESEND_FROM`.
- [ ] Set `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_CONTACT_EMAIL`; have the Privacy and Terms pages reviewed (they are templates that match what the app does today).
- [ ] Run `supabase/schema.sql` additions (languages column, `usage_daily` and `bump_usage`).
- [ ] Keep personal files (`profile.md`, `cv.pdf`) out of the repo; `.gitignore` covers them.
- [ ] Watch Groq and Adzuna usage; per-user daily limits live in `lib/limits.ts`.

## Strict filtering

The scan drops a listing, instead of just ranking it lower, when it is strict about something you can't or won't meet. Remote roles open to you are always fine, wherever the company is based.

- **Language:** set "Languages I speak" in Settings (default English). Listings that require another language ("fluent German", "French-speaking", "Deutsch C1", a German job title) are dropped, and so are listings written in another language. "German is a plus" only lowers the score by 10.
- **On-site / hybrid:** dropped unless the place is one of your Locations or your home location.
- **Region-locked remote:** "Remote - USA only", "must be based in the EU", "authorized to work in the US" are dropped. Worldwide, Anywhere, Africa, EMEA and Nigeria pass.
- **Cutoff:** the scan only stores jobs at or above your Min match cutoff, and the Inbox opens at that cutoff ("Show everything" lifts it). Jobs you've saved or applied to are never hidden by it.
- Each scan reports how many it dropped and why. "Re-score all" in Settings applies the same rules to jobs already in your Inbox.

If you upgrade an existing project, run the `alter table profile add column languages` statement at the bottom of `supabase/schema.sql` in the Supabase SQL editor before deploying.

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
