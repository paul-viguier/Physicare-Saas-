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
| Cal.com    | URL de réservation pré-remplie pour la réu d'onboarding |
| Resend     | Email de bienvenue (liens espace + dashboard + Cal.com) |
| Slack      | Notification équipe Physicare via webhook |
| Vercel     | Provisioning du sous-domaine `<slug>.physicare.fr` |

Les variables d'environnement sont décrites dans `.env.example`. Le rapport
par connecteur s'affiche dans le back-office après la création.

## Mode "zéro touche" — webhook Stripe

`/api/stripe/webhook` reçoit `checkout.session.completed`, crée la ligne
client dans Supabase et lance l'orchestrateur. Aucune action manuelle requise.

**Configuration Stripe Checkout** — pousser ces métadonnées sur la session :

```js
metadata: {
  client_slug: 'optical-center-lyon',
  client_name: 'Optical Center Lyon',
  couleur: '#6D28D9',     // optionnel
  plan: 'pro',            // optionnel
  manager_email: 'xxx',   // optionnel, sinon customer_details.email
}
```

**Configuration Stripe Dashboard** : Developers → Webhooks → Add endpoint
`https://<domaine>/api/stripe/webhook`, écouter `checkout.session.completed`,
copier le signing secret dans `STRIPE_WEBHOOK_SECRET`.

Le webhook est idempotent (upsert sur `clients.slug`) — Stripe peut retry sans risque.

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
