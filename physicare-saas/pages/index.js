// ═══════════════════════════════════════════════
//  PHYSICARE® — Point d'entrée
//  Redirige vers /login ou vers l'espace du rôle.
// ═══════════════════════════════════════════════
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { getSessionProfile, ROLE_HOME } from '@/core/auth'
import { Loader } from '@/core/ui'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    getSessionProfile().then((res) => {
      if (!res || !res.profile) { router.replace('/login'); return }
      router.replace(ROLE_HOME[res.profile.role] || '/login')
    })
  }, [])
  return <Loader />
}
