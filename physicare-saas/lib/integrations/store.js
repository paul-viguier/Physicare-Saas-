// PHYSICARE® — Lecture/écriture chiffrée des tokens providers (côté serveur).
import { adminClient } from '../serverSupabase'
import { encrypt, decrypt } from '../crypto'

/** Charge un token déchiffré pour un utilisateur + provider. */
export async function getIntegration(userId, provider) {
  const admin = adminClient()
  const { data, error } = await admin.from('prospect_user_integrations')
    .select('*').eq('user_id', userId).eq('provider', provider).maybeSingle()
  if (error) throw error
  if (!data) return null
  return { ...data, access_token: data.access_token ? decrypt(data.access_token) : '' }
}

/** Upsert chiffré. */
export async function saveIntegration({ userId, provider, accountId, accessToken, meta = {}, status = 'CONNECTED' }) {
  const admin = adminClient()
  const payload = {
    user_id: userId,
    provider,
    account_id: accountId,
    access_token: accessToken ? encrypt(accessToken) : null,
    meta,
    status,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await admin.from('prospect_user_integrations')
    .upsert(payload, { onConflict: 'user_id,provider' }).select().single()
  if (error) throw error
  return data
}
