// PHYSICARE® — Webhook Unipile (réponses LinkedIn, acceptations d'invitation)
// POST /api/webhooks/unipile  — HMAC SHA-256 sur le body brut.
import { adminClient } from '../../../lib/serverSupabase'
import { verifyHmacSha256 } from '../../../lib/crypto'

export const config = { api: { bodyParser: false } }

async function readRawBody(req) {
  const chunks = []
  for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c)
  return Buffer.concat(chunks).toString('utf8')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const raw = await readRawBody(req)

  if (process.env.UNIPILE_WEBHOOK_SECRET) {
    const sig = req.headers['x-unipile-signature'] || req.headers['x-signature']
    if (!verifyHmacSha256(process.env.UNIPILE_WEBHOOK_SECRET, raw, sig)) {
      return res.status(401).json({ error: 'invalid signature' })
    }
  }

  let ev
  try { ev = JSON.parse(raw) } catch { return res.status(400).json({ error: 'invalid json' }) }

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
    await admin.from('prospect_lead_sequences')
      .update({ status: 'PAUSED' }).eq('lead_id', lead.id).eq('status', 'ACTIVE')
  }
  return res.status(200).json({ ok: true })
}
