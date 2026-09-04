export function buildDigestEmailHtml(
  jobs: Array<{ title: string; company: string; match_score: number | null }>,
  footerNote?: string
): string {
  const count = jobs.length;
  const rows = jobs
    .map(
      (j) =>
        `<tr><td style="padding:6px 0">${j.title} at ${j.company}</td><td style="padding:6px 0;text-align:right">${j.match_score}</td></tr>`
    )
    .join('');

  return `
    <div style="font-family:sans-serif;max-width:480px">
      <h2>${count ? `${count} match${count > 1 ? 'es' : ''} above your cutoff` : 'No matches above your cutoff right now'}</h2>
      ${count ? `<table style="width:100%;border-collapse:collapse">${rows}</table>` : ''}
      <p><a href="https://huntboard-nu.vercel.app">Open Huntboard</a></p>
      ${footerNote ? `<p style="color:#888;font-size:12px">${footerNote}</p>` : ''}
    </div>
  `;
}
