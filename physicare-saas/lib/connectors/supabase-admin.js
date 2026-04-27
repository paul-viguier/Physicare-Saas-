// ─── Supabase admin ─────────────────────────────
// Provisionne les ressources Supabase d'un nouveau client :
//  - invitation magic-link au manager (auth.admin.inviteUserByEmail)
//  - ligne par défaut dans `client_settings` (si la table existe)
// Skip silencieusement si SUPABASE_SERVICE_ROLE_KEY absent.

import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

export async function provisionSupabase({ client, managerEmail, baseUrl }) {
  const admin = getAdminClient()
  if (!admin) return { ok: false, skipped: true, reason: 'SUPABASE_SERVICE_ROLE_KEY missing' }

  const out = { invite: null, settings: null }

  if (managerEmail) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(managerEmail, {
      redirectTo: `${baseUrl}/${client.slug}/dashboard`,
      data: { client_slug: client.slug, role: 'manager' },
    })
    out.invite = error ? { ok: false, error: error.message } : { ok: true, userId: data?.user?.id }
  } else {
    out.invite = { ok: false, skipped: true, reason: 'manager email missing' }
  }

  const { error: settingsErr } = await admin
    .from('client_settings')
    .insert({ client_slug: client.slug, manager_email: managerEmail || null })
  // Table absente ou contrainte ? on signale sans bloquer.
  out.settings = settingsErr
    ? { ok: false, skipped: true, reason: settingsErr.message }
    : { ok: true }

  return { ok: true, data: out }
}
