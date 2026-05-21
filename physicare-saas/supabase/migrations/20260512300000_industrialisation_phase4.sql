-- PHYSICARE® — Phase 4 : industrialisation
-- Équipes, audit RGPD (art. 30), automatisation deals, webhooks sortants

-- 1. Équipes (multi-tenant intra-PHYSICARE®)
create table if not exists prospect_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists prospect_team_members (
  team_id uuid not null references prospect_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text default 'MEMBER' check (role in ('ADMIN','MEMBER')),
  monthly_quota integer default 200,
  joined_at timestamptz default now(),
  primary key (team_id, user_id)
);

alter table prospect_team_members enable row level security;
drop policy if exists "team_members_read" on prospect_team_members;
create policy "team_members_read" on prospect_team_members
  for select to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from prospect_team_members tm
               where tm.team_id = prospect_team_members.team_id and tm.user_id = auth.uid())
  );

-- 2. Audit log RGPD (article 30 + traçabilité accès)
create table if not exists prospect_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,           -- READ, EXPORT, DELETE, ENRICH, SEND, OPTOUT, AI_GENERATE
  resource_type text,             -- lead, company, message, deal
  resource_id uuid,
  metadata jsonb default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists audit_user_idx on prospect_audit_log(user_id, created_at desc);
create index if not exists audit_resource_idx on prospect_audit_log(resource_type, resource_id);

alter table prospect_audit_log enable row level security;
drop policy if exists "audit_own_read" on prospect_audit_log;
create policy "audit_own_read" on prospect_audit_log
  for select to authenticated using (user_id = auth.uid());

-- 3. Intégrations CRM sortantes (HubSpot, Salesforce)
alter table prospect_user_integrations
  drop constraint if exists prospect_user_integrations_provider_check;
alter table prospect_user_integrations
  add constraint prospect_user_integrations_provider_check
  check (provider in ('UNIPILE','RESEND','POSTMARK','HUBSPOT','SALESFORCE','PHYSICARE_SAAS'));

-- 4. Vue analytics deals
create or replace view v_prospect_pipeline as
  select l.owner_id,
         d.stage,
         count(*) as deals,
         coalesce(sum(d.amount_eur), 0) as total_amount,
         coalesce(sum(d.amount_eur * d.probability / 100.0), 0)::int as weighted_forecast
    from prospect_deals d
    join prospect_leads l on l.id = d.lead_id
   group by l.owner_id, d.stage;

-- 5. Vue : trace d'export / suppression GDPR
create or replace view v_prospect_rgpd_register as
  select date_trunc('day', created_at) as day,
         action, resource_type, count(*) as cnt
    from prospect_audit_log
   where action in ('EXPORT','DELETE','OPTOUT','ENRICH')
   group by 1, 2, 3
   order by 1 desc;

-- 6. Suppression auto > 3 ans (fonction utilisable par cron mensuel)
create or replace function purge_stale_leads()
returns integer language plpgsql as $$
declare
  n integer;
begin
  with cutoff as (select now() - interval '3 years' as t),
       deleted as (
    delete from prospect_leads
     where (last_contacted_at is not null and last_contacted_at < (select t from cutoff))
        or (last_contacted_at is null and created_at < (select t from cutoff))
     returning id
  )
  select count(*) into n from deleted;
  insert into prospect_audit_log (action, resource_type, metadata)
    values ('PURGE', 'lead', jsonb_build_object('count', n));
  return n;
end $$;
