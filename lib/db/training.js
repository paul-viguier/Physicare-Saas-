// ═══════════════════════════════════════════════
//  Accès données — Catalogue de formation
//  training_axes → training_modules → module_lessons
//  Lecture publique (policy training_axes_public_read).
// ═══════════════════════════════════════════════
import { supabase } from '@/lib/supabase'

// Libellés lisibles pour les catégories d'axes
export const CATEGORY_LABEL = {
  sante_mentale:        'Santé mentale',
  addictions:           'Addictions',
  performance:          'Performance',
  management_relations: 'Management & relations',
  corps_sommeil:        'Corps & sommeil',
  care_chronique:       'Maladies chroniques & aidants',
  sens_engagement:      'Sens & engagement',
  vie_perso:            'Vie personnelle',
}

export async function getAxes() {
  const { data, error } = await supabase
    .from('training_axes')
    .select('id, category, title, description, nb_modules, module_duration_minutes, display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
  if (error) throw error
  return data || []
}

// Regroupe les axes par catégorie (préserve l'ordre d'affichage)
export async function getAxesByCategory() {
  const axes = await getAxes()
  const groups = []
  const index = {}
  for (const axe of axes) {
    if (!(axe.category in index)) {
      index[axe.category] = groups.length
      groups.push({ category: axe.category, label: CATEGORY_LABEL[axe.category] || axe.category, axes: [] })
    }
    groups[index[axe.category]].axes.push(axe)
  }
  return groups
}

export async function getAxis(axisId) {
  const { data, error } = await supabase
    .from('training_axes')
    .select('*')
    .eq('id', axisId)
    .single()
  if (error) throw error
  return data
}

export async function getModulesByAxis(axisId) {
  const { data, error } = await supabase
    .from('training_modules')
    .select('id, title, subtitle, description, duration_minutes, xp_reward, is_certification, is_checkpoint, ordre, status')
    .eq('axis_id', axisId)
    .order('ordre', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getModule(moduleId) {
  const { data, error } = await supabase
    .from('training_modules')
    .select('*')
    .eq('id', moduleId)
    .single()
  if (error) throw error
  return data
}

export async function getLessonsByModule(moduleId) {
  const { data, error } = await supabase
    .from('module_lessons')
    .select('id, ordre, kind, title, duration_seconds')
    .eq('module_id', moduleId)
    .order('ordre', { ascending: true })
  if (error) throw error
  return data || []
}
