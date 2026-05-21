// PHYSICARE® — Moteur de templates pour séquences
// Substitution {{variable}} + helpers personnalisation.

const FALLBACKS = {
  firstName: 'bonjour',
  lastName: '',
  fullName: '',
  company: 'votre organisation',
  jobTitle: 'votre fonction',
  industry: 'votre secteur',
  painPoint: 'la santé comportementale au travail',
  referenceClient: 'Optical Center',
  industryContext: 'porteur',
}

const PAIN_POINT_BY_INDUSTRY = {
  Retail:       "la prévention RPS et la fidélisation des équipes magasin",
  Insurance:    "le pilotage de l'absentéisme et la qualité de vie au travail",
  Banking:      "la prévention des risques psychosociaux en agence",
  Industry:     "la prévention TMS et la santé mentale en atelier",
  Healthcare:   "la prévention de l'épuisement des soignants",
  Transport:    "la sécurité psychologique et la fatigue des équipes",
  Construction: "la prévention des accidents et la santé mentale terrain",
}

/** Construit le contexte de variables à partir d'un lead + sa company. */
export function buildContext(lead = {}, company = {}, extra = {}) {
  return {
    firstName:       lead.first_name || lead.full_name?.split(' ')[0] || FALLBACKS.firstName,
    lastName:        lead.last_name || '',
    fullName:        lead.full_name || '',
    jobTitle:        lead.job_title || FALLBACKS.jobTitle,
    company:         company.name || FALLBACKS.company,
    industry:        company.industry || FALLBACKS.industry,
    industryContext: industryContext(company.industry),
    painPoint:       PAIN_POINT_BY_INDUSTRY[company.industry] || FALLBACKS.painPoint,
    referenceClient: FALLBACKS.referenceClient,
    ...extra,
  }
}

function industryContext(industry) {
  switch (industry) {
    case 'Retail':     return 'fortement exposé aux risques psychosociaux en magasin'
    case 'Insurance':
    case 'Banking':    return 'sous pression réglementaire et commerciale'
    case 'Healthcare': return 'particulièrement concerné par l\'épuisement professionnel'
    case 'Industry':   return 'à forte exposition TMS et accidentologie'
    default:           return 'porteur d\'enjeux QVCT structurants'
  }
}

/** Substitution {{variable}}. Variables manquantes → vide (jamais laissé brut). */
export function render(template = '', ctx = {}) {
  return String(template).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const v = ctx[key]
    return v == null ? '' : String(v)
  })
}

/**
 * Rend une étape complète {channel, subject?, body}.
 * Ajoute automatiquement le bloc d'opt-out RGPD aux emails.
 */
export function renderStep(step, lead, company, opts = {}) {
  const ctx = buildContext(lead, company)
  const out = {
    channel: step.channel,
    subject: step.subject ? render(step.subject, ctx) : null,
    body:    render(step.body || '', ctx),
  }
  if (step.channel === 'EMAIL' && opts.unsubscribeUrl) {
    out.body += `\n\n---\nVous recevez ce message au titre de l'intérêt légitime (RGPD art. 6.1.f).\nDésinscription en un clic : ${opts.unsubscribeUrl}\nDPO PHYSICARE® : dpo@physicare.fr`
  }
  return out
}

/** Validateur basique de séquence. */
export function validateSequence(steps) {
  if (!Array.isArray(steps) || steps.length === 0) throw new Error('La séquence doit contenir au moins 1 étape')
  steps.forEach((s, i) => {
    if (typeof s.day !== 'number' || s.day < 0) throw new Error(`Étape ${i + 1}: "day" doit être un entier ≥ 0`)
    if (!['LINKEDIN_INVITE','LINKEDIN_MESSAGE','EMAIL'].includes(s.channel))
      throw new Error(`Étape ${i + 1}: canal invalide (${s.channel})`)
    if (!s.body) throw new Error(`Étape ${i + 1}: body requis`)
    if (s.channel === 'EMAIL' && !s.subject) throw new Error(`Étape ${i + 1}: subject requis pour un email`)
    if (s.channel === 'LINKEDIN_INVITE' && s.body.length > 300)
      throw new Error(`Étape ${i + 1}: invitation LinkedIn limitée à 300 caractères`)
  })
  // Tri par jour ascendant.
  return [...steps].sort((a, b) => a.day - b.day)
}

/** Templates prêts à l'emploi (à proposer dans le builder). */
export const STARTER_TEMPLATES = {
  invite_drh: {
    channel: 'LINKEDIN_INVITE',
    body: `Bonjour {{firstName}}, je vois que vous pilotez la stratégie RH chez {{company}} dans un contexte {{industryContext}}. Chez PHYSICARE®, nous accompagnons {{referenceClient}} sur {{painPoint}}. Ravi d'échanger si le sujet vous parle.`,
  },
  message_followup: {
    channel: 'LINKEDIN_MESSAGE',
    body: `Merci {{firstName}} pour la connexion !\n\nNous avons développé une méthodologie certifiée Qualiopi (ISC / IAC / ICC) qui aide les entreprises comme {{company}} à mesurer et améliorer la santé comportementale de leurs équipes.\n\n15 min cette semaine pour vous montrer ?`,
  },
  email_signal: {
    channel: 'EMAIL',
    subject: `{{firstName}}, votre approche QVCT chez {{company}} m'a interpellé`,
    body: `Bonjour {{firstName}},\n\nJ'ai remarqué votre engagement sur {{painPoint}} chez {{company}}.\n\nChez PHYSICARE® nous avons aidé {{referenceClient}} à :\n✓ Mesurer objectivement la santé comportementale (ISC propriétaire)\n✓ Identifier les leviers d'action prioritaires (IAC)\n✓ Piloter le climat global (ICC)\n\n15 min pour vous partager notre approche ?\n\nPaul Viguier — Fondateur PHYSICARE®`,
  },
}
