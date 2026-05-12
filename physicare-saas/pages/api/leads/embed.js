// PHYSICARE® — Calcule et persiste l'embedding d'un lead (ou batch)
// POST /api/leads/embed  { leadId? }       → embed un seul lead
// POST /api/leads/embed  { batch: true }    → embed les leads sans embedding (max 50)
import { adminClient } from '../../../lib/serverSupabase'
import { embed, leadToText, toPgvector } from '../../../lib/embeddings'

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const admin = adminClient()
  const { leadId, batch } = req.method === 'POST' ? (req.body || {}) : req.query

  let leads = []
  if (leadId) {
    const { data, error } = await admin.from('prospect_leads')
      .select('*, company:prospect_companies(*)').eq('id', leadId).single()
    if (error) return res.status(404).json({ error: error.message })
    leads = [data]
  } else if (batch) {
    const { data, error } = await admin.from('prospect_leads')
      .select('*, company:prospect_companies(*)')
      .is('embedding', null).limit(50)
    if (error) return res.status(500).json({ error: error.message })
    leads = data || []
  } else {
    return res.status(400).json({ error: 'leadId ou batch:true requis' })
  }

  let done = 0
  for (const l of leads) {
    const v = await embed(leadToText(l, l.company))
    const { error } = await admin.from('prospect_leads')
      .update({ embedding: toPgvector(v) }).eq('id', l.id)
    if (!error) done++
  }
  return res.status(200).json({ embedded: done, total: leads.length })
}
