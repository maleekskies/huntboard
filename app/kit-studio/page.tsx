import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';
import KitReview from '@/components/KitReview';

export const metadata: Metadata = { title: 'Kit Studio' };
export const dynamic = 'force-dynamic';

export default async function KitStudioPage({
  searchParams,
}: {
  searchParams: { job?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!searchParams.job) {
    const { data: recentKits } = await supabase
      .from('kits')
      .select('job_id, status, generated_at, jobs!inner(id, title, company, user_id)')
      .eq('jobs.user_id', user!.id)
      .order('generated_at', { ascending: false })
      .limit(10);

    return (
      <div className="max-w-2xl px-6 py-10 pb-24 md:pb-10">
        <h1 className="font-display text-3xl text-text mb-1">Kit Studio</h1>
        <p className="text-muted mb-8">One kit per role. Approve is the only path that allows send.</p>

        {!recentKits || recentKits.length === 0 ? (
          <p className="text-muted text-sm border border-dashed border-border rounded-lg p-6 text-center">
            Pick a match from Inbox. Huntboard will draft a kit for that role only.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(recentKits as unknown as Array<{
              job_id: string;
              status: string;
              jobs: { id: string; title: string; company: string };
            }>).map((k) => (
              <li key={k.job_id}>
                <Link
                  href={`/kit-studio?job=${k.job_id}`}
                  className="flex items-center justify-between gap-4 bg-surface hover:bg-surfaceHover border border-border rounded-lg px-4 py-3 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-text text-sm font-medium truncate">{k.jobs.title}</p>
                    <p className="text-muted text-xs truncate">{k.jobs.company}</p>
                  </div>
                  <span className="text-xs text-muted border border-border rounded-full px-2 py-0.5 shrink-0">
                    {k.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', searchParams.job)
    .eq('user_id', user!.id)
    .maybeSingle();

  const { data: kit } = job
    ? await supabase
        .from('kits')
        .select('*')
        .eq('job_id', job.id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  if (!job || !kit) {
    return (
      <div className="max-w-2xl px-6 py-10 pb-24 md:pb-10">
        <h1 className="font-display text-3xl text-text mb-1">Kit Studio</h1>
        <p className="text-muted text-sm border border-dashed border-border rounded-lg p-6 text-center mt-8">
          No kit found for that role yet. Open it from the Inbox and generate one first.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl px-6 py-10 pb-24 md:pb-10">
      <KitReview job={job} kit={kit} />
    </div>
  );
}
