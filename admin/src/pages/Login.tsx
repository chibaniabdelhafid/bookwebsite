import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await login(email, password)  // ← login prend email + password maintenant
    if (!error) navigate('/dashboard')
    else setError(error)
    
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #050B14 0%, #0A1526 50%, #0F2038 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Cairo', 'Segoe UI', sans-serif", padding: '20px',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Background pattern */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.15 }}>
        <svg width="100%" height="100%"><defs><pattern id="p" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M40 6L46 28L66 22L53 40L66 58L46 52L40 74L34 52L14 58L27 40L14 22L34 28Z" fill="none" stroke="#2563EB" strokeWidth="1"/>
        </pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>
      </div>

      <div style={{
        background: 'rgba(255,253,248,0.04)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(37,99,235,0.2)', borderRadius: '24px',
        padding: 'clamp(28px, 6vw, 48px) clamp(20px, 5vw, 40px)',
        width: '100%', maxWidth: '420px',
        boxShadow: '0 30px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(37,99,235,0.05)',
        position: 'relative'
      }}>
        {/* Corner accents */}
        {[['top','right'],['top','left'],['bottom','right'],['bottom','left']].map(([v,h],i) => (
          <div key={i} style={{
            position: 'absolute', [v]: 0, [h]: 0, width: '36px', height: '36px',
            borderTop: v==='top' ? '2px solid #2563EB' : 'none',
            borderBottom: v==='bottom' ? '2px solid #2563EB' : 'none',
            borderRight: h==='right' ? '2px solid #2563EB' : 'none',
            borderLeft: h==='left' ? '2px solid #2563EB' : 'none',
            borderRadius: v==='top'&&h==='right'?'0 24px 0 0':v==='top'&&h==='left'?'24px 0 0 0':v==='bottom'&&h==='right'?'0 0 24px 0':'0 0 0 24px',
            pointerEvents: 'none'
          }}/>
        ))}

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #14356B, #2563EB)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(37,99,235,0.3)'
          }}>📚</div>
          <h1 style={{ color: '#8FC1FF', fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 800, margin: 0 }}>
            القدس للكتاب
          </h1>
          <p style={{ color: 'rgba(37,99,235,0.5)', fontSize: '12px', marginTop: '6px', letterSpacing: '2px' }}>
            ADMIN DASHBOARD
          </p>
          <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, #2563EB, transparent)', margin: '16px 0 0' }}/>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: 'rgba(37,99,235,0.7)', fontSize: '13px', display: 'block', marginBottom: '8px', fontWeight: 600 }}>📧 Email</label>
            <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Votre email"
                style={{
                  width: '100%', padding: '14px 48px 14px 16px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1.5px solid rgba(37,99,235,0.2)',
                  borderRadius: '12px', color: '#fff', fontSize: '16px',
                  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
                  fontFamily: 'inherit'
                }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = 'rgba(37,99,235,0.2)'}
              />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: 'rgba(37,99,235,0.7)', fontSize: '13px', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              🔑 Mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••"
                style={{
                  width: '100%', padding: '14px 48px 14px 16px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1.5px solid rgba(37,99,235,0.2)',
                  borderRadius: '12px', color: '#fff', fontSize: '16px',
                  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
                  fontFamily: 'inherit'
                }}
                onFocus={e => e.target.style.borderColor = '#2563EB'}
                onBlur={e => e.target.style.borderColor = 'rgba(37,99,235,0.2)'}
              />
              <button type="button" onClick={() => setShow(s => !s)} style={{
                position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: 0
              }}>{show ? '🙈' : '👁️'}</button>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px', padding: '10px 14px', color: '#ff6b6b',
              fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'
            }}>❌ {error}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '15px',
            background: loading ? 'rgba(37,99,235,0.4)' : 'linear-gradient(135deg, #14356B, #2563EB)',
            border: 'none', borderRadius: '12px', color: '#FFF8E7',
            fontSize: '16px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s', fontFamily: 'inherit',
            boxShadow: loading ? 'none' : '0 6px 20px rgba(37,99,235,0.35)'
          }}>
            {loading ? '⏳ Connexion...' : '🚀 Se connecter'}
          </button>
        </form>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800&display=swap');`}</style>
    </div>
  )
}