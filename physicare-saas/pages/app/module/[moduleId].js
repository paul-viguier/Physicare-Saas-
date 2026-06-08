// ═══════════════════════════════════════════════
//  PHYSICARE® — Espace apprenant : un module et ses leçons
// ═══════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuthGuard } from '@/core/auth'
import { AppHeader, Loader, EmptyState, styles, COLORS } from '@/core/ui'
import { getModule, getLessonsByModule } from '@/lib/db/training'

const KIND_ICON = { video:'🎬', quiz:'❓', text:'📖', reading:'📖', exercise:'✍️', audio:'🎧' }

export default function ModulePage() {
  const { loading, profile } = useAuthGuard(['employee', 'manager', 'org_admin', 'super_admin'])
  const router = useRouter()
  const { moduleId } = router.query
  const [mod, setMod] = useState(null)
  const [lessons, setLessons] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (loading || !moduleId) return
    Promise.all([getModule(moduleId), getLessonsByModule(moduleId)])
      .then(([m, l]) => { setMod(m); setLessons(l) })
      .catch(e => setError(e.message))
  }, [loading, moduleId])

  if (loading) return <Loader />

  return (
    <div style={styles.page}>
      <AppHeader profile={profile} badge="Apprenant" />
      <div style={{ maxWidth:820, margin:'0 auto', padding:'24px 20px' }}>
        <Link href={mod ? `/app/axe/${mod.axis_id}` : '/app'} style={{ fontSize:13, color:COLORS.muted, fontWeight:700, textDecoration:'none' }}>← Retour au parcours</Link>

        {error && <div style={{ ...styles.err, marginTop:16 }}>❌ {error}</div>}
        {!mod && !error && <p style={{ color:COLORS.muted, fontWeight:700, marginTop:16 }}>Chargement…</p>}

        {mod && (
          <div style={{ margin:'14px 0 22px' }}>
            <h1 style={{ fontSize:24, fontWeight:900, color:COLORS.text, marginBottom:8 }}>{mod.title}</h1>
            {mod.subtitle && <p style={{ fontSize:15, color:COLORS.purple, fontWeight:700, marginBottom:8 }}>{mod.subtitle}</p>}
            {mod.description && <p style={{ fontSize:14, color:'#4B5563', fontWeight:600, marginBottom:12 }}>{mod.description}</p>}
            <div style={{ fontSize:12, color:COLORS.muted, fontWeight:700 }}>
              {mod.duration_minutes || 5} min · {mod.xp_reward || 0} XP{mod.is_certification ? ' · ★ Certifiant' : ''}
            </div>
          </div>
        )}

        {lessons && lessons.length === 0 && <EmptyState title="Aucune leçon">Ce module n'a pas encore de contenu.</EmptyState>}

        {lessons && lessons.length > 0 && (
          <>
            <h2 style={{ fontSize:13, fontWeight:900, color:COLORS.purple, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}>
              {lessons.length} leçon{lessons.length > 1 ? 's' : ''}
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {lessons.map((l, i) => (
                <div key={l.id} style={{ ...styles.card, display:'flex', alignItems:'center', gap:12, padding:'12px 16px' }}>
                  <span style={{ fontSize:18 }}>{KIND_ICON[l.kind] || '•'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:COLORS.text }}>{l.title || `Leçon ${i + 1}`}</div>
                    {l.kind && <div style={{ fontSize:11, color:COLORS.muted, fontWeight:700, textTransform:'capitalize' }}>{l.kind}</div>}
                  </div>
                  {l.duration_seconds ? (
                    <div style={{ fontSize:12, color:COLORS.muted, fontWeight:700 }}>{Math.round(l.duration_seconds / 60)} min</div>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
