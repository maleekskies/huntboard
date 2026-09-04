import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildDigestEmailHtml } from '@/lib/digest-email';

// POST /api/digest/test
// Sends one digest to the current user immediately, so you can confirm the
// Resend setup actually works without waiting for the daily cron.
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not set.' }, { status: 500 });
  }

  const { data: profile } = await supabase
    .from('profile')
    .select('email, min_match')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.email) {
    return NextResponse.json({ error: 'No email on file in Settings.' }, { status: 400 });
  }

  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('title, company, match_score')
    .eq('user_id', user.id)
    .eq('status', 'new')
    .gte('match_score', profile.min_match ?? 70)
    .order('match_score', { ascending: false })
    .limit(20);

  if (jobsError) return NextResponse.json({ error: jobsError.message }, { status: 500 });

  const count = jobs?.length ?? 0;
  const html = buildDigestEmailHtml(jobs ?? [], 'This is a test send, triggered manually from Settings.');

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
        subject: 'Huntboard test digest',
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ error: `Resend responded ${res.status}: ${body}` }, { status: 502 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Send failed to complete.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ sent: true, matchCount: count });
}
