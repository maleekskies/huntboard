// Cheap keyword-overlap score used only at scan time, to sort the Inbox and
// avoid calling the LLM on every single listing (the handoff is explicit
// about this: generate the real kit lazily, only for jobs the user opens).
// The real score, tied to actual CV facts, still comes from Groq at
// generate-kit time and overwrites this one.

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

export function lexicalScore(
  title: string,
  description: string | null,
  targetTitles: string[]
): number {
  if (targetTitles.length === 0) return 30; // neutral, unscored

  const titleTokens = new Set(tokenize(title));
  const descTokens = new Set(tokenize(description ?? ''));

  let best = 0;
  for (const target of targetTitles) {
    const targetTokens = tokenize(target);
    if (targetTokens.length === 0) continue;

    const titleHits = targetTokens.filter((t) => titleTokens.has(t)).length;
    const descHits = targetTokens.filter((t) => descTokens.has(t)).length;

    // Title matches count for much more than description matches.
    const score = Math.round(
      (titleHits / targetTokens.length) * 80 + (descHits / targetTokens.length) * 20
    );
    best = Math.max(best, score);
  }

  return Math.min(best, 100);
}

export function isExcludedCompany(company: string, excludeList: string[]): boolean {
  if (excludeList.length === 0) return false;
  const lower = company.toLowerCase();
  return excludeList.some((ex) => lower.includes(ex.toLowerCase()));
}
