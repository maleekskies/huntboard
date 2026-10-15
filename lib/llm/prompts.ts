// Every prompt here enforces the non-negotiable rule from the handoff:
// never invent experience, titles, dates, metrics, or employers. Tailoring
// means reordering and rephrasing true facts, never fabricating new ones.

export const SCORE_JOB_SYSTEM = `You are scoring how well a candidate's CV fits a job posting.
Score 0-100 how well this CV fits this job.
Return JSON only: {"score": number, "why": string[], "gaps": string[], "visa_or_location_risk": string, "apply": "yes"|"maybe"|"no"}
If the job requires a country the candidate cannot work in, cap score at 40 and explain why in visa_or_location_risk.
Never invent CV facts. Base "why" and "gaps" only on what is actually in the CV text provided.`;

export function scoreJobUser(cvText: string, jobDescription: string) {
  return `CANDIDATE CV:\n${cvText}\n\nJOB DESCRIPTION:\n${jobDescription}`;
}

export const TAILOR_CV_SYSTEM = `You are tailoring a candidate's CV for a specific job.
Rules:
- Only use facts that appear in the master CV or proof points provided. Never invent employers, titles, dates, metrics, or skills.
- Reorder experience so the most relevant role or project appears first.
- Mirror real keywords from the job description only where the candidate's true experience actually matches.
- Rewrite the summary in the candidate's voice using only true facts.
- Keep it to one page if possible. Single column, ATS-safe: no tables, no icons, no text boxes.
- Return markdown only. No commentary before or after.`;

export function tailorCvUser(
  cvText: string,
  jobDescription: string,
  voiceGuide?: string,
  proofPoints?: string
) {
  return `MASTER CV:\n${cvText}\n\n${proofPoints ? `ADDITIONAL PROOF POINTS:\n${proofPoints}\n\n` : ''}JOB DESCRIPTION:\n${jobDescription}\n\nVOICE GUIDE (tone to match):\n${voiceGuide ?? 'Human, plain, specific. No corporate filler.'}`;
}

export const COVER_LETTER_SYSTEM = `You write short cover letters in first person from the candidate.
Human tone. No clichés like "I am writing to express my interest." No em-dash spam.
180-250 words. Three short paragraphs: specific proof from the CV or proof points, why this company/role, a brief close.
Tie proof points to at least 2 of the job's actual requirements.
Never invent experience, employers, dates, or metrics not present in the source material.`;

export function coverLetterUser(
  cvText: string,
  jobDescription: string,
  voiceGuide?: string,
  proofPoints?: string
) {
  return `CANDIDATE CV:\n${cvText}\n\n${proofPoints ? `ADDITIONAL PROOF POINTS:\n${proofPoints}\n\n` : ''}JOB DESCRIPTION:\n${jobDescription}\n\nVOICE GUIDE:\n${voiceGuide ?? 'Human, plain, specific.'}`;
}
