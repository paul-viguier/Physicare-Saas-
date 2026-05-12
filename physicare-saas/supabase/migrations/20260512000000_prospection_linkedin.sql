-- PHYSICARE® — Module de prospection LinkedIn
-- Schéma des 6 tables principales + RLS + index
-- Référence: prompt maître v1.0 (mai 2026)

create extension if not exists "pgcrypto";

-- 1. Entreprises cibles
create table if not exists prospect_companies (
  id uuid primary key default gen_random_uuid(),
  linkedin_company_id text unique,
  siren text unique,
  name text not null,
  industry text,
  employee_count integer,
  country text default 'FR',
  website text,
  hq_city text,
  founded_year integer,
  revenue_estimate bigint,
  certifications jsonb default '[]'::jsonb,
  qvct_signals jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  enriched_at timestamptz
);

create index if not exists prospect_companies_industry_idx on prospect_companies(industry);
create index if not exists prospect_companies_employee_count_idx on prospect_companies(employee_count);

-- 2. Contacts / Leads
create table if not exists prospect_leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references prospect_companies(id) on delete set null,
  linkedin_profile_url text unique,
  linkedin_id text unique,
  full_name text not null,
  first_name text,
  last_name text,
  job_title text,
  seniority_level text check (seniority_level in
    ('C_LEVEL','VP','DIRECTOR','MANAGER','SPECIALIST')),
  persona_type text check (persona_type in
    ('DECIDEUR','SPONSOR_QVCT','ACHETEUR_FORMATION','PRESCRIPTEUR_SANTE','SPONSOR_CLEVEL')),
  email_verified text,
  email_status text check (email_status in
    ('VERIFIED','CATCH_ALL','INVALID','PENDING')) default 'PENDING',
  phone text,
  tenure_months integer,
  recent_job_change boolean default false,
  lead_score integer default 0 check (lead_score between 0 and 100),
  status text default 'NEW' check (status in
    ('NEW','CONTACTED','REPLIED','MEETING_BOOKED','OPPORTUNITY','CUSTOMER','LOST','DNC')),
  owner_id uuid references auth.users(id) on delete set null,
  rgpd_consent_status text default 'LEGITIMATE_INTEREST',
  unsubscribed_at timestamptz,
  created_at timestamptz default now(),
  last_contacted_at timestamptz
);

create index if not exists prospect_leads_owner_idx on prospect_leads(owner_id);
create index if not exists prospect_leads_status_idx on prospect_leads(status);
create index if not exists prospect_leads_score_idx on prospect_leads(lead_score desc);
create index if not exists prospect_leads_company_idx on prospect_leads(company_id);

-- 3. Séquences de prospection
create table if not exists prospect_sequences (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  steps jsonb not null,
  is_active boolean default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- 4. Messages envoyés
create table if not exists prospect_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references prospect_leads(id) on delete cascade,
  sequence_id uuid references prospect_sequences(id) on delete set null,
  channel text not null check (channel in ('LINKEDIN_INVITE','LINKEDIN_MESSAGE','EMAIL')),
  subject text,
  body text not null,
  sent_at timestamptz,
  opened_at timestamptz,
  replied_at timestamptz,
  status text default 'PENDING' check (status in
    ('PENDING','SENT','DELIVERED','OPENED','REPLIED','FAILED','BOUNCED')),
  external_message_id text,
  created_at timestamptz default now()
);

create index if not exists prospect_messages_lead_idx on prospect_messages(lead_id);
create index if not exists prospect_messages_status_idx on prospect_messages(status);

-- 5. Signaux d'intention
create table if not exists prospect_intent_signals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references prospect_leads(id) on delete cascade,
  signal_type text not null check (signal_type in
    ('POST_KEYWORD','JOB_POSTING','FUNDING','JOB_CHANGE','ENGAGEMENT')),
  signal_data jsonb,
  detected_at timestamptz default now(),
  score_boost integer default 0
);

create index if not exists prospect_intent_signals_lead_idx on prospect_intent_signals(lead_id);

-- 6. Pipeline / Deals
create table if not exists prospect_deals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references prospect_leads(id) on delete cascade,
  stage text not null check (stage in
    ('DISCOVERY','DEMO','PROPOSAL','NEGOTIATION','WON','LOST')),
  amount_eur integer,
  probability integer check (probability between 0 and 100),
  expected_close_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists prospect_deals_stage_idx on prospect_deals(stage);

-- Trigger updated_at sur deals
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists prospect_deals_updated_at on prospect_deals;
create trigger prospect_deals_updated_at
  before update on prospect_deals
  for each row execute function set_updated_at();

-- ─── RLS ────────────────────────────────────────────────
alter table prospect_companies      enable row level security;
alter table prospect_leads          enable row level security;
alter table prospect_sequences      enable row level security;
alter table prospect_messages       enable row level security;
alter table prospect_intent_signals enable row level security;
alter table prospect_deals          enable row level security;

-- Companies: tous les utilisateurs authentifiés peuvent lire (référentiel partagé),
-- seuls les owners de leads liés ou un service role peuvent écrire.
drop policy if exists "companies_read_auth" on prospect_companies;
create policy "companies_read_auth" on prospect_companies
  for select to authenticated using (true);

drop policy if exists "companies_write_auth" on prospect_companies;
create policy "companies_write_auth" on prospect_companies
  for insert to authenticated with check (true);

drop policy if exists "companies_update_auth" on prospect_companies;
create policy "companies_update_auth" on prospect_companies
  for update to authenticated using (true);

-- Leads: chaque utilisateur ne voit/modifie que ses propres leads.
drop policy if exists "leads_owner_all" on prospect_leads;
create policy "leads_owner_all" on prospect_leads
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Sequences: créateur uniquement.
drop policy if exists "sequences_owner_all" on prospect_sequences;
create policy "sequences_owner_all" on prospect_sequences
  for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Messages: visibles si on possède le lead lié.
drop policy if exists "messages_lead_owner" on prospect_messages;
create policy "messages_lead_owner" on prospect_messages
  for all to authenticated
  using (exists (
    select 1 from prospect_leads l
    where l.id = prospect_messages.lead_id and l.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from prospect_leads l
    where l.id = prospect_messages.lead_id and l.owner_id = auth.uid()
  ));

-- Signaux: idem messages.
drop policy if exists "signals_lead_owner" on prospect_intent_signals;
create policy "signals_lead_owner" on prospect_intent_signals
  for all to authenticated
  using (exists (
    select 1 from prospect_leads l
    where l.id = prospect_intent_signals.lead_id and l.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from prospect_leads l
    where l.id = prospect_intent_signals.lead_id and l.owner_id = auth.uid()
  ));

-- Deals: idem messages.
drop policy if exists "deals_lead_owner" on prospect_deals;
create policy "deals_lead_owner" on prospect_deals
  for all to authenticated
  using (exists (
    select 1 from prospect_leads l
    where l.id = prospect_deals.lead_id and l.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from prospect_leads l
    where l.id = prospect_deals.lead_id and l.owner_id = auth.uid()
  ));
