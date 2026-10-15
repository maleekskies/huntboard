import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/jobs/[id]/undo-reject
// Reverts a reject back to 'new' and deletes the most recent matching
// rejections row, so the 14-day teaching penalty doesn't stick around
// from a misclick.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .update({ status: 'new', reject_reason: null, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: jobError?.message ?? 'Job not found' }, { status: 404 });
  }

  const { data: lastRejection } = await supabase
    .from('rejections')
    .select('id')
    .eq('job_id', params.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastRejection) {
    await supabase.from('rejections').delete().eq('id', lastRejection.id);
  }

  return NextResponse.json({ job });
}
