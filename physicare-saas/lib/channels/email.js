// PHYSICARE® — Envoi email via Resend
// Mode mock si RESEND_API_KEY absent.

const FROM = process.env.RESEND_FROM || 'PHYSICARE® <prospection@physicare.fr>'

export async function sendEmail({ to, subject, body, replyTo }) {
  if (!to) throw new Error('to required')
  if (!process.env.RESEND_API_KEY) {
    return { id: `mock_${Date.now()}`, mock: true }
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject,
      text: body,
      reply_to: replyTo,
      headers: { 'List-Unsubscribe': '<mailto:dpo@physicare.fr>' },
    }),
  })
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`)
  return await r.json()
}
