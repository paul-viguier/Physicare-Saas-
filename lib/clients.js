import { supabase } from './supabase'

/* Récupère tous les clients actifs */
export async function getClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('actif', true)
    .order('nom')
  if (error) throw error
  return data
}

/* Crée un nouveau client */
export async function createClient({ nom, slug, couleur }) {
  const { data, error } = await supabase
    .from('clients')
    .insert([{ nom, slug, couleur: couleur || '#6D28D9' }])
    .select()
    .single()
  if (error) throw error
  return data
}

/* Récupère les diagnostics d'un client */
export async function getDiagnostics(clientSlug) {
  const { data, error } = await supabase
    .from('diagnostics')
    .select('*')
    .eq('client_slug', clientSlug)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/* Stats agrégées d'un client */
export async function getStats(clientSlug) {
  const { data, error } = await supabase
    .from('dashboard_stats')
    .select('*')
    .eq('client_slug', clientSlug)
    .single()
  if (error) return null
  return data
}
