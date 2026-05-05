// ═══════════════════════════════════════════════
//  PHYSICARE® — Outil de prospection
//  Génération de leads qualifiés + Agent LinkedIn
// ═══════════════════════════════════════════════
import { useState, useEffect, useMemo } from 'react'
import {
  PROSPECTS_DB, SECTEURS, PIPELINE_STATUS,
  scoreProspect, qualityLabel, estimateRevenue,
  generateLeads, loadLeads, saveLeads, leadsToCSV,
} from '../lib/prospects'

const ADMIN_PASSWORD = 'physicare2026'

/* ════════════════════════════════════════════════════════
   AGENT LINKEDIN — moteur de génération
   ════════════════════════════════════════════════════════ */
function buildLinkedInQuery(lead) {
  const titres = [
    'DRH','Directeur Ressources Humaines','Responsable RH',
    'QVT','Qualité de Vie au Travail','Bien-être au travail',
    'Head of People','Chief People Officer','People Experience',
    'Responsable Formation','Talent','Engagement collaborateur',
  ]
  const url = new URL('https://www.linkedin.com/sales/search/people')
  // Mots-clés titre (encodés)
  url.searchParams.set('keywords', titres.join(' OR '))
  if (lead.linkedin) url.searchParams.set('company', lead.linkedin)
  return {
    salesNavigator: url.toString(),
    standard: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
      (lead.entreprise + ' RH OR DRH OR QVT OR People')
    )}`,
    companyPage: lead.linkedin
      ? `https://www.linkedin.com/company/${lead.linkedin}/people/`
      : `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(lead.entreprise)}`,
  }
}

function buildOutreachMessages(lead) {
  const prenom = '{{prenom}}'
  const accroche = {
    Optique:        `j'accompagne déjà Optical Center et Krys sur la prévention de la charge mentale en magasin`,
    Pharmacie:      `je travaille avec plusieurs réseaux de pharmacies sur la prévention du burn-out comptoir`,
    Parapharmacie:  `je travaille avec plusieurs réseaux de pharmacies sur la prévention du burn-out comptoir`,
    'Santé/EHPAD':  `j'accompagne plusieurs groupes EHPAD sur la prévention de l'épuisement professionnel`,
    Santé:          `j'accompagne plusieurs établissements de santé sur la prévention RPS`,
    Beauté:         `je travaille avec des enseignes de beauté sur la posture et la charge émotionnelle en boutique`,
    'Retail Tech':  `je travaille avec des enseignes retail sur la santé comportementale des équipes magasin`,
    'Retail Sport': `je travaille avec Décathlon-like sur la prévention santé des équipes terrain`,
    Bricolage:      `j'accompagne des enseignes retail sur la prévention musculo-squelettique et mentale`,
    Restauration:   `je travaille avec des enseignes de restauration sur la prévention du turnover et de la fatigue`,
    Hôtellerie:     `je travaille avec Accor-like sur la prévention de la charge des équipes 24/7`,
    Assurance:      `j'accompagne plusieurs assureurs sur le diagnostic santé comportementale de leurs réseaux`,
    Mutuelle:       `j'accompagne plusieurs mutuelles sur le diagnostic santé comportementale de leurs réseaux`,
    Banque:         `j'accompagne plusieurs banques sur la prévention RPS en agences`,
    Automobile:     `j'accompagne des groupes automobiles sur la santé des équipes atelier et commerce`,
  }[lead.secteur] || `j'accompagne des entreprises de votre secteur sur la santé comportementale au travail`

  const sizeNote =
    lead.effectif >= 5000 ? `un déploiement multi-sites maîtrisé`
  : lead.effectif >= 500  ? `un format adapté aux ETI multi-points de vente`
  :                         `un format léger pensé pour les structures à taille humaine`

  // Étape 1 — Demande de connexion (300 caractères max LinkedIn)
  const connexion =
`Bonjour ${prenom}, je m'intéresse à ce que vous faites chez ${lead.entreprise} sur la QVT. Chez Physicare®, ${accroche}. J'aimerais beaucoup échanger 15 min — sans engagement.`

  // Étape 2 — Message de suivi (J+3, après acceptation)
  const followup1 =
`Merci ${prenom} pour la mise en relation !

Je vous contacte parce qu'avec ${lead.effectif.toLocaleString('fr-FR')} collaborateurs sur ${lead.points_vente} points, ${lead.entreprise} est typiquement le profil sur lequel Physicare® apporte le plus de valeur : ${sizeNote}.

Notre diagnostic mesure 4 profils (surcharge / vigilance / équilibre / résilient) et permet à vos managers d'agir avant que le RPS ne devienne un sujet RH.

Auriez-vous 20 minutes la semaine prochaine pour que je vous montre concrètement ce que ça donne sur un réseau comme le vôtre ?

Bien à vous,`

  // Étape 3 — Relance (J+7, si pas de réponse)
  const followup2 =
`${prenom}, petit relai sans pression 🙏

Je vous laisse un cas concret : sur un réseau de ~500 magasins équivalents au vôtre, nous avons identifié 18% des collaborateurs en zone "surcharge" et conçu un plan d'action manager en 6 semaines. ROI mesurable sur l'absentéisme dès le trimestre suivant.

Si le sujet est porté par quelqu'un d'autre chez ${lead.entreprise}, dites-moi vers qui me tourner — je m'en occupe.

Belle journée,`

  // Étape 4 — Bump final (J+14)
  const bump =
`Je clôture mon suivi de mon côté ${prenom} — une dernière fois : un échange de 15 min cette semaine ou la suivante, ça vous va ? Sinon, je vous laisse tranquille jusqu'à votre prochain cycle de planification QVT.`

  // Email de prospection (alternative)
  const email =
`Objet : ${lead.entreprise} × Physicare® — diagnostic santé comportementale

Bonjour ${prenom},

J'ai vu que vous portez la stratégie ${lead.secteur === 'Optique' ? 'réseau' : 'RH'} de ${lead.entreprise}. Je voulais vous écrire en direct car ${accroche}.

Concrètement, Physicare® c'est :
• Un diagnostic 360° de la santé comportementale de vos équipes (15 min / collaborateur)
• 4 profils objectivés (surcharge, vigilance, équilibre, résilient) → pas un énième baromètre
• Un plan d'action manager prêt à l'emploi
• Un dashboard temps réel pour vos DRH régionaux

Sur un réseau de votre taille (${lead.effectif.toLocaleString('fr-FR')} collab. / ${lead.points_vente} points), on parle d'un investissement de l'ordre de ${(estimateRevenue(lead.effectif)/1000).toFixed(0)} k€/an, ROI mesuré sur l'absentéisme.

15 minutes la semaine prochaine ? Voici mon agenda : [lien Calendly]

Bien à vous,
[Signature]`

  return { connexion, followup1, followup2, bump, email }
}

/* ════════════════════════════════════════════════════════
   PAGE PROSPECTION
   ════════════════════════════════════════════════════════ */
export default function Prospection() {
  const [auth, setAuth]       = useState(false)
  const [pwd, setPwd]         = useState('')
  const [error, setError]     = useState('')
  const [tab, setTab]         = useState('dashboard')
  const [leads, setLeads]     = useState([])
  const [filters, setFilters] = useState({ secteur:'', statut:'', q:'', scoreMin:0 })
  const [genCriteria, setGen] = useState({ secteur:'', effectifMin:0, scoreMin:0, limit:10 })
  const [selected, setSelected] = useState(null)
  const [agentLead, setAgentLead] = useState(null)
  const [toast, setToast]     = useState('')

  /* Login */
  function doLogin(e) {
    e.preventDefault()
    if (pwd === ADMIN_PASSWORD) { setAuth(true); setError('') }
    else setError('Mot de passe incorrect')
  }

  /* Charge depuis localStorage au montage */
  useEffect(() => { if (auth) setLeads(loadLeads()) }, [auth])

  /* Sauvegarde auto */
  useEffect(() => { if (auth) saveLeads(leads) }, [leads, auth])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  /* ── Génération de leads ── */
  function handleGenerate() {
    const fresh = generateLeads(genCriteria)
    // Ne pas dupliquer ceux déjà dans la base
    const existingNames = new Set(leads.map(l => l.entreprise))
    const toAdd = fresh.filter(f => !existingNames.has(f.entreprise))
    setLeads(prev => [...toAdd, ...prev])
    showToast(`✨ ${toAdd.length} nouveau(x) lead(s) généré(s) — ${fresh.length - toAdd.length} déjà en base`)
    setTab('pipeline')
  }

  function updateLead(id, patch) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
  }

  function deleteLead(id) {
    setLeads(prev => prev.filter(l => l.id !== id))
    setSelected(null)
  }

  function exportCSV() {
    const csv = leadsToCSV(filteredLeads)
    const blob = new Blob(['﻿' + csv], { type:'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `physicare-prospects-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`📥 Export CSV : ${filteredLeads.length} lead(s)`)
  }

  /* ── Filtres ── */
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (filters.secteur && l.secteur !== filters.secteur) return false
      if (filters.statut  && l.statut  !== filters.statut)  return false
      if (filters.scoreMin && l.score < filters.scoreMin)   return false
      if (filters.q) {
        const q = filters.q.toLowerCase()
        if (!l.entreprise.toLowerCase().includes(q)
         && !(l.ville||'').toLowerCase().includes(q)
         && !(l.decideur||'').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [leads, filters])

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    const total       = leads.length
    const qualifies   = leads.filter(l => l.score >= 65).length
    const contactes   = leads.filter(l => ['contacte','qualifie','rdv','proposition'].includes(l.statut)).length
    const signes      = leads.filter(l => l.statut === 'signe').length
    const ca_pipe     = leads.filter(l => !['perdu','signe'].includes(l.statut))
                              .reduce((s,l) => s + (l.ca_potentiel || 0), 0)
    const ca_signe    = leads.filter(l => l.statut === 'signe')
                              .reduce((s,l) => s + (l.ca_potentiel || 0), 0)
    const conversion  = total > 0 ? Math.round((signes / total) * 100) : 0
    return { total, qualifies, contactes, signes, ca_pipe, ca_signe, conversion }
  }, [leads])

  /* ── ÉCRAN LOGIN ── */
  if (!auth) return (
    <div style={S.page}>
      <div style={S.loginBox}>
        <div style={S.logo}>PHYSICARE<sup style={{fontSize:14}}>®</sup></div>
        <p style={S.logoSub}>Outil de prospection · Accès Physicare</p>
        <form onSubmit={doLogin}>
          <input
            style={S.input} type="password" placeholder="Mot de passe admin"
            value={pwd} onChange={e => setPwd(e.target.value)} autoFocus
          />
          {error && <div style={S.err}>{error}</div>}
          <button style={S.btn} type="submit">Accéder →</button>
        </form>
      </div>
    </div>
  )

  /* ── INTERFACE PROSPECTION ── */
  return (
    <div style={{ background:'#F5F3FF', minHeight:'100vh', fontFamily:'Nunito, sans-serif' }}>

      {/* Header */}
      <div style={S.header}>
        <div style={{ display:'flex', alignItems:'center', gap:18 }}>
          <div style={S.logo2}>PHYSICARE<sup style={{fontSize:13}}>®</sup></div>
          <div style={{ fontSize:13, color:'#6B7280', fontWeight:700 }}>
            Prospection · {leads.length} lead(s) · {kpis.qualifies} qualifié(s)
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <a href="/admin" style={{...S.btnSm, textDecoration:'none', display:'inline-block'}}>← Retour admin</a>
          <button style={S.btnSm} onClick={() => setAuth(false)}>Déconnexion</button>
        </div>
      </div>

      {toast && <div style={S.toast}>{toast}</div>}

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'24px 20px' }}>

        {/* ─── KPIs ─── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:18 }}>
          <Kpi label="Leads totaux"   value={kpis.total}      color="#6D28D9" />
          <Kpi label="Qualifiés (≥65)" value={kpis.qualifies}  color="#D97706" />
          <Kpi label="En contact"     value={kpis.contactes}  color="#2563EB" />
          <Kpi label="Signés"         value={kpis.signes}     color="#059669" />
          <Kpi label="CA pipeline"    value={fmtEUR(kpis.ca_pipe)} color="#7C3AED" />
          <Kpi label="Conversion"     value={kpis.conversion+'%'} color="#DB2777" />
        </div>

        {/* ─── Tabs ─── */}
        <div style={S.tabs}>
          {[
            ['dashboard','📊 Vue d\'ensemble'],
            ['pipeline', '🎯 Pipeline'],
            ['agent',    '🤖 Agent LinkedIn'],
            ['generate', '⚡ Générer des leads'],
          ].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{...S.tab, ...(tab === id ? S.tabActive : {})}}>
              {label}
            </button>
          ))}
        </div>

        {/* ═══ DASHBOARD ═══ */}
        {tab === 'dashboard' && (
          <Dashboard leads={leads} kpis={kpis} onPick={setSelected} />
        )}

        {/* ═══ PIPELINE ═══ */}
        {tab === 'pipeline' && (
          <>
            <FiltersBar filters={filters} setFilters={setFilters}
                        onExport={exportCSV} count={filteredLeads.length} />
            <Pipeline leads={filteredLeads} onPick={setSelected}
                      onAgent={(l) => { setAgentLead(l); setTab('agent') }}
                      onUpdate={updateLead} />
          </>
        )}

        {/* ═══ AGENT LINKEDIN ═══ */}
        {tab === 'agent' && (
          <AgentLinkedIn leads={leads} agentLead={agentLead} setAgentLead={setAgentLead}
                         onUpdate={updateLead} onToast={showToast} />
        )}

        {/* ═══ GÉNÉRATEUR ═══ */}
        {tab === 'generate' && (
          <Generator criteria={genCriteria} setCriteria={setGen}
                     onGenerate={handleGenerate} totalDB={PROSPECTS_DB.length} />
        )}
      </div>

      {/* ═══ MODAL DÉTAIL LEAD ═══ */}
      {selected && (
        <LeadDetail lead={selected} onClose={() => setSelected(null)}
                    onUpdate={(patch) => { updateLead(selected.id, patch); setSelected(s => ({...s, ...patch})) }}
                    onDelete={() => deleteLead(selected.id)}
                    onAgent={() => { setAgentLead(selected); setSelected(null); setTab('agent') }} />
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   COMPOSANTS
   ════════════════════════════════════════════════════════ */
function Kpi({ label, value, color }) {
  return (
    <div style={{ background:'#fff', border:'2px solid #E5E7EB', borderRadius:12,
                  padding:'14px 16px', boxShadow:'0 2px 8px rgba(109,40,217,.06)' }}>
      <div style={{ fontSize:11, color:'#9CA3AF', fontWeight:800, textTransform:'uppercase', letterSpacing:.4 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:900, color, marginTop:4 }}>{value}</div>
    </div>
  )
}

function FiltersBar({ filters, setFilters, onExport, count }) {
  return (
    <div style={S.filterBar}>
      <input style={{...S.input, marginBottom:0, flex:'1 1 200px'}}
        placeholder="🔎 Rechercher entreprise, ville, décideur…"
        value={filters.q} onChange={e => setFilters(f => ({...f, q:e.target.value}))} />
      <select style={{...S.input, marginBottom:0, flex:'0 0 180px'}}
        value={filters.secteur} onChange={e => setFilters(f => ({...f, secteur:e.target.value}))}>
        <option value="">Tous secteurs</option>
        {SECTEURS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select style={{...S.input, marginBottom:0, flex:'0 0 160px'}}
        value={filters.statut} onChange={e => setFilters(f => ({...f, statut:e.target.value}))}>
        <option value="">Tous statuts</option>
        {PIPELINE_STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      <select style={{...S.input, marginBottom:0, flex:'0 0 140px'}}
        value={filters.scoreMin} onChange={e => setFilters(f => ({...f, scoreMin:Number(e.target.value)}))}>
        <option value={0}>Tous scores</option>
        <option value={45}>≥ 45 (à travailler)</option>
        <option value={65}>≥ 65 (qualifiés)</option>
        <option value={80}>≥ 80 (chauds)</option>
      </select>
      <button style={{...S.btnSm, padding:'10px 16px'}} onClick={onExport}>📥 Export CSV ({count})</button>
    </div>
  )
}

function Pipeline({ leads, onPick, onAgent, onUpdate }) {
  if (leads.length === 0) return (
    <div style={S.empty}>
      <div style={{ fontSize:42, marginBottom:12 }}>🎯</div>
      <div style={{ fontSize:16, fontWeight:800, color:'#374151', marginBottom:6 }}>
        Aucun lead pour ces filtres
      </div>
      <div style={{ fontSize:13, color:'#9CA3AF', fontWeight:600 }}>
        Allez dans "⚡ Générer des leads" pour créer votre premier batch
      </div>
    </div>
  )
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(310px,1fr))', gap:14 }}>
      {leads.map(l => {
        const ql = qualityLabel(l.score)
        const st = PIPELINE_STATUS.find(s => s.id === l.statut) || PIPELINE_STATUS[0]
        return (
          <div key={l.id} style={S.leadCard}>
            <div style={{ padding:'14px 16px', borderBottom:'2px solid #F3F4F6' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:900, color:'#111827', marginBottom:2 }}>{l.entreprise}</div>
                  <div style={{ fontSize:11, color:'#6B7280', fontWeight:700 }}>
                    {l.secteur} · {l.ville} · {l.effectif.toLocaleString('fr-FR')} salariés
                  </div>
                </div>
                <span style={{ fontSize:10, padding:'3px 8px', borderRadius:999, fontWeight:900,
                               background:ql.bg, color:ql.color, whiteSpace:'nowrap' }}>
                  {l.score}/100
                </span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:10 }}>
                <span style={{ fontSize:10, padding:'3px 9px', borderRadius:999, fontWeight:900,
                               background:ql.bg, color:ql.color }}>{ql.label}</span>
                <span style={{ fontSize:10, padding:'3px 9px', borderRadius:999, fontWeight:900,
                               background:st.bg, color:st.color }}>{st.label}</span>
              </div>
            </div>
            <div style={{ padding:'12px 16px' }}>
              <div style={{ fontSize:11, color:'#6B7280', fontWeight:700, marginBottom:4 }}>Décideur</div>
              <div style={{ fontSize:13, color:'#111827', fontWeight:700, marginBottom:10 }}>{l.decideur || '—'}</div>
              <div style={{ fontSize:11, color:'#6B7280', fontWeight:700, marginBottom:4 }}>CA potentiel estimé</div>
              <div style={{ fontSize:14, color:'#7C3AED', fontWeight:900, marginBottom:12 }}>{fmtEUR(l.ca_potentiel)}</div>

              <select style={{...S.input, marginBottom:8, padding:'7px 10px', fontSize:12}}
                value={l.statut} onChange={e => onUpdate(l.id, { statut:e.target.value })}>
                {PIPELINE_STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>

              <div style={{ display:'flex', gap:6 }}>
                <button style={{...S.btnSm, flex:1, fontSize:11}} onClick={() => onPick(l)}>👁 Détail</button>
                <button style={{...S.btn, flex:1, fontSize:11, padding:'8px 0'}} onClick={() => onAgent(l)}>🤖 Agent</button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Dashboard({ leads, kpis, onPick }) {
  /* Répartition par statut */
  const byStatut = PIPELINE_STATUS.map(s => ({
    ...s, count: leads.filter(l => l.statut === s.id).length
  }))
  const top = [...leads].sort((a,b) => b.score - a.score).slice(0, 5)

  if (leads.length === 0) return (
    <div style={S.empty}>
      <div style={{ fontSize:48, marginBottom:14 }}>🚀</div>
      <div style={{ fontSize:18, fontWeight:900, color:'#374151', marginBottom:8 }}>
        Bienvenue dans votre outil de prospection
      </div>
      <div style={{ fontSize:13, color:'#6B7280', fontWeight:600, maxWidth:480, margin:'0 auto 18px' }}>
        Générez votre première vague de prospects qualifiés depuis la base sectorielle Physicare,
        puis lancez votre Agent LinkedIn pour transformer chaque lead en RDV.
      </div>
    </div>
  )

  return (
    <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
      {/* Répartition pipeline */}
      <div style={S.card}>
        <div style={{ fontSize:14, fontWeight:900, color:'#111827', marginBottom:14 }}>
          📊 Répartition du pipeline
        </div>
        {byStatut.map(s => {
          const pct = leads.length > 0 ? Math.round(s.count / leads.length * 100) : 0
          return (
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <div style={{ fontSize:12, fontWeight:800, color:'#374151', minWidth:130 }}>{s.label}</div>
              <div style={{ flex:1, height:8, background:'#F3F4F6', borderRadius:999, overflow:'hidden' }}>
                <div style={{ width:pct+'%', height:'100%', background:s.color, borderRadius:999 }}/>
              </div>
              <div style={{ fontSize:12, fontWeight:900, color:'#111827', minWidth:60, textAlign:'right' }}>
                {s.count} ({pct}%)
              </div>
            </div>
          )
        })}
      </div>

      {/* Top 5 leads */}
      <div style={S.card}>
        <div style={{ fontSize:14, fontWeight:900, color:'#111827', marginBottom:14 }}>
          🔥 Top 5 leads chauds
        </div>
        {top.map(l => {
          const ql = qualityLabel(l.score)
          return (
            <div key={l.id} onClick={() => onPick(l)}
                 style={{ padding:'10px', borderRadius:10, cursor:'pointer',
                          marginBottom:6, background:'#FAFAFA', border:'1px solid #F3F4F6' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:13, fontWeight:800, color:'#111827' }}>{l.entreprise}</div>
                <span style={{ fontSize:10, padding:'2px 7px', borderRadius:999, fontWeight:900,
                               background:ql.bg, color:ql.color }}>{l.score}</span>
              </div>
              <div style={{ fontSize:11, color:'#6B7280', fontWeight:600, marginTop:2 }}>
                {l.secteur} · {fmtEUR(l.ca_potentiel)} potentiel
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Generator({ criteria, setCriteria, onGenerate, totalDB }) {
  return (
    <div style={S.card}>
      <div style={{ fontSize:16, fontWeight:900, color:'#111827', marginBottom:6 }}>
        ⚡ Générer des leads qualifiés
      </div>
      <p style={{ fontSize:13, color:'#6B7280', fontWeight:600, marginBottom:18 }}>
        Notre algorithme analyse {totalDB} entreprises cibles, calcule un score de qualification
        (0–100) et estime le CA potentiel selon votre tarif Physicare.
      </p>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12, marginBottom:18 }}>
        <div>
          <label style={S.label}>Secteur</label>
          <select style={S.input} value={criteria.secteur}
            onChange={e => setCriteria(c => ({...c, secteur:e.target.value}))}>
            <option value="">Tous secteurs</option>
            {SECTEURS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>Effectif minimum</label>
          <select style={S.input} value={criteria.effectifMin}
            onChange={e => setCriteria(c => ({...c, effectifMin:Number(e.target.value)}))}>
            <option value={0}>Tous</option>
            <option value={100}>≥ 100</option>
            <option value={500}>≥ 500</option>
            <option value={2000}>≥ 2 000</option>
            <option value={10000}>≥ 10 000</option>
          </select>
        </div>
        <div>
          <label style={S.label}>Score minimum</label>
          <select style={S.input} value={criteria.scoreMin}
            onChange={e => setCriteria(c => ({...c, scoreMin:Number(e.target.value)}))}>
            <option value={0}>Aucun</option>
            <option value={45}>≥ 45</option>
            <option value={65}>≥ 65 (qualifiés)</option>
            <option value={80}>≥ 80 (chauds)</option>
          </select>
        </div>
        <div>
          <label style={S.label}>Nombre max de leads</label>
          <select style={S.input} value={criteria.limit}
            onChange={e => setCriteria(c => ({...c, limit:Number(e.target.value)}))}>
            <option value={5}>5 leads</option>
            <option value={10}>10 leads</option>
            <option value={20}>20 leads</option>
            <option value={50}>50 leads</option>
            <option value={9999}>Maximum disponible</option>
          </select>
        </div>
      </div>

      <button style={{...S.btn, width:'auto', padding:'14px 28px'}} onClick={onGenerate}>
        🚀 Générer {criteria.limit === 9999 ? 'tous' : criteria.limit} les leads correspondants
      </button>

      <div style={{ marginTop:24, padding:'14px 16px', background:'#FAF5FF',
                    border:'2px solid #E9D5FF', borderRadius:10 }}>
        <div style={{ fontSize:12, fontWeight:900, color:'#6D28D9', marginBottom:6 }}>
          🎯 Comment l'algorithme score chaque prospect ?
        </div>
        <ul style={{ fontSize:12, color:'#4C1D95', fontWeight:600, lineHeight:1.7, paddingLeft:20, margin:0 }}>
          <li><b>Secteur</b> (max 30 pts) — Optique / Pharmacie / Santé en cœur de cible</li>
          <li><b>Effectif</b> (max 25 pts) — capacité à déployer un programme RH</li>
          <li><b>Maillage</b> (max 20 pts) — nombre de points de vente</li>
          <li><b>Décideur</b> (max 15 pts) — QVT / DRH identifié</li>
          <li><b>Présence digitale</b> (max 10 pts) — site + LinkedIn actifs</li>
        </ul>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   AGENT LINKEDIN
   ════════════════════════════════════════════════════════ */
function AgentLinkedIn({ leads, agentLead, setAgentLead, onUpdate, onToast }) {
  const [step, setStep] = useState('connexion')

  /* Si rien de sélectionné : top 10 par score */
  const candidates = useMemo(() => {
    return [...leads].sort((a,b) => b.score - a.score).slice(0, 50)
  }, [leads])

  const lead = agentLead || candidates[0]

  if (!lead) return (
    <div style={S.empty}>
      <div style={{ fontSize:42, marginBottom:12 }}>🤖</div>
      <div style={{ fontSize:16, fontWeight:800, color:'#374151', marginBottom:6 }}>
        Aucun lead à traiter
      </div>
      <div style={{ fontSize:13, color:'#9CA3AF', fontWeight:600 }}>
        Générez d'abord des leads dans l'onglet "⚡ Générer des leads"
      </div>
    </div>
  )

  const queries  = buildLinkedInQuery(lead)
  const messages = buildOutreachMessages(lead)
  const ql = qualityLabel(lead.score)

  function copy(txt, label) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(txt)
      onToast(`📋 ${label} copié dans le presse-papier`)
    }
  }

  function launchSequence() {
    onUpdate(lead.id, { statut:'contacte', prochaine_action:'Suivi LinkedIn J+3' })
    onToast(`🚀 Séquence LinkedIn lancée pour ${lead.entreprise}`)
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:16 }}>
      {/* ── Colonne candidats ── */}
      <div style={S.card}>
        <div style={{ fontSize:14, fontWeight:900, color:'#111827', marginBottom:10 }}>
          🎯 File de prospection
        </div>
        <div style={{ fontSize:11, color:'#6B7280', fontWeight:600, marginBottom:14 }}>
          Triés par score · Cliquez pour activer l'agent
        </div>
        <div style={{ maxHeight:600, overflowY:'auto' }}>
          {candidates.map(c => {
            const cql = qualityLabel(c.score)
            const active = c.id === lead.id
            return (
              <div key={c.id} onClick={() => setAgentLead(c)}
                style={{ padding:'10px 12px', borderRadius:10, cursor:'pointer', marginBottom:6,
                  background: active ? '#EDE9FE' : '#FAFAFA',
                  border: active ? '2px solid #7C3AED' : '1px solid #F3F4F6' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontSize:13, fontWeight:800, color:'#111827' }}>{c.entreprise}</div>
                  <span style={{ fontSize:10, padding:'2px 7px', borderRadius:999, fontWeight:900,
                                 background:cql.bg, color:cql.color }}>{c.score}</span>
                </div>
                <div style={{ fontSize:11, color:'#6B7280', fontWeight:600, marginTop:2 }}>
                  {c.secteur} · {c.statut}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Agent ── */}
      <div>
        <div style={{...S.card, marginBottom:14}}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:18, fontWeight:900, color:'#111827' }}>
                🤖 Agent LinkedIn · {lead.entreprise}
              </div>
              <div style={{ fontSize:12, color:'#6B7280', fontWeight:700, marginTop:4 }}>
                Cible : {lead.decideur} · {lead.effectif.toLocaleString('fr-FR')} salariés · {lead.points_vente} points
              </div>
            </div>
            <span style={{ fontSize:11, padding:'4px 10px', borderRadius:999, fontWeight:900,
                           background:ql.bg, color:ql.color }}>{ql.label} · {lead.score}/100</span>
          </div>

          {/* Étape 1 — Recherche LinkedIn */}
          <div style={{ background:'#F0F9FF', border:'2px solid #BAE6FD', borderRadius:10, padding:'12px 14px', marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:900, color:'#075985', marginBottom:8 }}>
              📍 ÉTAPE 1 — Identifier le bon contact
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <a href={queries.salesNavigator} target="_blank" rel="noreferrer"
                 style={{...S.btnSm, textDecoration:'none', display:'inline-block', background:'#0EA5E9', color:'#fff', border:'none'}}>
                🔍 Sales Navigator
              </a>
              <a href={queries.companyPage} target="_blank" rel="noreferrer"
                 style={{...S.btnSm, textDecoration:'none', display:'inline-block'}}>
                🏢 Page entreprise
              </a>
              <a href={queries.standard} target="_blank" rel="noreferrer"
                 style={{...S.btnSm, textDecoration:'none', display:'inline-block'}}>
                🔎 Recherche standard
              </a>
            </div>
            <div style={{ fontSize:11, color:'#075985', fontWeight:600, marginTop:8, fontStyle:'italic' }}>
              Astuce : filtrez sur "DRH OR QVT OR People OR Formation OR Bien-être" pour cibler les bons profils.
            </div>
          </div>

          {/* Étape 2 — Tabs séquence */}
          <div style={{ background:'#FAF5FF', border:'2px solid #E9D5FF', borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontSize:12, fontWeight:900, color:'#6D28D9', marginBottom:10 }}>
              ✉️ ÉTAPE 2 — Séquence d'outreach personnalisée
            </div>
            <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
              {[
                ['connexion', '1. Connexion (J0)'],
                ['followup1', '2. Suivi (J+3)'],
                ['followup2', '3. Relance (J+7)'],
                ['bump',      '4. Bump final (J+14)'],
                ['email',     '📧 Version email'],
              ].map(([id,label]) => (
                <button key={id} onClick={() => setStep(id)}
                  style={{
                    padding:'6px 12px', borderRadius:8,
                    border: step === id ? '2px solid #7C3AED' : '2px solid #E9D5FF',
                    background: step === id ? '#7C3AED' : '#fff',
                    color: step === id ? '#fff' : '#6D28D9',
                    fontSize:11, fontWeight:800, cursor:'pointer'
                  }}>{label}</button>
              ))}
            </div>
            <textarea readOnly value={messages[step]}
              style={{
                width:'100%', minHeight: step === 'email' ? 320 : 180,
                padding:'12px 14px', border:'2px solid #E9D5FF', borderRadius:10,
                fontSize:13, fontFamily:'Nunito,sans-serif', color:'#1F2937',
                lineHeight:1.6, fontWeight:600, resize:'vertical', boxSizing:'border-box', background:'#fff'
              }} />
            <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
              <button style={S.btnSm} onClick={() => copy(messages[step], 'Message')}>📋 Copier le message</button>
              <span style={{ fontSize:11, color:'#6B7280', fontWeight:600, alignSelf:'center' }}>
                Variable à remplacer : <code style={{background:'#F3F4F6', padding:'2px 6px', borderRadius:4}}>{'{{prenom}}'}</code>
              </span>
            </div>
          </div>
        </div>

        {/* Étape 3 — Action */}
        <div style={S.card}>
          <div style={{ fontSize:12, fontWeight:900, color:'#059669', marginBottom:10 }}>
            🚀 ÉTAPE 3 — Lancer la prospection
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            <button style={{...S.btn, width:'auto', padding:'12px 22px',
                            background:'linear-gradient(135deg,#059669,#10B981)'}}
                    onClick={launchSequence}>
              ✅ Marquer comme contacté
            </button>
            <button style={S.btnSm} onClick={() => onUpdate(lead.id, { statut:'qualifie' })}>
              ⭐ Qualifier ce lead
            </button>
            <button style={S.btnSm} onClick={() => onUpdate(lead.id, { statut:'rdv', prochaine_action:'RDV planifié' })}>
              📅 RDV obtenu
            </button>
            <button style={{...S.btnSm, color:'#9CA3AF'}} onClick={() => onUpdate(lead.id, { statut:'perdu' })}>
              ❌ Disqualifier
            </button>
          </div>

          <div style={{ marginTop:14, fontSize:11, color:'#6B7280', fontWeight:600 }}>
            📊 <b>Pourquoi ce score ?</b>
            <ul style={{ marginTop:6, paddingLeft:18 }}>
              {(lead.reasons || []).map((r,i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════
   MODAL DÉTAIL LEAD
   ════════════════════════════════════════════════════════ */
function LeadDetail({ lead, onClose, onUpdate, onDelete, onAgent }) {
  const ql = qualityLabel(lead.score)
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
          <div>
            <div style={{ fontSize:20, fontWeight:900, color:'#111827' }}>{lead.entreprise}</div>
            <div style={{ fontSize:13, color:'#6B7280', fontWeight:700, marginTop:2 }}>
              {lead.secteur} · {lead.ville} · {lead.region}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:24, cursor:'pointer', color:'#6B7280' }}>×</button>
        </div>

        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          <span style={{ fontSize:11, padding:'4px 10px', borderRadius:999, fontWeight:900, background:ql.bg, color:ql.color }}>
            {ql.label} · Score {lead.score}/100
          </span>
          <span style={{ fontSize:11, padding:'4px 10px', borderRadius:999, fontWeight:900, background:'#F3F4F6', color:'#374151' }}>
            CA potentiel : {fmtEUR(lead.ca_potentiel)}
          </span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
          <Info label="Effectif"        value={lead.effectif.toLocaleString('fr-FR') + ' salariés'} />
          <Info label="Points de vente" value={lead.points_vente} />
          <Info label="Décideur"        value={lead.decideur || '—'} />
          <Info label="Site"            value={lead.site ? <a href={'https://'+lead.site} target="_blank" rel="noreferrer" style={{color:'#6D28D9', fontWeight:700}}>{lead.site}</a> : '—'} />
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={S.label}>Statut pipeline</label>
          <select style={S.input} value={lead.statut} onChange={e => onUpdate({ statut:e.target.value })}>
            {PIPELINE_STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={S.label}>Prochaine action</label>
          <input style={S.input} placeholder="Ex: rappeler le 15/06"
            value={lead.prochaine_action || ''} onChange={e => onUpdate({ prochaine_action:e.target.value })} />
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={S.label}>Notes & historique</label>
          <textarea style={{...S.input, minHeight:120, resize:'vertical'}}
            placeholder="Notes commerciales, contexte, points clés…"
            value={lead.notes || ''} onChange={e => onUpdate({ notes:e.target.value })} />
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button style={{...S.btn, width:'auto', padding:'10px 20px'}} onClick={onAgent}>🤖 Lancer l'agent LinkedIn</button>
          <button style={S.btnSm} onClick={onClose}>Fermer</button>
          <button style={{...S.btnSm, color:'#DC2626', borderColor:'#FECACA', marginLeft:'auto'}}
                  onClick={() => { if (confirm('Supprimer ce lead ?')) onDelete() }}>🗑 Supprimer</button>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div style={{ background:'#F9FAFB', border:'1px solid #F3F4F6', borderRadius:10, padding:'10px 12px' }}>
      <div style={{ fontSize:10, color:'#9CA3AF', fontWeight:800, textTransform:'uppercase', marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:13, color:'#111827', fontWeight:700 }}>{value}</div>
    </div>
  )
}

/* ── Helpers ── */
function fmtEUR(n) {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR', maximumFractionDigits:0 }).format(n)
}

/* ── Styles ── */
const S = {
  page:      { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#F5F3FF', fontFamily:'Nunito,sans-serif' },
  loginBox:  { background:'#fff', border:'2px solid #E5E7EB', borderRadius:20, padding:'36px 32px', width:380, boxShadow:'0 12px 40px rgba(109,40,217,.14)' },
  logo:      { fontFamily:'sans-serif', fontSize:28, fontWeight:900, background:'linear-gradient(135deg,#4C1D95,#7C3AED,#A855F7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:6 },
  logo2:     { fontFamily:'sans-serif', fontSize:22, fontWeight:900, background:'linear-gradient(135deg,#4C1D95,#7C3AED)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' },
  logoSub:   { fontSize:13, color:'#6B7280', marginBottom:22, fontWeight:600 },
  input:     { width:'100%', padding:'10px 12px', border:'2px solid #E5E7EB', borderRadius:10, fontSize:13, fontFamily:'Nunito,sans-serif', fontWeight:600, outline:'none', boxSizing:'border-box', marginBottom:10, background:'#fff' },
  btn:       { background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'#fff', border:'none', borderRadius:10, padding:'12px 24px', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif', width:'100%' },
  btnSm:     { background:'#fff', color:'#6D28D9', border:'2px solid #C4B5FD', borderRadius:8, padding:'8px 14px', fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' },
  err:       { background:'#FEF2F2', border:'2px solid #FECACA', borderRadius:8, padding:'8px 12px', fontSize:13, color:'#7F1D1D', fontWeight:700, marginBottom:10 },
  label:     { fontSize:11, fontWeight:800, color:'#374151', marginBottom:5, display:'block', textTransform:'uppercase', letterSpacing:.4 },
  card:      { background:'#fff', border:'2px solid #E5E7EB', borderRadius:14, padding:'20px 22px', boxShadow:'0 2px 12px rgba(109,40,217,.06)' },
  leadCard:  { background:'#fff', border:'2px solid #E5E7EB', borderRadius:14, overflow:'hidden', boxShadow:'0 2px 8px rgba(109,40,217,.06)' },
  empty:     { textAlign:'center', padding:'64px 20px', background:'#fff', borderRadius:14, border:'2px solid #E5E7EB' },
  header:    { background:'#fff', borderBottom:'2px solid #EDE9FE', padding:'0 28px', height:58, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100, boxShadow:'0 2px 8px rgba(109,40,217,.07)' },
  tabs:      { display:'flex', gap:6, marginBottom:18, flexWrap:'wrap' },
  tab:       { padding:'10px 18px', background:'#fff', border:'2px solid #E5E7EB', borderRadius:10, fontSize:13, fontWeight:800, color:'#6B7280', cursor:'pointer', fontFamily:'Nunito,sans-serif' },
  tabActive: { background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'#fff', borderColor:'transparent' },
  filterBar: { display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center', background:'#fff', padding:'12px 14px', border:'2px solid #E5E7EB', borderRadius:12 },
  toast:     { position:'fixed', top:74, right:20, background:'#111827', color:'#fff', padding:'12px 18px', borderRadius:10, fontSize:13, fontWeight:700, zIndex:200, boxShadow:'0 8px 24px rgba(0,0,0,.2)' },
  overlay:   { position:'fixed', inset:0, background:'rgba(17,24,39,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:300, padding:20 },
  modal:     { background:'#fff', borderRadius:16, padding:'24px 26px', width:'100%', maxWidth:620, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.3)' },
}
