// PHYSICARE® — Dashboard organisation (org_admin) — squelette (Phase 4)
import { useAuthGuard } from '@/core/auth'
import { ComingSoon, Loader } from '@/core/ui'

export default function OrgHome() {
  const { loading, profile } = useAuthGuard(['org_admin'])
  if (loading) return <Loader />
  return (
    <ComingSoon profile={profile} badge="Organisation" title="Dashboard organisation">
      La vue de votre organisation (org_aggregates, équipes, utilisateurs) arrive en Phase 4.
    </ComingSoon>
  )
}
