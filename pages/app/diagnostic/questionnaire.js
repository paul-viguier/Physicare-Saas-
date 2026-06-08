// ═══════════════════════════════════════════════
//  PHYSICARE® — Questionnaire diagnostic (T0)
//  L'apprenant répond ; les scores sont calculés côté base.
// ═══════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuthGuard } from '@/core/auth'
import { AppHeader, Loader, EmptyState, styles, COLORS } from '@/core/ui'
import { getActiveQuestions, submitDiagnostic } from '@/lib/db/diagnostics'

const SCALE = [1, 2, 3, 4, 5]

export default function Questionnaire() {
  const { loading, profile } = useAuthGuard(['employee', 'manager', 'org_admin', 'super_admin'])
  const router = useRouter()
  const [questions, setQuestions] = useState(null)
  const [answers, setAnswers] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (loading) return
    getActiveQuestions().then(setQuestions).catch(e => setError(e.message))
  }, [loading])

  if (loading) return <Loader />

  const total = questions?.length || 0
  const answered = Object.keys(answers).length
  const allAnswered = total > 0 && answered === total

  // Regrouper par module (en conservant l'ordre)
  const groups = []
  const idx = {}
  ;(questions || []).forEach(q => {
    if (!(q.module in idx)) { idx[q.module] = groups.length; groups.push({ module: q.module, label: q.module_label, items: [] }) }
    groups[idx[q.module]].items.push(q)
  })

  async function handleSubmit() {
    setSubmitting(true); setError('')
    try {
      await submitDiagnostic(answers)
      router.replace('/app/diagnostic')
    } catch (e) {
      setError(e.message || 'Erreur lors de l\'enregistrement.')
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.page}>
      <AppHeader profile={profile} badge="Diagnostic" />

      {/* Barre de progression */}
      <div style={{ position:'sticky', top:62, zIndex:90, background:'#fff', borderBottom:`1px solid ${COLORS.border}`, padding:'10px 20px' }}>
        <div style={{ maxWidth:760, margin:'0 auto', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ flex:1, height:8, background:'#EDE9FE', borderRadius:999, overflow:'hidden' }}>
            <div style={{ width: total ? `${answered/total*100}%` : '0%', height:'100%', background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', transition:'width .2s' }} />
          </div>
          <span style={{ fontSize:12, fontWeight:800, color:COLORS.purple, whiteSpace:'nowrap' }}>{answered}/{total}</span>
        </div>
      </div>

      <div style={{ maxWidth:760, margin:'0 auto', padding:'24px 20px 100px' }}>
        <h1 style={{ fontSize:22, fontWeight:900, color:COLORS.text, marginBottom:4 }}>Diagnostic santé comportementale</h1>
        <p style={{ fontSize:13, color:COLORS.muted, fontWeight:600, marginBottom:24 }}>
          Indiquez votre niveau d'accord (1 = pas du tout, 5 = tout à fait). Vos réponses sont confidentielles.
        </p>

        {error && <div style={styles.err}>❌ {error}</div>}
        {!questions && !error && <p style={{ color:COLORS.muted, fontWeight:700 }}>Chargement du questionnaire…</p>}
        {questions && questions.length === 0 && <EmptyState title="Aucune question">Le questionnaire n'est pas configuré.</EmptyState>}

        {groups.map(g => (
          <div key={g.module} style={{ marginBottom:24 }}>
            <h2 style={{ fontSize:13, fontWeight:900, color:COLORS.purple, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:12 }}>
              {g.label || `Module ${g.module}`}
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {g.items.map(q => (
                <div key={q.id} style={{ ...styles.card, padding:'14px 16px' }}>
                  <div style={{ fontSize:14, fontWeight:700, color:COLORS.text, marginBottom:12 }}>{q.text}</div>
                  <div style={{ display:'flex', gap:8, justifyContent:'space-between' }}>
                    {SCALE.map(v => {
                      const selected = answers[q.id] === v
                      return (
                        <button key={v} type="button"
                          onClick={() => setAnswers(a => ({ ...a, [q.id]: v }))}
                          style={{
                            flex:1, padding:'10px 0', borderRadius:8, cursor:'pointer',
                            fontSize:15, fontWeight:800,
                            border:`2px solid ${selected ? COLORS.purple : COLORS.border}`,
                            background: selected ? 'linear-gradient(135deg,#6D28D9,#8B5CF6)' : '#fff',
                            color: selected ? '#fff' : COLORS.muted,
                          }}>{v}</button>
                      )
                    })}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:10, color:COLORS.muted, fontWeight:700 }}>
                    <span>Pas du tout</span><span>Tout à fait</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Barre de validation */}
      {questions && questions.length > 0 && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'#fff', borderTop:`2px solid ${COLORS.border}`, padding:'12px 20px', boxShadow:'0 -2px 12px rgba(109,40,217,.08)' }}>
          <div style={{ maxWidth:760, margin:'0 auto', display:'flex', alignItems:'center', gap:14 }}>
            <span style={{ fontSize:13, fontWeight:700, color: allAnswered ? '#059669' : COLORS.muted }}>
              {allAnswered ? '✅ Toutes les questions sont remplies' : `Encore ${total - answered} question${total - answered > 1 ? 's' : ''}`}
            </span>
            <button style={{ ...styles.btn, width:'auto', marginLeft:'auto', opacity: allAnswered && !submitting ? 1 : .5 }}
              disabled={!allAnswered || submitting} onClick={handleSubmit}>
              {submitting ? 'Enregistrement…' : 'Valider mon diagnostic →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
