# PHYSICARE® — Plateforme SaaS (Next.js)

Front-end de la plateforme Physicare, branché sur la base **Supabase `physicare-prod`**.
Architecture détaillée : voir [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Installation

```bash
npm install
npm run dev
```

Puis ouvrez http://localhost:3000

## Configuration

Créez `.env.local` à la racine :

```
NEXT_PUBLIC_SUPABASE_URL=https://qthhcykougfclamrzlfx.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=<clé publishable Supabase>
```

## Connexion & espaces

La connexion est unique (Supabase Auth, page `/login`). Après authentification,
l'utilisateur est redirigé vers son espace **selon son rôle** (`users.role`) :

| Rôle | Espace | URL |
|------|--------|-----|
| `employee` | Espace apprenant | `/app` |
| `manager` | Dashboard équipe | `/manager` |
| `org_admin` | Dashboard organisation | `/org` |
| `super_admin` | Back-office Physicare | `/admin` |

> L'accès aux données est protégé par le **Row Level Security (RLS)** de Supabase :
> il faut être connecté pour lire quoi que ce soit.

## État d'avancement

- ✅ **Phase 1** — Connexion au réel : auth Supabase, redirection par rôle,
  back-office listant les vraies organisations.
- ⏳ Phases suivantes (espace apprenant, dashboards, back-office complet) :
  voir la feuille de route dans `ARCHITECTURE.md` §7.

## Déploiement (Vercel)

1. Connecter ce repo à Vercel
2. Définir les variables d'environnement ci-dessus
3. Déploiement automatique à chaque push
