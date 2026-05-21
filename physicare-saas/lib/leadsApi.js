// PHYSICARE® — accès Supabase pour le module LinkedIn
import { supabase } from './supabase'
import { computeLeadScore } from './leadScoring'

/** Liste des leads de l'utilisateur courant (RLS = owner_id = auth.uid()). */
export async function listLeads({ status, minScore } = {}) {
  let query = supabase
    .from('prospect_leads')
    .select('*, company:prospect_companies(*), signals:prospect_intent_signals(signal_type, score_boost)')
    .order('lead_score', { ascending: false })

  if (status) query = query.eq('status', status)
  if (minScore != null) query = query.gte('lead_score', minScore)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/** Crée/upsert une entreprise prospect (référentiel partagé). */
export async function upsertCompany(company) {
  const { data, error } = await supabase
    .from('prospect_companies')
    .upsert(company, { onConflict: 'linkedin_company_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Crée un lead pour l'utilisateur courant et calcule son LSP. */
export async function createLead(lead, company = {}, signals = []) {
  const { score } = computeLeadScore(lead, company, signals)
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Non authentifié')

  const payload = { ...lead, lead_score: score, owner_id: user.id }
  const { data, error } = await supabase
    .from('prospect_leads')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Recalcule + persiste le score d'un lead à partir de ses signaux. */
export async function recomputeLeadScore(leadId) {
  const { data: lead, error: e1 } = await supabase
    .from('prospect_leads')
    .select('*, company:prospect_companies(*), signals:prospect_intent_signals(signal_type)')
    .eq('id', leadId)
    .single()
  if (e1) throw e1

  const { score } = computeLeadScore(lead, lead.company || {}, lead.signals || [])
  const { error: e2 } = await supabase
    .from('prospect_leads')
    .update({ lead_score: score })
    .eq('id', leadId)
  if (e2) throw e2
  return score
}

export async function updateLeadStatus(leadId, status) {
  const { error } = await supabase
    .from('prospect_leads')
    .update({ status, last_contacted_at: status === 'CONTACTED' ? new Date().toISOString() : undefined })
    .eq('id', leadId)
  if (error) throw error
}

export async function getDashboardKpis() {
  const { data, error } = await supabase
    .from('prospect_leads')
    .select('status, lead_score, replied_count:prospect_messages(count)')
  if (error) throw error
  const total = data.length
  const hot = data.filter(l => l.lead_score >= 80).length
  const contacted = data.filter(l => l.status === 'CONTACTED').length
  const meetings = data.filter(l => l.status === 'MEETING_BOOKED').length
  return { total, hot, contacted, meetings }
}
