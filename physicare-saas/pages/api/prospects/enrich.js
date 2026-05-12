// PHYSICARE® — Enrichissement email via Dropcontact (RGPD-friendly, FR)
// POST /api/prospects/enrich  { leadId }
// 1) lit le lead + sa company via service role
// 2) appelle Dropcontact
// 3) met à jour email_verified + email_status, puis recompute le LSP
import { createClient } from '@supabase/supabase-js'
import { computeLeadScore } from '../../../lib/leadScoring'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { leadId } = req.body || {}
  if (!leadId) return res.status(400).json({ error: 'leadId required' })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase service role not configured' })

  const admin = createClient(url, serviceKey)

  const { data: lead, error: e1 } = await admin
    .from('prospect_leads')
    .select('*, company:prospect_companies(*), signals:prospect_intent_signals(signal_type)')
    .eq('id', leadId)
    .single()
  if (e1) return res.status(404).json({ error: e1.message })

  let email = null
  let status = 'PENDING'

  if (process.env.DROPCONTACT_API_KEY) {
    try {
      const enriched = await callDropcontact({
        first_name: lead.first_name,
        last_name: lead.last_name,
        company: lead.company?.name,
        website: lead.company?.website,
      })
      email = enriched.email || null
      status = enriched.status || (email ? 'VERIFIED' : 'INVALID')
    } catch (e) {
      return res.status(502).json({ error: `Dropcontact: ${e.message}` })
    }
  } else {
    // Mode mock dev — devine pour ne pas bloquer
    if (lead.first_name && lead.last_name && lead.company?.website) {
      const host = lead.company.website.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
      email = `${lead.first_name}.${lead.last_name}@${host}`.toLowerCase().replace(/\s+/g, '')
      status = 'PENDING'
    } else {
      status = 'INVALID'
    }
  }

  const updated = { ...lead, email_verified: email, email_status: status }
  const { score } = computeLeadScore(updated, lead.company || {}, lead.signals || [])

  const { error: e2 } = await admin
    .from('prospect_leads')
    .update({ email_verified: email, email_status: status, lead_score: score, enriched_at: new Date().toISOString() })
    .eq('id', leadId)
  if (e2) return res.status(500).json({ error: e2.message })

  return res.status(200).json({ email, status, score })
}

async function callDropcontact({ first_name, last_name, company, website }) {
  // Étape 1: soumettre la requête (async chez Dropcontact)
  const submit = await fetch('https://api.dropcontact.io/v1/enrich/all', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Access-Token': process.env.DROPCONTACT_API_KEY,
    },
    body: JSON.stringify({
      data: [{ first_name, last_name, company, website }],
      siren: true,
      language: 'fr',
    }),
  })
  if (!submit.ok) throw new Error(`submit ${submit.status}`)
  const { request_id } = await submit.json()
  if (!request_id) throw new Error('no request_id')

  // Étape 2: poll (max ~30s)
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const poll = await fetch(`https://api.dropcontact.io/v1/enrich/all/${request_id}`, {
      headers: { 'X-Access-Token': process.env.DROPCONTACT_API_KEY },
    })
    if (!poll.ok) continue
    const json = await poll.json()
    if (json.success && Array.isArray(json.data)) {
      const row = json.data[0] || {}
      const emailObj = (row.email && row.email[0]) || null
      return {
        email: emailObj?.email || null,
        status: emailObj?.qualification === 'correct' ? 'VERIFIED'
              : emailObj?.qualification === 'risky' ? 'CATCH_ALL'
              : emailObj ? 'PENDING' : 'INVALID',
      }
    }
  }
  throw new Error('polling timeout')
}
