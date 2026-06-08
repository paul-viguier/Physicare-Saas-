// ═══════════════════════════════════════════════
//  PHYSICARE® — Styles & composants partagés
// ═══════════════════════════════════════════════
import Link from 'next/link'
import { useRouter } from 'next/router'
import { logout, ROLE_LABEL } from '@/core/auth'

export const COLORS = {
  bg: '#F5F3FF', purple: '#6D28D9', purpleDark: '#4C1D95',
  text: '#111827', muted: '#9CA3AF', border: '#E5E7EB',
}

export const styles = {
  pageCenter: { display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:COLORS.bg, fontFamily:'Nunito, system-ui, sans-serif' },
  page:       { minHeight:'100vh', background:COLORS.bg, fontFamily:'Nunito, system-ui, sans-serif' },
  logo:       { fontFamily:'sans-serif', fontWeight:900, background:'linear-gradient(135deg,#4C1D95,#7C3AED,#A855F7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' },
  card:       { background:'#fff', border:`2px solid ${COLORS.border}`, borderRadius:14, padding:'22px 24px', boxShadow:'0 2px 12px rgba(109,40,217,.07)' },
  input:      { width:'100%', padding:'11px 14px', border:`2px solid ${COLORS.border}`, borderRadius:10, fontSize:14, fontWeight:600, outline:'none', boxSizing:'border-box', marginBottom:10, fontFamily:'inherit' },
  btn:        { width:'100%', background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'#fff', border:'none', borderRadius:10, padding:'13px 24px', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit' },
  btnSm:      { background:'#fff', color:COLORS.purple, border:'2px solid #C4B5FD', borderRadius:8, padding:'7px 16px', fontSize:12, fontWeight:800, cursor:'pointer', fontFamily:'inherit' },
  err:        { background:'#FEF2F2', border:'2px solid #FECACA', borderRadius:8, padding:'8px 12px', fontSize:13, color:'#7F1D1D', fontWeight:700, marginBottom:10 },
}

export function Loader({ label = 'Chargement…' }) {
  return (
    <div style={styles.pageCenter}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
        <div style={{ width:48, height:48, borderRadius:'50%', background:'linear-gradient(135deg,#4C1D95,#7C3AED)', animation:'pulse 1.5s ease-in-out infinite' }} />
        <p style={{ color:COLORS.purple, fontWeight:700 }}>{label}</p>
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </div>
    </div>
  )
}

// Barre d'onglets de navigation dans un espace
// items: [{ href, label }]
export function SpaceNav({ items = [] }) {
  const router = useRouter()
  return (
    <div style={{ background:'#fff', borderBottom:`1px solid ${COLORS.border}`, padding:'0 28px',
      display:'flex', gap:6, position:'sticky', top:62, zIndex:90 }}>
      {items.map(it => {
        const active = router.asPath === it.href || router.asPath.startsWith(it.href + '/')
        return (
          <Link key={it.href} href={it.href} style={{
            padding:'13px 14px', fontSize:13, fontWeight:800, textDecoration:'none',
            color: active ? COLORS.purple : COLORS.muted,
            borderBottom: `3px solid ${active ? COLORS.purple : 'transparent'}`,
          }}>{it.label}</Link>
        )
      })}
    </div>
  )
}

// Petite carte de statistique réutilisable
export function StatCard({ label, value, color }) {
  return (
    <div style={{ ...styles.card, padding:'16px 18px' }}>
      <div style={{ fontSize:11, fontWeight:800, color:COLORS.muted, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:30, fontWeight:900, color: color || COLORS.text, lineHeight:1 }}>{value}</div>
    </div>
  )
}

// Bloc « aucune donnée »
export function EmptyState({ icon = '📭', title, children }) {
  return (
    <div style={{ ...styles.card, textAlign:'center', padding:'40px 24px' }}>
      <div style={{ fontSize:36, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:15, fontWeight:800, color:COLORS.text, marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:13, color:COLORS.muted, fontWeight:600 }}>{children}</div>
    </div>
  )
}

// Écran « espace en construction » pour les phases à venir
export function ComingSoon({ profile, badge, title, children }) {
  return (
    <div style={styles.page}>
      <AppHeader profile={profile} badge={badge} />
      <div style={{ maxWidth:800, margin:'0 auto', padding:'48px 20px' }}>
        <div style={{ ...styles.card, textAlign:'center', padding:'48px 32px' }}>
          <div style={{ fontSize:42, marginBottom:14 }}>🚧</div>
          <h1 style={{ fontSize:22, fontWeight:900, color:COLORS.text, marginBottom:8 }}>{title}</h1>
          <p style={{ fontSize:14, color:COLORS.muted, fontWeight:600, marginBottom:6 }}>
            Connecté en tant que <strong style={{ color:COLORS.purple }}>{profile?.email}</strong>.
          </p>
          <div style={{ fontSize:13, color:COLORS.muted, fontWeight:600 }}>{children}</div>
        </div>
      </div>
    </div>
  )
}

// En-tête commun aux espaces connectés
export function AppHeader({ profile, badge }) {
  const router = useRouter()
  async function doLogout() { await logout(); router.replace('/login') }
  return (
    <div style={{ background:'#fff', borderBottom:'2px solid #EDE9FE', padding:'0 28px', height:62,
      display:'flex', alignItems:'center', justifyContent:'space-between',
      position:'sticky', top:0, zIndex:100, boxShadow:'0 2px 8px rgba(109,40,217,.07)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ ...styles.logo, fontSize:24, fontStyle:'italic' }}>PHYSICARE®</span>
        {badge && (
          <span style={{ background:'#EDE9FE', color:COLORS.purple, fontSize:11, fontWeight:800,
            padding:'4px 12px', borderRadius:999, border:'2px solid #C4B5FD' }}>{badge}</span>
        )}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:12, color:COLORS.muted, fontWeight:600 }}>
          {profile?.email} · {ROLE_LABEL[profile?.role] || profile?.role}
        </span>
        <Link href="/account" style={{ ...styles.btnSm, textDecoration:'none' }}>Mon compte</Link>
        <button style={styles.btnSm} onClick={doLogout}>Déconnexion</button>
      </div>
    </div>
  )
}
