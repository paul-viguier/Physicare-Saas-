// PHYSICARE® — Helpers audit RGPD (article 30)
// Tous les écrits sensibles passent par ici depuis les API serveur.

import { adminClient } from './serverSupabase'

export async function audit({ userId, action, resourceType = null, resourceId = null, metadata = {}, req = null }) {
  const admin = adminClient()
  const ip = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.socket?.remoteAddress || null
  const ua = req?.headers?.['user-agent'] || null
  await admin.from('prospect_audit_log').insert({
    user_id: userId || null,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    metadata,
    ip_address: ip,
    user_agent: ua,
  })
}
