// ─── Resend ─────────────────────────────────────
// Envoie l'email de bienvenue au manager du nouveau client.

export async function sendWelcomeEmail({ client, managerEmail, baseUrl }) {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, skipped: true, reason: 'RESEND_API_KEY missing' }
  if (!managerEmail) return { ok: false, skipped: true, reason: 'manager email missing' }

  const from = process.env.RESEND_FROM || 'Physicare <onboarding@physicare.fr>'
  const collaborateurUrl = `${baseUrl}/${client.slug}`
  const dashboardUrl = `${baseUrl}/${client.slug}/dashboard`

  const html = `
    <div style="font-family:Nunito,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <h1 style="color:#6D28D9;margin:0 0 8px">Bienvenue sur Physicare<sup>®</sup></h1>
      <p style="color:#374151;font-size:15px">Bonjour,</p>
      <p style="color:#374151;font-size:15px">
        L'espace <strong>${client.nom}</strong> est prêt. Vos collaborateurs peuvent
        désormais répondre au questionnaire et vous pouvez consulter le dashboard
        manager en temps réel.
      </p>
      <div style="background:#F5F3FF;border-radius:12px;padding:16px;margin:16px 0">
        <div style="font-size:13px;color:#6B7280;margin-bottom:4px">Espace collaborateurs</div>
        <a href="${collaborateurUrl}" style="color:#6D28D9;font-weight:700">${collaborateurUrl}</a>
        <div style="font-size:13px;color:#6B7280;margin:12px 0 4px">Dashboard manager</div>
        <a href="${dashboardUrl}" style="color:#6D28D9;font-weight:700">${dashboardUrl}</a>
      </div>
      <p style="color:#6B7280;font-size:13px">
        Vous recevrez un lien magique séparé pour activer votre compte manager.
      </p>
    </div>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [managerEmail],
      subject: `Votre espace Physicare ${client.nom} est prêt`,
      html,
    }),
  })
  const body = await res.json()
  if (!res.ok) return { ok: false, error: body.message || 'resend error' }
  return { ok: true, data: { id: body.id, to: managerEmail } }
}
