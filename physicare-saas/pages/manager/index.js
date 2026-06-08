// PHYSICARE® — Dashboard équipe (manager) — squelette (Phase 4)
import { useAuthGuard } from '@/core/auth'
import { ComingSoon, Loader } from '@/core/ui'

export default function ManagerHome() {
  const { loading, profile } = useAuthGuard(['manager'])
  if (loading) return <Loader />
  return (
    <ComingSoon profile={profile} badge="Manager" title="Dashboard équipe">
      Les indicateurs agrégés de votre équipe (team_aggregates) arrivent en Phase 4.
    </ComingSoon>
  )
}
