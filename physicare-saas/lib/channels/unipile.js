// PHYSICARE® — Envoi LinkedIn via Unipile (API officielle partenaire)
// Documentation: https://developer.unipile.com/
// ⚠️ JAMAIS de scraping direct. Toujours via le compte LinkedIn OAuth de l'utilisateur.

const RATE_LIMIT_DAILY = Number(process.env.UNIPILE_DAILY_LIMIT || 80)

export async function sendLinkedInInvite({ accountId, profileUrl, message }) {
  return call('/users/invite', { account_id: accountId, provider_id: extractProviderId(profileUrl), message })
}

export async function sendLinkedInMessage({ accountId, profileUrl, message }) {
  return call('/chats', { account_id: accountId, attendees_ids: [extractProviderId(profileUrl)], text: message })
}

async function call(path, body) {
  if (!process.env.UNIPILE_API_KEY || !process.env.UNIPILE_DSN) {
    return { id: `mock_li_${Date.now()}`, mock: true }
  }
  const r = await fetch(`${process.env.UNIPILE_DSN}${path}`, {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.UNIPILE_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`Unipile ${r.status}: ${await r.text()}`)
  return await r.json()
}

function extractProviderId(profileUrl = '') {
  const m = String(profileUrl).match(/linkedin\.com\/in\/([^/?#]+)/i)
  return m ? m[1] : profileUrl
}

/** Vérifie + incrémente le quota journalier d'un compte (Postgres atomique). */
export async function reserveQuota(admin, userId) {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await admin
    .from('prospect_user_integrations')
    .select('id, daily_count, daily_quota, daily_reset_at')
    .eq('user_id', userId).eq('provider', 'UNIPILE').single()
  if (error) throw error
  let { daily_count, daily_quota } = data
  if (data.daily_reset_at !== today) daily_count = 0
  if (daily_count >= (daily_quota ?? RATE_LIMIT_DAILY)) {
    throw new Error(`Quota LinkedIn quotidien atteint (${daily_quota}/jour)`)
  }
  await admin.from('prospect_user_integrations')
    .update({ daily_count: daily_count + 1, daily_reset_at: today, updated_at: new Date().toISOString() })
    .eq('id', data.id)
}

export const UNIPILE_RATE_LIMIT = RATE_LIMIT_DAILY
