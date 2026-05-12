// PHYSICARE® — Édition d'une séquence (étapes ordonnées par jour)
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../../lib/supabase'
import { validateSequence, STARTER_TEMPLATES, renderStep, buildContext } from '../../../lib/templates'
import { isDemo, DEMO_SEQUENCES } from '../../../lib/demo'

const CHANNELS = ['LINKEDIN_INVITE','LINKEDIN_MESSAGE','EMAIL']

export default function SequenceEditor() {
  const router = useRouter()
  const { id } = router.query
  const [seq, setSeq] = useState(null)
  const [steps, setSteps] = useState([])
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!id) return
    if (isDemo()) {
      const found = DEMO_SEQUENCES.find(s => s.id === id) || DEMO_SEQUENCES[0]
      setSeq(found); setSteps(found.steps || []); return
    }
    supabase.from('prospect_sequences').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else { setSeq(data); setSteps(data.steps || []) }
      })
  }, [id])

  function update(i, patch) { setSteps(steps.map((s, j) => j === i ? { ...s, ...patch } : s)) }
  function remove(i)        { setSteps(steps.filter((_, j) => j !== i)) }
  function add(channel)     {
    const tpl = channel === 'LINKEDIN_INVITE' ? STARTER_TEMPLATES.invite_drh
              : channel === 'LINKEDIN_MESSAGE' ? STARTER_TEMPLATES.message_followup
              : STARTER_TEMPLATES.email_signal
    const day = (steps.at(-1)?.day ?? -3) + 3
    setSteps([...steps, { day, ...tpl }])
  }

  async function save() {
    setError(null); setSaved(false)
    try {
      const validated = validateSequence(steps)
      const { error } = await supabase.from('prospect_sequences')
        .update({ steps: validated, is_active: true }).eq('id', id)
      if (error) throw error
      setSteps(validated); setSaved(true)
    } catch (e) { setError(e.message) }
  }

  if (!seq) return <div style={{ padding: 40, color: '#6B7280' }}>{error || 'Chargement…'}</div>

  // Aperçu avec un lead fictif
  const sampleLead = { first_name: 'Camille', full_name: 'Camille Bernard', job_title: 'DRH' }
  const sampleCo = { name: 'Optical Center', industry: 'Retail' }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '32px 28px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <a href="/linkedin-prospection/sequences" style={{ color: '#7C3AED', fontWeight: 800, fontSize: 13 }}>← Séquences</a>
        <h1 style={{ fontWeight: 900, fontSize: 26, color: '#4C1D95', marginTop: 6 }}>{seq.name}</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 18 }}>
          <div>
            {steps.map((s, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ background: '#EDE9FE', color: '#4C1D95', fontWeight: 900, padding: '4px 10px', borderRadius: 999, fontSize: 12 }}>Étape {i + 1}</span>
                  <label style={{ fontSize: 12, color: '#6B7280' }}>J+</label>
                  <input type="number" min={0} value={s.day} onChange={e => update(i, { day: Number(e.target.value) })}
                    style={{ width: 60, padding: 6, borderRadius: 8, border: '1px solid #D1D5DB' }} />
                  <select value={s.channel} onChange={e => update(i, { channel: e.target.value })}
                    style={{ padding: 6, borderRadius: 8, border: '1px solid #D1D5DB' }}>
                    {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={() => remove(i)} style={{ marginLeft: 'auto', background: 'transparent', border: 0, color: '#DC2626', cursor: 'pointer' }}>✕</button>
                </div>
                {s.channel === 'EMAIL' && (
                  <input value={s.subject || ''} onChange={e => update(i, { subject: e.target.value })}
                    placeholder="Objet…" style={{ marginTop: 8, width: '100%', padding: 8, borderRadius: 8, border: '1px solid #D1D5DB', fontWeight: 700 }} />
                )}
                <textarea value={s.body || ''} onChange={e => update(i, { body: e.target.value })}
                  rows={s.channel === 'LINKEDIN_INVITE' ? 3 : 6}
                  style={{ marginTop: 8, width: '100%', padding: 8, borderRadius: 8, border: '1px solid #D1D5DB', fontFamily: 'inherit' }} />
                {s.channel === 'LINKEDIN_INVITE' && (
                  <div style={{ fontSize: 11, color: s.body?.length > 300 ? '#DC2626' : '#6B7280', marginTop: 4 }}>
                    {s.body?.length || 0}/300 caractères
                  </div>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button onClick={() => add('LINKEDIN_INVITE')} style={addBtn}>+ Invite LinkedIn</button>
              <button onClick={() => add('LINKEDIN_MESSAGE')} style={addBtn}>+ Message LinkedIn</button>
              <button onClick={() => add('EMAIL')} style={addBtn}>+ Email</button>
            </div>

            <button onClick={save} style={{ marginTop: 16, padding: '12px 16px', background: '#58CC02', color: '#fff', fontWeight: 900, border: 'none', borderRadius: 10, cursor: 'pointer' }}>
              💾 Enregistrer
            </button>
            {saved && <span style={{ color: '#058C42', marginLeft: 10 }}>✓ Enregistré</span>}
            {error && <div style={{ color: '#DC2626', marginTop: 10 }}>{error}</div>}
          </div>

          <aside>
            <h3 style={{ fontWeight: 900, color: '#4C1D95', marginBottom: 8 }}>Aperçu (lead exemple)</h3>
            <div style={{ background: '#F5F3FF', border: '1px dashed #C4B5FD', borderRadius: 12, padding: 12, fontSize: 12, color: '#4C1D95' }}>
              {Object.entries(buildContext(sampleLead, sampleCo)).map(([k, v]) =>
                <div key={k}><b>{`{{${k}}}`}</b> → {String(v)}</div>)}
            </div>
            {steps.map((s, i) => {
              const r = renderStep(s, sampleLead, sampleCo, { unsubscribeUrl: 'https://exemple.fr/unsub' })
              return (
                <div key={i} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 12, marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 800 }}>J+{s.day} · {r.channel}</div>
                  {r.subject && <div style={{ fontWeight: 800, marginTop: 4 }}>{r.subject}</div>}
                  <div style={{ whiteSpace: 'pre-wrap', marginTop: 6, fontSize: 13, color: '#374151' }}>{r.body}</div>
                </div>
              )
            })}
          </aside>
        </div>
      </div>
    </div>
  )
}

const addBtn = { padding: '8px 12px', background: '#fff', border: '1px solid #DDD6FE', color: '#4C1D95', borderRadius: 10, cursor: 'pointer', fontWeight: 800, fontSize: 13 }
