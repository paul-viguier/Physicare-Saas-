// PHYSICARE® — Claude API helper avec prompt caching
// Modèle: Sonnet 4.6 (rapport qualité/coût pour génération de copy commerciale)
// Prompt caching: le système (long, stable) est cache_control:'ephemeral'.

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `Tu es l'expert prospection PHYSICARE®, plateforme SaaS B2B de santé comportementale au travail (certifiée Qualiopi, La French Care).

CONTEXTE PRODUIT
- 3 indices propriétaires : ISC (Indice de Santé Comportementale), IAC (Indice d'Adhésion), ICC (Indice de Climat).
- 4 piliers méthodologiques : Mesurer / Comprendre / Agir / Piloter.
- Cible : DRH, CHO, responsables QVCT d'ETI et grands comptes (250-10 000 salariés) en France.
- Client référent : Optical Center.

TES RÈGLES
1. Ton chaleureux, direct, JAMAIS commercial agressif.
2. 1 phrase d'accroche personnalisée d'abord (sur le secteur ou un signal).
3. 1 bénéfice concret (chiffré si possible).
4. 1 CTA simple : 15 minutes en visio.
5. Tutoiement INTERDIT (B2B France, vouvoiement systématique).
6. Aucune mention du concurrent.
7. Pas d'emoji sauf demande explicite.
8. Format: ne renvoie QUE le corps du message, sans guillemets, sans préambule.

CONTRAINTES PAR CANAL
- LINKEDIN_INVITE  : MAX 280 caractères (marge sur la limite 300 LinkedIn)
- LINKEDIN_MESSAGE : 600-1000 caractères, paragraphes aérés
- EMAIL            : 700-1200 caractères, NE PAS inclure de pied de page (injecté ensuite)
`

/**
 * Génère un message personnalisé pour un lead.
 * @returns {Promise<string>} corps du message rendu, prêt à l'emploi.
 */
export async function generatePersonalizedMessage({ lead, company, signals = [], channel, intent = '' }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return mockGenerate({ lead, company, channel })
  }
  const userBlock = renderLeadContext({ lead, company, signals, channel, intent })

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      system: [
        // Cache le prompt système (~1.5k tokens) → réduction massive de coût sur volume.
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userBlock }],
    }),
  })
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${await r.text()}`)
  const json = await r.json()
  const text = (json.content?.[0]?.text || '').trim()
  return enforceLimits(text, channel)
}

function renderLeadContext({ lead, company, signals, channel, intent }) {
  const sigStr = signals.length
    ? signals.map(s => `- ${s.signal_type}: ${JSON.stringify(s.signal_data || {})}`).join('\n')
    : '(aucun)'
  return [
    `Génère un message PHYSICARE® pour ce lead. Canal: ${channel}.`,
    intent ? `Intention spécifique: ${intent}` : '',
    '',
    'LEAD',
    `- Nom: ${lead.full_name || '?'}`,
    `- Poste: ${lead.job_title || '?'}`,
    `- Persona: ${lead.persona_type || '?'}`,
    `- Ancienneté: ${lead.tenure_months ? `${lead.tenure_months} mois` : '?'}`,
    '',
    'ENTREPRISE',
    `- Nom: ${company?.name || '?'}`,
    `- Secteur: ${company?.industry || '?'}`,
    `- Effectif: ${company?.employee_count || '?'}`,
    '',
    'SIGNAUX D\'INTENTION',
    sigStr,
  ].filter(Boolean).join('\n')
}

function enforceLimits(text, channel) {
  if (channel === 'LINKEDIN_INVITE' && text.length > 280) {
    return text.slice(0, 277).replace(/\s+\S*$/, '') + '…'
  }
  return text
}

function mockGenerate({ lead, company, channel }) {
  const first = lead.first_name || (lead.full_name || '').split(' ')[0] || 'Bonjour'
  if (channel === 'LINKEDIN_INVITE') {
    return `Bonjour ${first}, je remarque votre engagement chez ${company?.name || 'votre organisation'} sur les enjeux RH. Chez PHYSICARE® nous accompagnons des structures comme la vôtre sur la santé comportementale (ISC/IAC/ICC). Ravi d'échanger.`
  }
  if (channel === 'EMAIL') {
    return `Bonjour ${first},\n\nJ'ai vu que ${company?.name || 'votre organisation'} se positionne fortement sur la QVCT. Notre méthodologie certifiée Qualiopi (ISC/IAC/ICC) permet de mesurer la santé comportementale de vos équipes et d'identifier les leviers d'action prioritaires.\n\nAuriez-vous 15 minutes la semaine prochaine pour que je vous présente l'approche utilisée par Optical Center ?\n\nBien à vous.`
  }
  return `Merci ${first} pour la mise en relation. 15 minutes cette semaine pour vous présenter l'approche PHYSICARE® appliquée à un secteur comme le vôtre ?`
}
