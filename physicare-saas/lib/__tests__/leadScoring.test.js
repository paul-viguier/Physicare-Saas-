// Tests Vitest pour le LSP (Lead Score PHYSICARE®)
// Lancer avec: npx vitest run
import { describe, it, expect } from 'vitest'
import {
  computeLeadScore,
  classifyLead,
  inferPersonaFromTitle,
  inferSeniority,
} from '../leadScoring'

describe('computeLeadScore', () => {
  it('renvoie 0 pour un lead désabonné', () => {
    const { score } = computeLeadScore(
      { persona_type: 'DECIDEUR', unsubscribed_at: '2026-01-01' },
      { employee_count: 5000, industry: 'Retail' },
      [],
    )
    expect(score).toBe(0)
  })

  it('plafonne à 100', () => {
    const { score } = computeLeadScore(
      { persona_type: 'DECIDEUR', tenure_months: 2 },
      { employee_count: 5000, industry: 'Retail' },
      [
        { signal_type: 'POST_KEYWORD' },
        { signal_type: 'JOB_POSTING' },
        { signal_type: 'JOB_CHANGE' },
        { signal_type: 'FUNDING' },
      ],
    )
    expect(score).toBeLessThanOrEqual(100)
    // 30 + 20 + 15 + min(25, 8+7+10+5) = 90
    expect(score).toBe(90)
  })

  it('applique la pénalité email invalide', () => {
    const { score } = computeLeadScore(
      { persona_type: 'DECIDEUR', email_status: 'INVALID' },
      { employee_count: 1200, industry: 'Banking' },
      [],
    )
    // 30 + 20 + 15 - 15 = 50
    expect(score).toBe(50)
  })

  it('ignore JOB_CHANGE si tenure ≥ 6 mois', () => {
    const { score } = computeLeadScore(
      { persona_type: 'SPONSOR_QVCT', tenure_months: 24 },
      { employee_count: 600 },
      [{ signal_type: 'JOB_CHANGE' }],
    )
    // 25 + 15 + 0 + 0 = 40
    expect(score).toBe(40)
  })

  it('persona inconnu = 0 sur la composante persona', () => {
    const { breakdown } = computeLeadScore({ persona_type: 'AUTRE' }, {}, [])
    expect(breakdown.persona).toBe(0)
  })
})

describe('classifyLead', () => {
  it('classe correctement les tiers', () => {
    expect(classifyLead(85).tier).toBe('HOT')
    expect(classifyLead(70).tier).toBe('WARM')
    expect(classifyLead(45).tier).toBe('NURTURE')
    expect(classifyLead(10).tier).toBe('COLD')
  })
})

describe('inferPersonaFromTitle', () => {
  it('détecte DECIDEUR', () => {
    expect(inferPersonaFromTitle('Directrice des Ressources Humaines')).toBe('DECIDEUR')
    expect(inferPersonaFromTitle('Chief People Officer')).toBe('DECIDEUR')
  })
  it('détecte SPONSOR_QVCT', () => {
    expect(inferPersonaFromTitle('Responsable QVCT')).toBe('SPONSOR_QVCT')
    expect(inferPersonaFromTitle('Chief Happiness Officer')).toBe('SPONSOR_QVCT')
  })
  it('détecte PRESCRIPTEUR_SANTE', () => {
    expect(inferPersonaFromTitle('Médecin du travail')).toBe('PRESCRIPTEUR_SANTE')
  })
  it('renvoie null si inconnu', () => {
    expect(inferPersonaFromTitle('Software Engineer')).toBeNull()
  })
})

describe('inferSeniority', () => {
  it('détecte les niveaux', () => {
    expect(inferSeniority('CEO')).toBe('C_LEVEL')
    expect(inferSeniority('VP People')).toBe('VP')
    expect(inferSeniority('Director of HR')).toBe('DIRECTOR')
    expect(inferSeniority('HR Manager')).toBe('MANAGER')
    expect(inferSeniority('HR Analyst')).toBe('SPECIALIST')
  })
})
