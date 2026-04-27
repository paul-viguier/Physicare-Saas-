# PHYSICARE® — SaaS Next.js

## Installation (5 minutes)

```bash
npm install
npm run dev
```

Puis ouvrez http://localhost:3000

## Configuration

Copiez `.env.example` en `.env.local` puis remplissez les clés. Seules celles
de Supabase sont obligatoires ; chaque autre connecteur est activé dès que sa
clé est présente, sinon il est ignoré (skip) sans bloquer la création.

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=sb_publishable_xxxxx
```

## Onboarding automatique (un nouveau client signé)

Quand un client est créé dans `/admin`, l'API `/api/onboard` lance en parallèle
les connecteurs configurés :

| Connecteur | Action |
|------------|--------|
| Supabase   | Invitation magic-link au manager + ligne `client_settings` |
| Stripe     | Création customer + abonnement (essai `STRIPE_TRIAL_DAYS`) |
| Resend     | Email de bienvenue avec liens espace + dashboard |
| Slack      | Notification équipe Physicare via webhook |
| Vercel     | Provisioning du sous-domaine `<slug>.physicare.fr` |

Les variables d'environnement sont décrites dans `.env.example`. Le rapport
par connecteur s'affiche dans le back-office après la création.

## URLs

| URL | Description |
|-----|-------------|
| /admin | Back-office Physicare (tous vos clients) |
| /optical-center | Espace collaborateur Optical Center |
| /optical-center/dashboard | Dashboard manager Optical Center |
| /krys | Espace collaborateur Krys (si créé dans admin) |

## Déploiement sur Vercel (gratuit)

1. Poussez ce dossier sur GitHub
2. Connectez GitHub à vercel.com
3. Vercel déploie automatiquement

Mot de passe back-office : physicare2026
