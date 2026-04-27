'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Identifiant ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '20px',
      background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)'
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg,#4C1D95,#7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 28px rgba(109,40,217,.32)'
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontStyle: 'italic', fontWeight: 800, fontSize: 32,
            background: 'linear-gradient(135deg,#4C1D95,#7C3AED,#A855F7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: 6
          }}>PHYSICARE®</h1>
          <p style={{ color: '#9CA3AF', fontSize: 14, fontWeight: 600 }}>
            Accès Manager · Tableau de bord
          </p>
        </div>

        {/* Card login */}
        <div className="card" style={{ padding: '28px 26px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 5 }}>
            Connexion sécurisée
          </h2>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 22, fontWeight: 600 }}>
            Accès réservé aux managers Physicare autorisés.
          </p>

          <form onSubmit={handleLogin}>
            <label style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 5, display: 'block' }}>
              Email manager
            </label>
            <input
              type="email"
              placeholder="manager@optical-center.fr"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ marginBottom: 13 }}
              required
            />

            <label style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 5, display: 'block' }}>
              Mot de passe
            </label>
            <div style={{ position: 'relative', marginBottom: 6 }}>
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 18
                }}
              >
                {showPwd ? '🙈' : '👁'}
              </button>
            </div>

            {error && (
              <div style={{
                background: '#FEF2F2', border: '2px solid #FECACA',
                borderRadius: 8, padding: '8px 12px',
                fontSize: 12, color: '#7F1D1D', fontWeight: 700, marginBottom: 13
              }}>
                ❌ {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', marginBottom: 13, fontSize: 15, padding: '14px' }}
            >
              {loading ? 'Connexion…' : 'Se connecter →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>
            Accès oublié ? Contactez{' '}
            <span style={{ color: '#6D28D9', fontWeight: 800 }}>
              admin@physicare.fr
            </span>
          </p>
        </div>

        {/* Badge sécurité */}
        <div style={{
          background: '#CCFBF1', border: '2px solid rgba(13,148,136,.25)',
          borderRadius: 10, padding: '11px 15px', marginTop: 16,
          display: 'flex', alignItems: 'center', gap: 9
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span style={{ fontSize: 12, color: '#0D9488', fontWeight: 700 }}>
            Données chiffrées · Session sécurisée · Anonymisation active
          </span>
        </div>

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <a href="/" style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 700 }}>
            ← Retour espace collaborateur
          </a>
        </div>
      </div>

      {/* Google Fonts pour le logo */}
      <link
        href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@1,800&display=swap"
        rel="stylesheet"
      />
    </div>
  )
}
