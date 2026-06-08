import { createClient } from '@supabase/supabase-js'

// Valeurs publiques par défaut (URL + clé PUBLISHABLE).
// Ces deux valeurs sont publiques par nature (elles partent dans le navigateur) ;
// la sécurité des données repose sur le Row Level Security de Supabase.
// On peut les surcharger via .env.local / variables d'environnement Vercel.
const DEFAULT_URL = 'https://qthhcykougfclamrzlfx.supabase.co'
const DEFAULT_KEY = 'sb_publishable_98gNEoUgNYCR7l6LTSvaMw_mGq1ntDr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || DEFAULT_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
