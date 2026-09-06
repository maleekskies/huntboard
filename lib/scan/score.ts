// Cheap keyword-overlap scorer used at scan time and on manual add, so the
// Inbox always sorts sensibly and every row always has a reason, without
// burning LLM quota on every single listing. The real score, tied to actual
// CV facts, still comes from Groq at generate-kit time.

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

const SENIORITY_KEYWORDS: Record<string, string[]> = {
  junior: ['junior', 'entry level', 'entry-level', 'graduate', 'intern'],
  mid: ['mid level', 'mid-level', 'intermediate'],
  senior: ['senior', 'sr.', 'sr '],
  lead: ['lead', 'principal', 'staff', 'head of', 'director'],
};

function seniorityScore(haystack: string, profileSeniority: string | null | undefined): number {
  if (!profileSeniority) return 60; // no preference set, neutral
  const wantedKeywords = SENIORITY_KEYWORDS[profileSeniority] ?? [];
  const hasWanted = wantedKeywords.some((k) => haystack.includes(k));
  if (hasWanted) return 90;

  const otherBandsMentioned = Object.entries(SENIORITY_KEYWORDS)
    .filter(([band]) => band !== profileSeniority)
    .some(([, keywords]) => keywords.some((k) => haystack.includes(k)));
  return otherBandsMentioned ? 30 : 60; // mismatched band vs unstated
}

function locationScore(
  jobLocation: string | null,
  haystack: string,
  profileLocations: string[]
): number {
  if (profileLocations.length === 0) return 60; // no preference set, neutral
  const jobLoc = (jobLocation ?? '').toLowerCase();
  const wantsRemote = profileLocations.some((l) => l.toLowerCase() === 'remote');

  if (wantsRemote && (jobLoc.includes('remote') || haystack.includes('remote'))) return 95;
  const matchesNamedLocation = profileLocations.some(
    (l) => l.toLowerCase() !== 'remote' && jobLoc.includes(l.toLowerCase())
  );
  if (matchesNamedLocation) return 90;
  return wantsRemote ? 30 : 45;
}

export interface MatchResult {
  score: number;
  domainScore: number;
  skillsScore: number;
  seniorityScore: number;
  locationScore: number;
  why: string;
  fitTags: string[];
  gapTags: string[];
  hardExcluded: boolean;
}

const DEAL_BREAKER_FILLER_WORDS = new Set([
  'role', 'roles', 'position', 'positions', 'job', 'jobs', 'only', 'based',
]);

// A deal-breaker phrase like "senior roles" should exclude a listing titled
// "Senior Technical Product Manager", even though that exact phrase never
// appears in the text. Match on the meaningful words instead of requiring
// the literal phrase.
function matchesDealBreaker(haystack: string, phrase: string): boolean {
  const words = tokenize(phrase).filter((w) => !DEAL_BREAKER_FILLER_WORDS.has(w));
  if (words.length === 0) return false;
  const haystackWords = new Set(tokenize(haystack));
  return words.every((w) => haystackWords.has(w));
}

// Minimum-viable scorer (brief section 5): title overlap, must-have presence,
// seniority and location fit, deal-breaker hard-exclude. No embeddings, no
// LLM call. Every job gets a `why` sentence and tags here, not just a
// number, because a score with no reason is treated as a bug.
export function computeMatch(
  title: string,
  description: string | null,
  targetTitles: string[],
  mustHaves: string[] = [],
  dealBreakers: string[] = [],
  jobLocation: string | null = null,
  profileLocations: string[] = [],
  profileSeniority: string | null = null
): MatchResult {
  const haystack = `${title} ${description ?? ''}`.toLowerCase();

  for (const breaker of dealBreakers) {
    if (breaker.trim() && matchesDealBreaker(haystack, breaker)) {
      return {
        score: 0,
        domainScore: 0,
        skillsScore: 0,
        seniorityScore: 0,
        locationScore: 0,
        why: `Excluded: mentions "${breaker}", one of your deal-breakers.`,
        fitTags: [],
        gapTags: [breaker],
        hardExcluded: true,
      };
    }
  }

  const skillsScore = lexicalScore(title, description, targetTitles);

  const mustHaveHits = mustHaves.filter((m) => m.trim() && haystack.includes(m.toLowerCase()));
  const mustHaveMisses = mustHaves.filter((m) => !mustHaveHits.includes(m));
  const domainScore =
    mustHaves.length > 0 ? Math.round((mustHaveHits.length / mustHaves.length) * 100) : 60;

  const seniority = seniorityScore(haystack, profileSeniority);
  const location = locationScore(jobLocation, haystack, profileLocations);

  const overall = Math.round(
    skillsScore * 0.4 + domainScore * 0.3 + seniority * 0.15 + location * 0.15
  );

  const matchedTitle = targetTitles.find((t) =>
    tokenize(t).some((tok) => tokenize(title).includes(tok))
  );

  const whyParts: string[] = [];
  if (matchedTitle) whyParts.push(`Title lines up with "${matchedTitle}".`);
  if (mustHaveHits.length > 0) whyParts.push(`Mentions ${mustHaveHits.join(', ')}.`);
  if (whyParts.length === 0) {
    whyParts.push(
      skillsScore > 0
        ? 'Some keyword overlap with your target titles.'
        : "Doesn't closely match your target titles yet."
    );
  }

  return {
    score: overall,
    domainScore,
    skillsScore,
    seniorityScore: seniority,
    locationScore: location,
    why: whyParts.join(' '),
    fitTags: mustHaveHits.slice(0, 3),
    gapTags: mustHaveMisses.slice(0, 2),
    hardExcluded: false,
  };
}

// Reject-with-reason teaching (brief 7.5): recent rejections softly adjust
// scoring for 14 days. "wrong seniority" downranks the same title family,
// "wrong domain" downranks that company, "too thin" raises the bar for that
// title family. Kept as a flat penalty rather than a real model: cheap,
// explainable, and reversible once the 14-day window passes.
export interface RecentRejection {
  reason: string;
  term: string;
  created_at: string;
}

const TEACHING_WINDOW_DAYS = 14;
const TEACHING_PENALTY = 25;

export function applyTeachingPenalty(
  match: MatchResult,
  title: string,
  company: string,
  rejections: RecentRejection[]
): MatchResult {
  const now = Date.now();
  const active = rejections.filter((r) => {
    const age = now - new Date(r.created_at).getTime();
    return age <= TEACHING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  });

  const titleLower = title.toLowerCase();
  const companyLower = company.toLowerCase();

  const penalized = active.some((r) => {
    if (r.reason === 'wrong domain') return companyLower.includes(r.term.toLowerCase());
    return titleLower.includes(r.term.toLowerCase());
  });

  if (!penalized) return match;

  return {
    ...match,
    score: Math.max(0, match.score - TEACHING_PENALTY),
    why: `${match.why} Downranked: similar to a role you recently rejected.`,
  };
}
