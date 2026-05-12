// PHYSICARE® — Pipeline deals : Kanban + forecast pondéré
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { isDemo, DEMO_DEALS } from '../../lib/demo'

const STAGES = [
  { id: 'DISCOVERY',   label: 'Découverte',   color: '#7C3AED', prob: 10 },
  { id: 'DEMO',        label: 'Démo',         color: '#1CB0F6', prob: 30 },
  { id: 'PROPOSAL',    label: 'Proposition',  color: '#D97706', prob: 50 },
  { id: 'NEGOTIATION', label: 'Négociation',  color: '#DB2777', prob: 75 },
  { id: 'WON',         label: 'Gagné',        color: '#058C42', prob: 100 },
  { id: 'LOST',        label: 'Perdu',        color: '#6B7280', prob: 0 },
]

export default function Deals() {
  const [deals, setDeals] = useState([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ leadEmail: '', amount: 12000, expected: '' })
  const [error, setError] = useState(null)

  async function load() {
    if (isDemo()) {
      setDeals(DEMO_DEALS.map(d => ({ ...d, lead: { full_name: d.lead.full_name, job_title: d.lead.job_title, company: { name: d.lead.company.name } } })))
      return
    }
    const { data, error } = await supabase
      .from('prospect_deals')
      .select('*, lead:prospect_leads(full_name, job_title, company:prospect_companies(name))')
      .order('updated_at', { ascending: false })
    if (error) setError(error.message); else setDeals(data || [])
  }
  useEffect(() => { load() }, [])

  const grouped = useMemo(() => {
    const g = Object.fromEntries(STAGES.map(s => [s.id, []]))
    for (const d of deals) (g[d.stage] = g[d.stage] || []).push(d)
    return g
  }, [deals])

  const totals = useMemo(() => {
    let raw = 0, weighted = 0
    for (const d of deals) {
      if (['WON','LOST'].includes(d.stage)) continue
      raw += d.amount_eur || 0
      weighted += Math.round((d.amount_eur || 0) * (d.probability || 0) / 100)
    }
    const won = deals.filter(d => d.stage === 'WON').reduce((s, d) => s + (d.amount_eur || 0), 0)
    return { raw, weighted, won }
  }, [deals])

  async function moveStage(deal, newStage) {
    const prob = STAGES.find(s => s.id === newStage)?.prob ?? deal.probability
    await supabase.from('prospect_deals')
      .update({ stage: newStage, probability: prob })
      .eq('id', deal.id)
    // Si gagné: bascule le lead en CUSTOMER + déclenche export PHYSICARE® principal
    if (newStage === 'WON') {
      await supabase.from('prospect_leads')
        .update({ status: 'CUSTOMER' }).eq('id', deal.lead_id)
      try {
        const sess = (await supabase.auth.getSession()).data.session
        await fetch('/api/integrations/physicare/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json',
                     'Authorization': `Bearer ${sess?.access_token || ''}` },
          body: JSON.stringify({ leadId: deal.lead_id }),
        })
      } catch {}
    }
    load()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '32px 28px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <a href="/linkedin-prospection" style={{ color: '#7C3AED', fontWeight: 800, fontSize: 13 }}>← Pipeline leads</a>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 }}>
          <h1 style={{ fontWeight: 900, fontSize: 28, color: '#4C1D95' }}>Pipeline deals</h1>
          <div style={{ display: 'flex', gap: 14 }}>
            <Kpi label="Pipe brut"          value={fmt(totals.raw)}      color="#7C3AED" />
            <Kpi label="Forecast pondéré"   value={fmt(totals.weighted)} color="#1CB0F6" />
            <Kpi label="Gagné"              value={fmt(totals.won)}      color="#058C42" />
          </div>
        </div>

        {error && <div style={{ color: '#DC2626', marginTop: 10 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginTop: 20 }}>
          {STAGES.map(s => (
            <div key={s.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: 10 }}>
              <div style={{ fontWeight: 900, color: s.color, fontSize: 13, textTransform: 'uppercase', marginBottom: 6 }}>
                {s.label}
                <span style={{ color: '#9CA3AF', float: 'right', fontSize: 11 }}>{(grouped[s.id] || []).length}</span>
              </div>
              {(grouped[s.id] || []).map(d => (
                <div key={d.id} style={{ background: '#F9FAFB', borderRadius: 8, padding: 8, marginBottom: 6, fontSize: 12 }}>
                  <div style={{ fontWeight: 800, color: '#111827' }}>
                    {d.lead?.full_name || '—'}
                  </div>
                  <div style={{ color: '#6B7280', fontSize: 11 }}>{d.lead?.company?.name || ''}</div>
                  <div style={{ marginTop: 4, color: s.color, fontWeight: 900 }}>{fmt(d.amount_eur)} · {d.probability}%</div>
                  <select value={d.stage} onChange={e => moveStage(d, e.target.value)}
                    style={{ marginTop: 4, width: '100%', fontSize: 11, padding: 4, border: '1px solid #E5E7EB', borderRadius: 6 }}>
                    {STAGES.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '8px 14px', border: '1px solid #E5E7EB' }}>
      <div style={{ fontSize: 11, color: '#6B7280' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
    </div>
  )
}
function fmt(v) { return (Number(v) || 0).toLocaleString('fr-FR') + ' €' }
