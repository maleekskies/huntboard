import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scanAllSources } from '@/lib/scan/sources';
import { lexicalScore, isExcludedCompany } from '@/lib/scan/score';

// POST /api/scan — the "Scan now" button. Pulls from every free board API,
// scores each listing against the user's target titles, and upserts into
// jobs. Deliberately does NOT touch `status` on jobs that already exist,
// so a re-scan never resets something you already moved to Applied/Interview
// back to New — only new listings get status: 'new'.
const MAX_JOBS_PER_SCAN = 100;
const MIN_SCORE_TO_KEEP = 15;
const MAX_LISTING_AGE_DAYS = 7;

function isWithinRecencyWindow(postedAt: string | null): boolean {
  if (!postedAt) return true; // can't verify age — don't drop it over a missing field
  const posted = new Date(postedAt).getTime();
  if (Number.isNaN(posted)) return true; // unparseable date, same reasoning
  const ageMs = Date.now() - posted;
  return ageMs <= MAX_LISTING_AGE_DAYS * 24 * 60 * 60 * 1000;
}

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profile')
    .select('target_titles, exclude_companies')
    .eq('id', user.id)
    .single();

  const targetTitles = profile?.target_titles ?? [];
  const excludeCompanies = profile?.exclude_companies ?? [];

  if (targetTitles.length === 0) {
    return NextResponse.json(
      { error: 'Add at least one target title in Settings before scanning.' },
      { status: 400 }
    );
  }

  const sourceResults = await scanAllSources();
  const sourceErrors = sourceResults.filter((r) => r.error).map((r) => `${r.source}: ${r.error}`);
  const dbErrors: string[] = [];

  const scoredWithDupes = sourceResults
    .flatMap((r) => r.jobs)
    .filter((j) => !isExcludedCompany(j.company, excludeCompanies))
    .filter((j) => isWithinRecencyWindow(j.posted_at))
    .map((j) => ({
      ...j,
      match_score: lexicalScore(j.title, j.description, targetTitles),
    }))
    .filter((j) => j.match_score >= MIN_SCORE_TO_KEEP);

  // Some boards occasionally list the same job twice (re-tagged categories,
  // pagination overlap). A single duplicate (source, source_id) pair inside
  // one multi-row insert fails the WHOLE batch under the unique constraint —
  // not just that row — so dedupe before anything else touches the DB.
  const seen = new Map<string, (typeof scoredWithDupes)[number]>();
  for (const j of scoredWithDupes) {
    const key = `${j.source}:${j.source_id}`;
    const existing = seen.get(key);
    if (!existing || j.match_score > existing.match_score) seen.set(key, j);
  }

  const scored = Array.from(seen.values())
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, MAX_JOBS_PER_SCAN);

  if (scored.length === 0) {
    return NextResponse.json({
      found: 0,
      inserted: 0,
      updated: 0,
      sourceErrors,
      dbErrors,
      message: 'No matching jobs found this scan. Try broadening your target titles.',
    });
  }

  // Find which of these already exist so we don't clobber their status.
  const { data: existing } = await supabase
    .from('jobs')
    .select('id, source, source_id')
    .eq('user_id', user.id)
    .in(
      'source_id',
      scored.map((j) => j.source_id)
    );

  const existingKey = new Set((existing ?? []).map((e) => `${e.source}:${e.source_id}`));
  const existingIdByKey = new Map(
    (existing ?? []).map((e) => [`${e.source}:${e.source_id}`, e.id])
  );

  const toInsert = scored.filter((j) => !existingKey.has(`${j.source}:${j.source_id}`));
  const toUpdate = scored.filter((j) => existingKey.has(`${j.source}:${j.source_id}`));

  let inserted = 0;
  let updated = 0;

  if (toInsert.length > 0) {
    const rows = toInsert.map((j) => ({
      user_id: user.id,
      source: j.source,
      source_id: j.source_id,
      title: j.title,
      company: j.company,
      location: j.location,
      url: j.url,
      description: j.description,
      raw_json: j.raw_json,
      posted_at: j.posted_at,
      match_score: j.match_score,
      status: 'new' as const,
    }));
    const { data, error } = await supabase.from('jobs').insert(rows).select('id');
    if (!error) inserted = data?.length ?? 0;
    else dbErrors.push(`insert: ${error.message}`);
  }

  if (toUpdate.length > 0) {
    // Status is deliberately never included here — updates refresh the
    // listing's details/score only, existing pipeline progress is untouched.
    const updates = await Promise.allSettled(
      toUpdate.map((j) => {
        const id = existingIdByKey.get(`${j.source}:${j.source_id}`);
        return supabase
          .from('jobs')
          .update({
            title: j.title,
            company: j.company,
            location: j.location,
            url: j.url,
            description: j.description,
            raw_json: j.raw_json,
            posted_at: j.posted_at,
            match_score: j.match_score,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
      })
    );
    updated = updates.filter((r) => r.status === 'fulfilled').length;
  }

  return NextResponse.json({
    found: scored.length,
    inserted,
    updated,
    sourceErrors,
    dbErrors,
  });
}
