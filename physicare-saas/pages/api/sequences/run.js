// PHYSICARE® — Cron de séquences
// GET /api/sequences/run  (protégé par CRON_SECRET, à appeler par Vercel Cron toutes les 15 min)
// → Pour chaque enrolment ACTIVE dont next_run_at <= now :
//     1) lit lead + company + séquence
//     2) saute si lead unsubscribed / DNC / opt-out
//     3) rend l'étape courante (templates + RGPD)
//     4) envoie via Unipile ou Resend
//     5) journalise dans prospect_messages
//     6) avance current_step + recalcule next_run_at OU complete
import { adminClient, sha256 } from '../../../lib/serverSupabase'
import { renderStep } from '../../../lib/templates'
import { sendEmail } from '../../../lib/channels/email'
import { sendLinkedInInvite, sendLinkedInMessage, reserveQuota } from '../../../lib/channels/unipile'

export default async function handler(req, res) {
  if (process.env.CRON_SECRET) {
    const provided = req.headers['authorization']?.replace(/^Bearer\s+/i, '')
                  || req.query.secret
    if (provided !== process.env.CRON_SECRET) return res.status(401).json({ error: 'unauthorized' })
  }

  const admin = adminClient()
  const now = new Date().toISOString()

  const { data: due, error } = await admin
    .from('prospect_lead_sequences')
    .select('*, sequence:prospect_sequences(*), lead:prospect_leads(*, company:prospect_companies(*))')
    .eq('status', 'ACTIVE')
    .lte('next_run_at', now)
    .limit(50)
  if (error) return res.status(500).json({ error: error.message })

  const results = []
  for (const enrol of due) {
    try {
      const r = await processOne(admin, enrol)
      results.push({ id: enrol.id, ...r })
    } catch (e) {
      results.push({ id: enrol.id, error: e.message })
      await admin.from('prospect_lead_sequences')
        .update({ status: 'PAUSED', next_run_at: nextRetry() })
        .eq('id', enrol.id)
    }
  }
  return res.status(200).json({ processed: results.length, results })
}

async function processOne(admin, enrol) {
  const { lead, sequence } = enrol
  if (!lead || !sequence) throw new Error('lead or sequence missing')

  // Garde-fous RGPD
  if (lead.unsubscribed_at) return await complete(admin, enrol, 'opted_out')
  if (lead.status === 'DNC')  return await complete(admin, enrol, 'dnc')
  if (lead.email_verified) {
    const { data: optout } = await admin.from('prospect_optouts')
      .select('id').eq('email_hash', sha256(lead.email_verified)).maybeSingle()
    if (optout) {
      await admin.from('prospect_leads').update({ unsubscribed_at: new Date().toISOString() }).eq('id', lead.id)
      return await complete(admin, enrol, 'opted_out_global')
    }
  }

  const steps = Array.isArray(sequence.steps) ? sequence.steps : []
  const stepIdx = enrol.current_step ?? 0
  const step = steps[stepIdx]
  if (!step) return await complete(admin, enrol, 'no_more_steps')

  // A/B: choisir une variante si elle existe pour ce step
  const { data: variants } = await admin.from('prospect_step_variants')
    .select('*').eq('sequence_id', sequence.id).eq('step_index', stepIdx)
  const chosen = variants && variants.length ? pickWeighted(variants) : null
  const effectiveStep = chosen
    ? { ...step, subject: chosen.subject ?? step.subject, body: chosen.body }
    : step

  const unsubscribeUrl = `${baseUrl()}/api/email/unsubscribe?lead=${lead.id}&token=${signOptOut(lead.id)}`
  const rendered = renderStep(effectiveStep, lead, lead.company || {}, { unsubscribeUrl })

  let externalId = null
  if (rendered.channel === 'EMAIL') {
    if (!lead.email_verified) throw new Error('email manquant')
    const r = await sendEmail({ to: lead.email_verified, subject: rendered.subject, body: rendered.body })
    externalId = r.id
  } else {
    // LinkedIn — vérifier l'intégration de l'utilisateur propriétaire du lead
    const { data: integ } = await admin.from('prospect_user_integrations')
      .select('account_id').eq('user_id', lead.owner_id).eq('provider', 'UNIPILE').single()
    if (!integ?.account_id) throw new Error('Unipile non connecté pour cet utilisateur')
    await reserveQuota(admin, lead.owner_id)
    const fn = rendered.channel === 'LINKEDIN_INVITE' ? sendLinkedInInvite : sendLinkedInMessage
    const r = await fn({ accountId: integ.account_id, profileUrl: lead.linkedin_profile_url, message: rendered.body })
    externalId = r.id || r.invitation_id || null
  }

  await admin.from('prospect_messages').insert({
    lead_id: lead.id,
    sequence_id: sequence.id,
    channel: rendered.channel,
    subject: rendered.subject,
    body: rendered.body,
    sent_at: new Date().toISOString(),
    status: 'SENT',
    external_message_id: externalId,
    step_index: stepIdx,
    variant_label: chosen?.variant_label || null,
  })
  await admin.from('prospect_leads').update({
    last_contacted_at: new Date().toISOString(),
    status: lead.status === 'NEW' ? 'CONTACTED' : lead.status,
  }).eq('id', lead.id)

  // Avance ou complète
  const nextIdx = stepIdx + 1
  if (nextIdx >= steps.length) return await complete(admin, enrol, 'sequence_done')
  const nextStep = steps[nextIdx]
  const dayDelta = (nextStep.day ?? 0) - (step.day ?? 0)
  const next = new Date(Date.now() + Math.max(1, dayDelta) * 24 * 3600 * 1000).toISOString()
  await admin.from('prospect_lead_sequences')
    .update({ current_step: nextIdx, next_run_at: next })
    .eq('id', enrol.id)
  return { step: stepIdx, channel: rendered.channel, externalId }
}

async function complete(admin, enrol, reason) {
  await admin.from('prospect_lead_sequences')
    .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
    .eq('id', enrol.id)
  return { completed: true, reason }
}

function nextRetry() { return new Date(Date.now() + 6 * 3600 * 1000).toISOString() }

function pickWeighted(variants) {
  const total = variants.reduce((s, v) => s + Math.max(1, v.weight || 1), 0)
  let r = Math.random() * total
  for (const v of variants) {
    r -= Math.max(1, v.weight || 1)
    if (r <= 0) return v
  }
  return variants[0]
}
function baseUrl()   { return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000' }

import crypto from 'crypto'
function signOptOut(leadId) {
  const secret = process.env.OPTOUT_SECRET || 'physicare-dev-secret'
  return crypto.createHmac('sha256', secret).update(String(leadId)).digest('hex').slice(0, 24)
}
export { signOptOut }
