// PHYSICARE® — API de recherche de prospects
// Façade Apollo.io / Dropcontact ; mock déterministe si pas de clé API.
// POST /api/prospects/search  { title, industry, countryMin, sizeMin, sizeMax }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { title = '', industry = '', countryMin = 'FR', sizeMin = 250, sizeMax = 10000 } = req.body || {}

  try {
    if (process.env.APOLLO_API_KEY) {
      const apollo = await searchApollo({ title, industry, countryMin, sizeMin, sizeMax })
      return res.status(200).json({ source: 'apollo', results: apollo })
    }
    // Fallback : mock déterministe (utile en dev sans clé API).
    return res.status(200).json({ source: 'mock', results: mockSearch({ title, industry, countryMin, sizeMin, sizeMax }) })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

async function searchApollo({ title, industry, countryMin, sizeMin, sizeMax }) {
  const body = {
    api_key: process.env.APOLLO_API_KEY,
    page: 1,
    per_page: 25,
    person_titles: title ? [title] : undefined,
    organization_locations: [countryMin],
    organization_num_employees_ranges: [`${sizeMin},${sizeMax}`],
    organization_industries: industry ? [industry] : undefined,
  }
  const r = await fetch('https://api.apollo.io/v1/mixed_people/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`Apollo ${r.status}`)
  const json = await r.json()
  return (json.people || []).map(normalizeApollo)
}

function normalizeApollo(p) {
  return {
    id: p.id,
    full_name: p.name,
    first_name: p.first_name,
    last_name: p.last_name,
    job_title: p.title,
    linkedin_profile_url: p.linkedin_url,
    company: {
      linkedin_company_id: p.organization?.linkedin_uid,
      name: p.organization?.name,
      industry: p.organization?.industry,
      employee_count: p.organization?.estimated_num_employees,
      country: p.organization?.country,
      website: p.organization?.website_url,
    },
  }
}

// ─── Mock déterministe ───────────────────────────────────
function mockSearch({ title, industry, sizeMin, sizeMax }) {
  const personas = [
    { first: 'Camille', last: 'Bernard', titleBase: 'Directrice des Ressources Humaines' },
    { first: 'Antoine', last: 'Lefèvre', titleBase: 'Chief People Officer' },
    { first: 'Sarah',   last: 'Dupont',  titleBase: 'Responsable QVCT' },
    { first: 'Julien',  last: 'Morel',   titleBase: 'Chief Happiness Officer' },
    { first: 'Élise',   last: 'Garnier', titleBase: 'L&D Manager' },
    { first: 'Marc',    last: 'Petit',   titleBase: 'Médecin du travail' },
    { first: 'Nina',    last: 'Chevalier',titleBase: 'Responsable Formation' },
    { first: 'Hugo',    last: 'Roussel', titleBase: 'VP People' },
  ]
  const companies = [
    { name: 'Optical Center',     industry: 'Retail',     headcount: 5200, slug: 'optical-center' },
    { name: 'Krys Group',         industry: 'Retail',     headcount: 4500, slug: 'krys-group' },
    { name: 'Malakoff Humanis',   industry: 'Insurance',  headcount: 10000, slug: 'malakoff-humanis' },
    { name: 'Crédit Mutuel',      industry: 'Banking',    headcount: 83000, slug: 'credit-mutuel' },
    { name: 'Décathlon France',   industry: 'Retail',     headcount: 22000, slug: 'decathlon' },
    { name: 'Korian',             industry: 'Healthcare', headcount: 30000, slug: 'korian' },
    { name: 'Accor Hôtels',       industry: 'Services',   headcount: 28000, slug: 'accor' },
    { name: 'Harmonie Mutuelle',  industry: 'Insurance',  headcount: 4800,  slug: 'harmonie-mutuelle' },
  ]
  const titleLower = title.toLowerCase()
  return companies
    .filter(c => !industry || c.industry === industry)
    .filter(c => c.headcount >= sizeMin && c.headcount <= sizeMax)
    .flatMap((c, ci) => personas
      .filter(p => !title || p.titleBase.toLowerCase().includes(titleLower))
      .slice(0, 3)
      .map((p, pi) => ({
        id: `${c.slug}-${pi}-${ci}`,
        full_name: `${p.first} ${p.last}`,
        first_name: p.first,
        last_name: p.last,
        job_title: p.titleBase,
        linkedin_profile_url: `https://www.linkedin.com/in/${p.first.toLowerCase()}-${p.last.toLowerCase()}-${c.slug}`,
        company: {
          linkedin_company_id: c.slug,
          name: c.name,
          industry: c.industry,
          employee_count: c.headcount,
          country: 'FR',
          website: `https://www.${c.slug.replace(/-/g, '')}.com`,
        },
      })))
}
