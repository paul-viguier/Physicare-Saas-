// ═══════════════════════════════════════════════
//  PHYSICARE® — Dashboard équipe (manager)
//  Indicateurs agrégés des équipes dont l'utilisateur est manager.
// ═══════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useAuthGuard } from '@/core/auth'
import { AppHeader, Loader, EmptyState, StatCard, styles, COLORS } from '@/core/ui'
import { getTeamsManagedBy, getTeamAggregates } from '@/lib/db/aggregates'

function fmt(v) { return v == null ? '—' : Number(v).toFixed(2).replace('.', ',') }
function pct(v) { return v == null ? '—' : Math.round(Number(v) * 100) + '%' }

export default function ManagerHome() {
  const { loading, profile } = useAuthGuard(['manager'])
  const [teams, setTeams] = useState(null)
  const [aggByTeam, setAggByTeam] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (loading || !profile) return
    getTeamsManagedBy(profile.id)
      .then(async (ts) => {
        setTeams(ts)
        const map = {}
        for (const t of ts) {
          try { map[t.id] = (await getTeamAggregates(t.id))[0] || null } catch { map[t.id] = null }
        }
        setAggByTeam(map)
      })
      .catch(e => setError(e.message))
  }, [loading, profile])

  if (loading) return <Loader />

  return (
    <div style={styles.page}>
      <AppHeader profile={profile} badge="Manager" />
      <div style={{ maxWidth:1000, margin:'0 auto', padding:'28px 20px' }}>
        <h1 style={{ fontSize:22, fontWeight:900, color:COLORS.text, marginBottom:4 }}>Dashboard équipe</h1>
        <p style={{ fontSize:13, color:COLORS.muted, fontWeight:600, marginBottom:24 }}>
          Indicateurs agrégés et anonymisés de vos équipes.
        </p>

        {error && <div style={styles.err}>❌ {error}</div>}
        {!teams && !error && <p style={{ color:COLORS.muted, fontWeight:700 }}>Chargement…</p>}
        {teams && teams.length === 0 && (
          <EmptyState icon="👥" title="Aucune équipe">Aucune équipe ne vous est rattachée comme manager.</EmptyState>
        )}

        {teams && teams.map(t => {
          const a = aggByTeam[t.id]
          return (
            <div key={t.id} style={{ marginBottom:28 }}>
              <h2 style={{ fontSize:16, fontWeight:900, color:COLORS.text, marginBottom:12 }}>{t.name}</h2>
              {a ? (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:14 }}>
                  <StatCard label="Répondants" value={a.respondent_count ?? '—'} color={COLORS.purple} />
                  <StatCard label="Régulation" value={fmt(a.regulation_avg)} />
                  <StatCard label="Appropriation" value={fmt(a.appropriation_avg)} />
                  <StatCard label="Continuité" value={fmt(a.continuite_avg)} />
                  <StatCard label="Participation" value={pct(a.participation_rate)} color="#059669" />
                </div>
              ) : (
                <EmptyState icon="📊" title="Pas encore de données">
                  Les indicateurs apparaîtront dès que l'équipe aura un volume suffisant de réponses (seuil d'anonymat).
                </EmptyState>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
