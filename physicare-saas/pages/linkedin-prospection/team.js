// PHYSICARE® — Gestion d'équipe : classement, quotas, assignation
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { isDemo, DEMO_TEAM } from '../../lib/demo'

export default function Team() {
  const [members, setMembers] = useState([])
  const [stats, setStats] = useState({})
  const [error, setError] = useState(null)

  async function load() {
    if (isDemo()) {
      setMembers(DEMO_TEAM)
      setStats(Object.fromEntries(DEMO_TEAM.map(m => [m.user_id, m.s])))
      return
    }
    // Récupère l'équipe de l'utilisateur courant
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: myMembership } = await supabase.from('prospect_team_members')
      .select('team_id').eq('user_id', user.id).maybeSingle()
    if (!myMembership) { setMembers([]); return }

    const { data: m, error: e1 } = await supabase
      .from('prospect_team_members')
      .select('user_id, role, monthly_quota')
      .eq('team_id', myMembership.team_id)
    if (e1) { setError(e1.message); return }
    setMembers(m || [])

    // Stats par owner_id (vue v_prospect_funnel)
    const { data: funnels } = await supabase.from('v_prospect_funnel').select('*')
    const map = {}
    for (const f of funnels || []) map[f.owner_id] = f
    setStats(map)
  }
  useEffect(() => { load() }, [])

  const ranked = [...members].map(m => ({ ...m, s: stats[m.user_id] || {} }))
    .sort((a, b) => (b.s.customers || 0) - (a.s.customers || 0))

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '32px 28px' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <a href="/linkedin-prospection" style={{ color: '#7C3AED', fontWeight: 800, fontSize: 13 }}>← Pipeline</a>
        <h1 style={{ fontWeight: 900, fontSize: 28, color: '#4C1D95', marginTop: 6 }}>Équipe & classement</h1>
        {error && <div style={{ color: '#DC2626', marginTop: 10 }}>{error}</div>}

        <table style={{ width: '100%', marginTop: 18, background: '#fff', borderCollapse: 'collapse', borderRadius: 12, overflow: 'hidden' }}>
          <thead>
            <tr>
              {['#','Membre','Rôle','Leads','Contactés','Réponses','RDV','Clients','Quota mensuel'].map(h =>
                <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {ranked.map((m, i) => (
              <tr key={m.user_id}>
                <td style={{ ...td, fontWeight: 900, color: '#7C3AED' }}>{medal(i)}</td>
                <td style={td}><code style={mono}>{m.user_id.slice(0, 8)}</code></td>
                <td style={td}><Tag>{m.role}</Tag></td>
                <td style={td}>{m.s.total_leads || 0}</td>
                <td style={td}>{m.s.contacted || 0}</td>
                <td style={td}>{m.s.replied || 0}</td>
                <td style={td}>{m.s.meetings || 0}</td>
                <td style={{ ...td, fontWeight: 900, color: '#058C42' }}>{m.s.customers || 0}</td>
                <td style={td}>{m.monthly_quota || '—'}</td>
              </tr>
            ))}
            {ranked.length === 0 && (
              <tr><td style={{ ...td, textAlign: 'center', color: '#6B7280' }} colSpan={9}>
                Aucune équipe associée. Créez une équipe via le SQL (table prospect_teams).
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function medal(i) { return i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}` }
function Tag({ children }) {
  return <span style={{ background: '#EDE9FE', color: '#4C1D95', fontWeight: 900, fontSize: 11, padding: '2px 8px', borderRadius: 999 }}>{children}</span>
}
const th = { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #E5E7EB', fontSize: 11, color: '#6B7280', textTransform: 'uppercase', background: '#F9FAFB' }
const td = { padding: '10px 12px', borderBottom: '1px solid #F3F4F6', fontSize: 13 }
const mono = { background: '#F3F4F6', padding: '1px 6px', borderRadius: 4, fontSize: 11 }
