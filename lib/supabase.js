import { createClient } from '@supabase/supabase-js'

// Initialisation paresseuse : on ne crée le client qu'au premier appel.
// Sinon `next build` plante quand les env vars ne sont pas dispo
// au moment de la pré-génération des pages.
let _client = null

function getClient() {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL/KEY missing — set them in Vercel env vars')
  }
  _client = createClient(url, key)
  return _client
}

export const supabase = new Proxy({}, {
  get(_, prop) {
    const c = getClient()
    const v = c[prop]
    return typeof v === 'function' ? v.bind(c) : v
  },
})
