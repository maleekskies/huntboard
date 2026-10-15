// Hard gates for the scan. A job that demands something you can't or won't
// meet (a language you don't speak, an office you can't sit in, residency in
// a region you're not in) is dropped outright instead of just scoring lower.
//
// The rule, in plain words: remote roles open to you are fine wherever the
// company is based. Anything strict about something other than remote is out.
// "Nice to have" mentions only downrank, they never exclude.

export type GateReason = 'language' | 'onsite' | 'location';

export interface GateInput {
  title: string;
  description: string | null;
  location: string | null;
  spokenLanguages: string[];
  acceptedPlaces: string[]; // lowercase places you can work from, e.g. ['lagos', 'nigeria']
}

export interface GateVerdict {
  exclude: boolean;
  reason?: GateReason;
  detail?: string;
  penalty: number; // soft downrank, e.g. "German is a plus"
  note?: string;
}

// ---------------------------------------------------------------- language

const LANGUAGES: Record<string, string[]> = {
  german: ['german', 'deutsch'],
  french: ['french', 'français', 'francais'],
  spanish: ['spanish', 'español', 'espanol'],
  portuguese: ['portuguese', 'português', 'portugues'],
  italian: ['italian', 'italiano'],
  dutch: ['dutch', 'nederlands'],
  swedish: ['swedish', 'svenska'],
  danish: ['danish'],
  norwegian: ['norwegian'],
  finnish: ['finnish'],
  russian: ['russian'],
  ukrainian: ['ukrainian'],
  turkish: ['turkish'],
  arabic: ['arabic'],
  hebrew: ['hebrew'],
  hindi: ['hindi'],
  japanese: ['japanese'],
  korean: ['korean'],
  chinese: ['mandarin', 'chinese', 'cantonese'],
  vietnamese: ['vietnamese'],
  thai: ['thai'],
  indonesian: ['indonesian', 'bahasa'],
  czech: ['czech'],
  greek: ['greek'],
  hungarian: ['hungarian'],
  romanian: ['romanian'],
};

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function spokenSet(spoken: string[]): Set<string> {
  const set = new Set(spoken.map((s) => s.trim().toLowerCase()).filter(Boolean));
  if (set.size === 0) set.add('english');
  return set;
}

function speaks(key: string, spoken: Set<string>): boolean {
  return spoken.has(key) || LANGUAGES[key].some((alias) => spoken.has(alias));
}

const REQ =
  '(?:fluent|fluency|proficien(?:t|cy)|native|mother[- ]tongue|bilingual|business[- ]level|excellent|very good|good|strong|advanced|conversational|command|knowledge|speak|speaking|spoken|written|verbal)';
const FILLER =
  '(?:in|of|and|or|with|written|spoken|verbal|oral|business|working|level|command|knowledge|skills?|english|fluency|proficiency|communication|language|languages|both|the|good|excellent|strong)';
const NOT_A_LANGUAGE_NOUN =
  '(?![- ]?(?:tax|law|laws|market|markets|regulation|regulations|legislation|culture|history|company|companies|entity|customers?|clients?|economy|politics|literature|team|office|offices)\\b)';

const NICE =
  /\b(plus|bonus|advantage|asset|preferred|preferably|desirable|beneficial|nice[- ]to[- ]have|not required|not necessary|optional|welcome|ideally)\b/;

const patternCache = new Map<string, RegExp[]>();

function patternsFor(key: string): RegExp[] {
  const cached = patternCache.get(key);
  if (cached) return cached;

  const W = `(?:${LANGUAGES[key].map(esc).join('|')})`;
  const patterns = [
    // "fluent in English and German", "excellent command of German", "native German speaker"
    new RegExp(`\\b${REQ}\\b(?:[\\s,/&]+${FILLER}\\b){0,7}[\\s,/&]+${W}\\b${NOT_A_LANGUAGE_NOUN}`, 'g'),
    // "German-speaking", "German language skills", "German C1", "German (fluent)", "German required"
    new RegExp(
      `\\b${W}\\b[-\\s:(]+(?:language|speaking|speaker|speakers|native|fluent|fluency|proficiency|skills?|level|required|mandatory|essential|c1|c2|b2)\\b`,
      'g'
    ),
    // "must speak German", "able to communicate in German"
    new RegExp(
      `\\b(?:must|required to|need to|able to|ability to)\\s+(?:be\\s+able\\s+to\\s+)?(?:speak|communicate|write|read|converse)\\s+(?:\\w+\\s+){0,3}?(?:in\\s+)?${W}\\b`,
      'g'
    ),
    // "Languages required: English, German", "language requirements: German"
    new RegExp(`\\blanguages?\\s+(?:required|requirements?|needed)\\s*[:\\-]\\s*[^.]{0,60}?\\b${W}\\b`, 'g'),
    // "German is a plus", "German would be an advantage" (always soft, via NICE)
    new RegExp(`\\b${W}\\b[^.]{0,25}?\\b(?:plus|bonus|advantage|asset|nice[- ]to[- ]have|desirable|beneficial)\\b`, 'g'),
  ];
  patternCache.set(key, patterns);
  return patterns;
}

function languageRequirement(text: string, key: string): 'hard' | 'soft' | null {
  let result: 'soft' | null = null;
  for (const re of patternsFor(key)) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      const ctx = text.slice(Math.max(0, start - 30), Math.min(text.length, end + 45));
      if (NICE.test(ctx)) result = 'soft';
      else return 'hard';
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  return result;
}

const STOPWORDS: Record<string, string[]> = {
  english: ['the', 'and', 'to', 'of', 'in', 'for', 'with', 'you', 'we', 'is', 'are', 'will', 'our', 'your', 'a'],
  german: ['und', 'der', 'die', 'das', 'wir', 'für', 'mit', 'ist', 'nicht', 'sie', 'ein', 'eine', 'bei', 'auf', 'den', 'von', 'werden', 'als', 'auch', 'zu', 'im'],
  french: ['et', 'les', 'des', 'nous', 'pour', 'vous', 'dans', 'une', 'est', 'que', 'avec', 'sur', 'par', 'du', 'au', 'aux', 'cette'],
  spanish: ['los', 'las', 'del', 'para', 'con', 'una', 'por', 'que', 'nuestro', 'equipo', 'como', 'más', 'se', 'el', 'la', 'y'],
  dutch: ['het', 'een', 'wij', 'voor', 'met', 'je', 'van', 'ons', 'bij', 'ook', 'worden', 'jij', 'en', 'de'],
  portuguese: ['os', 'as', 'uma', 'para', 'com', 'nós', 'você', 'não', 'em', 'do', 'da', 'dos', 'das'],
  italian: ['gli', 'le', 'una', 'per', 'con', 'noi', 'che', 'sono', 'della', 'nel', 'non', 'il'],
};

// Catches listings that are simply written in another language (a lot of
// Arbeitnow postings are German end to end), even if they never say "German".
function writtenInOtherLanguage(description: string, spoken: Set<string>): string | null {
  const words = description.toLowerCase().match(/\p{L}+/gu) ?? [];
  if (words.length < 40) return null;

  const fraction = (list: string[]) => {
    const set = new Set(list);
    return words.filter((w) => set.has(w)).length / words.length;
  };

  const english = fraction(STOPWORDS.english);
  if (english >= 0.12) return null;

  let best: { lang: string; frac: number } | null = null;
  for (const lang of Object.keys(STOPWORDS)) {
    if (lang === 'english') continue;
    const frac = fraction(STOPWORDS[lang]);
    if (!best || frac > best.frac) best = { lang, frac };
  }
  if (best && best.frac >= 0.15 && best.frac > english * 1.5 && !speaks(best.lang, spoken)) {
    return best.lang;
  }
  return null;
}

// ----------------------------------------------------------------- location

const REMOTE_WORDS = /\b(remote|anywhere|worldwide|work from home|wfh|distributed|global|globally)\b/g;
const GENERIC_OK =
  /\b(worldwide|anywhere|global|globally|africa|nigeria|emea|any location|all countries|no location restrictions?|work from home)\b/;

const REMOTE_OFFERED =
  /\b(?:remote|work from home|wfh)\s*(?:or|\/|and|,)\s*(?:hybrid|on[- ]?site|office)\b|\b(?:hybrid|on[- ]?site|office)\s*(?:or|\/|and)\s*remote\b|\bfully[- ]remote\b|\b100%\s*remote\b|\bremote[- ]first\b|\bremote[- ]friendly\b|\bwork from anywhere\b|\bremote[- ]only\b|\bthis is a remote\b/;

const HYBRID_NOT_TECH =
  '(?!\\s+(?:cloud|clouds|app|apps|mobile|exchange|exchanges|defi|cex|dex|blockchain|consensus|vehicle|vehicles|car|cars|search|ai|models?|finance|protocol|protocols|token|tokens|architecture|infrastructure|environment|environments|storage|integration|integrations|solution|solutions|encryption)\\b)';

const ONSITE_PATTERNS: RegExp[] = [
  new RegExp(
    `\\b(?:(?:is|a|an|offer|offers|offering|this is a|position is|role is|work|working)\\s+)hybrid\\b${HYBRID_NOT_TECH}`
  ),
  /\bhybrid\s+(?:work|working|role|position|schedule|setup|set-up|arrangement|basis|from|policy|office|opportunity)\b/,
  /\b(?:fully|100%|completely|strictly|primarily)\s+on[- ]?site\b/,
  /\bon[- ]?site\s+(?:role|position|job|only|basis|presence|requirement|work)\b/,
  /\b(?:this is an?|role is|position is)\s+(?:an?\s+)?on[- ]?site\b/,
  /\b(?:in[- ]office|office[- ]based|in[- ]person (?:role|position|work))\b/,
  /\b\d+\s+days?\b[^.]{0,30}\boffice\b/,
  /\boffice\b[^.]{0,25}\b\d+\s+days?\b/,
  /\b(?:work|working|based)\s+(?:in|from|at)\s+(?:our|the)\s+[\w\s]{0,25}?office\b/,
];

// Relocation demands apply even when the board label says "Remote".
const RELOCATE_PATTERNS: RegExp[] = [
  /\b(?:must|will need to|required to|need to)\s+(?:be\s+)?(?:willing to\s+)?relocate\b/,
  /\brelocation\s+(?:is\s+)?(?:required|mandatory)\b/,
];

const NEGATED_ONSITE = /\b(?:no|not|non|without|never)[- ]\s*(?:hybrid|on[- ]?site|in[- ]office|office)\b/g;

// Captures the region named after "must be based in ..." and similar.
const REGION = `([a-z][a-z .&'-]{1,40}?)(?=[.,;:()\\n]|\\s+(?:and|or|with|to|who|for|as|at|time|timezone|time-zone|during|when)\\b|$)`;
const RESTRICTION_PATTERNS: RegExp[] = [
  new RegExp(
    `\\b(?:must|need to|required to|should)\\s+(?:be\\s+)?(?:based|located|residing|reside|live|living|resident)\\s+(?:in|within|inside)\\s+(?:the\\s+)?${REGION}`,
    'g'
  ),
  /\b(us|u\.s\.|usa|uk|eu|eea|canada|europe|european union)[- ]only\b/g,
  new RegExp(
    `\\bonly\\s+(?:open|available|accepting|considering)\\s+(?:to|for)\\s+(?:candidates|applicants|residents)?\\s*(?:in|from|based in)\\s+(?:the\\s+)?${REGION}`,
    'g'
  ),
  new RegExp(
    `\\b(?:authori[sz]ed|eligible|legally (?:entitled|allowed|permitted)|right) to work in\\s+(?:the\\s+)?${REGION}`,
    'g'
  ),
];
const GENERIC_REGION_PHRASE = /\b(country|location|jurisdiction|which you|where you|you reside|you live|you are located)\b/;

function regionAcceptable(region: string, acceptedPlaces: string[]): boolean {
  const r = region.toLowerCase().trim();
  if (!r) return true;
  if (GENERIC_OK.test(r)) return true;
  return acceptedPlaces.some((p) => p.length >= 3 && r.includes(p));
}

function findUnacceptableRestriction(text: string, acceptedPlaces: string[]): string | null {
  for (const re of RESTRICTION_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const region = (m[1] ?? '').trim();
      if (region && !GENERIC_REGION_PHRASE.test(region) && !regionAcceptable(region, acceptedPlaces)) {
        return region;
      }
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  return null;
}

function mentionsAcceptedPlace(text: string, acceptedPlaces: string[]): boolean {
  return acceptedPlaces.some((p) => p.length >= 3 && text.includes(p));
}

// ------------------------------------------------------------------- gates

export function evaluateGates(input: GateInput): GateVerdict {
  const title = input.title.toLowerCase();
  const text = (input.description ?? '').toLowerCase();
  const spoken = spokenSet(input.spokenLanguages);
  const loc = (input.location ?? '').toLowerCase().trim();
  const places = input.acceptedPlaces;

  let penalty = 0;
  const notes: string[] = [];

  // 1. Language: demanded in the title, required in the text, or the whole
  // listing is written in a language you don't speak.
  for (const key of Object.keys(LANGUAGES)) {
    if (speaks(key, spoken)) continue;
    const W = `(?:${LANGUAGES[key].map(esc).join('|')})`;
    if (new RegExp(`\\b${W}\\b`).test(title)) {
      return { exclude: true, reason: 'language', detail: key, penalty: 0 };
    }
    const need = languageRequirement(text, key);
    if (need === 'hard') return { exclude: true, reason: 'language', detail: key, penalty: 0 };
    if (need === 'soft') {
      penalty += 10;
      notes.push(`${key[0].toUpperCase()}${key.slice(1)} is only a nice-to-have`);
    }
  }
  const foreign = writtenInOtherLanguage(text, spoken);
  if (foreign) return { exclude: true, reason: 'language', detail: `listing written in ${foreign}`, penalty: 0 };

  // 2. Where the work happens.
  const remoteLoc = /\b(remote|anywhere|worldwide|work from home|wfh|distributed|global)\b/.test(loc);
  const unspecified = loc === '' || /^(unspecified|n\/a|unknown|not specified)$/.test(loc);

  // 2a. Remote, but only for people living somewhere else.
  if (remoteLoc) {
    const leftover = loc.replace(REMOTE_WORDS, ' ').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (leftover && !regionAcceptable(leftover, places)) {
      return { exclude: true, reason: 'location', detail: `remote, but limited to ${leftover}`, penalty: 0 };
    }
  }
  const restricted = findUnacceptableRestriction(text, places);
  if (restricted) {
    return { exclude: true, reason: 'location', detail: `restricted to ${restricted}`, penalty: 0 };
  }

  // 2b. A named place with no remote signal is an office job.
  if (!remoteLoc && !unspecified && !REMOTE_OFFERED.test(text) && !GENERIC_OK.test(loc)) {
    if (!mentionsAcceptedPlace(loc, places)) {
      return { exclude: true, reason: 'onsite', detail: `on-site in ${input.location}`, penalty: 0 };
    }
  }

  // 2c. The text itself says hybrid, on-site or relocate, and nothing offers
  // remote. (A board's own "Remote" label doesn't cancel an explicit demand.)
  const cleaned = text.replace(NEGATED_ONSITE, ' ');
  const needsRelocation = RELOCATE_PATTERNS.some((re) => re.test(cleaned));
  const onsiteText = !REMOTE_OFFERED.test(text) && ONSITE_PATTERNS.some((re) => re.test(cleaned));
  if ((needsRelocation || onsiteText) && !mentionsAcceptedPlace(`${loc} ${text}`, places)) {
    return {
      exclude: true,
      reason: 'onsite',
      detail: needsRelocation ? 'requires relocation' : 'hybrid or on-site role',
      penalty: 0,
    };
  }

  return { exclude: false, penalty, note: notes.length ? `${notes.join('; ')} (small downrank).` : undefined };
}
