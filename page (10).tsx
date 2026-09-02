import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
import JobList from '@/components/JobList';
import AddJobForm from '@/components/AddJobForm';
import ScanButton from '@/components/ScanButton';
import ScoreUrlForm from '@/components/ScoreUrlForm';

export default async function InboxPage({
  searchParams,
}: {
  searchParams: { first_run?: string; minScore?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profile')
    .select('onboarded_at, target_titles, locations, must_haves, min_match')
    .eq('id', user!.id)
    .maybeSingle();

  if (!profile?.onboarded_at) redirect('/onboarding');

  const minMatch = profile.min_match ?? 70;
  const activeMinScore = searchParams.minScore ? Number(searchParams.minScore) : minMatch;

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', user!.id)
    .order('match_score', { ascending: false, nullsFirst: false })
    .order('first_seen_at', { ascending: false });

  const all = jobs ?? [];
  const visible = all.filter((j) => (j.match_score ?? 0) >= activeMinScore);
  const newCount = all.filter((j) => j.status === 'new').length;
  const readyToReview = all.filter((j) => j.status === 'kit_ready');
  const inPipeline = all.filter((j) =>
    ['saved', 'kit_ready', 'applied', 'interview'].includes(j.status)
  ).length;
  const avgMatch = visible.length
    ? Math.round(visible.reduce((sum, j) => sum + (j.match_score ?? 0), 0) / visible.length)
    : null;

  return (
    <div className="px-6 py-10 pb-24 md:pb-10">
      {searchParams.first_run && (
        <div className="bg-accent/10 border border-accent/30 rounded-lg px-4 py-3 mb-6 text-sm text-text">
          These are scored against the profile you just wrote. Open one to see why.
        </div>
      )}

      <div className="mb-6">
        <h1 className="font-display text-3xl text-text mb-1">Inbox</h1>
        <p className="text-muted">
          {all.length ? `${visible.length} roles at or above ${activeMinScore} match.` : 'Nothing here yet.'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="New matches" value={newCount} />
        <Stat label="Ready to review" value={readyToReview.length} />
        <Stat label="In pipeline" value={inPipeline} />
        <Stat label="Avg match" value={avgMatch ?? 'n/a'} sub={`cutoff ${minMatch}`} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <ScanButton />
        <AddJobForm />
      </div>

      <div className="mb-6">
        <ScoreUrlForm />
      </div>

      {activeMinScore > 0 && (
        <div className="flex items-center gap-2 mb-4 text-xs text-muted">
          <span>Showing {activeMinScore}+ only.</span>
          {activeMinScore > 0 && (
            <Link href="/?minScore=0" className="text-accent hover:underline">
              Show everything
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
        <JobList jobs={visible} />

        <div className="flex flex-col gap-4">
          <div className="bg-surface border border-border rounded-lg p-4">
            <h2 className="text-sm font-medium text-text mb-3">Review queue</h2>
            {readyToReview.length === 0 ? (
              <p className="text-xs text-muted">No kits waiting on you right now.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {readyToReview.slice(0, 3).map((job) => (
                  <li key={job.id}>
                    <Link href={`/kit-studio?job=${job.id}`} className="text-sm text-text hover:text-accent block truncate">
                      {job.title} <span className="text-muted">· {job.company}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-text">Targeting</h2>
              <Link href="/settings" className="text-xs text-accent hover:underline">
                Edit
              </Link>
            </div>
            <dl className="flex flex-col gap-2 text-xs">
              <SnapshotRow label="Titles" values={profile.target_titles} />
              <SnapshotRow label="Locations" values={profile.locations} />
              <SnapshotRow label="Must-haves" values={profile.must_haves} />
              <div>
                <dt className="text-muted mb-0.5">Min match</dt>
                <dd className="text-text">{minMatch}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg px-4 py-3">
      <p className="text-2xl font-display font-bold grad-text tabular-nums">{value}</p>
      <p className="text-xs text-muted">{label}</p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function SnapshotRow({ label, values }: { label: string; values: string[] | null }) {
  return (
    <div>
      <dt className="text-muted mb-0.5">{label}</dt>
      <dd className="text-text">{values && values.length > 0 ? values.join(', ') : 'Not set'}</dd>
    </div>
  );
}
