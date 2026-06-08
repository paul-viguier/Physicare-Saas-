// ═══════════════════════════════════════════════
//  PHYSICARE® — Mot de passe oublié (demande de réinitialisation)
// ═══════════════════════════════════════════════
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { styles, COLORS } from '@/core/ui'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const redirectTo = `${window.location.origin}/reset-password`
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (err) { setError("Impossible d'envoyer l'email. Réessayez."); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  return (
    <div style={styles.pageCenter}>
      <div style={{ width:'100%', maxWidth:420 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <h1 style={{ ...styles.logo, fontSize:34, fontStyle:'italic', marginBottom:6 }}>PHYSICARE®</h1>
        </div>
        <div style={styles.card}>
          <h2 style={{ fontSize:16, fontWeight:900, marginBottom:5 }}>Mot de passe oublié</h2>
          {sent ? (
            <div>
              <div style={{ background:'#ECFDF5', border:'2px solid #A7F3D0', borderRadius:8, padding:'12px 14px',
                fontSize:13, color:'#065F46', fontWeight:700, marginBottom:14 }}>
                ✅ Si un compte existe pour <strong>{email}</strong>, un email de réinitialisation vient d'être envoyé. Vérifiez votre boîte (et les spams).
              </div>
              <Link href="/login" style={{ fontSize:13, color:COLORS.purple, fontWeight:800, textDecoration:'none' }}>← Retour à la connexion</Link>
            </div>
          ) : (
            <>
              <p style={{ fontSize:13, color:COLORS.muted, marginBottom:20, fontWeight:600 }}>
                Entrez votre email : nous vous enverrons un lien pour définir un nouveau mot de passe.
              </p>
              <form onSubmit={handleSubmit}>
                <input style={styles.input} type="email" placeholder="Email" value={email}
                  onChange={e => setEmail(e.target.value)} required autoFocus />
                {error && <div style={styles.err}>❌ {error}</div>}
                <button style={styles.btn} type="submit" disabled={loading}>
                  {loading ? 'Envoi…' : 'Envoyer le lien →'}
                </button>
              </form>
              <p style={{ textAlign:'center', marginTop:16 }}>
                <Link href="/login" style={{ fontSize:12, color:COLORS.muted, fontWeight:700, textDecoration:'none' }}>← Retour à la connexion</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
