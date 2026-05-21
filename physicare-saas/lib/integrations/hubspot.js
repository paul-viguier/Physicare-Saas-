// PHYSICARE® — Sync sortant vers HubSpot CRM
// Crée ou met à jour un contact + une deal associée.

const BASE = 'https://api.hubapi.com'

export async function upsertHubspotContact({ token, lead, company }) {
  if (!token) return null
  const props = {
    email:     lead.email_verified || undefined,
    firstname: lead.first_name || undefined,
    lastname:  lead.last_name || undefined,
    jobtitle:  lead.job_title || undefined,
    company:   company?.name || undefined,
    linkedin_url: lead.linkedin_profile_url || undefined,
    physicare_lead_score: String(lead.lead_score ?? 0),
    physicare_persona: lead.persona_type || undefined,
  }
  const body = JSON.stringify({ properties: Object.fromEntries(Object.entries(props).filter(([, v]) => v != null)) })

  if (!lead.email_verified) throw new Error('email manquant pour HubSpot')

  // PATCH par email si existe, sinon POST
  const search = await hsFetch(token, '/crm/v3/objects/contacts/search', {
    method: 'POST',
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: lead.email_verified }] }],
      limit: 1,
    }),
  })
  if (search.results?.[0]?.id) {
    return await hsFetch(token, `/crm/v3/objects/contacts/${search.results[0].id}`, { method: 'PATCH', body })
  }
  return await hsFetch(token, '/crm/v3/objects/contacts', { method: 'POST', body })
}

export async function upsertHubspotDeal({ token, deal, contactId }) {
  if (!token || !deal) return null
  const stageMap = { DISCOVERY: 'appointmentscheduled', DEMO: 'qualifiedtobuy',
    PROPOSAL: 'presentationscheduled', NEGOTIATION: 'contractsent',
    WON: 'closedwon', LOST: 'closedlost' }
  const body = JSON.stringify({
    properties: {
      dealname: `PHYSICARE® — ${deal.lead?.full_name || deal.lead_id}`,
      amount: String(deal.amount_eur || 0),
      dealstage: stageMap[deal.stage] || 'appointmentscheduled',
      closedate: deal.expected_close_date || undefined,
      pipeline: 'default',
    },
    associations: contactId ? [{ to: { id: contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }] }] : [],
  })
  return await hsFetch(token, '/crm/v3/objects/deals', { method: 'POST', body })
}

async function hsFetch(token, path, init) {
  const r = await fetch(BASE + path, {
    ...init,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  if (!r.ok) throw new Error(`HubSpot ${r.status}: ${await r.text()}`)
  return r.status === 204 ? {} : await r.json()
}
