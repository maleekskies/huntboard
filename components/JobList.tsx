import Link from 'next/link';
import type { Job } from '@/lib/types';

const STATUS_LABEL: Record<string, string> = {
  new: 'New',
  saved: 'Saved',
  kit_ready: 'Kit ready',
  applied: 'Applied',
  interview: 'Interview',
  rejected: 'Rejected',
  offer: 'Offer',
  ignored: 'Ignored',
};

export default function JobList({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) {
    return (
      <p className="text-muted text-sm py-8 text-center border border-dashed border-border rounded-lg">
        No jobs yet. Add one above to generate your first kit.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {jobs.map((job) => (
        <li key={job.id}>
          <Link
            href={`/jobs/${job.id}`}
            className="flex items-center justify-between gap-4 bg-surface hover:bg-surfaceHover border border-border rounded-lg px-4 py-4 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-text font-medium truncate">{job.title}</p>
              <p className="text-muted text-sm truncate">
                {job.company}
                {job.location ? ` · ${job.location}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {job.match_score !== null && (
                <span className="text-accent text-sm font-medium tabular-nums">{job.match_score}</span>
              )}
              <span className="text-xs text-muted bg-bg border border-border rounded px-2 py-1">
                {STATUS_LABEL[job.status] ?? job.status}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
