// Cheap keyword-overlap scorer used at scan time and on manual add, so the
// Inbox always sorts sensibly and every row always has a reason, without
// burning LLM quota on every single listing. The real score, tied to actual
// CV facts, still comes from Groq at generate-kit time.

import { evaluateGates, type GateReason } from '@/lib/scan/filters';

const SHORT_KEEP = new Set(['ai', 'pm', 'ux', 'ui', 'qa', 'hr', 'pr', 'ml']);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 || SHORT_KEEP.has(t));
}

// A target like "Technical Writer (Web3 / crypto / AI docs)" used to be
// scored as if a listing had to contain every one of those words in its
// title, which no real listing does. Now the part before the bracket is the
// title to match, the bracket words are extra keywords, and "A / B"
// alternatives are scored separately.
interface TargetVariant {
  main: string[];
  extras: string[];
}

function expandTarget(target: string): TargetVariant[] {
  const extras: string[] = [];
  const withoutBrackets = target.replace(/\(([^)]*)\)/g, (_, inner: string) => {
    extras.push(...tokenize(inner));
    return ' ';
  });

  const alts = withoutBrackets.split('/').map((a) => a.trim()).filter(Boolean);
  if (alts.length === 0) return [];

  const firstWords = alts[0].split(/\s+/);
  return alts.map((alt, i) => {
    let words = alt.split(/\s+/);
    // "Content Strategist / Writer": the short alternative replaces the last word.
    if (i > 0 && words.length === 1 && firstWords.length > 1) {
      words = [...firstWords.slice(0, -1), words[0]];
    }
    return { main: tokenize(words.join(' ')), extras };
  });
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
    for (const variant of expandTarget(target)) {
      if (variant.main.length === 0) continue;

      const titleHits = variant.main.filter((t) => titleTokens.has(t)).length;
      const allTokens = [...variant.main, ...variant.extras];
      const descHits = allTokens.filter((t) => descTokens.has(t) || titleTokens.has(t)).length;

      const score = Math.round(
        (titleHits / variant.main.length) * 80 + (descHits / allTokens.length) * 20
      );
      best = Math.max(best, score);
    }
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
  excludeReason?: 'deal_breaker' | GateReason;
}

export interface MatchOptions {
  languages?: string[]; // languages you speak; defaults to English
  homeLocation?: string | null; // e.g. "Lagos, Nigeria"
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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasWord(haystack: string, word: string): boolean {
  const w = word.trim().toLowerCase();
  if (w.length < 2) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRegex(w)}([^a-z0-9]|$)`).test(haystack);
}

// A must-have like "Web3 or AI" means either one, and "ai" must be a whole
// word (it used to match inside "maintain" and "email"). "A and B" needs both.
export function mustHaveMatches(haystack: string, phrase: string): boolean {
  const p = phrase.trim().toLowerCase();
  if (!p) return false;
  if (/\s+and\s+/.test(p)) {
    return p.split(/\s+and\s+/).every((part) => hasWord(haystack, part));
  }
  const alternatives = p.split(/\s+or\s+|\s*[\/|,]\s*/).filter(Boolean);
  return alternatives.some((alt) => hasWord(haystack, alt));
}

function placesFrom(profileLocations: string[], homeLocation: string | null | undefined): string[] {
  const named = profileLocations.filter((l) => l.trim().toLowerCase() !== 'remote');
  const home = (homeLocation ?? '').split(/[,/]/);
  return [...named, ...home]
    .map((l) => l.trim().toLowerCase())
    .filter((l) => l.length >= 3);
}

// Minimum-viable scorer (brief section 5): title overlap, must-have presence,
// seniority, deal-breaker and language/work-mode hard-excludes. No embeddings,
// no LLM call. Every job gets a `why` sentence and tags here, not just a
// number, because a score with no reason is treated as a bug.
//
// The overall score only averages what you actually told it about. Before,
// an unset must-have list or seniority counted as a free 60, and any listing
// with the word "remote" in it got 95 for location, which put unrelated
// jobs near 40 before a single title word matched. Location is now a gate
// (see filters.ts), not a score ingredient.
export function computeMatch(
  title: string,
  description: string | null,
  targetTitles: string[],
  mustHaves: string[] = [],
  dealBreakers: string[] = [],
  jobLocation: string | null = null,
  profileLocations: string[] = [],
  profileSeniority: string | null = null,
  opts: MatchOptions = {}
): MatchResult {
  const haystack = `${title} ${description ?? ''}`.toLowerCase();

  const excluded = (reason: 'deal_breaker' | GateReason, why: string, tag: string): MatchResult => ({
    score: 0,
    domainScore: 0,
    skillsScore: 0,
    seniorityScore: 0,
    locationScore: 0,
    why,
    fitTags: [],
    gapTags: [tag],
    hardExcluded: true,
    excludeReason: reason,
  });

  for (const breaker of dealBreakers) {
    if (breaker.trim() && matchesDealBreaker(haystack, breaker)) {
      return excluded('deal_breaker', `Excluded: mentions "${breaker}", one of your deal-breakers.`, breaker);
    }
  }

  const gate = evaluateGates({
    title,
    description,
    location: jobLocation,
    spokenLanguages: opts.languages ?? [],
    acceptedPlaces: placesFrom(profileLocations, opts.homeLocation),
  });
  if (gate.exclude && gate.reason) {
    const label = gate.reason === 'language' ? 'language' : gate.reason === 'onsite' ? 'on-site' : 'location';
    return excluded(gate.reason, `Excluded (${label}): ${gate.detail}.`, gate.detail ?? label);
  }

  const skillsScore = lexicalScore(title, description, targetTitles);

  const mustHaveHits = mustHaves.filter((m) => mustHaveMatches(haystack, m));
  const mustHaveMisses = mustHaves.filter((m) => m.trim() && !mustHaveHits.includes(m));
  const domainScore =
    mustHaves.length > 0 ? Math.round((mustHaveHits.length / mustHaves.length) * 100) : 60;

  const seniority = seniorityScore(haystack, profileSeniority);
  const location = locationScore(jobLocation, haystack, profileLocations);

  const parts: Array<[number, number]> = [[skillsScore, 0.55]];
  if (mustHaves.length > 0) parts.push([domainScore, 0.3]);
  if (profileSeniority) parts.push([seniority, 0.15]);
  const weight = parts.reduce((sum, [, w]) => sum + w, 0);
  const weighted = parts.reduce((sum, [v, w]) => sum + v * w, 0) / weight;
  const overall = Math.max(0, Math.round(weighted) - gate.penalty);

  const matchedTitle = targetTitles.find((t) =>
    expandTarget(t).some((v) => v.main.some((tok) => tokenize(title).includes(tok)))
  );

  const whyParts: string[] = [];
  if (matchedTitle) whyParts.push(`Title lines up with "${matchedTitle}".`);
  if (mustHaveHits.length > 0) whyParts.push(`Mentions ${mustHaveHits.join(', ')}.`);
  if (gate.note) whyParts.push(gate.note);
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
