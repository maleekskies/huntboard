import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Server-only, RLS-bypassing client. Only ever used by /api/digest, which
// runs on a schedule with no logged-in user session to authenticate as.
// Never import this from a client component or any route reachable by
// a normal authenticated request.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
