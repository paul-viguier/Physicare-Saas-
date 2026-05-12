// ═══════════════════════════════════════════════
//  PHYSICARE® — Page d'accueil
//  Redirige vers /admin (back-office Physicare)
//  ou vers /:client (espace collaborateur)
// ═══════════════════════════════════════════════
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  useEffect(() => { router.replace('/admin') }, [])
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', background:'#F5F3FF',
      fontFamily:'sans-serif', color:'#6D28D9', fontSize:18, fontWeight:700
    }}>
      Chargement PHYSICARE®…
    </div>
  )
}
