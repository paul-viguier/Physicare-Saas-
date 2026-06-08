// ═══════════════════════════════════════════════
//  Accès données — Diagnostic (questionnaires)
//  responses : scores régulation / appropriation / continuité / capacité
// ═══════════════════════════════════════════════
import { supabase } from '@/lib/supabase'

// Mes réponses (l'utilisateur connecté). RLS limite à user_id = auth.uid().
export async function getMyResponses(userId) {
  const { data, error } = await supabase
    .from('responses')
    .select('id, questionnaire_type, module, regulation_score, appropriation_score, continuite_score, capacite_score, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// Questions actives du questionnaire (T0), dans l'ordre.
export async function getActiveQuestions() {
  const { data, error } = await supabase
    .from('questionnaire_questions')
    .select('id, module, module_label, module_subtitle, pillar, ordre, global_ordre, text, scale_min, scale_max')
    .eq('is_active', true)
    .order('global_ordre', { ascending: true })
  if (error) throw error
  return data || []
}

// Enregistre un diagnostic. answers : { question_id: valeur(1-5) }
// La fonction SQL calcule et stocke les scores automatiquement.
export async function submitDiagnostic(answers) {
  const { data, error } = await supabase.rpc('submit_diagnostic', { p_answers: answers })
  if (error) throw error
  return data // response_id
}
