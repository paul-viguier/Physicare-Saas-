# 🔒 Audit de sécurité — Physicare (base `physicare-prod`)

> Réalisé via le linter de sécurité Supabase + inspection des policies RLS.
> À refaire avant toute ouverture à de vrais clients payants.

## ✅ Points forts

- **RLS activé sur 100 % des tables** du schéma `public` (42 tables).
- Isolation par organisation via des policies dédiées (`is_super_admin()`, `jwt_role()`, `jwt_org_id()`).
- Authentification Supabase propre (utilisateurs liés à `auth.users`).
- **Seuil d'anonymat** (`anonymity_min_respondents = 3`) appliqué aux agrégats (conforme RGPD).

## 🔴 Corrigé (migrations appliquées)

| Faille | Détail | Correction |
|--------|--------|-----------|
| **Vues SECURITY DEFINER** | `v_business_metrics`, `v_attendance_register`, `v_modules_by_indice`, `module_completions` contournaient le RLS (lecture inter-organisations possible). | Passées en `security_invoker = true` → elles respectent désormais le RLS de l'utilisateur. |
| **Fonctions sensibles ouvertes à l'anonyme** | `generate_bpf`, `generate_fec`, `get_monthly_revenue`, `get_dashboard_stats`, `calculate_org_roi`, `get_attendance_for_org`, `calculate_employee_profile`, `calculate_response_pillar_scores`, `generate_manager_action_plan` étaient exécutables **sans être connecté**. | `EXECUTE` révoqué pour le rôle `anon`. |

## 🟡 Restant à traiter (recommandations)

| Sujet | Risque | Action recommandée |
|-------|--------|--------------------|
| **Protection mots de passe compromis** désactivée | Moyen | À activer : Supabase → Authentication → Policies → *Leaked password protection* (vérifie sur HaveIBeenPwned). |
| **2 buckets de stockage listables** (`client-communication-kit`, `physicare-content`) | Moyen | Restreindre la policy SELECT sur `storage.objects` : autoriser l'accès par URL d'objet, pas le listing complet. |
| **Fonctions exécutables par tout utilisateur connecté** (`get_super_admin_clients_overview`, `set_org_lifecycle_stage`, `get_monthly_revenue`…) | À vérifier | Confirmer que chaque fonction `SECURITY DEFINER` vérifie en interne le rôle de l'appelant (sinon un simple `employee` pourrait appeler des fonctions admin). À auditer fonction par fonction. |
| **`search_path` mutable** sur 5 fonctions | Faible | `ALTER FUNCTION … SET search_path = public, pg_temp;` (durcissement anti-escalade). |
| **Extension `pg_net` dans `public`** | Faible | La déplacer dans un schéma dédié. |

## 🔁 Maintenance

- Relancer l'audit après chaque changement de schéma : outil Supabase « Advisors » (sécurité + performance).
- Vérifier les policies à chaque nouvelle table (RLS activé + policies org-scoped).
