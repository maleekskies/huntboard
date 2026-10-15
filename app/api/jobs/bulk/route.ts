import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/jobs/bulk
// Body: { ids: string[], action: 'ignore' | 'reject' | 'save' }
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const ids: string[] = body.ids ?? [];
  const action: string = body.action;

  if (ids.length === 0) return NextResponse.json({ error: 'No jobs selected' }, { status: 400 });

  const statusByAction: Record<string, string> = {
    ignore: 'ignored',
    reject: 'rejected',
    save: 'saved',
  };
  const status = statusByAction[action];
  if (!status) return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  const { data, error } = await supabase
    .from('jobs')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .in('id', ids)
    .select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ updated: data?.length ?? 0 });
}
