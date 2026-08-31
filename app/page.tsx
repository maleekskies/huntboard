import { createClient } from '@/lib/supabase/server';
import JobList from '@/components/JobList';
import AddJobForm from '@/components/AddJobForm';

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

  return (
    <div className="px-6 py-10 pb-24 md:pb-10 max-w-3xl">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl text-text mb-1">Inbox</h1>
          <p className="text-muted">
            {jobs?.length ? `${jobs.length} jobs, sorted by fit.` : 'Nothing here yet — add your first job.'}
          </p>
        </div>
      </div>

      <AddJobForm />

      <div className="mt-8">
        <JobList jobs={jobs ?? []} />
      </div>
    </div>
  );
}
