import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { completeJSON, completeText } from '@/lib/llm/groq';
import {
  SCORE_JOB_SYSTEM,
  scoreJobUser,
  TAILOR_CV_SYSTEM,
  tailorCvUser,
  COVER_LETTER_SYSTEM,
  coverLetterUser,
} from '@/lib/llm/prompts';
import type { ScoreResult, FormAnswers } from '@/lib/types';

// This is the "generate the kit when he opens the job" step from the handoff,
// called lazily from the job detail page, not for every scanned listing, to
// protect the free Groq quota.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profile')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.master_cv_text) {
    return NextResponse.json(
      { error: 'No master CV on file yet. Add one in Kit Studio first.' },
      { status: 400 }
    );
  }

  const jobDescription = job.description ?? '';
  const cvText = profile.master_cv_text as string;
  const voiceGuide = profile.voice_guide as string | undefined;
  const proofPoints = profile.proof_points as string | undefined;

  // 1. Score (also refreshes match_why/gaps in case the job changed).
  const score = await completeJSON<ScoreResult>(SCORE_JOB_SYSTEM, scoreJobUser(cvText, jobDescription));

  // 2. Tailored CV.
  const tailoredCvMd = await completeText(
    TAILOR_CV_SYSTEM,
    tailorCvUser(cvText, jobDescription, voiceGuide, proofPoints)
  );

  // 3. Cover letter.
  const coverLetter = await completeText(
    COVER_LETTER_SYSTEM,
    coverLetterUser(cvText, jobDescription, voiceGuide, proofPoints)
  );

  // 4. Form packet, deterministic fields from profile, plus one generated field.
  const formAnswers: FormAnswers = {
    name: profile.name ?? '',
    email: profile.email ?? '',
    location: profile.location ?? '',
    work_auth_notes: profile.work_auth_notes ?? '',
    why_this_role: score.why.slice(0, 2).join(' '),
  };

  const { data: kit, error: kitError } = await supabase
    .from('kits')
    .insert({
      job_id: job.id,
      tailored_cv_md: tailoredCvMd,
      cover_letter: coverLetter,
      form_answers_json: formAnswers,
      facts_used: score.why,
      model_used: 'groq/llama-3.3-70b-versatile',
    })
    .select()
    .single();

  if (kitError) {
    return NextResponse.json({ error: kitError.message }, { status: 500 });
  }

  await supabase
    .from('jobs')
    .update({
      status: 'kit_ready',
      match_score: score.score,
      match_why: score.why,
      match_gaps: score.gaps,
      visa_location_risk: score.visa_or_location_risk,
      updated_at: new Date().toISOString(),
    })
    .eq('id', job.id);

  await supabase.from('events').insert({
    job_id: job.id,
    type: 'kit_generated',
    note: `Score ${score.score}/100`,
  });

  return NextResponse.json({ kit, score });
}
