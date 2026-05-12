-- ============================================================================
-- PHYSICARE® · Installation pipeline en UNE seule passe
-- ----------------------------------------------------------------------------
-- Fichier généré · concatène pipeline.sql + seed_pipeline.sql.
-- Copier-coller intégralement dans Supabase Studio → SQL Editor → Run.
-- ============================================================================

-- ============================================================================
-- PHYSICARE® · Pipeline commercial · schéma Supabase
-- ----------------------------------------------------------------------------
-- Modèle prêt pour la preview pipeline.html (v2). Couvre :
--   - prospects (deals) avec date_debut / date_fin / valeur / propriétaire
--   - étapes du pipeline (lookup + ordre, pour le Kanban)
--   - journal d'activités daté et CONSERVÉ (jamais écrasé)
--   - prochaine action distincte de la dernière action faite
--   - trigger d'auto-log : tout changement d'étape ou de prochaine action
--     crée une entrée dans le journal
--   - vue pivot pour le tableau croisé (temps moyen / conversion par étape)
--
-- À appliquer après le schéma de base (clients, profiles).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Référentiel des étapes du pipeline
-- ----------------------------------------------------------------------------
create table if not exists pipeline_stages (
  id          smallint primary key,
  slug        text     unique not null,         -- 'lead', 'qualified', ...
  label       text     not null,                -- 'Nouveau lead', 'Qualifié'
  color       text     not null default '#8B5CF6',
  ord         smallint not null,                -- ordre dans le Kanban
  is_won      boolean  not null default false,
  is_lost     boolean  not null default false
);

insert into pipeline_stages (id, slug, label, color, ord, is_won, is_lost) values
  (1, 'lead',        'Nouveau lead',    '#6366F1', 10, false, false),
  (2, 'qualified',   'Qualifié',        '#8B5CF6', 20, false, false),
  (3, 'demo',        'Démo planifiée',  '#D97706', 30, false, false),
  (4, 'proposal',    'Proposition',     '#0891B2', 40, false, false),
  (5, 'negotiation', 'Négociation',     '#BE185D', 50, false, false),
  (6, 'won',         'Gagné',           '#059669', 60, true,  false),
  (7, 'lost',        'Perdu',           '#DC2626', 70, false, true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 2. Prospects (= deals)
-- ----------------------------------------------------------------------------
create table if not exists prospects (
  id                uuid primary key default gen_random_uuid(),

  -- Identification
  nom_enseigne      text not null,              -- "Krys Paris République"
  contact_nom       text,                       -- "S. Martin"
  contact_role      text,                       -- "DRH"
  contact_email     text,
  contact_tel       text,

  -- Valeur commerciale
  valeur_eur        numeric(10,2) not null default 0,
  points_vente      integer,                    -- 150 pts vente, contexte taille

  -- Pipeline
  stage_id          smallint not null references pipeline_stages(id) default 1,
  owner_id          uuid references auth.users(id),

  -- Dates clés (axe #2 de la spec)
  date_debut        date not null default current_date,
  date_fin          date,                        -- rempli quand won/lost
  date_attente_fin  date,                        -- "en attente jusqu'au 10/04"

  -- Contexte libre (axe #1 fallback : commentaires)
  contexte          text,                        -- difficultés, succès particuliers
  motif_perdu       text,                        -- 'budget', 'concurrent', 'silence'

  -- Métadonnées
  source            text,                        -- 'SILMO', 'LinkedIn', 'Inbound'
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists prospects_stage_idx       on prospects (stage_id);
create index if not exists prospects_owner_idx       on prospects (owner_id);
create index if not exists prospects_date_debut_idx  on prospects (date_debut desc);

-- ----------------------------------------------------------------------------
-- 3. Journal d'activités (= historique conservé · axe #1)
--    Chaque action passée laisse une trace datée. RIEN n'est jamais écrasé.
--    C'est la source du tableau croisé dynamique.
-- ----------------------------------------------------------------------------
create type activity_kind as enum (
  'lead_created',           -- création du prospect
  'stage_changed',          -- passage d'une étape à l'autre
  'email_sent',             -- email d'intro / présentation
  'call_made',              -- appel découverte / qualif / relance
  'meeting_held',           -- rendez-vous physique
  'demo_done',              -- démo produit réalisée
  'proposal_sent',          -- devis / proposition envoyés
  'contract_signed',        -- signature
  'note',                   -- commentaire libre
  'lost'                    -- clôture perdue
);

create table if not exists prospect_activities (
  id            uuid primary key default gen_random_uuid(),
  prospect_id   uuid not null references prospects(id) on delete cascade,
  kind          activity_kind not null,
  label         text not null,                  -- "Démo réalisée (45 min)"
  details       text,                            -- corps libre
  occurred_at   timestamptz not null default now(),
  from_stage_id smallint references pipeline_stages(id),
  to_stage_id   smallint references pipeline_stages(id),
  author_id     uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

create index if not exists activities_prospect_idx on prospect_activities (prospect_id, occurred_at desc);
create index if not exists activities_kind_idx     on prospect_activities (kind, occurred_at desc);

-- ----------------------------------------------------------------------------
-- 4. Prochaine action (= tâche à faire · axe #4)
--    SÉPARÉE du journal pour éviter le bug "Envoi proposition" affiché alors
--    que la vraie tâche est une relance. Une seule next_action ouverte par
--    prospect ; quand elle est marquée done, elle bascule dans le journal.
-- ----------------------------------------------------------------------------
create type next_action_kind as enum (
  'call',           -- appel
  'email',          -- email
  'meeting',        -- rdv
  'demo',           -- démo à animer
  'follow_up',      -- relance suite à proposition / silence
  'send_proposal',  -- envoyer un devis
  'send_contract',  -- envoyer un contrat
  'wait_legal',     -- attendre retour juridique
  'other'
);

create table if not exists prospect_next_actions (
  id           uuid primary key default gen_random_uuid(),
  prospect_id  uuid not null references prospects(id) on delete cascade,
  kind         next_action_kind not null,
  label        text not null,                   -- "Relancer suite proposition"
  due_at       date,                             -- échéance
  done_at      timestamptz,                      -- null = encore à faire
  owner_id     uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

-- Contrainte : un seul next_action ouvert par prospect.
create unique index if not exists one_open_next_action_per_prospect
  on prospect_next_actions (prospect_id)
  where done_at is null;

create index if not exists next_actions_due_idx
  on prospect_next_actions (due_at)
  where done_at is null;

-- ----------------------------------------------------------------------------
-- 5. Trigger : tout changement d'étape laisse une trace dans le journal
-- ----------------------------------------------------------------------------
create or replace function log_stage_change()
returns trigger language plpgsql as $$
begin
  if new.stage_id is distinct from old.stage_id then
    insert into prospect_activities (
      prospect_id, kind, label,
      from_stage_id, to_stage_id, author_id, occurred_at
    )
    select
      new.id,
      case
        when ns.is_won  then 'contract_signed'::activity_kind
        when ns.is_lost then 'lost'::activity_kind
        else                  'stage_changed'::activity_kind
      end,
      'Passage : ' || coalesce(os.label,'—') || ' → ' || ns.label,
      old.stage_id, new.stage_id, auth.uid(), now()
    from pipeline_stages ns
    left join pipeline_stages os on os.id = old.stage_id
    where ns.id = new.stage_id;

    -- Renseigne automatiquement date_fin sur won/lost
    if exists (select 1 from pipeline_stages s where s.id = new.stage_id and (s.is_won or s.is_lost)) then
      new.date_fin := coalesce(new.date_fin, current_date);
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_prospects_stage_change on prospects;
create trigger trg_prospects_stage_change
  before update on prospects
  for each row execute function log_stage_change();

-- Trigger : à la création d'un prospect, log "lead_created"
create or replace function log_prospect_created()
returns trigger language plpgsql as $$
begin
  insert into prospect_activities (
    prospect_id, kind, label, to_stage_id, author_id, occurred_at
  ) values (
    new.id, 'lead_created', 'Lead créé · ' || coalesce(new.source,'manuel'),
    new.stage_id, auth.uid(), now()
  );
  return new;
end $$;

drop trigger if exists trg_prospects_created on prospects;
create trigger trg_prospects_created
  after insert on prospects
  for each row execute function log_prospect_created();

-- Trigger : quand on marque une next_action done, on l'archive dans le journal
create or replace function log_next_action_done()
returns trigger language plpgsql as $$
declare
  k activity_kind;
begin
  if new.done_at is not null and old.done_at is null then
    k := case new.kind
      when 'call'           then 'call_made'
      when 'email'          then 'email_sent'
      when 'meeting'        then 'meeting_held'
      when 'demo'           then 'demo_done'
      when 'send_proposal'  then 'proposal_sent'
      when 'send_contract'  then 'proposal_sent'
      when 'follow_up'      then 'call_made'
      else 'note'
    end;
    insert into prospect_activities (
      prospect_id, kind, label, author_id, occurred_at
    ) values (
      new.prospect_id, k, new.label, new.owner_id, new.done_at
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_next_action_done on prospect_next_actions;
create trigger trg_next_action_done
  after update on prospect_next_actions
  for each row execute function log_next_action_done();

-- ----------------------------------------------------------------------------
-- 6. VUE PIVOT · alimente le tableau "Analyse parcours"
--    Pour chaque transition d'étape, calcule le temps moyen passé et le
--    taux de conversion vers l'étape suivante.
-- ----------------------------------------------------------------------------
create or replace view pipeline_funnel_stats as
with stage_entries as (
  select
    a.prospect_id,
    a.to_stage_id   as stage_id,
    a.occurred_at   as entered_at,
    lead(a.occurred_at) over (
      partition by a.prospect_id
      order by a.occurred_at
    ) as left_at,
    lead(a.to_stage_id) over (
      partition by a.prospect_id
      order by a.occurred_at
    ) as next_stage_id
  from prospect_activities a
  where a.to_stage_id is not null
),
durations as (
  select
    se.stage_id,
    se.next_stage_id,
    extract(epoch from (coalesce(se.left_at, now()) - se.entered_at)) / 86400.0 as days_in_stage
  from stage_entries se
)
select
  s.id            as stage_id,
  s.slug,
  s.label,
  s.ord,
  count(*)                                                  as deals_entered,
  count(d.next_stage_id)                                    as deals_advanced,
  round(avg(d.days_in_stage)::numeric, 1)                   as avg_days_in_stage,
  case when count(*) = 0 then 0
       else round(100.0 * count(d.next_stage_id) / count(*), 0)
  end                                                       as conversion_pct
from pipeline_stages s
left join durations d on d.stage_id = s.id
group by s.id, s.slug, s.label, s.ord
order by s.ord;

-- ----------------------------------------------------------------------------
-- 7. VUE Stand-by · prospects sans next_action ou next_action en retard +21j
--    Alimente le bandeau orange "Objectif 2 nouveaux prospects/semaine"
-- ----------------------------------------------------------------------------
create or replace view prospects_stand_by as
select
  p.id,
  p.nom_enseigne,
  p.stage_id,
  p.date_debut,
  current_date - p.date_debut as jours_dans_pipeline,
  na.due_at,
  case
    when na.id is null then 'sans_action'
    when na.due_at < current_date - interval '21 days' then 'retard_long'
    else 'normal'
  end as stand_by_reason
from prospects p
left join lateral (
  select id, due_at
  from prospect_next_actions
  where prospect_id = p.id and done_at is null
  order by due_at nulls last
  limit 1
) na on true
where p.date_fin is null  -- exclut won/lost
  and (na.id is null or na.due_at < current_date - interval '21 days');

-- ----------------------------------------------------------------------------
-- 8. RLS · chaque commercial voit ses propres prospects, l'admin voit tout
-- ----------------------------------------------------------------------------
alter table prospects               enable row level security;
alter table prospect_activities     enable row level security;
alter table prospect_next_actions   enable row level security;

drop policy if exists prospects_owner_rw on prospects;
create policy prospects_owner_rw on prospects
  for all
  using  (owner_id = auth.uid() or auth.jwt() ->> 'role' = 'admin')
  with check (owner_id = auth.uid() or auth.jwt() ->> 'role' = 'admin');

drop policy if exists activities_via_prospect on prospect_activities;
create policy activities_via_prospect on prospect_activities
  for all
  using (
    exists (
      select 1 from prospects p
      where p.id = prospect_id
        and (p.owner_id = auth.uid() or auth.jwt() ->> 'role' = 'admin')
    )
  );

drop policy if exists next_actions_via_prospect on prospect_next_actions;
create policy next_actions_via_prospect on prospect_next_actions
  for all
  using (
    exists (
      select 1 from prospects p
      where p.id = prospect_id
        and (p.owner_id = auth.uid() or auth.jwt() ->> 'role' = 'admin')
    )
  );

-- ----------------------------------------------------------------------------
-- FIN. Une fois ce fichier appliqué :
--   - les cartes Kanban se branchent sur `prospects` (+ jointures next_action)
--   - la timeline déroulée vient de `prospect_activities`
--   - le tableau pivot vient de `pipeline_funnel_stats`
--   - le bandeau stand-by vient de `prospects_stand_by`
-- ============================================================================


-- ============================================================================
-- SEED · 10 prospects de démo
-- ============================================================================

-- ============================================================================
-- Seed pipeline · 10 prospects fictifs pour valider la page /pipeline
-- ----------------------------------------------------------------------------
-- À appliquer APRÈS pipeline.sql. owner_id est volontairement laissé NULL pour
-- éviter de dépendre d'un utilisateur précis dans auth.users (la policy RLS
-- 'admin' permet à un compte service role de tout voir le temps de tester).
--
-- Pour un test propre :
--   1. Désactiver temporairement RLS, ou se connecter en tant qu'admin
--   2. Lancer ce fichier
--   3. Recharger /pipeline dans le navigateur
-- ============================================================================

-- Wipe (idempotent — décommenter pour reseed)
-- delete from prospect_activities;
-- delete from prospect_next_actions;
-- delete from prospects;

-- ----------------------------------------------------------------------------
-- Insertion des 10 prospects + capture des UUIDs générés via WITH
-- ----------------------------------------------------------------------------
with new_prospects as (
  insert into prospects (
    nom_enseigne, contact_nom, contact_role,
    valeur_eur, points_vente, stage_id,
    date_debut, date_fin, date_attente_fin,
    source, motif_perdu, contexte
  )
  values
    ('Alain Afflelou',         'M. Dupont',     'Dir. RH',     32000, 100, 1, current_date - 2,   null, null, 'Formulaire site', null,
     'Demande qualif via site'),
    ('Optic 2000 Nord-Est',    'Mme Lefèvre',   null,          24000, 70,  1, current_date - 12,  null, null, 'SILMO',           null, null),
    ('SPM Rémy',               'Rémy Lambert',  'Gérant',      14000, 8,   2, current_date - 48,  null, current_date - 12, 'Réseau', null,
     'En attente retour proposition · à relancer'),
    ('Krys Groupe',            'S. Martin',     'DRH',         48000, 150, 2, current_date - 21,  null, null, 'LinkedIn',        null, null),
    ('Optical Center HQ',      'I. Mercier',    'Dir. opé.',   42000, 220, 3, current_date - 51,  null, null, 'SILMO',           null,
     'Démo planifiée le 22/04'),
    ('Afflelou Pilote',        'L. Dubois',     null,          38000, 60,  4, current_date - 62,  null, null, 'Outbound',        null,
     'Proposition envoyée 18/04'),
    ('Krys Pilote Paris',      'S. Martin',     'DRH',         44000, 1,   5, current_date - 101, null, null, 'LinkedIn',        null,
     'En négo · retour juridique attendu'),
    ('Optical Center Lyon',    'Signé Mme L.',  'Achat',       32000, 1,   6, current_date - 159, current_date - 60, null, 'SILMO',  null,
     'Premier pilote signé · client actif'),
    ('Acuitis Bordeaux',       'Signé M. B.',   'Achat',       22000, 1,   6, current_date - 180, current_date - 75, null, 'Inbound',null, null),
    ('MonOpticien.com',        'M. Lefranc',    null,          24000, 30,  7, current_date - 130, current_date - 40, null, 'Outbound','budget',
     'Pas le budget cette année')
  returning id, nom_enseigne, stage_id, date_debut
)
-- ----------------------------------------------------------------------------
-- Insertion des prochaines actions (1 par prospect ouvert)
-- ----------------------------------------------------------------------------
, next_actions_ins as (
  insert into prospect_next_actions (prospect_id, kind, label, due_at)
  select p.id,
         case p.stage_id
           when 1 then 'call'::next_action_kind
           when 2 then 'follow_up'::next_action_kind
           when 3 then 'demo'::next_action_kind
           when 4 then 'follow_up'::next_action_kind
           when 5 then 'wait_legal'::next_action_kind
         end,
         case p.stage_id
           when 1 then 'Prendre RDV découverte'
           when 2 then 'Relancer suite proposition'
           when 3 then 'Animer démo produit'
           when 4 then 'Première relance proposition'
           when 5 then 'Recevoir retour juridique'
         end,
         case p.stage_id
           when 1 then current_date + 3
           when 2 then current_date - 12   -- SPM-Rémy en retard
           when 3 then current_date + 2
           when 4 then current_date + 5
           when 5 then current_date + 1
         end
  from new_prospects p
  where p.stage_id between 1 and 5
  returning prospect_id
)
-- ----------------------------------------------------------------------------
-- Insertion des activités historiques (en plus des entrées créées par triggers)
-- ----------------------------------------------------------------------------
insert into prospect_activities (prospect_id, kind, label, occurred_at)
select id, 'email_sent',    'Email d''intro envoyé',          date_debut + interval '5 days'
  from new_prospects where stage_id >= 2
union all
select id, 'call_made',     'Appel découverte',                date_debut + interval '12 days'
  from new_prospects where stage_id >= 2
union all
select id, 'demo_done',     'Démo produit réalisée (45 min)',  date_debut + interval '24 days'
  from new_prospects where stage_id >= 4
union all
select id, 'proposal_sent', 'Proposition / devis envoyés',     date_debut + interval '32 days'
  from new_prospects where stage_id >= 4
union all
select id, 'meeting_held',  'Réunion juridique côté client',   date_debut + interval '60 days'
  from new_prospects where stage_id = 5;

-- ============================================================================
-- Vérifications rapides après seed :
--   select count(*) from prospects;                       -- 10
--   select count(*) from prospect_next_actions;           -- 7 ouvertes
--   select count(*) from prospect_activities;             -- 10 lead_created + N
--   select * from pipeline_funnel_stats;                  -- vue alimentée
--   select * from prospects_stand_by;                     -- SPM-Rémy + autres
-- ============================================================================
