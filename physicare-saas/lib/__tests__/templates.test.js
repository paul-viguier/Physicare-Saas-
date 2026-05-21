import { describe, it, expect } from 'vitest'
import { render, buildContext, validateSequence, renderStep } from '../templates'

describe('render', () => {
  it('substitue les variables', () => {
    expect(render('Bonjour {{firstName}}', { firstName: 'Camille' })).toBe('Bonjour Camille')
  })
  it('vide les variables manquantes', () => {
    expect(render('Bonjour {{x}}', {})).toBe('Bonjour ')
  })
})

describe('buildContext', () => {
  it('produit firstName par défaut', () => {
    const ctx = buildContext({ full_name: 'Camille Bernard' }, { name: 'Optical Center', industry: 'Retail' })
    expect(ctx.firstName).toBe('Camille')
    expect(ctx.company).toBe('Optical Center')
    expect(ctx.painPoint).toMatch(/RPS/)
  })
})

describe('validateSequence', () => {
  it('rejette une invitation > 300 chars', () => {
    expect(() => validateSequence([{ day: 0, channel: 'LINKEDIN_INVITE', body: 'a'.repeat(301) }]))
      .toThrow(/300 caractères/)
  })
  it('exige un subject pour EMAIL', () => {
    expect(() => validateSequence([{ day: 0, channel: 'EMAIL', body: 'x' }]))
      .toThrow(/subject/)
  })
  it('trie par jour', () => {
    const out = validateSequence([
      { day: 7, channel: 'LINKEDIN_MESSAGE', body: 'b' },
      { day: 0, channel: 'LINKEDIN_INVITE', body: 'a' },
    ])
    expect(out.map(s => s.day)).toEqual([0, 7])
  })
})

describe('renderStep', () => {
  it('append le bloc opt-out aux emails', () => {
    const r = renderStep(
      { channel: 'EMAIL', subject: 'Test', body: 'Bonjour' },
      { first_name: 'Sarah' }, { name: 'Krys' },
      { unsubscribeUrl: 'https://x/unsub' },
    )
    expect(r.body).toMatch(/Désinscription/)
    expect(r.body).toMatch(/dpo@physicare\.fr/)
    expect(r.body).toMatch(/https:\/\/x\/unsub/)
  })
  it('n\'append rien aux invites LinkedIn', () => {
    const r = renderStep(
      { channel: 'LINKEDIN_INVITE', body: 'Bonjour {{firstName}}' },
      { first_name: 'Sarah' }, { name: 'Krys' },
      { unsubscribeUrl: 'https://x/unsub' },
    )
    expect(r.body).toBe('Bonjour Sarah')
  })
})
