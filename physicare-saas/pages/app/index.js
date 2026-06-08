// PHYSICARE® — Espace apprenant (employee) — squelette (Phase 3)
import { useAuthGuard } from '@/core/auth'
import { ComingSoon, Loader } from '@/core/ui'

export default function AppHome() {
  const { loading, profile } = useAuthGuard(['employee'])
  if (loading) return <Loader />
  return (
    <ComingSoon profile={profile} badge="Apprenant" title="Mon parcours">
      L'espace apprenant (formations, diagnostic, suivi) arrive en Phase 3.
    </ComingSoon>
  )
}
