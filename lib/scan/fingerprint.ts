// Normalized company+title fingerprint so the same posting from two boards
// (Arbeitnow and Jobicy both listing the same role, for example) can be
// flagged as likely duplicates without merging or deleting either row.
export function makeFingerprint(title: string, company: string): string {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  return `${normalize(company)}::${normalize(title)}`;
}
