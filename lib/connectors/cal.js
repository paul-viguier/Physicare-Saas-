// ─── Cal.com ────────────────────────────────────
// Génère une URL de réservation pré-remplie pour la réu d'onboarding.
// Skip si CAL_USERNAME ou CAL_EVENT_SLUG absent.

export function buildBookingUrl({ client, managerEmail }) {
  const user = process.env.CAL_USERNAME
  const event = process.env.CAL_EVENT_SLUG
  if (!user || !event) return null

  const base = process.env.CAL_BASE_URL || 'https://cal.com'
  const url = new URL(`${base}/${user}/${event}`)
  url.searchParams.set('name', client.nom)
  if (managerEmail) url.searchParams.set('email', managerEmail)
  url.searchParams.set('metadata[client_slug]', client.slug)
  return url.toString()
}

export async function provisionCalBooking({ client, managerEmail, bookingUrl }) {
  const url = bookingUrl || buildBookingUrl({ client, managerEmail })
  if (!url) return { ok: false, skipped: true, reason: 'CAL_USERNAME/CAL_EVENT_SLUG missing' }

  // Si on a une clé API, on peut valider l'event-type côté Cal.
  const apiKey = process.env.CAL_API_KEY
  if (apiKey) {
    try {
      const res = await fetch(`https://api.cal.com/v1/event-types?apiKey=${apiKey}`)
      if (!res.ok) return { ok: true, data: { url }, note: `cal api check ${res.status}` }
    } catch (err) {
      return { ok: true, data: { url }, note: 'cal api check failed' }
    }
  }
  return { ok: true, data: { url } }
}
