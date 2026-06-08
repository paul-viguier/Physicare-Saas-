// ═══════════════════════════════════════════════
//  PHYSICARE® — Espace apprenant : catalogue des parcours
// ═══════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthGuard } from '@/core/auth'
import { AppHeader, SpaceNav, Loader, EmptyState, styles, COLORS } from '@/core/ui'
import { getAxesByCategory } from '@/lib/db/training'

const NAV = [
  { href: '/app', label: 'Parcours' },
  { href: '/app/diagnostic', label: 'Mon diagnostic' },
]

export default function LearnerHome() {
  const { loading, profile } = useAuthGuard(['employee', 'manager', 'org_admin', 'super_admin'])
  const [groups, setGroups] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (loading) return
    getAxesByCategory().then(setGroups).catch(e => setError(e.message))
  }, [loading])

  if (loading) return <Loader />

  return (
    <div style={styles.page}>
      <AppHeader profile={profile} badge="Apprenant" />
      <SpaceNav items={NAV} />
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'28px 20px' }}>
        <h1 style={{ fontSize:22, fontWeight:900, color:COLORS.text, marginBottom:4 }}>Parcours de formation</h1>
        <p style={{ fontSize:13, color:COLORS.muted, fontWeight:600, marginBottom:24 }}>
          Des modules courts de santé comportementale, organisés par thématique.
        </p>

        {error && <div style={styles.err}>❌ {error}</div>}
        {!groups && !error && <p style={{ color:COLORS.muted, fontWeight:700 }}>Chargement du catalogue…</p>}
        {groups && groups.length === 0 && <EmptyState title="Aucun parcours disponible">Le catalogue est vide pour le moment.</EmptyState>}

        {groups && groups.map(g => (
          <div key={g.category} style={{ marginBottom:30 }}>
            <h2 style={{ fontSize:13, fontWeight:900, color:COLORS.purple, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}>
              {g.label}
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14 }}>
              {g.axes.map(axe => (
                <Link key={axe.id} href={`/app/axe/${axe.id}`} style={{ textDecoration:'none' }}>
                  <div style={{ ...styles.card, height:'100%', cursor:'pointer', transition:'transform .15s' }}
                    onMouseEnter={e => e.currentTarget.style.transform='translateY(-3px)'}
                    onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
                    <div style={{ fontSize:15, fontWeight:800, color:COLORS.text, marginBottom:6 }}>{axe.title}</div>
                    {axe.description && (
                      <div style={{ fontSize:12, color:COLORS.muted, fontWeight:600, marginBottom:12,
                        display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                        {axe.description}
                      </div>
                    )}
                    <div style={{ fontSize:12, color:COLORS.purple, fontWeight:800 }}>
                      {axe.nb_modules || 0} modules · {axe.module_duration_minutes || 5} min →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
