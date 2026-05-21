-- PHYSICARE® — Phase 2 : intégrations, enrolments séquences, opt-out
-- Référence: prompt maître v1.0 §7 Phase 2 + RGPD §RGPD_COMPLIANCE.md

-- 1. Connexions externes par utilisateur (Unipile, Resend, etc.)
create table if not exists prospect_user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('UNIPILE','RESEND','POSTMARK')),
  account_id text,                       -- ex: Unipile account UID
  access_token text,                     -- chiffré applicatif (cf. lib/crypto.js)
  meta jsonb default '{}'::jsonb,
  status text default 'CONNECTED' check (status in ('CONNECTED','EXPIRED','REVOKED')),
  daily_quota integer default 80,
  daily_count integer default 0,
  daily_reset_at date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, provider)
);

alter table prospect_user_integrations enable row level security;
drop policy if exists "integrations_owner" on prospect_user_integrations;
create policy "integrations_owner" on prospect_user_integrations
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 2. Enrolment d'un lead dans une séquence (état machine)
create table if not exists prospect_lead_sequences (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references prospect_leads(id) on delete cascade,
  sequence_id uuid not null references prospect_sequences(id) on delete cascade,
  current_step integer default 0,        -- index dans steps[]
  next_run_at timestamptz default now(),
  status text default 'ACTIVE' check (status in ('ACTIVE','PAUSED','COMPLETED','STOPPED')),
  enrolled_by uuid references auth.users(id) on delete set null,
  enrolled_at timestamptz default now(),
  completed_at timestamptz,
  unique (lead_id, sequence_id)
);

create index if not exists pls_next_run_idx on prospect_lead_sequences(next_run_at) where status = 'ACTIVE';
create index if not exists pls_lead_idx on prospect_lead_sequences(lead_id);

alter table prospect_lead_sequences enable row level security;
drop policy if exists "lead_sequences_owner" on prospect_lead_sequences;
create policy "lead_sequences_owner" on prospect_lead_sequences
  for all to authenticated
  using (exists (select 1 from prospect_leads l
                 where l.id = prospect_lead_sequences.lead_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from prospect_leads l
                      where l.id = prospect_lead_sequences.lead_id and l.owner_id = auth.uid()));

-- 3. Liste d'opt-out globale (clé = email hashé pour minimiser les données)
create table if not exists prospect_optouts (
  id uuid primary key default gen_random_uuid(),
  email_hash text unique not null,       -- sha256 minuscule, jamais l'email en clair
  reason text,
  source text default 'EMAIL_LINK',
  created_at timestamptz default now()
);

-- Lecture publique non autorisée (RLS dénie par défaut, accès via service role).
alter table prospect_optouts enable row level security;

-- 4. Mise à jour : autoriser les écritures cron via service role
--    (les hooks d'API Next.js utilisant SUPABASE_SERVICE_ROLE_KEY contournent RLS)

-- 5. Vue inbox unifiée (messages reçus = replied_at non null)
create or replace view v_prospect_inbox as
  select m.id, m.lead_id, m.channel, m.subject, m.body,
         m.sent_at, m.replied_at, m.opened_at, m.status,
         l.full_name, l.job_title, l.owner_id,
         c.name as company_name, c.industry, l.lead_score
    from prospect_messages m
    join prospect_leads l on l.id = m.lead_id
    left join prospect_companies c on c.id = l.company_id;

-- (la vue hérite de la RLS de la table sous-jacente côté lecture)
