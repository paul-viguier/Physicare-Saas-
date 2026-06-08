import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

// Diagnostic clair si la configuration est absente (cause n°1 d'« impossible de se connecter »)
if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseKey)) {
  console.error(
    '[Physicare] Configuration Supabase manquante. ' +
    'Vérifiez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_KEY dans .env.local (puis redémarrez `npm run dev`).'
  )
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
