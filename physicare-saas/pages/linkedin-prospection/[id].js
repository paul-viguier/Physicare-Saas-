// PHYSICARE® — Vue détail lead (360°)
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import { classifyLead } from '../../lib/leadScoring'
import { recomputeLeadScore, updateLeadStatus } from '../../lib/leadsApi'

const STATUS_OPTIONS = ['NEW','CONTACTED','REPLIED','MEETING_BOOKED','OPPORTUNITY','CUSTOMER','LOST','DNC']

export default function LeadDetail() {
  const router = useRouter()
  const { id } = router.query
  const [lead, setLead] = useState(null)
  const [messages, setMessages] = useState([])
  const [signals, setSignals] = useState([])
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!id) return
    refresh()
  }, [id])

  async function refresh() {
    const { data, error } = await supabase
      .from('prospect_leads')
      .select('*, company:prospect_companies(*)')
      .eq('id', id)
      .single()
    if (error) { setError(error.message); return }
    setLead(data)
    const [m, s] = await Promise.all([
      supabase.from('prospect_messages').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
      supabase.from('prospect_intent_signals').select('*').eq('lead_id', id).order('detected_at', { ascending: false }),
    ])
    setMessages(m.data || [])
    setSignals(s.data || [])
  }

  async function changeStatus(newStatus) {
    setBusy(true)
    try { await updateLeadStatus(id, newStatus); await refresh() }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  async function enrich() {
    setBusy(true)
    try {
      const r = await fetch('/api/prospects/enrich', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: id }),
      })
      if (!r.ok) throw new Error((await r.json()).error)
      await refresh()
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  async function rescore() {
    setBusy(true)
    try { await recomputeLeadScore(id); await refresh() }
    catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  if (!lead) return <div style={{ padding: 40, color: '#6B7280' }}>{error || 'Chargement…'}</div>

  const tier = classifyLead(lead.lead_score || 0)

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '32px 28px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <a href="/linkedin-prospection" style={{ color: '#7C3AED', fontWeight: 800, fontSize: 13 }}>← Pipeline</a>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginTop: 12 }}>
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontWeight: 900, fontSize: 26, color: '#111827' }}>{lead.full_name}</h1>
                <div style={{ color: '#6B7280', marginTop: 4 }}>{lead.job_title}</div>
                <div style={{ color: '#374151', marginTop: 8, fontWeight: 700 }}>
                  {lead.company?.name}
                  {lead.company?.employee_count ? ` · ${lead.company.employee_count.toLocaleString('fr-FR')} salariés` : ''}
                  {lead.company?.industry ? ` · ${lead.company.industry}` : ''}
                </div>
              </div>
              <div style={{ background: tier.bg, color: tier.color, borderRadius: 12, padding: '10px 14px', fontWeight: 900, textAlign: 'center', minWidth: 90 }}>
                <div style={{ fontSize: 11 }}>{tier.emoji} LSP</div>
                <div style={{ fontSize: 28, lineHeight: 1 }}>{lead.lead_score ?? 0}</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>{tier.label}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 18 }}>
              <Info label="Email" value={lead.email_verified || '—'} sub={`Statut : ${lead.email_status}`} />
              <Info label="Persona" value={lead.persona_type || '—'} sub={`Séniorité : ${lead.seniority_level || '—'}`} />
              <Info label="LinkedIn" value={lead.linkedin_profile_url ? <a href={lead.linkedin_profile_url} target="_blank" rel="noreferrer" style={{ color: '#1CB0F6' }}>Profil</a> : '—'} />
              <Info label="Ancienneté" value={lead.tenure_months ? `${lead.tenure_months} mois` : '—'} sub={lead.recent_job_change ? '⏱ Nouveau poste' : ''} />
            </div>

            <h2 style={section}>Timeline messages</h2>
            {messages.length === 0
              ? <Empty>Aucun message envoyé.</Empty>
              : messages.map(m => (
                <div key={m.id} style={msgRow}>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>
                    {m.channel} · {new Date(m.created_at).toLocaleString('fr-FR')} · {m.status}
                  </div>
                  {m.subject && <div style={{ fontWeight: 800, marginTop: 4 }}>{m.subject}</div>}
                  <div style={{ marginTop: 4, fontSize: 13, whiteSpace: 'pre-wrap', color: '#374151' }}>{m.body}</div>
                </div>
              ))
            }

            <h2 style={section}>Signaux d'intention</h2>
            {signals.length === 0
              ? <Empty>Aucun signal détecté.</Empty>
              : signals.map(s => (
                <div key={s.id} style={msgRow}>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>{new Date(s.detected_at).toLocaleString('fr-FR')}</div>
                  <div style={{ fontWeight: 800 }}>{s.signal_type} (+{s.score_boost})</div>
                  <pre style={{ fontSize: 11, color: '#6B7280', whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(s.signal_data, null, 2)}
                  </pre>
                </div>
              ))
            }
          </div>

          <aside style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 18, height: 'fit-content' }}>
            <h3 style={{ fontWeight: 900, color: '#4C1D95', marginBottom: 12 }}>Actions</h3>
            <button onClick={enrich} disabled={busy} style={btnPrimary}>📧 Enrichir email (Dropcontact)</button>
            <button onClick={rescore} disabled={busy} style={{ ...btnGhost, marginTop: 8 }}>↻ Recalculer LSP</button>

            <h3 style={{ fontWeight: 900, color: '#4C1D95', margin: '20px 0 8px' }}>Statut</h3>
            <select value={lead.status} onChange={e => changeStatus(e.target.value)} disabled={busy}
              style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #D1D5DB' }}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {error && <div style={{ color: '#DC2626', fontSize: 12, marginTop: 10 }}>{error}</div>}
          </aside>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value, sub }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#111827', marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
function Empty({ children }) {
  return <div style={{ background: '#F9FAFB', padding: 14, borderRadius: 10, color: '#9CA3AF', fontSize: 13 }}>{children}</div>
}

const section = { fontWeight: 900, color: '#4C1D95', marginTop: 22, marginBottom: 10, fontSize: 16 }
const msgRow = { padding: 12, border: '1px solid #E5E7EB', borderRadius: 10, marginBottom: 8 }
const btnPrimary = { width: '100%', padding: 11, background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 900, cursor: 'pointer' }
const btnGhost = { width: '100%', padding: 11, background: '#fff', color: '#4C1D95', border: '1px solid #DDD6FE', borderRadius: 10, fontWeight: 800, cursor: 'pointer' }
