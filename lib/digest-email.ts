const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://huntboard-nu.vercel.app';

// Titles and company names come from third-party job boards, so they are
// untrusted text and must not be dropped into the email as raw HTML.
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildDigestEmailHtml(
  jobs: Array<{ title: string; company: string; match_score: number | null }>,
  footerNote?: string
): string {
  const count = jobs.length;
  const rows = jobs
    .map(
      (j) =>
        `<tr><td style="padding:6px 0">${esc(j.title)} at ${esc(j.company)}</td><td style="padding:6px 0;text-align:right">${j.match_score}</td></tr>`
    )
    .join('');

  return `
    <div style="font-family:sans-serif;max-width:480px">
      <h2>${count ? `${count} match${count > 1 ? 'es' : ''} above your cutoff` : 'No matches above your cutoff right now'}</h2>
      ${count ? `<table style="width:100%;border-collapse:collapse">${rows}</table>` : ''}
      <p><a href="${APP_URL}">Open Huntboard</a></p>
      <p style="color:#888;font-size:12px">You get this because the daily digest is on. Turn it off any time in <a href="${APP_URL}/settings">Settings</a>.</p>
      ${footerNote ? `<p style="color:#888;font-size:12px">${footerNote}</p>` : ''}
    </div>
  `;
}
