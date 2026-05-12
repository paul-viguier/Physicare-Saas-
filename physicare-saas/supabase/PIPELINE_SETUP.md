# Setup pipeline commercial · 5 minutes

Guide pas-à-pas pour activer la page `/pipeline` localement avec des données de démo.

---

## 1. Préparer la base Supabase

### a. Appliquer le schéma

Ouvrir **Supabase Studio → SQL Editor → New query**, coller le contenu de :

```
physicare-saas/supabase/pipeline.sql
```

et cliquer **Run**. Cela crée :

| Objet | Rôle |
|---|---|
| `pipeline_stages` | Référentiel des 7 colonnes du Kanban (lead → won/lost) |
| `prospects` | Le deal lui-même · date_debut, date_fin, valeur, contact, owner |
| `prospect_activities` | Journal daté · jamais écrasé · source du tableau croisé |
| `prospect_next_actions` | « Action à faire » · 1 seule ouverte à la fois par deal |
| `pipeline_funnel_stats` (vue) | Temps moyen + conversion par étape |
| `prospects_stand_by` (vue) | Deals sans next-action ou en retard +21j |
| 3 triggers | Auto-log à la création, au changement d'étape, à la complétion de next-action |
| Policies RLS | Chaque owner voit ses deals, role=admin voit tout |

### b. Charger les données de démo (optionnel mais recommandé)

Même chose, avec :

```
physicare-saas/supabase/seed_pipeline.sql
```

Insère **10 prospects fictifs** couvrant les 7 étapes — dont le cas **SPM Rémy** (proposition envoyée, relance en retard de 12 jours) qui illustre la séparation entre dernière action et prochaine action.

> ⚠ Le seed laisse `owner_id` à NULL. Pour que la RLS te laisse voir les lignes : soit te connecter avec un compte ayant `role=admin` dans son JWT, soit désactiver temporairement RLS sur les 3 tables le temps du test (`alter table prospects disable row level security;` puis remettre).

### c. Vérification rapide

Dans le SQL Editor :

```sql
select count(*) from prospects;                  -- 10
select count(*) from prospect_next_actions;      -- 7 ouvertes
select * from pipeline_funnel_stats order by ord;
select * from prospects_stand_by;
```

---

## 2. Configurer l'app Next.js

### a. Créer `.env.local`

À la racine de `physicare-saas/`, copier `.env.example` :

```bash
cp .env.example .env.local
```

Puis remplir les 2 valeurs (Supabase Studio → Project Settings → API) :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

→ utiliser la **anon / public key**, jamais la `service_role`.

### b. Créer un utilisateur de test

**Supabase Studio → Authentication → Users → Add user** → email + mot de passe.

Pour avoir le rôle admin (et voir tous les deals via la RLS) :

**Authentication → Users → ton user → Edit → Raw user meta data** :
```json
{ "role": "admin" }
```

### c. Lancer le serveur

```bash
cd physicare-saas
npm install
npm run dev
```

---

## 3. Ouvrir la page

1. `http://localhost:3000/login` → te connecter avec le user de l'étape 2.b
2. `http://localhost:3000/pipeline`

Ce que tu dois voir :
- **4 KPIs** en haut (pipeline pondéré, gagné, conversion, cycle moyen) calculés depuis tes vrais prospects
- **Bandeau stand-by orange** avec compteur `X/2 cette semaine`
- **Kanban 7 colonnes** avec les 10 deals de démo
- **Carte SPM Rémy** dans la colonne *Qualifié* avec :
  - Bandeau violet : « 🔄 Relancer suite proposition · En retard 12 j » (badge rouge)
  - Historique dépliable montrant l'envoi de proposition daté
- **Tableau pivot « Analyse parcours »** sous le Kanban + cards insight auto-détectés

---

## 4. Dépannage

| Symptôme | Cause probable | Fix |
|---|---|---|
| Page blanche, console : `supabaseUrl is required` | `.env.local` absent ou mal nommé | Vérifier le nom exact `.env.local` (pas `.env`) et redémarrer `npm run dev` |
| Redirection en boucle vers `/login` | Cookie de session non posé | Tester en navigation privée, vérifier que l'utilisateur existe dans Auth |
| Kanban vide alors que le seed est passé | RLS bloque parce que `owner_id IS NULL` et le user n'est pas admin | Ajouter `"role":"admin"` dans le user meta data, ou faire `update prospects set owner_id = '<UUID du user>'` |
| `relation "pipeline_stages" does not exist` | `pipeline.sql` pas appliqué | Relancer le fichier dans SQL Editor |
| Erreur permissions sur les vues | Les vues ont besoin de SELECT public ; ajouter `grant select on pipeline_funnel_stats, prospects_stand_by to authenticated;` |

---

## 5. Aller plus loin

Une fois la page qui tourne :
- Brancher un **bouton « + Nouveau deal »** réel (modal + insert dans `prospects`)
- Brancher un **drag-and-drop entre colonnes** (update `stage_id`)
- Brancher la **complétion de next-action** (set `done_at = now()`) — le trigger archive automatiquement dans le journal
- Connecter au CSV exporté du Google Sheets pour migrer l'historique existant
