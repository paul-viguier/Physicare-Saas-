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
