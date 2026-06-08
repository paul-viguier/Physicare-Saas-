// ═══════════════════════════════════════════════
//  PHYSICARE® — Mon compte (changer son mot de passe)
//  Accessible une fois connecté (tous rôles).
// ═══════════════════════════════════════════════
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthGuard, ROLE_LABEL } from '@/core/auth'
import { AppHeader, Loader, styles, COLORS } from '@/core/ui'

export default function Account() {
  const { loading, profile } = useAuthGuard()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setDone(false)
    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); return }
    if (password !== confirm) { setError('Les deux mots de passe ne correspondent pas.'); return }
    setSaving(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError('Erreur : ' + err.message); setSaving(false); return }
    setDone(true); setPassword(''); setConfirm('')
    setSaving(false)
  }

  if (loading) return <Loader />

  return (
    <div style={styles.page}>
      <AppHeader profile={profile} badge="Mon compte" />
      <div style={{ maxWidth:520, margin:'0 auto', padding:'28px 20px' }}>
        <h1 style={{ fontSize:22, fontWeight:900, color:COLORS.text, marginBottom:18 }}>Mon compte</h1>

        <div style={{ ...styles.card, marginBottom:18 }}>
          <Row label="Email" value={profile?.email} />
          <Row label="Rôle" value={ROLE_LABEL[profile?.role] || profile?.role} />
        </div>

        <div style={styles.card}>
          <h2 style={{ fontSize:15, fontWeight:900, marginBottom:14 }}>Changer mon mot de passe</h2>
          {done && (
            <div style={{ background:'#ECFDF5', border:'2px solid #A7F3D0', borderRadius:8, padding:'10px 14px',
              fontSize:13, color:'#065F46', fontWeight:700, marginBottom:14 }}>
              ✅ Mot de passe mis à jour.
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <input style={styles.input} type="password" placeholder="Nouveau mot de passe" value={password}
              onChange={e => setPassword(e.target.value)} required />
            <input style={styles.input} type="password" placeholder="Confirmer le mot de passe" value={confirm}
              onChange={e => setConfirm(e.target.value)} required />
            {error && <div style={styles.err}>❌ {error}</div>}
            <button style={styles.btn} type="submit" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Mettre à jour'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', fontSize:14 }}>
      <span style={{ color:COLORS.muted, fontWeight:700 }}>{label}</span>
      <span style={{ color:COLORS.text, fontWeight:800 }}>{value}</span>
    </div>
  )
}
