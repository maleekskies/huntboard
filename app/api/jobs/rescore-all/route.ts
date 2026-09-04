import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeMatch, applyTeachingPenalty, type RecentRejection } from '@/lib/scan/score';

// POST /api/jobs/rescore-all
// Deal-breakers and must-haves only ever applied to jobs scanned or added
// AFTER they were set. This retroactively re-runs the current matcher
// against every job already in the Inbox, so tightening your filters
// actually cleans up what you already have. Jobs that now hit a
// deal-breaker are moved to rejected (not deleted, stays undoable) rather
// than silently vanishing.
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profile')
    .select('target_titles, must_haves, deal_breakers, locations, seniority')
    .eq('id', user.id)
    .single();

  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id, title, company, description, location, status')
    .eq('user_id', user.id)
    .not('status', 'in', '(applied,interview,offer)'); // never touch things already in motion

  if (jobsError) return NextResponse.json({ error: jobsError.message }, { status: 500 });
  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ rescored: 0, excluded: 0 });
  }

  const { data: recentRejections } = await supabase
    .from('rejections')
    .select('reason, term, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  const rejections: RecentRejection[] = recentRejections ?? [];

  let rescored = 0;
  let excluded = 0;

  const updates = await Promise.allSettled(
    jobs.map(async (j) => {
      const raw = computeMatch(
        j.title,
        j.description,
        profile?.target_titles ?? [],
        profile?.must_haves ?? [],
        profile?.deal_breakers ?? [],
        j.location,
        profile?.locations ?? [],
        profile?.seniority ?? null
      );
      const match = applyTeachingPenalty(raw, j.title, j.company, rejections);

      const update: Record<string, unknown> = {
        match_score: match.score,
        match_why: [match.why],
        fit_tags: match.fitTags,
        match_gaps: match.gapTags,
        domain_score: match.domainScore,
        skills_score: match.skillsScore,
        seniority_score: match.seniorityScore,
        location_score: match.locationScore,
        updated_at: new Date().toISOString(),
      };

      if (match.hardExcluded && j.status !== 'rejected') {
        update.status = 'rejected';
        update.reject_reason = 'deal-breaker (rescore)';
        excluded += 1;
      }

      const { error } = await supabase.from('jobs').update(update).eq('id', j.id);
      if (!error) rescored += 1;
    })
  );

  const failed = updates.filter((r) => r.status === 'rejected').length;

  return NextResponse.json({ rescored, excluded, failed });
}
