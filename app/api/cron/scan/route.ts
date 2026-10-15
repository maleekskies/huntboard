import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runScanForUser } from '@/lib/scan/run-scan';
import { getSharedSources } from '@/lib/scan/sources';
import { checkCronAuth } from '@/lib/cron-auth';

// Room for a batch of users in one call (Vercel Hobby allows up to 60s).
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const DEFAULT_BATCH = 25;
const CONCURRENCY = 4;
const TIME_BUDGET_MS = 45_000;

// GET /api/cron/scan?offset=0&limit=25
// Called by the scheduler (see .github/workflows/scan.yml or supabase/cron.sql).
// The six job boards are downloaded ONCE and shared across every user in the
// batch, instead of once per user. Users are processed in pages so a growing
// user base never runs into the function time limit: the response says
// `done: false` and gives `nextOffset`, and the scheduler keeps calling until done.
export async function GET(request: Request) {
  const auth = checkCronAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not set, cannot run the automated scan.' },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0) || 0);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? DEFAULT_BATCH) || DEFAULT_BATCH));

  const supabase = createAdminClient();

  const { data: profiles, error: profileError } = await supabase
    .from('profile')
    .select('id, target_titles')
    .not('target_titles', 'is', null)
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const batch = (profiles ?? []).filter((p) => p.target_titles && p.target_titles.length > 0);
  const started = Date.now();
  const shared = await getSharedSources();

  const results: Record<string, unknown> = {};
  let processed = 0;

  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    const slice = batch.slice(i, i + CONCURRENCY);
    await Promise.all(
      slice.map(async (profile) => {
        try {
          const r = await runScanForUser(supabase, profile.id, shared);
          // Keep the response small: counts only, no per-user detail.
          results[profile.id] = { inserted: r.inserted, updated: r.updated, errors: r.dbErrors.length };
        } catch (err) {
          results[profile.id] = { error: err instanceof Error ? err.message : 'Scan failed to complete.' };
        }
      })
    );
    processed += slice.length;
  }

  // Anyone in the page who qualified but wasn't reached (time budget ran out)
  // is where the next call resumes. Page size is what was asked for, not what
  // survived the filter, so pagination stays stable as profiles change.
  const batchIds = new Set(batch.map((p) => p.id));
  const pending = (profiles ?? []).findIndex((p) => batchIds.has(p.id) && !(p.id in results));
  const finishedBatch = pending === -1;
  const pageFull = (profiles ?? []).length === limit;
  const done = finishedBatch && !pageFull;
  const nextOffset = finishedBatch ? offset + limit : offset + pending;

  return NextResponse.json({ ranFor: processed, done, nextOffset: done ? null : nextOffset });
}
