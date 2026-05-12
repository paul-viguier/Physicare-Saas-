// PHYSICARE® — Liste des séquences
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function SequencesList() {
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [error, setError] = useState(null)

  async function load() {
    const { data, error } = await supabase.from('prospect_sequences').select('*').order('created_at', { ascending: false })
    if (error) setError(error.message); else setItems(data || [])
  }
  useEffect(() => { load() }, [])

  async function create() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Non authentifié'); return }
    const { error } = await supabase.from('prospect_sequences').insert({
      name: name || 'Séquence sans nom', created_by: user.id,
      steps: [
        { day: 0, channel: 'LINKEDIN_INVITE', body: 'Bonjour {{firstName}}, je vois que vous pilotez la stratégie RH chez {{company}}. Ravi d\'échanger sur {{painPoint}}.' },
        { day: 3, channel: 'LINKEDIN_MESSAGE', body: 'Merci {{firstName}} pour la connexion ! 15 min cette semaine pour vous présenter notre approche ?' },
        { day: 7, channel: 'EMAIL', subject: '{{firstName}}, suite à notre échange LinkedIn', body: 'Bonjour {{firstName}}, …' },
      ],
    })
    if (error) setError(error.message); else { setName(''); load() }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '32px 28px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <a href="/linkedin-prospection" style={{ color: '#7C3AED', fontWeight: 800, fontSize: 13 }}>← Pipeline</a>
        <h1 style={{ fontWeight: 900, fontSize: 28, color: '#4C1D95', marginTop: 6 }}>Séquences</h1>

        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 16, marginTop: 16, display: 'flex', gap: 8 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom de la séquence"
            style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #D1D5DB' }} />
          <button onClick={create} style={{ padding: '10px 14px', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 900, cursor: 'pointer' }}>+ Créer</button>
        </div>
        {error && <div style={{ color: '#DC2626', marginTop: 10 }}>{error}</div>}

        <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
          {items.map(s => (
            <a key={s.id} href={`/linkedin-prospection/sequences/${s.id}`}
              style={{ textDecoration: 'none', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 16 }}>
              <div style={{ fontWeight: 900, color: '#111827' }}>{s.name}</div>
              <div style={{ color: '#6B7280', fontSize: 13, marginTop: 4 }}>
                {(s.steps?.length || 0)} étape(s) · {s.is_active ? '🟢 Active' : '⚪ Inactive'}
              </div>
            </a>
          ))}
          {items.length === 0 && <div style={{ color: '#6B7280' }}>Aucune séquence pour le moment.</div>}
        </div>
      </div>
    </div>
  )
}
