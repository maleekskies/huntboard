import { createClient } from '@/lib/supabase/server';
import JobList from '@/components/JobList';
import AddJobForm from '@/components/AddJobForm';
import ScanButton from '@/components/ScanButton';

export default async function InboxPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', user!.id)
    .order('match_score', { ascending: false, nullsFirst: false })
    .order('first_seen_at', { ascending: false });

  const all = jobs ?? [];
  const scannedCount = all.filter((j) => j.source !== 'manual').length;
  const appliedCount = all.filter((j) =>
    ['applied', 'interview', 'offer'].includes(j.status)
  ).length;

  return (
    <div className="px-6 py-10 pb-24 md:pb-10 max-w-3xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl text-text mb-1">Inbox</h1>
          <p className="text-muted">
            {all.length ? `${all.length} jobs, sorted by fit.` : 'Nothing here yet — scan or add your first job.'}
          </p>
        </div>
      </div>

      <div className="flex gap-4 mb-6 flex-wrap">
        <Stat label="Total found" value={all.length} />
        <Stat label="From scans" value={scannedCount} />
        <Stat label="Applied" value={appliedCount} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <ScanButton />
        <AddJobForm />
      </div>

      <div>
        <JobList jobs={all} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface border border-border rounded-lg px-4 py-3 flex-1 min-w-[120px]">
      <p className="text-2xl font-display text-accent tabular-nums">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
