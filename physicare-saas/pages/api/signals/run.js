// PHYSICARE® — Cron quotidien de détection de signaux d'intention
// GET /api/signals/run  (Vercel cron, protégé par CRON_SECRET)
//
// Détecte 4 types de signaux et déclenche un recompute LSP:
//   - POST_KEYWORD : Unipile search posts (mots-clés QVCT)
//   - JOB_POSTING  : ATS/career pages (heuristique: mock par défaut)
//   - JOB_CHANGE   : Unipile profile snapshot (tenure < 6 mois)
//   - FUNDING      : Pappers récents (FR uniquement)
import { adminClient } from '../../../lib/serverSupabase'
import { computeLeadScore } from '../../../lib/leadScoring'

const KEYWORDS = ['QVCT','santé mentale','burn-out','absentéisme','RPS','bien-être au travail','engagement collaborateur']

export default async function handler(req, res) {
  if (process.env.CRON_SECRET) {
    const provided = req.headers['authorization']?.replace(/^Bearer\s+/i, '') || req.query.secret
    if (provided !== process.env.CRON_SECRET) return res.status(401).json({ error: 'unauthorized' })
  }

  const start = Date.now()
  const admin = adminClient()
  const summary = { POST_KEYWORD: 0, JOB_POSTING: 0, JOB_CHANGE: 0, FUNDING: 0, rescored: 0 }

  // Charge les leads actifs (limite à 200 par run pour éviter timeouts)
  const { data: leads, error } = await admin
    .from('prospect_leads')
    .select('id, full_name, linkedin_profile_url, tenure_months, persona_type, email_status, unsubscribed_at, company:prospect_companies(*)')
    .is('unsubscribed_at', null)
    .neq('status', 'CUSTOMER').neq('status', 'LOST').neq('status', 'DNC')
    .order('lead_score', { ascending: false })
    .limit(200)
  if (error) return res.status(500).json({ error: error.message })

  for (const lead of leads || []) {
    const detected = []

    // 1. POST_KEYWORD via Unipile (mock si pas de clé)
    const post = await detectPostKeyword(lead).catch(() => null)
    if (post) { detected.push({ type: 'POST_KEYWORD', data: post, boost: 8 }); summary.POST_KEYWORD++ }

    // 2. JOB_POSTING via Pappers / page carrière (mock)
    const job = await detectJobPosting(lead.company).catch(() => null)
    if (job) { detected.push({ type: 'JOB_POSTING', data: job, boost: 7 }); summary.JOB_POSTING++ }

    // 3. JOB_CHANGE — déjà connu via tenure_months sur le lead (re-flag si < 6 mois)
    if ((lead.tenure_months ?? 99) < 6) {
      detected.push({ type: 'JOB_CHANGE', data: { tenure_months: lead.tenure_months }, boost: 10 })
      summary.JOB_CHANGE++
    }

    // 4. FUNDING via Pappers (mock)
    const funding = await detectFunding(lead.company).catch(() => null)
    if (funding) { detected.push({ type: 'FUNDING', data: funding, boost: 5 }); summary.FUNDING++ }

    if (detected.length === 0) continue

    // Insert (en évitant les doublons exacts du jour)
    for (const s of detected) {
      await admin.from('prospect_intent_signals').insert({
        lead_id: lead.id, signal_type: s.type, signal_data: s.data, score_boost: s.boost,
      })
    }

    // Recompute LSP avec tous les signaux (ré-agrège)
    const { data: allSignals } = await admin.from('prospect_intent_signals')
      .select('signal_type').eq('lead_id', lead.id)
    const { score } = computeLeadScore(lead, lead.company || {}, allSignals || [])
    await admin.from('prospect_leads').update({ lead_score: score }).eq('id', lead.id)
    summary.rescored++
  }

  const total = Object.values(summary).reduce((a, b) => a + b, 0) - summary.rescored
  await admin.from('prospect_signal_runs').insert({
    detected_count: total, source: 'ALL', duration_ms: Date.now() - start,
    notes: JSON.stringify(summary),
  })

  return res.status(200).json({ scanned: leads?.length || 0, summary, duration_ms: Date.now() - start })
}

// ────────────────────────────────────────────────────────────
// Détecteurs (mock par défaut, hooks réels à brancher Phase 3.1)

async function detectPostKeyword(lead) {
  if (!process.env.UNIPILE_API_KEY) {
    // Mock: 10% de chance qu'un lead ait posté sur QVCT cette semaine
    if (Math.random() < 0.1) {
      const kw = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)]
      return { keyword: kw, excerpt: `…${kw} est un sujet structurant pour nos équipes…`, mock: true }
    }
    return null
  }
  // TODO Unipile real call: GET /chats/posts?keywords=…&author=lead.linkedin_id
  return null
}

async function detectJobPosting(company) {
  if (!company?.name) return null
  if (!process.env.PAPPERS_API_KEY) {
    if (Math.random() < 0.08) {
      return { title: 'Responsable QVCT H/F', city: company.hq_city || 'Paris', mock: true }
    }
    return null
  }
  return null
}

async function detectFunding(company) {
  if (!company?.siren || !process.env.PAPPERS_API_KEY) return null
  // TODO appel réel Pappers: GET /v2/entreprise?siren=...&champs_supplementaires=actes
  return null
}
