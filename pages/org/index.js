// ═══════════════════════════════════════════════
//  PHYSICARE® — Dashboard organisation (org_admin)
//  Vue agrégée de l'organisation de l'utilisateur.
// ═══════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useAuthGuard } from '@/core/auth'
import { AppHeader, Loader, EmptyState, StatCard, styles, COLORS } from '@/core/ui'
import { getOrganization } from '@/lib/db/organizations'
import { getOrgAggregates } from '@/lib/db/aggregates'

function fmt(v) { return v == null ? '—' : Number(v).toFixed(2).replace('.', ',') }
function pct(v) { return v == null ? '—' : Math.round(Number(v) * 100) + '%' }

export default function OrgHome() {
  const { loading, profile } = useAuthGuard(['org_admin'])
  const [org, setOrg] = useState(null)
  const [agg, setAgg] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (loading || !profile?.org_id) return
    getOrganization(profile.org_id).then(setOrg).catch(() => {})
    getOrgAggregates(profile.org_id).then(rows => setAgg(rows[0] || null)).catch(e => setError(e.message))
  }, [loading, profile])

  if (loading) return <Loader />

  return (
    <div style={styles.page}>
      <AppHeader profile={profile} badge="Organisation" />
      <div style={{ maxWidth:1000, margin:'0 auto', padding:'28px 20px' }}>
        <h1 style={{ fontSize:22, fontWeight:900, color:COLORS.text, marginBottom:4 }}>
          {org?.name || 'Mon organisation'}
        </h1>
        <p style={{ fontSize:13, color:COLORS.muted, fontWeight:600, marginBottom:24 }}>
          Indicateurs agrégés et anonymisés de votre organisation.
        </p>

        {error && <div style={styles.err}>❌ {error}</div>}

        {agg ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:14 }}>
            <StatCard label="Répondants" value={agg.respondent_count ?? '—'} color={COLORS.purple} />
            <StatCard label="Régulation" value={fmt(agg.regulation_avg)} />
            <StatCard label="Appropriation" value={fmt(agg.appropriation_avg)} />
            <StatCard label="Continuité" value={fmt(agg.continuite_avg)} />
            <StatCard label="Participation" value={pct(agg.participation_rate)} color="#059669" />
            <StatCard label="Complétion T0" value={pct(agg.completion_rate_t0)} color="#0891B2" />
          </div>
        ) : !error && (
          <EmptyState icon="📊" title="Pas encore de données agrégées">
            Les indicateurs de votre organisation apparaîtront dès qu'un volume suffisant de
            réponses sera atteint (seuil d'anonymat).
          </EmptyState>
        )}
      </div>
    </div>
  )
}
