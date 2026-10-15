export function relativeAge(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr).getTime();
  if (Number.isNaN(date)) return null;

  const diffMs = Date.now() - date;
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (days <= 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
