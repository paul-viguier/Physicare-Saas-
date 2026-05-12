// PHYSICARE® — Export d'un lead converti vers le SaaS PHYSICARE® principal
// POST /api/integrations/physicare/export  { leadId }
// Crée un client dans la table `clients` (cf. lib/clients.js) avec slug auto.
import { createClient } from '@supabase/supabase-js'
import { adminClient } from '../../../../lib/serverSupabase'
import { audit } from '../../../../lib/audit'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { leadId } = req.body || {}
  if (!leadId) return res.status(400).json({ error: 'leadId required' })

  const token = req.headers['authorization']?.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'token requis' })
  const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false },
  })
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return res.status(401).json({ error: 'invalid token' })

  const admin = adminClient()
  const { data: lead, error } = await admin.from('prospect_leads')
    .select('*, company:prospect_companies(*)').eq('id', leadId).single()
  if (error) return res.status(404).json({ error: error.message })

  const name = lead.company?.name || lead.full_name
  const slug = slugify(name)

  // Upsert dans clients (table existante du SaaS principal)
  const { data: client, error: e2 } = await admin.from('clients')
    .upsert({ nom: name, slug, couleur: '#7C3AED', actif: true }, { onConflict: 'slug' })
    .select().single()
  if (e2) return res.status(500).json({ error: e2.message })

  await admin.from('prospect_leads').update({ status: 'CUSTOMER' }).eq('id', leadId)
  await audit({ userId: user.id, action: 'EXPORT', resourceType: 'lead', resourceId: leadId,
                metadata: { target: 'PHYSICARE_SAAS', client_slug: slug }, req })

  return res.status(200).json({ client_slug: slug, client_id: client.id })
}

function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}
