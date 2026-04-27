// ─── Orchestrateur d'onboarding ─────────────────
// Lance tous les connecteurs en parallèle quand un nouveau client
// est créé dans le back-office. Renvoie un rapport par connecteur.

import { provisionStripe } from './stripe'
import { sendWelcomeEmail } from './resend'
import { notifySlack } from './slack'
import { provisionVercelDomain } from './vercel'
import { provisionSupabase } from './supabase-admin'

const CONNECTORS = {
  supabase: provisionSupabase,
  stripe: provisionStripe,
  resend: sendWelcomeEmail,
  slack: notifySlack,
  vercel: provisionVercelDomain,
}

export async function onboardNewClient(payload) {
  const entries = Object.entries(CONNECTORS)
  const results = await Promise.all(
    entries.map(async ([name, fn]) => {
      try {
        const r = await fn(payload)
        return [name, r]
      } catch (err) {
        return [name, { ok: false, error: err.message || String(err) }]
      }
    }),
  )
  const report = Object.fromEntries(results)
  const summary = {
    ok: results.filter(([, r]) => r.ok).map(([n]) => n),
    skipped: results.filter(([, r]) => r.skipped).map(([n]) => n),
    failed: results.filter(([, r]) => !r.ok && !r.skipped).map(([n]) => n),
  }
  return { summary, report }
}
