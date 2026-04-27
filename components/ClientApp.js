'use client'
import { useEffect, useRef } from 'react'

// Composant qui charge l'app HTML Physicare
// avec les paramètres du client injectés dynamiquement
export default function ClientApp({ client }) {
  const iframeRef = useRef(null)

  useEffect(() => {
    // Envoyer la config client à l'iframe via postMessage
    const iframe = iframeRef.current
    if (!iframe) return

    iframe.onload = () => {
      iframe.contentWindow.postMessage({
        type: 'PHYSICARE_CONFIG',
        clientSlug: client.slug,
        clientName: client.nom,
        clientColor: client.couleur,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }, '*')
    }
  }, [client])

  return (
    <iframe
      ref={iframeRef}
      src="/physicare_app.html"
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
        display: 'block',
      }}
      title={`Physicare × ${client.nom}`}
    />
  )
}
