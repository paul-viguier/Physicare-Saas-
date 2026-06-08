// ═══════════════════════════════════════════════
//  Accès données — Agrégats dashboards
//  org_aggregates (organisation) / team_aggregates (équipe)
//  ⚠️ Soumis au RLS + seuil d'anonymat (anonymity_threshold).
// ═══════════════════════════════════════════════
import { supabase } from '@/lib/supabase'

export async function getOrgAggregates(orgId) {
  const { data, error } = await supabase
    .from('org_aggregates')
    .select('*')
    .eq('org_id', orgId)
    .order('period', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getTeamAggregates(teamId) {
  const { data, error } = await supabase
    .from('team_aggregates')
    .select('*')
    .eq('team_id', teamId)
    .order('period', { ascending: false })
  if (error) throw error
  return data || []
}

// Équipes dont l'utilisateur est manager
export async function getTeamsManagedBy(userId) {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, org_id')
    .eq('manager_id', userId)
  if (error) throw error
  return data || []
}
