// PHYSICARE® — Démarre le flow d'auth Unipile (Hosted Auth Link)
// POST /api/integrations/unipile/connect → renvoie { url } pour redirection
// Doc Unipile: POST {DSN}/api/v1/hosted/accounts/link
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers['authorization']?.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'token requis' })
  const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false },
  })
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return res.status(401).json({ error: 'invalid token' })

  if (!process.env.UNIPILE_API_KEY || !process.env.UNIPILE_DSN) {
    return res.status(503).json({ error: 'Unipile non configuré (UNIPILE_API_KEY/UNIPILE_DSN manquants)' })
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

  const body = {
    type: 'create',
    providers: ['LINKEDIN'],
    api_url: process.env.UNIPILE_DSN,
    expiresOn: expiresAt,
    name: user.id,                                  // sera renvoyé dans le webhook (corrélation user_id)
    notify_url: `${base}/api/integrations/unipile/callback`,
    success_redirect_url: `${base}/linkedin-prospection/settings?unipile=ok`,
    failure_redirect_url: `${base}/linkedin-prospection/settings?unipile=ko`,
  }

  const r = await fetch(`${process.env.UNIPILE_DSN}/api/v1/hosted/accounts/link`, {
    method: 'POST',
    headers: { 'X-API-KEY': process.env.UNIPILE_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) return res.status(502).json({ error: `Unipile ${r.status}: ${await r.text()}` })
  const json = await r.json()
  return res.status(200).json({ url: json.url || json.link })
}
