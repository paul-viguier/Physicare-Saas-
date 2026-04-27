'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Page d'accueil — redirige vers le portail collaborateur
// En production : optical-center.physicare.fr → /app/optical-center
export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Détecter le sous-domaine client
    const host = window.location.hostname
    const parts = host.split('.')
    // optical-center.physicare.fr → slug = optical-center
    if (parts.length >= 3 && parts[1] === 'physicare') {
      router.push(`/${parts[0]}`)
    } else {
      // Mode dev ou domaine racine → back-office Physicare
      router.push('/dashboard')
    }
  }, [router])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', flexDirection: 'column', gap: 16
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: 'linear-gradient(135deg,#4C1D95,#7C3AED)',
        animation: 'pulse 1.5s ease-in-out infinite'
      }} />
      <p style={{ color: '#6D28D9', fontWeight: 700 }}>Chargement…</p>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}
