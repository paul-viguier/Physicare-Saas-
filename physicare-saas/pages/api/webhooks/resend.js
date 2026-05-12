// PHYSICARE® — Webhook Resend (open / click / bounce / complained)
// POST /api/webhooks/resend  — vérifie la signature Svix.
import { adminClient, sha256 } from '../../../lib/serverSupabase'
import { verifySvix } from '../../../lib/crypto'

export const config = { api: { bodyParser: false } }

async function readRawBody(req) {
  const chunks = []
  for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c)
  return Buffer.concat(chunks).toString('utf8')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const raw = await readRawBody(req)

  if (process.env.RESEND_WEBHOOK_SECRET) {
    const ok = verifySvix({
      secret: process.env.RESEND_WEBHOOK_SECRET,
      id: req.headers['svix-id'],
      timestamp: req.headers['svix-timestamp'],
      body: raw,
      signatureHeader: req.headers['svix-signature'],
    })
    if (!ok) return res.status(401).json({ error: 'invalid signature' })
  }

  let body
  try { body = JSON.parse(raw) } catch { return res.status(400).json({ error: 'invalid json' }) }

  const externalId = body.data?.email_id || body.data?.id
  const type = body.type
  if (!externalId || !type) return res.status(200).json({ ignored: true })

  const admin = adminClient()
  const patch = {}
  if (type === 'email.opened')    patch.opened_at = new Date().toISOString()
  if (type === 'email.delivered') patch.status = 'DELIVERED'
  if (type === 'email.bounced')   patch.status = 'BOUNCED'
  if (type === 'email.complained') {
    patch.status = 'BOUNCED'
    const email = body.data?.to?.[0] || body.data?.email
    if (email) {
      await admin.from('prospect_optouts').upsert({
        email_hash: sha256(email), reason: 'spam complaint', source: 'WEBHOOK',
      }, { onConflict: 'email_hash' })
    }
  }
  if (Object.keys(patch).length) {
    await admin.from('prospect_messages').update(patch).eq('external_message_id', externalId)
  }
  return res.status(200).json({ ok: true })
}
