import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runScanForUser } from '@/lib/scan/run-scan';

// POST /api/scan: the "Scan now" button. Same logic as the automated daily
// scan in /api/cron/scan, just triggered manually and scoped to whoever is
// logged in.
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const result = await runScanForUser(supabase, user.id);

  if (result.message === 'No target titles set, scan skipped.') {
    return NextResponse.json(
      { error: 'Add at least one target title in Settings before scanning.' },
      { status: 400 }
    );
  }

  return NextResponse.json(result);
}
