// PHYSICARE® — Personnalisation IA d'un message pour un lead
// POST /api/ai/personalize  { leadId, channel, intent? }
import { adminClient } from '../../../lib/serverSupabase'
import { generatePersonalizedMessage } from '../../../lib/ai'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { leadId, channel = 'EMAIL', intent } = req.body || {}
  if (!leadId) return res.status(400).json({ error: 'leadId required' })

  const admin = adminClient()
  const { data: lead, error } = await admin
    .from('prospect_leads')
    .select('*, company:prospect_companies(*), signals:prospect_intent_signals(signal_type, signal_data)')
    .eq('id', leadId).single()
  if (error) return res.status(404).json({ error: error.message })

  try {
    const body = await generatePersonalizedMessage({
      lead, company: lead.company || {}, signals: lead.signals || [], channel, intent,
    })
    await admin.from('prospect_leads')
      .update({ ai_personalized_body: body, ai_personalized_at: new Date().toISOString() })
      .eq('id', leadId)
    return res.status(200).json({ body })
  } catch (e) {
    return res.status(502).json({ error: e.message })
  }
}
