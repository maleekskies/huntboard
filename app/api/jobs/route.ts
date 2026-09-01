import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
      status: 'new',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ job: data }, { status: 201 });
}
