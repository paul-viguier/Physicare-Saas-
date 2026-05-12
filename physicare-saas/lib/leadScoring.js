// PHYSICARE® — Lead Score PHYSICARE® (LSP)
// Algorithme propriétaire de scoring B2B sur 100 points.
// Spec: prompt maître v1.0, §6.

/** @typedef {'DECIDEUR'|'SPONSOR_QVCT'|'ACHETEUR_FORMATION'|'PRESCRIPTEUR_SANTE'|'SPONSOR_CLEVEL'} PersonaType */

export const PERSONA_POINTS = {
  DECIDEUR: 30,
  SPONSOR_QVCT: 25,
  ACHETEUR_FORMATION: 20,
  PRESCRIPTEUR_SANTE: 15,
  SPONSOR_CLEVEL: 10,
}

export const PRIORITY_SECTORS = [
  'Retail', 'Insurance', 'Banking', 'Industry',
  'Healthcare', 'Transport', 'Construction',
]

const SIGNAL_POINTS = {
  POST_KEYWORD: 8,
  JOB_POSTING: 7,
  JOB_CHANGE: 10, // applicable seulement si tenure < 6 mois
  FUNDING: 5,
  ENGAGEMENT: 4,
}

/**
 * Calcule le Lead Score PHYSICARE® (0-100).
 * @param {{persona_type?:PersonaType, tenure_months?:number, email_status?:string, unsubscribed_at?:string|null}} lead
 * @param {{employee_count?:number, industry?:string}} company
 * @param {Array<{signal_type:string}>} signals
 * @returns {{score:number, breakdown:Record<string,number>}}
 */
export function computeLeadScore(lead = {}, company = {}, signals = []) {
  if (lead.unsubscribed_at) {
    return { score: 0, breakdown: { unsubscribed: 0 } }
  }

  const breakdown = { persona: 0, size: 0, sector: 0, signals: 0, penalty: 0 }

  // 1. Persona (max 30)
  breakdown.persona = PERSONA_POINTS[lead.persona_type] ?? 0

  // 2. Taille entreprise (max 20)
  const headcount = Number(company.employee_count) || 0
  if (headcount >= 1000) breakdown.size = 20
  else if (headcount >= 500) breakdown.size = 15
  else if (headcount >= 250) breakdown.size = 10

  // 3. Secteur prioritaire (max 15)
  if (company.industry && PRIORITY_SECTORS.includes(company.industry)) {
    breakdown.sector = 15
  }

  // 4. Signaux d'intention (max 25, cumul plafonné)
  let signalScore = 0
  for (const s of signals) {
    if (s.signal_type === 'JOB_CHANGE') {
      if ((lead.tenure_months ?? 99) < 6) signalScore += SIGNAL_POINTS.JOB_CHANGE
    } else {
      signalScore += SIGNAL_POINTS[s.signal_type] ?? 0
    }
  }
  breakdown.signals = Math.min(signalScore, 25)

  // 5. Pénalité email
  if (lead.email_status === 'INVALID') breakdown.penalty -= 15

  const raw = breakdown.persona + breakdown.size + breakdown.sector + breakdown.signals + breakdown.penalty
  const score = Math.max(0, Math.min(100, raw))
  return { score, breakdown }
}

/** Classification visuelle d'après le score. */
export function classifyLead(score) {
  if (score >= 80) return { tier: 'HOT',     emoji: '🔥', label: 'Hot',     color: '#DC2626', bg: '#FEF2F2', cta: 'À contacter sous 24h' }
  if (score >= 60) return { tier: 'WARM',    emoji: '☀️', label: 'Warm',    color: '#D97706', bg: '#FFFBEB', cta: 'Séquence standard' }
  if (score >= 40) return { tier: 'NURTURE', emoji: '🌤️', label: 'Nurture', color: '#1CB0F6', bg: '#EFF6FF', cta: 'Séquence nurturing' }
  return                  { tier: 'COLD',    emoji: '❄️', label: 'Cold',    color: '#6B7280', bg: '#F9FAFB', cta: 'Ne pas prioriser' }
}

/** Déduction heuristique du persona depuis un job_title. */
export function inferPersonaFromTitle(jobTitle = '') {
  const t = jobTitle.toLowerCase()
  if (/(chief happiness|qvct|qvt|bien-être|wellbeing)/.test(t)) return 'SPONSOR_QVCT'
  if (/(drh|chief people|vp hr|director hr|directeur.+ressources humaines|head of people|chro)/.test(t)) return 'DECIDEUR'
  if (/(l&d|learning|formation|développement rh|talent development)/.test(t)) return 'ACHETEUR_FORMATION'
  if (/(médecin du travail|hse|santé-sécurité|santé sécurité|safety)/.test(t)) return 'PRESCRIPTEUR_SANTE'
  if (/(ceo|coo|directeur général|dg|founder)/.test(t)) return 'SPONSOR_CLEVEL'
  return null
}

/** Déduction du niveau de séniorité. */
export function inferSeniority(jobTitle = '') {
  const t = jobTitle.toLowerCase()
  if (/(ceo|cfo|coo|chro|cpo|chief|founder|président|dg)/.test(t)) return 'C_LEVEL'
  if (/(vp |vice president|vice-président)/.test(t)) return 'VP'
  if (/(director|directeur|directrice|head of)/.test(t)) return 'DIRECTOR'
  if (/(manager|responsable|lead)/.test(t)) return 'MANAGER'
  return 'SPECIALIST'
}
