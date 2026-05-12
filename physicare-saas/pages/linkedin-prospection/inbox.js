// PHYSICARE® — Inbox unifiée (LinkedIn + Email)
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Inbox() {
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('REPLIED')
  const [error, setError] = useState(null)

  useEffect(() => {
    let q = supabase.from('v_prospect_inbox').select('*').order('replied_at', { ascending: false, nullsFirst: false })
    if (filter === 'REPLIED') q = q.not('replied_at', 'is', null)
    if (filter === 'OPENED')  q = q.not('opened_at', 'is', null).is('replied_at', null)
    q.then(({ data, error }) => { error ? setError(error.message) : setRows(data || []) })
  }, [filter])

  const grouped = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      if (!map.has(r.lead_id)) map.set(r.lead_id, [])
      map.get(r.lead_id).push(r)
    }
    return Array.from(map.entries())
  }, [rows])

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '32px 28px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <a href="/linkedin-prospection" style={{ color: '#7C3AED', fontWeight: 800, fontSize: 13 }}>← Pipeline</a>
        <h1 style={{ fontWeight: 900, fontSize: 28, color: '#4C1D95', marginTop: 6 }}>Inbox unifiée</h1>

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {[['REPLIED','💬 Réponses'],['OPENED','👁 Ouverts'],['ALL','Tout']].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)}
              style={{ padding: '8px 12px', borderRadius: 999, border: 0, fontWeight: 800,
                background: filter === k ? '#7C3AED' : '#fff', color: filter === k ? '#fff' : '#4C1D95',
                cursor: 'pointer' }}>{l}</button>
          ))}
        </div>

        {error && <div style={{ color: '#DC2626', marginTop: 10 }}>{error}</div>}

        <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
          {grouped.map(([leadId, msgs]) => (
            <a key={leadId} href={`/linkedin-prospection/${leadId}`}
              style={{ textDecoration: 'none', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 900, color: '#111827' }}>{msgs[0].full_name}</div>
                  <div style={{ color: '#6B7280', fontSize: 13 }}>
                    {msgs[0].job_title} · {msgs[0].company_name}
                  </div>
                </div>
                <div style={{ background: '#FEF2F2', color: '#DC2626', borderRadius: 10, padding: '4px 10px', fontWeight: 900, fontSize: 12 }}>
                  LSP {msgs[0].lead_score ?? 0}
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap' }}>
                {msgs[0].body?.slice(0, 240)}{msgs[0].body?.length > 240 ? '…' : ''}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: '#6B7280' }}>
                {msgs[0].channel} · {new Date(msgs[0].replied_at || msgs[0].sent_at).toLocaleString('fr-FR')}
                · {msgs.length} message(s) au total
              </div>
            </a>
          ))}
          {grouped.length === 0 && (
            <div style={{ background: '#F5F3FF', border: '1px dashed #C4B5FD', borderRadius: 14, padding: 30, textAlign: 'center', color: '#6B7280' }}>
              Aucune conversation pour ce filtre.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
