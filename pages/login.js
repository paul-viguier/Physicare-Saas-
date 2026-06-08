// ═══════════════════════════════════════════════
//  PHYSICARE® — Connexion unique (Supabase Auth)
//  Après connexion, redirige selon le rôle (ROLE_HOME).
// ═══════════════════════════════════════════════
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import { getSessionProfile, ROLE_HOME } from '@/core/auth'
import { styles, COLORS } from '@/core/ui'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Identifiant ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    // Charger le rôle puis rediriger vers le bon espace
    const res = await getSessionProfile()
    const role = res?.profile?.role
    router.replace(ROLE_HOME[role] || '/app')
  }

  return (
    <div style={styles.pageCenter}>
      <div style={{ width:'100%', maxWidth:420 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <h1 style={{ ...styles.logo, fontSize:34, fontStyle:'italic', marginBottom:6 }}>PHYSICARE®</h1>
          <p style={{ color:COLORS.muted, fontSize:14, fontWeight:600 }}>Plateforme santé comportementale</p>
        </div>

        <div style={styles.card}>
          <h2 style={{ fontSize:16, fontWeight:900, marginBottom:5 }}>Connexion</h2>
          <p style={{ fontSize:13, color:COLORS.muted, marginBottom:20, fontWeight:600 }}>
            Accédez à votre espace personnel.
          </p>
          <form onSubmit={handleLogin}>
            <input style={styles.input} type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} required autoFocus />
            <input style={styles.input} type="password" placeholder="Mot de passe" value={password}
              onChange={e => setPassword(e.target.value)} required />
            {error && <div style={styles.err}>❌ {error}</div>}
            <button style={styles.btn} type="submit" disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter →'}
            </button>
          </form>
          <p style={{ textAlign:'center', marginTop:16 }}>
            <Link href="/forgot-password" style={{ fontSize:12, color:COLORS.purple, fontWeight:800, textDecoration:'none' }}>
              Mot de passe oublié ?
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
