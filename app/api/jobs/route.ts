import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeMatch } from '@/lib/scan/score';
import { makeFingerprint } from '@/lib/scan/fingerprint';

// GET /api/jobs?status=&minScore=: Inbox / Pipeline list, filterable.
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const minScore = searchParams.get('minScore');

  let query = supabase
    .from('jobs')
    .select('*')
    .eq('user_id', user.id)
    .order('match_score', { ascending: false, nullsFirst: false });

  if (status) query = query.eq('status', status);
  if (minScore) query = query.gte('match_score', Number(minScore));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ jobs: data });
}

// POST /api/jobs: the "paste job URL / paste JD" path from the handoff,
// for LinkedIn and anything else we don't scrape.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { title, company, url, description, location } = body;

  if (!title || !company || !url) {
    return NextResponse.json({ error: 'title, company, and url are required' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profile')
    .select('target_titles, must_haves, deal_breakers, locations, seniority')
    .eq('id', user.id)
    .maybeSingle();

  const match = computeMatch(
    title,
    description ?? null,
    profile?.target_titles ?? [],
    profile?.must_haves ?? [],
    profile?.deal_breakers ?? [],
    location ?? null,
    profile?.locations ?? [],
    profile?.seniority ?? null
  );

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      user_id: user.id,
      source: 'manual',
      source_id: null,
      title,
      company,
      location: location ?? null,
      url,
      description: description ?? null,
      match_score: match.score,
      match_why: [match.why],
      fit_tags: match.fitTags,
      match_gaps: match.gapTags,
      domain_score: match.domainScore,
      skills_score: match.skillsScore,
      seniority_score: match.seniorityScore,
      location_score: match.locationScore,
      fingerprint: makeFingerprint(title, company),
      status: 'new',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ job: data }, { status: 201 });
}
