// ─── /api/onboard ───────────────────────────────
// Déclenche l'orchestrateur d'onboarding après création d'un client.
// Auth : mot de passe admin (ADMIN_PASSWORD env, fallback historique).

import { onboardNewClient } from '../../lib/connectors'

const FALLBACK_ADMIN_PASSWORD = 'physicare2026'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method not allowed' })
  }

  const expected = process.env.ADMIN_PASSWORD || FALLBACK_ADMIN_PASSWORD
  const provided = req.headers['x-admin-password']
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const { client, managerEmail, plan } = req.body || {}
  if (!client?.slug || !client?.nom) {
    return res.status(400).json({ error: 'client.slug and client.nom required' })
  }

  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const baseUrl = process.env.PHYSICARE_BASE_URL || `${proto}://${host}`

  try {
    const result = await onboardNewClient({ client, managerEmail, plan, baseUrl })
    return res.status(200).json(result)
  } catch (err) {
    return res.status(500).json({ error: err.message || 'onboarding failed' })
  }
}
