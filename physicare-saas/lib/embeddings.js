// PHYSICARE® — Embeddings 384-d pour le look-alike
// Modèle: jina-embeddings-v2-base via API HTTP (gratuit pour < 1M tokens/mois).
// Fallback déterministe (hash → vecteur) si JINA_API_KEY absent — utile en dev/CI.

const DIM = 384

/** Concatène un lead+entreprise en une chaîne représentative. */
export function leadToText(lead, company) {
  return [
    lead.full_name, lead.job_title, lead.persona_type, lead.seniority_level,
    company?.name, company?.industry,
    company?.employee_count ? `${company.employee_count} salariés` : '',
    company?.country, company?.hq_city,
  ].filter(Boolean).join(' | ')
}

export async function embed(text) {
  if (process.env.JINA_API_KEY) {
    const r = await fetch('https://api.jina.ai/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.JINA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'jina-embeddings-v2-base-en', input: [text] }),
    })
    if (!r.ok) throw new Error(`Jina ${r.status}`)
    const json = await r.json()
    return json.data[0].embedding
  }
  return mockEmbed(text)
}

// Embedding déterministe par hash — pas sémantique mais stable, utile pour CI.
function mockEmbed(text) {
  const v = new Array(DIM).fill(0)
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i); h = Math.imul(h, 16777619)
    v[Math.abs(h) % DIM] += 1
  }
  // L2 normalize
  const n = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1
  return v.map(x => x / n)
}

/** Format pgvector littéral PostgreSQL: '[0.1,0.2,...]' */
export function toPgvector(arr) { return `[${arr.join(',')}]` }
