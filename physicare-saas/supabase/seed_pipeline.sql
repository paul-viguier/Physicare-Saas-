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
