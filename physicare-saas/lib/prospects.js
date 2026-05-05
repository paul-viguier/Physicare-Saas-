// ═══════════════════════════════════════════════
//  PHYSICARE® — Outil de prospection
//  Base de prospects qualifiés + logique de scoring
// ═══════════════════════════════════════════════

/* ── Base de prospects réalistes B2B (cible Physicare) ── */
/* Secteurs cibles : métiers avec forte charge mentale, relationnel client,
   postures statiques prolongées — optique, pharmacie, retail, santé,
   restauration, assurance, banque, hôtellerie. */
export const PROSPECTS_DB = [
  // ─── OPTIQUE (cœur de cible) ───
  { entreprise:'Alain Afflelou',         secteur:'Optique',      effectif:4500,  points_vente:750, region:'National',     ville:'Paris',       site:'alainafflelou.com',       decideur:'Directrice RH Groupe',           linkedin:'alain-afflelou' },
  { entreprise:'Atol les Opticiens',     secteur:'Optique',      effectif:2800,  points_vente:850, region:'National',     ville:'Beaune',      site:'atol.fr',                 decideur:'DRH & Formation',                linkedin:'atol-les-opticiens' },
  { entreprise:'GrandVision France',     secteur:'Optique',      effectif:5200,  points_vente:650, region:'National',     ville:'Rueil-Malmaison', site:'grandvision.fr',      decideur:'Head of People',                 linkedin:'grandvision' },
  { entreprise:'Générale d\'Optique',    secteur:'Optique',      effectif:3100,  points_vente:520, region:'National',     ville:'Bezons',      site:'generaledoptique.com',    decideur:'Responsable QVT',                linkedin:'generale-d-optique' },
  { entreprise:'Optic 2000',             secteur:'Optique',      effectif:6800,  points_vente:1200,region:'National',     ville:'Clamart',     site:'optic2000.com',           decideur:'Direction Réseau & RH',          linkedin:'optic-2000' },
  { entreprise:'Lissac l\'Opticien',     secteur:'Optique',      effectif:1400,  points_vente:260, region:'National',     ville:'Clamart',     site:'lissac.com',              decideur:'Responsable Formation',          linkedin:'lissac-opticien' },
  { entreprise:'Les Opticiens Mutualistes', secteur:'Optique',   effectif:2200,  points_vente:520, region:'National',     ville:'Paris',       site:'lesopticiensmutualistes.com', decideur:'Directrice RH',             linkedin:'opticiens-mutualistes' },
  { entreprise:'Vision Plus',            secteur:'Optique',      effectif:1100,  points_vente:340, region:'National',     ville:'Bussy-St-Georges', site:'visionplus.fr',      decideur:'Dir. Expérience collaborateur',  linkedin:'vision-plus' },

  // ─── PHARMACIE / PARAPHARMACIE ───
  { entreprise:'Pharmacie Lafayette',    secteur:'Pharmacie',    effectif:3800,  points_vente:280, region:'National',     ville:'Toulouse',    site:'pharmacielafayette.com',  decideur:'Responsable Réseau',             linkedin:'pharmacie-lafayette' },
  { entreprise:'Giphar',                 secteur:'Pharmacie',    effectif:2400,  points_vente:1300,region:'National',     ville:'Villeneuve-d\'Ascq', site:'giphar.fr',        decideur:'Dir. Coopérative RH',            linkedin:'giphar' },
  { entreprise:'Univers Pharmacie',      secteur:'Pharmacie',    effectif:3200,  points_vente:440, region:'National',     ville:'Aix-en-Provence', site:'univers-pharmacie.fr', decideur:'DRH Groupe',                  linkedin:'univers-pharmacie' },
  { entreprise:'Pharmavie',              secteur:'Pharmacie',    effectif:1900,  points_vente:200, region:'National',     ville:'Saint-Herblain', site:'pharmavie.fr',         decideur:'Resp. Développement RH',         linkedin:'pharmavie' },
  { entreprise:'Parashop',               secteur:'Parapharmacie',effectif:600,   points_vente:100, region:'National',     ville:'Paris',       site:'parashop.com',            decideur:'Responsable RH',                 linkedin:'parashop' },

  // ─── RETAIL / GRANDE DISTRIBUTION ───
  { entreprise:'Décathlon France',       secteur:'Retail Sport', effectif:22000, points_vente:320, region:'National',     ville:'Villeneuve-d\'Ascq', site:'decathlon.fr',     decideur:'Leader People & Culture',         linkedin:'decathlon' },
  { entreprise:'Fnac Darty',             secteur:'Retail Tech',  effectif:25000, points_vente:960, region:'National',     ville:'Ivry-sur-Seine', site:'fnacdarty.com',       decideur:'Dir. QVCT Groupe',               linkedin:'fnac-darty' },
  { entreprise:'Leroy Merlin France',    secteur:'Bricolage',    effectif:24000, points_vente:140, region:'National',     ville:'Lezennes',    site:'leroymerlin.fr',          decideur:'Dir. People Experience',         linkedin:'leroy-merlin-france' },
  { entreprise:'Boulanger',              secteur:'Retail Tech',  effectif:8500,  points_vente:170, region:'National',     ville:'Lesquin',     site:'boulanger.com',           decideur:'DRH',                            linkedin:'boulanger' },
  { entreprise:'Sephora France',         secteur:'Beauté',       effectif:5500,  points_vente:305, region:'National',     ville:'Neuilly-sur-Seine', site:'sephora.fr',         decideur:'Talent & Culture Director',     linkedin:'sephora' },
  { entreprise:'Nocibé',                 secteur:'Beauté',       effectif:3200,  points_vente:470, region:'National',     ville:'Villeneuve-d\'Ascq', site:'nocibe.fr',        decideur:'Responsable RH Réseau',          linkedin:'nocibe' },
  { entreprise:'Marionnaud',             secteur:'Beauté',       effectif:3800,  points_vente:500, region:'National',     ville:'Paris',       site:'marionnaud.fr',           decideur:'Dir. Formation',                 linkedin:'marionnaud' },
  { entreprise:'Yves Rocher France',     secteur:'Beauté',       effectif:2900,  points_vente:600, region:'National',     ville:'La Gacilly',  site:'yves-rocher.fr',          decideur:'Dir. Engagement collaborateur',  linkedin:'yves-rocher' },

  // ─── RESTAURATION / HÔTELLERIE ───
  { entreprise:'McDonald\'s France',     secteur:'Restauration', effectif:75000, points_vente:1560,region:'National',     ville:'Guyancourt',  site:'mcdonalds.fr',            decideur:'Dir. Bien-être au travail',      linkedin:'mcdonalds-france' },
  { entreprise:'Burger King France',     secteur:'Restauration', effectif:15000, points_vente:500, region:'National',     ville:'Paris',       site:'burgerking.fr',           decideur:'Responsable RH Groupe',          linkedin:'burger-king-france' },
  { entreprise:'Paul Boulangerie',       secteur:'Restauration', effectif:6500,  points_vente:460, region:'National',     ville:'Marcq-en-Barœul', site:'paul.fr',             decideur:'DRH',                            linkedin:'paul' },
  { entreprise:'Accor Hôtels',           secteur:'Hôtellerie',   effectif:28000, points_vente:1800,region:'National',     ville:'Issy-les-Moulineaux', site:'accor.com',       decideur:'Chief Heartist Officer',         linkedin:'accor' },
  { entreprise:'Louvre Hôtels Group',    secteur:'Hôtellerie',   effectif:9800,  points_vente:680, region:'National',     ville:'La Défense',  site:'louvrehotels.com',        decideur:'VP People',                      linkedin:'louvre-hotels-group' },

  // ─── SANTÉ / EHPAD ───
  { entreprise:'Korian',                 secteur:'Santé/EHPAD',  effectif:30000, points_vente:300, region:'National',     ville:'Paris',       site:'korian.fr',               decideur:'Dir. QVT & Prévention',          linkedin:'korian' },
  { entreprise:'Orpea',                  secteur:'Santé/EHPAD',  effectif:28000, points_vente:220, region:'National',     ville:'Puteaux',     site:'orpea.com',               decideur:'DRH France',                     linkedin:'orpea' },
  { entreprise:'DomusVi',                secteur:'Santé/EHPAD',  effectif:17000, points_vente:240, region:'National',     ville:'Suresnes',    site:'domusvi.com',             decideur:'Dir. Politique sociale',         linkedin:'domusvi' },
  { entreprise:'Ramsay Santé',           secteur:'Santé',        effectif:36000, points_vente:140, region:'National',     ville:'Paris',       site:'ramsaysante.fr',          decideur:'Dir. Relations humaines',        linkedin:'ramsay-sante' },
  { entreprise:'Elsan',                  secteur:'Santé',        effectif:28000, points_vente:140, region:'National',     ville:'Paris',       site:'elsan.care',              decideur:'DRH Groupe',                     linkedin:'elsan' },

  // ─── ASSURANCE / MUTUELLE / BANQUE ───
  { entreprise:'Malakoff Humanis',       secteur:'Assurance',    effectif:10000, points_vente:110, region:'National',     ville:'Paris',       site:'malakoffhumanis.com',     decideur:'Dir. Santé au travail',          linkedin:'malakoff-humanis' },
  { entreprise:'Harmonie Mutuelle',      secteur:'Mutuelle',     effectif:4800,  points_vente:300, region:'National',     ville:'Paris',       site:'harmonie-mutuelle.fr',    decideur:'DRH Groupe VYV',                 linkedin:'harmonie-mutuelle' },
  { entreprise:'AG2R La Mondiale',       secteur:'Assurance',    effectif:11000, points_vente:110, region:'National',     ville:'Paris',       site:'ag2rlamondiale.fr',       decideur:'Dir. Expérience salariés',       linkedin:'ag2rlamondiale' },
  { entreprise:'Groupama',               secteur:'Assurance',    effectif:31000, points_vente:2800,region:'National',     ville:'Paris',       site:'groupama.fr',             decideur:'DRH',                            linkedin:'groupama' },
  { entreprise:'Crédit Mutuel',          secteur:'Banque',       effectif:83000, points_vente:4500,region:'National',     ville:'Strasbourg',  site:'creditmutuel.fr',         decideur:'Dir. QVT réseau',                linkedin:'credit-mutuel' },
  { entreprise:'BPCE',                   secteur:'Banque',       effectif:105000,points_vente:7600,region:'National',     ville:'Paris',       site:'bpce.fr',                 decideur:'Head of Employee Experience',    linkedin:'bpce' },

  // ─── PME RÉGIONALES (cibles à scoring moyen) ───
  { entreprise:'Optique du Léman',       secteur:'Optique',      effectif:85,    points_vente:8,   region:'AURA',         ville:'Annecy',      site:'optiqueduleman.fr',       decideur:'Gérant fondateur',               linkedin:'' },
  { entreprise:'Pharmacie Centrale Nice',secteur:'Pharmacie',    effectif:42,    points_vente:3,   region:'PACA',         ville:'Nice',        site:'',                        decideur:'Titulaire',                      linkedin:'' },
  { entreprise:'Réseau Optical Bretagne',secteur:'Optique',      effectif:220,   points_vente:28,  region:'Bretagne',     ville:'Rennes',      site:'',                        decideur:'Directeur réseau',               linkedin:'' },
  { entreprise:'Restauration Sud Catering',secteur:'Restauration',effectif:180,  points_vente:12,  region:'Occitanie',    ville:'Montpellier', site:'',                        decideur:'DRH',                            linkedin:'' },
  { entreprise:'Mutualia Grand Ouest',   secteur:'Mutuelle',     effectif:260,   points_vente:45,  region:'Pays-de-la-Loire', ville:'Nantes',  site:'mutualia.fr',             decideur:'Responsable RH',                 linkedin:'mutualia' },
  { entreprise:'Groupe Bernard Automobiles',secteur:'Automobile',effectif:1200,  points_vente:45,  region:'AURA',         ville:'Lyon',        site:'groupe-bernard.com',      decideur:'DRH',                            linkedin:'groupe-bernard' },
  { entreprise:'Intermarché Nord',       secteur:'Grande distribution',effectif:3500,points_vente:120,region:'Hauts-de-France',ville:'Lille', site:'',                        decideur:'Dir. régional RH',               linkedin:'' },
]

/* ── Algorithme de scoring automatique (0 → 100) ──
   Plus le score est élevé, plus le prospect est qualifié. */
export function scoreProspect(p) {
  let score = 0
  const reasons = []

  // 1) Secteur (max 30 pts) — alignement avec le produit Physicare
  const secteursPremium = ['Optique','Pharmacie','Parapharmacie','Santé/EHPAD','Santé']
  const secteursForts   = ['Beauté','Retail Tech','Retail Sport','Restauration','Hôtellerie','Bricolage']
  const secteursMoyens  = ['Assurance','Mutuelle','Banque','Grande distribution','Automobile']
  if (secteursPremium.includes(p.secteur))      { score += 30; reasons.push('Secteur cœur de cible (+30)') }
  else if (secteursForts.includes(p.secteur))   { score += 22; reasons.push('Secteur à fort potentiel (+22)') }
  else if (secteursMoyens.includes(p.secteur))  { score += 14; reasons.push('Secteur compatible (+14)') }
  else                                          { score += 6;  reasons.push('Secteur générique (+6)') }

  // 2) Taille entreprise (max 25 pts) — capacité à déployer
  const eff = Number(p.effectif) || 0
  if      (eff >= 10000) { score += 25; reasons.push('Grand groupe > 10k salariés (+25)') }
  else if (eff >= 2000)  { score += 22; reasons.push('ETI / Groupe 2k–10k (+22)') }
  else if (eff >= 500)   { score += 16; reasons.push('ETI 500–2000 (+16)') }
  else if (eff >= 100)   { score += 10; reasons.push('PME 100–500 (+10)') }
  else                    { score += 4;  reasons.push('TPE/PME < 100 (+4)') }

  // 3) Maillage territorial (max 20 pts) — nb de points de vente
  const pv = Number(p.points_vente) || 0
  if      (pv >= 500) { score += 20; reasons.push('Réseau national > 500 points (+20)') }
  else if (pv >= 100) { score += 15; reasons.push('Réseau 100–500 points (+15)') }
  else if (pv >= 20)  { score += 10; reasons.push('Réseau 20–100 points (+10)') }
  else if (pv >= 1)   { score += 5;  reasons.push('Quelques points de vente (+5)') }

  // 4) Décideur identifié (max 15 pts)
  const d = (p.decideur || '').toLowerCase()
  if (d.includes('qvt') || d.includes('bien-être') || d.includes('santé au travail')) {
    score += 15; reasons.push('Décideur QVT/santé identifié (+15)')
  } else if (d.includes('drh') || d.includes('head of people') || d.includes('chief')) {
    score += 12; reasons.push('DRH/C-level identifié (+12)')
  } else if (d.includes('rh') || d.includes('formation') || d.includes('people')) {
    score += 8;  reasons.push('Contact RH identifié (+8)')
  } else if (p.decideur) {
    score += 4;  reasons.push('Contact générique (+4)')
  }

  // 5) Digital / présence web (max 10 pts)
  if (p.site && p.linkedin)  { score += 10; reasons.push('Site + LinkedIn actifs (+10)') }
  else if (p.site)            { score += 6;  reasons.push('Site web présent (+6)') }
  else if (p.linkedin)        { score += 4;  reasons.push('Présence LinkedIn (+4)') }

  return { score: Math.min(100, score), reasons }
}

/* ── Classement qualitatif ── */
export function qualityLabel(score) {
  if (score >= 80) return { label:'🔥 Chaud',      color:'#DC2626', bg:'#FEF2F2' }
  if (score >= 65) return { label:'⭐ Qualifié',    color:'#D97706', bg:'#FFFBEB' }
  if (score >= 45) return { label:'🟢 À travailler',color:'#059669', bg:'#ECFDF5' }
  return             { label:'⚪ Froid',          color:'#6B7280', bg:'#F9FAFB' }
}

/* ── Statuts pipeline CRM ── */
export const PIPELINE_STATUS = [
  { id:'nouveau',     label:'Nouveau',     color:'#6B7280', bg:'#F3F4F6' },
  { id:'contacte',    label:'Contacté',    color:'#2563EB', bg:'#DBEAFE' },
  { id:'qualifie',    label:'Qualifié',    color:'#7C3AED', bg:'#EDE9FE' },
  { id:'rdv',         label:'RDV planifié',color:'#D97706', bg:'#FEF3C7' },
  { id:'proposition', label:'Proposition', color:'#DB2777', bg:'#FCE7F3' },
  { id:'signe',       label:'Signé ✅',    color:'#059669', bg:'#D1FAE5' },
  { id:'perdu',       label:'Perdu ❌',    color:'#9CA3AF', bg:'#F3F4F6' },
]

/* ── Estimation panier moyen (CA potentiel) ──
   Basé sur effectif × prix moyen Physicare / collaborateur / an. */
export function estimateRevenue(effectif) {
  const tarifParCollab = 48 // € / collab / an (abonnement B2B moyen)
  return Math.round((Number(effectif) || 0) * tarifParCollab)
}

/* ── Persistance locale (pas de schema Supabase requis) ── */
const STORAGE_KEY = 'physicare_prospects_v1'

export function loadLeads() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveLeads(leads) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads)) }
  catch {}
}

/* ── Génère un batch de leads à partir de la base selon critères ── */
export function generateLeads({ secteur, effectifMin, scoreMin, limit } = {}) {
  const rows = PROSPECTS_DB
    .filter(p => !secteur     || p.secteur === secteur)
    .filter(p => !effectifMin || p.effectif >= effectifMin)
    .map(p => {
      const { score, reasons } = scoreProspect(p)
      return {
        id:          p.entreprise.toLowerCase().replace(/[^a-z0-9]+/g,'-') + '-' + Math.random().toString(36).slice(2,6),
        ...p,
        score,
        reasons,
        ca_potentiel: estimateRevenue(p.effectif),
        statut:       'nouveau',
        notes:        '',
        prochaine_action: '',
        created_at:   new Date().toISOString(),
      }
    })
    .filter(p => !scoreMin || p.score >= scoreMin)
    .sort((a,b) => b.score - a.score)

  return limit ? rows.slice(0, limit) : rows
}

/* ── Liste unique des secteurs (pour filtres) ── */
export const SECTEURS = Array.from(new Set(PROSPECTS_DB.map(p => p.secteur))).sort()

/* ── Export CSV ── */
export function leadsToCSV(leads) {
  const headers = [
    'Entreprise','Secteur','Effectif','Points de vente','Région','Ville',
    'Décideur','Site','LinkedIn','Score','Statut','CA potentiel (€)',
    'Prochaine action','Notes','Créé le'
  ]
  const escape = (v) => {
    const s = (v === null || v === undefined) ? '' : String(v)
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s
  }
  const rows = leads.map(l => [
    l.entreprise, l.secteur, l.effectif, l.points_vente, l.region, l.ville,
    l.decideur, l.site, l.linkedin, l.score, l.statut, l.ca_potentiel,
    l.prochaine_action, l.notes, l.created_at,
  ].map(escape).join(';'))
  return [headers.join(';'), ...rows].join('\n')
}
