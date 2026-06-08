# 🏛️ Architecture Physicare — Document de référence

> ⚠️ **Note de version.** Une première version de ce document supposait une base
> simple (`clients`, `diagnostics`). C'était faux. Après inspection de la vraie base
> de production `physicare-prod`, ce document décrit désormais le **système réel**.

> Décisions fondatrices (validées) :
> 1. **Plusieurs produits / parcours** (la base en gère déjà 26 répartis en 8 catégories)
> 2. **Un seul accès par utilisateur** → connexion unique, contenu selon le rôle et l'organisation
> 3. **Site vitrine physicare.fr séparé** → projet indépendant
> 4. **`physicare-saas` devient le vrai front-end**, branché sur la vraie base (pas sur des tables inventées)

---

## 0. Constat de départ (très important)

La base `physicare-prod` n'est **pas** un prototype : c'est un SaaS d'entreprise déjà
riche et peuplé (4 organisations, 20 utilisateurs, **705 modules de formation**,
facturation, conformité Qualiopi, audit, RGPD, 2FA…).

Le repo `physicare-saas` était, lui, une **maquette** qui interrogeait des tables
**inexistantes** (`clients`, `diagnostics`, `dashboard_stats`). Le vrai travail n'est
donc pas de « créer un socle » — **le socle existe déjà** — mais de **construire le
front-end sur ce socle réel.**

---

## 1. Les 3 mondes indépendants

```
SITE VITRINE          PLATEFORME SAAS              DONNÉES
physicare.fr   ──▶     app.physicare.fr     ──▶    Supabase « physicare-prod »
(repo séparé)         (ce repo, à construire)      (déjà en place, ~40 tables)
```

---

## 2. Le modèle de données RÉEL (déjà en base)

### Socle multi-clients / multi-utilisateurs
```
organizations   (id, name, access_code, sector, lifecycle_stage, contract dates,
                 logo_url, theme_color, admin_id→users)          -- LE CLIENT (tenant)
teams           (id, org_id→organizations, manager_id→users)     -- équipes du client
users           (id = auth.uid, email, full_name, role, org_id, team_id, access_code)
                 role ∈ { employee, manager, org_admin, super_admin }
```
- **Auth = Supabase Auth.** Les 20 `users` sont liés 1-pour-1 à `auth.users`.
- L'**isolation** se fait par `org_id` (chaque utilisateur appartient à une organisation).

### Catalogue de formation (= « les produits / parcours »)
```
training_axes      (26 axes, 8 catégories : sante_mentale, addictions, performance,
                    management_relations, corps_sommeil, care_chronique, sens_engagement, vie_perso)
  └─ training_chapters (axis_id→training_axes, level)
       └─ training_modules (705)  (axis_id, chapter_id, durée, xp, statut, Qualiopi…)
            └─ module_lessons     (contenu jsonb, durée)
```
Progression apprenant :
```
lesson_completions, module_completions, module_completions_track
emargements           -- feuilles d'émargement (preuve Qualiopi)
satisfaction_responses-- évaluations à chaud / à froid
```

### Diagnostic / questionnaires (santé comportementale)
```
questionnaire_questions (par type, pilier, module)
  └─ responses          (user_id, scores : regulation, appropriation, continuite, capacite)
       └─ question_responses (réponse par question)
daily_moods             -- humeur/énergie quotidienne
```

### Données des dashboards (déjà agrégées)
```
org_aggregates   (par organisation : moyennes régulation/appropriation/continuité, participation…)
team_aggregates  (par équipe : idem)
org_settings, team_settings  -- seuils d'alerte, branding, règles d'intervention
```

### Business / facturation / conformité (back-office Physicare)
```
business_documents (devis, conventions, factures…), invoices, billing_plans,
recurring_billing_plans, cycles, dirigeants, transcripts, restitutions,
financeurs_master, signature_requests
audit_logs, consent_logs, api_keys, webhooks, integrations,
user_totp (2FA), user_sessions, user_preferences, onboarding_steps, lifecycle_events
```

---

## 3. Les rôles → les espaces (la « relation entre dashboards »)

Le système de rôles existant cartographie **exactement** les espaces du produit :

| Rôle (`users.role`) | Espace | Voit… | Source des données |
|---|---|---|---|
| `employee` | **Espace apprenant** | ses formations, son diagnostic, son humeur | training_*, responses, lesson_completions |
| `manager` | **Dashboard équipe** | les indicateurs agrégés de SON équipe | `team_aggregates` |
| `org_admin` | **Dashboard organisation** | toute son organisation + gestion users/équipes | `org_aggregates`, users, teams |
| `super_admin` | **Back-office Physicare** | TOUTES les organisations + catalogue + business | tout |

C'est **une seule chaîne de données vue à plusieurs niveaux** : l'apprenant produit
(complétions, réponses) → agrégé par équipe (`team_aggregates`) → par organisation
(`org_aggregates`) → consolidé pour Physicare. Voilà le lien entre les dashboards.

---

## 4. Structure des URLs cible

```
app.physicare.fr/login                          connexion unique (Supabase Auth)

  routage selon users.role après connexion :
  ├─ employee   → /app                          espace apprenant
  │               /app/formation/:axisId         un parcours / ses modules
  │               /app/diagnostic                 questionnaire
  ├─ manager    → /manager                       dashboard de son équipe
  ├─ org_admin  → /org                           dashboard de son organisation
  └─ super_admin→ /admin                         back-office global Physicare
```
Plus besoin d'`/:client` dans l'URL : l'organisation est déduite de l'utilisateur connecté
(`users.org_id`). C'est plus simple et plus sûr.

---

## 5. Organisation du code (à construire)

```
physicare-saas/
├── pages/ (ou app/)         routage minimal, redirection selon le rôle
│   ├── login.js
│   ├── app/                 espace apprenant (employee)
│   ├── manager/             dashboard équipe (manager)
│   ├── org/                 dashboard organisation (org_admin)
│   └── admin/               back-office Physicare (super_admin)
├── core/
│   ├── auth/                Supabase Auth + récupération du profil/rôle + gardes de route
│   ├── layout/             en-tête, navigation par rôle
│   └── ui/                  composants partagés (KPI, tableaux, graphes, export)
├── lib/
│   ├── supabase.js          client (clé publishable + RLS)
│   └── db/                  accès données par domaine :
│       ├── organizations.js, users.js, teams.js
│       ├── training.js      axes / modules / leçons / complétions
│       ├── diagnostics.js   questionnaires / responses / scores
│       └── aggregates.js    org_aggregates / team_aggregates
└── ARCHITECTURE.md
```

---

## 6. Sécurité — à vérifier en priorité

- Le front utilise la **clé publishable** (publique). La sécurité repose donc
  **entièrement sur le Row Level Security (RLS)** de Supabase.
- ✅ À auditer : chaque table doit avoir des policies RLS garantissant qu'un
  utilisateur ne lit/écrit QUE les données de SON organisation (et un `super_admin`
  l'ensemble). Sans cela, n'importe qui avec la clé publique pourrait tout lire.
- Le mot de passe back-office en dur (`physicare2026`) de la maquette est à
  **abandonner** au profit de l'auth Supabase + rôle `super_admin`.

---

## 7. Chemin de migration (maquette → vrai front-end, par étapes livrables)

- [x] **Phase 0 — Réparer le build**.
- [x] **Phase 1 — Connexion au réel** : auth Supabase + `lib/db/` + back-office listant
      les vraies `organizations`. Librairie `@supabase/supabase-js` mise à jour (compat. clé publishable).
- [x] **Phase 2 — Rôles & navigation** : `useAuthGuard`, redirection par rôle, barre d'onglets (`SpaceNav`).
- [x] **Phase 3 — Espace apprenant** : `training_axes` (par catégorie) → modules → leçons (705 / 4233).
- [x] **Phase 4 — Dashboards** : équipe (`team_aggregates`), organisation (`org_aggregates`),
      diagnostic personnel (`responses`). *(les agrégats sont vides en base → états « pas encore de données »)*
- [ ] **Phase 5 — Back-office complet** : catalogue, business/facturation, conformité Qualiopi.
- [ ] **À prévoir — Génération des agrégats** : remplir `org_aggregates` / `team_aggregates`
      (cron / edge function) pour que les dashboards affichent des chiffres.
- [ ] **Transversal — Audit RLS** (cf. §6) avant toute mise en production.

Chaque phase est indépendante et testable ; on garde toujours une app qui démarre.

---

## ⚠️ Question ouverte à clarifier

Un backend aussi complet (705 modules, facturation, Qualiopi) a presque sûrement
**déjà un front-end** quelque part (autre repo, ou outil type no-code). Avant de
reconstruire, il faut savoir si on **repart de zéro** ou si on **récupère / consolide**
l'existant, pour ne pas refaire un travail déjà fait.
