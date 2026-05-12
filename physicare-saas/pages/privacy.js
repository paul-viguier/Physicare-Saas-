// PHYSICARE® — Politique de confidentialité publique (FR)
export default function Privacy() {
  return (
    <main style={page}>
      <article style={article}>
        <h1 style={h1}>Politique de confidentialité PHYSICARE®</h1>
        <p style={meta}>Dernière mise à jour : 12 mai 2026</p>

        <h2 style={h2}>1. Qui sommes-nous ?</h2>
        <p>PHYSICARE® est une plateforme SaaS B2B française de santé comportementale en milieu professionnel,
          certifiée Qualiopi et référencée La French Care.</p>

        <h2 style={h2}>2. Quelles données traitons-nous dans le cadre de la prospection ?</h2>
        <ul>
          <li>Identité professionnelle publique : nom, prénom, poste, séniorité, photo LinkedIn.</li>
          <li>Coordonnées professionnelles : email pro vérifié, téléphone (le cas échéant).</li>
          <li>Données firmographiques de l'entreprise : nom, SIREN, secteur, effectif.</li>
          <li>Signaux d'intention publics : publications LinkedIn, offres d'emploi, levées de fonds.</li>
          <li>Historique de nos échanges : messages envoyés, ouvertures, réponses.</li>
        </ul>
        <p><b>Aucune donnée sensible</b> au sens de l'article 9 RGPD (santé, opinions, etc.) n'est collectée.</p>

        <h2 style={h2}>3. Sur quelle base légale ?</h2>
        <p>Le traitement repose sur <b>l'intérêt légitime</b> de PHYSICARE® à prospecter des
          décideurs professionnels en B2B (RGPD art. 6.1.f), conformément aux lignes directrices
          de la CNIL de 2020 sur la prospection commerciale.</p>

        <h2 style={h2}>4. D'où viennent vos données ?</h2>
        <ul>
          <li>LinkedIn (profil public, via notre partenaire officiel Unipile)</li>
          <li>Dropcontact (vérification email, hébergé en France)</li>
          <li>Pappers (données légales d'entreprise, hébergé en France)</li>
          <li>Apollo.io et Hunter.io (annuaire B2B)</li>
        </ul>

        <h2 style={h2}>5. Combien de temps les conservons-nous ?</h2>
        <ul>
          <li>Lead actif : <b>3 ans</b> après dernier contact</li>
          <li>Client : durée de la relation + 5 ans (preuves contractuelles)</li>
          <li>Lead opt-out : email haché conservé pour ne plus jamais vous solliciter</li>
          <li>Journaux d'audit : 5 ans</li>
        </ul>

        <h2 style={h2}>6. Quels sont vos droits ?</h2>
        <p>Vous disposez d'un droit d'<b>accès</b>, de <b>rectification</b>, d'<b>effacement</b>,
          d'<b>opposition</b>, de <b>limitation</b> et de <b>portabilité</b>.</p>
        <p>Pour exercer ces droits : <a href="mailto:dpo@physicare.fr" style={a}>dpo@physicare.fr</a></p>
        <p>Vous pouvez également vous désinscrire en un clic depuis n'importe quel email reçu de notre part.</p>
        <p>Réclamation possible auprès de la <a href="https://www.cnil.fr" style={a} target="_blank" rel="noreferrer">CNIL</a>.</p>

        <h2 style={h2}>7. Sécurité</h2>
        <ul>
          <li>Hébergement en Union européenne (Supabase eu-west-3, Resend EU, Dropcontact FR)</li>
          <li>Chiffrement en transit (TLS 1.3) et au repos (AES-GCM-256 sur les tokens sensibles)</li>
          <li>Cloisonnement par utilisateur via RLS Postgres</li>
          <li>Journalisation des accès dans le registre des traitements (art. 30 RGPD)</li>
        </ul>

        <h2 style={h2}>8. Sous-traitants</h2>
        <p>Supabase, Resend, Postmark, Dropcontact, Pappers, Unipile, Apollo.io, Hunter,
          Anthropic, Jina AI, Vercel — tous liés par un accord de sous-traitance (DPA).</p>

        <h2 style={h2}>9. Contact DPO</h2>
        <p><b>DPO PHYSICARE®</b> · <a href="mailto:dpo@physicare.fr" style={a}>dpo@physicare.fr</a></p>

        <p style={{ marginTop: 40 }}>
          <a href="/legal" style={a}>Mentions légales</a> · <a href="/" style={a}>Retour</a>
        </p>
      </article>
    </main>
  )
}

const page    = { minHeight: '100vh', background: '#F5F3FF', padding: '40px 20px', fontFamily: 'system-ui' }
const article = { maxWidth: 760, margin: '0 auto', background: '#fff', padding: 40, borderRadius: 18, lineHeight: 1.6, color: '#374151' }
const h1      = { fontWeight: 900, fontSize: 30, color: '#4C1D95' }
const h2      = { fontWeight: 900, fontSize: 18, color: '#4C1D95', marginTop: 28 }
const meta    = { color: '#9CA3AF', fontSize: 13 }
const a       = { color: '#7C3AED' }
