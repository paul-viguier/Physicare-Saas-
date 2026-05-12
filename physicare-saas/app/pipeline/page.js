'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ----------------------------------------------------------------------------
// Maps de présentation
// ----------------------------------------------------------------------------
const ACTIVITY_ICONS = {
  lead_created:    '🌱',
  stage_changed:   '➡️',
  email_sent:      '✉️',
  call_made:       '📞',
  meeting_held:    '👥',
  demo_done:       '🎥',
  proposal_sent:   '📄',
  contract_signed: '✅',
  note:            '📝',
  lost:            '❌',
}

const NEXT_ACTION_ICONS = {
  call:          '📞',
  email:         '✉️',
  meeting:       '👥',
  demo:          '🎥',
  follow_up:     '🔄',
  send_proposal: '📄',
  send_contract: '📝',
  wait_legal:    '⏳',
  other:         '•',
}

// Pastel pour le logo des prospects (cyclique sur initiale)
const LOGO_COLORS = ['#6D28D9','#0891B2','#F59E0B','#10B981','#DC2626','#0EA5E9','#EC4899','#7C3AED','#14B8A6']
const colorFor = name => LOGO_COLORS[((name || '?').charCodeAt(0)) % LOGO_COLORS.length]

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
const fmtEur  = n => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n || 0)) + ' €'
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
const fmtDateShort = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '—'
const daysSince = d => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 0

function dueBadge(dueAt) {
  if (!dueAt) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due   = new Date(dueAt); due.setHours(0, 0, 0, 0)
  const days  = Math.round((due - today) / 86400000)
  if (days <  0) return { text: `En retard ${-days} j`, overdue: true }
  if (days === 0) return { text: "Aujourd'hui" }
  if (days === 1) return { text: 'Demain' }
  if (days <= 7) return { text: `Dans ${days} j` }
  return { text: fmtDateShort(dueAt) }
}

function convClass(pct) {
  if (pct >= 65) return 'ok'
  if (pct >= 45) return 'warn'
  return 'ko'
}

function startOfWeek() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))   // lundi
  return d
}

// ----------------------------------------------------------------------------
// Composant principal
// ----------------------------------------------------------------------------
export default function Pipeline() {
  const router = useRouter()
  const [user, setUser]               = useState(null)
  const [stages, setStages]           = useState([])
  const [prospects, setProspects]     = useState([])
  const [nextActions, setNextActions] = useState({})   // {prospect_id: row}
  const [funnel, setFunnel]           = useState([])
  const [standBy, setStandBy]         = useState([])
  const [activities, setActivities]   = useState({})   // {prospect_id: [rows]}
  const [loading, setLoading]         = useState(true)

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    setUser(session.user)
    loadData()
  }

  async function loadData() {
    setLoading(true)
    const [stagesRes, prospectsRes, nextRes, funnelRes, standByRes] = await Promise.all([
      supabase.from('pipeline_stages').select('*').order('ord'),
      supabase.from('prospects').select('*').order('date_debut', { ascending: false }),
      supabase.from('prospect_next_actions').select('*').is('done_at', null),
      supabase.from('pipeline_funnel_stats').select('*').order('ord'),
      supabase.from('prospects_stand_by').select('*'),
    ])

    setStages(stagesRes.data || [])
    setProspects(prospectsRes.data || [])
    setFunnel(funnelRes.data || [])
    setStandBy(standByRes.data || [])

    const naMap = {}
    ;(nextRes.data || []).forEach(na => { naMap[na.prospect_id] = na })
    setNextActions(naMap)

    setLoading(false)
  }

  async function loadHistory(prospectId) {
    if (activities[prospectId]) return  // déjà chargé
    const { data } = await supabase
      .from('prospect_activities')
      .select('*')
      .eq('prospect_id', prospectId)
      .order('occurred_at', { ascending: false })
    setActivities(prev => ({ ...prev, [prospectId]: data || [] }))
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ----- Loader ------------------------------------------------------------
  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', flexDirection: 'column', gap: 16
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: 'linear-gradient(135deg,#4C1D95,#7C3AED)',
        animation: 'pulse 1.5s ease-in-out infinite'
      }}/>
      <p style={{ color: '#6D28D9', fontWeight: 700 }}>Chargement du pipeline…</p>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )

  // ----- Calculs dérivés ---------------------------------------------------
  const byStage = stages.reduce((acc, s) => {
    acc[s.id] = prospects.filter(p => p.stage_id === s.id)
    return acc
  }, {})

  const openProspects = prospects.filter(p => !p.date_fin)
  const wonStageIds   = new Set(stages.filter(s => s.is_won ).map(s => s.id))
  const lostStageIds  = new Set(stages.filter(s => s.is_lost).map(s => s.id))

  const totalOpen  = openProspects.reduce((s, p) => s + Number(p.valeur_eur || 0), 0)
  const totalWon   = prospects
    .filter(p => wonStageIds.has(p.stage_id))
    .reduce((s, p) => s + Number(p.valeur_eur || 0), 0)
  const wonCount   = prospects.filter(p => wonStageIds.has(p.stage_id)).length

  // Pondéré (multiplicateurs simples par étape, à affiner plus tard)
  const STAGE_WEIGHT = { 1: .10, 2: .25, 3: .40, 4: .55, 5: .75, 6: 1.0, 7: 0 }
  const weighted = openProspects.reduce(
    (s, p) => s + Number(p.valeur_eur || 0) * (STAGE_WEIGHT[p.stage_id] || 0),
    0
  )

  // Conversion globale Lead → Gagné (sur deals clos)
  const closed = prospects.filter(p => wonStageIds.has(p.stage_id) || lostStageIds.has(p.stage_id))
  const conversionGlobal = closed.length
    ? Math.round(100 * wonCount / closed.length)
    : 0

  // Cycle moyen sur deals gagnés
  const cycleAvg = (() => {
    const wonWithDates = prospects.filter(p => wonStageIds.has(p.stage_id) && p.date_fin && p.date_debut)
    if (!wonWithDates.length) return null
    const total = wonWithDates.reduce(
      (s, p) => s + (new Date(p.date_fin) - new Date(p.date_debut)) / 86400000, 0)
    return Math.round(total / wonWithDates.length)
  })()

  // Stand-by · 2 nouveaux prospects / semaine
  const wk = startOfWeek()
  const newThisWeek = prospects.filter(p => new Date(p.created_at) >= wk).length
  const target = 2

  // Insights pivot · pire conversion et pire délai
  const transitions = funnel.filter(f => !stages.find(s => s.id === f.stage_id)?.is_won
                                       && !stages.find(s => s.id === f.stage_id)?.is_lost)
  const worstConv = transitions.reduce((w, f) =>
    !w || Number(f.conversion_pct) < Number(w.conversion_pct) ? f : w, null)
  const worstTime = transitions.reduce((w, f) =>
    !w || Number(f.avg_days_in_stage) > Number(w.avg_days_in_stage) ? f : w, null)

  // -------------------------------------------------------------------------
  return (
    <div style={{ minHeight: '100vh', background: '#F5F3FF' }}>

      {/* Header sticky */}
      <div style={{
        background: '#fff', borderBottom: '2px solid #EDE9FE',
        padding: '0 28px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 8px rgba(109,40,217,.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontStyle: 'italic', fontWeight: 800, fontSize: 26,
            background: 'linear-gradient(135deg,#4C1D95,#7C3AED,#A855F7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>PHYSICARE®</span>
          <nav className="nav" style={{ display: 'flex', gap: 4 }}>
            <a href="/dashboard">Clients</a>
            <a href="/pipeline" className="active">Pipeline</a>
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>{user?.email}</span>
          <button className="btn-ghost" onClick={logout} style={{ fontSize: 12, padding: '8px 16px' }}>
            🔓 Déconnexion
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>

        {/* Titre + actions */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 20, flexWrap: 'wrap', gap: 12
        }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.02em', marginBottom: 4 }}>
              Pipeline commercial
            </h1>
            <p style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 700 }}>
              {prospects.length} deal{prospects.length > 1 ? 's' : ''} · {openProspects.length} en cours
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" style={{ fontSize: 12, padding: '9px 16px' }}>Filtres</button>
            <button className="btn-ghost" style={{ fontSize: 12, padding: '9px 16px' }}>Exporter</button>
            <button className="btn-primary" style={{ fontSize: 13, padding: '10px 20px' }}>+ Nouveau deal</button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
          <div className="kpi" style={{ background: 'linear-gradient(135deg,#6D28D9dd,#6D28D9)' }}>
            <div className="kpi-label">Pipeline pondéré</div>
            <div className="kpi-val">{fmtEur(weighted)}</div>
            <div className="kpi-sub">Sur {fmtEur(totalOpen)} total ouvert</div>
          </div>
          <div className="kpi" style={{ background: 'linear-gradient(135deg,#059669dd,#059669)' }}>
            <div className="kpi-label">Gagné</div>
            <div className="kpi-val">{fmtEur(totalWon)}</div>
            <div className="kpi-sub">{wonCount} deal{wonCount > 1 ? 's' : ''} signé{wonCount > 1 ? 's' : ''}</div>
          </div>
          <div className="kpi" style={{ background: 'linear-gradient(135deg,#D97706dd,#D97706)' }}>
            <div className="kpi-label">Conversion</div>
            <div className="kpi-val">{conversionGlobal} %</div>
            <div className="kpi-sub">Lead → Gagné · sur {closed.length} deals clos</div>
          </div>
          <div className="kpi" style={{ background: 'linear-gradient(135deg,#0891B2dd,#0891B2)' }}>
            <div className="kpi-label">Cycle moyen</div>
            <div className="kpi-val">{cycleAvg !== null ? `${cycleAvg} j` : '—'}</div>
            <div className="kpi-sub">Début → signature</div>
          </div>
        </div>

        {/* Stand-by · objectif 2 nouveaux prospects / semaine */}
        <div className="standby">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
            <div className="standby-icon">🎯</div>
            <div>
              <h3>Objectif acquisition · 2 nouveaux prospects / semaine</h3>
              <p>
                Semaine en cours ·{' '}
                {standBy.length > 0
                  ? `${standBy.length} deal${standBy.length > 1 ? 's' : ''} en stand-by → relancer ou archiver`
                  : 'aucun deal en stand-by'}
              </p>
            </div>
          </div>
          <div className="standby-counter">
            <span className="standby-num">
              {newThisWeek}<span style={{ opacity: .5, fontSize: 14 }}>/{target}</span>
            </span>
            <div className="standby-progress">
              <div style={{ width: `${Math.min(100, (newThisWeek / target) * 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Kanban */}
        <div className="board">
          {stages.map(stage => {
            const list = byStage[stage.id] || []
            const sum  = list.reduce((s, p) => s + Number(p.valeur_eur || 0), 0)
            const cls  = stage.is_won ? 'column is-won' : stage.is_lost ? 'column is-lost' : 'column'
            const prefix = stage.is_won ? '✓ ' : stage.is_lost ? '✕ ' : '● '

            return (
              <div key={stage.id} className={cls}>
                <div className="col-head">
                  <div>
                    <div className="col-title" style={{ color: stage.color }}>{prefix}{stage.label}</div>
                    <div className="col-sum">{fmtEur(sum)} · {list.length} deal{list.length > 1 ? 's' : ''}</div>
                  </div>
                  <span className="col-count" style={{
                    color: stage.color, border: `2px solid ${stage.color}55`
                  }}>{list.length}</span>
                </div>

                {list.map(p => {
                  const na   = nextActions[p.id]
                  const due  = na ? dueBadge(na.due_at) : null
                  const acts = activities[p.id]
                  const isWon  = wonStageIds.has(p.stage_id)
                  const isLost = lostStageIds.has(p.stage_id)
                  const cycleDays = p.date_fin
                    ? Math.round((new Date(p.date_fin) - new Date(p.date_debut)) / 86400000)
                    : daysSince(p.date_debut)

                  return (
                    <div key={p.id} className={`deal ${isLost ? 'is-lost' : ''}`}>
                      <div className="deal-head">
                        <div className="logo" style={{ background: colorFor(p.nom_enseigne) }}>
                          {(p.nom_enseigne || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="deal-name">{p.nom_enseigne}</div>
                          <div className="deal-contact">
                            {p.contact_nom}{p.contact_role ? ` · ${p.contact_role}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className={`deal-value ${isWon ? 'is-won' : ''} ${isLost ? 'is-lost' : ''}`}>
                        {fmtEur(p.valeur_eur)}
                      </div>

                      <div className="dates">
                        <div>Début<b>{fmtDate(p.date_debut)}</b></div>
                        <div style={{ textAlign: 'right' }}>
                          {p.date_fin ? <>Fin<b>{fmtDate(p.date_fin)}</b></> : <>Stade<b>J+{cycleDays}</b></>}
                        </div>
                      </div>

                      <div className="deal-meta">
                        <span className="tag" style={{
                          background: isWon ? '#D1FAE5' : isLost ? '#FEE2E2' : '#EDE9FE',
                          color: isWon ? '#065F46' : isLost ? '#991B1B' : '#6D28D9'
                        }}>
                          {p.points_vente ? `${p.points_vente} pts vente`
                            : isWon ? `Cycle ${cycleDays} j`
                            : isLost ? (p.motif_perdu || 'Clôturé')
                            : (p.source || 'Inbound')}
                        </span>
                        {p.owner_id && (
                          <div className="owner" style={{ background: colorFor(p.id) }}>
                            {(user?.email || '?').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Prochaine action (bandeau violet) — distincte de la dernière action faite */}
                      {na && !isWon && !isLost && (
                        <div className="next-action">
                          <span>{NEXT_ACTION_ICONS[na.kind] || '•'}</span>
                          <span>{na.label}</span>
                          {due && (
                            <span className={`due ${due.overdue ? 'overdue' : ''}`}>{due.text}</span>
                          )}
                        </div>
                      )}

                      {/* Historique daté — chargement lazy au premier open */}
                      <details className="history" onToggle={e => e.target.open && loadHistory(p.id)}>
                        <summary>
                          {acts ? `Historique · ${acts.length} action${acts.length > 1 ? 's' : ''}` : 'Historique · charger'}
                        </summary>
                        {acts && acts.length > 0 && (
                          <ul className="timeline">
                            {acts.map(a => (
                              <li key={a.id}>
                                <span className="date">{fmtDateShort(a.occurred_at)}</span>
                                {ACTIVITY_ICONS[a.kind] || ''} {a.label}
                              </li>
                            ))}
                          </ul>
                        )}
                        {acts && acts.length === 0 && (
                          <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, padding: '6px 4px' }}>
                            Aucune activité enregistrée.
                          </p>
                        )}
                      </details>
                    </div>
                  )
                })}

                {list.length === 0 && (
                  <div style={{
                    textAlign: 'center', fontSize: 11, color: '#9CA3AF',
                    fontWeight: 700, padding: '20px 8px',
                    border: '2px dashed #E5E7EB', borderRadius: 10
                  }}>
                    Aucun deal
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Pivot · Analyse parcours */}
        {funnel.length > 0 && (
          <div className="pivot">
            <h2>Analyse parcours · temps moyen et conversion par étape</h2>
            <p className="sub">
              Tableau croisé alimenté par l'historique daté de chaque deal · sur {closed.length} deal{closed.length > 1 ? 's' : ''} clos
            </p>

            <table className="pv">
              <thead>
                <tr>
                  <th style={{ width: '24%' }}>Étape</th>
                  <th style={{ width: '18%' }}>Temps moyen</th>
                  <th style={{ width: '30%' }}>Distribution</th>
                  <th style={{ width: '14%' }}>Deals entrés</th>
                  <th style={{ width: '14%' }}>Conversion ➜ suivante</th>
                </tr>
              </thead>
              <tbody>
                {funnel.map(f => {
                  const stage = stages.find(s => s.id === f.stage_id)
                  if (stage?.is_won || stage?.is_lost) return null
                  const days = Number(f.avg_days_in_stage || 0)
                  const conv = Number(f.conversion_pct || 0)
                  const rowBg = days > 18 ? '#FEF2F2' : days > 12 ? '#FFFBEB' : 'transparent'
                  const dayColor = days > 18 ? '#DC2626' : days > 12 ? '#D97706' : 'inherit'
                  const maxDays = Math.max(...funnel.map(x => Number(x.avg_days_in_stage || 0)), 1)
                  return (
                    <tr key={f.stage_id} style={{ background: rowBg }}>
                      <td><b>{f.label}</b></td>
                      <td className="num" style={{ color: dayColor }}>{days.toFixed(1)} j</td>
                      <td><div className="bar"><div style={{ width: `${(days / maxDays) * 100}%` }}/></div></td>
                      <td className="num">{f.deals_entered}</td>
                      <td><span className={`conv ${convClass(conv)}`}>{conv} %</span></td>
                    </tr>
                  )
                })}
                <tr style={{ borderTop: '2px solid #E5E7EB' }}>
                  <td><b>Total Lead → Gagné</b></td>
                  <td className="num" style={{ color: '#6D28D9' }}>
                    {cycleAvg !== null ? `${cycleAvg} j` : '—'}
                  </td>
                  <td colSpan="2"></td>
                  <td><span className={`conv ${convClass(conversionGlobal)}`}>{conversionGlobal} %</span></td>
                </tr>
              </tbody>
            </table>

            {(worstTime || worstConv) && (
              <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                {worstTime && (
                  <div style={{ background: '#FFFBEB', border: '2px solid #FDE68A', borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 10, color: '#D97706', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
                      ⚠ Délai le plus long
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', lineHeight: 1.45 }}>
                      <b>{worstTime.label}</b> · {Number(worstTime.avg_days_in_stage).toFixed(1)} j en moyenne. À raccourcir.
                    </p>
                  </div>
                )}
                {worstConv && (
                  <div style={{ background: '#FEF2F2', border: '2px solid #FECACA', borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
                      ⚠ Pire conversion
                    </div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', lineHeight: 1.45 }}>
                      <b>{worstConv.label} → suivante</b> · {Number(worstConv.conversion_pct)} %. Mettre en place des relances systématiques.
                    </p>
                  </div>
                )}
                <div style={{ background: '#ECFDF5', border: '2px solid #A7F3D0', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 10, color: '#059669', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
                    Conversion globale
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', lineHeight: 1.45 }}>
                    <b>{conversionGlobal} %</b> de Lead → Gagné sur les {closed.length} deals clos. Cycle moyen {cycleAvg !== null ? `${cycleAvg} j` : '—'}.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <link
        href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@1,800&display=swap"
        rel="stylesheet"
      />
    </div>
  )
}
