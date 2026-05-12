// PHYSICARE® — Webhook Unipile (réponses LinkedIn, acceptations d'invitation)
// POST /api/webhooks/unipile
import { adminClient } from '../../../lib/serverSupabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const ev = req.body || {}
  const admin = adminClient()

  if (ev.event === 'message_received' || ev.type === 'message_received') {
    const profileUrl = ev.attendee?.public_url || ev.profile_url
    if (!profileUrl) return res.status(200).json({ ignored: true })
    const { data: lead } = await admin.from('prospect_leads')
      .select('id').eq('linkedin_profile_url', profileUrl).maybeSingle()
    if (!lead) return res.status(200).json({ unknown_lead: true })

    await admin.from('prospect_messages').insert({
      lead_id: lead.id, channel: 'LINKEDIN_MESSAGE', body: ev.text || '', status: 'REPLIED',
      replied_at: new Date().toISOString(),
    })
    await admin.from('prospect_leads').update({ status: 'REPLIED' }).eq('id', lead.id)
    // Pause les séquences actives quand le lead répond
    await admin.from('prospect_lead_sequences')
      .update({ status: 'PAUSED' }).eq('lead_id', lead.id).eq('status', 'ACTIVE')
  }
  return res.status(200).json({ ok: true })
}
