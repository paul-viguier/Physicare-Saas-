// ═══════════════════════════════════════════════
//  PHYSICARE® — Espace apprenant : mon diagnostic
//  Affiche les scores des questionnaires de l'utilisateur.
// ═══════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthGuard } from '@/core/auth'
import { AppHeader, SpaceNav, Loader, EmptyState, StatCard, styles, COLORS } from '@/core/ui'
import { getMyResponses } from '@/lib/db/diagnostics'

const NAV = [
  { href: '/app', label: 'Parcours' },
  { href: '/app/diagnostic', label: 'Mon diagnostic' },
]

const SCORE_FIELDS = [
  { key: 'regulation_score',    label: 'Régulation' },
  { key: 'appropriation_score', label: 'Appropriation' },
  { key: 'continuite_score',    label: 'Continuité' },
  { key: 'capacite_score',      label: 'Capacité' },
]

function fmt(v) { return v == null ? '—' : Number(v).toFixed(2).replace('.', ',') }

export default function DiagnosticPage() {
  const { loading, profile } = useAuthGuard(['employee', 'manager', 'org_admin', 'super_admin'])
  const [responses, setResponses] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (loading || !profile) return
    getMyResponses(profile.id).then(setResponses).catch(e => setError(e.message))
  }, [loading, profile])

  if (loading) return <Loader />

  const latest = responses && responses[0]

  return (
    <div style={styles.page}>
      <AppHeader profile={profile} badge="Apprenant" />
      <SpaceNav items={NAV} />
      <div style={{ maxWidth:900, margin:'0 auto', padding:'28px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:900, color:COLORS.text, marginBottom:4 }}>Mon diagnostic</h1>
            <p style={{ fontSize:13, color:COLORS.muted, fontWeight:600 }}>
              Vos scores de santé comportementale, par questionnaire.
            </p>
          </div>
          <Link href="/app/diagnostic/questionnaire" style={{ ...styles.btn, width:'auto', textDecoration:'none' }}>
            {responses && responses.length > 0 ? 'Refaire le diagnostic' : 'Commencer le diagnostic →'}
          </Link>
        </div>

        {error && <div style={styles.err}>❌ {error}</div>}
        {!responses && !error && <p style={{ color:COLORS.muted, fontWeight:700 }}>Chargement…</p>}
        {responses && responses.length === 0 && (
          <EmptyState icon="📝" title="Pas encore de diagnostic">
            Vous n'avez pas encore complété de questionnaire.
          </EmptyState>
        )}

        {latest && (
          <>
            <h2 style={{ fontSize:13, fontWeight:900, color:COLORS.purple, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}>
              Dernier résultat
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:14, marginBottom:28 }}>
              {SCORE_FIELDS.map(f => (
                <StatCard key={f.key} label={f.label} value={fmt(latest[f.key])} color={COLORS.purple} />
              ))}
            </div>

            <h2 style={{ fontSize:13, fontWeight:900, color:COLORS.purple, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}>
              Historique ({responses.length})
            </h2>
            <div style={{ ...styles.card, padding:0, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#EDE9FE' }}>
                    {['Date', 'Type', 'Régul.', 'Approp.', 'Contin.', 'Capac.'].map(h => (
                      <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:11, fontWeight:800, color:COLORS.purple, textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responses.map((r, i) => (
                    <tr key={r.id} style={{ background: i % 2 ? '#F9FAFB' : '#fff' }}>
                      <td style={td}>{new Date(r.created_at).toLocaleDateString('fr-FR')}</td>
                      <td style={td}>{r.questionnaire_type || '—'}</td>
                      <td style={td}>{fmt(r.regulation_score)}</td>
                      <td style={td}>{fmt(r.appropriation_score)}</td>
                      <td style={td}>{fmt(r.continuite_score)}</td>
                      <td style={td}>{fmt(r.capacite_score)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const td = { padding:'10px 12px', fontSize:13, color:'#374151', fontWeight:600, borderBottom:'1px solid #F3F4F6' }
