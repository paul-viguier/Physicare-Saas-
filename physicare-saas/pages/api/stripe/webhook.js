// ─── /api/stripe/webhook ────────────────────────
// Mode "zéro touche" : reçoit checkout.session.completed depuis Stripe,
// crée la ligne client dans Supabase et lance l'orchestrateur d'onboarding.
//
// Stripe Checkout doit pousser ces métadonnées sur la session :
//   metadata[client_slug], metadata[client_name],
//   metadata[couleur] (optionnel), metadata[plan] (optionnel)

import crypto from 'crypto'
import { onboardNewClient } from '../../../lib/connectors'
import { getAdminClient } from '../../../lib/connectors/supabase-admin'

export const config = { api: { bodyParser: false } }

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

function verifyStripeSignature(rawBody, sigHeader, secret, tolerance = 300) {
  if (!sigHeader || !secret) return false
  const parts = sigHeader.split(',').map(p => p.trim())
  const t = parts.find(p => p.startsWith('t='))?.slice(2)
  const v1s = parts.filter(p => p.startsWith('v1=')).map(p => p.slice(3))
  if (!t || v1s.length === 0) return false
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(t)) > tolerance) return false
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex')
  const expectedBuf = Buffer.from(expected)
  return v1s.some(v => {
    const vBuf = Buffer.from(v)
    return vBuf.length === expectedBuf.length && crypto.timingSafeEqual(vBuf, expectedBuf)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method not allowed' })
  }

  const rawBody = await readRawBody(req)
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const sig = req.headers['stripe-signature']
  if (!verifyStripeSignature(rawBody, sig, secret)) {
    return res.status(400).json({ error: 'invalid signature' })
  }

  let event
  try { event = JSON.parse(rawBody) } catch { return res.status(400).json({ error: 'bad json' }) }

  // On ne traite que la fin de checkout pour l'onboarding.
  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ received: true, ignored: event.type })
  }

  const session = event.data?.object || {}
  const meta = session.metadata || {}
  const slug = meta.client_slug
  const nom = meta.client_name
  if (!slug || !nom) {
    return res.status(400).json({ error: 'session.metadata.client_slug/client_name required' })
  }

  const admin = getAdminClient()
  if (!admin) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY missing' })

  // Upsert idempotent (Stripe peut renvoyer le webhook).
  const couleur = meta.couleur || '#6D28D9'
  const { data: client, error: upsertErr } = await admin
    .from('clients')
    .upsert({ nom, slug, couleur, actif: true }, { onConflict: 'slug' })
    .select()
    .single()
  if (upsertErr) return res.status(500).json({ error: upsertErr.message })

  const proto = req.headers['x-forwarded-proto'] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const baseUrl = process.env.PHYSICARE_BASE_URL || `${proto}://${host}`

  const result = await onboardNewClient({
    client,
    managerEmail: session.customer_details?.email || meta.manager_email || null,
    plan: meta.plan || null,
    baseUrl,
    existingCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
    existingSubscriptionId: typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id,
  })

  return res.status(200).json({ received: true, ...result })
}
