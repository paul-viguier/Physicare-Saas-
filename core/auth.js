// ═══════════════════════════════════════════════
//  PHYSICARE® — Authentification & rôles
//  Source de vérité : Supabase Auth + table public.users
// ═══════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'

// Chaque rôle a son espace. Voir ARCHITECTURE.md §3.
export const ROLE_HOME = {
  employee:    '/app',
  manager:     '/manager',
  org_admin:   '/org',
  super_admin: '/admin',
}

export const ROLE_LABEL = {
  employee:    'Apprenant',
  manager:     "Manager d'équipe",
  org_admin:   'Administrateur organisation',
  super_admin: 'Physicare (super-admin)',
}

// Récupère la session + le profil métier (rôle, organisation).
// Renvoie { session, profile } ou null si non connecté.
export async function getSessionProfile() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data: profile, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, org_id, team_id')
    .eq('id', session.user.id)
    .single()

  if (error) return { session, profile: null, error }
  return { session, profile }
}

export async function logout() {
  await supabase.auth.signOut()
}

// Hook de protection de page (côté client).
// allowedRoles : tableau de rôles autorisés, ou null pour « tout connecté ».
export function useAuthGuard(allowedRoles = null) {
  const router = useRouter()
  const [state, setState] = useState({ loading: true, profile: null })

  useEffect(() => {
    let active = true
    getSessionProfile().then((res) => {
      if (!active) return
      if (!res) { router.replace('/login'); return }

      const { profile } = res
      // Profil incomplet (utilisateur Auth sans ligne dans public.users)
      if (!profile) { router.replace('/login'); return }

      // Mauvais rôle → on renvoie l'utilisateur vers SON espace
      if (allowedRoles && !allowedRoles.includes(profile.role)) {
        router.replace(ROLE_HOME[profile.role] || '/login')
        return
      }
      setState({ loading: false, profile })
    })
    return () => { active = false }
  }, [])

  return state
}
