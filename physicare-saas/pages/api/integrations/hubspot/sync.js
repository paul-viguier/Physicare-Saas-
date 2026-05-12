// PHYSICARE® — Push d'un lead/deal vers HubSpot
// POST /api/integrations/hubspot/sync  { leadId, includeDeal?:true }
import { createClient } from '@supabase/supabase-js'
import { adminClient } from '../../../../lib/serverSupabase'
import { upsertHubspotContact, upsertHubspotDeal } from '../../../../lib/integrations/hubspot'
import { audit } from '../../../../lib/audit'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { leadId, includeDeal = true } = req.body || {}
  if (!leadId) return res.status(400).json({ error: 'leadId required' })

  const token = req.headers['authorization']?.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'token requis' })
  const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false },
  })
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return res.status(401).json({ error: 'invalid token' })

  const admin = adminClient()
  const { data: integ } = await admin.from('prospect_user_integrations')
    .select('access_token').eq('user_id', user.id).eq('provider', 'HUBSPOT').maybeSingle()
  if (!integ?.access_token) return res.status(400).json({ error: 'HubSpot non connecté' })

  const { data: lead, error } = await admin.from('prospect_leads')
    .select('*, company:prospect_companies(*), deals:prospect_deals(*)').eq('id', leadId).single()
  if (error) return res.status(404).json({ error: error.message })

  try {
    const contact = await upsertHubspotContact({ token: integ.access_token, lead, company: lead.company })
    let deal = null
    if (includeDeal && lead.deals?.[0]) {
      deal = await upsertHubspotDeal({ token: integ.access_token, deal: { ...lead.deals[0], lead }, contactId: contact?.id })
    }
    await audit({ userId: user.id, action: 'EXPORT', resourceType: 'lead', resourceId: leadId,
                  metadata: { provider: 'HUBSPOT', contact_id: contact?.id, deal_id: deal?.id }, req })
    return res.status(200).json({ contact_id: contact?.id, deal_id: deal?.id })
  } catch (e) {
    return res.status(502).json({ error: e.message })
  }
}
