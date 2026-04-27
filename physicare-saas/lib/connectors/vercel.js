// ─── Vercel ─────────────────────────────────────
// Provisionne le sous-domaine client (ex: krys.physicare.fr)
// Skip si VERCEL_TOKEN ou VERCEL_PROJECT_ID absent.

export async function provisionVercelDomain({ client }) {
  const token = process.env.VERCEL_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  const rootDomain = process.env.PHYSICARE_ROOT_DOMAIN
  if (!token || !projectId || !rootDomain) {
    return { ok: false, skipped: true, reason: 'vercel env vars missing' }
  }

  const subdomain = `${client.slug}.${rootDomain}`
  const teamQuery = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : ''

  const res = await fetch(
    `https://api.vercel.com/v10/projects/${projectId}/domains${teamQuery}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: subdomain }),
    },
  )
  const body = await res.json()
  // Domaine déjà attaché : considéré OK
  if (!res.ok && body.error?.code !== 'domain_already_in_use') {
    return { ok: false, error: body.error?.message || `vercel ${res.status}` }
  }
  return { ok: true, data: { domain: subdomain } }
}
