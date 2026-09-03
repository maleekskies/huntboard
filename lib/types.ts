export type JobStatus =
  | 'new'
  | 'saved'
  | 'kit_ready'
  | 'applied'
  | 'interview'
  | 'rejected'
  | 'offer'
  | 'ignored';

export interface Job {
  id: string;
  user_id: string;
  source: string;
  source_id: string | null;
  title: string;
  company: string;
  location: string | null;
  url: string;
  description: string | null;
  raw_json: unknown;
  posted_at: string | null;
  first_seen_at: string;
  match_score: number | null;
  match_why: string[] | null;
  match_gaps: string[] | null;
  fit_tags: string[] | null;
  domain_score: number | null;
  skills_score: number | null;
  seniority_score: number | null;
  location_score: number | null;
  next_action: string | null;
  next_date: string | null;
  interview_at: string | null;
  reject_reason: string | null;
  fingerprint: string | null;
  interview_notes: string | null;
  visa_location_risk: string | null;
  status: JobStatus;
  created_at: string;
  updated_at: string;
}

export type KitStatus = 'draft' | 'needs_edit' | 'approved';

export interface Kit {
  id: string;
  job_id: string;
  tailored_cv_md: string | null;
  tailored_cv_pdf_url: string | null;
  cover_letter: string | null;
  form_answers_json: FormAnswers | null;
  facts_used: string[] | null;
  model_used: string | null;
  status: KitStatus;
  talking_points: string[] | null;
  gap_note: string | null;
  approved_at: string | null;
  generated_at: string;
}

export interface FormAnswers {
  name: string;
  email: string;
  location: string;
  work_auth_notes: string;
  why_this_role: string;
}

export interface ScoreResult {
  score: number;
  why: string[];
  gaps: string[];
  visa_or_location_risk: string;
  apply: 'yes' | 'maybe' | 'no';
}
