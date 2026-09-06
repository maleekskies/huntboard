import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runScanForUser } from '@/lib/scan/run-scan';

// GET /api/cron/scan (triggered by a GitHub Actions schedule, see
// .github/workflows/scan.yml, since Vercel's own cron caps at once/day on
// the Hobby plan and this needs to run 3x/day)
// Runs the exact same scan as the "Scan now" button, once per user who has
// at least one target title set, with no session to authenticate as (hence
// the service-role client). Skips anyone with no titles rather than erroring.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not set, cannot run the automated scan.' },
      { status: 500 }
    );
  }

  const supabase = createAdminClient();

  const { data: profiles, error: profileError } = await supabase
    .from('profile')
    .select('id, target_titles')
    .not('target_titles', 'is', null);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const results: Record<string, unknown> = {};

  for (const profile of profiles ?? []) {
    if (!profile.target_titles || profile.target_titles.length === 0) continue;
    try {
      results[profile.id] = await runScanForUser(supabase, profile.id);
    } catch (err) {
      results[profile.id] = { error: err instanceof Error ? err.message : 'Scan failed to complete.' };
    }
  }

  return NextResponse.json({ ranFor: Object.keys(results).length, results });
}
