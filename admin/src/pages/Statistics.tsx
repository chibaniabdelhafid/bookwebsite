import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Stats {
  totalOrders: number; pendingOrders: number; completedOrders: number
  totalRevenue: number; totalBooks: number
}

function StatCard({ icon, label, value, color }: { icon: string, label: string, value: string | number, color: string }) {
  return (
    <div style={{
      background: 'rgba(255,253,248,0.04)', border: `1px solid ${color}25`,
      borderRadius: '16px', padding: '20px',
      display: 'flex', alignItems: 'center', gap: '14px',
      boxShadow: `0 4px 20px ${color}10`
    }}>
      <div style={{
        width: '48px', height: '48px', background: `${color}18`,
        borderRadius: '12px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '22px', flexShrink: 0,
        border: `1px solid ${color}20`
      }}>{icon}</div>
      <div>
        <div style={{ color: 'rgba(232,184,0,0.5)', fontSize: '12px', marginBottom: '4px' }}>{label}</div>
        <div style={{ color: '#FFD700', fontSize: 'clamp(20px,4vw,26px)', fontWeight: 800 }}>{value}</div>
      </div>
    </div>
  )
}

export default function Statistics() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentOrders, setRecentOrders] = useState<any[]>([])

  useEffect(() => {
    async function fetchStats() {
      try {
        const [ordersRes, booksRes] = await Promise.all([
          supabase.from('orders').select('*'),
          supabase.from('books').select('id')
        ])
        const orders = ordersRes.data || []
        const revenue = orders.reduce((s: number, o: any) => s + (o.total || 0), 0)
        setStats({
          totalOrders: orders.length,
          pendingOrders: orders.filter((o: any) => o.status === 'Attente').length,
          completedOrders: orders.filter((o: any) => o.status === 'Livrée').length,
          totalRevenue: revenue,
          totalBooks: booksRes.data?.length || 0
        })
        setRecentOrders([...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5))
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchStats()
  }, [])

  const statusColors: Record<string, string> = {
    Attente: '#f59e0b', Livrée: '#10b981', Retour: '#ef4444', Confirmé: '#6c63ff'
  }

  if (loading) return (
    <div style={{ color: 'rgba(232,184,0,0.5)', textAlign: 'center', paddingTop: '80px', fontSize: '18px' }}>
      <div style={{ fontSize: '2rem', marginBottom: '12px', animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>📚</div>
      <p>Chargement...</p>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ color: '#FFD700', fontSize: 'clamp(20px,5vw,28px)', fontWeight: 800, margin: 0 }}>📊 Tableau de bord</h1>
        <p style={{ color: 'rgba(232,184,0,0.4)', marginTop: '4px', fontSize: '13px' }}>Vue d'ensemble — مكتبة كتابي</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px,100%), 1fr))', gap: '12px', marginBottom: '32px' }}>
        <StatCard icon="📦" label="Total Commandes" value={stats?.totalOrders || 0} color="#E8B800" />
        <StatCard icon="⏳" label="En attente" value={stats?.pendingOrders || 0} color="#f59e0b" />
        <StatCard icon="✅" label="Livrées" value={stats?.completedOrders || 0} color="#10b981" />
        <StatCard icon="💰" label="Chiffre d'affaires" value={`${stats?.totalRevenue?.toLocaleString() || '0'} DA`} color="#a78bfa" />
        <StatCard icon="📚" label="Livres" value={stats?.totalBooks || 0} color="#34d399" />
      </div>

      <div style={{
        background: 'rgba(255,253,248,0.03)', borderRadius: '18px',
        border: '1px solid rgba(232,184,0,0.1)', padding: 'clamp(16px,3vw,24px)'
      }}>
        <h2 style={{ color: '#FFD700', fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>🕐 Dernières commandes</h2>

        {recentOrders.length === 0 ? (
          <p style={{ color: 'rgba(232,184,0,0.3)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>Aucune commande pour l'instant.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentOrders.map(order => (
              <div key={order.id} style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
                border: '1px solid rgba(232,184,0,0.08)', padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: '8px'
              }}>
                <div>
                  <div style={{ color: '#FFF8E7', fontWeight: 600, fontSize: '14px' }}>{order.name || '—'}</div>
                  <div style={{ color: 'rgba(232,184,0,0.4)', fontSize: '11px', marginTop: '2px' }}>
                    {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#E8B800', fontWeight: 700, fontSize: '14px' }}>{order.total} DA</span>
                  <span style={{
                    background: `${statusColors[order.status] || '#888'}20`,
                    color: statusColors[order.status] || '#888',
                    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600
                  }}>{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}