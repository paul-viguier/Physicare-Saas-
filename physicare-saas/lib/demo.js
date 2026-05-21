// PHYSICARE® — Mock data pour mode DEMO (NEXT_PUBLIC_DEMO_MODE=1)
// Permet de visualiser tous les écrans sans Supabase ni auth.

export function isDemo() {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEMO_MODE === '1') return true
  if (typeof window !== 'undefined' && window.localStorage?.getItem('demo') === '1') return true
  return false
}

export const DEMO_USER = { id: '00000000-0000-0000-0000-000000000001', email: 'demo@physicare.fr' }

const COMPANIES = [
  { id: 'c1', name: 'Optical Center', industry: 'Retail',     employee_count: 5200, country: 'FR' },
  { id: 'c2', name: 'Krys Group',     industry: 'Retail',     employee_count: 4500, country: 'FR' },
  { id: 'c3', name: 'Malakoff Humanis', industry: 'Insurance', employee_count: 10000, country: 'FR' },
  { id: 'c4', name: 'Crédit Mutuel',  industry: 'Banking',    employee_count: 83000, country: 'FR' },
  { id: 'c5', name: 'Korian',         industry: 'Healthcare', employee_count: 30000, country: 'FR' },
  { id: 'c6', name: 'Décathlon France', industry: 'Retail',   employee_count: 22000, country: 'FR' },
  { id: 'c7', name: 'Harmonie Mutuelle', industry: 'Insurance', employee_count: 4800, country: 'FR' },
  { id: 'c8', name: 'Accor Hôtels',   industry: 'Services',   employee_count: 28000, country: 'FR' },
]

export const DEMO_LEADS = [
  mkLead('l1', 'Camille Bernard',  'Directrice des Ressources Humaines', 'DECIDEUR',      'DIRECTOR',  92, 'NEW',            COMPANIES[0], { recent_job_change: true, email_status: 'VERIFIED', tenure_months: 3 }),
  mkLead('l2', 'Antoine Lefèvre',  'Chief People Officer',               'DECIDEUR',      'C_LEVEL',   88, 'CONTACTED',      COMPANIES[1], { email_status: 'VERIFIED', tenure_months: 24 }),
  mkLead('l3', 'Sarah Dupont',     'Responsable QVCT',                   'SPONSOR_QVCT',  'MANAGER',   82, 'REPLIED',        COMPANIES[2], { email_status: 'VERIFIED', tenure_months: 14 }),
  mkLead('l4', 'Julien Morel',     'Chief Happiness Officer',            'SPONSOR_QVCT',  'C_LEVEL',   78, 'CONTACTED',      COMPANIES[3], { email_status: 'CATCH_ALL', tenure_months: 8 }),
  mkLead('l5', 'Élise Garnier',    'L&D Manager',                        'ACHETEUR_FORMATION','MANAGER',71, 'NEW',           COMPANIES[4], { email_status: 'VERIFIED', tenure_months: 5, recent_job_change: true }),
  mkLead('l6', 'Marc Petit',       'Médecin du travail',                 'PRESCRIPTEUR_SANTE','SPECIALIST',58, 'NEW',          COMPANIES[5], { email_status: 'PENDING', tenure_months: 30 }),
  mkLead('l7', 'Nina Chevalier',   'Responsable Formation',              'ACHETEUR_FORMATION','MANAGER',65, 'MEETING_BOOKED', COMPANIES[6], { email_status: 'VERIFIED', tenure_months: 18 }),
  mkLead('l8', 'Hugo Roussel',     'VP People',                          'DECIDEUR',      'VP',        85, 'OPPORTUNITY',    COMPANIES[7], { email_status: 'VERIFIED', tenure_months: 11 }),
  mkLead('l9', 'Léa Fournier',     'Directrice QVCT',                    'SPONSOR_QVCT',  'DIRECTOR',  90, 'OPPORTUNITY',    COMPANIES[0], { email_status: 'VERIFIED', tenure_months: 4, recent_job_change: true }),
  mkLead('l10','Théo Lambert',     'CHRO',                               'DECIDEUR',      'C_LEVEL',   95, 'CUSTOMER',       COMPANIES[1], { email_status: 'VERIFIED', tenure_months: 20 }),
  mkLead('l11','Manon Robert',     'Responsable HSE',                    'PRESCRIPTEUR_SANTE','MANAGER',45, 'NEW',           COMPANIES[2], { email_status: 'INVALID', tenure_months: 60 }),
  mkLead('l12','Lucas Faure',      'CEO',                                'SPONSOR_CLEVEL','C_LEVEL',   62, 'CONTACTED',      COMPANIES[6], { email_status: 'VERIFIED', tenure_months: 12 }),
]

function mkLead(id, full, title, persona, seniority, score, status, company, extra = {}) {
  const [first, ...rest] = full.split(' ')
  return {
    id, full_name: full, first_name: first, last_name: rest.join(' '),
    job_title: title, persona_type: persona, seniority_level: seniority,
    lead_score: score, status, company_id: company.id, company,
    linkedin_profile_url: `https://www.linkedin.com/in/${first.toLowerCase()}-${rest.join('').toLowerCase()}`,
    email_verified: extra.email_status === 'INVALID' ? null : `${first.toLowerCase()}.${rest.join('').toLowerCase()}@${company.name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
    email_status: extra.email_status || 'PENDING',
    tenure_months: extra.tenure_months ?? 24,
    recent_job_change: extra.recent_job_change || false,
    owner_id: DEMO_USER.id,
    created_at: new Date(Date.now() - Math.random() * 30 * 86400 * 1000).toISOString(),
    last_contacted_at: status !== 'NEW' ? new Date(Date.now() - Math.random() * 7 * 86400 * 1000).toISOString() : null,
  }
}

export const DEMO_SEQUENCES = [
  { id: 's1', name: 'Décideur RH · Retail',  is_active: true,  steps: [
    { day: 0, channel: 'LINKEDIN_INVITE',  body: 'Bonjour {{firstName}}, je vois que vous pilotez la stratégie RH chez {{company}} dans un contexte {{industryContext}}. Chez PHYSICARE®, nous accompagnons {{referenceClient}} sur {{painPoint}}. Ravi d\'échanger si le sujet vous parle.' },
    { day: 3, channel: 'LINKEDIN_MESSAGE', body: 'Merci {{firstName}} pour la connexion !\n\n15 min cette semaine pour vous présenter notre approche ?' },
    { day: 7, channel: 'EMAIL', subject: '{{firstName}}, suite à notre échange LinkedIn', body: 'Bonjour {{firstName}},\n\nJe me permets de revenir vers vous suite à notre échange…' },
  ]},
  { id: 's2', name: 'Sponsor QVCT · Tous secteurs', is_active: true, steps: [
    { day: 0, channel: 'LINKEDIN_INVITE',  body: 'Bonjour {{firstName}}, votre engagement sur la QVCT chez {{company}} m\'a interpellé. Ravi d\'échanger.' },
    { day: 5, channel: 'EMAIL', subject: 'Diagnostic santé comportementale chez {{company}}', body: 'Bonjour {{firstName}}, …' },
  ]},
]

export const DEMO_MESSAGES = [
  { id: 'm1', lead_id: 'l3', channel: 'LINKEDIN_MESSAGE', body: 'Bonjour Sarah, je suis intéressée par votre proposition. Pourrions-nous échanger jeudi prochain ?', subject: null, sent_at: new Date(Date.now() - 86400000).toISOString(), replied_at: new Date().toISOString(), status: 'REPLIED', full_name: 'Sarah Dupont', job_title: 'Responsable QVCT', company_name: 'Malakoff Humanis', industry: 'Insurance', lead_score: 82, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'm2', lead_id: 'l8', channel: 'EMAIL', subject: 'Re: PHYSICARE® × Accor', body: 'Très intéressant, pouvez-vous m\'envoyer une démo ?', sent_at: new Date(Date.now() - 2*86400000).toISOString(), replied_at: new Date(Date.now() - 86400000).toISOString(), status: 'REPLIED', full_name: 'Hugo Roussel', job_title: 'VP People', company_name: 'Accor Hôtels', industry: 'Services', lead_score: 85, created_at: new Date(Date.now() - 2*86400000).toISOString() },
  { id: 'm3', lead_id: 'l9', channel: 'LINKEDIN_MESSAGE', body: 'Bonjour, je serais ravie d\'organiser un point. Quelles sont vos dispos ?', sent_at: new Date(Date.now() - 3*86400000).toISOString(), replied_at: new Date(Date.now() - 2*86400000).toISOString(), status: 'REPLIED', full_name: 'Léa Fournier', job_title: 'Directrice QVCT', company_name: 'Optical Center', industry: 'Retail', lead_score: 90, created_at: new Date(Date.now() - 3*86400000).toISOString() },
  { id: 'm4', lead_id: 'l2', channel: 'EMAIL', subject: 'Votre méthodo ISC/IAC/ICC', body: '...', sent_at: new Date(Date.now() - 4*86400000).toISOString(), opened_at: new Date(Date.now() - 3*86400000).toISOString(), replied_at: null, status: 'OPENED', full_name: 'Antoine Lefèvre', job_title: 'Chief People Officer', company_name: 'Krys Group', industry: 'Retail', lead_score: 88, created_at: new Date(Date.now() - 4*86400000).toISOString() },
]

export const DEMO_SIGNALS = [
  { id: 'sig1', lead_id: 'l1', signal_type: 'POST_KEYWORD', signal_data: { keyword: 'QVCT', excerpt: '…notre démarche QVCT structurante en 2026…' }, score_boost: 8, detected_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'sig2', lead_id: 'l1', signal_type: 'JOB_CHANGE', signal_data: { tenure_months: 3 }, score_boost: 10, detected_at: new Date().toISOString() },
  { id: 'sig3', lead_id: 'l8', signal_type: 'JOB_POSTING', signal_data: { title: 'Responsable QVCT H/F', city: 'Paris' }, score_boost: 7, detected_at: new Date(Date.now() - 2*86400000).toISOString() },
]

export const DEMO_DEALS = [
  { id: 'd1', lead_id: 'l8', stage: 'DEMO',        amount_eur: 28000, probability: 30, expected_close_date: '2026-07-15', lead: DEMO_LEADS[7], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'd2', lead_id: 'l9', stage: 'PROPOSAL',    amount_eur: 45000, probability: 50, expected_close_date: '2026-06-30', lead: DEMO_LEADS[8], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'd3', lead_id: 'l10',stage: 'WON',         amount_eur: 62000, probability: 100, expected_close_date: '2026-04-20', lead: DEMO_LEADS[9], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'd4', lead_id: 'l3', stage: 'DISCOVERY',   amount_eur: 18000, probability: 10, expected_close_date: '2026-08-30', lead: DEMO_LEADS[2], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'd5', lead_id: 'l2', stage: 'NEGOTIATION', amount_eur: 35000, probability: 75, expected_close_date: '2026-06-10', lead: DEMO_LEADS[1], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

export const DEMO_FUNNEL = {
  owner_id: DEMO_USER.id,
  total_leads: 12, contacted: 5, replied: 3, meetings: 1, opportunities: 2, customers: 1,
}

export const DEMO_VARIANTS = [
  { sequence_id: 's1', step_index: 0, variant_label: 'A', sent: 142, opened: 98, replied: 23 },
  { sequence_id: 's1', step_index: 0, variant_label: 'B', sent: 138, opened: 102, replied: 31 },
  { sequence_id: 's1', step_index: 2, variant_label: 'A', sent: 87,  opened: 54, replied: 12 },
  { sequence_id: 's2', step_index: 0, variant_label: 'A', sent: 76,  opened: 51, replied: 14 },
]

export const DEMO_TEAM = [
  { user_id: '00000000-0000-0000-0000-000000000001', role: 'ADMIN',  monthly_quota: 300, s: { total_leads: 124, contacted: 89, replied: 22, meetings: 11, customers: 4 } },
  { user_id: '00000000-0000-0000-0000-000000000002', role: 'MEMBER', monthly_quota: 200, s: { total_leads: 98,  contacted: 71, replied: 18, meetings: 8,  customers: 3 } },
  { user_id: '00000000-0000-0000-0000-000000000003', role: 'MEMBER', monthly_quota: 200, s: { total_leads: 86,  contacted: 62, replied: 15, meetings: 6,  customers: 2 } },
  { user_id: '00000000-0000-0000-0000-000000000004', role: 'MEMBER', monthly_quota: 150, s: { total_leads: 52,  contacted: 31, replied: 7,  meetings: 3,  customers: 1 } },
]

export const DEMO_AUDIT = [
  { id: 'a1', user_id: DEMO_USER.id, action: 'AI_GENERATE', resource_type: 'lead', resource_id: 'l1', ip_address: '90.12.34.56', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'a2', user_id: DEMO_USER.id, action: 'ENRICH',      resource_type: 'lead', resource_id: 'l5', ip_address: '90.12.34.56', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'a3', user_id: DEMO_USER.id, action: 'SEND',        resource_type: 'message', resource_id: 'm1', ip_address: '90.12.34.56', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'a4', user_id: DEMO_USER.id, action: 'OPTOUT',      resource_type: 'lead', resource_id: 'l11', ip_address: null, created_at: new Date(Date.now() - 2*86400000).toISOString() },
  { id: 'a5', user_id: DEMO_USER.id, action: 'EXPORT',      resource_type: 'lead', resource_id: 'l10', ip_address: '90.12.34.56', created_at: new Date(Date.now() - 3*86400000).toISOString() },
]

export const DEMO_RGPD_REGISTER = [
  { day: new Date(Date.now() - 0*86400000).toISOString(), action: 'AI_GENERATE', resource_type: 'lead',    cnt: 8 },
  { day: new Date(Date.now() - 1*86400000).toISOString(), action: 'SEND',        resource_type: 'message', cnt: 23 },
  { day: new Date(Date.now() - 1*86400000).toISOString(), action: 'OPTOUT',      resource_type: 'lead',    cnt: 1 },
  { day: new Date(Date.now() - 2*86400000).toISOString(), action: 'ENRICH',      resource_type: 'lead',    cnt: 12 },
  { day: new Date(Date.now() - 3*86400000).toISOString(), action: 'EXPORT',      resource_type: 'lead',    cnt: 2 },
]
