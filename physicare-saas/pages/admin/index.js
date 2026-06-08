// ═══════════════════════════════════════════════
//  PHYSICARE® — Back-office (super_admin)
//  Premier écran réel : liste des organisations clientes.
// ═══════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useAuthGuard } from '@/core/auth'
import { AppHeader, Loader, styles, COLORS } from '@/core/ui'
import { getOrganizations } from '@/lib/db/organizations'

const STAGE_COLOR = {
  cadrage:'#9CA3AF', sprints:'#6366F1', diagnostic:'#D97706',
  backlog:'#0891B2', actif:'#059669', archive:'#DC2626',
}

export default function AdminHome() {
  const { loading, profile } = useAuthGuard(['super_admin'])
  const [orgs, setOrgs] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (loading) return
    getOrganizations().then(setOrgs).catch(e => setError(e.message))
  }, [loading])

  if (loading) return <Loader label="Chargement du back-office…" />

  return (
    <div style={styles.page}>
      <AppHeader profile={profile} badge="Back-office" />
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'28px 20px' }}>
        <h1 style={{ fontSize:22, fontWeight:900, color:COLORS.text, marginBottom:4 }}>Organisations</h1>
        <p style={{ fontSize:13, color:COLORS.muted, fontWeight:600, marginBottom:22 }}>
          {orgs ? `${orgs.length} organisation${orgs.length > 1 ? 's' : ''}` : 'Données en direct depuis Supabase'}
        </p>

        {error && <div style={styles.err}>❌ {error}</div>}
        {!orgs && !error && <p style={{ color:COLORS.muted, fontWeight:700 }}>Chargement des organisations…</p>}

        {orgs && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:16 }}>
            {orgs.map(o => {
              const stage = (o.lifecycle_stage || '').toLowerCase()
              const color = STAGE_COLOR[stage] || COLORS.purple
              return (
                <div key={o.id} style={{ ...styles.card, borderLeft:`4px solid ${color}` }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <div style={{ fontSize:15, fontWeight:800, color:COLORS.text }}>{o.name}</div>
                    {o.lifecycle_stage && (
                      <span style={{ fontSize:11, fontWeight:800, padding:'3px 10px', borderRadius:999,
                        background:color+'18', color, border:`2px solid ${color}44` }}>
                        {o.lifecycle_stage}
                      </span>
                    )}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <Stat label="Secteur" value={o.sector || '—'} />
                    <Stat label="Effectif" value={o.total_employees ?? '—'} />
                  </div>
                </div>
              )
            })}
            {orgs.length === 0 && (
              <div style={{ ...styles.card, textAlign:'center', color:COLORS.muted, fontWeight:700 }}>
                Aucune organisation visible. Vérifiez les policies RLS.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{ background:'#F9FAFB', borderRadius:8, padding:'10px 12px' }}>
      <div style={{ fontSize:10, color:COLORS.muted, fontWeight:800, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:15, fontWeight:900, color:COLORS.text }}>{value}</div>
    </div>
  )
}
