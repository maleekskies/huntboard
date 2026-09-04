import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/jobs/clear
// Body: { scope: 'rejected' | 'ignored' | 'stale' | 'all' }
// Deletes jobs matching the scope. 'all' is a real wipe, not a soft
// archive, since the whole point is letting the board actually be cleared.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const scope: string = body.scope;

  let query = supabase.from('jobs').delete().eq('user_id', user.id);

  if (scope === 'rejected') {
    query = query.eq('status', 'rejected');
  } else if (scope === 'ignored') {
    query = query.eq('status', 'ignored');
  } else if (scope === 'stale') {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    query = query.in('status', ['new', 'rejected', 'ignored']).lt('updated_at', thirtyDaysAgo);
  } else if (scope === 'all') {
    // no extra filter, every job owned by this user
  } else {
    return NextResponse.json({ error: 'scope must be rejected, ignored, stale, or all' }, { status: 400 });
  }

  const { error, data } = await query.select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: data?.length ?? 0 });
}
