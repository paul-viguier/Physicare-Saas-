// PHYSICARE® — Connexion Unipile (compte LinkedIn de l'utilisateur)
// MVP: stockage manuel du token + account_id le temps que l'OAuth Unipile soit branché.
// TODO Phase 2.1 : flow OAuth complet via /api/integrations/unipile/{connect,callback}
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { isDemo } from '../../lib/demo'

export default function Settings() {
  const [integ, setInteg] = useState(null)
  const [accountId, setAccountId] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState(null)

  async function load() {
    if (isDemo()) {
      const demoInteg = { id: 'demo', account_id: '4d1a-demo-account', status: 'CONNECTED', daily_count: 12, daily_quota: 80 }
      setInteg(demoInteg); setAccountId(demoInteg.account_id); setToken('••••••••'); return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('prospect_user_integrations')
      .select('*').eq('user_id', user.id).eq('provider', 'UNIPILE').maybeSingle()
    setInteg(data)
    if (data) { setAccountId(data.account_id || ''); setToken(data.access_token ? '••••••••' : '') }
  }
  useEffect(() => { load() }, [])

  async function save() {
    setError(null)
    const sess = (await supabase.auth.getSession()).data.session
    if (!sess) return
    const accessToken = token && token !== '••••••••' ? token : null
    const r = await fetch('/api/integrations/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sess.access_token}` },
      body: JSON.stringify({ provider: 'UNIPILE', accountId, accessToken }),
    })
    const j = await r.json()
    if (!r.ok) setError(j.error); else load()
  }

  async function disconnect() {
    if (!integ) return
    await supabase.from('prospect_user_integrations').delete().eq('id', integ.id)
    setInteg(null); setAccountId(''); setToken('')
  }

  async function connectOAuth() {
    setError(null)
    const sess = (await supabase.auth.getSession()).data.session
    if (!sess) { setError('Non authentifié'); return }
    const r = await fetch('/api/integrations/unipile/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sess.access_token}` },
    })
    const j = await r.json()
    if (!r.ok) { setError(j.error); return }
    if (j.url) window.location.href = j.url
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '32px 28px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <a href="/linkedin-prospection" style={{ color: '#7C3AED', fontWeight: 800, fontSize: 13 }}>← Pipeline</a>
        <h1 style={{ fontWeight: 900, fontSize: 28, color: '#4C1D95', marginTop: 6 }}>Intégrations</h1>

        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginTop: 18 }}>
          <h2 style={{ fontWeight: 900, color: '#111827' }}>LinkedIn (Unipile)</h2>
          <p style={{ color: '#6B7280', fontSize: 13, marginTop: 4 }}>
            Compte officiel via API partenaire Unipile. Quota par défaut : <b>80 actions/jour</b>.
          </p>

          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 12, marginTop: 12, fontSize: 12, color: '#78350F' }}>
            ⚠️ Le scraping LinkedIn direct est interdit (ToS). Toute l'activité passe par Unipile, qui agit pour le
            compte de l'utilisateur authentifié.
          </div>

          <button onClick={connectOAuth} style={{ ...primary, marginTop: 14, background: '#0A66C2' }}>
            🔗 Connecter LinkedIn via Unipile (OAuth)
          </button>
          <details style={{ marginTop: 14 }}>
            <summary style={{ cursor: 'pointer', fontSize: 12, color: '#6B7280' }}>Saisie manuelle (avancée)</summary>

          <label style={{ display: 'block', marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>Account ID Unipile</div>
            <input value={accountId} onChange={e => setAccountId(e.target.value)} placeholder="ex: 4d1a..."
              style={input} />
          </label>
          <label style={{ display: 'block', marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>Access token</div>
            <input value={token} onChange={e => setToken(e.target.value)} type="password" placeholder="••••••••"
              style={input} />
          </label>

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={save} style={primary}>{integ ? 'Mettre à jour' : 'Connecter'}</button>
            {integ && <button onClick={disconnect} style={ghost}>Déconnecter</button>}
          </div>
          </details>
          {integ && (
            <div style={{ marginTop: 12, fontSize: 12, color: '#6B7280' }}>
              Statut : <b style={{ color: '#058C42' }}>{integ.status}</b> ·
              Quota utilisé aujourd'hui : <b>{integ.daily_count}</b>/{integ.daily_quota}
            </div>
          )}
          {error && <div style={{ color: '#DC2626', marginTop: 10 }}>{error}</div>}
        </div>
      </div>
    </div>
  )
}

const input = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #D1D5DB', fontSize: 14 }
const primary = { padding: '10px 14px', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 900, cursor: 'pointer' }
const ghost = { padding: '10px 14px', background: '#fff', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 10, fontWeight: 800, cursor: 'pointer' }
