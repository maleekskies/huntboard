import type { SupabaseClient } from '@supabase/supabase-js';

// Per-user daily caps. One shared Groq key and a handful of free job-board
// APIs sit behind every account, so no single user may drain them.
export const DAILY_LIMITS = {
  scan: 10, // "Scan now" presses
  kit: 25, // kit generations (Groq)
  scoreUrl: 40, // pasted job URLs
  parseCv: 10, // CV PDF uploads
} as const;

export type LimitKind = keyof typeof DAILY_LIMITS;

const LABELS: Record<LimitKind, string> = {
  scan: 'scans',
  kit: 'kit generations',
  scoreUrl: 'pasted job links',
  parseCv: 'CV uploads',
};

// Returns null when the user is under their limit, or a message to show them.
// If the counter itself fails (e.g. the migration hasn't been run) this lets
// the request through and logs, rather than locking everyone out.
export async function overLimit(supabase: SupabaseClient, kind: LimitKind): Promise<string | null> {
  const { data, error } = await supabase.rpc('bump_usage', { p_kind: kind, p_limit: DAILY_LIMITS[kind] });
  if (error) {
    console.error(`bump_usage(${kind}) failed:`, error.message);
    return null;
  }
  if (data === false) {
    return `You've used today's limit of ${DAILY_LIMITS[kind]} ${LABELS[kind]}. It resets at midnight UTC.`;
  }
  return null;
}
