// PHYSICARE® — Sauvegarde chiffrée d'une intégration (côté serveur).
// POST /api/integrations/save  { provider, accountId, accessToken, meta? }
import { createClient } from '@supabase/supabase-js'
import { saveIntegration } from '../../../lib/integrations/store'

const ALLOWED = ['UNIPILE','RESEND','POSTMARK','HUBSPOT','SALESFORCE','PHYSICARE_SAAS']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { provider, accountId, accessToken, meta } = req.body || {}
  if (!ALLOWED.includes(provider)) return res.status(400).json({ error: 'provider invalide' })

  const token = req.headers['authorization']?.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'token requis' })
  const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false },
  })
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return res.status(401).json({ error: 'invalid token' })

  try {
    await saveIntegration({ userId: user.id, provider, accountId, accessToken, meta })
    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
