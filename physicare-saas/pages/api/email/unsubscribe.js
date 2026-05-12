// PHYSICARE® — Désinscription RGPD one-click
// GET /api/email/unsubscribe?lead=<id>&token=<sig>
// Effets: marque le lead unsubscribed_at + insert dans prospect_optouts (hash email)
import { adminClient, sha256 } from '../../../lib/serverSupabase'
import { signOptOut } from '../sequences/run'

export default async function handler(req, res) {
  const { lead, token } = req.query
  if (!lead || !token) return res.status(400).send('paramètres manquants')
  if (token !== signOptOut(lead)) return res.status(403).send('token invalide')

  const admin = adminClient()
  const { data: row, error } = await admin
    .from('prospect_leads').select('id, email_verified').eq('id', lead).single()
  if (error) return res.status(404).send('lead introuvable')

  await admin.from('prospect_leads')
    .update({ unsubscribed_at: new Date().toISOString(), status: 'DNC', lead_score: 0 })
    .eq('id', row.id)

  if (row.email_verified) {
    await admin.from('prospect_optouts').upsert({
      email_hash: sha256(row.email_verified),
      reason: 'one-click unsubscribe',
      source: 'EMAIL_LINK',
    }, { onConflict: 'email_hash' })
  }

  // Pause toutes les séquences actives de ce lead
  await admin.from('prospect_lead_sequences')
    .update({ status: 'STOPPED' })
    .eq('lead_id', row.id).eq('status', 'ACTIVE')

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  return res.status(200).send(`<!doctype html><meta charset="utf-8">
    <title>Désinscription confirmée — PHYSICARE®</title>
    <body style="font-family:system-ui;background:#F5F3FF;padding:40px;text-align:center">
      <div style="max-width:520px;margin:60px auto;background:#fff;padding:32px;border-radius:18px;border:1px solid #DDD6FE">
        <div style="font-size:48px">✅</div>
        <h1 style="color:#4C1D95;font-weight:900">Désinscription confirmée</h1>
        <p style="color:#374151">Vous ne recevrez plus aucun message de prospection PHYSICARE®.</p>
        <p style="color:#6B7280;font-size:13px">Pour toute question : <a href="mailto:dpo@physicare.fr" style="color:#7C3AED">dpo@physicare.fr</a></p>
      </div>
    </body>`)
}
