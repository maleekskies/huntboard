-- Huntboard schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "uuid-ossp";

-- One row per authenticated user. v0 is single-user (you), but this keeps
-- the door open to more users later without a migration.
create table if not exists profile (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  phone text,
  location text,
  portfolio_url text,
  linkedin_url text,
  master_cv_text text,
  work_auth_notes text,
  target_titles text[] default '{}',
  exclude_companies text[] default '{}',
  voice_guide text,
  proof_points text,
  locations text[] default '{}',
  must_haves text[] default '{}',
  deal_breakers text[] default '{}',
  min_match int default 70,
  seniority text,
  comp_floor text,
  wins text,
  timezone text,
  onboarded_at timestamptz,
  notify_digest boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists jobs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  source text not null,              -- 'remoteok' | 'remotive' | 'himalayas' | 'manual' | ...
  source_id text,                    -- id from the source API, null for manually pasted jobs
  title text not null,
  company text not null,
  location text,
  url text not null,
  description text,
  raw_json jsonb,
  posted_at timestamptz,
  first_seen_at timestamptz default now(),
  match_score int,
  match_why text[],
  match_gaps text[],
  fit_tags text[] default '{}',
  domain_score int,
  skills_score int,
  seniority_score int,
  location_score int,
  next_action text,
  next_date date,
  interview_at timestamptz,
  reject_reason text,
  visa_location_risk text,
  status text not null default 'new'
    check (status in ('new','saved','kit_ready','applied','interview','rejected','offer','ignored')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, source, source_id)
);

create table if not exists kits (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references jobs(id) on delete cascade not null,
  tailored_cv_md text,
  tailored_cv_pdf_url text,
  cover_letter text,
  form_answers_json jsonb,
  facts_used text[],
  model_used text,
  status text default 'draft' check (status in ('draft','needs_edit','approved')),
  talking_points text[],
  gap_note text,
  approved_at timestamptz,
  generated_at timestamptz default now()
);

create table if not exists rejections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  job_id uuid references jobs(id) on delete cascade not null,
  reason text not null,
  term text not null,
  created_at timestamptz default now()
);

create table if not exists events (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid references jobs(id) on delete cascade not null,
  type text not null,          -- 'status_change' | 'note' | 'kit_generated' | ...
  note text,
  created_at timestamptz default now()
);

-- Row Level Security: every user only ever sees their own rows.
alter table profile enable row level security;
alter table jobs enable row level security;
alter table kits enable row level security;
alter table events enable row level security;
alter table rejections enable row level security;

create policy "profile: own row" on profile
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "jobs: own rows" on jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "kits: via own job" on kits
  for all using (exists (select 1 from jobs where jobs.id = kits.job_id and jobs.user_id = auth.uid()))
  with check (exists (select 1 from jobs where jobs.id = kits.job_id and jobs.user_id = auth.uid()));

create policy "events: via own job" on events
  for all using (exists (select 1 from jobs where jobs.id = events.job_id and jobs.user_id = auth.uid()))
  with check (exists (select 1 from jobs where jobs.id = events.job_id and jobs.user_id = auth.uid()));

create policy "rejections: own rows" on rejections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists jobs_user_status_idx on jobs (user_id, status);
create index if not exists jobs_user_score_idx on jobs (user_id, match_score desc);
