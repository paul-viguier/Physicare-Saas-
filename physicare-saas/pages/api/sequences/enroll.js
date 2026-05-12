// PHYSICARE® — Enrôler un ou plusieurs leads dans une séquence
// POST /api/sequences/enroll  { sequenceId, leadIds:[] }  (auth utilisateur via cookie Supabase)
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { sequenceId, leadIds } = req.body || {}
  if (!sequenceId || !Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: 'sequenceId + leadIds[] requis' })
  }
  const accessToken = req.headers['authorization']?.replace(/^Bearer\s+/i, '')
  if (!accessToken) return res.status(401).json({ error: 'token requis' })

  const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  })
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return res.status(401).json({ error: 'invalid token' })

  const rows = leadIds.map(id => ({
    lead_id: id,
    sequence_id: sequenceId,
    enrolled_by: user.id,
    next_run_at: new Date().toISOString(),
  }))
  const { data, error } = await supa
    .from('prospect_lead_sequences')
    .upsert(rows, { onConflict: 'lead_id,sequence_id' })
    .select()
  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ enrolled: data.length })
}
