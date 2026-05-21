// PHYSICARE® — Trace l'acquittement RGPD de l'utilisateur dans l'audit log.
import { createClient } from '@supabase/supabase-js'
import { audit } from '../../../lib/audit'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const token = req.headers['authorization']?.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'token requis' })

  const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false },
  })
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return res.status(401).json({ error: 'invalid token' })

  await audit({ userId: user.id, action: 'CONSENT_ACK', metadata: req.body || {}, req })
  return res.status(200).json({ ok: true })
}
