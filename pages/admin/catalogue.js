// ═══════════════════════════════════════════════
//  PHYSICARE® — Back-office : catalogue de formation
//  Vue super_admin du catalogue (axes par catégorie).
// ═══════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthGuard } from '@/core/auth'
import { AppHeader, SpaceNav, Loader, styles, COLORS, ADMIN_NAV } from '@/core/ui'
import { getAxesByCategory } from '@/lib/db/training'

export default function Catalogue() {
  const { loading, profile } = useAuthGuard(['super_admin'])
  const [groups, setGroups] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (loading) return
    getAxesByCategory().then(setGroups).catch(e => setError(e.message))
  }, [loading])

  if (loading) return <Loader />

  const totalAxes = groups ? groups.reduce((s, g) => s + g.axes.length, 0) : 0
  const totalModules = groups ? groups.reduce((s, g) => s + g.axes.reduce((a, x) => a + (x.nb_modules || 0), 0), 0) : 0

  return (
    <div style={styles.page}>
      <AppHeader profile={profile} badge="Back-office" />
      <SpaceNav items={ADMIN_NAV} />
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'28px 20px' }}>
        <h1 style={{ fontSize:22, fontWeight:900, color:COLORS.text, marginBottom:4 }}>Catalogue de formation</h1>
        <p style={{ fontSize:13, color:COLORS.muted, fontWeight:600, marginBottom:24 }}>
          {groups ? `${totalAxes} axes · ${totalModules} modules` : 'Chargement…'}
        </p>

        {error && <div style={styles.err}>❌ {error}</div>}

        {groups && groups.map(g => (
          <div key={g.category} style={{ marginBottom:28 }}>
            <h2 style={{ fontSize:13, fontWeight:900, color:COLORS.purple, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}>
              {g.label} · {g.axes.length}
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12 }}>
              {g.axes.map(axe => (
                <Link key={axe.id} href={`/app/axe/${axe.id}`} style={{ textDecoration:'none' }}>
                  <div style={{ ...styles.card, cursor:'pointer', padding:'14px 16px' }}>
                    <div style={{ fontSize:14, fontWeight:800, color:COLORS.text, marginBottom:6 }}>{axe.title}</div>
                    <div style={{ fontSize:12, color:COLORS.purple, fontWeight:800 }}>{axe.nb_modules || 0} modules →</div>
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
