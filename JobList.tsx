import Link from 'next/link';
import type { Job } from '@/lib/types';
import { relativeAge } from '@/lib/format';

function scoreClass(score: number | null): string {
  if (score === null) return 'text-muted';
  if (score >= 85) return 'text-good';
  if (score >= 70) return 'grad-text';
  return 'text-danger';
}

function companyMark(company: string): string {
  const words = company.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function JobList({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) {
    return (
      <p className="text-muted text-sm py-8 text-center border border-dashed border-border rounded-lg">
        No matches yet. Huntboard scores roles against your titles and must-haves. Add a source or
        wait for the next scan.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {jobs.map((job) => {
        const age = relativeAge(job.posted_at);
        const why = job.match_why?.[0];
        return (
          <li key={job.id}>
            <Link
              href={`/jobs/${job.id}`}
              className="grid grid-cols-[52px_1fr_auto] gap-3 items-start bg-surface hover:bg-surfaceHover border border-border rounded-lg px-4 py-4 transition-colors"
            >
              <div className="w-[52px] h-[52px] rounded-lg bg-bg border border-border flex items-center justify-center text-accent font-semibold text-sm">
                {companyMark(job.company)}
              </div>

              <div className="min-w-0">
                <p className="text-text font-medium truncate">{job.title}</p>
                <p className="text-muted text-xs flex flex-wrap gap-x-2 mt-0.5">
                  <span>{job.company}</span>
                  {job.location && <span>· {job.location}</span>}
                  {age && <span>· {age}</span>}
                </p>
                {why && <p className="text-sm text-text/80 mt-2">{why}</p>}
                {((job.fit_tags?.length ?? 0) > 0 || (job.match_gaps?.length ?? 0) > 0) && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {job.fit_tags?.slice(0, 3).map((tag) => (
                      <span
                        key={`fit-${tag}`}
                        className="text-xs text-good border border-good/30 bg-good/10 rounded-full px-2 py-0.5"
                      >
                        {tag}
                      </span>
                    ))}
                    {job.match_gaps?.slice(0, 2).map((tag) => (
                      <span
                        key={`gap-${tag}`}
                        className="text-xs text-accent border border-accent/30 bg-accent/10 rounded-full px-2 py-0.5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-right shrink-0">
                {job.match_score !== null && (
                  <span className={`text-xl font-display tabular-nums ${scoreClass(job.match_score)}`}>
                    {job.match_score}
                  </span>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
