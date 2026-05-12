# DPIA — Analyse d'impact relative à la protection des données

> **Traitement** : Module de prospection LinkedIn PHYSICARE®
> **Version** : 1.0 — Mai 2026
> **Responsable de traitement** : PHYSICARE®
> **DPO** : dpo@physicare.fr
> **Statut** : Brouillon — à valider avant mise en production

## 1. Description du traitement

### 1.1 Finalité
Identifier, qualifier et contacter des décideurs RH/QVCT d'ETI et grands comptes
français pour leur proposer les services PHYSICARE® (mesure et amélioration de
la santé comportementale en entreprise).

### 1.2 Base légale
**Intérêt légitime** (RGPD art. 6.1.f) — prospection B2B de profils
professionnels publics, conformément aux lignes directrices CNIL 2020.

### 1.3 Données traitées

| Catégorie | Champs | Origine | Sensibilité |
|---|---|---|---|
| Identité pro | nom, prénom, poste, séniorité | LinkedIn public, Dropcontact | Standard |
| Coordonnées | email pro vérifié, téléphone | Dropcontact, Hunter, Apollo | Standard |
| Firmographie | entreprise, SIREN, effectif, secteur | Pappers, LinkedIn | Publique |
| Comportement | historique messages, ouvertures, réponses | Interne | Standard |
| Signaux d'intention | posts LinkedIn, offres RH, levée de fonds | Unipile, Pappers | Publique |
| Embedding 384-d | vecteur dérivé des champs ci-dessus | Jina v2 / mock | Dérivée |
| **Aucune donnée sensible** au sens RGPD art. 9 (santé, opinions, etc.) n'est collectée sur les leads. |

### 1.4 Personnes concernées
Adultes professionnels en activité dans des ETI / grands comptes en France
(estimation : 50 000 prospects sur 24 mois). Aucun mineur.

### 1.5 Destinataires
- Utilisateurs PHYSICARE® authentifiés (commerciaux) — accès limité par RLS à leurs propres leads
- Sous-traitants techniques : Supabase (UE), Resend (UE), Dropcontact (FR),
  Pappers (FR), Unipile (FR), Anthropic (UE), Jina (UE)
- Aucun transfert hors UE (clauses contractuelles types non nécessaires)

### 1.6 Durée de conservation
- Lead actif : 3 ans après dernier contact
- Lead converti (client) : durée de la relation commerciale + 5 ans (preuves)
- Lead opt-out : email haché conservé indéfiniment (suppression universelle)
- Logs d'audit : 5 ans

## 2. Nécessité et proportionnalité

| Critère | Évaluation |
|---|---|
| Finalité légitime | ✅ Activité commerciale B2B documentée |
| Minimisation | ✅ Pas de scraping LinkedIn, données limitées au strict besoin |
| Exactitude | ✅ Enrichissement Dropcontact (qualif `correct`/`risky`/`invalid`) |
| Limitation conservation | ✅ Cron `purge_stale_leads()` à 3 ans |
| Information | ✅ Mention dans le 1er email + page `/privacy` publique |
| Consentement | Non requis (intérêt légitime), mais opt-out one-click obligatoire |

## 3. Risques pour les personnes

### 3.1 Risque 1 — Accès non autorisé aux données prospects
- **Probabilité** : Faible
- **Gravité** : Moyenne (réputation lead, sollicitation indésirable)
- **Mesures** :
  - RLS Postgres scopée `owner_id = auth.uid()` sur toutes les tables sensibles
  - Service role isolé côté serveur uniquement
  - Tokens providers chiffrés AES-GCM-256 (clé séparée `ENCRYPTION_KEY`)
  - Magic-link auth (pas de mots de passe stockés)

### 3.2 Risque 2 — Sollicitation excessive / spam
- **Probabilité** : Moyenne (sans contrôle)
- **Gravité** : Moyenne (nuisance, perte de réputation domaine)
- **Mesures** :
  - Rate limit Unipile : 80 actions/jour/compte, quota atomique en DB
  - Opt-out one-click HMAC signé, stoppe toutes les séquences actives
  - Pause auto sur réponse (webhook Unipile)
  - Liste de suppression globale (hash SHA-256 emails)
  - Header `List-Unsubscribe` sur chaque email Resend

### 3.3 Risque 3 — Profilage et décision automatisée
- **Probabilité** : Élevée (scoring + IA)
- **Gravité** : Faible (n'affecte pas juridiquement la personne)
- **Mesures** :
  - Le scoring LSP n'a **aucun effet juridique** : il sert uniquement à
    prioriser le travail commercial humain. Aucune décision automatisée
    affectant la personne (RGPD art. 22) n'est prise.
  - Le contenu généré par Claude Sonnet 4.6 est destiné à être relu avant
    envoi (workflow humain dans la boucle).

### 3.4 Risque 4 — Fuite de tokens providers (Unipile, HubSpot)
- **Probabilité** : Faible
- **Gravité** : Élevée (accès complet au LinkedIn de l'utilisateur)
- **Mesures** :
  - Chiffrement AES-GCM-256 au repos (`lib/crypto.js`)
  - Clé `ENCRYPTION_KEY` jamais commitée, gérée via secret manager
  - Pas de log de token en clair (revue manuelle des logs Sentry)
  - Rotation possible via UI `/settings` → re-saisie du token

### 3.5 Risque 5 — Détournement de webhook
- **Probabilité** : Moyenne (endpoint public)
- **Gravité** : Moyenne (pollution des statuts)
- **Mesures** :
  - Vérification HMAC Svix sur webhook Resend (`RESEND_WEBHOOK_SECRET`)
  - Vérification HMAC SHA-256 sur webhook Unipile (`UNIPILE_WEBHOOK_SECRET`)
  - Comparaison constant-time pour éviter timing attacks

## 4. Mesures de sécurité

| Mesure | Implémentation |
|---|---|
| Chiffrement transit | TLS 1.3 (Vercel + Supabase) |
| Chiffrement repos | AES-GCM-256 (tokens), PG natif (autres) |
| Authentification | Magic-link Supabase (TOTP optionnel) |
| Autorisation | RLS Postgres par `owner_id` |
| Audit | `prospect_audit_log` (IP, UA, action) |
| Headers sécurité | HSTS, X-Content-Type-Options, CSP, Referrer-Policy |
| Sauvegardes | Supabase auto-backup quotidien (rétention 7j) |
| Suppression | `purge_stale_leads()` (cron mensuel) |
| Revue accès | Audit log consultable par utilisateur |

## 5. Consultation des personnes

Non applicable (impossible de consulter 50 000 prospects). Une mention
d'information est affichée :
- Dans le premier email envoyé (intérêt légitime + DPO + opt-out)
- Sur la page publique `/privacy` (politique de confidentialité)

## 6. Conclusion

Le traitement est **proportionné à la finalité poursuivie**, les risques
résiduels sont **maîtrisés** par les mesures techniques et organisationnelles
décrites ci-dessus. La DPIA peut être validée sous réserve de :

1. ✅ Mise en place effective du chiffrement `ENCRYPTION_KEY` en production
2. ✅ Configuration des secrets webhook (Resend + Unipile)
3. ✅ Activation du cron mensuel `purge_stale_leads()`
4. ✅ Publication de la page `/privacy` accessible
5. ⏳ Revue annuelle par le DPO (prochaine échéance : mai 2027)

---

*Document généré le 12/05/2026 — à signer par le RT et le DPO avant mise en production.*
