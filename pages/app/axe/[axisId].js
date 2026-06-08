// ═══════════════════════════════════════════════
//  PHYSICARE® — Espace apprenant : un parcours et ses modules
// ═══════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuthGuard } from '@/core/auth'
import { AppHeader, Loader, EmptyState, styles, COLORS } from '@/core/ui'
import { getAxis, getModulesByAxis, CATEGORY_LABEL } from '@/lib/db/training'

export default function AxisPage() {
  const { loading, profile } = useAuthGuard(['employee', 'manager', 'org_admin', 'super_admin'])
  const router = useRouter()
  const { axisId } = router.query
  const [axis, setAxis] = useState(null)
  const [modules, setModules] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (loading || !axisId) return
    Promise.all([getAxis(axisId), getModulesByAxis(axisId)])
      .then(([a, m]) => { setAxis(a); setModules(m) })
      .catch(e => setError(e.message))
  }, [loading, axisId])

  if (loading) return <Loader />

  return (
    <div style={styles.page}>
      <AppHeader profile={profile} badge="Apprenant" />
      <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 20px' }}>
        <Link href="/app" style={{ fontSize:13, color:COLORS.muted, fontWeight:700, textDecoration:'none' }}>← Tous les parcours</Link>

        {error && <div style={{ ...styles.err, marginTop:16 }}>❌ {error}</div>}
        {!axis && !error && <p style={{ color:COLORS.muted, fontWeight:700, marginTop:16 }}>Chargement…</p>}

        {axis && (
          <div style={{ margin:'14px 0 22px' }}>
            <div style={{ fontSize:12, fontWeight:800, color:COLORS.purple, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>
              {CATEGORY_LABEL[axis.category] || axis.category}
            </div>
            <h1 style={{ fontSize:24, fontWeight:900, color:COLORS.text, marginBottom:8 }}>{axis.title}</h1>
            {axis.description && <p style={{ fontSize:14, color:'#4B5563', fontWeight:600 }}>{axis.description}</p>}
          </div>
        )}

        {modules && modules.length === 0 && <EmptyState title="Aucun module">Ce parcours n'a pas encore de modules.</EmptyState>}

        {modules && modules.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {modules.map((m, i) => (
              <Link key={m.id} href={`/app/module/${m.id}`} style={{ textDecoration:'none' }}>
                <div style={{ ...styles.card, display:'flex', alignItems:'center', gap:14, cursor:'pointer', padding:'14px 18px' }}>
                  <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0,
                    background: m.is_certification ? '#D97706' : 'linear-gradient(135deg,#6D28D9,#8B5CF6)',
                    color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900 }}>
                    {m.is_certification ? '★' : i + 1}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:800, color:COLORS.text }}>{m.title}</div>
                    {m.subtitle && <div style={{ fontSize:12, color:COLORS.muted, fontWeight:600 }}>{m.subtitle}</div>}
                  </div>
                  <div style={{ fontSize:12, color:COLORS.muted, fontWeight:700, whiteSpace:'nowrap' }}>
                    {m.duration_minutes || 5} min · {m.xp_reward || 0} XP
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
