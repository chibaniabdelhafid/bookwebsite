import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { submitOrder } from '../lib/orderApi' 

interface CartItem {
  id: number; title: string; author: string;
  price: number; image_url: string; qty: number;
  free_delivery?: boolean; // ← ajoute cette ligne
  qiasLabel?: string;
}
interface CheckoutPageProps {
  items: CartItem[];
  darkMode: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

const wilayas = ['أدرار','الشلف','الأغواط','أم البواقي','باتنة','بجاية','بسكرة','بشار','البليدة','البويرة','تمنراست','تبسة','تلمسان','تيارت','تيزي وزو','الجزائر','الجلفة','جيجل','سطيف','سعيدة','سكيكدة','سيدي بلعباس','عنابة','قالمة','قسنطينة','المدية','مستغانم','المسيلة','معسكر','ورقلة','وهران','البيض','إليزي','برج بوعريريج','بومرداس','الطارف','تندوف','تيسمسيلت','الوادي','خنشلة','سوق أهراس','تيبازة','ميلة','عين الدفلى','النعامة','عين تموشنت','غرداية','غليزان','تيميمون','برج باجي مختار','أولاد جلال','بني عباس','عين صالح','عين قزام','توقرت','جانت','المغير','المنيعة']

export default function CheckoutPage({ items, darkMode, onBack, onConfirm }: CheckoutPageProps) {
  const light = { bg:'#F3F6FB', bgCard:'#FFFFFF', text:'#0F1F3D', primary:'#14356B', gold:'#2563EB', goldLight:'#5B9BFF', goldDark:'#173F91', muted:'#5B6B82', border:'rgba(37,99,235,0.22)', inputBg:'rgba(20,53,107,0.04)' }
  const dark  = { bg:'#0A1526', bgCard:'#0F2038', text:'#E7F0FF', primary:'#8FC1FF', gold:'#2563EB', goldLight:'#8FC1FF', goldDark:'#2563EB', muted:'#9FB3CE', border:'rgba(37,99,235,0.28)', inputBg:'rgba(255,255,255,0.05)' }
  const c = darkMode ? dark : light

  // ── États formulaire ──
  const [name,    setName]    = useState('')
  const [phone,   setPhone]   = useState('')
  const [wilaya,  setWilaya]  = useState('')
  const [address, setAddress] = useState('')
  const [livraison, setLivraison] = useState<'domicile' | 'bureau'>('domicile')

  // ── États UI ──
  const [errors,      setErrors]      = useState<Record<string,string>>({})
  const [loading,     setLoading]     = useState(false)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [serverError, setServerError] = useState('')

  // ── Prix livraison par wilaya (même logique que BookDetailPage) ──
  const [wilayaPrices, setWilayaPrices] = useState<Record<string, {home_price:number, dhd_price:number}>>({})
  const currentWilayaPrices = wilayaPrices[wilaya] || { home_price: 0, dhd_price: 0 }
  // Livraison gratuite si TOUS les livres du panier ont free_delivery activé
  const isFreeDelivery = items.length > 0 && items.every(i => i.free_delivery)
  const deliveryPrice = isFreeDelivery
    ? 0
    : (livraison === 'domicile' ? currentWilayaPrices.home_price : currentWilayaPrices.dhd_price)

  // ── Calcul totaux ──
  const total = items.reduce((s, i) => s + i.price * i.qty, 0)
  const totalWithDelivery = total + deliveryPrice

  // ── Refs (identiques à BookDetailPage) ──
  const abandonedIdRef = useRef<number | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const livraisonRef   = useRef(livraison)
  const totalPriceRef  = useRef(0)

  const optimizeImg = (url: string, _width = 400) => url

  // ── Sync refs ──
  useEffect(() => { totalPriceRef.current = totalWithDelivery }, [totalWithDelivery])
  useEffect(() => { livraisonRef.current  = livraison },         [livraison])

  // ── Chargement livraison par wilaya (même source que BookDetailPage) ──
  useEffect(() => {
    const loadDelivery = async () => {
      const { data } = await supabase.from('wilaya_delivery').select('*')
      if (data) {
        const map: Record<string, {home_price:number, dhd_price:number}> = {}
        data.forEach((w: any) => { map[w.wilaya] = { home_price: w.home_price, dhd_price: w.dhd_price } })
        setWilayaPrices(map)
      }
    }
    loadDelivery()
  }, [])

  // ── saveAbandoned (identique à BookDetailPage) ──
  const saveAbandoned = async (formData: { name: string, phone: string, wilaya: string, address: string }) => {
    if (!formData.phone || formData.phone.length < 6) return
    const res = await submitOrder({
      finalize: false,
      items: items.map(i => ({
        book_id: i.id,
        quantity: i.qty,
        ...(i.qiasLabel ? { selected_options: { 'القياس': i.qiasLabel } } : {}),
      })),
      form: formData,
      livraison,
      abandoned_id: abandonedIdRef.current,
    })
    if (res.order_id) abandonedIdRef.current = res.order_id
  }

  // ── Helpers pour les champs (déclenchent saveAbandoned) ──
  const handleName = (v: string) => {
    setName(v)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => saveAbandoned({ name: v, phone, wilaya, address }), 2000)
  }
  const handlePhone = (v: string) => {
    setPhone(v)
  }
  const handlePhoneBlur = (v: string) => {
    saveAbandoned({ name, phone: v, wilaya, address })
  }
  const handleWilaya = (v: string) => {
    setWilaya(v)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => saveAbandoned({ name, phone, wilaya: v, address }), 2000)
  }
  const handleAddress = (v: string) => {
    setAddress(v)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => saveAbandoned({ name, phone, wilaya, address: v }), 2000)
  }

  // ── Validation ──
  const validate = useCallback(() => {
    const e: Record<string,string> = {}
    if (!name.trim())    e.name    = 'الاسم الكامل مطلوب'
    if (!phone.trim())   e.phone   = 'رقم الهاتف مطلوب'
    else if (!/^(05|06|07)\d{8}$/.test(phone)) e.phone = 'رقم هاتف غير صحيح'
    if (!wilaya)         e.wilaya  = 'الولاية مطلوبة'
    if (!address.trim()) e.address = 'العنوان مطلوب'
    setErrors(e)
    return Object.keys(e).length === 0
  }, [name, phone, wilaya, address])

  // ── handleSubmit (identique à BookDetailPage) ──
  const handleSubmit = async () => {
    setServerError('')
    if (!validate()) return
    setLoading(true)
    try {
      const res = await submitOrder({
        finalize: true,
        items: items.map(i => ({
          book_id: i.id,
          quantity: i.qty,
          ...(i.qiasLabel ? { selected_options: { 'القياس': i.qiasLabel } } : {}),
        })),
        form: { name, phone, wilaya, address },
        livraison,
        abandoned_id: abandonedIdRef.current,
      })
      if (res.error) { setServerError(res.error); setLoading(false); return }
      setOrderNumber(res.order_number)
    } catch (err: any) {
      setServerError(err.message || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // ── Style champs ──
  const inpStyle = (field: string): React.CSSProperties => ({
    background:   darkMode ? c.inputBg : 'rgba(74,55,40,0.04)',
    border:       `1.5px solid ${errors[field] ? '#e74c3c' : c.border}`,
    borderRadius: '12px',
    padding:      '10px 14px',
    color:        c.text,
    fontFamily:   "'Cairo',sans-serif",
    fontSize:     '16px',
    outline:      'none',
    width:        '100%',
    direction:    'rtl',
    boxSizing:    'border-box' as const,
    transition:   'border-color 0.2s',
  })

  // ── Écran succès ──
  if (orderNumber) return (
    <div style={{ minHeight:'100vh', backgroundColor:c.bg, color:c.text, direction:'rtl', fontFamily:"'Cairo',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', position:'relative', zIndex:1 }}>
      <div style={{ maxWidth:'480px', width:'100%', textAlign:'center' }}>
        <div style={{ width:'100px', height:'100px', borderRadius:'50%', background:`linear-gradient(135deg,${darkMode?'#2C1810':c.primary},${c.goldDark})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.8rem', margin:'0 auto 28px', boxShadow:`0 12px 40px rgba(201,168,76,0.4)`, animation:'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>✅</div>
        <h1 style={{ fontSize:'2rem', fontWeight:'800', color:c.primary, marginBottom:'10px' }}>تم تأكيد طلبك!</h1>
        <div style={{ background:`rgba(201,168,76,0.1)`, border:`1.5px solid ${c.gold}`, borderRadius:'16px', padding:'14px 20px', marginBottom:'20px', display:'inline-flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize:'1.2rem' }}>🧾</span>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:'0.68rem', color:c.muted }}>رقم الطلب</div>
            <div style={{ fontSize:'1.1rem', fontWeight:'800', color:c.goldDark, letterSpacing:'1px' }}>{orderNumber}</div>
          </div>
        </div>
        <p style={{ color:c.muted, fontSize:'0.95rem', lineHeight:1.8, marginBottom:'28px' }}>
          شكراً <span style={{ color:c.primary, fontWeight:'700' }}>{name}</span>، سيتم التواصل معك على الرقم{' '}
          <span style={{ color:c.goldDark, fontWeight:'700' }}>{phone}</span> لتأكيد التوصيل.
        </p>
        <div style={{ background:c.bgCard, border:`1px solid ${c.border}`, borderRadius:'20px', padding:'20px', marginBottom:'24px', textAlign:'right' }}>
          <div style={{ fontSize:'0.72rem', color:c.muted, fontWeight:'700', marginBottom:'12px', display:'flex', alignItems:'center', gap:'8px' }}>
            <span>ملخص الطلب</span><div style={{ flex:1, height:'1px', background:c.border }}/>
          </div>
          {items.map(i => (
            <div key={i.id} style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px', fontSize:'0.85rem' }}>
              <span style={{ color:c.primary, fontWeight:'600' }}>{i.title} × {i.qty}</span>
              <span style={{ color:c.goldDark, fontWeight:'700' }}>{(i.price*i.qty).toLocaleString()} د.ج</span>
            </div>
          ))}
          <div style={{ borderTop:`1px solid ${c.border}`, paddingTop:'10px', display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontWeight:'800', color:c.primary }}>الإجمالي</span>
            <span style={{ fontWeight:'800', fontSize:'1.1rem', color:c.goldDark }}>{totalWithDelivery.toLocaleString()} د.ج</span>
          </div>
        </div>
        <button onClick={onConfirm} style={{ background:`linear-gradient(135deg,${darkMode?'#2C1810':c.primary},${c.goldDark})`, color:'#FFF8E7', border:'none', padding:'14px 36px', borderRadius:'22px', cursor:'pointer', fontWeight:'800', fontSize:'1rem', fontFamily:'inherit', boxShadow:`0 6px 20px rgba(74,55,40,0.35)` }}>
          العودة للرئيسية
        </button>
      </div>
      <style>{`@keyframes popIn{from{transform:scale(0);}to{transform:scale(1);}}`}</style>
    </div>
  )

  // ── Formulaire principal ──
  return (
    <div style={{ minHeight:'100vh', backgroundColor:c.bg, color:c.text, direction:'rtl', fontFamily:"'Cairo',sans-serif", position:'relative', zIndex:1 }}>

      {/* BG pattern */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
        <div style={{
          position:'absolute',
          top:'-20%', left:'-20%',
          width:'140%', height:'140%',
          display:'flex', flexWrap:'wrap',
          alignContent:'flex-start',
          gap:'40px 60px',
          transform:'rotate(-10deg)',
          transformOrigin:'center',
        }}>
          {(() => {
            const catWords = ['باقات','اللغة والبلاغة','الصحيحين والسنن','التزكية','التاريخ','أصول الفقه','فقه مالكي','فتاوى','علوم القرآن','علوم الحديث','العقيدة','تفسير القرآن']
            return Array.from({ length: 260 }).map((_, i) => (
              <span key={i} style={{
                fontFamily:"'Aref Ruqaa',serif",
                fontWeight:700,
                fontSize:'26px',
                color: darkMode ? '#2563EB' : '#86beff',
                opacity:0.35,
                whiteSpace:'nowrap',
              }}>
                {catWords[i % catWords.length]}
              </span>
            ))
          })()}
        </div>
      </div>

      {/* Header */}
      <div style={{ position:'relative', zIndex:1, padding:'32px 5% 0' }}>
        <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:'8px', background:darkMode?'rgba(34,26,14,0.8)':'rgba(255,253,248,0.8)', backdropFilter:'blur(10px)', border:`1px solid ${c.border}`, color:c.muted, padding:'9px 16px', borderRadius:'20px', cursor:'pointer', fontSize:'0.85rem', fontFamily:'inherit', marginBottom:'28px' }}>
          <span>→</span><span>العودة للسلة</span>
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
          <div style={{ height:'1px', flex:1, background:`linear-gradient(to left,${c.gold},transparent)` }}/><span style={{ color:c.gold }}>✦</span>
          <span style={{ color:c.goldDark, fontSize:'0.68rem', letterSpacing:'1.5px' }}>إتمام الشراء</span>
          <span style={{ color:c.gold }}>✦</span><div style={{ height:'1px', flex:1, background:`linear-gradient(to right,${c.gold},transparent)` }}/>
        </div>
        <h1 style={{ fontSize:'clamp(1.8rem,6vw,2.6rem)', fontWeight:'800', color:c.primary, margin:'0 0 4px' }}>
          تأكيد <span style={{ color:c.goldDark }}>الطلب</span>
        </h1>
        <p style={{ color:c.muted, fontSize:'0.88rem', margin:'0 0 32px' }}>أدخل بياناتك ليصلك طلبك في أقرب وقت</p>
      </div>

      <div style={{ position:'relative', zIndex:1, padding:'0 5% 100px', display:'grid', gridTemplateColumns:'1fr', gap:'24px', maxWidth:'1000px', margin:'0 auto' }} className="co-grid">

        {/* ── Bloc formulaire (gauche) ── */}
        <div style={{ background:c.bgCard, borderRadius:'24px', border:`1px solid ${c.border}`, boxShadow:`0 8px 32px rgba(74,55,40,0.1)`, padding:'28px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute',top:0,right:0,width:'40px',height:'40px',borderTop:`2px solid ${c.gold}`,borderRight:`2px solid ${c.gold}`,borderRadius:'0 24px 0 0',pointerEvents:'none' }}/>
          <div style={{ position:'absolute',top:0,left:0,width:'40px',height:'40px',borderTop:`2px solid ${c.gold}`,borderLeft:`2px solid ${c.gold}`,borderRadius:'24px 0 0 0',pointerEvents:'none' }}/>

          {/* Données personnelles */}
          <div style={{ marginBottom:'24px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'18px' }}>
              <div style={{ width:'32px',height:'32px',borderRadius:'10px',background:`linear-gradient(135deg,${darkMode?'#2C1810':c.primary},${c.goldDark})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.9rem' }}>👤</div>
              <span style={{ fontWeight:'800', fontSize:'1rem', color:c.primary }}>البيانات الشخصية</span>
              <div style={{ flex:1, height:'1px', background:c.border }}/>
            </div>
            <div style={{ display:'grid', gap:'14px', gridTemplateColumns:'1fr 1fr' }} className="co-fields">
              {/* Nom */}
              <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                <label style={{ fontSize:'0.75rem', fontWeight:'700', color:c.muted }}>الاسم الكامل *</label>
                <input value={name}
                  onChange={e => handleName(e.target.value)}
                  placeholder="مثال: أحمد بن علي"
                  style={inpStyle('name')}
                  onFocus={e => e.target.style.borderColor=c.gold}
                  onBlur={e  => e.target.style.borderColor=errors.name?'#e74c3c':c.border}/>
                {errors.name && <span style={{ fontSize:'0.68rem', color:'#e74c3c' }}>⚠ {errors.name}</span>}
              </div>
              {/* Téléphone */}
              <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                <label style={{ fontSize:'0.75rem', fontWeight:'700', color:c.muted }}>رقم الهاتف *</label>
                <input value={phone}
                  onChange={e => handlePhone(e.target.value)}
                  onBlur={e => {
                    e.target.style.borderColor = errors.phone ? '#e74c3c' : c.border
                    handlePhoneBlur(e.target.value)
                  }}
                  placeholder="0xxxxxxxxx" type="tel"
                  style={inpStyle('phone')}
                  onFocus={e => e.target.style.borderColor=c.gold}/>
                {errors.phone && <span style={{ fontSize:'0.68rem', color:'#e74c3c' }}>⚠ {errors.phone}</span>}
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'18px' }}>
              <div style={{ width:'32px',height:'32px',borderRadius:'10px',background:`linear-gradient(135deg,${darkMode?'#2C1810':c.primary},${c.goldDark})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.9rem' }}>📍</div>
              <span style={{ fontWeight:'800', fontSize:'1rem', color:c.primary }}>عنوان التوصيل</span>
              <div style={{ flex:1, height:'1px', background:c.border }}/>
            </div>
            {/* Wilaya + Adresse côte à côte */}
            <div style={{ display:'grid', gap:'14px', gridTemplateColumns:'1fr 1fr' }} className="co-fields">
              {/* Wilaya */}
              <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                <label style={{ fontSize:'0.75rem', fontWeight:'700', color:c.muted }}>الولاية *</label>
                <select value={wilaya}
                  onChange={e => handleWilaya(e.target.value)}
                  style={{ ...inpStyle('wilaya'), cursor:'pointer' }}>
                  <option value="" disabled>اختر الولاية</option>
                  {wilayas.map((w,i) => <option key={i} value={w}>{String(i+1).padStart(2,'0')} - {w}</option>)}
                </select>
                {errors.wilaya && <span style={{ fontSize:'0.68rem', color:'#e74c3c' }}>⚠ {errors.wilaya}</span>}
              </div>
              {/* Adresse */}
              <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                <label style={{ fontSize:'0.75rem', fontWeight:'700', color:c.muted }}>العنوان التفصيلي *</label>
                <input value={address}
                  onChange={e => handleAddress(e.target.value)}
                  placeholder="الشارع، الحي، رقم المبنى..."
                  style={inpStyle('address')}
                  onFocus={e => e.target.style.borderColor=c.gold}
                  onBlur={e  => e.target.style.borderColor=errors.address?'#e74c3c':c.border}/>
                {errors.address && <span style={{ fontSize:'0.68rem', color:'#e74c3c' }}>⚠ {errors.address}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* ── Récapitulatif + bouton (droite) ── */}
        <div style={{ background:c.bgCard, borderRadius:'24px', border:`1px solid ${c.border}`, boxShadow:`0 8px 32px rgba(74,55,40,0.1)`, padding:'28px', position:'relative', overflow:'hidden', height:'fit-content' }}>
          <div style={{ position:'absolute',top:0,right:0,width:'40px',height:'40px',borderTop:`2px solid ${c.gold}`,borderRight:`2px solid ${c.gold}`,borderRadius:'0 24px 0 0',pointerEvents:'none' }}/>
          <div style={{ position:'absolute',bottom:0,left:0,width:'40px',height:'40px',borderBottom:`2px solid ${c.gold}`,borderLeft:`2px solid ${c.gold}`,borderRadius:'0 0 0 24px',pointerEvents:'none' }}/>

          {/* Titre */}
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
            <div style={{ width:'32px',height:'32px',borderRadius:'10px',background:`linear-gradient(135deg,${darkMode?'#2C1810':c.primary},${c.goldDark})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.9rem' }}>📦</div>
            <span style={{ fontWeight:'800', fontSize:'1rem', color:c.primary }}>ملخص الطلب</span>
          </div>

          {/* Liste des livres */}
          <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'16px' }}>
            {items.map(item => (
              <div key={item.id} style={{ display:'flex', gap:'10px', alignItems:'center', padding:'10px', background:darkMode?'rgba(255,255,255,0.03)':'rgba(201,168,76,0.05)', borderRadius:'12px', border:`1px solid ${c.border}` }}>
                <div style={{ width:'44px', height:'58px', borderRadius:'8px', overflow:'hidden', flexShrink:0 }}>
                  <img src={optimizeImg(item.image_url, 100)} alt={item.title} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:'0.8rem', fontWeight:'700', color:c.primary, margin:0, lineHeight:1.3 }}>{item.title}</p>
                  <p style={{ fontSize:'0.68rem', color:c.muted, margin:'2px 0 0' }}>
                    {item.qty > 1
                      ? <span style={{ background:'rgba(201,168,76,0.15)', color:c.goldDark, fontSize:'0.65rem', padding:'1px 6px', borderRadius:'6px' }}>×{item.qty}</span>
                      : 'الكمية: 1'
                    }
                  </p>
                </div>
                <span style={{ fontSize:'0.88rem', fontWeight:'700', color:c.goldDark, flexShrink:0 }}>{(item.price*item.qty).toLocaleString()} <span style={{ fontSize:'0.65rem', color:c.muted }}>د.ج</span></span>
              </div>
            ))}
          </div>

          {/* نوع التوصيل — prix selon wilaya (même logique que BookDetailPage) */}
          <div style={{ marginBottom:'16px' }}>
            <label style={{ fontSize:'0.78rem', fontWeight:'700', color:c.muted, display:'block', marginBottom:'8px' }}>نوع التوصيل *</label>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {[
                  { value:'domicile', icon:'🏠', price: isFreeDelivery ? 0 : currentWilayaPrices.home_price, sub:'يصلك مباشرة عند باب منزلك' },
                  { value:'bureau',   icon:'🏢', price: isFreeDelivery ? 0 : currentWilayaPrices.dhd_price,  sub:'تستلم طلبك من أقرب مكتب DHD في ولايتك' },
                ].map(opt => (
                <div key={opt.value} onClick={() => setLivraison(opt.value as any)}
                  style={{ padding:'14px 16px', borderRadius:'14px', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', border:`2px solid ${livraison === opt.value ? c.gold : c.border}`, background: livraison === opt.value ? 'rgba(201,168,76,0.1)' : 'transparent', transition:'all 0.2s' }}>
                  <span style={{ fontSize:'1.6rem' }}>{opt.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'0.88rem', fontWeight:'800', color: livraison === opt.value ? c.goldDark : c.text }}>
                      {opt.value === 'domicile' ? 'توصيل للمنزل' : 'مكتب DHD'}
                    </div>
                    <div style={{ fontSize:'0.72rem', color:c.muted, marginTop:'2px' }}>{opt.sub}</div>
                  </div>
                  <div style={{ fontWeight:'800', fontSize:'0.9rem', color: opt.price === 0 ? '#27ae60' : '#e74c3c', whiteSpace:'nowrap' }}>
                    {!wilaya ? '—' : opt.price === 0 ? 'مجاني' : `${opt.price.toLocaleString()} دج`}
                  </div>
                  <div style={{ width:'20px', height:'20px', borderRadius:'50%', flexShrink:0, border:`2px solid ${livraison === opt.value ? c.gold : c.border}`, background: livraison === opt.value ? c.gold : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', color:'#fff', fontWeight:'800' }}>
                    {livraison === opt.value ? '✓' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Résumé prix */}
          <div style={{ borderTop:`1px solid ${c.border}`, paddingTop:'14px', display:'flex', flexDirection:'column', gap:'8px', marginBottom:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.82rem' }}>
              <span style={{ color:c.muted }}>المجموع</span>
              <span style={{ color:c.primary, fontWeight:'600' }}>{total.toLocaleString()} د.ج</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.82rem' }}>
              <span style={{ color:c.muted }}>التوصيل</span>
              <span style={{ fontWeight:'600', color: deliveryPrice === 0 ? '#27ae60' : c.text }}>
                {!wilaya ? '—' : deliveryPrice === 0 ? 'مجاني ✓' : `${deliveryPrice.toLocaleString()} دج`}
              </span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:'10px', borderTop:`1px solid ${c.border}`, marginTop:'4px' }}>
              <span style={{ fontWeight:'800', fontSize:'1rem', color:c.primary }}>الإجمالي</span>
              <div>
                <span style={{ fontWeight:'800', fontSize:'1.4rem', color:c.goldDark }}>{totalWithDelivery.toLocaleString()}</span>
                <span style={{ fontSize:'0.78rem', color:c.muted, marginRight:'4px' }}> د.ج</span>
              </div>
            </div>
          </div>

          {/* Paiement à la livraison */}
          <div style={{ marginBottom:'12px', background:darkMode?'rgba(201,168,76,0.1)':'rgba(201,168,76,0.08)', border:`1px solid ${c.border}`, borderRadius:'14px', padding:'12px 14px', display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ fontSize:'1.3rem' }}>💵</span>
            <div>
              <p style={{ fontSize:'0.78rem', fontWeight:'700', color:c.primary, margin:0 }}>الدفع عند الاستلام</p>
              <p style={{ fontSize:'0.68rem', color:c.muted, margin:0 }}>ادفع نقداً عند تسلّم طلبك</p>
            </div>
          </div>

          {serverError && (
            <div style={{ marginBottom:'12px', background:'rgba(231,76,60,0.1)', border:'1px solid #e74c3c', borderRadius:'12px', padding:'10px 14px', fontSize:'0.82rem', color:'#e74c3c' }}>
              ⚠ {serverError}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            style={{ width:'100%', background:loading?c.muted:`linear-gradient(135deg,#1a9e4a,#27ae60)`, color:'#fff', border:'none', padding:'15px', borderRadius:'20px', cursor:loading?'not-allowed':'pointer', fontWeight:'800', fontSize:'1rem', fontFamily:'inherit', boxShadow:`0 6px 20px rgba(39,174,96,0.35)`, display:'flex', alignItems:'center', justifyContent:'center', gap:'10px' }}>
            {loading
              ? <><span style={{ display:'inline-block',width:'18px',height:'18px',border:'2.5px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.7s linear infinite' }}/><span>جاري الحفظ...</span></>
              : <><span>✅</span><span>تأكيد الطلب الآن</span></>
            }
          </button>
        </div>

      </div>

      <style>{`
        input, textarea, select { direction: rtl; box-sizing: border-box; font-family: 'Cairo', sans-serif; }
        input::placeholder, textarea::placeholder { color: #8C7B6B; }
        select option { background: ${c.bgCard}; color: ${c.text}; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes popIn { from { transform: scale(0); } to { transform: scale(1); } }
        @media(min-width: 760px) { .co-grid { grid-template-columns: 1fr 400px !important; } }
        @media(max-width: 520px)  { .co-fields { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}