import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/ingest/jobs
// Body: { jobs: NormalizedJob[] }
// Called by the scan worker (free_job_agent.py rewritten, a GitHub Action,
// or an in-app route handler in Phase 1). Upserts on (user_id, source, source_id)
// so re-scanning never creates duplicates. Not used yet in Phase 0.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const jobs = body.jobs as Array<{
    source: string;
    source_id: string;
    title: string;
    company: string;
    location?: string;
    url: string;
    description?: string;
    raw_json?: unknown;
    posted_at?: string;
  }>;

  if (!Array.isArray(jobs) || jobs.length === 0) {
    return NextResponse.json({ error: 'jobs[] is required' }, { status: 400 });
  }

  const rows = jobs.map((j) => ({ ...j, user_id: user.id, status: 'new' as const }));

  const { data, error } = await supabase
    .from('jobs')
    .upsert(rows, { onConflict: 'user_id,source,source_id', ignoreDuplicates: true })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inserted: data.length });
}
