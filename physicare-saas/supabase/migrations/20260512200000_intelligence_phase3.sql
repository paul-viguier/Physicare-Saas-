-- PHYSICARE® — Phase 3 : intelligence (signaux auto, IA, look-alike, A/B)

-- 1. pgvector pour la similarité look-alike
create extension if not exists vector;

alter table prospect_leads
  add column if not exists embedding vector(384),
  add column if not exists ai_personalized_body text,
  add column if not exists ai_personalized_at timestamptz;

create index if not exists prospect_leads_embedding_idx
  on prospect_leads using ivfflat (embedding vector_cosine_ops) with (lists = 50);

-- 2. Variantes A/B pour les étapes de séquence
--    Stockées séparément (plutôt que dans steps[]) pour mesurer la perf par variante.
create table if not exists prospect_step_variants (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references prospect_sequences(id) on delete cascade,
  step_index integer not null,
  variant_label text not null,           -- 'A', 'B', 'C'…
  subject text,
  body text not null,
  weight integer default 1,              -- pondération du tirage
  created_at timestamptz default now(),
  unique (sequence_id, step_index, variant_label)
);

alter table prospect_step_variants enable row level security;
drop policy if exists "variants_owner" on prospect_step_variants;
create policy "variants_owner" on prospect_step_variants
  for all to authenticated
  using (exists (select 1 from prospect_sequences s
                 where s.id = prospect_step_variants.sequence_id and s.created_by = auth.uid()))
  with check (exists (select 1 from prospect_sequences s
                      where s.id = prospect_step_variants.sequence_id and s.created_by = auth.uid()));

-- Mémoriser quelle variante a été envoyée (pour analytics A/B)
alter table prospect_messages
  add column if not exists variant_label text,
  add column if not exists step_index integer;

-- 3. Trace des runs du cron de signaux
create table if not exists prospect_signal_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz default now(),
  detected_count integer default 0,
  source text,                            -- 'KEYWORDS','JOB_POSTING','FUNDING','JOB_CHANGE'
  duration_ms integer,
  notes text
);

-- 4. Vue analytics — entonnoir
create or replace view v_prospect_funnel as
  select owner_id,
         count(*)                                        as total_leads,
         count(*) filter (where status = 'CONTACTED')     as contacted,
         count(*) filter (where status = 'REPLIED')       as replied,
         count(*) filter (where status = 'MEETING_BOOKED') as meetings,
         count(*) filter (where status = 'OPPORTUNITY')   as opportunities,
         count(*) filter (where status = 'CUSTOMER')      as customers
    from prospect_leads
   group by owner_id;

-- 5. Vue analytics — A/B (par variante de step)
create or replace view v_prospect_variant_stats as
  select sequence_id, step_index, variant_label,
         count(*)                                       as sent,
         count(*) filter (where opened_at is not null)   as opened,
         count(*) filter (where replied_at is not null)  as replied
    from prospect_messages
   where variant_label is not null
   group by sequence_id, step_index, variant_label;
