import type { SupabaseClient } from '@supabase/supabase-js';
import { getSharedSources, type NormalizedJob, type ScanSourceResult } from '@/lib/scan/sources';
import { computeMatch, isExcludedCompany, applyTeachingPenalty, type RecentRejection } from '@/lib/scan/score';
import { makeFingerprint } from '@/lib/scan/fingerprint';

const MAX_JOBS_PER_SCAN = 100;
const MAX_LISTING_AGE_DAYS = 7;

function isWithinRecencyWindow(postedAt: string | null): boolean {
  if (!postedAt) return true; // can't verify age, don't drop it over a missing field
  const posted = new Date(postedAt).getTime();
  if (Number.isNaN(posted)) return true; // unparseable date, same reasoning
  const ageMs = Date.now() - posted;
  return ageMs <= MAX_LISTING_AGE_DAYS * 24 * 60 * 60 * 1000;
}

type ScoredJob = NormalizedJob & {
  match_score: number;
  match_why: string;
  fit_tags: string[];
  gap_tags: string[];
  domain_score: number;
  skills_score: number;
  seniority_score: number;
  location_score: number;
};

export interface DropCounts {
  language: number;
  onsite: number;
  location: number;
  dealBreaker: number;
  lowScore: number;
  excludedCompany: number;
  tooOld: number;
}

export interface ScanResult {
  found: number;
  inserted: number;
  updated: number;
  dropped?: DropCounts;
  sourceErrors: string[];
  dbErrors: string[];
  message?: string;
}

// The actual "Scan now" logic, extracted so both the manual button
// (session-authenticated) and the automated cron (service-role, no session)
// call the exact same path rather than maintaining two copies.
export async function runScanForUser(
  supabase: SupabaseClient,
  userId: string,
  // Pass the boards' results in when scanning many users, so they are fetched once.
  sharedSources?: ScanSourceResult[]
): Promise<ScanResult> {
  const { data: profile, error: profileError } = await supabase
    .from('profile')
    .select(
      'target_titles, exclude_companies, must_haves, deal_breakers, locations, seniority, min_match, languages, location'
    )
    .eq('id', userId)
    .single();

  // If a column is missing (e.g. the languages migration hasn't been run yet)
  // say so instead of pretending there are no target titles.
  if (profileError) {
    return {
      found: 0,
      inserted: 0,
      updated: 0,
      sourceErrors: [],
      dbErrors: [`profile: ${profileError.message}`],
      message: 'Could not read your profile, scan skipped.',
    };
  }

  const targetTitles = profile?.target_titles ?? [];
  const excludeCompanies = profile?.exclude_companies ?? [];
  const mustHaves = profile?.must_haves ?? [];
  const dealBreakers = profile?.deal_breakers ?? [];
  const profileLocations = profile?.locations ?? [];
  const profileSeniority = profile?.seniority ?? null;
  const minMatch: number = profile?.min_match ?? 70;
  const matchOpts = {
    languages: profile?.languages?.length ? profile.languages : ['English'],
    homeLocation: profile?.location ?? null,
  };

  if (targetTitles.length === 0) {
    return {
      found: 0,
      inserted: 0,
      updated: 0,
      sourceErrors: [],
      dbErrors: [],
      message: 'No target titles set, scan skipped.',
    };
  }

  const { data: recentRejections } = await supabase
    .from('rejections')
    .select('reason, term, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  const rejections: RecentRejection[] = recentRejections ?? [];

  const sourceResults = sharedSources ?? (await getSharedSources());
  const sourceErrors = sourceResults.filter((r) => r.error).map((r) => `${r.source}: ${r.error}`);
  const dbErrors: string[] = [];

  const dropped: DropCounts = {
    language: 0,
    onsite: 0,
    location: 0,
    dealBreaker: 0,
    lowScore: 0,
    excludedCompany: 0,
    tooOld: 0,
  };

  const scoredWithDupes: ScoredJob[] = [];
  for (const j of sourceResults.flatMap((r) => r.jobs)) {
    if (isExcludedCompany(j.company, excludeCompanies)) {
      dropped.excludedCompany += 1;
      continue;
    }
    if (!isWithinRecencyWindow(j.posted_at)) {
      dropped.tooOld += 1;
      continue;
    }

    const rawMatch = computeMatch(
      j.title,
      j.description,
      targetTitles,
      mustHaves,
      dealBreakers,
      j.location,
      profileLocations,
      profileSeniority,
      matchOpts
    );

    if (rawMatch.hardExcluded) {
      if (rawMatch.excludeReason === 'language') dropped.language += 1;
      else if (rawMatch.excludeReason === 'onsite') dropped.onsite += 1;
      else if (rawMatch.excludeReason === 'location') dropped.location += 1;
      else dropped.dealBreaker += 1;
      continue;
    }

    const match = applyTeachingPenalty(rawMatch, j.title, j.company, rejections);
    if (match.score < minMatch) {
      dropped.lowScore += 1;
      continue;
    }

    scoredWithDupes.push({
      ...j,
      match_score: match.score,
      match_why: match.why,
      fit_tags: match.fitTags,
      gap_tags: match.gapTags,
      domain_score: match.domainScore,
      skills_score: match.skillsScore,
      seniority_score: match.seniorityScore,
      location_score: match.locationScore,
    });
  }

  // Some boards occasionally list the same job twice (re-tagged categories,
  // pagination overlap). A single duplicate (source, source_id) pair inside
  // one multi-row insert fails the WHOLE batch under the unique constraint,
  // not just that row, so dedupe before anything else touches the DB.
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
    return {
      found: 0,
      inserted: 0,
      updated: 0,
      sourceErrors,
      dbErrors,
      dropped,
      message: `No jobs at or above your ${minMatch} cutoff this scan.`,
    };
  }

  // Find which of these already exist so we don't clobber their status.
  const { data: existing } = await supabase
    .from('jobs')
    .select('id, source, source_id')
    .eq('user_id', userId)
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
      user_id: userId,
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
      match_why: [j.match_why],
      fit_tags: j.fit_tags,
      match_gaps: j.gap_tags,
      domain_score: j.domain_score,
      skills_score: j.skills_score,
      seniority_score: j.seniority_score,
      location_score: j.location_score,
      fingerprint: makeFingerprint(j.title, j.company),
      status: 'new' as const,
    }));
    const { data, error } = await supabase.from('jobs').insert(rows).select('id');
    if (!error) inserted = data?.length ?? 0;
    else dbErrors.push(`insert: ${error.message}`);
  }

  if (toUpdate.length > 0) {
    // Status is deliberately never included here. Updates refresh the
    // listing's details and score only; existing pipeline progress is untouched.
    const updates = await Promise.allSettled(
      toUpdate.map(async (j) => {
        const id = existingIdByKey.get(`${j.source}:${j.source_id}`);
        const { error } = await supabase
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
            match_why: [j.match_why],
            fit_tags: j.fit_tags,
            match_gaps: j.gap_tags,
            domain_score: j.domain_score,
            skills_score: j.skills_score,
            seniority_score: j.seniority_score,
            location_score: j.location_score,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        if (error) throw new Error(error.message);
      })
    );
    updated = updates.filter((r) => r.status === 'fulfilled').length;
    const failedUpdates = updates.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected'
    );
    if (failedUpdates.length > 0) {
      dbErrors.push(`${failedUpdates.length} update(s) failed: ${failedUpdates[0].reason}`);
    }
  }

  return { found: scored.length, inserted, updated, dropped, sourceErrors, dbErrors };
}
