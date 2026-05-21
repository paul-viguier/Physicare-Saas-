// PHYSICARE® — Client Supabase service-role (côté serveur uniquement)
// À ne JAMAIS importer depuis un fichier client. RLS bypass.
import { createClient } from '@supabase/supabase-js'

let _admin = null
export function adminClient() {
  if (_admin) return _admin
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service role not configured')
  _admin = createClient(url, key, { auth: { persistSession: false } })
  return _admin
}

import crypto from 'crypto'
export const sha256 = (s) => crypto.createHash('sha256').update(String(s).trim().toLowerCase()).digest('hex')
