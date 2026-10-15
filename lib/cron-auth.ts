import { timingSafeEqual } from 'crypto';

// Cron endpoints run with the service-role key, which bypasses row-level
// security for every user. So they fail CLOSED: if CRON_SECRET is missing or
// too short, nothing gets in, instead of the old "no secret set = open to all".
export type CronAuth = { ok: true } | { ok: false; status: number; error: string };

export function checkCronAuth(request: Request): CronAuth {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) {
    return {
      ok: false,
      status: 500,
      error: 'CRON_SECRET is not set (or shorter than 16 characters), so this endpoint is disabled.',
    };
  }

  const header = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  return { ok: true };
}
