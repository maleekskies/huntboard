import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeMatch, isExcludedCompany } from '@/lib/scan/score';
import { makeFingerprint } from '@/lib/scan/fingerprint';

// POST /api/jobs/score-url
// Body: { url: string }
// The fastest path to a scored job: paste any job posting URL, fetch its
// HTML, pull a rough title and body text out of it, score it, and drop it
// straight into the Inbox. Works even before any board scan has ever run.
const TIMEOUT_MS = 8000;
const MAX_DESCRIPTION_CHARS = 6000;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const url: string | undefined = body.url;

  if (!url || !url.startsWith('http')) {
    return NextResponse.json({ error: 'A valid job URL is required' }, { status: 400 });
  }

  let html: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Huntboard personal job scanner)' },
    });
    clearTimeout(timer);
    if (!res.ok) {
      return NextResponse.json({ error: `Couldn't fetch that URL (${res.status}).` }, { status: 422 });
    }
    html = await res.text();
  } catch (err) {
    return NextResponse.json(
      { error: `Couldn't reach that URL: ${err instanceof Error ? err.message : 'unknown error'}` },
      { status: 422 }
    );
  }

  const rawTitle = extractTitle(html) ?? 'Untitled role';
  const description = stripHtml(html).slice(0, MAX_DESCRIPTION_CHARS);

  if (description.length < 50) {
    return NextResponse.json(
      { error: "Couldn't extract meaningful text from that page. Paste the job description manually instead." },
      { status: 422 }
    );
  }

  const { data: profile } = await supabase
    .from('profile')
    .select('target_titles, must_haves, deal_breakers, exclude_companies, locations, seniority')
    .eq('id', user.id)
    .maybeSingle();

  const company = new URL(url).hostname.replace(/^www\./, '');

  if (isExcludedCompany(company, profile?.exclude_companies ?? [])) {
    return NextResponse.json(
      { error: `${company} is on your excluded companies list in Settings.` },
      { status: 422 }
    );
  }

  const match = computeMatch(
    rawTitle,
    description,
    profile?.target_titles ?? [],
    profile?.must_haves ?? [],
    profile?.deal_breakers ?? [],
    null,
    profile?.locations ?? [],
    profile?.seniority ?? null
  );

  const { data: job, error } = await supabase
    .from('jobs')
    .insert({
      user_id: user.id,
      source: 'pasted_url',
      source_id: null,
      title: rawTitle,
      company,
      location: null,
      url,
      description,
      match_score: match.score,
      match_why: [match.why],
      fit_tags: match.fitTags,
      match_gaps: match.gapTags,
      domain_score: match.domainScore,
      skills_score: match.skillsScore,
      seniority_score: match.seniorityScore,
      location_score: match.locationScore,
      fingerprint: makeFingerprint(rawTitle, company),
      status: 'new',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ job }, { status: 201 });
}
