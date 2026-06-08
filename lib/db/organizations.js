// ═══════════════════════════════════════════════
//  Accès données — Organisations (clients)
//  Lecture soumise au RLS Supabase : un super_admin voit toutes
//  les organisations ; les autres rôles uniquement la leur.
// ═══════════════════════════════════════════════
import { supabase } from '@/lib/supabase'

export async function getOrganizations() {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, sector, lifecycle_stage, total_employees, contract_start_date, contract_end_date, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getOrganization(id) {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// Équipes d'une organisation (back-office)
export async function getTeamsByOrg(orgId) {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, manager_id')
    .eq('org_id', orgId)
    .order('name')
  if (error) throw error
  return data || []
}

// Nombre d'utilisateurs d'une organisation
export async function getUserCountByOrg(orgId) {
  const { count, error } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
  if (error) throw error
  return count || 0
}
