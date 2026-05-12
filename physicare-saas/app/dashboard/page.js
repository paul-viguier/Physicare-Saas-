'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const router = useRouter()
  const [clients, setClients] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClient, setNewClient] = useState({ nom: '', slug: '', couleur: '#6D28D9' })
  const [creating, setCreating] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    setUser(session.user)
    loadData()
  }

  async function loadData() {
    setLoading(true)

    // Charger tous les clients
    const { data: clientsData } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    // Charger les stats par client
    const { data: diags } = await supabase
      .from('diagnostics')
      .select('client_slug, isc, profil, created_at')

    // Agréger les stats
    const statsMap = {}
    if (diags) {
      diags.forEach(d => {
        if (!statsMap[d.client_slug]) {
          statsMap[d.client_slug] = { count: 0, totalISC: 0, lastDate: null, profils: {} }
        }
        statsMap[d.client_slug].count++
        statsMap[d.client_slug].totalISC += parseFloat(d.isc) || 0
        if (!statsMap[d.client_slug].lastDate || d.created_at > statsMap[d.client_slug].lastDate) {
          statsMap[d.client_slug].lastDate = d.created_at
        }
        const p = d.profil || 'vigilance'
        statsMap[d.client_slug].profils[p] = (statsMap[d.client_slug].profils[p] || 0) + 1
      })
    }

    setClients(clientsData || [])
    setStats(statsMap)
    setLoading(false)
  }

  async function createClient() {
    if (!newClient.nom || !newClient.slug) return
    setCreating(true)

    const { error } = await supabase
      .from('clients')
      .insert([{
        nom: newClient.nom,
        slug: newClient.slug.toLowerCase().replace(/\s+/g, '-'),
        couleur: newClient.couleur,
        actif: true
      }])

    if (!error) {
      setShowNewClient(false)
      setNewClient({ nom: '', slug: '', couleur: '#6D28D9' })
      loadData()
    }
    setCreating(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const profilColors = {
    surcharge: '#DC2626', vigilance: '#D97706',
    equilibre: '#6366F1', resilient: '#059669'
  }

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', flexDirection: 'column', gap: 16
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: 'linear-gradient(135deg,#4C1D95,#7C3AED)',
        animation: 'pulse 1.5s ease-in-out infinite'
      }}/>
      <p style={{ color: '#6D28D9', fontWeight: 700 }}>Chargement du back-office…</p>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F5F3FF' }}>

      {/* Header */}
      <div style={{
        background: '#fff', borderBottom: '2px solid #EDE9FE',
        padding: '0 28px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 8px rgba(109,40,217,.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontStyle: 'italic', fontWeight: 800, fontSize: 26,
            background: 'linear-gradient(135deg,#4C1D95,#7C3AED,#A855F7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>PHYSICARE®</span>
          <nav className="nav" style={{ display: 'flex', gap: 4 }}>
            <a href="/dashboard" className="active">Clients</a>
            <a href="/pipeline">Pipeline</a>
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>
            {user?.email}
          </span>
          <button className="btn-ghost" onClick={logout} style={{ fontSize: 12, padding: '8px 16px' }}>
            🔓 Déconnexion
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>

        {/* KPIs globaux */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
          gap: 14, marginBottom: 28
        }}>
          {[
            { label: 'Clients actifs', val: clients.filter(c => c.actif).length, color: '#6D28D9', sub: 'Total déployés' },
            { label: 'Diagnostics T0', val: Object.values(stats).reduce((s,v) => s+v.count, 0), color: '#059669', sub: 'Tous clients' },
            { label: 'ISC moyen global', val: (() => {
              const all = Object.values(stats)
              if (!all.length) return '—'
              const total = all.reduce((s,v) => s + v.totalISC, 0)
              const count = all.reduce((s,v) => s + v.count, 0)
              return count ? (total/count).toFixed(2).replace('.',',') : '—'
            })(), color: '#D97706', sub: 'Cible < 3,5' },
            { label: 'Modules actifs', val: '5', color: '#0891B2', sub: 'Santé comportementale' },
          ].map((k, i) => (
            <div key={i} style={{
              background: `linear-gradient(135deg, ${k.color}dd, ${k.color})`,
              borderRadius: 18, padding: '18px 20px', color: '#fff',
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, opacity: .75, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
                {k.label}
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-.04em', lineHeight: 1 }}>
                {k.val}
              </div>
              <div style={{ fontSize: 11, opacity: .65, marginTop: 5, fontWeight: 600 }}>
                {k.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Header clients */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16, flexWrap: 'wrap', gap: 12
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 4 }}>
              Mes clients
            </h2>
            <p style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 600 }}>
              {clients.length} client{clients.length > 1 ? 's' : ''} · Cliquez pour accéder au dashboard
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={() => setShowNewClient(true)}
            style={{ fontSize: 13, padding: '10px 20px' }}
          >
            + Nouveau client
          </button>
        </div>

        {/* Modal nouveau client */}
        {showNewClient && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(30,27,75,.45)',
            zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }}>
            <div className="card" style={{ width: '100%', maxWidth: 460, padding: '28px 30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontSize: 17, fontWeight: 900 }}>Nouveau client</h3>
                <button
                  onClick={() => setShowNewClient(false)}
                  style={{
                    width: 30, height: 30, borderRadius: '50%',
                    border: '2px solid #E5E7EB', background: '#fff',
                    cursor: 'pointer', fontSize: 14, color: '#9CA3AF', fontWeight: 800
                  }}
                >✕</button>
              </div>

              <label style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 5, display: 'block' }}>
                Nom du client *
              </label>
              <input
                placeholder="Ex : Optical Center Lyon"
                value={newClient.nom}
                onChange={e => {
                  const nom = e.target.value
                  const slug = nom.toLowerCase()
                    .replace(/[éèêë]/g,'e').replace(/[àâ]/g,'a')
                    .replace(/[îï]/g,'i').replace(/[ôö]/g,'o')
                    .replace(/[ùûü]/g,'u').replace(/ç/g,'c')
                    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
                  setNewClient(prev => ({ ...prev, nom, slug }))
                }}
                style={{ marginBottom: 13 }}
              />

              <label style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 5, display: 'block' }}>
                Identifiant URL (slug) *
              </label>
              <input
                placeholder="optical-center-lyon"
                value={newClient.slug}
                onChange={e => setNewClient(prev => ({ ...prev, slug: e.target.value }))}
                style={{ marginBottom: 13 }}
              />
              <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 13, fontWeight: 600 }}>
                URL : app.physicare.fr/{newClient.slug || 'identifiant'}
              </p>

              <label style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 5, display: 'block' }}>
                Couleur de marque
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <input
                  type="color"
                  value={newClient.couleur}
                  onChange={e => setNewClient(prev => ({ ...prev, couleur: e.target.value }))}
                  style={{ width: 48, height: 40, padding: 2, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 700 }}>{newClient.couleur}</span>
              </div>

              <button
                className="btn-primary"
                onClick={createClient}
                disabled={creating || !newClient.nom || !newClient.slug}
                style={{ width: '100%', fontSize: 14, padding: '13px' }}
              >
                {creating ? 'Création…' : 'Créer le client →'}
              </button>
            </div>
          </div>
        )}

        {/* Liste clients */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {clients.map(client => {
            const s = stats[client.slug] || { count: 0, totalISC: 0, profils: {} }
            const avgISC = s.count ? (s.totalISC / s.count).toFixed(2) : '—'
            const iscColor = parseFloat(avgISC) >= 3.8 ? '#DC2626' : parseFloat(avgISC) >= 3.2 ? '#D97706' : '#059669'

            return (
              <div key={client.id} className="card" style={{
                cursor: 'pointer', transition: 'all .2s',
                borderLeft: `4px solid ${client.couleur}`
              }}
                onClick={() => router.push(`/dashboard/${client.slug}`)}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {/* Header client */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: client.couleur,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 900, color: '#fff'
                    }}>
                      {client.nom.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>{client.nom}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>/{client.slug}</div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 800, padding: '3px 10px',
                    borderRadius: 999,
                    background: client.actif ? '#ECFDF5' : '#F3F4F6',
                    color: client.actif ? '#065F46' : '#9CA3AF',
                    border: `2px solid ${client.actif ? '#A7F3D0' : '#E5E7EB'}`
                  }}>
                    {client.actif ? '● Actif' : '○ Inactif'}
                  </span>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {[
                    { label: 'Répondants', val: s.count },
                    { label: 'ISC moyen', val: avgISC, color: iscColor },
                    { label: 'Dernière réponse', val: s.lastDate ? new Date(s.lastDate).toLocaleDateString('fr-FR') : '—' },
                  ].map((st, i) => (
                    <div key={i} style={{ background: '#F9FAFB', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                        {st.label}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: st.color || '#111827', letterSpacing: '-.03em' }}>
                        {st.val}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Répartition profils */}
                {s.count > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
                    {Object.entries(s.profils).map(([p, n]) => (
                      <span key={p} style={{
                        fontSize: 11, fontWeight: 800, padding: '3px 9px',
                        borderRadius: 999,
                        background: profilColors[p] + '18',
                        color: profilColors[p],
                        border: `2px solid ${profilColors[p]}44`
                      }}>
                        {p} · {n}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{
                  fontSize: 12, color: '#6D28D9', fontWeight: 800,
                  display: 'flex', alignItems: 'center', gap: 5
                }}>
                  Ouvrir le dashboard →
                </div>
              </div>
            )
          })}

          {/* Card ajouter client */}
          {clients.length === 0 && (
            <div
              className="card"
              onClick={() => setShowNewClient(true)}
              style={{
                cursor: 'pointer', textAlign: 'center', padding: '40px 20px',
                border: '2px dashed #C4B5FD', background: '#F5F3FF',
                transition: 'all .2s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#8B5CF6'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#C4B5FD'}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>+</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#6D28D9', marginBottom: 5 }}>
                Créer votre premier client
              </div>
              <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>
                Optical Center, Krys, Acuitis…
              </div>
            </div>
          )}
        </div>
      </div>

      <link
        href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@1,800&display=swap"
        rel="stylesheet"
      />
    </div>
  )
}
