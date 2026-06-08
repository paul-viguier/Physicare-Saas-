# 🏛️ Architecture Physicare — Document de référence

> Objectif : une architecture **multi-produits**, **multi-clients**, qui dure
> dans le temps et qu'on peut faire évoluer sans tout casser.
>
> Décisions fondatrices (validées) :
> 1. **Plusieurs produits** Physicare (santé comportementale aujourd'hui, d'autres à venir)
> 2. **Un seul accès par client** → il se connecte une fois et voit tous ses produits
> 3. **Site vitrine physicare.fr séparé** → projet indépendant, on n'y touche pas ici

---

## 1. Vue d'ensemble : 3 mondes indépendants

```
┌─────────────────────┐   ┌──────────────────────────┐   ┌────────────────────┐
│   SITE VITRINE      │   │   PLATEFORME SAAS        │   │   DONNÉES          │
│   physicare.fr      │   │   app.physicare.fr       │   │   Supabase         │
│                     │   │                          │   │                    │
│ • Marketing         │   │ • Le produit            │   │ • Base de données  │
│ • Blog / contact    │──▶│ • Multi-produits         │──▶│ • Auth             │
│ • 100% séparé       │   │ • Multi-clients          │   │ • Sécurité (RLS)   │
│                     │   │ • Ce repo                │   │                    │
└─────────────────────┘   └──────────────────────────┘   └────────────────────┘
   Repo séparé              CE REPO (physicare-saas)        Service géré
   Évolue seul              Le cœur du produit              Source de vérité
```

**Règle d'or :** ces trois mondes n'ont **aucune dépendance technique** entre eux.
Le site vitrine peut être refait, la base peut migrer, sans casser la plateforme.
Le seul lien : le site vitrine contient des liens vers `app.physicare.fr`.

---

## 2. Les 3 concepts qui rendent tout évolutif

Tout repose sur 4 notions simples. Bien les séparer = pouvoir grandir sans douleur.

| Concept | C'est quoi | Exemple |
|---------|-----------|---------|
| **Client** (tenant) | Une entreprise cliente | Optical Center, Krys, Acuitis |
| **Produit** | Un service Physicare | Santé comportementale, Ergonomie… |
| **Abonnement** | Quel client a quel produit | Optical Center → Santé comportementale + Ergonomie |
| **Utilisateur** | Une personne avec un rôle | un collaborateur, un manager, toi (admin) |

👉 **L'abonnement est la clé du « un seul accès → tous ses produits ».**
Quand un client se connecte, on regarde ses abonnements et on lui affiche
uniquement les produits auxquels il a droit. Ajouter un produit à un client =
une ligne en base, zéro développement.

---

## 3. Les 3 espaces et leur relation (le « dashboard relié au dashboard »)

C'est **une seule chaîne de données, vue à 3 niveaux de zoom** :

```
   COLLABORATEUR              MANAGER (client)            PHYSICARE (toi)
   produit la donnée   ───▶   agrège son équipe   ───▶   agrège TOUS les clients
   /:client/:produit          /:client/dashboard          /admin

   ex: fait le diagnostic     ex: voit l'ISC moyen        ex: voit tous les
       santé comportementale      de ses 40 salariés          clients & produits
```

- **Espace collaborateur** `/:client/:produit` → la personne *utilise* le produit (formation, diagnostic). **Elle crée la donnée.**
- **Dashboard manager** `/:client/dashboard` → le manager du client *lit* la donnée de ses équipes (par produit).
- **Back-office Physicare** `/admin` → tu vois **tout** : tous les clients, tous les produits, agrégé.

Les dashboards ne sont pas des bases séparées : ils lisent **la même source**,
filtrée par périmètre et par permissions. C'est ça, la « relation » entre eux.

---

## 4. Structure des URLs (avec accès unique)

```
app.physicare.fr/login                      → connexion unique (tous rôles)

  selon le rôle, après connexion :
  ├─ collaborateur  → /:client                    accueil : choix du produit
  │                   /:client/:produit            l'espace du produit
  ├─ manager        → /:client/dashboard           vue d'ensemble (tous ses produits)
  │                   /:client/dashboard/:produit  détail d'un produit
  └─ admin Physicare→ /admin                       back-office global
                      /admin/:client               zoom sur un client
```

Exemple concret :
- `app.physicare.fr/optical-center` → Optical Center voit ses produits
- `app.physicare.fr/optical-center/sante-comportementale` → l'espace du produit
- `app.physicare.fr/optical-center/dashboard` → le manager voit tout
- `app.physicare.fr/admin` → toi, tu vois tous les clients

👉 Ajouter un produit n'ajoute **jamais** une nouvelle URL racine : c'est toujours
un `:produit` sous le client. L'architecture ne grossit pas en largeur.

---

## 5. Organisation du code (un repo, des produits en modules)

> **Décision clé : UNE plateforme, chaque produit est un module autonome.**
> PAS une application séparée par produit (= cauchemar de maintenance : 3 logins,
> 3 déploiements, 3 fois le même code d'auth…).

```
physicare-saas/
├── pages/  (ou app/)            ROUTAGE uniquement, le plus fin possible
│   ├── login.js
│   ├── admin/                   back-office (tous clients / tous produits)
│   └── [client]/
│       ├── index.js             accueil collaborateur (choix du produit)
│       ├── [product]/           espace collaborateur d'un produit
│       └── dashboard/
│           ├── index.js         dashboard manager (vue tous produits)
│           └── [product].js     dashboard manager d'UN produit
│
├── products/                    ⭐ LE CŒUR ÉVOLUTIF
│   ├── _registry.js             liste des produits → alimente menus & routes
│   ├── sante-comportementale/
│   │   ├── config.js            nom, couleur, icône, libellés
│   │   ├── collaborator.jsx     UI : utiliser le produit
│   │   ├── dashboard.jsx        UI : dashboard manager de ce produit
│   │   └── queries.js           accès Supabase propre à ce produit
│   └── (futur-produit)/         même structure → branché automatiquement
│
├── core/                        PARTAGÉ entre tous les produits
│   ├── auth/                    connexion, rôles, protection des pages
│   ├── tenant/                  résolution du client + ses abonnements
│   ├── layout/                  en-tête, navigation, sélecteur de produit
│   └── ui/                      composants communs (cartes, KPI, tableaux, export CSV)
│
├── lib/
│   ├── supabase.js              client Supabase
│   └── ...
└── ARCHITECTURE.md              ce document
```

**La magie = `products/_registry.js`.** Pour lancer un nouveau produit :
1. créer un dossier `products/mon-produit/` (config + 2 écrans + queries)
2. l'ajouter au registre
→ il apparaît **automatiquement** dans les menus, le choix de produit, le back-office.
Aucune autre partie du code à modifier.

---

## 6. Modèle de données (Supabase)

```sql
-- ── SOCLE (commun à tous les produits) ───────────────────────
clients          (id, slug, nom, couleur, actif, created_at)
products         (id, slug, nom, couleur, icon, actif)
client_products  (client_id, product_id, actif)      -- les abonnements
profiles         (id = auth.uid, client_id, role)    -- role: collaborator | manager | physicare_admin

-- ── PAR PRODUIT (une table par produit, isolée) ──────────────
diagnostics      (id, client_slug, product_slug, ...) -- santé comportementale
-- futur_produit_data (...)                            -- chaque produit = ses tables
```

**Sécurité — Row Level Security (RLS) :** à activer pour que chaque client ne
puisse lire QUE ses propres données, directement au niveau de la base. C'est la
garantie d'isolation pour un SaaS qui grandit (aujourd'hui l'isolation repose sur
le code applicatif, ce qui est plus fragile).

---

## 7. Déploiement

| Élément | Hébergement | Domaine |
|---------|-------------|---------|
| Plateforme SaaS | Vercel (ce repo) | `app.physicare.fr` |
| Site vitrine | Vercel/Webflow (repo séparé) | `physicare.fr` |
| Données / Auth | Supabase | — |

Variables d'environnement de la plateforme (jamais en dur dans le code) :
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_KEY=...
```

---

## 8. Chemin de migration (de l'existant vers cette cible, sans rien casser)

L'app actuelle marche déjà (back-office + espace + dashboard mono-produit).
On y va par étapes, chacune livrable et testable :

- [x] **Phase 0 — Réparer le build** *(fait)* : suppression des routes en conflit.
- [ ] **Phase 1 — Le socle multi-produits** : tables `products`, `client_products`,
      `profiles` + `products/_registry.js`. La santé comportementale continue de marcher.
- [ ] **Phase 2 — Modulariser** : déplacer le produit actuel dans `products/sante-comportementale/`.
- [ ] **Phase 3 — Accès unique + rôles + RLS** : un seul login, routage par rôle, sécurité base.
- [ ] **Phase 4 — Valider** : brancher un 2ᵉ produit (même minimal) pour prouver que le modèle tient.

Chaque phase est indépendante : on peut s'arrêter à tout moment avec un produit qui fonctionne.
