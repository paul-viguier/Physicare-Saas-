# PHYSICARE® — SaaS Next.js

## Installation (5 minutes)

```bash
npm install
npm run dev
```

Puis ouvrez http://localhost:3000

## Configuration

Créez `.env.local` avec vos clés Supabase :

```
NEXT_PUBLIC_SUPABASE_URL=https://qthhcykougfclamrzlfx.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=sb_publishable_98gNEoUgNYCR7l6LTSvaMw_mGq1ntDr
```

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
