// PHYSICARE® — Audit log RGPD (article 30)
// Visualisation des actions de l'utilisateur courant.
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { isDemo, DEMO_AUDIT, DEMO_RGPD_REGISTER } from '../../lib/demo'

const ACTION_LABEL = {
  READ: '👁 Consultation',
  EXPORT: '⬆️ Export',
  DELETE: '🗑 Suppression',
  ENRICH: '✨ Enrichissement',
  SEND: '✉️ Envoi',
  OPTOUT: '🚫 Opt-out',
  AI_GENERATE: '🤖 Génération IA',
  PURGE: '🧹 Purge auto',
}

export default function Audit() {
  const [rows, setRows] = useState([])
  const [register, setRegister] = useState([])
  const [filter, setFilter] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isDemo()) {
      setRows(filter ? DEMO_AUDIT.filter(a => a.action === filter) : DEMO_AUDIT)
      setRegister(DEMO_RGPD_REGISTER); return
    }
    let q = supabase.from('prospect_audit_log').select('*').order('created_at', { ascending: false }).limit(200)
    if (filter) q = q.eq('action', filter)
    q.then(({ data, error }) => { error ? setError(error.message) : setRows(data || []) })

    supabase.from('v_prospect_rgpd_register').select('*').limit(60)
      .then(({ data }) => setRegister(data || []))
  }, [filter])

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '32px 28px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <a href="/linkedin-prospection" style={{ color: '#7C3AED', fontWeight: 800, fontSize: 13 }}>← Pipeline</a>
        <h1 style={{ fontWeight: 900, fontSize: 28, color: '#4C1D95', marginTop: 6 }}>Audit RGPD</h1>
        <p style={{ color: '#6B7280', fontSize: 13 }}>Registre des traitements (article 30 RGPD) + traçabilité des actions.</p>

        <section style={{ marginTop: 18, background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: 18 }}>
          <h2 style={h2}>Registre des traitements (30 derniers jours)</h2>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead><tr>{['Jour','Action','Ressource','#'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {register.map((r, i) => (
                <tr key={i}>
                  <td style={td}>{new Date(r.day).toLocaleDateString('fr-FR')}</td>
                  <td style={td}>{ACTION_LABEL[r.action] || r.action}</td>
                  <td style={td}>{r.resource_type}</td>
                  <td style={{ ...td, fontWeight: 900 }}>{r.cnt}</td>
                </tr>
              ))}
              {register.length === 0 && <tr><td colSpan={4} style={{ ...td, color: '#6B7280' }}>Aucune entrée</td></tr>}
            </tbody>
          </table>
        </section>

        <section style={{ marginTop: 18, background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: 18 }}>
          <h2 style={h2}>Mes actions récentes (200 dernières)</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <button onClick={() => setFilter('')} style={chip(filter === '')}>Toutes</button>
            {Object.keys(ACTION_LABEL).map(k => (
              <button key={k} onClick={() => setFilter(k)} style={chip(filter === k)}>{ACTION_LABEL[k]}</button>
            ))}
          </div>
          {error && <div style={{ color: '#DC2626' }}>{error}</div>}
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {rows.map(r => (
              <div key={r.id} style={{ padding: '10px 0', borderBottom: '1px solid #F3F4F6', fontSize: 13 }}>
                <span style={{ color: '#6B7280', fontSize: 11 }}>{new Date(r.created_at).toLocaleString('fr-FR')}</span>
                <span style={{ marginLeft: 10, fontWeight: 800 }}>{ACTION_LABEL[r.action] || r.action}</span>
                <span style={{ marginLeft: 10, color: '#374151' }}>
                  {r.resource_type ? `${r.resource_type}:${(r.resource_id || '').slice(0, 8)}` : ''}
                </span>
                {r.ip_address && <span style={{ float: 'right', color: '#9CA3AF', fontSize: 11 }}>{r.ip_address}</span>}
              </div>
            ))}
            {rows.length === 0 && <div style={{ color: '#6B7280' }}>Aucune action enregistrée.</div>}
          </div>
        </section>
      </div>
    </div>
  )
}

const h2 = { fontWeight: 900, color: '#4C1D95', marginBottom: 10, fontSize: 16 }
const th = { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #E5E7EB', fontSize: 11, color: '#6B7280', textTransform: 'uppercase' }
const td = { padding: '8px 10px', borderBottom: '1px solid #F3F4F6' }
const chip = (active) => ({
  padding: '6px 10px', borderRadius: 999, border: 0, fontWeight: 800, fontSize: 12,
  background: active ? '#7C3AED' : '#fff', color: active ? '#fff' : '#4C1D95',
  border: active ? 'none' : '1px solid #DDD6FE', cursor: 'pointer',
})
