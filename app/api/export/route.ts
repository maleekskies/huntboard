import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/export
// Everything owned by this user, as one JSON file. Cheap insurance since
// the whole job search lives in a single Supabase project with no other
// backup path.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const [{ data: profile }, { data: jobs }, { data: events }, { data: rejections }] = await Promise.all([
    supabase.from('profile').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('jobs').select('*').eq('user_id', user.id),
    supabase.from('events').select('*, jobs!inner(user_id)').eq('jobs.user_id', user.id),
    supabase.from('rejections').select('*').eq('user_id', user.id),
  ]);

  const jobIds = (jobs ?? []).map((j) => j.id);
  const { data: kits } = jobIds.length
    ? await supabase.from('kits').select('*').in('job_id', jobIds)
    : { data: [] };

  const payload = {
    exported_at: new Date().toISOString(),
    profile,
    jobs,
    kits,
    events,
    rejections,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="huntboard-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
