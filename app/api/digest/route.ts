import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildDigestEmailHtml } from '@/lib/digest-email';

// GET /api/digest
// Meant to be hit once a day by Vercel Cron (see vercel.json). Runs with the
// service-role key since there's no logged-in user session at cron time.
// For every user with notify_digest on, finds jobs still sitting at status
// 'new' with a match_score at or above their cutoff, and emails them one
// digest. No digest is sent if there's nothing to report (brief 7.8: one
// digest when there are matches, not noise on every run).
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not set, cannot run the digest.' },
      { status: 500 }
    );
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'RESEND_API_KEY is not set, cannot send the digest.' },
      { status: 500 }
    );
  }

  const supabase = createAdminClient();

  const { data: profiles, error: profileError } = await supabase
    .from('profile')
    .select('id, email, min_match')
    .eq('notify_digest', true);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const profile of profiles ?? []) {
    if (!profile.email) continue;

    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('title, company, match_score, url')
      .eq('user_id', profile.id)
      .eq('status', 'new')
      .gte('match_score', profile.min_match ?? 70)
      .order('match_score', { ascending: false })
      .limit(20);

    if (jobsError) {
      errors.push(`${profile.id}: ${jobsError.message}`);
      continue;
    }
    if (!jobs || jobs.length === 0) continue;

    const html = buildDigestEmailHtml(jobs);

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Huntboard <digest@resend.dev>',
          to: profile.email,
          subject: `${jobs.length} new match${jobs.length > 1 ? 'es' : ''} on Huntboard`,
          html,
        }),
      });
      if (res.ok) sent += 1;
      else errors.push(`${profile.id}: Resend responded ${res.status}`);
    } catch (err) {
      errors.push(`${profile.id}: ${err instanceof Error ? err.message : 'send failed'}`);
    }
  }

  return NextResponse.json({ sent, errors });
}
