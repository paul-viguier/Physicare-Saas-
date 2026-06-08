// ═══════════════════════════════════════════════
//  PHYSICARE® — Réinitialisation du mot de passe
//  Atterrissage depuis le lien reçu par email (Supabase établit
//  une session de récupération via le token dans l'URL).
// ═══════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import { styles, COLORS } from '@/core/ui'

export default function ResetPassword() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  // Supabase parse le token de récupération présent dans l'URL et ouvre une session.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    // Cas où la session est déjà établie au chargement
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true) })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); return }
    if (password !== confirm) { setError('Les deux mots de passe ne correspondent pas.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError('Erreur : ' + err.message); setLoading(false); return }
    setDone(true)
    setLoading(false)
    setTimeout(() => router.replace('/login'), 2500)
  }

  return (
    <div style={styles.pageCenter}>
      <div style={{ width:'100%', maxWidth:420 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <h1 style={{ ...styles.logo, fontSize:34, fontStyle:'italic', marginBottom:6 }}>PHYSICARE®</h1>
        </div>
        <div style={styles.card}>
          <h2 style={{ fontSize:16, fontWeight:900, marginBottom:5 }}>Nouveau mot de passe</h2>

          {done ? (
            <div style={{ background:'#ECFDF5', border:'2px solid #A7F3D0', borderRadius:8, padding:'12px 14px',
              fontSize:13, color:'#065F46', fontWeight:700 }}>
              ✅ Mot de passe mis à jour ! Redirection vers la connexion…
            </div>
          ) : !ready ? (
            <p style={{ fontSize:13, color:COLORS.muted, fontWeight:600 }}>
              Lien invalide ou expiré. Refaites une demande depuis « Mot de passe oublié ».
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <p style={{ fontSize:13, color:COLORS.muted, marginBottom:18, fontWeight:600 }}>
                Choisissez un nouveau mot de passe (8 caractères minimum).
              </p>
              <input style={styles.input} type="password" placeholder="Nouveau mot de passe" value={password}
                onChange={e => setPassword(e.target.value)} required autoFocus />
              <input style={styles.input} type="password" placeholder="Confirmer le mot de passe" value={confirm}
                onChange={e => setConfirm(e.target.value)} required />
              {error && <div style={styles.err}>❌ {error}</div>}
              <button style={styles.btn} type="submit" disabled={loading}>
                {loading ? 'Mise à jour…' : 'Valider →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
