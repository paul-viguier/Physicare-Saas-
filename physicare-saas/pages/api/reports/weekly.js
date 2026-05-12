// PHYSICARE® — Rapport hebdomadaire (lundi 08h00 UTC)
// GET /api/reports/weekly  (Vercel cron, protégé par CRON_SECRET)
// Pour chaque utilisateur ayant une intégration RESEND active, envoie un résumé
// des 7 derniers jours : nouveaux leads, contacts, réponses, RDV, deals.
import { adminClient } from '../../../lib/serverSupabase'
import { sendEmail } from '../../../lib/channels/email'

export default async function handler(req, res) {
  if (process.env.CRON_SECRET) {
    const provided = req.headers['authorization']?.replace(/^Bearer\s+/i, '') || req.query.secret
    if (provided !== process.env.CRON_SECRET) return res.status(401).json({ error: 'unauthorized' })
  }
  const admin = adminClient()
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()

  const { data: users } = await admin
    .from('prospect_user_integrations').select('user_id, meta')
    .eq('provider', 'RESEND').eq('status', 'CONNECTED')
  const out = []
  for (const u of users || []) {
    const email = u.meta?.notify_email
    if (!email) continue

    const [leads, msgs, deals] = await Promise.all([
      admin.from('prospect_leads').select('status, lead_score, created_at')
        .eq('owner_id', u.user_id).gte('created_at', since),
      admin.from('prospect_messages').select('status, replied_at, sent_at, lead_id')
        .gte('created_at', since),
      admin.from('prospect_deals').select('stage, amount_eur, probability').gte('created_at', since),
    ])

    const stats = {
      new_leads:    leads.data?.length || 0,
      hot:          (leads.data || []).filter(l => (l.lead_score ?? 0) >= 80).length,
      sent:         (msgs.data || []).filter(m => m.status === 'SENT').length,
      replied:      (msgs.data || []).filter(m => m.replied_at).length,
      new_deals:    deals.data?.length || 0,
      forecast_eur: (deals.data || []).reduce((s, d) => s + Math.round((d.amount_eur || 0) * (d.probability || 0) / 100), 0),
    }
    const reply_rate = stats.sent ? ((stats.replied / stats.sent) * 100).toFixed(1) : '0.0'

    const body =
`Bonjour 👋

Voici votre rapport PHYSICARE® des 7 derniers jours :

• Nouveaux leads : ${stats.new_leads} (dont ${stats.hot} 🔥)
• Messages envoyés : ${stats.sent}
• Réponses : ${stats.replied} (${reply_rate} %)
• Nouveaux deals : ${stats.new_deals}
• Forecast pondéré : ${stats.forecast_eur.toLocaleString('fr-FR')} €

Pipeline complet : ${process.env.NEXT_PUBLIC_BASE_URL}/linkedin-prospection

— PHYSICARE®`

    try {
      await sendEmail({ to: email, subject: `📊 Votre semaine PHYSICARE® : ${stats.new_leads} leads, ${stats.replied} réponses`, body })
      out.push({ user_id: u.user_id, sent: true, stats })
    } catch (e) {
      out.push({ user_id: u.user_id, error: e.message })
    }
  }
  return res.status(200).json({ recipients: out.length, results: out })
}
