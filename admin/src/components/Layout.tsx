import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/dashboard', icon: '📊', label: 'Statistiques', end: true },
  { to: '/dashboard/orders', icon: '📦', label: 'Commandes' },
  { to: '/dashboard/books', icon: '📚', label: 'Livres' },
]

export default function Layout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const goldDark = '#B8860B'
// author permission
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0D0A04', fontFamily: "'Cairo', 'Segoe UI', sans-serif" }}>

      {/* ── Sidebar desktop ── */}
      <aside style={{
        width: '220px', flexShrink: 0,
        background: 'rgba(255,253,248,0.03)',
        borderLeft: '1px solid rgba(232,184,0,0.12)',
        display: 'flex', flexDirection: 'column',
        padding: '24px 12px',
        position: 'sticky', top: 0, height: '100vh',
      }} className="sidebar-desk">

        {/* Logo */}
        <div style={{ padding: '0 8px', marginBottom: '28px', borderBottom: '1px solid rgba(232,184,0,0.1)', paddingBottom: '20px' }}>
          <div style={{ fontSize: '22px', marginBottom: '4px' }}>📚</div>
          <div style={{ color: '#FFD700', fontWeight: 800, fontSize: '15px' }}>مكتبة كتابي</div>
          <div style={{ color: 'rgba(232,184,0,0.4)', fontSize: '10px', letterSpacing: '2px' }}>ADMIN</div>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '11px 12px', borderRadius: '12px',
              color: isActive ? '#FFF8E7' : 'rgba(232,184,0,0.5)',
              background: isActive ? `linear-gradient(135deg, #5C3A1E, ${goldDark})` : 'transparent',
              border: isActive ? 'none' : '1px solid transparent',
              textDecoration: 'none', fontSize: '14px',
              fontWeight: isActive ? 700 : 400, transition: 'all 0.2s',
              boxShadow: isActive ? '0 4px 14px rgba(184,134,11,0.3)' : 'none'
            })}>
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        {/* Bouton Voir le site - Desktop */}
        <a
          href="https://kitabi-roan.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '11px 12px', borderRadius: '12px',
            color: 'rgba(232,184,0,0.6)',
            background: 'transparent',
            border: '1px solid rgba(232,184,0,0.2)',
            textDecoration: 'none', fontSize: '14px',
            marginBottom: '8px', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,184,0,0.08)'; e.currentTarget.style.color = '#FFD700' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(232,184,0,0.6)' }}
        >
          <span>🌐</span><span>Voir le site</span>
        </a>
        <button onClick={handleLogout} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '11px 12px', borderRadius: '12px',
          color: 'rgba(239,68,68,0.6)', background: 'transparent',
          border: '1px solid transparent', cursor: 'pointer', fontSize: '14px', width: '100%',
          transition: 'all 0.2s', fontFamily: 'inherit'
        }}
          onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget).style.color = '#ef4444' }}
          onMouseLeave={e => { (e.currentTarget).style.background = 'transparent'; (e.currentTarget).style.color = 'rgba(239,68,68,0.6)' }}
        >
          <span>🚪</span><span>Déconnexion</span>
        </button>
      </aside>

      {/* ── Bottom nav mobile ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(13,10,4,0.96)', backdropFilter: 'blur(16px)',
        borderTop: `1px solid rgba(232,184,0,0.15)`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        padding: '8px 0 12px', gap: '4px'
      }} className="mobile-nav">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end} style={({ isActive }) => ({
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
            padding: '6px 16px', borderRadius: '14px', textDecoration: 'none',
            background: isActive ? `linear-gradient(135deg, #5C3A1E, ${goldDark})` : 'transparent',
            color: isActive ? '#FFF8E7' : 'rgba(232,184,0,0.4)',
            fontSize: '10px', fontWeight: isActive ? 700 : 400, transition: 'all 0.2s',
            minWidth: '60px'
          })}>
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
          
        ))}
        <a
            href="https://kitabi-roan.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
              padding: '6px 16px', borderRadius: '14px',
              color: 'rgba(232,184,0,0.5)', fontSize: '10px',
              textDecoration: 'none', minWidth: '60px'
            }}
          >
            <span style={{ fontSize: '20px' }}>🌐</span>
            <span>Le site</span>
          </a>
          <button onClick={handleLogout} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
          padding: '6px 16px', borderRadius: '14px',
          background: 'transparent', border: 'none',
          color: 'rgba(239,68,68,0.5)', fontSize: '10px', cursor: 'pointer',
          fontFamily: 'inherit', minWidth: '60px'
        }}>
          <span style={{ fontSize: '20px' }}>🚪</span>
          <span>Quitter</span>
        </button>
      </div>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', padding: 'clamp(16px, 3vw, 32px)', paddingBottom: '90px' }}>
        <Outlet />
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        .sidebar-desk { display: flex !important; }
        .mobile-nav { display: none !important; }
        @media (max-width: 640px) {
          .sidebar-desk { display: none !important; }
          .mobile-nav { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
