// ─── Slack ──────────────────────────────────────
// Notifie l'équipe Physicare via webhook entrant.

export async function notifySlack({ client, managerEmail, baseUrl, plan, bookingUrl }) {
  const url = process.env.SLACK_WEBHOOK_URL
  if (!url) return { ok: false, skipped: true, reason: 'SLACK_WEBHOOK_URL missing' }

  const lines = [
    `*Nouveau client signé* — ${client.nom}`,
    `Slug : \`${client.slug}\``,
    `Espace : ${baseUrl}/${client.slug}`,
    `Dashboard : ${baseUrl}/${client.slug}/dashboard`,
  ]
  if (managerEmail) lines.push(`Manager : ${managerEmail}`)
  if (plan) lines.push(`Plan : ${plan}`)
  if (bookingUrl) lines.push(`Cal.com : ${bookingUrl}`)

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: lines.join('\n') }),
  })
  if (!res.ok) return { ok: false, error: `slack webhook ${res.status}` }
  return { ok: true }
}
