# Module Prospection LinkedIn — Architecture

> PHYSICARE® v1.0 — Mai 2026

## Vue d'ensemble

Module SaaS B2B de génération de leads qualifiés intégré au dashboard PHYSICARE®.
Il s'appuie sur des **APIs officielles** (jamais de scraping LinkedIn direct).

## Stack

| Couche | Techno |
|---|---|
| Frontend | Next.js 14 (mix Pages/App Router) + React 18 |
| Style | CSS-in-JS inline + globals.css (palette PHYSICARE®) |
| Backend | Supabase Postgres + RLS + Edge Functions |
| Enrichissement | Dropcontact (prio), Apollo, Hunter, Pappers |
| LinkedIn | Unipile (OAuth officiel) |
| Email | Resend (envoi) + Postmark (tracking) |
| Queue | pg_cron + Edge Functions |
| Observabilité | Sentry + Vercel Analytics |

## Modèle de données

Six tables principales (cf. `supabase/migrations/20260512000000_prospection_linkedin.sql`) :

1. `prospect_companies` — référentiel entreprises cibles
2. `prospect_leads` — contacts, scoring LSP, ownership multi-tenant
3. `prospect_sequences` — séquences multi-étapes (JSONB steps)
4. `prospect_messages` — messages envoyés (LI + email), tracking
5. `prospect_intent_signals` — signaux d'achat détectés (5 types)
6. `prospect_deals` — pipeline commercial

RLS activée partout : un utilisateur ne voit que ses propres leads, messages,
signaux et deals. Le référentiel entreprises est partagé (lecture authentifiée).

## Lead Score PHYSICARE® (LSP)

Algorithme propriétaire 0-100, implémenté dans `lib/leadScoring.js`.

| Composante | Max | Source |
|---|---|---|
| Persona | 30 | `prospect_leads.persona_type` |
| Taille entreprise | 20 | `prospect_companies.employee_count` |
| Secteur prioritaire | 15 | `prospect_companies.industry` |
| Signaux d'intention | 25 | `prospect_intent_signals` |
| Pénalité email | -15 | `prospect_leads.email_status='INVALID'` |

Tiers : HOT ≥ 80, WARM ≥ 60, NURTURE ≥ 40, COLD < 40.
Score forcé à 0 si `unsubscribed_at` est renseigné.

## Routes (Pages Router)

| URL | Rôle |
|---|---|
| `/linkedin-prospection` | Dashboard pipeline (Kanban + KPIs + auth magic-link) |
| `/linkedin-prospection/search` | Recherche ICP → prévisualisation LSP → "Ajouter" |
| `/linkedin-prospection/import` | Import CSV |
| `/linkedin-prospection/[id]` | Vue 360° lead + timeline + actions |
| `/linkedin-prospection/sequences` | Liste + création de séquences |
| `/linkedin-prospection/sequences/[id]` | Éditeur d'étapes + aperçu rendu |
| `/linkedin-prospection/inbox` | Inbox unifiée (LI + email, filtrée par statut) |
| `/linkedin-prospection/settings` | Connexion Unipile (account_id + token) |
| `/api/prospects/search` | POST — Apollo.io (mock si pas de clé) |
| `/api/prospects/enrich` | POST — Dropcontact (mock heuristique si pas de clé) |
| `/api/sequences/enroll` | POST — enrôler des leads dans une séquence |
| `/api/sequences/run` | GET — cron (Vercel `*/15 * * * *`, protégé par CRON_SECRET) |
| `/api/email/unsubscribe` | GET — opt-out one-click signé HMAC |
| `/api/webhooks/resend` | POST — open/delivered/bounced/complained |
| `/api/webhooks/unipile` | POST — réponses LinkedIn / acceptations |
| `/api/ai/personalize` | POST — Claude Sonnet 4.6 + prompt caching |
| `/api/signals/run` | GET — cron quotidien 06h UTC (POST_KEYWORD/JOB_POSTING/JOB_CHANGE/FUNDING) |
| `/api/leads/embed` | GET\|POST — calcule embeddings (cron quotidien 04h UTC) |
| `/linkedin-prospection/analytics` | Funnel + taux de conversion + perf A/B |
| `/linkedin-prospection/deals` | Kanban deals + forecast pondéré |
| `/linkedin-prospection/team` | Classement équipe + quotas |
| `/linkedin-prospection/audit` | Registre RGPD art. 30 + actions utilisateur |
| `/api/integrations/hubspot/sync` | POST — push contact + deal HubSpot |
| `/api/integrations/physicare/export` | POST — bascule un lead vers le SaaS principal |
| `/api/reports/weekly` | GET — cron lundi 8h, résumé par email |

## Phase 3 — IA & Look-alike

- **Personnalisation** : `lib/ai.js` appelle Claude Sonnet 4.6 avec un système prompt
  cache_control:'ephemeral' (~1.5k tokens) → coût réduit ~90% sur volume.
- **Embeddings** : `lib/embeddings.js` (Jina v2 384-d, mock déterministe en dev).
  Stockés dans `prospect_leads.embedding` (vector(384), index ivfflat cosine).
- **Look-alike** : RPC Postgres `lookalike_leads(source_id)` + `lookalike_from_customers()`
  qui calcule un centroïde des clients existants et trouve les NEW les plus proches.
- **A/B testing** : table `prospect_step_variants` (label, weight). Le cron
  `/api/sequences/run` tire une variante pondérée et la journalise dans
  `prospect_messages.variant_label`. Vue `v_prospect_variant_stats` agrège.
- **Signaux d'achat** : cron 06h UTC scanne les leads actifs, détecte 4 types
  (POST_KEYWORD, JOB_POSTING, JOB_CHANGE, FUNDING), insère dans
  `prospect_intent_signals`, recompute le LSP. Trace dans `prospect_signal_runs`.
- **Analytics** : vues SQL `v_prospect_funnel` + `v_prospect_variant_stats`
  consommées par `/analytics` (rendu SVG vanilla, pas de dep Recharts).

## Phase 2 — Boucle d'envoi

```
Vercel Cron (15 min) ──▶ /api/sequences/run
                          │
                          ├─ select enrolments ACTIVE & due
                          ├─ skip si unsubscribed / DNC / opt-out global (hash email)
                          ├─ render step (templates + opt-out injecté pour EMAIL)
                          ├─ EMAIL  → Resend
                          ├─ LINKEDIN_*  → Unipile (quota 80/j vérifié atomiquement)
                          ├─ insert prospect_messages
                          └─ avance current_step OR complete

Webhooks Resend / Unipile ──▶ MAJ opened_at / replied_at / status
                              ──▶ pause séquences si REPLIED
```

## Flux Phase 1 (MVP)

```
Recherche critères ICP
   └─> appel Dropcontact / Pappers
        └─> upsert prospect_companies
             └─> upsert prospect_leads (owner_id = auth.uid())
                  └─> computeLeadScore(lead, company, signals)
                       └─> persist lead_score
                            └─> rendu LeadCard (Kanban)
```

## Sécurité

- Tokens LinkedIn chiffrés via Supabase Vault (Phase 2).
- Aucun mot de passe utilisateur stocké en clair.
- Rate limit LinkedIn : 80 actions/jour/compte (Phase 2).
- Toutes les écritures côté client sont protégées par RLS.

## Phases

| Phase | Périmètre | Statut |
|---|---|---|
| 1 — MVP | Schéma DB, scoring, dashboard, import CSV, Dropcontact | ✅ Livré |
| 2 — Engagement | Unipile, séquences, Resend, inbox, opt-out, cron | ✅ Livré |
| 3 — Intelligence | Signaux auto, IA Claude, look-alike pgvector, A/B, analytics | ✅ Livré |
| 4 — Industrialisation | Deals, HubSpot, export PHYSICARE®, rapport hebdo, équipes, audit RGPD | ✅ Livré |
| 4 — Industrialisation | CRM complet, HubSpot/Salesforce, équipes | ⏸ À venir |
