interface CartItem {
  id: number;
  title: string;
  author: string;
  price: number;
  image_url: string;
  qty: number;
}

interface CartDrawerProps {
  items: CartItem[];
  darkMode: boolean;
  onClose: () => void;
  onUpdateQty: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
  onCheckout: () => void;
}

export default function CartDrawer({ items, darkMode, onClose, onUpdateQty, onRemove, onCheckout }: CartDrawerProps) {
  const light = { bg: '#F3F6FB', bgCard: '#FFFFFF', text: '#0F1F3D', primary: '#14356B', gold: '#2563EB', goldLight: '#5B9BFF', goldDark: '#173F91', muted: '#5B6B82', border: 'rgba(37,99,235,0.22)' };
  const dark  = { bg: '#0A1526', bgCard: '#0F2038', text: '#E7F0FF', primary: '#8FC1FF', gold: '#2563EB', goldLight: '#8FC1FF', goldDark: '#2563EB', muted: '#9FB3CE', border: 'rgba(37,99,235,0.28)' };
  const c = darkMode ? dark : light;

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const totalQty = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:900, background:'rgba(20,10,5,0.55)', backdropFilter:'blur(4px)' }}/>

      {/* Drawer */}
      <div style={{
        position:'fixed', top:0, left:0, bottom:0, zIndex:901,
        width: 'min(400px, 100vw)',
        background: c.bgCard,
        borderRight: `2px solid ${c.gold}`,
        display:'flex', flexDirection:'column',
        boxShadow: '8px 0 40px rgba(0,0,0,0.35)',
        animation: 'slideInLeft 0.3s cubic-bezier(0.34,1.1,0.64,1)',
      }}>

        {/* ── Header ── */}
        <div style={{ padding:'20px 20px 16px', borderBottom:`1px solid ${c.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'38px', height:'38px', borderRadius:'12px', background:`linear-gradient(135deg,${darkMode?'#2C1810':c.primary},${c.goldDark})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>🛒</div>
            <div>
              <div style={{ fontWeight:'800', fontSize:'1.05rem', color:c.primary }}>سلة التسوق</div>
              <div style={{ fontSize:'0.72rem', color:c.muted }}>{totalQty} {totalQty===1?'كتاب':'كتب'}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(74,55,40,0.1)', border:`1px solid ${c.border}`, color:c.primary, width:'34px', height:'34px', borderRadius:'50%', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold' }}>✕</button>
        </div>

        {/* ── Items ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
          {items.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 20px', color:c.muted }}>
              <div style={{ fontSize:'3rem', marginBottom:'12px' }}>🛒</div>
              <p style={{ fontSize:'1rem', marginBottom:'6px', color:c.primary, fontWeight:'600' }}>السلة فارغة</p>
              <p style={{ fontSize:'0.82rem' }}>أضف بعض الكتب للبدء</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {items.map(item => (
                <div key={item.id} style={{ background:darkMode?'rgba(255,255,255,0.04)':'rgba(201,168,76,0.05)', borderRadius:'16px', border:`1px solid ${c.border}`, padding:'12px', display:'flex', gap:'12px', alignItems:'center' }}>
                  {/* Cover */}
                  <div style={{ width:'60px', height:'80px', borderRadius:'10px', overflow:'hidden', flexShrink:0, border:`1px solid ${c.border}` }}>
                    <img src={item.image_url} alt={item.title} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  </div>
                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:'0.85rem', fontWeight:'700', color:c.primary, margin:'0 0 2px', lineHeight:1.3 }}>{item.title}</p>
                    <p style={{ fontSize:'0.72rem', color:c.muted, margin:'0 0 8px' }}>{item.author}</p>
                    {/* Qty controls */}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', background:darkMode?'rgba(255,255,255,0.06)':'rgba(74,55,40,0.06)', borderRadius:'20px', padding:'3px 8px', border:`1px solid ${c.border}` }}>
                        <button onClick={()=>item.qty<=1?onRemove(item.id):onUpdateQty(item.id,item.qty-1)}
                          style={{ width:'24px', height:'24px', borderRadius:'50%', border:'none', background:c.goldDark, color:'white', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1, fontWeight:'bold' }}>−</button>
                        <span style={{ fontSize:'0.88rem', fontWeight:'700', color:c.primary, minWidth:'20px', textAlign:'center' }}>{item.qty}</span>
                        <button onClick={()=>onUpdateQty(item.id,item.qty+1)}
                          style={{ width:'24px', height:'24px', borderRadius:'50%', border:'none', background:c.goldDark, color:'white', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1, fontWeight:'bold' }}>+</button>
                      </div>
                      <div>
                        <span style={{ fontSize:'1rem', fontWeight:'800', color:c.goldDark }}>{(item.price*item.qty).toLocaleString()}</span>
                        <span style={{ fontSize:'0.68rem', color:c.muted, marginRight:'3px' }}> د.ج</span>
                      </div>
                    </div>
                  </div>
                  {/* Delete */}
                  <button onClick={()=>onRemove(item.id)}
                    style={{ flexShrink:0, background:'rgba(180,50,50,0.1)', border:'1px solid rgba(180,50,50,0.2)', color:'#c0392b', width:'28px', height:'28px', borderRadius:'50%', cursor:'pointer', fontSize:'0.75rem', display:'flex', alignItems:'center', justifyContent:'center' }}>🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {items.length > 0 && (
          <div style={{ padding:'16px 20px', borderTop:`1px solid ${c.border}`, flexShrink:0, background:darkMode?'rgba(0,0,0,0.2)':'rgba(201,168,76,0.04)' }}>
            {/* Subtotal */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
              <span style={{ color:c.muted, fontSize:'0.82rem' }}>المجموع الجزئي</span>
              <span style={{ color:c.primary, fontSize:'0.88rem', fontWeight:'600' }}>{total.toLocaleString()} د.ج</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
              <span style={{ color:c.muted, fontSize:'0.82rem' }}>التوصيل</span>
              <span style={{ color:c.muted, fontSize:'0.82rem', fontWeight:'600' }}>يُحسب عند الطلب</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:'12px', borderTop:`1px solid ${c.border}`, marginBottom:'16px' }}>
              <span style={{ color:c.primary, fontSize:'1rem', fontWeight:'800' }}>الإجمالي</span>
              <div>
                <span style={{ color:c.goldDark, fontSize:'1.4rem', fontWeight:'800' }}>{total.toLocaleString()}</span>
                <span style={{ color:c.muted, fontSize:'0.8rem', marginRight:'4px' }}> د.ج</span>
              </div>
            </div>
            <button onClick={onCheckout}
              style={{ width:'100%', background:`linear-gradient(135deg,${darkMode?'#2C1810':c.primary},${c.goldDark})`, color:'#FFF8E7', border:'none', padding:'14px', borderRadius:'20px', cursor:'pointer', fontWeight:'800', fontSize:'1rem', fontFamily:'inherit', boxShadow:`0 6px 20px rgba(74,55,40,0.35)`, display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', transition:'opacity 0.2s' }}
              onMouseEnter={e=>(e.currentTarget.style.opacity='0.88')}
              onMouseLeave={e=>(e.currentTarget.style.opacity='1')}
            >
              <span>⚡</span><span>تأكيد الطلب</span>
            </button>
            <button onClick={onClose}
              style={{ width:'100%', background:'transparent', color:c.muted, border:`1px solid ${c.border}`, padding:'10px', borderRadius:'16px', cursor:'pointer', fontSize:'0.85rem', fontFamily:'inherit', marginTop:'8px' }}>
              مواصلة التسوق
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
