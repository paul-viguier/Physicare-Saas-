// PHYSICARE® — Bannière de consentement utilisateur (1er envoi)
// Affichée tant que l'utilisateur n'a pas acquitté les obligations RGPD.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { isDemo } from '../lib/demo'

const STORAGE_KEY = 'physicare_rgpd_ack_v1'

export default function ConsentBanner() {
  const [acked, setAcked] = useState(true) // hide by default until we know
  useEffect(() => {
    if (isDemo()) { setAcked(true); return }
    try {
      const local = localStorage.getItem(STORAGE_KEY)
      setAcked(Boolean(local))
    } catch { setAcked(false) }
  }, [])

  async function accept() {
    try { localStorage.setItem(STORAGE_KEY, new Date().toISOString()) } catch {}
    // Trace l'acquittement côté serveur (audit log)
    const sess = (await supabase.auth.getSession()).data.session
    if (sess) {
      await fetch('/api/consent/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sess.access_token}` },
        body: JSON.stringify({ version: 'v1.0' }),
      }).catch(() => {})
    }
    setAcked(true)
  }

  if (acked) return null
  return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ fontSize: 36 }}>🔒</div>
        <h2 style={{ fontWeight: 900, color: '#4C1D95', fontSize: 22, marginTop: 8 }}>
          Engagement RGPD avant le 1er envoi
        </h2>
        <p style={{ marginTop: 10, color: '#374151', fontSize: 14 }}>
          Avant d'utiliser le module de prospection, je m'engage à :
        </p>
        <ul style={{ textAlign: 'left', marginTop: 10, color: '#374151', fontSize: 14, paddingLeft: 20 }}>
          <li>Prospecter uniquement des décideurs B2B (intérêt légitime, art. 6.1.f RGPD)</li>
          <li>Inclure un lien d'opt-out fonctionnel dans tous mes emails</li>
          <li>Ne pas dépasser 80 actions LinkedIn par jour</li>
          <li>Respecter les demandes d'opposition reçues</li>
          <li>Ne jamais transférer ces données hors UE</li>
        </ul>
        <p style={{ marginTop: 14, fontSize: 12, color: '#6B7280' }}>
          <a href="/privacy" target="_blank" style={{ color: '#7C3AED' }}>Politique de confidentialité</a> ·
          {' '}<a href="/legal" target="_blank" style={{ color: '#7C3AED' }}>Mentions légales</a> ·
          {' '}DPO : <a href="mailto:dpo@physicare.fr" style={{ color: '#7C3AED' }}>dpo@physicare.fr</a>
        </p>
        <button onClick={accept} style={btn}>J'accepte et je continue</button>
      </div>
    </div>
  )
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(76, 29, 149, 0.55)',
  display: 'grid', placeItems: 'center', zIndex: 999, padding: 20,
}
const card = {
  maxWidth: 540, background: '#fff', borderRadius: 20, padding: 30, textAlign: 'center',
  boxShadow: '0 20px 60px rgba(0,0,0,.25)',
}
const btn = {
  marginTop: 18, padding: '14px 22px', background: '#7C3AED', color: '#fff',
  border: 'none', borderRadius: 12, fontWeight: 900, fontSize: 15, cursor: 'pointer', width: '100%',
}
