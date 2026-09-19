import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_OPTIONS = ['Attente', 'Confirmé', 'Envoyé', 'Livrée', 'Retour', 'Annulé', 'Non complète', 'Pas de réponse']

const statusColors: Record<string, string> = {
  Attente: '#ff7b00',
  Confirmé: '#00ffdd',
  Envoyé: '#0062ff',
  Retour: '#ff0000',
  Annulé: '#ffea00',
  Livrée: '#33ff00',
  'Non complète': '#94a3b8',
  'Pas de réponse': '#f97316',
}

// resposive for phone


export default function Orders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'orders' | 'abandoned'>('orders')
  const [editingOrder, setEditingOrder] = useState<any>(null)
  const [editForm, setEditForm] = useState<any>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  useEffect(() => { fetchOrders() }, [])

  async function fetchOrders() {
  setLoading(true)
    const query = supabase.from('orders').select('*, order_items(*), books(title, image_url)')
    
    if (viewMode === 'abandoned') {
      query.in('status', ['Non complète', 'Pas de réponse'])
    } else {
      query.not('status', 'in', '("Non complète","Pas de réponse")')
    }
    
    const { data } = await query.order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [viewMode])

  async function updateStatus(orderId: string, newStatus: string) {
    setUpdating(orderId)
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    setUpdating(null)
  }

  async function deleteOrder(orderId: string) {
    if (!confirm('Supprimer cette commande ?')) return
    
    // order_items se supprime automatiquement via CASCADE
    const { error } = await supabase.from('orders').delete().eq('id', orderId)
    
    if (error) {
      alert('Erreur: ' + error.message)
      return
    }
    
    setOrders(prev => prev.filter(o => o.id !== orderId))
  }

  function openEditOrder(order: any) {
    setEditingOrder(order)
    setEditForm({
      name: order.name || '',
      phone: order.phone || '',
      wilaya: order.wilaya || '',
      address: order.address || '',
      livraison: order.livraison || '',
      total: order.total || 0,
      items: (order.order_items || []).map((it: any) => ({
        id: it.id,
        title: it.title,
        qty: it.qty || 1,
        price: it.price || 0, // prix total de la ligne (qty inclus)
      })),
    })
  }

  function updateEditItem(itemId: number, field: 'qty' | 'price', value: number) {
    setEditForm((p: any) => ({
      ...p,
      items: p.items.map((it: any) => it.id === itemId ? { ...it, [field]: value } : it),
    }))
  }

  async function saveEditOrder() {
    if (!editingOrder || !editForm) return
    setSavingEdit(true)
    try {
      // 1. Mettre à jour les infos de la commande
      const { error: orderError } = await supabase.from('orders').update({
        name: editForm.name,
        phone: editForm.phone,
        wilaya: editForm.wilaya,
        address: editForm.address,
        livraison: editForm.livraison,
        total: editForm.total,
      }).eq('id', editingOrder.id)

      if (orderError) throw orderError

      // 2. Mettre à jour chaque article (prix / quantité)
      for (const item of editForm.items) {
        await supabase.from('order_items')
          .update({ qty: item.qty, price: item.price })
          .eq('id', item.id)
      }

      // 3. Rafraîchir la liste locale
      setOrders(prev => prev.map(o => o.id === editingOrder.id
        ? { ...o, ...editForm, order_items: editForm.items }
        : o
      ))

      setEditingOrder(null)
      setEditForm(null)
    } catch (e: any) {
      alert('Erreur: ' + e.message)
    }
    setSavingEdit(false)
  }

  const filtered = orders
    .filter(o => filter === 'all' || o.status === filter)
    .filter(o => !search || o.name?.toLowerCase().includes(search.toLowerCase()) || o.phone?.includes(search) || o.order_number?.includes(search))

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
        <button onClick={() => setViewMode('orders')}
          style={{ padding:'8px 16px', borderRadius:'10px', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:700, background: viewMode === 'orders' ? '#2563EB' : 'rgba(255,255,255,0.06)', color: viewMode === 'orders' ? '#fff' : 'rgba(255,255,255,0.5)' }}>
          📦 Commandes
        </button>
        <button onClick={() => setViewMode('abandoned')}
          style={{ padding:'8px 16px', borderRadius:'10px', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:700, background: viewMode === 'abandoned' ? '#94a3b8' : 'rgba(255,255,255,0.06)', color: viewMode === 'abandoned' ? '#fff' : 'rgba(255,255,255,0.5)' }}>
          🔴 Non complètes
        </button>
      </div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, margin: 0 }}>📦 Commandes</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '4px 0 0' }}>
          Gérer, suivre et mettre à jour toutes les commandes
        </p>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher nom, téléphone..."
            style={{
              width: '100%', padding: '9px 12px 9px 34px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', fontSize: '16px', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Filter */}
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px', color: '#fff', padding: '9px 12px', fontSize: '16px', cursor: 'pointer', outline: 'none'
        }}>
          <option value="all" style={{ background: '#0F2038' }}>Tous ({orders.length})</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s} style={{ background: '#0F2038' }}>{s} ({orders.filter(o => o.status === s).length})</option>
          ))}
        </select>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['all', ...STATUS_OPTIONS].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '5px 12px', borderRadius: '20px', border: '1px solid',
            borderColor: filter === s ? (statusColors[s] || '#6c63ff') : 'rgba(255,255,255,0.1)',
            background: filter === s ? `${statusColors[s] || '#6c63ff'}20` : 'transparent',
            color: filter === s ? (statusColors[s] || '#6c63ff') : 'rgba(255,255,255,0.4)',
            cursor: 'pointer', fontSize: '12px', fontWeight: filter === s ? 600 : 400
          }}>
            {s === 'all' ? `Tous (${orders.length})` : `${s} (${orders.filter(o => o.status === s).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '60px' }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '60px' }}>Aucune commande.</div>
      ) : (
        <>
          {/* ══ Vue mobile : cartes ══ */}
          <div className="mobile-cards">
            {filtered.map(order => (
              <div key={order.id} style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: '14px',
                borderLeft: `4px solid ${statusColors[order.status] || '#6c63ff'}`,
                padding: '14px', marginBottom: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600 }}>Nom :</div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{order.name}</div>
                  </div>
                  <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: '15px' }}>{order.total?.toLocaleString()} DA</span>
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600 }}>Téléphone :</div>
                  <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>{order.phone}</div>
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600 }}>Wilaya :</div>
                  <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>
                    {order.wilaya || '—'} · {order.livraison === 'bureau' ? '🏢 DHD' : '🏠 المنزل'}
                  </div>
                </div>

                {order.address && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600 }}>Adresse :</div>
                    <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>{order.address}</div>
                  </div>
                )}

                <div style={{ marginBottom: '10px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>Livres :</div>
                  {order.order_items && order.order_items.length > 0
                    ? order.order_items.map((item: any) => {
                        const qty = item.qty && item.qty > 0 ? item.qty : 1
                        const unitPrice = (item.price ?? 0) / qty
                        return (
                          <div key={item.id} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span>📖 {item.title} {item.qty > 1 && `×${item.qty}`}</span>
                            <span style={{ color: '#8FC1FF', fontWeight: 600 }}>{unitPrice.toLocaleString()} DA</span>
                          </div>
                        )
                      })
                    : order.books && (
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', display: 'flex', justifyContent: 'space-between' }}>
                          <span>📖 {order.books.title} {order.bundle_qty > 1 && `×${order.bundle_qty}`}</span>
                          <span style={{ color: '#8FC1FF', fontWeight: 600 }}>
                            {(((order.total ?? 0) - (order.delivery_price ?? 0)) / (order.bundle_qty && order.bundle_qty > 0 ? order.bundle_qty : 1)).toLocaleString()} DA
                          </span>
                        </div>
                      )}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={STATUS_OPTIONS.includes(order.status) ? order.status : 'Attente'}
                    disabled={updating === order.id}
                    onChange={e => updateStatus(order.id, e.target.value)}
                    style={{
                      background: statusColors[order.status] || '#888',
                      border: 'none', borderRadius: '8px', color: '#000',
                      padding: '8px 10px', fontSize: '13px', fontWeight: 700, flex: 1, minWidth: '110px'
                    }}>
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s} style={{ background: '#0F2038', color: '#fff' }}>{s}</option>
                    ))}
                  </select>
                  <button onClick={() => openEditOrder(order)} style={{
                    background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.4)',
                    borderRadius: '8px', color: '#a78bfa', padding: '8px 12px', fontSize: '13px', cursor: 'pointer'
                  }}>✏️</button>
                  <button onClick={() => deleteOrder(order.id)} style={{
                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '8px', color: '#ef4444', padding: '8px 12px', fontSize: '13px', cursor: 'pointer'
                  }}>🗑</button>
                </div>

                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginTop: '8px' }}>
                  {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div style={{ overflowX: 'auto' }} className="desktop-table">
            <table
              style={{
                width: '100%',
                minWidth: '1200px',
                borderCollapse: 'collapse',
                fontSize: '13px'
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.98)' }}>
                  {['الإسم', 'الهاتف', 'الكتب','الخيرات', 'العروض', 'الولاية', 'العنوان', 'التوصيل','المجموع','ثمن الكتاب', 'التاريخ', 'الحالة', 'حذف'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.9)', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr
                    key={order.id}
                    style={{
                      borderBottom: '1px solid rgb(0, 0, 0)',
                      borderRight: `5px solid ${statusColors[order.status] || '#6c63ff'}`,
                      transition: 'background 0.3s',
                      background: `${statusColors[order.status] || 'transparent'}38`,
                    }}
                    onMouseEnter={e =>
                      (e.currentTarget as HTMLElement).style.background =
                        `${statusColors[order.status] || '#ffffff'}55`
                    }
                    onMouseLeave={e =>
                      (e.currentTarget as HTMLElement).style.background =
                        `${statusColors[order.status] || 'transparent'}38`
                    }
                  >
                    <td style={{ padding: '12px' }}>
                      <div style={{ color: '#fff', fontWeight: 600 }}>{order.name}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div
                        style={{
                          color: 'rgba(255,255,255,0.75)',
                          fontSize: '13px'
                        }}
                      >
                        {order.phone}
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: 'rgba(255,255,255,0.7)', maxWidth: '160px' }}>
                      {order.order_items && order.order_items.length > 0
                        ? order.order_items.map((item: any) => (
                            <div key={item.id} style={{ fontSize: '12px', display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px' }}>
                              <span>📖 {item.title}</span>
                              {item.qty > 1
                                ? <span style={{ background:'#8FC1FF', color:'#0F2038', fontSize:'12px', fontWeight:900, padding:'2px 8px', borderRadius:'8px' }}>×{item.qty}</span>
                                : <span style={{ color:'rgba(255,255,255,0.3)', fontSize:'11px' }}>×1</span>
                              }
                            </div>
                          ))
                        : order.books
                          ? <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
                              <span>📖 {order.books.title}</span>
                              {order.bundle_qty > 1
                                ? <span style={{ background:'#8FC1FF', color:'#0F2038', fontSize:'12px', fontWeight:900, padding:'2px 8px', borderRadius:'8px' }}>×{order.bundle_qty}</span>
                                : <span style={{ color:'rgba(255,255,255,0.3)', fontSize:'11px' }}>×1</span>
                              }
                              <span style={{ color:'#94a3b8', fontSize:'11px' }}>⚠ غير مؤكد</span>
                            </div>
                          : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '12px', maxWidth: '180px' }}>
                      {(() => {
                        // Priorité aux options de order_items (commandes confirmées), sinon celles de order (abandonnées)
                        const rawOptions = order.order_items?.[0]?.selected_options || order.selected_options
                        if (!rawOptions || Object.keys(rawOptions).length === 0) {
                          return <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>—</span>
                        }
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {Object.entries(rawOptions).map(([label, val]: [string, any]) => {
                              // val peut être soit un objet {name, price} soit une string déjà formatée "nom (+prix دج)"
                              let display = typeof val === 'string' ? val : val?.name || String(val)
                              // On retire la partie prix entre parenthèses, ex: " (+2000 دج)" ou " (+0 دج)"
                              display = display.replace(/\s*\(\+?[^)]*دج\)\s*$/, '').trim()
                              return (
                                <span key={label} style={{ background: 'rgba(0, 35, 232, 0.12)', border: '1px solid rgba(0, 93, 232, 0.3)', color: '#0097e8', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                                  {label}: {display}
                                </span>
                              )
                            })} 
                          </div>
                        )
                      })()}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {order.bundle_label
                        ? <span style={{ background:'rgba(37,99,235,0.15)', border:'1px solid rgba(37,99,235,0.4)', color:'#8FC1FF', fontSize:'11px', fontWeight:700, padding:'4px 10px', borderRadius:'10px', whiteSpace:'nowrap' }}>📦 {order.bundle_label}</span>
                        : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '12px', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>📍 {order.wilaya || '—'}</td>
                    <td style={{ padding: '12px', maxWidth: '250px' }}>
                      <div
                        style={{
                          color: 'rgba(255,255,255,0.75)',
                          fontSize: '12px',
                          whiteSpace: 'normal'
                        }}
                      >
                        {order.address || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '12px',
                        background: order.livraison === 'bureau' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                        color: order.livraison === 'bureau' ? '#f59e0b' : '#10b981'
                      }}>
                        {order.livraison === 'bureau' ? '🏢 DHD' : '🏠 المنزل'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#a78bfa', fontWeight: 700 }}>{order.total?.toLocaleString()} DA</td>
                    
                    <td style={{ padding: '12px', color: 'rgba(255,255,255,0.7)' }}>
                      {order.order_items && order.order_items.length > 0
                        ? order.order_items.map((item: any) => {
                            const qty = item.qty && item.qty > 0 ? item.qty : 1
                            const unitPrice = (item.price ?? 0) / qty
                            return (
                              <div key={item.id} style={{ fontSize: '12px', marginBottom: '2px' }}>
                                {unitPrice.toLocaleString()} DA
                              </div>
                            )
                          })
                        : order.books
                          ? <div style={{ fontSize: '12px' }}>
                              {(((order.total ?? 0) - (order.delivery_price ?? 0)) / (order.bundle_qty && order.bundle_qty > 0 ? order.bundle_qty : 1)).toLocaleString()} DA
                            </div>
                          : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '12px', color: 'rgba(255,255,255,0.3)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <select
                        value={STATUS_OPTIONS.includes(order.status) ? order.status : 'Attente'}
                        disabled={updating === order.id}
                        onChange={e => updateStatus(order.id, e.target.value)}
                        style={{
                          background: statusColors[order.status] || '#888',
                          border: `2px solid ${statusColors[order.status] || '#888'}`,
                          borderRadius: '8px', color: '#000',
                          padding: '6px 10px', fontSize: '16px', cursor: 'pointer', outline: 'none', fontWeight: 800
                        }}>
                        {(order.status === STATUS_OPTIONS[0]
                          ? STATUS_OPTIONS
                          : STATUS_OPTIONS.filter(s => s !== STATUS_OPTIONS[0])
                        ).map(s => (
                          <option key={s} value={s} style={{ background: '#0F2038', color: '#fff' }}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '12px', display: 'flex', gap: '6px' }}>
                      <button onClick={() => openEditOrder(order)} style={{
                        background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.4)',
                        borderRadius: '8px', color: '#8FC1FF', padding: '5px 10px',
                        cursor: 'pointer', fontSize: '12px'
                      }}>✏️</button>
                      <button onClick={() => deleteOrder(order.id)} style={{
                        background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '8px', color: '#ef4444', padding: '5px 10px',
                        cursor: 'pointer', fontSize: '12px'
                      }}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editingOrder && editForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px' }}>
          <div style={{ background: '#0F2038', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 800, margin: 0 }}>✏️ Modifier la commande</h2>
              <button onClick={() => { setEditingOrder(null); setEditForm(null) }} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: '16px' }}>✕</button>
            </div>

            {[
              { key: 'name', label: 'Nom' },
              { key: 'phone', label: 'Téléphone' },
              { key: 'wilaya', label: 'Wilaya' },
              { key: 'address', label: 'Adresse' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: '12px' }}>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 600 }}>{f.label}</label>
                <input
                  value={editForm[f.key]}
                  onChange={e => setEditForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}

            {/* Mode de livraison */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 600 }}>Livraison</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setEditForm((p: any) => ({ ...p, livraison: 'domicile' }))}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1.5px solid ${editForm.livraison !== 'bureau' ? '#10b981' : 'rgba(255,255,255,0.1)'}`, background: editForm.livraison !== 'bureau' ? 'rgba(16,185,129,0.15)' : 'transparent', color: editForm.livraison !== 'bureau' ? '#10b981' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: 600 }}>
                  🏠 Domicile
                </button>
                <button type="button" onClick={() => setEditForm((p: any) => ({ ...p, livraison: 'bureau' }))}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1.5px solid ${editForm.livraison === 'bureau' ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`, background: editForm.livraison === 'bureau' ? 'rgba(245,158,11,0.15)' : 'transparent', color: editForm.livraison === 'bureau' ? '#f59e0b' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: 600 }}>
                  🏢 Bureau (DHD)
                </button>
              </div>
            </div>

            {/* Articles */}
            {editForm.items.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', display: 'block', marginBottom: '8px', fontWeight: 600 }}>Articles</label>
                {editForm.items.map((item: any) => (
                  <div key={item.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', background: 'rgba(255,255,255,0.04)', padding: '8px', borderRadius: '10px' }}>
                    <span style={{ flex: 1, color: '#fff', fontSize: '13px' }}>📖 {item.title}</span>
                    <input type="number" value={item.qty} onWheel={e => e.currentTarget.blur()}
                      onChange={e => updateEditItem(item.id, 'qty', Number(e.target.value))}
                      style={{ width: '55px', padding: '6px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '16px', textAlign: 'center' }}
                    />
                    <input type="number" value={item.price} onWheel={e => e.currentTarget.blur()}
                      onChange={e => updateEditItem(item.id, 'price', Number(e.target.value))}
                      placeholder="Prix total"
                      style={{ width: '90px', padding: '6px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '16px', textAlign: 'center' }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 600 }}>Total (DA)</label>
                  <input type="number" value={editForm.total} onWheel={e => e.currentTarget.blur()}
                    onChange={e => setEditForm((p: any) => ({ ...p, total: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#a78bfa', fontWeight: 700, fontSize: '16px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <button onClick={saveEditOrder} disabled={savingEdit} style={{
                  width: '100%', padding: '14px', background: savingEdit ? 'rgba(37,99,235,0.4)' : '#2563EB',
                  border: 'none', borderRadius: '12px', color: '#fff', fontSize: '15px', fontWeight: 700,
                  cursor: savingEdit ? 'not-allowed' : 'pointer'
                }}>
                  {savingEdit ? '⏳ Enregistrement...' : '✅ Enregistrer les modifications'}
                </button>
              </div>
            </div>
          )}

      <style>{`
        .mobile-cards { display: block; }
        .desktop-table { display: none; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .desktop-table table { min-width: 1200px; }

        @media (min-width: 900px) {
          .mobile-cards { display: none; }
          .desktop-table { display: block; }
        }
      `}</style>
    </div>
  )
}
