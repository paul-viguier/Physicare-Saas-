// ═══════════════════════════════════════════════
//  PHYSICARE® — Dashboard manager par client
//  URL : /optical-center/dashboard
// ═══════════════════════════════════════════════
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getDiagnostics, getStats } from '../../lib/clients'

export default function Dashboard() {
  const router = useRouter()
  const { client } = router.query
  const [auth, setAuth]   = useState(false)
  const [email, setEmail] = useState('')
  const [pwd, setPwd]     = useState('')
  const [err, setErr]     = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData]   = useState([])
  const [stats, setStats] = useState(null)
  const [clientInfo, setClientInfo] = useState(null)

  /* Auth Supabase */
  async function doLogin(e) {
    e.preventDefault()
    setLoading(true); setErr('')
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password: pwd })
    if (error) { setErr('Identifiants incorrects'); setLoading(false); return }
    setAuth(true)
    await loadData()
    setLoading(false)
  }

  async function loadData() {
    if (!client) return
    const [diags, st, cl] = await Promise.all([
      getDiagnostics(client),
      getStats(client),
      supabase.from('clients').select('*').eq('slug', client).single().then(r => r.data)
    ])
    setData(diags || [])
    setStats(st)
    setClientInfo(cl)
  }

  useEffect(() => { if (auth && client) loadData() }, [auth, client])

  const pColors  = { surcharge:'#DC2626', vigilance:'#D97706', equilibre:'#6366F1', resilient:'#059669' }
  const pLabels  = { surcharge:'🔴 Surcharge critique', vigilance:'🟡 Vigilance', equilibre:'🔵 Équilibre fragile', resilient:'🟢 Résilient' }
  const avatarColors = ['#7C3AED','#DB2777','#059669','#D97706','#4F46E5','#0891B2','#9D174D']

  /* LOGIN */
  if (!auth) return (
    <div style={S.page}>
      <div style={S.box}>
        <div style={S.logo}>PHYSICARE<sup style={{fontSize:13}}>®</sup></div>
        <p style={{ fontSize:13, color:'#6B7280', marginBottom:20, fontWeight:600 }}>
          Dashboard manager · {client}
        </p>
        <form onSubmit={doLogin}>
          <input style={S.inp} type="email" placeholder="Email manager" value={email}
            onChange={e => setEmail(e.target.value)} required />
          <input style={S.inp} type="password" placeholder="Mot de passe" value={pwd}
            onChange={e => setPwd(e.target.value)} required />
          {err && <div style={S.err}>{err}</div>}
          <button style={S.btn} type="submit" disabled={loading}>
            {loading ? 'Connexion…' : 'Accéder au dashboard →'}
          </button>
        </form>
      </div>
    </div>
  )

  /* DASHBOARD */
  return (
    <div style={{ background:'#F5F3FF', minHeight:'100vh', fontFamily:'Nunito,sans-serif' }}>
      <div style={S.header}>
        <div>
          <span style={S.logo}>PHYSICARE<sup style={{fontSize:12}}>®</sup></span>
          <span style={{ fontSize:13, color:'#6B7280', marginLeft:10, fontWeight:700 }}>
            {clientInfo?.nom || client} · Dashboard manager
          </span>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button style={S.btnSm} onClick={loadData}>⟳ Actualiser</button>
          <button style={S.btnSm} onClick={() => supabase.auth.signOut().then(() => setAuth(false))}>
            Déconnexion
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'24px 20px' }}>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:13, marginBottom:20 }}>
          {[
            { l:'Répondants', v: stats?.total_repondants || 0, c:'#6D28D9' },
            { l:'ISC moyen', v: stats?.isc_moyen ? Number(stats.isc_moyen).toFixed(2) : '—',
              c: stats?.isc_moyen >= 3.5 ? '#DC2626' : stats?.isc_moyen >= 3.2 ? '#D97706' : '#059669' },
            { l:'Résilience moy.', v: stats?.resilience_moyenne ? Number(stats.resilience_moyenne).toFixed(2) : '—',
              c: stats?.resilience_moyenne < 0.8 ? '#DC2626' : stats?.resilience_moyenne < 1.0 ? '#D97706' : '#059669' },
            { l:'Régulation moy.', v: stats?.regulation_moyenne ? Number(stats.regulation_moyenne).toFixed(1) : '—', c:'#0891B2' },
          ].map((k,i) => (
            <div key={i} style={S.kpi}>
              <div style={{ fontSize:11, fontWeight:800, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>{k.l}</div>
              <div style={{ fontSize:32, fontWeight:900, color:k.c, lineHeight:1 }}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Répartition profils */}
        {stats && (
          <div style={{ ...S.card, marginBottom:18 }}>
            <div style={S.cardTitle}>Répartition des profils T0</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
              {['surcharge','vigilance','equilibre','resilient'].map(p => (
                <div key={p} style={{ background:'#F9FAFB', border:'2px solid #F3F4F6', borderRadius:10, padding:'14px', textAlign:'center' }}>
                  <div style={{ fontSize:28, fontWeight:900, color:pColors[p] }}>{stats['nb_'+p] || 0}</div>
                  <div style={{ fontSize:11, color:'#6B7280', fontWeight:700, marginTop:4 }}>{pLabels[p]}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table diagnostics */}
        <div style={S.card}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={S.cardTitle}>Profils anonymisés ({data.length})</div>
            <button style={S.btnSm} onClick={() => {
              const csv = [
                ['Code','Poste','Centre','ISC','Résilience','Profil','Date'].join(','),
                ...data.map(r => [r.code,r.poste,r.centre,r.isc,r.resilience,r.profil,
                  new Date(r.created_at).toLocaleDateString('fr-FR')].join(','))
              ].join('\n')
              const a = document.createElement('a')
              a.href = URL.createObjectURL(new Blob(['\uFEFF'+csv], {type:'text/csv'}))
              a.download = `physicare_${client}.csv`; a.click()
            }}>↓ Export CSV</button>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#EDE9FE' }}>
                  {['Code','Poste','Centre','ISC','Résilience','Profil T0','Date'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((r,i) => (
                  <tr key={r.id} style={{ background: i%2===0 ? '#fff' : '#F9FAFB' }}>
                    <td style={S.td}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:28, height:28, borderRadius:'50%', background:avatarColors[i%avatarColors.length],
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'#fff' }}>
                          {String(i+1).padStart(2,'0')}
                        </div>
                        <span style={{ fontSize:12, fontWeight:800 }}>{r.code}</span>
                      </div>
                    </td>
                    <td style={S.td}><span style={S.pill}>{r.poste || '—'}</span></td>
                    <td style={S.td}>{r.centre || '—'}</td>
                    <td style={S.td}>
                      <span style={{ fontWeight:800, color: r.isc >= 3.5 ? '#DC2626' : r.isc >= 3.2 ? '#D97706' : '#059669' }}>
                        {r.isc}
                      </span>
                    </td>
                    <td style={S.td}>
                      <span style={{ fontWeight:800, color: r.resilience < 0.8 ? '#DC2626' : r.resilience < 1.0 ? '#D97706' : '#059669' }}>
                        {r.resilience}
                      </span>
                    </td>
                    <td style={S.td}>
                      <span style={{ fontSize:11, fontWeight:800, padding:'3px 10px', borderRadius:999,
                        background: r.profil==='surcharge'?'#FEF2F2':r.profil==='vigilance'?'#FFFBEB':r.profil==='resilient'?'#ECFDF5':'#EEF2FF',
                        color: pColors[r.profil] || '#6B7280' }}>
                        {pLabels[r.profil] || r.profil}
                      </span>
                    </td>
                    <td style={{...S.td, fontSize:11, color:'#9CA3AF'}}>
                      {new Date(r.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length === 0 && (
              <div style={{ textAlign:'center', padding:32, color:'#9CA3AF', fontWeight:700 }}>
                Aucune réponse encore — partagez le lien aux collaborateurs !
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const S = {
  page:   { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#F5F3FF', fontFamily:'Nunito,sans-serif' },
  box:    { background:'#fff', border:'2px solid #E5E7EB', borderRadius:20, padding:'34px 30px', width:380, boxShadow:'0 12px 40px rgba(109,40,217,.12)' },
  logo:   { fontFamily:'sans-serif', fontSize:24, fontWeight:900, background:'linear-gradient(135deg,#4C1D95,#7C3AED)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', display:'block', marginBottom:4 },
  inp:    { width:'100%', padding:'11px 14px', border:'2px solid #E5E7EB', borderRadius:10, fontSize:14, fontFamily:'Nunito,sans-serif', fontWeight:600, outline:'none', marginBottom:10, boxSizing:'border-box' },
  btn:    { width:'100%', background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'#fff', border:'none', borderRadius:10, padding:'12px 24px', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' },
  btnSm:  { background:'#fff', color:'#6D28D9', border:'2px solid #C4B5FD', borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'Nunito,sans-serif' },
  err:    { background:'#FEF2F2', border:'2px solid #FECACA', borderRadius:8, padding:'8px 12px', fontSize:13, color:'#7F1D1D', fontWeight:700, marginBottom:10 },
  header: { background:'#fff', borderBottom:'2px solid #EDE9FE', padding:'0 24px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 },
  card:   { background:'#fff', border:'2px solid #E5E7EB', borderRadius:14, padding:'20px 22px', boxShadow:'0 2px 12px rgba(109,40,217,.07)' },
  cardTitle: { fontSize:15, fontWeight:800, color:'#111827', marginBottom:14 },
  kpi:    { background:'#fff', border:'2px solid #E5E7EB', borderRadius:12, padding:'16px 18px', boxShadow:'0 2px 8px rgba(109,40,217,.07)' },
  th:     { padding:'10px 12px', textAlign:'left', fontSize:11, fontWeight:800, color:'#6D28D9', textTransform:'uppercase', letterSpacing:'.07em', borderBottom:'2px solid #E5E7EB' },
  td:     { padding:'10px 12px', fontSize:13, color:'#374151', fontWeight:600, borderBottom:'1px solid #F3F4F6', verticalAlign:'middle' },
  pill:   { fontSize:11, fontWeight:700, background:'#F3F4F6', color:'#374151', padding:'3px 10px', borderRadius:999 },
}
