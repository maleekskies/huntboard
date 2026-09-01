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
  visa_location_risk: string | null;
  status: JobStatus;
  created_at: string;
  updated_at: string;
}

export interface Kit {
  id: string;
  job_id: string;
  tailored_cv_md: string | null;
  tailored_cv_pdf_url: string | null;
  cover_letter: string | null;
  form_answers_json: FormAnswers | null;
  facts_used: string[] | null;
  model_used: string | null;
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
