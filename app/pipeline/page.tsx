import { createClient } from '@/lib/supabase/server';
import type { Job, JobStatus } from '@/lib/types';
import Link from 'next/link';

const COLUMNS: { status: JobStatus; label: string }[] = [
  { status: 'new', label: 'New' },
  { status: 'saved', label: 'Saved' },
  { status: 'kit_ready', label: 'Kit ready' },
  { status: 'applied', label: 'Applied' },
  { status: 'interview', label: 'Interview' },
  { status: 'offer', label: 'Offer' },
  { status: 'rejected', label: 'Rejected' },
];

export default async function PipelinePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', user!.id)
    .neq('status', 'ignored')
    .order('updated_at', { ascending: false });

  const byStatus = (jobs ?? []).reduce<Record<string, Job[]>>((acc, job) => {
    (acc[job.status] ??= []).push(job as Job);
    return acc;
  }, {});

  return (
    <div className="px-6 py-10 pb-24 md:pb-10">
      <h1 className="font-display text-3xl text-text mb-1">Pipeline</h1>
      <p className="text-muted mb-8">Drag isn't wired up yet — tap a card to change its status.</p>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <div key={col.status} className="w-64 shrink-0">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-sm text-muted">{col.label}</h2>
              <span className="text-xs text-muted">{byStatus[col.status]?.length ?? 0}</span>
            </div>
            <div className="flex flex-col gap-2">
              {(byStatus[col.status] ?? []).map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="block bg-surface hover:bg-surfaceHover border border-border rounded-lg px-3 py-3 transition-colors"
                >
                  <p className="text-text text-sm font-medium truncate">{job.title}</p>
                  <p className="text-muted text-xs truncate">{job.company}</p>
                </Link>
              ))}
              {(byStatus[col.status] ?? []).length === 0 && (
                <div className="border border-dashed border-border rounded-lg px-3 py-6 text-center text-xs text-muted">
                  Empty
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
