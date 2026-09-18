import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fbTrack } from '../lib/pixel'
import { submitOrder } from '../lib/orderApi'

interface Book {
  id: number; title: string; author: string; price: number;
  image_url: string; categories: string[]; rating: number; pages: string;
  publisher: string; qias: string; description: string; paperType: string; tahqiq: string; promotion?: number;
  free_delivery?: boolean; stock?: number; wholesale_available?: boolean;
}

// adding quantities 

interface CartItem {
  id: number; title: string; author: string;
  price: number; image_url: string; qty: number;
}

interface BookDetailPageProps {
  books: Book[]; darkMode: boolean;
  onAddToCart: (book: Book, opts?: { price?: number; qiasLabel?: string }) => void;
  cart: CartItem[];
  onOrderPlaced?: (bookId: number, qiasLabel?: string) => void;
}

// Fonction utilitaire à ajouter en haut de chaque fichier
const optimizeImg = (url: string, _width = 400) => url

const wilayas = ['أدرار','الشلف','الأغواط','أم البواقي','باتنة','بجاية','بسكرة','بشار','البليدة','البويرة','تمنراست','تبسة','تلمسان','تيارت','تيزي وزو','الجزائر','الجلفة','جيجل','سطيف','سعيدة','سكيكدة','سيدي بلعباس','عنابة','قالمة','قسنطينة','المدية','مستغانم','المسيلة','معسكر','ورقلة','وهران','البيض','إليزي','برج بوعريريج','بومرداس','الطارف','تندوف','تيسمسيلت','الوادي','خنشلة','سوق أهراس','تيبازة','ميلة','عين الدفلى','النعامة','عين تموشنت','غرداية','غليزان','تيميمون','برج باجي مختار','أولاد جلال','بني عباس','عين صالح','عين قزام','توقرت','جانت','المغير','المنيعة']

export default function BookDetailPage({
  books,
  darkMode,
  onAddToCart,
  cart,
  onOrderPlaced
}: BookDetailPageProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const light = { bg:'#F3F6FB', bgCard:'#FFFFFF', text:'#0F1F3D', primary:'#14356B', gold:'#2563EB', goldLight:'#5B9BFF', goldDark:'#173F91', muted:'#5B6B82', border:'rgba(37,99,235,0.22)', inputBg:'rgba(20,53,107,0.04)' }
  const dark  = { bg:'#0A1526', bgCard:'#0F2038', text:'#E7F0FF', primary:'#8FC1FF', gold:'#2563EB', goldLight:'#8FC1FF', goldDark:'#2563EB', muted:'#9FB3CE', border:'rgba(37,99,235,0.28)', inputBg:'rgba(255,255,255,0.05)' }
  const c = darkMode ? dark : light

  const [fetchedBook, setFetchedBook] = useState<Book | null>(null)
  const [bookLoading, setBookLoading] = useState(true)

  const book = fetchedBook || books.find(b => b.id === Number(id))
  const inCart = cart.find(i => i.id === Number(id))

// ── States ──
const [bookImages, setBookImages] = useState<string[]>([])
  const [activeImg, setActiveImg] = useState(0)
  const [imagesLoading, setImagesLoading] = useState(true)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [showSticky, setShowSticky] = useState(true)
  const [form, setForm] = useState({ name:'', phone:'', wilaya:'', address:'' })
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [livraison, setLivraison] = useState<'domicile' | 'bureau'>('domicile')
  const [bundles, setBundles] = useState<any[]>([])
  const [selectedBundle, setSelectedBundle] = useState<any | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [wilayaPrices, setWilayaPrices] = useState<Record<string, {home_price:number, dhd_price:number}>>({})
  const currentWilayaPrices = wilayaPrices[form.wilaya] || { home_price: 0, dhd_price: 0 }
  const [bookOptions, setBookOptions] = useState<{id:number, label:string, choices:{name:string, price:number, auto?:boolean}[], affects_price:boolean}[]>([])
  const [selectedOptions, setSelectedOptions] = useState<Record<string, {name:string, price:number}>>({})
  const [categoryTypes, setCategoryTypes] = useState<Record<string, string>>({})


  const similarBooks = book
  ? (() => {
      const bookRealCategories = (book.categories || []).filter(cat => categoryTypes[cat] === 'category')
      if (bookRealCategories.length === 0) return []
      return books.filter(b =>
        b.id !== book.id &&
        b.categories?.some(cat => categoryTypes[cat] === 'category' && bookRealCategories.includes(cat))
      ).slice(0, 6)
    })()
  : []

  // ── Refs ──
  const formRef = useRef<HTMLDivElement>(null)
  const abandonedIdRef = useRef<number | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const livraisonRef = useRef(livraison)
  const totalPriceRef = useRef(0)
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)
const lbImgRef = useRef<HTMLImageElement>(null)
const zoomRef = useRef({ scale: 1, x: 0, y: 0 })
const pinchStartRef = useRef({ dist: 0, scale: 1 })
const panStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0, active: false })
const isPinchingRef = useRef(false)
const lastTapRef = useRef(0)

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

const applyZoomTransform = () => {
  if (lbImgRef.current) {
    lbImgRef.current.style.transform = `translate(${zoomRef.current.x}px, ${zoomRef.current.y}px) scale(${zoomRef.current.scale})`
  }
}
const resetZoom = () => {
  zoomRef.current = { scale: 1, x: 0, y: 0 }
  applyZoomTransform()
}
const toggleZoom = () => {
  if (zoomRef.current.scale > 1) resetZoom()
  else { zoomRef.current = { scale: 2.5, x: 0, y: 0 }; applyZoomTransform() }
}
const getTouchDist = (touches: React.TouchList) =>
  Math.hypot(touches[1].clientX - touches[0].clientX, touches[1].clientY - touches[0].clientY)

  const qiasOpt = bookOptions.find(o => o.label === 'القياس')
  const originalQiasChoice = qiasOpt?.choices.find((ch: any) => ch.auto)
    || qiasOpt?.choices.find((ch: any) => ch.name === book?.qias)
    || qiasOpt?.choices[0]
  const isOriginalQiasSelected = !qiasOpt || !selectedOptions['القياس'] || selectedOptions['القياس'].name === originalQiasChoice?.name
  const showPromo = isOriginalQiasSelected && !!book?.promotion && book.promotion < book.price

  // ── Calculs ──
  const isFreeDelivery = selectedBundle
    ? selectedBundle.free_delivery
    : (book?.free_delivery ?? false)

  const deliveryPrice = isFreeDelivery
    ? 0
    : (livraison === 'domicile' ? currentWilayaPrices.home_price : currentWilayaPrices.dhd_price)

  // Prix de base = prix du choix qias sélectionné s'il affecte le prix
 // Prix de base = dépend du choix qias sélectionné
  const bookBasePrice = (() => {
    const sel = selectedOptions['القياس']

    if (qiasOpt && sel) {
      // Si c'est le qias original → applique la promo du livre s'il y en a une
      if (originalQiasChoice && sel.name === originalQiasChoice.name) {
        return book?.promotion && book.promotion < book.price ? book.promotion : (book?.price || 0)
      }
      // Sinon (un autre qias choisi) → prix propre à ce choix, pas de promo
      if (sel.price > 0) return sel.price
    }

    // Autres options (non-qias) qui affectent le prix
    for (const opt of bookOptions) {
      if (opt.label !== 'القياس' && opt.affects_price && selectedOptions[opt.label]) {
        const s = selectedOptions[opt.label]
        if (s.price > 0) return s.price
      }
    }

    return book?.promotion && book.promotion < book.price ? book.promotion : book?.price || 0
  })()

  const maxQty = Math.min(10, book?.stock ?? 10)

  // Bundle : prix fixe de l'admin × recalculé sur le prix de base qias
 const bundlePrice = selectedBundle
  ? selectedBundle.price
  : bookBasePrice * quantity

  const totalPrice = bundlePrice + deliveryPrice
  // ── Sync refs ──
  useEffect(() => { totalPriceRef.current = totalPrice }, [totalPrice])
  useEffect(() => { livraisonRef.current = livraison }, [livraison])
  useEffect(() => { resetZoom() }, [activeImg, lightboxOpen])
  useEffect(() => {
    const loadCategoryTypes = async () => {
      const { data } = await supabase.from('categories').select('name, type')
      if (data) {
        const map: Record<string, string> = {}
        data.forEach((c: any) => { map[c.name] = c.type || 'category' })
        setCategoryTypes(map)
      }
    }
    loadCategoryTypes()
  }, [])

  // ── saveAbandoned ──
  const saveAbandoned = async (formData: typeof form) => {
    if (!book || !formData.phone || formData.phone.length < 6) return
    const res = await submitOrder({
      finalize: false,
      items: [{
        book_id: book.id,
        quantity,
        selected_options: Object.fromEntries(Object.entries(selectedOptions).map(([k,v]) => [k, v.name])),
        bundle_id: selectedBundle?.id,
      }],
      form: formData,
      livraison,
      abandoned_id: abandonedIdRef.current,
    })
    if (res.order_id) abandonedIdRef.current = res.order_id
  }

  const saveAbandonedNow = (formData: typeof form) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveAbandoned(formData)
  }

  const setField = (f: string) => (v: string) => {
    const newForm = { ...form, [f]: v }
    setForm(newForm)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => saveAbandoned(newForm), 2000)
  }

  // ── Effects ──
  // useEffect n°1 — charge uniquement CE livre, dès que l'id change
useEffect(() => {
  window.scrollTo({ top: 0, behavior: 'instant' })

  const fetchBook = async () => {
    setBookLoading(true)
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', Number(id))
      .single()
    if (!error && data) {
      setFetchedBook({
        ...data,
        categories: data.categories && data.categories.length ? data.categories : (data.category ? [data.category] : [])
      })
    }
    setBookLoading(false)
  }
  fetchBook()
}, [id])

// useEffect n°2 — charge bundles/images/options/livraison, une fois le livre dispo
  useEffect(() => {
    if (!book) return

    const fetchData = async () => {
      const { data: bundleData } = await supabase
        .from('book_bundles').select('*').eq('book_id', book.id).eq('active', true).order('qty')
      setBundles(bundleData || [])
      setImagesLoading(true)
      const { data, error } = await supabase
        .from('book_images').select('url,position').eq('book_id', book.id).order('position')
      setBookImages(!error && data?.length ? data.map(d => d.url) : [book.image_url])
      setActiveImg(0)
      setImagesLoading(false)
      const { data: optData } = await supabase
        .from('book_options').select('*').eq('book_id', book.id).order('id')

      const adminOptions = optData || []
      const defaultPrice = book.promotion && book.promotion < book.price ? book.promotion : book.price
      const adminQias = adminOptions.find(o => o.label === 'القياس')
      const qiasOption = {
        id: adminQias?.id || -1,
        book_id: book.id,
        label: 'القياس',
        affects_price: true,
        choices: adminQias?.choices?.length
          ? adminQias.choices
          : [{ name: book.qias || '—', price: defaultPrice, auto: true }]
      }
      const finalOptions = [qiasOption, ...adminOptions.filter(o => o.label !== 'القياس')]
      setBookOptions(finalOptions)
      setSelectedOptions({ 'القياس': qiasOption.choices[0] })
    }

    const loadDelivery = async () => {
      const { data } = await supabase.from('wilaya_delivery').select('*')
      if (data) {
        const map: Record<string, {home_price:number, dhd_price:number}> = {}
        data.forEach((w: any) => { map[w.wilaya] = { home_price: w.home_price, dhd_price: w.dhd_price } })
        setWilayaPrices(map)
      }
    }

    fetchData()
    loadDelivery()
  }, [book?.id])

  useEffect(() => {
    if (!book) return
    fbTrack('ViewContent', {
      content_name: book.title,
      content_ids: [book.id],
      content_type: 'product',
      value: book.promotion && book.promotion < book.price ? book.promotion : book.price,
      currency: 'DZD',
    })
  }, [book?.id])

  useEffect(() => {
    let tracked = false
    const obs = new IntersectionObserver(([e]) => {
      setShowSticky(!e.isIntersecting)
      if (e.isIntersecting && !tracked && book) {
        tracked = true
        fbTrack('InitiateCheckout', {
          content_name: book.title,
          content_ids: [book.id],
          content_type: 'product',
          value: totalPrice,
          currency: 'DZD',
        })
      }
    }, { threshold: 0, rootMargin: '-1000px 0px 0px 0px' })
    if (formRef.current) obs.observe(formRef.current)
    return () => obs.disconnect()
  }, [submitted])

  useEffect(() => {
    if (selectedBundle?.qias_choice && qiasOpt) {
      const matched = qiasOpt.choices.find((ch: any) => ch.name === selectedBundle.qias_choice)
      if (matched) setSelectedOptions(p => ({ ...p, 'القياس': matched }))
    }
  }, [selectedBundle])

  // ── Validation ──
  const validate = () => {
    const e: Record<string,string> = {}
    if (!form.name.trim()) e.name = 'الاسم الكامل مطلوب'
    if (!form.phone.trim()) e.phone = 'رقم الهاتف مطلوب'
    else if (!/^(05|06|07)\d{8}$/.test(form.phone)) e.phone = 'رقم هاتف غير صحيح'
    if (!form.wilaya) e.wilaya = 'الولاية مطلوبة'
    if (!form.address.trim()) e.address = 'العنوان مطلوب'
    if (!selectedBundle && quantity > (book?.stock ?? 0)) {
      e.quantity = `الكمية المطلوبة غير متوفرة، الكمية المتاحة: ${book?.stock ?? 0}`
    }
    bookOptions.forEach(opt => {
      if (!selectedOptions[opt.label]) {
        e[`opt_${opt.label}`] = `يرجى اختيار ${opt.label}`
      }
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── handleSubmit ──
  const handleSubmit = async () => {
    if (!book || !validate()) return
    setLoading(true)
    try {
      const res = await submitOrder({
        finalize: true,
        items: [{
          book_id: book.id,
          quantity,
          selected_options: Object.fromEntries(Object.entries(selectedOptions).map(([k,v]) => [k, v.name])),
          bundle_id: selectedBundle?.id,
        }],
        form,
        livraison,
        abandoned_id: abandonedIdRef.current,
      })
      if (res.error) { alert(res.error); setLoading(false); return }
      fbTrack('Purchase', { content_name: book.title, content_ids: [book.id], content_type: 'product', value: res.total, currency: 'DZD', num_items: selectedBundle ? selectedBundle.qty : quantity })
      onOrderPlaced?.(book.id, selectedOptions['القياس']?.name)
      setSubmitted(true)
    } catch(e) {
      alert('Erreur inattendue: ' + e)
    } finally {
      setLoading(false)
    }
  }

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior:'smooth', block:'start' })
  const currentImage = bookImages[activeImg] || book?.image_url || ''

  const inpStyle = (err?: string) => ({
    background: c.inputBg,
    border: `1.5px solid ${err ? '#e74c3c' : c.border}`,
    borderRadius: '14px', padding: '14px 16px',
    color: c.text, fontFamily: 'inherit', fontSize: '1rem',
    outline: 'none', width: '100%', boxSizing: 'border-box' as const,
    direction: 'rtl' as const, transition: 'border-color 0.2s'
  })

  // ── Bloc livres similaires (réutilisé pour mobile et desktop) ──
  const similarBooksBlock = similarBooks.length > 0 ? (
    <div style={{ padding:'24px 16px', background:c.bgCard, marginTop:'12px', borderRadius:'20px' }}>
      <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px' }}>
        <div style={{ flex:1,height:'1px',background:`linear-gradient(to left,${c.gold},transparent)` }}/>
        <h3 style={{ color:c.primary,fontSize:'1.1rem',fontWeight:'800',margin:0,whiteSpace:'nowrap' }}>كتب من نفس التصنيف</h3>
        <div style={{ flex:1,height:'1px',background:`linear-gradient(to right,${c.gold},transparent)` }}/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'12px' }} className="sim-grid">
        {similarBooks.map(sb => (
          <div key={sb.id} onClick={()=>navigate(`/book/${sb.id}`)} style={{ background:darkMode?'rgba(255,255,255,0.03)':'rgba(74,55,40,0.03)', borderRadius:'14px', overflow:'hidden', border:`1px solid ${c.border}`, cursor:'pointer', transition:'transform 0.2s' }} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.transform='translateY(-3px)'} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.transform='translateY(0)'}>
            <div style={{ position:'relative' }}>
              <img src={optimizeImg(sb.image_url, 300)} loading="lazy" alt={sb.title} style={{ width:'100%',height:'160px',objectFit:'cover',display:'block' }}/>
              <div style={{ position:'absolute',inset:0,background:'linear-gradient(to top,rgba(44,24,16,0.6) 0%,transparent 55%)' }}/>
              <div style={{ position:'absolute',bottom:'6px',right:'8px',color:'#EDD98A',fontSize:'0.6rem' }}>{'★'.repeat(sb.rating)}</div>
            </div>
            <div style={{ padding:'10px' }}>
              <h4 style={{ color:c.primary,fontSize:'0.8rem',margin:'0 0 4px',lineHeight:1.3,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any }}>{sb.title}</h4>
              <p style={{ color:c.muted,fontSize:'0.68rem',margin:'0 0 8px' }}>{sb.author}</p>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:`1px solid ${c.border}`,paddingTop:'8px' }}>
                <span style={{ fontSize:'0.88rem',fontWeight:'800',color:c.goldDark }}>{sb.price.toLocaleString()} <span style={{ fontSize:'0.6rem',fontWeight:'400',color:c.muted }}>د.ج</span></span>
                <button onClick={e=>{e.stopPropagation();onAddToCart(sb);}} style={{ background:`linear-gradient(135deg,${darkMode?'#2C1810':c.primary},${c.goldDark})`,color:'#FFF8E7',border:'none',padding:'5px 10px',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'0.68rem',fontFamily:'inherit' }}>أضف +</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : null

  /* ── Succès ── */
  if (submitted) return (
    <div style={{ minHeight:'100vh', backgroundColor:c.bg, color:c.text, direction:'rtl', fontFamily:"'Cairo',sans-serif", display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ maxWidth:'440px', width:'100%', textAlign:'center' }}>
        <div style={{ width:'90px', height:'90px', borderRadius:'50%', background:`linear-gradient(135deg,${c.primary},${c.goldDark})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5rem', margin:'0 auto 24px', boxShadow:`0 12px 40px rgba(232,184,0,0.4)`, animation:'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>✅</div>
        <h1 style={{ fontSize:'1.8rem', fontWeight:'800', color:c.primary, marginBottom:'8px' }}>تم تأكيد طلبك!</h1>
        <p style={{ color:c.muted, fontSize:'0.9rem', lineHeight:1.8, marginBottom:'24px' }}>
          شكراً <strong style={{ color:c.primary }}>{form.name}</strong>، سيتم التواصل معك على <span style={{ color:c.goldDark, fontWeight:'700' }}>{form.phone}</span>
        </p>
        <button onClick={()=>navigate('/')} style={{ background:`linear-gradient(135deg,${c.primary},${c.goldDark})`, color:'#FFF8E7', border:'none', padding:'14px 36px', borderRadius:'22px', cursor:'pointer', fontWeight:'800', fontSize:'1rem', fontFamily:'inherit' }}>
          العودة للرئيسية
        </button>
      </div>
      <style>{`@keyframes popIn{from{transform:scale(0)}to{transform:scale(1)}}`}</style>
    </div>
  )
  
  if (!book) {
    if (bookLoading) return (
      <div style={{ minHeight:'100vh', backgroundColor:c.bg, display:'flex', alignItems:'center', justifyContent:'center', direction:'rtl', fontFamily:"'Cairo',sans-serif" }}>
        <div style={{ fontSize:'2.5rem', animation:'spin 1.5s linear infinite' }}>📖</div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
    return (
      <div style={{ minHeight:'100vh', backgroundColor:c.bg, display:'flex', alignItems:'center', justifyContent:'center', direction:'rtl', fontFamily:"'Cairo',sans-serif" }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'4rem', marginBottom:'16px' }}>📭</div>
          <button onClick={()=>navigate('/')} style={{ background:`linear-gradient(135deg,${c.primary},${c.goldDark})`, color:'#FFF8E7', border:'none', padding:'12px 28px', borderRadius:'20px', cursor:'pointer', fontFamily:'inherit', fontWeight:'700' }}>العودة</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', backgroundColor:c.bg, color:c.text, direction:'rtl', fontFamily:"'Cairo',sans-serif", transition:'background 0.35s' }}>

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
            return Array.from({ length: 280 }).map((_, i) => (
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

      {/* ══ BOUTON FLOTTANT (mobile uniquement) ══ */}
      <button
        className="bd-floating-cta"
        onClick={book.stock === 0 ? undefined : scrollToForm}
        disabled={book.stock === 0}
        style={{
          position:'fixed', bottom:'20px', left:'16px', zIndex:150,
          transform: showSticky ? 'translateY(0) scale(1)' : 'translateY(120%) scale(0.9)',
          transition: 'transform 0.35s cubic-bezier(0.34,1.1,0.64,1)',
          background: book.stock === 0 ? 'rgba(100,100,100,0.5)' : 'linear-gradient(135deg,#1a9e4a,#27ae60)',
          color:'#fff', border:'none', padding:'14px 22px', borderRadius:'30px',
          cursor: book.stock === 0 ? 'not-allowed' : 'pointer',
          fontWeight:'800', fontSize:'0.92rem', fontFamily:'inherit',
          boxShadow: book.stock === 0 ? 'none' : '0 6px 24px rgba(39,174,96,0.5)',
          display:'flex', alignItems:'center', gap:'8px', whiteSpace:'nowrap',
        }}>
        <span>{book.stock === 0 ? '❌' : '🛒'}</span>
        <span>{book.stock === 0 ? 'نفذت الكمية' : 'أطلب الآن'}</span>
      </button>

      {/* ══ WRAPPER PRINCIPAL ══ */}
      <div style={{ position:'relative', zIndex:1, maxWidth:'1100px', margin:'0 auto', paddingBottom:'120px' }} className="bd-outer">
        <div className="bd-layout">

          {/* ══ COLONNE GAUCHE ══ */}
          <div className="bd-left">

            {/* ── GALERIE IMAGES ── */}
            <div style={{ position:'relative', width:'100%', background: darkMode?'#0D0A04':'#F0EBE0' }} className="bd-gallery">
              <button onClick={()=>navigate(-1)} style={{ position:'absolute', top:'16px', right:'16px', zIndex:10, background: darkMode?'rgba(13,10,4,0.7)':'rgba(255,253,248,0.85)', backdropFilter:'blur(10px)', border:`1px solid ${c.border}`, color:c.primary, width:'40px', height:'40px', borderRadius:'50%', cursor:'pointer', fontSize:'1.1rem', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 12px rgba(0,0,0,0.15)' }}>←</button>
              {imagesLoading ? (
                <div style={{ width:'100%', height:'clamp(220px, 45vh, 360px)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'3rem' }}>📖</div>
              ) : (
                <div className="bd-img-zoom-wrap" onClick={() => setLightboxOpen(true)} style={{ position:'relative', cursor:'zoom-in', overflow:'hidden' }}>
                  <img
                    key={currentImage}
                    src={optimizeImg(currentImage, 300)}
                    loading="lazy"
                    alt={book.title}
                    className="bd-zoom-img"
                    style={{ width:'100%', height:'clamp(160px, 30vh, 300px)', objectFit:'contain', display:'block', background: darkMode?'#0D0A04':'#F5F0E8' }}
                  />
                  <div className="bd-zoom-overlay">
                    <span style={{ fontSize:'1.8rem' }}>🔍</span>
                    <span style={{ color:'#fff', fontWeight:'700', fontSize:'0.9rem' }}>اضغط للتكبير</span>
                  </div>
                </div>
              )}
              {bookImages.length > 1 && (
                <>
                  <button onClick={()=>setActiveImg(i=>(i-1+bookImages.length)%bookImages.length)} style={{ position:'absolute',top:'50%',right:'12px',transform:'translateY(-50%)',background:'rgba(0,0,0,0.5)',border:`1px solid rgba(37,99,235,0.4)`,color:'#2563EB',width:'36px',height:'36px',borderRadius:'50%',cursor:'pointer',fontSize:'1.1rem',display:'flex',alignItems:'center',justifyContent:'center',zIndex:5 }}>→</button>
                  <button onClick={()=>setActiveImg(i=>(i+1)%bookImages.length)} style={{ position:'absolute',top:'50%',left:'12px',transform:'translateY(-50%)',background:'rgba(0,0,0,0.5)',border:`1px solid rgba(37,99,235,0.4)`,color:'#2563EB',width:'36px',height:'36px',borderRadius:'50%',cursor:'pointer',fontSize:'1.1rem',display:'flex',alignItems:'center',justifyContent:'center',zIndex:5 }}>←</button>
                  <div style={{ position:'absolute',bottom:'0px',left:'50%',transform:'translateX(-50%)',display:'flex',gap:'6px',zIndex:5 }}>
                    {bookImages.map((_,i)=>(
                      <button key={i} onClick={()=>setActiveImg(i)} style={{ width:i===activeImg?'20px':'8px',height:'8px',borderRadius:'4px',border:'none',background:i===activeImg?c.gold:'rgba(255,255,255,0.5)',cursor:'pointer',padding:0,transition:'all 0.25s' }}/>
                    ))}
                  </div>
                  <div style={{ position:'absolute',bottom:'14px',right:'16px',background:'rgba(0,0,0,0.5)',color:'#fff',fontSize:'0.75rem',padding:'3px 10px',borderRadius:'20px',zIndex:5 }}>{activeImg+1}/{bookImages.length}</div>
                </>
              )}
              {bookImages.length > 1 && (
                <div style={{ display:'flex',gap:'6px',padding:'1px 16px',background:darkMode?'rgba(0,0,0,0.4)':'rgba(74,55,40,0.06)',overflowX:'auto',scrollbarWidth:'none' }}>
                  {bookImages.map((url,i)=>(
                    <div key={i} onClick={()=>setActiveImg(i)} style={{ flexShrink:0,width:'52px',height:'64px',borderRadius:'8px',overflow:'hidden',cursor:'pointer',border:`2px solid ${i===activeImg?c.gold:'transparent'}`,opacity:i===activeImg?1:0.55,transition:'all 0.2s' }}>
                      <img src={optimizeImg(url, 300)} loading="lazy" alt="" style={{ width:'100%',height:'100%',objectFit:'cover',display:'block' }}/>
                    </div>
                  ))}
                </div>
              )}
              
              {/* ── BARRE CATÉGORIES ── */}
              <div style={{ padding:'5px 16px', background: darkMode?'rgba(0,0,0,0.3)':'rgba(74,55,40,0.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ background:`linear-gradient(135deg,${c.goldDark},${c.gold})`, color:'#fff', fontSize:'0.75rem', fontWeight:'700', padding:'5px 14px', borderRadius:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.2)' }}>
                  {book.categories?.join(' • ')}
                </span>
              </div>
            </div>

            {/* ── INFOS LIVRE ── */}
            <div style={{ padding:'20px 16px 0', background:c.bgCard, borderTop:`3px solid ${c.gold}`, borderRadius:'0 0 20px 20px' }}>
              <h1 style={{ color:c.primary, fontSize:'clamp(1.3rem,5vw,1.8rem)', fontWeight:'800', margin:'0 0 2px', lineHeight:1.25 }}>{book.title}</h1>
              <p style={{ color:c.goldDark, fontSize:'0.95rem', fontWeight:'600', margin:'0 0 0px' }}>المؤلف : {book.author || '—'}</p>

              <div style={{ display:'flex', alignItems:'baseline', gap:'12px', flexWrap:'wrap', marginBottom:'4px' }}>
                {showPromo ? (
                  <>
                    <span style={{ fontSize:'1rem', fontWeight:'600' }}>ثمن الكتاب الواحد</span>
                    <span style={{ fontSize:'1rem', color:c.muted, textDecoration:'line-through' }}>{book.price.toLocaleString()} د.ج</span>
                    <span style={{ fontSize:'2rem', fontWeight:'800', color:'#e74c3c' }}>{bookBasePrice.toLocaleString()}</span>
                    <span style={{ fontSize:'0.9rem', color:c.muted }}>د.ج</span>
                    <span style={{ background:'#e74c3c', color:'white', fontSize:'0.7rem', fontWeight:'800', padding:'3px 10px', borderRadius:'20px' }}>تخفيض %{Math.round((1 - bookBasePrice / book.price) * 100)}</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize:'2rem', fontWeight:'800', color:c.goldDark }}>{bookBasePrice.toLocaleString()}</span>
                    <span style={{ fontSize:'0.9rem', color:c.muted }}>د.ج</span>
                  </>
                )}
              </div>

              {book.stock === 0 && (
                <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid #ef4444', borderRadius:'10px', padding:'8px 14px', marginBottom:'12px', color:'#ef4444', fontWeight:700, fontSize:'0.85rem' }}>❌ نفذت الكمية — غير متاح حالياً</div>
              )}
              {book.stock !== undefined && book.stock > 0 && book.stock <= 5 && (
                <div style={{ background:'rgba(249,115,22,0.1)', border:'1px solid #f97316', borderRadius:'10px', padding:'8px 14px', marginBottom:'12px', color:'#f97316', fontWeight:700, fontSize:'0.85rem' }}>⚠ آخر {book.stock} نسخ متبقية!</div>
              )}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', background:darkMode?'rgba(232,184,0,0.06)':'rgba(232,184,0,0.07)', borderRadius:'16px', padding:'10px 14px', border:`1px solid ${c.border}`, marginBottom:'16px' }}>                
                {[
                  { label:'دار النشر', value:book.publisher, icon:'🏛️' },
                  { label:'القياس', value: selectedOptions['القياس']?.name || book.qias, icon:'📐' },
                  { label:'الصفحات',  value: book.pages ? String(book.pages) : '—', icon:'📄' },
                  { label:'الورق',    value:book.paperType,  icon:'📋' },
                  { label:'التحقيق',  value:book.tahqiq,     icon:'🔍' },
                ].map((item,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'6px', padding:'4px 0' }}>
                    <span style={{ fontSize:'0.9rem', marginTop:'1px' }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize:'0.62rem', color:c.muted, fontWeight:'600', marginBottom:'1px' }}>{item.label}</div>
                      <div style={{ fontSize:'0.8rem', color:c.primary, fontWeight:'700' }}>{item.value || '—'}</div>
                    </div>
                  </div>
                ))}
              </div>

              {book.description && (
                <div style={{ marginBottom:'20px' }}>
                  <div style={{ fontSize:'0.75rem', color:c.muted, fontWeight:'700', marginBottom:'8px', display:'flex', alignItems:'center', gap:'8px' }}>
                    <span>نبذة عن الكتاب</span>
                    <div style={{ flex:1, height:'1px', background:c.border }}/>
                  </div>
                  <p style={{ color:c.text, fontSize:'0.9rem', lineHeight:1.9, margin:0, opacity:0.9 }}>{book.description}</p>
                </div>
              )}

              <div style={{ display:'flex', gap:'10px', paddingBottom:'20px', borderBottom:`1px solid ${c.border}` }}>
                <button
                  onClick={() => {
                    if (!selectedBundle && book.stock !== 0) {
                      onAddToCart(book, {
                        price: bookBasePrice,
                        qiasLabel: selectedOptions['القياس']?.name
                      })
                    }
                  }}
                  disabled={!!selectedBundle || book.stock === 0}
                  style={{
                    flex:1, padding:'13px',
                    background: selectedBundle || book.stock === 0 ? 'rgba(100,100,100,0.08)' : inCart ? `rgba(232,184,0,0.12)` : 'transparent',
                    border:`2px solid ${selectedBundle || book.stock === 0 ? 'rgba(100,100,100,0.2)' : inCart ? c.gold : c.border}`,
                    borderRadius:'22px',
                    color: selectedBundle || book.stock === 0 ? 'rgba(100,100,100,0.4)' : inCart ? c.goldDark : c.muted,
                    cursor: selectedBundle || book.stock === 0 ? 'not-allowed' : 'pointer',
                    fontWeight:'700', fontSize:'0.9rem', fontFamily:'inherit',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
                    opacity: selectedBundle || book.stock === 0 ? 0.5 : 1
                  }}>
                  <span>🛒</span>
                  <span>
                    {book.stock === 0
                      ? 'نفذت الكمية'
                      : selectedBundle
                        ? 'أضف للسلة'
                        : inCart
                          ? `في السلة (${inCart.qty})`
                          : 'أضف للسلة'
                    }
                  </span>
                </button>
                <button onClick={scrollToForm} disabled={book.stock === 0} style={{ flex:1, padding:'13px', background: book.stock === 0 ? 'rgba(100,100,100,0.4)' : `linear-gradient(135deg,${darkMode?'#2C1810':c.primary},${c.goldDark})`, border:'none', borderRadius:'22px', color:'#FFF8E7', cursor: book.stock === 0 ? 'not-allowed' : 'pointer', fontWeight:'800', fontSize:'0.9rem', fontFamily:'inherit', boxShadow: book.stock === 0 ? 'none' : `0 6px 18px rgba(184,134,11,0.4)`, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                  <span>{book.stock === 0 ? '❌' : '⚡'}</span>
                  <span>{book.stock === 0 ? 'نفذت الكمية' : 'اشترِ الآن'}</span>
                </button>
              </div>
            </div>

            {/* ══ LIVRES SIMILAIRES — desktop uniquement (dans bd-left) ══ */}
            <div className="similar-desktop">
              {similarBooksBlock}
            </div>

          </div>{/* fin bd-left */}

          {/* ══ COLONNE DROITE : FORMULAIRE ══ */}
          <div className="bd-right">
            <div ref={formRef} style={{ background:c.bgCard, padding:'24px 16px', marginTop:'12px', position:'relative', borderRadius:'20px' }}>
              <div style={{ position:'absolute',top:0,right:0,width:'36px',height:'36px',borderTop:`2px solid ${c.gold}`,borderRight:`2px solid ${c.gold}`,pointerEvents:'none' }}/>
              <div style={{ position:'absolute',top:0,left:0,width:'36px',height:'36px',borderTop:`2px solid ${c.gold}`,borderLeft:`2px solid ${c.gold}`,pointerEvents:'none' }}/>

              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
                <div style={{ width:'36px',height:'36px',borderRadius:'10px',background:`linear-gradient(135deg,${darkMode?'#2C1810':c.primary},${c.goldDark})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',flexShrink:0 }}>⚡</div>
                <div>
                  <h2 style={{ color:c.primary, fontSize:'1.1rem', fontWeight:'800', margin:0 }}>استمارة الطلب</h2>
                  <p style={{ color:c.muted, fontSize:'0.72rem', margin:0 }}>أدخل بياناتك لتأكيد الطلب</p>
                </div>
              </div>

              {/* Bundles */}
              {bundles.length > 0 && (
                <div style={{ marginBottom:'12px' }}>
                  <label style={{ fontSize:'0.78rem', fontWeight:'700', color:c.muted, display:'block', marginBottom:'8px' }}>اختر العرض *</label>
                  <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                    <div onClick={() => setSelectedBundle(null)} style={{ padding:'14px 16px', borderRadius:'14px', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', border:`2px solid ${!selectedBundle ? c.gold : c.border}`, background: !selectedBundle ? 'rgba(232,184,0,0.1)' : c.inputBg }}>
                      <img src={optimizeImg(book.image_url, 300)} loading="lazy" alt={book.title} style={{ width:'44px', height:'54px', objectFit:'cover', borderRadius:'8px', border:`1px solid ${c.border}` }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:'800', color: !selectedBundle ? c.goldDark : c.text, fontSize:'0.95rem' }}>نسخة واحدة</div>
                        {book.free_delivery && <span style={{ background:'rgba(39,174,96,0.15)', color:'#27ae60', fontSize:'0.7rem', padding:'2px 8px', borderRadius:'8px' }}>توصيل مجاني</span>}
                      </div>
                      <span style={{ fontWeight:'800', color: !selectedBundle ? c.goldDark : c.text, fontSize:'1rem' }}>{bookBasePrice.toLocaleString()} دج</span>
                      <div style={{ width:'20px', height:'20px', borderRadius:'50%', border:`2px solid ${!selectedBundle ? c.gold : c.border}`, background: !selectedBundle ? c.gold : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', color:'#fff', fontWeight:'800' }}>{!selectedBundle ? '✓' : ''}</div>
                    </div>
                    {bundles.map(bundle => (
                      <div key={bundle.id} onClick={() => setSelectedBundle(bundle)} style={{ padding:'14px 16px', borderRadius:'14px', cursor:'pointer', display:'flex', alignItems:'center', gap:'12px', border:`2px solid ${selectedBundle?.id === bundle.id ? c.gold : c.border}`, background: selectedBundle?.id === bundle.id ? 'rgba(232,184,0,0.1)' : c.inputBg }}>
                        <div style={{ position:'relative' }}>
                          <img src={optimizeImg(book.image_url, 300)} loading="lazy" alt={book.title} style={{ width:'44px', height:'54px', objectFit:'cover', borderRadius:'8px', border:`1px solid ${c.border}` }}/>
                          <span style={{ position:'absolute', top:'-6px', right:'-6px', background:c.goldDark, color:'#fff', fontSize:'0.6rem', fontWeight:'800', padding:'2px 5px', borderRadius:'8px' }}>×{bundle.qty}</span>
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:'800', color: selectedBundle?.id === bundle.id ? c.goldDark : c.text, fontSize:'0.95rem' }}>{bundle.label || `${bundle.qty} نسخ`}</div>
                          <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', marginTop:'4px' }}>
                            {bundle.qias_choice && (
                              <span style={{ background:'rgba(59,130,246,0.15)', color:'#2563EB', fontSize:'0.7rem', padding:'2px 8px', borderRadius:'8px' }}>📐 {bundle.qias_choice}</span>
                            )}
                            {bundle.free_delivery && <span style={{ background:'rgba(39,174,96,0.15)', color:'#27ae60', fontSize:'0.7rem', padding:'2px 8px', borderRadius:'8px' }}>توصيل مجاني</span>}
                            {bundle.badge && <span style={{ background:'rgba(37,99,235,0.15)', color:'#2563EB', fontSize:'0.7rem', padding:'2px 8px', borderRadius:'8px' }}>{bundle.badge}</span>}
                          </div>
                        </div>
                        <span style={{ fontWeight:'800', color: selectedBundle?.id === bundle.id ? c.goldDark : c.text, fontSize:'1rem', whiteSpace:'nowrap' }}>{bundle.price.toLocaleString()} دج</span>
                        <div style={{ width:'20px', height:'20px', borderRadius:'50%', border:`2px solid ${selectedBundle?.id === bundle.id ? c.gold : c.border}`, background: selectedBundle?.id === bundle.id ? c.gold : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', color:'#fff', fontWeight:'800' }}>{selectedBundle?.id === bundle.id ? '✓' : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!selectedBundle && (
                <div style={{ marginBottom:'16px' }}>
                  <label style={{ fontSize:'0.78rem', fontWeight:'700', color:c.muted, display:'block', marginBottom:'8px' }}>الكمية</label>
                  <div style={{ display:'flex', alignItems:'center', gap:'14px', background:c.inputBg, border:`2px solid ${c.border}`, borderRadius:'14px', padding:'10px 16px', width:'fit-content' }}>
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      style={{ width:'34px', height:'34px', borderRadius:'50%', border:`2px solid ${c.border}`, background:'transparent', color:c.text, fontSize:'1.1rem', fontWeight:'800', cursor: quantity <= 1 ? 'not-allowed' : 'pointer', opacity: quantity <= 1 ? 0.4 : 1 }}>
                      −
                    </button>
                    <span style={{ fontSize:'1.1rem', fontWeight:'800', color:c.primary, minWidth:'24px', textAlign:'center' }}>{quantity}</span>
                    <button
                      onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                      disabled={quantity >= maxQty}
                      style={{ width:'34px', height:'34px', borderRadius:'50%', border:`2px solid ${c.border}`, background:'transparent', color:c.text, fontSize:'1.1rem', fontWeight:'800', cursor: quantity >= maxQty ? 'not-allowed' : 'pointer', opacity: quantity >= maxQty ? 0.4 : 1 }}>
                      +
                    </button>
                  </div>
                  {maxQty < 10 && (
                    <p style={{ fontSize:'0.72rem', color:c.muted, marginTop:'6px' }}>الحد الأقصى المتاح حالياً: {maxQty} نسخ</p>
                  )}
                </div>
              )}

              {errors.quantity && (
                <span style={{ fontSize:'0.7rem', color:'#e74c3c', marginTop:'6px', display:'block' }}>⚠ {errors.quantity}</span>
              )}

              {/* Champs formulaire */}
              <div className="form-fields" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 12px' }}>
                <div>
                  <label style={{ fontSize:'0.78rem', fontWeight:'700', color:c.muted, display:'block', marginBottom:'6px' }}>الاسم الكامل *</label>
                  <input value={form.name} onChange={e=>setField('name')(e.target.value)} placeholder="مثال: أحمد بن علي" style={inpStyle(errors.name)} onFocus={e=>e.target.style.borderColor=c.gold} onBlur={e=>e.target.style.borderColor=errors.name?'#e74c3c':c.border}/>
                  {errors.name && <span style={{ fontSize:'16px',color:'#e74c3c',marginTop:'4px',display:'block' }}>⚠ {errors.name}</span>}
                </div>
                <div>
                  <label style={{ fontSize:'0.78rem', fontWeight:'700', color:c.muted, display:'block', marginBottom:'6px' }}>رقم الهاتف *</label>
                  <input type="tel" value={form.phone} onChange={e=>setField('phone')(e.target.value)} placeholder="0xxxxxxxxx" style={inpStyle(errors.phone)} onFocus={e=>e.target.style.borderColor=c.gold} onBlur={e=>saveAbandonedNow({...form, phone: e.target.value})}/>
                  {errors.phone && <span style={{ fontSize:'16px',color:'#e74c3c',marginTop:'4px',display:'block' }}>⚠ {errors.phone}</span>}
                </div>
                <div>
                  <label style={{ fontSize:'0.78rem', fontWeight:'700', color:c.muted, display:'block', marginBottom:'6px' }}>الولاية *</label>
                  <select value={form.wilaya} onChange={e=>setField('wilaya')(e.target.value)} style={{ ...inpStyle(errors.wilaya), cursor:'pointer', color: form.wilaya ? c.text : c.muted }}>
                    <option value="" disabled>اختر الولاية</option>
                    {wilayas.map((w,i) => <option key={i} value={w} style={{ background:c.bgCard,color:c.text }}>{String(i+1).padStart(2,'0')} - {w}</option>)}
                  </select>
                  {errors.wilaya && <span style={{ fontSize:'16px',color:'#e74c3c',marginTop:'4px',display:'block' }}>⚠ {errors.wilaya}</span>}
                </div>
                <div>
                  <label style={{ fontSize:'0.78rem', fontWeight:'700', color:c.muted, display:'block', marginBottom:'6px' }}>العنوان التفصيلي *</label>
                  <input value={form.address} onChange={e=>setField('address')(e.target.value)} placeholder="الشارع، الحي، رقم المبنى..." style={inpStyle(errors.address)} onFocus={e=>e.target.style.borderColor=c.gold} onBlur={e=>e.target.style.borderColor=errors.address?'#e74c3c':c.border}/>
                  {errors.address && <span style={{ fontSize:'0.7rem',color:'#e74c3c',marginTop:'4px',display:'block' }}>⚠ {errors.address}</span>}
                </div>
              </div>
              
              {/* ── OPTIONS ── */}
              {bookOptions.length > 0 && (
              <div style={{ marginTop:'16px' }}>
                {bookOptions.map(opt => (
                <div key={opt.id} style={{ marginBottom:'14px' }}>
                  <label style={{ fontSize:'0.78rem', fontWeight:'700', color:c.muted, display:'block', marginBottom:'8px' }}>
                    {opt.label} *
                  </label>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                    {opt.choices.map(ch => {
                      const isSelected = selectedOptions[opt.label]?.name === ch.name
                      const isLocked = opt.label === 'القياس' && !!selectedBundle?.qias_choice
                      const isDisabled = isLocked && ch.name !== selectedBundle.qias_choice
                      return (
                        <button key={ch.name}
                          onClick={() => { if (!isDisabled) setSelectedOptions(p => ({ ...p, [opt.label]: ch })) }}
                          disabled={isDisabled}
                          style={{
                            padding:'8px 16px', borderRadius:'20px',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            border:`2px solid ${isSelected ? c.gold : c.border}`,
                            background: isSelected ? 'rgba(232,184,0,0.15)' : c.inputBg,
                            color: isSelected ? c.goldDark : c.text,
                            fontFamily:'inherit', fontSize:'0.85rem',
                            fontWeight: isSelected ? '800' : '400',
                            transition:'all 0.15s',
                            display:'flex', flexDirection:'column', alignItems:'center', gap:'2px',
                            opacity: isDisabled ? 0.4 : 1,
                            textDecoration: isDisabled ? 'line-through' : 'none',
                          }}>
                          <span>{ch.name}</span>
                          {opt.affects_price && ch.price > 0 && (
                            <span style={{ fontSize:'0.7rem', color: isSelected ? c.goldDark : c.muted }}>
                              {ch.price.toLocaleString()} دج
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {errors[`opt_${opt.label}`] && (
                    <span style={{ fontSize:'1.2rem', color:'#e74c3c', marginTop:'4px', display:'block' }}>
                      ⚠ {errors[`opt_${opt.label}`]}
                    </span>
                  )}
                </div>
              ))}
              </div>
            )}

              {/* نوع التوصيل */}
              <div style={{ marginTop:'16px' }}>
                <label style={{ fontSize:'0.78rem', fontWeight:'700', color:c.muted, display:'block', marginBottom:'8px' }}>نوع التوصيل *</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'10px' }}>
                  {[
                    { value:'domicile', icon:'🏠', price: isFreeDelivery ? 0 : currentWilayaPrices.home_price, sub:'يصلك مباشرة عند باب منزلك' },
                    { value:'bureau',   icon:'🏢', price: isFreeDelivery ? 0 : currentWilayaPrices.dhd_price,  sub:'تستلم طلبك من أقرب مكتب DHD في ولايتك' },
                  ].map(opt => (
                    <div key={opt.value} onClick={() => setLivraison(opt.value as any)} style={{ padding:'16px 20px', borderRadius:'14px', cursor:'pointer', display:'flex', alignItems:'center', gap:'16px', border:`2px solid ${livraison === opt.value ? c.gold : c.border}`, background: livraison === opt.value ? `rgba(232,184,0,0.1)` : c.inputBg, transition:'all 0.2s' }}>
                      <div style={{ fontSize:'2rem', flexShrink:0 }}>{opt.icon}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'0.95rem', fontWeight:'800', color: livraison === opt.value ? c.goldDark : c.text }}>{opt.value === 'domicile' ? 'توصيل للمنزل' : 'مكتب DHD'}</div>
                        <div style={{ fontSize:'0.8rem', color:c.muted, marginTop:'4px', lineHeight:1.5 }}>{opt.sub}</div>
                      </div>
                      <div style={{ fontSize:'1rem', fontWeight:'800', color: opt.price === 0 ? '#27ae60' : '#e74c3c', whiteSpace:'nowrap', flexShrink:0 }}>{opt.price === 0 ? '' : `${opt.price.toLocaleString()} دج`}</div>
                      <div style={{ width:'22px', height:'22px', borderRadius:'50%', flexShrink:0, border:`2px solid ${livraison === opt.value ? c.gold : c.border}`, background: livraison === opt.value ? c.gold : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', color:'#fff', fontWeight:'800' }}>{livraison === opt.value ? '✓' : ''}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Résumé */}
              <div style={{ marginTop:'20px', background:`rgba(232,184,0,0.07)`, border:`1px solid ${c.border}`, borderRadius:'16px', padding:'14px', marginBottom:'16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                  <span style={{ fontSize:'0.85rem', color:c.text }}>
                    {selectedBundle ? 'ثمن العرض' : 'ثمن الكتاب'}
                  </span>
                  <span style={{ fontSize:'0.9rem', color:c.text, fontWeight:'600' }}>
                    {(selectedBundle ? selectedBundle.price : bookBasePrice * quantity).toLocaleString()} دج
                    {selectedBundle && <span style={{ color:c.muted, fontSize:'0.75rem' }}> ({selectedBundle.qty} نسخ)</span>}
                    {!selectedBundle && quantity > 1 && <span style={{ color:c.muted, fontSize:'0.75rem' }}> ({quantity} نسخ)</span>}
                  </span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:'10px', borderTop:`1px solid ${c.border}` }}>
                  <span style={{ fontSize:'0.85rem', color:c.text }}>التوصيل</span>
                  <span style={{ fontSize:'0.9rem', fontWeight:'600', color: deliveryPrice === 0 ? '#27ae60' : c.text }}>{deliveryPrice === 0 ? 'مجاني ✓' : `${deliveryPrice.toLocaleString()} دج`}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:'10px', marginTop:'10px', borderTop:`1px solid ${c.border}` }}>
                  <strong style={{ fontSize:'1rem', color:c.primary }}>المجموع</strong>
                  <strong style={{ fontSize:'1.3rem', color:c.goldDark }}>{totalPrice.toLocaleString()} <span style={{ fontSize:'0.8rem', color:c.muted, fontWeight:'400' }}>دج</span></strong>
                </div>
              </div>
              <button onClick={handleSubmit} disabled={loading || book.stock === 0}
                style={{ width:'100%', padding:'16px', marginBottom:'10px', background: loading || book.stock === 0 ? 'rgba(100,100,100,0.4)' : 'linear-gradient(135deg,#1a9e4a,#27ae60)', border:'none', borderRadius:'22px', color:'#fff', fontSize:'1.05rem', fontWeight:'800', cursor: loading || book.stock === 0 ? 'not-allowed' : 'pointer', fontFamily:'inherit', boxShadow: loading || book.stock === 0 ? 'none' : '0 6px 24px rgba(39,174,96,0.4)', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', transition:'all 0.2s' }}>
                {book.stock === 0
                  ? <><span>❌</span><span>نفذت الكمية</span></>
                  : loading
                    ? <><span style={{ display:'inline-block',width:'18px',height:'18px',border:'2.5px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.7s linear infinite' }}/><span>جاري المعالجة...</span></>
                    : <><span>✅</span><span>تأكيد الطلب الآن</span></>
                }
              </button>
              {book.wholesale_available && (
                <a href={`https://wa.me/213781775900?text=${encodeURIComponent(`مرحباً، أرغب في شراء كمية بالجملة من كتاب: ${book.title}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width:'100%', padding:'14px', background:'#25D366', border:'none', borderRadius:'22px',
                    color:'#fff', fontSize:'0.95rem', fontWeight:'800', cursor:'pointer', fontFamily:'inherit',
                    boxShadow:'0 6px 18px rgba(37,211,102,0.35)', display:'flex', alignItems:'center', justifyContent:'center',
                    gap:'8px', marginBottom:'10px', textDecoration:'none', boxSizing:'border-box'
                  }}>
                  <span style={{
                    background: '#fff', borderRadius: '50%', width: '24px', height: '24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <img src="/whatsapp.png" alt="WhatsApp" style={{ width: '16px', height: '16px' }} />
                  </span>
                  <span>شراء بالجملة عبر واتساب</span>
                </a>
              )}
            </div>
          </div>{/* fin bd-right */}

        </div>{/* fin bd-layout */}

        {/* ══ LIVRES SIMILAIRES — mobile uniquement (sous le formulaire) ══ */}
        <div className="similar-mobile">
          {similarBooksBlock}
        </div>

      </div>{/* fin bd-outer */}
      {/* ══ LIGHTBOX PLEIN ÉCRAN ══ */}
      {lightboxOpen && (
      <div
        onClick={() => setLightboxOpen(false)}
        onTouchStart={e => {
          if (e.touches.length === 2) {
            isPinchingRef.current = true
            pinchStartRef.current = { dist: getTouchDist(e.touches), scale: zoomRef.current.scale }
          } else if (e.touches.length === 1) {
            touchStartXRef.current = e.touches[0].clientX
            touchStartYRef.current = e.touches[0].clientY
            if (zoomRef.current.scale > 1) {
              panStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, tx: zoomRef.current.x, ty: zoomRef.current.y, active: true }
            }
            const now = Date.now()
            if (now - lastTapRef.current < 280) toggleZoom()
            lastTapRef.current = now
          }
        }}
        onTouchMove={e => {
          if (e.touches.length === 2) {
            e.preventDefault()
            const dist = getTouchDist(e.touches)
            zoomRef.current.scale = clamp(pinchStartRef.current.scale * (dist / pinchStartRef.current.dist), 1, 4)
            applyZoomTransform()
          } else if (e.touches.length === 1 && panStartRef.current.active) {
            e.preventDefault()
            const dx = e.touches[0].clientX - panStartRef.current.x
            const dy = e.touches[0].clientY - panStartRef.current.y
            zoomRef.current.x = panStartRef.current.tx + dx
            zoomRef.current.y = panStartRef.current.ty + dy
            applyZoomTransform()
          }
        }}
        onTouchEnd={e => {
          if (e.touches.length > 0) return
          const wasPinching = isPinchingRef.current
          isPinchingRef.current = false
          panStartRef.current.active = false

          if (zoomRef.current.scale <= 1.02) {
            zoomRef.current.scale = 1
            applyZoomTransform()
            if (!wasPinching && touchStartXRef.current !== null && bookImages.length > 1) {
              const diff = e.changedTouches[0].clientX - touchStartXRef.current
              if (Math.abs(diff) > 50) {
                if (diff > 0) setActiveImg(i => (i + 1) % bookImages.length)
                else setActiveImg(i => (i - 1 + bookImages.length) % bookImages.length)
              }
            }
          }
          touchStartXRef.current = null
          touchStartYRef.current = null
        }}
        onWheel={e => {
          e.preventDefault()
          const delta = -e.deltaY * 0.0015
          zoomRef.current.scale = clamp(zoomRef.current.scale + delta, 1, 4)
          if (zoomRef.current.scale === 1) { zoomRef.current.x = 0; zoomRef.current.y = 0 }
          applyZoomTransform()
        }}
        style={{
          position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.96)',
          display:'flex', alignItems:'center', justifyContent:'center', touchAction:'none',
          animation:'lbFadeIn 0.25s ease'
        }}
      >
        <div style={{ position:'absolute', top:0, left:0, right:0, height:'90px', background:'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)', zIndex:5, pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'120px', background:'linear-gradient(to top, rgba(0,0,0,0.55), transparent)', zIndex:5, pointerEvents:'none' }}/>

        {/* ── Bouton quitter — en haut à gauche ── */}
        <button
          onClick={e => { e.stopPropagation(); setLightboxOpen(false) }}
          style={{ position:'absolute', top:'18px', left:'18px', zIndex:10, background:'rgba(255,255,255,0.12)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.25)', color:'#fff', width:'40px', height:'40px', borderRadius:'50%', cursor:'pointer', fontSize:'1.15rem', display:'flex', alignItems:'center', justifyContent:'center' }}
        >✕</button>

        {bookImages.length > 1 && (
          <>
            <button
              onClick={e => { e.stopPropagation(); setActiveImg(i => (i - 1 + bookImages.length) % bookImages.length) }}
              style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', zIndex:10, background:'rgba(255,255,255,0.1)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', width:'42px', height:'42px', borderRadius:'50%', cursor:'pointer', fontSize:'1.2rem', display:'flex', alignItems:'center', justifyContent:'center' }}
            >→</button>
            <button
              onClick={e => { e.stopPropagation(); setActiveImg(i => (i + 1) % bookImages.length) }}
              style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', zIndex:10, background:'rgba(255,255,255,0.1)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', width:'42px', height:'42px', borderRadius:'50%', cursor:'pointer', fontSize:'1.2rem', display:'flex', alignItems:'center', justifyContent:'center' }}
            >←</button>

            <div style={{ position:'absolute', bottom:'24px', left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:'10px', zIndex:10 }}>
              <div style={{ display:'flex', gap:'6px' }}>
                {bookImages.map((_,i)=>(
                  <span key={i} style={{ width:i===activeImg?'18px':'6px', height:'6px', borderRadius:'4px', background:i===activeImg?'#2563EB':'rgba(255,255,255,0.4)', transition:'all 0.25s' }}/>
                ))}
              </div>
              <span style={{ color:'rgba(255,255,255,0.75)', fontSize:'0.75rem', fontWeight:600 }}>{activeImg + 1} / {bookImages.length}</span>
            </div>
          </>
        )}

        <div style={{ maxWidth:'92vw', maxHeight:'88vh', overflow:'hidden', animation:'lbImgIn 0.3s ease', borderRadius:'10px' }}>
          <img
            key={currentImage}
            ref={lbImgRef}
            src={optimizeImg(currentImage, 1200)}
            alt={book.title}
            onClick={e => e.stopPropagation()}
            onDoubleClick={e => { e.stopPropagation(); toggleZoom() }}
            style={{ maxWidth:'92vw', maxHeight:'88vh', objectFit:'contain', userSelect:'none', display:'block', transformOrigin:'center', touchAction:'none', willChange:'transform' }}
          />
        </div>
      </div>
    )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        input, textarea, select { direction: rtl; font-family: 'Cairo', sans-serif; }
        input::placeholder, textarea::placeholder { color: #8C7B6B; }
        select option { background: ${c.bgCard}; color: ${c.text}; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes popIn { from { transform:scale(0); } to { transform:scale(1); } }
        .bd-zoom-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.42);
          display: flex; align-items: center; justify-content: center;
          flex-direction: column; gap: 8px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.25s;
        }
        .bd-zoom-img { transition: filter 0.25s, transform 0.25s; transform-origin: center; }

        /* ── PC : au survol ── */
        @media (hover: hover) and (pointer: fine) {
          .bd-img-zoom-wrap:hover .bd-zoom-overlay { opacity: 1; }
          .bd-img-zoom-wrap:hover .bd-zoom-img { filter: brightness(0.8); }
        }

        /* ── Mobile/tactile : indice automatique 3x au chargement ── */
        @media (hover: none) {
          .bd-zoom-img { animation: bdHintImg 3s ease-in-out 3; animation-delay: 0.6s; }
          .bd-zoom-overlay { animation: bdHintOverlay 3s ease-in-out 3; animation-delay: 0.6s; }
        }

        @keyframes bdHintImg {
          0%, 30%, 100% { filter: brightness(1); transform: scale(1); }
          12% { filter: brightness(0.78); transform: scale(1.035); }
        }
        @keyframes bdHintOverlay {
          0%, 30%, 100% { opacity: 0; }
          12% { opacity: 1; }
        }

@keyframes lbFadeIn { from { opacity:0 } to { opacity:1 } }
@keyframes lbImgIn { from { opacity:0; transform:scale(0.94) } to { opacity:1; transform:scale(1) } }

        .bd-layout { display: flex; flex-direction: column; gap: 0; }
        .bd-left { width: 100%; }
        .bd-right { width: 100%; }
        .bd-gallery { margin-top: 62px; }

        /* Mobile : livres similaires en bas via similar-mobile, similar-desktop caché */
        .similar-mobile { display: block; }
        .similar-desktop { display: none; }

        @media(min-width: 900px) {
          .bd-outer { padding-bottom: 40px !important; }
          .bd-layout { flex-direction: row; align-items: flex-start; gap: 24px; padding: 0 16px; }
          .bd-left { flex: 1; min-width: 0; order: unset; }
          .bd-right { width: 420px; flex-shrink: 0; position: sticky; top: 20px; margin-top: 80px; order: unset; }
          .bd-left > div:first-child { margin-top: 80px; }
          .bd-floating-cta { display: none !important; }
          /* Desktop : similaires dans bd-left, similar-mobile caché */
          .similar-mobile { display: none; }
          .similar-desktop { display: block; }
          .bd-gallery { margin-top: 80px; }
        }
        
        @media(max-width:480px) {
          .form-fields input, .form-fields select {
            padding: 12px 10px !important;
            font-size: 0.9rem !important;
          }
        }

        @media(min-width:641px) {
          .sim-grid { grid-template-columns: repeat(3,1fr) !important; }
          .form-fields { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  )
}
