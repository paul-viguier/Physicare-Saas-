// PHYSICARE® — Mentions légales
export default function Legal() {
  return (
    <main style={page}>
      <article style={article}>
        <h1 style={h1}>Mentions légales</h1>
        <h2 style={h2}>Éditeur</h2>
        <p>PHYSICARE® · plateforme SaaS B2B française de santé comportementale au travail.<br />
          Certifiée Qualiopi · Référencée La French Care.</p>
        <h2 style={h2}>Hébergement</h2>
        <p>Site marketing : OVH SAS (Roubaix, France)<br />
          Application SaaS : Vercel Inc. (région UE) · Supabase (eu-west-3)</p>
        <h2 style={h2}>Contact</h2>
        <p>Email général : <a href="mailto:contact@physicare.fr" style={a}>contact@physicare.fr</a><br />
          DPO : <a href="mailto:dpo@physicare.fr" style={a}>dpo@physicare.fr</a></p>
        <h2 style={h2}>Propriété intellectuelle</h2>
        <p>L'ensemble du contenu (textes, logos, méthodologies ISC/IAC/ICC,
          mascotte Tito) est la propriété exclusive de PHYSICARE®.</p>
        <p style={{ marginTop: 40 }}>
          <a href="/privacy" style={a}>Politique de confidentialité</a> · <a href="/" style={a}>Retour</a>
        </p>
      </article>
    </main>
  )
}
const page    = { minHeight: '100vh', background: '#F5F3FF', padding: '40px 20px', fontFamily: 'system-ui' }
const article = { maxWidth: 760, margin: '0 auto', background: '#fff', padding: 40, borderRadius: 18, lineHeight: 1.6, color: '#374151' }
const h1      = { fontWeight: 900, fontSize: 30, color: '#4C1D95' }
const h2      = { fontWeight: 900, fontSize: 18, color: '#4C1D95', marginTop: 28 }
const a       = { color: '#7C3AED' }
