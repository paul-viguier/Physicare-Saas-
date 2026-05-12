// PHYSICARE® — Dashboard prospection LinkedIn (squelette)
// Authentifié via Supabase magic link.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import LeadCard from '../components/LeadCard'
import { listLeads } from '../lib/leadsApi'

const STATUSES = [
  { id: 'NEW',            label: 'Nouveaux' },
  { id: 'CONTACTED',      label: 'Contactés' },
  { id: 'REPLIED',        label: 'Ont répondu' },
  { id: 'MEETING_BOOKED', label: 'RDV planifié' },
  { id: 'OPPORTUNITY',    label: 'Opportunités' },
  { id: 'CUSTOMER',       label: 'Clients' },
]

export default function LinkedInProspection() {
  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    setLoading(true)
    listLeads()
      .then(setLeads)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [session])

  const kpis = useMemo(() => ({
    total:     leads.length,
    hot:       leads.filter(l => (l.lead_score ?? 0) >= 80).length,
    contacted: leads.filter(l => l.status === 'CONTACTED').length,
    meetings:  leads.filter(l => l.status === 'MEETING_BOOKED').length,
  }), [leads])

  const grouped = useMemo(() => {
    const g = Object.fromEntries(STATUSES.map(s => [s.id, []]))
    for (const l of leads) (g[l.status] = g[l.status] || []).push(l)
    return g
  }, [leads])

  async function signIn(e) {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) setError(error.message)
    else setMagicSent(true)
  }

  if (!session) {
    return (
      <Shell>
        <div style={{ maxWidth: 420, margin: '80px auto', background: '#fff', padding: 32, borderRadius: 20, border: '1px solid #E5E7EB' }}>
          <h1 style={{ fontWeight: 900, fontSize: 24, color: '#4C1D95', marginBottom: 8 }}>Prospection LinkedIn</h1>
          <p style={{ color: '#6B7280', marginBottom: 20, fontSize: 14 }}>
            Connectez-vous pour accéder à votre pipeline qualifié PHYSICARE®.
          </p>
          {magicSent ? (
            <div style={{ background: '#ECFDF5', color: '#065F46', padding: 12, borderRadius: 10, fontSize: 14 }}>
              📩 Lien de connexion envoyé à <b>{email}</b>. Vérifiez votre boîte mail.
            </div>
          ) : (
            <form onSubmit={signIn} style={{ display: 'grid', gap: 10 }}>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@entreprise.com"
                style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #D1D5DB', fontSize: 14 }}
              />
              <button type="submit" style={primaryBtn}>Recevoir un lien magique</button>
              {error && <div style={{ color: '#DC2626', fontSize: 13 }}>{error}</div>}
            </form>
          )}
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 28, color: '#4C1D95' }}>Prospection LinkedIn</h1>
          <p style={{ color: '#6B7280', fontSize: 14 }}>Pipeline qualifié — Lead Score PHYSICARE® (LSP)</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a href="/linkedin-prospection/search" style={{ ...ghostBtn, textDecoration: 'none' }}>🔎 Rechercher</a>
          <a href="/linkedin-prospection/import" style={{ ...ghostBtn, textDecoration: 'none' }}>📥 Importer CSV</a>
          <a href="/linkedin-prospection/sequences" style={{ ...ghostBtn, textDecoration: 'none' }}>🔁 Séquences</a>
          <a href="/linkedin-prospection/inbox" style={{ ...ghostBtn, textDecoration: 'none' }}>💬 Inbox</a>
          <a href="/linkedin-prospection/deals" style={{ ...ghostBtn, textDecoration: 'none' }}>💼 Deals</a>
          <a href="/linkedin-prospection/analytics" style={{ ...ghostBtn, textDecoration: 'none' }}>📊 Analytics</a>
          <a href="/linkedin-prospection/team" style={{ ...ghostBtn, textDecoration: 'none' }}>👥 Équipe</a>
          <a href="/linkedin-prospection/audit" style={{ ...ghostBtn, textDecoration: 'none' }}>📜 Audit</a>
          <a href="/linkedin-prospection/settings" style={{ ...ghostBtn, textDecoration: 'none' }}>⚙️ Intégrations</a>
          <button onClick={() => supabase.auth.signOut()} style={ghostBtn}>Se déconnecter</button>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <Kpi label="Leads totaux"    value={kpis.total}     color="#7C3AED" />
        <Kpi label="🔥 Hot leads"    value={kpis.hot}       color="#DC2626" />
        <Kpi label="Contactés"       value={kpis.contacted} color="#1CB0F6" />
        <Kpi label="RDV planifiés"   value={kpis.meetings}  color="#58CC02" />
      </section>

      {loading && <div style={{ color: '#6B7280' }}>Chargement…</div>}
      {error && <div style={{ color: '#DC2626' }}>{error}</div>}

      {!loading && leads.length === 0 && (
        <div style={{ background: '#F5F3FF', border: '1px dashed #C4B5FD', borderRadius: 16, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>🦊</div>
          <h2 style={{ fontWeight: 900, color: '#4C1D95', marginTop: 8 }}>Tito attend vos premiers leads</h2>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 6 }}>
            Importez un CSV ou lancez une recherche pour démarrer votre pipeline.
          </p>
        </div>
      )}

      {!loading && leads.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {STATUSES.map(s => (
            <div key={s.id}>
              <div style={{ fontWeight: 900, color: '#374151', fontSize: 13, textTransform: 'uppercase', marginBottom: 8 }}>
                {s.label} <span style={{ color: '#9CA3AF' }}>({(grouped[s.id] || []).length})</span>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {(grouped[s.id] || []).map(l => (
                  <LeadCard key={l.id} lead={l} company={l.company}
                    onClick={() => { window.location.href = `/linkedin-prospection/${l.id}` }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <RgpdNotice />
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '32px 28px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>{children}</div>
    </div>
  )
}

function Kpi({ label, value, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 900, color, marginTop: 4 }}>{value}</div>
    </div>
  )
}

function RgpdNotice() {
  return (
    <div style={{ marginTop: 32, padding: 14, background: '#EFF6FF', borderRadius: 10, fontSize: 12, color: '#1E3A8A' }}>
      🔒 Conformité RGPD : la prospection s'appuie sur l'intérêt légitime (art. 6.1.f).
      Chaque destinataire dispose d'un droit d'opposition (opt-out) et nos traitements sont
      tracés dans le registre. <a href="/docs/RGPD_COMPLIANCE.md" style={{ color: '#1D4ED8' }}>En savoir plus</a>.
    </div>
  )
}

const primaryBtn = {
  padding: '12px 14px',
  background: '#7C3AED',
  color: '#fff',
  fontWeight: 900,
  border: 'none',
  borderRadius: 10,
  cursor: 'pointer',
  fontSize: 14,
}

const ghostBtn = {
  padding: '8px 12px',
  background: '#fff',
  color: '#4C1D95',
  border: '1px solid #DDD6FE',
  borderRadius: 10,
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: 13,
}
