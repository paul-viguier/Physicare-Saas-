// ═══════════════════════════════════════════════
//  PHYSICARE® — Espace collaborateur
//  URL : /optical-center  /krys  /acuitis  etc.
//  Charge le HTML de la formation selon le client
// ═══════════════════════════════════════════════
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function ClientSpace() {
  const router = useRouter()
  const { client } = router.query
  const [clientData, setClientData] = useState(null)
  const [notFound, setNotFound]     = useState(false)

  useEffect(() => {
    if (!client) return
    supabase.from('clients').select('*').eq('slug', client).eq('actif', true).single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true)
        else setClientData(data)
      })
  }, [client])

  if (notFound) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      minHeight:'100vh', background:'#F5F3FF', fontFamily:'sans-serif', flexDirection:'column', gap:16 }}>
      <div style={{ fontSize:48 }}>🔍</div>
      <div style={{ fontSize:20, fontWeight:800, color:'#374151' }}>Espace introuvable</div>
      <div style={{ fontSize:14, color:'#6B7280' }}>L'URL "{client}" ne correspond à aucun client actif.</div>
    </div>
  )

  if (!clientData) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      minHeight:'100vh', background:'#F5F3FF', fontFamily:'sans-serif',
      fontSize:16, fontWeight:700, color:'#6D28D9' }}>
      Chargement…
    </div>
  )

  /* Injecter les variables Supabase + CLIENT_SLUG dans le HTML de formation */
  return (
    <iframe
      src={`/app.html?client=${client}`}
      style={{ width:'100%', height:'100vh', border:'none' }}
      title={`Physicare — ${clientData.nom}`}
    />
  )
}
