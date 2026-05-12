# Conformité RGPD — Module Prospection LinkedIn

> PHYSICARE® v1.0 — Mai 2026

## Bases légales

Le traitement s'appuie sur l'**intérêt légitime** (RGPD art. 6.1.f) pour la
prospection B2B de profils professionnels publics, conformément aux lignes
directrices CNIL de 2020 sur la prospection commerciale.

Toute prospection nécessite :
- L'existence d'un lien démontrable avec l'activité du destinataire
- Un droit d'opposition (opt-out) effectif et visible
- Une information claire dès le premier contact

## Données traitées

| Catégorie | Source | Durée de conservation |
|---|---|---|
| Identité pro (nom, prénom, poste) | LinkedIn public + Dropcontact | 3 ans après dernier contact |
| Email professionnel vérifié | Dropcontact / Hunter | 3 ans après dernier contact |
| Entreprise & firmographie | Pappers / LinkedIn | Durée de la relation commerciale |
| Signaux LinkedIn (posts, jobs) | Unipile API | 12 mois |
| Historique de messages | Interne | 5 ans (preuves contractuelles) |

## Droits des personnes

- **Accès / rectification / effacement** : email dpo@physicare.fr
- **Opposition** : lien `{{unsubscribe_link}}` dans tous les emails →
  bascule `prospect_leads.unsubscribed_at = NOW()`, lead retiré de toutes les
  séquences actives, score LSP forcé à 0.
- **Portabilité** : export JSON sur demande.

## Mesures techniques

1. **Chiffrement** : tokens LinkedIn stockés dans Supabase Vault (KMS-backed).
2. **Cloisonnement** : RLS Postgres par `owner_id`.
3. **Suppression automatique** : fonction Postgres `purge_stale_leads()`
   (à appeler par cron mensuel) supprimant les leads dont
   `last_contacted_at < now() - 3 ans` ou créés il y a > 3 ans sans contact.
   Logge l'opération dans `prospect_audit_log` (action `PURGE`).
4. **Registre des traitements (art. 30)** : généré automatiquement via
   la table `prospect_audit_log` et la vue `v_prospect_rgpd_register`.
   Consultable dans `/linkedin-prospection/audit`. Logge toute action
   READ / EXPORT / DELETE / ENRICH / SEND / OPTOUT / AI_GENERATE / PURGE
   avec IP, user-agent et timestamp.
5. **Hébergement UE** : Supabase région `eu-west-3`, Resend région EU,
   Dropcontact et Pappers hébergés en France.
6. **Sous-traitants** : DPA signés avec Supabase, Resend, Dropcontact,
   Pappers, Unipile (cf. annexe DPA).

## Mention obligatoire à afficher

> *Vos coordonnées professionnelles ont été obtenues via LinkedIn et notre
> partenaire Dropcontact (intérêt légitime, art. 6.1.f RGPD). Vous pouvez vous
> opposer à tout moment à ce traitement : dpo@physicare.fr ou via le lien de
> désinscription présent dans nos emails.*

## DPIA

Une analyse d'impact (DPIA) est requise si :
- volume > 10 000 contacts actifs simultanés,
- ou enrichissement automatisé avec profilage scoring + envoi automatique.

Le module **est concerné** : DPIA documentée dans `docs/DPIA.md` (à produire
avant mise en production).

## Contacts

- DPO PHYSICARE® : dpo@physicare.fr
- CNIL : https://www.cnil.fr
