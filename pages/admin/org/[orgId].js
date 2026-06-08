// ═══════════════════════════════════════════════
//  PHYSICARE® — Back-office : détail d'une organisation
// ═══════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuthGuard } from '@/core/auth'
import { AppHeader, Loader, EmptyState, StatCard, styles, COLORS, STAGE_COLOR } from '@/core/ui'
import { getOrganization, getTeamsByOrg, getUserCountByOrg } from '@/lib/db/organizations'
import { getOrgAggregates } from '@/lib/db/aggregates'

function fmt(v) { return v == null ? '—' : Number(v).toFixed(2).replace('.', ',') }
function pct(v) { return v == null ? '—' : Math.round(Number(v) * 100) + '%' }

export default function OrgDetail() {
  const { loading, profile } = useAuthGuard(['super_admin'])
  const router = useRouter()
  const { orgId } = router.query
  const [org, setOrg] = useState(null)
  const [teams, setTeams] = useState([])
  const [userCount, setUserCount] = useState(null)
  const [agg, setAgg] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (loading || !orgId) return
    Promise.all([
      getOrganization(orgId),
      getTeamsByOrg(orgId),
      getUserCountByOrg(orgId),
      getOrgAggregates(orgId),
    ]).then(([o, t, c, a]) => {
      setOrg(o); setTeams(t); setUserCount(c); setAgg(a[0] || null)
    }).catch(e => setError(e.message))
  }, [loading, orgId])

  if (loading) return <Loader />

  const stage = (org?.lifecycle_stage || '').toLowerCase()
  const color = STAGE_COLOR[stage] || COLORS.purple

  return (
    <div style={styles.page}>
      <AppHeader profile={profile} badge="Back-office" />
      <div style={{ maxWidth:1000, margin:'0 auto', padding:'24px 20px' }}>
        <Link href="/admin" style={{ fontSize:13, color:COLORS.muted, fontWeight:700, textDecoration:'none' }}>← Toutes les organisations</Link>

        {error && <div style={{ ...styles.err, marginTop:16 }}>❌ {error}</div>}
        {!org && !error && <p style={{ color:COLORS.muted, fontWeight:700, marginTop:16 }}>Chargement…</p>}

        {org && (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:12, margin:'14px 0 22px' }}>
              <h1 style={{ fontSize:24, fontWeight:900, color:COLORS.text }}>{org.name}</h1>
              {org.lifecycle_stage && (
                <span style={{ fontSize:12, fontWeight:800, padding:'4px 12px', borderRadius:999,
                  background:color+'18', color, border:`2px solid ${color}44` }}>{org.lifecycle_stage}</span>
              )}
            </div>

            {/* Infos */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:14, marginBottom:26 }}>
              <StatCard label="Effectif" value={org.total_employees ?? '—'} color={COLORS.purple} />
              <StatCard label="Utilisateurs" value={userCount ?? '—'} />
              <StatCard label="Équipes" value={teams.length} />
              <StatCard label="Secteur" value={org.sector || '—'} />
            </div>

            {/* Indicateurs agrégés */}
            <h2 style={{ fontSize:13, fontWeight:900, color:COLORS.purple, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}>
              Indicateurs (T0)
            </h2>
            {agg ? (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:14, marginBottom:26 }}>
                <StatCard label="Répondants" value={agg.respondent_count ?? '—'} color={COLORS.purple} />
                <StatCard label="Régulation" value={fmt(agg.regulation_avg)} />
                <StatCard label="Appropriation" value={fmt(agg.appropriation_avg)} />
                <StatCard label="Continuité" value={fmt(agg.continuite_avg)} />
                <StatCard label="Participation" value={pct(agg.participation_rate)} color="#059669" />
              </div>
            ) : (
              <div style={{ marginBottom:26 }}>
                <EmptyState icon="📊" title="Pas d'indicateurs">Aucune donnée agrégée pour cette organisation.</EmptyState>
              </div>
            )}

            {/* Équipes */}
            <h2 style={{ fontSize:13, fontWeight:900, color:COLORS.purple, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}>
              Équipes ({teams.length})
            </h2>
            {teams.length === 0 ? (
              <EmptyState icon="👥" title="Aucune équipe">Cette organisation n'a pas encore d'équipe.</EmptyState>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {teams.map(t => (
                  <div key={t.id} style={{ ...styles.card, padding:'12px 16px', fontSize:14, fontWeight:800, color:COLORS.text }}>
                    {t.name}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
