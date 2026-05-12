// PHYSICARE® — Analytics : entonnoir, variantes A/B, taux de réponse
// Pas de dépendance Recharts (allège l'install) : SVG vanilla, palette PHYSICARE®.
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const STAGES = [
  { key: 'total_leads',    label: 'Leads',         color: '#7C3AED' },
  { key: 'contacted',      label: 'Contactés',      color: '#1CB0F6' },
  { key: 'replied',        label: 'Réponses',       color: '#58CC02' },
  { key: 'meetings',       label: 'RDV',           color: '#D97706' },
  { key: 'opportunities',  label: 'Opportunités',  color: '#DB2777' },
  { key: 'customers',      label: 'Clients',       color: '#058C42' },
]

export default function Analytics() {
  const [funnel, setFunnel] = useState(null)
  const [variants, setVariants] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Non authentifié'); return }
      const [{ data: f, error: ef }, { data: v, error: ev }] = await Promise.all([
        supabase.from('v_prospect_funnel').select('*').eq('owner_id', user.id).maybeSingle(),
        supabase.from('v_prospect_variant_stats').select('*'),
      ])
      if (ef) setError(ef.message); else setFunnel(f || emptyFunnel())
      if (ev) setError(ev.message); else setVariants(v || [])
    })()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '32px 28px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <a href="/linkedin-prospection" style={{ color: '#7C3AED', fontWeight: 800, fontSize: 13 }}>← Pipeline</a>
        <h1 style={{ fontWeight: 900, fontSize: 28, color: '#4C1D95', marginTop: 6 }}>Analytics</h1>

        {error && <div style={{ color: '#DC2626', marginTop: 10 }}>{error}</div>}

        <section style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginTop: 18 }}>
          <h2 style={h2}>Entonnoir de conversion</h2>
          {funnel ? <Funnel data={funnel} /> : <div>Chargement…</div>}
          {funnel && <ConversionRates data={funnel} />}
        </section>

        <section style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginTop: 18 }}>
          <h2 style={h2}>Performance des variantes A/B</h2>
          {variants.length === 0
            ? <div style={{ color: '#6B7280' }}>Aucune variante A/B encore mesurée.</div>
            : (
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Séquence', 'Étape', 'Variante', 'Envoyés', 'Ouvertures', 'Réponses', 'Taux réponse'].map(h =>
                      <th key={h} style={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v, i) => {
                    const rate = v.sent ? ((v.replied / v.sent) * 100).toFixed(1) : '0.0'
                    return (
                      <tr key={i}>
                        <td style={td}><code style={mono}>{shorten(v.sequence_id)}</code></td>
                        <td style={td}>{v.step_index + 1}</td>
                        <td style={td}><Tag>{v.variant_label}</Tag></td>
                        <td style={td}>{v.sent}</td>
                        <td style={td}>{v.opened}</td>
                        <td style={td}>{v.replied}</td>
                        <td style={{ ...td, fontWeight: 900, color: rate > 15 ? '#058C42' : '#374151' }}>{rate} %</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )
          }
        </section>
      </div>
    </div>
  )
}

function Funnel({ data }) {
  const max = Math.max(1, ...STAGES.map(s => Number(data[s.key]) || 0))
  return (
    <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
      {STAGES.map(s => {
        const v = Number(data[s.key]) || 0
        const w = Math.max(2, (v / max) * 100)
        return (
          <div key={s.key} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 60px', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 13, color: '#374151', fontWeight: 700 }}>{s.label}</div>
            <div style={{ background: '#F3F4F6', borderRadius: 8, overflow: 'hidden', height: 28 }}>
              <div style={{ width: `${w}%`, background: s.color, height: '100%', transition: 'width .3s' }} />
            </div>
            <div style={{ textAlign: 'right', fontWeight: 900, color: s.color }}>{v}</div>
          </div>
        )
      })}
    </div>
  )
}

function ConversionRates({ data }) {
  const t = Number(data.total_leads) || 0
  const c = Number(data.contacted) || 0
  const r = Number(data.replied) || 0
  const m = Number(data.meetings) || 0
  const w = Number(data.customers) || 0

  const rates = [
    ['Contact / Lead',      pct(c, t)],
    ['Réponse / Contact',   pct(r, c)],
    ['RDV / Réponse',       pct(m, r)],
    ['Client / RDV',        pct(w, m)],
    ['Conversion globale',  pct(w, t)],
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginTop: 16 }}>
      {rates.map(([l, v]) => (
        <div key={l} style={{ background: '#F5F3FF', borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700 }}>{l}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#4C1D95', marginTop: 4 }}>{v}</div>
        </div>
      ))}
    </div>
  )
}

function pct(num, den) {
  if (!den) return '—'
  return `${((num / den) * 100).toFixed(1)} %`
}
function shorten(id) { return id ? id.slice(0, 8) : '—' }
function emptyFunnel() { return Object.fromEntries(STAGES.map(s => [s.key, 0])) }

function Tag({ children }) {
  return <span style={{ background: '#EDE9FE', color: '#4C1D95', fontWeight: 900, fontSize: 11, padding: '2px 8px', borderRadius: 999 }}>{children}</span>
}
const h2 = { fontWeight: 900, color: '#4C1D95', marginBottom: 10, fontSize: 17 }
const th = { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #E5E7EB', fontSize: 11, color: '#6B7280', textTransform: 'uppercase' }
const td = { padding: '10px', borderBottom: '1px solid #F3F4F6' }
const mono = { background: '#F3F4F6', padding: '1px 6px', borderRadius: 4, fontSize: 11 }
