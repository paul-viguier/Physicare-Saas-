// ═══════════════════════════════════════════════
//  PHYSICARE® — Back-office
//  Gestion de tous les clients en un endroit
// ═══════════════════════════════════════════════
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getClients, createClient, getStats } from '../lib/clients'

const ADMIN_PASSWORD = 'physicare2026'

export default function Admin() {
  const [auth, setAuth]         = useState(false)
  const [pwd, setPwd]           = useState('')
  const [error, setError]       = useState('')
  const [clients, setClients]   = useState([])
  const [stats, setStats]       = useState({})
  const [loading, setLoading]   = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newClient, setNewClient] = useState({ nom:'', slug:'', couleur:'#6D28D9' })
  const [managerEmail, setManagerEmail] = useState('')
  const [plan, setPlan]         = useState('starter')
  const [creating, setCreating] = useState(false)
  const [msg, setMsg]           = useState('')
  const [report, setReport]     = useState(null)

  /* Login simple côté client */
  function doLogin(e) {
    e.preventDefault()
    if (pwd === ADMIN_PASSWORD) { setAuth(true); setError('') }
    else setError('Mot de passe incorrect')
  }

  /* Charger les clients + leurs stats */
  useEffect(() => {
    if (!auth) return
    setLoading(true)
    getClients().then(async (data) => {
      setClients(data || [])
      const s = {}
      for (const c of (data || [])) {
        try { s[c.slug] = await getStats(c.slug) } catch {}
      }
      setStats(s)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [auth])

  /* Créer un nouveau client + déclencher l'onboarding automatique */
  async function handleCreate(e) {
    e.preventDefault()
    if (!newClient.nom || !newClient.slug) return
    setCreating(true)
    setReport(null)
    try {
      const created = await createClient(newClient)
      setClients(prev => [...prev, created])
      setMsg('✅ Client "' + created.nom + '" créé · onboarding en cours…')

      const res = await fetch('/api/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': pwd || ADMIN_PASSWORD,
        },
        body: JSON.stringify({ client: created, managerEmail, plan }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg('⚠️ Client créé mais onboarding partiel : ' + (body.error || res.status))
      } else {
        setReport(body)
        const { ok = [], skipped = [], failed = [] } = body.summary || {}
        setMsg(
          `✅ ${created.nom} · activé : ${ok.join(', ') || '—'}` +
          (skipped.length ? ` · skip : ${skipped.join(', ')}` : '') +
          (failed.length ? ` · échec : ${failed.join(', ')}` : ''),
        )
      }
      setNewClient({ nom:'', slug:'', couleur:'#6D28D9' })
      setManagerEmail('')
      setPlan('starter')
      setShowForm(false)
      setTimeout(() => setMsg(''), 8000)
    } catch(err) {
      setMsg('❌ Erreur : ' + err.message)
    }
    setCreating(false)
  }

  /* Générer le slug depuis le nom */
  function slugify(nom) {
    return nom.toLowerCase()
      .replace(/[éèêë]/g,'e').replace(/[àâä]/g,'a')
      .replace(/[ùûü]/g,'u').replace(/[îï]/g,'i')
      .replace(/[ôö]/g,'o').replace(/ç/g,'c')
      .replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')
  }

  const pColors = {
    surcharge:'#DC2626', vigilance:'#D97706',
    equilibre:'#6366F1', resilient:'#059669'
  }
  const pLabels = {
    surcharge:'🔴 Surcharge', vigilance:'🟡 Vigilance',
    equilibre:'🔵 Équilibre', resilient:'🟢 Résilient'
  }

  /* ── ÉCRAN LOGIN ── */
  if (!auth) return (
    <div style={S.page}>
      <div style={S.loginBox}>
        <div style={S.logo}>PHYSICARE<sup style={{fontSize:14}}>®</sup></div>
        <p style={S.logoSub}>Back-office · Accès Physicare</p>
        <form onSubmit={doLogin}>
          <input
            style={S.input} type="password" placeholder="Mot de passe admin"
            value={pwd} onChange={e => setPwd(e.target.value)} autoFocus
          />
          {error && <div style={S.err}>{error}</div>}
          <button style={S.btn} type="submit">Accéder →</button>
        </form>
      </div>
    </div>
  )

  /* ── BACK-OFFICE ── */
  return (
    <div style={{ background:'#F5F3FF', minHeight:'100vh', fontFamily:'Nunito, sans-serif' }}>

      {/* Header */}
      <div style={S.header}>
        <div style={S.logo2}>PHYSICARE<sup style={{fontSize:13}}>®</sup></div>
        <div style={{ fontSize:13, color:'#6B7280', fontWeight:700 }}>Back-office · {clients.length} client(s)</div>
        <button style={S.btnSm} onClick={() => setAuth(false)}>Déconnexion</button>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'28px 20px' }}>

        {/* Message */}
        {msg && <div style={S.msgBox}>{msg}</div>}

        {/* Titre + bouton nouveau client */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:900, color:'#111827', marginBottom:4 }}>
              Tous vos clients
            </h1>
            <p style={{ fontSize:13, color:'#6B7280', fontWeight:600 }}>
              Chaque client a son URL dédiée · Les données sont isolées automatiquement
            </p>
          </div>
          <button style={S.btn} onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Annuler' : '+ Nouveau client'}
          </button>
        </div>

        {/* Formulaire nouveau client */}
        {showForm && (
          <div style={S.formBox}>
            <div style={{ fontSize:15, fontWeight:800, color:'#111827', marginBottom:16 }}>
              Créer un nouveau client
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:12, alignItems:'end' }}>
                <div>
                  <label style={S.label}>Nom du client *</label>
                  <input
                    style={S.input} placeholder="Ex: Optical Center Lyon"
                    value={newClient.nom}
                    onChange={e => setNewClient(p => ({
                      ...p, nom:e.target.value,
                      slug: slugify(e.target.value)
                    }))}
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Slug URL (généré automatiquement)</label>
                  <input
                    style={{...S.input, background:'#F9FAFB'}}
                    value={newClient.slug}
                    onChange={e => setNewClient(p => ({...p, slug:e.target.value}))}
                    placeholder="optical-center-lyon"
                  />
                </div>
                <div>
                  <label style={S.label}>Couleur</label>
                  <input
                    type="color" value={newClient.couleur}
                    onChange={e => setNewClient(p => ({...p, couleur:e.target.value}))}
                    style={{ width:48, height:42, border:'2px solid #E5E7EB', borderRadius:8, cursor:'pointer' }}
                  />
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12 }}>
                <div>
                  <label style={S.label}>Email du manager (onboarding auto)</label>
                  <input
                    style={S.input} type="email" placeholder="manager@client.fr"
                    value={managerEmail}
                    onChange={e => setManagerEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label style={S.label}>Plan</label>
                  <select
                    style={{...S.input, background:'#fff', cursor:'pointer'}}
                    value={plan}
                    onChange={e => setPlan(e.target.value)}
                  >
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop:14, display:'flex', alignItems:'center', gap:12 }}>
                <button style={S.btn} type="submit" disabled={creating}>
                  {creating ? 'Création + onboarding…' : 'Créer le client →'}
                </button>
                {newClient.slug && (
                  <span style={{ fontSize:13, color:'#6B7280', fontWeight:600 }}>
                    URL : <strong style={{color:'#6D28D9'}}>/{newClient.slug}</strong>
                  </span>
                )}
              </div>
              <div style={{ marginTop:8, fontSize:11, color:'#9CA3AF', fontWeight:600 }}>
                Connecteurs auto : Supabase · Stripe · Resend · Slack · Vercel
                (chacun activé si sa clé d'API est configurée)
              </div>
            </form>
          </div>
        )}

        {/* Rapport d'onboarding */}
        {report && (
          <div style={S.formBox}>
            <div style={{ fontSize:14, fontWeight:800, color:'#111827', marginBottom:10 }}>
              Rapport d'onboarding
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:8 }}>
              {Object.entries(report.report || {}).map(([name, r]) => {
                const color = r.ok ? '#059669' : r.skipped ? '#9CA3AF' : '#DC2626'
                const label = r.ok ? 'OK' : r.skipped ? 'SKIP' : 'FAIL'
                return (
                  <div key={name} style={{ border:'2px solid #F3F4F6', borderRadius:10, padding:'10px 12px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <strong style={{ fontSize:13, color:'#111827' }}>{name}</strong>
                      <span style={{ fontSize:11, fontWeight:800, color }}>{label}</span>
                    </div>
                    <div style={{ fontSize:11, color:'#6B7280', marginTop:4, fontWeight:600 }}>
                      {r.reason || r.error || r.note || (r.data && JSON.stringify(r.data).slice(0, 80)) || '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Liste clients */}
        {loading ? (
          <div style={{ textAlign:'center', padding:48, color:'#9CA3AF', fontSize:16, fontWeight:700 }}>
            Chargement…
          </div>
        ) : clients.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize:42, marginBottom:12 }}>🏢</div>
            <div style={{ fontSize:16, fontWeight:800, color:'#374151', marginBottom:6 }}>
              Aucun client encore
            </div>
            <div style={{ fontSize:13, color:'#9CA3AF', fontWeight:600 }}>
              Cliquez "+ Nouveau client" pour commencer
            </div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
            {clients.map(cl => {
              const st = stats[cl.slug] || {}
              const total = st.total_repondants || 0
              const isc   = st.isc_moyen || '—'
              const url   = typeof window !== 'undefined'
                ? window.location.origin + '/' + cl.slug
                : '/' + cl.slug
              return (
                <div key={cl.slug} style={S.clientCard}>
                  {/* Header carte */}
                  <div style={{ background: cl.couleur || '#6D28D9', padding:'16px 18px', borderRadius:'12px 12px 0 0' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ fontSize:16, fontWeight:900, color:'#fff' }}>{cl.nom}</div>
                      <span style={{ fontSize:11, background:'rgba(255,255,255,.2)', color:'#fff', padding:'3px 10px', borderRadius:999, fontWeight:800 }}>
                        {cl.actif ? 'ACTIF' : 'INACTIF'}
                      </span>
                    </div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,.75)', marginTop:4, fontWeight:600 }}>
                      {url}
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ padding:'16px 18px' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
                      <div style={S.statBox}>
                        <div style={{ fontSize:22, fontWeight:900, color:'#111827' }}>{total}</div>
                        <div style={{ fontSize:10, color:'#9CA3AF', fontWeight:700, textTransform:'uppercase' }}>Répondants</div>
                      </div>
                      <div style={S.statBox}>
                        <div style={{ fontSize:22, fontWeight:900, color: isc >= 3.5 ? '#DC2626' : isc >= 3.2 ? '#D97706' : '#059669' }}>
                          {typeof isc === 'number' ? isc.toFixed(1) : '—'}
                        </div>
                        <div style={{ fontSize:10, color:'#9CA3AF', fontWeight:700, textTransform:'uppercase' }}>ISC moyen</div>
                      </div>
                      <div style={S.statBox}>
                        <div style={{ fontSize:22, fontWeight:900, color:'#6D28D9' }}>
                          {st.resilience_moyenne ? Number(st.resilience_moyenne).toFixed(2) : '—'}
                        </div>
                        <div style={{ fontSize:10, color:'#9CA3AF', fontWeight:700, textTransform:'uppercase' }}>Résilience</div>
                      </div>
                    </div>

                    {/* Répartition profils */}
                    {total > 0 && (
                      <div style={{ marginBottom:14 }}>
                        {['surcharge','vigilance','equilibre','resilient'].map(p => {
                          const n = st['nb_'+p] || 0
                          const pct = total > 0 ? Math.round(n/total*100) : 0
                          return (
                            <div key={p} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                              <div style={{ fontSize:11, fontWeight:700, color:'#374151', minWidth:100 }}>
                                {pLabels[p]}
                              </div>
                              <div style={{ flex:1, height:6, background:'#F3F4F6', borderRadius:999, overflow:'hidden' }}>
                                <div style={{ width:pct+'%', height:'100%', background:pColors[p], borderRadius:999 }}/>
                              </div>
                              <div style={{ fontSize:11, fontWeight:800, color:'#111827', minWidth:22 }}>{n}</div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Boutons */}
                    <div style={{ display:'flex', gap:8 }}>
                      <a href={'/'+cl.slug} target="_blank" rel="noreferrer"
                        style={{ flex:1, padding:'9px 0', background:'#EDE9FE', color:'#4C1D95', border:'none',
                          borderRadius:8, fontSize:12, fontWeight:800, textAlign:'center',
                          cursor:'pointer', textDecoration:'none' }}>
                        👁 Voir l'espace
                      </a>
                      <a href={'/'+cl.slug+'/dashboard'} target="_blank" rel="noreferrer"
                        style={{ flex:1, padding:'9px 0', background:'linear-gradient(135deg,#6D28D9,#8B5CF6)',
                          color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:800,
                          textAlign:'center', cursor:'pointer', textDecoration:'none' }}>
                        📊 Dashboard
                      </a>
                    </div>

                    {/* Dernière réponse */}
                    {st.derniere_reponse && (
                      <div style={{ fontSize:11, color:'#9CA3AF', marginTop:10, fontWeight:600 }}>
                        Dernière réponse : {new Date(st.derniere_reponse).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Styles ── */
const S = {
  page:      { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#F5F3FF', fontFamily:'Nunito,sans-serif' },
  loginBox:  { background:'#fff', border:'2px solid #E5E7EB', borderRadius:20, padding:'36px 32px', width:380, boxShadow:'0 12px 40px rgba(109,40,217,.14)' },
  logo:      { fontFamily:'sans-serif', fontSize:28, fontWeight:900, background:'linear-gradient(135deg,#4C1D95,#7C3AED,#A855F7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:6 },
  logo2:     { fontFamily:'sans-serif', fontSize:22, fontWeight:900, background:'linear-gradient(135deg,#4C1D95,#7C3AED)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' },
  logoSub:   { fontSize:13, color:'#6B7280', marginBottom:22, fontWeight:600 },
  input:     { width:'100%', padding:'11px 14px', border:'2px solid #E5E7EB', borderRadius:10, fontSize:14, fontFamily:'Nunito,sans-serif', fontWeight:600, outline:'none', boxSizing:'border-box', marginBottom:10 },
  btn:       { background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'#fff', border:'none', borderRadius:10, padding:'12px 24px', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif', width:'100%' },
  btnSm:     { background:'#fff', color:'#6D28D9', border:'2px solid #C4B5FD', borderRadius:8, padding:'7px 16px', fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' },
  err:       { background:'#FEF2F2', border:'2px solid #FECACA', borderRadius:8, padding:'8px 12px', fontSize:13, color:'#7F1D1D', fontWeight:700, marginBottom:10 },
  msgBox:    { background:'#ECFDF5', border:'2px solid #A7F3D0', borderRadius:10, padding:'12px 18px', fontSize:13, color:'#065F46', fontWeight:700, marginBottom:18 },
  formBox:   { background:'#fff', border:'2px solid #E5E7EB', borderRadius:14, padding:'22px 24px', marginBottom:22, boxShadow:'0 2px 12px rgba(109,40,217,.08)' },
  label:     { fontSize:12, fontWeight:800, color:'#374151', marginBottom:5, display:'block' },
  clientCard:{ background:'#fff', border:'2px solid #E5E7EB', borderRadius:14, overflow:'hidden', boxShadow:'0 2px 12px rgba(109,40,217,.08)' },
  statBox:   { background:'#F9FAFB', border:'2px solid #F3F4F6', borderRadius:10, padding:'10px', textAlign:'center' },
  header:    { background:'#fff', borderBottom:'2px solid #EDE9FE', padding:'0 28px', height:58, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100, boxShadow:'0 2px 8px rgba(109,40,217,.07)' },
  empty:     { textAlign:'center', padding:'64px 20px', background:'#fff', borderRadius:14, border:'2px solid #E5E7EB' },
}
