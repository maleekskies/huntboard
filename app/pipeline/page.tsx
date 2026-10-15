import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Pipeline' };
export const dynamic = 'force-dynamic';

const COLUMNS = [
  { status: 'saved', label: 'Saved' },
  { status: 'kit_ready', label: 'Ready to send' },
  { status: 'applied', label: 'Applied' },
  { status: 'interview', label: 'Interview' },
] as const;

export default async function PipelinePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, company, status, match_score, next_action, next_date, interview_at, interview_notes, updated_at')
    .eq('user_id', user!.id)
    .in('status', COLUMNS.map((c) => c.status))
    .order('updated_at', { ascending: false });

  const jobIds = (jobs ?? []).map((j) => j.id);
  const { data: kits } = jobIds.length
    ? await supabase.from('kits').select('job_id, status').in('job_id', jobIds)
    : { data: [] };
  const kitStatusByJob = new Map((kits ?? []).map((k) => [k.job_id, k.status]));

  type PipelineJob = NonNullable<typeof jobs>[number];
  const byStatus = (jobs ?? []).reduce<Record<string, PipelineJob[]>>((acc, job) => {
    (acc[job.status] ??= []).push(job);
    return acc;
  }, {});

  return (
    <div className="px-6 py-10 pb-24 md:pb-10">
      <h1 className="font-display text-3xl text-text mb-1">Pipeline</h1>
      <p className="text-muted mb-8">Drag isn't wired up yet. Tap a card to change its status.</p>

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
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-text text-sm font-medium truncate">{job.title}</p>
                    {job.match_score !== null && (
                      <span className="text-accent text-xs tabular-nums shrink-0">{job.match_score}</span>
                    )}
                  </div>
                  <p className="text-muted text-xs truncate">{job.company}</p>
                  {job.status === 'interview' && job.interview_at && (
                    <p className="text-good text-xs mt-1.5">
                      Interview: {new Date(job.interview_at).toLocaleString()}
                    </p>
                  )}
                  {job.status === 'interview' && job.interview_notes && (
                    <p className="text-muted text-xs mt-1.5 truncate">Notes: {job.interview_notes}</p>
                  )}
                  {job.status === 'applied' && job.next_date && (
                    <p className="text-accent text-xs mt-1.5">Follow up {job.next_date}</p>
                  )}
                  {job.status === 'applied' && !job.next_date && (
                    <p className="text-danger text-xs mt-1.5">No follow-up date set</p>
                  )}
                  {job.next_action && (
                    <p className="text-muted text-xs mt-1.5 truncate">{job.next_action}</p>
                  )}
                  {kitStatusByJob.has(job.id) && (
                    <span className="inline-block mt-1.5 text-xs text-muted border border-border rounded-full px-2 py-0.5">
                      kit: {kitStatusByJob.get(job.id)}
                    </span>
                  )}
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
