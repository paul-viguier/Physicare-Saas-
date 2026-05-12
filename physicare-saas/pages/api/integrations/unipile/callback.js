// PHYSICARE® — Callback Unipile : reçoit l'account_id du compte LinkedIn connecté
// POST /api/integrations/unipile/callback
// Body Unipile: { account_id, name (user.id), status: 'OK'|'ERROR' }
// Vérifie HMAC + stocke chiffré via saveIntegration.
import { saveIntegration } from '../../../../lib/integrations/store'
import { verifyHmacSha256 } from '../../../../lib/crypto'
import { audit } from '../../../../lib/audit'

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

  let body
  try { body = JSON.parse(raw) } catch { return res.status(400).json({ error: 'invalid json' }) }

  const accountId = body.account_id || body.id
  const userId = body.name  // on a passé user.id dans /connect
  const status = body.status === 'OK' || body.status === 'CREATED' ? 'CONNECTED' : 'REVOKED'

  if (!accountId || !userId) return res.status(400).json({ error: 'champs manquants' })

  // Unipile gère lui-même le token côté serveur ; on stocke l'API key comme access_token
  // pour pouvoir l'utiliser dans les appels (chiffré).
  await saveIntegration({
    userId, provider: 'UNIPILE',
    accountId, accessToken: process.env.UNIPILE_API_KEY || null,
    meta: { connected_at: new Date().toISOString() }, status,
  })
  await audit({ userId, action: 'INTEGRATION_CONNECT', metadata: { provider: 'UNIPILE', account_id: accountId }, req })

  return res.status(200).json({ ok: true })
}
