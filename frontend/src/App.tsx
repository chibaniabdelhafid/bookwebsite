import { useEffect, useRef, useState, useMemo, memo } from 'react'
import BooksPage from './pages/book_page'
import CartDrawer from './components/CartDrawer'
import CheckoutPage from './pages/CheckoutPage.tsx'
import { supabase } from './lib/supabase'
import { Routes, Route, useNavigate } from 'react-router-dom'
import BookDetailPage from './pages/BookDetailPage'
import { useLocation } from 'react-router-dom'
import { fbTrack } from './lib/pixel'
import { Analytics } from '@vercel/analytics/react'
// fixing image size.


interface Book {
  id: number; title: string; author: string; price: number;
  image_url: string; categories: string[]; rating: number; pages: string;
  publisher: string; qias: string; description: string; paperType: string; tahqiq: string; promotion?: number;
  bestseller?: boolean;
  free_delivery?: boolean; // ← ajoute cette ligne
}
interface CartItem {
  id: number; title: string; author: string;
  price: number; image_url: string; qty: number;
  qiasLabel?: string;
  free_delivery?: boolean; // ← ajoute cette ligne
}

const CATS_META = [
  { id:'حديث',  image:'https://images.unsplash.com/photo-1585241645927-c7a8e5840c42?q=80&w=200', label:'الحديث النبوي',  desc:'أحاديث النبي ﷺ وشروحها' },
  { id:'سيرة',  image:'https://images.unsplash.com/photo-1592431913823-7af6b323da9b?q=80&w=200', label:'السيرة النبوية', desc:'حياة النبي ﷺ والصحابة' },
  { id:'تفسير', image:'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=200', label:'تفسير القرآن',   desc:'تفسير وعلوم القرآن الكريم' },
  { id:'فقه',   image:'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=200', label:'الفقه الإسلامي', desc:'الأحكام الشرعية والفتاوى' },
  { id:'عقيدة', image:'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=200', label:'العقيدة',        desc:'أصول العقيدة الإسلامية' },
  { id:'تزكية', image:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200', label:'التزكية والسلوك',desc:'تهذيب النفس والأخلاق' },
]

// ══ COMPOSANTS HORS DE App POUR ÉVITER LE RE-RENDER ══

interface SidebarProps {
  sidebarOpen: boolean; setSidebarOpen: (v:boolean)=>void;
  darkMode: boolean; C: any; navigate: any;
  activeTab: string; cartCount: number;
  setCartOpen: (v:boolean)=>void; setDarkMode: (fn:any)=>void;
}

// Fonction utilitaire à ajouter en haut de chaque fichier
const optimizeImg = (url: string, _width = 400) => url

const Sidebar = ({ sidebarOpen, setSidebarOpen, darkMode, C, navigate, activeTab, cartCount, setCartOpen, setDarkMode }: SidebarProps) => (
  <>
    <div onClick={() => setSidebarOpen(false)} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', opacity: sidebarOpen ? 1 : 0, pointerEvents: sidebarOpen ? 'all' : 'none', transition:'opacity 0.3s' }}/>
    <div style={{ position:'fixed', top:0, right:0, bottom:0, zIndex:500, width:'75vw', maxWidth:'300px', background: darkMode ? '#0F2038' : '#FFFFFF', borderLeft:`2px solid ${C.gold}`, transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)', transition:'transform 0.35s cubic-bezier(0.34,1.1,0.64,1)', display:'flex', flexDirection:'column', boxShadow:'-8px 0 40px rgba(0,0,0,0.3)', direction:'rtl' }}>
      <div style={{ padding:'20px 20px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'44px',height:'44px',borderRadius:'12px',overflow:'hidden',border:`2px solid ${C.gold}` }}>
            <img src={optimizeImg("/elquds.png")} loading="lazy" alt="كتابي" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
          </div>
          <div>
            <div style={{ fontWeight:'800', fontSize:'0.95rem', color:C.primary }}>القدس للكتاب</div>
            <div style={{ fontSize:'0.6rem', color:C.gold, letterSpacing:'1px' }}>elquds/القدس</div>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(false)} style={{ background:'none', border:`1px solid ${C.border}`, color:C.muted, width:'32px', height:'32px', borderRadius:'50%', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
      </div>
      <div style={{ flex:1, padding:'20px 16px', display:'flex', flexDirection:'column', gap:'8px' }}>
        {[{id:'home',label:'الرئيسية',icon:'🏠',path:'/'},{id:'books',label:'الكتب',icon:'📚',path:'/books'}].map(tab => (
          <button key={tab.id} onClick={() => { navigate(tab.path); setSidebarOpen(false); }} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 16px', borderRadius:'16px', cursor:'pointer', fontFamily:'inherit', fontSize:'1rem', fontWeight:'700', border: activeTab===tab.id ? 'none' : `1px solid ${C.border}`, background: activeTab===tab.id ? `linear-gradient(135deg,${darkMode?'#2C1810':C.primary},${C.goldDark})` : 'transparent', color: activeTab===tab.id ? '#FFF8E7' : C.text, transition:'all 0.2s' }}>
            <span style={{ fontSize:'1.3rem' }}>{tab.icon}</span>
            <span>{tab.label}</span>
            {activeTab===tab.id && <span style={{ marginRight:'auto', fontSize:'0.8rem' }}>●</span>}
          </button>
        ))}
      </div>
      <div style={{ padding:'16px 20px', borderTop:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:'12px' }}>
        <button onClick={() => setDarkMode((d:boolean)=>!d)} style={{ flex:1, display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', borderRadius:'14px', border:`1px solid ${C.border}`, background:'transparent', cursor:'pointer', fontFamily:'inherit', color:C.text, fontSize:'0.88rem', fontWeight:'600' }}>
          <span style={{ fontSize:'1.2rem' }}>{darkMode ? '🌙' : '☀️'}</span>
          <span>{darkMode ? 'وضع ليلي' : 'وضع نهاري'}</span>
        </button>
        <button onClick={() => { setCartOpen(true); setSidebarOpen(false); }} style={{ position:'relative', width:'44px', height:'44px', borderRadius:'50%', border:`1px solid ${C.border}`, background:'transparent', cursor:'pointer', fontSize:'1.2rem', display:'flex', alignItems:'center', justifyContent:'center', color:C.text }}>
          🛒
          {cartCount > 0 && <span style={{ position:'absolute', top:'-3px', right:'-3px', background:C.gold, color:darkMode?'#1A1208':C.primary, borderRadius:'50%', width:'18px', height:'18px', fontSize:'0.6rem', fontWeight:'bold', display:'flex', alignItems:'center', justifyContent:'center' }}>{cartCount}</span>}
        </button>
      </div>
    </div>
  </>
)

interface FloatingNavProps {
  darkMode: boolean; C: any; navigate: any; activeTab: string;
  cartCount: number; setCartOpen: (v:boolean)=>void;
  setDarkMode: (fn:any)=>void; setSidebarOpen: (v:boolean)=>void;
}
const FloatingNav = ({ darkMode, C, navigate, activeTab, cartCount, setCartOpen, setDarkMode, setSidebarOpen }: FloatingNavProps) => (
  <>
    <style>{`
      .fn-mobile { display: none !important; }
      @media(max-width:640px) {
        .fn-desktop { display: none !important; }
        .fn-mobile  { display: flex !important; }
      }
    `}</style>
    {/* DESKTOP */}
    <div className="fn-desktop" style={{ position:'fixed',top:'16px',right:'16px',zIndex:200,display:'flex',alignItems:'center',gap:'8px' }}>
      <div onClick={()=>navigate('/')} style={{ width:'85px',height:'85px',borderRadius:'18px',overflow:'hidden',background:'#EEF4FF',border:`3px solid ${C.gold}`,boxShadow:`0 4px 20px rgba(37,99,235,0.45)`,cursor:'pointer',flexShrink:0 }}>
        <img src={optimizeImg("/elquds.png")} loading='lazy' alt="كتابي" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
      </div>
      <div>
        <div style={{ fontWeight:'800',fontSize:'1.1rem',color:C.primary,lineHeight:1.1,fontFamily:"'Cairo',sans-serif" }}>القدس للكتاب</div>
        <div style={{ fontSize:'0.65rem',color:C.gold,letterSpacing:'2px' }}>ELQUDS/القدس</div>
      </div>
    </div>
    <div className="fn-desktop" style={{ position:'fixed',top:'16px',left:'50%',transform:'translateX(-50%)',zIndex:200,display:'flex',gap:'6px' }}>
      {[{id:'home',l:'الرئيسية',path:'/'},{id:'books',l:'الكتب',path:'/books'}].map(tab=>(
        <button key={tab.id} onClick={()=>navigate(tab.path)} style={{ background:activeTab===tab.id?`linear-gradient(135deg,${darkMode?'#2C1810':C.primary},${C.goldDark})`:darkMode?'rgba(34,26,14,0.85)':'rgba(255,253,248,0.85)',backdropFilter:'blur(12px)',border:activeTab===tab.id?'none':`1px solid ${C.border}`,color:activeTab===tab.id?'#FFF8E7':C.muted,padding:'9px 16px',borderRadius:'30px',cursor:'pointer',fontSize:'0.85rem',fontFamily:'inherit',fontWeight:activeTab===tab.id?'bold':'normal',boxShadow:activeTab===tab.id?`0 4px 18px rgba(74,55,40,0.35)`:`0 2px 12px rgba(74,55,40,0.12)`,whiteSpace:'nowrap',transition:'all 0.25s' }}>
          {tab.l}
        </button>
      ))}
    </div>
    <div className="fn-desktop" style={{ position:'fixed',top:'16px',left:'16px',zIndex:200,display:'flex',alignItems:'center',gap:'8px' }}>
      <button onClick={()=>setDarkMode((d:boolean)=>!d)} style={{ width:'56px',height:'30px',borderRadius:'15px',border:`1.5px solid ${C.gold}`,background:darkMode?'rgba(13,10,4,0.85)':'rgba(255,248,231,0.85)',backdropFilter:'blur(10px)',cursor:'pointer',position:'relative',display:'flex',alignItems:'center',padding:'2px',direction:'ltr',boxShadow:`0 3px 12px rgba(37,99,235,0.3)`,transition:'background 0.35s' }}>
        <div style={{ width:'24px',height:'24px',borderRadius:'50%',background:darkMode?'linear-gradient(135deg,#2563EB,#8FC1FF)':'linear-gradient(135deg,#5B9BFF,#2563EB)',transform:darkMode?'translateX(0)':'translateX(24px)',transition:'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',position:'relative',zIndex:2 }}>{darkMode?'🌙':'☀️'}</div>
      </button>
      <button onClick={()=>setCartOpen(true)} style={{ background:darkMode?'rgba(34,26,14,0.85)':'rgba(255,253,248,0.85)',backdropFilter:'blur(10px)',border:`1px solid ${C.border}`,color:C.muted,cursor:'pointer',fontSize:'1rem',width:'40px',height:'40px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',boxShadow:`0 3px 12px rgba(74,55,40,0.15)` }}>
        🛒{cartCount>0&&<span style={{ position:'absolute',top:'-3px',right:'-3px',background:C.gold,color:darkMode?'#1A1208':C.primary,borderRadius:'50%',width:'16px',height:'16px',fontSize:'0.55rem',fontWeight:'bold',display:'flex',alignItems:'center',justifyContent:'center' }}>{cartCount}</span>}
      </button>
    </div>
    {/* MOBILE */}
    <div className="fn-mobile" style={{ position:'fixed',top:0,left:0,right:0,zIndex:200,height:'60px',background:darkMode?'rgba(10,21,38,0.97)':'rgba(255,255,255,0.97)',backdropFilter:'blur(16px)',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',boxShadow:'0 2px 16px rgba(0,0,0,0.1)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer' }} onClick={()=>navigate('/')}>
        <div style={{ width:'36px',height:'36px',borderRadius:'10px',overflow:'hidden',border:`2px solid ${C.gold}` }}>
          <img src={optimizeImg("/elquds.png")} loading="lazy" alt="كتابي" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
        </div>
        <div>
          <div style={{ fontWeight:'800', fontSize:'0.82rem', color:C.primary, lineHeight:1.1 }}>القدس للكتاب</div>
          <div style={{ fontSize:'0.55rem', color:C.gold, letterSpacing:'1px' }}>KITABI</div>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        <button onClick={()=>setCartOpen(true)} style={{ position:'relative', background:'none', border:`1px solid ${C.border}`, borderRadius:'50%', width:'36px', height:'36px', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center', color:C.text }}>
          🛒
          {cartCount>0 && <span style={{ position:'absolute',top:'-3px',right:'-3px',background:C.gold,color:darkMode?'#1A1208':C.primary,borderRadius:'50%',width:'16px',height:'16px',fontSize:'0.5rem',fontWeight:'bold',display:'flex',alignItems:'center',justifyContent:'center' }}>{cartCount}</span>}
        </button>
        <button onClick={()=>setSidebarOpen(true)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:'10px', width:'36px', height:'36px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'5px', padding:'8px' }}>
          <span style={{ display:'block', width:'18px', height:'2px', background:C.primary, borderRadius:'2px' }}/>
          <span style={{ display:'block', width:'18px', height:'2px', background:C.primary, borderRadius:'2px' }}/>
          <span style={{ display:'block', width:'18px', height:'2px', background:C.primary, borderRadius:'2px' }}/>
        </button>
      </div>
    </div>
    <Sidebar sidebarOpen={false} setSidebarOpen={()=>{}} darkMode={darkMode} C={C} navigate={navigate} activeTab={activeTab} cartCount={cartCount} setCartOpen={setCartOpen} setDarkMode={setDarkMode}/>
  </>
)
interface CatCardProps {
  cat: {name:string;image:string;label:string;desc:string;type:string};
  books: Book[]; C: any; darkMode: boolean;
  navigate: any;   // ← setSelectedCategory retiré
}
const CatCard = memo(({ cat, books, C, darkMode, navigate }: CatCardProps) => {
  const count = books.filter(b => b.categories?.includes(cat.name)).length
  return (
    <div onClick={() => navigate(`/books?category=${encodeURIComponent(cat.name)}`)}
      className="cat-card"
      style={{ background:C.bgCard, borderRadius:'20px', border:`1px solid ${C.border}`, boxShadow:`0 4px 20px rgba(74,55,40,0.08)`, padding:'28px 24px', cursor:'pointer', position:'relative', overflow:'hidden'}}>
      <div style={{ position:'absolute',top:0,right:0,width:'40px',height:'40px',borderTop:`2px solid ${C.gold}`,borderRight:`2px solid ${C.gold}`,borderRadius:'0 20px 0 0',pointerEvents:'none' }}/>
      <div style={{ position:'absolute',bottom:0,left:0,width:'40px',height:'40px',borderBottom:`2px solid ${C.gold}`,borderLeft:`2px solid ${C.gold}`,borderRadius:'0 0 0 20px',pointerEvents:'none' }}/>
      <div className="cat-img-wrapper" style={{ width:'100%',height:'220px',overflow:'hidden',borderRadius:'50%',margin:'0 auto 18px',border:`2px solid ${C.border}`,boxShadow:`0 8px 24px rgba(74,55,40,0.25)` }}>
        <img src={optimizeImg(cat.image, 300)} loading="lazy" alt={cat.label} style={{ width:'100%',height:'100%',objectFit:'cover',display:'block' }}/>
      </div>
      <h3 style={{ color:C.primary, fontSize:'1.1rem', fontWeight:'800', margin:'0 0 6px', fontFamily:'inherit' }}>{cat.label}</h3>
      <p style={{ color:C.muted, fontSize:'0.82rem', margin:'0 0 16px', lineHeight:1.6 }}>{cat.desc}</p>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ background:`rgba(201,168,76,0.12)`, color:C.goldDark, fontSize:'0.75rem', fontWeight:'700', padding:'4px 12px', borderRadius:'20px', border:`1px solid ${C.border}` }}>
          {count > 0 ? `${count} كتاب` : 'قريباً'}
        </span>
        <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:`linear-gradient(135deg,${darkMode?'#2C1810':C.primary},${C.goldDark})`, display:'flex', alignItems:'center', justifyContent:'center', color:'#FFF8E7', fontSize:'1rem' }}>←</div>
      </div>
    </div>
  )
})


interface BookCardProps { book: Book; C: any; navigate: any }
const BookCard = memo(({ book, C, navigate }: BookCardProps) => (
  <div
    className="app-book-card"
    onClick={() => navigate(`/book/${book.id}`)}
    style={{ background:C.bgCard, borderRadius:'16px', overflow:'hidden', border:`1px solid ${C.border}`, cursor:'pointer', boxShadow:`0 4px 16px rgba(74,55,40,0.08)` }}
  >
    <div style={{ position:'relative' }}>
      <img src={optimizeImg(book.image_url, 300)} loading="lazy" alt={book.title} style={{ width:'100%', height:'200px', objectFit:'cover', display:'block' }}/>
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(44,24,16,0.7) 0%,transparent 50%)' }}/>
      {book.promotion && book.promotion > 0 && book.promotion < book.price && (
        <span style={{ position:'absolute', top:'8px', left:'8px', background:'#e74c3c', color:'white', fontSize:'0.6rem', fontWeight:'800', padding:'3px 7px', borderRadius:'10px' }}>
          -{Math.round((1 - book.promotion/book.price)*100)}%
        </span>
      )}
      <div style={{ position:'absolute', bottom:'8px', right:'8px', color:C.goldLight, fontSize:'0.6rem' }}>{'★'.repeat(book.rating)}</div>
    </div>
    <div style={{ padding:'10px' }}>
      <p style={{ color:C.primary, fontSize:'0.78rem', fontWeight:'700', margin:'0 0 3px', lineHeight:1.3, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any }}>{book.title}</p>
      <p style={{ color:C.muted, fontSize:'0.68rem', margin:'0 0 8px' }}>{book.author}</p>
      <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:'7px' }}>
        {book.promotion && book.promotion > 0 && book.promotion < book.price ? (
          <div>
            <span style={{ color:'#e74c3c', fontWeight:'800', fontSize:'0.88rem' }}>{book.promotion.toLocaleString()}</span>
            <span style={{ color:C.muted, fontSize:'0.65rem', textDecoration:'line-through', marginRight:'4px' }}> {book.price.toLocaleString()}</span>
            <span style={{ color:C.muted, fontSize:'0.65rem' }}>د.ج</span>
          </div>
        ) : (
          <span style={{ color:C.goldDark, fontWeight:'800', fontSize:'0.88rem' }}>{book.price.toLocaleString()} <span style={{ fontSize:'0.65rem', fontWeight:'400', color:C.muted }}>د.ج</span></span>
        )}
      </div>
    </div>
  </div>
))

// ══ APP ══
function App() {
  const [books,            setBooks]            = useState<Book[]>([])
  const [cart,             setCart]             = useState<CartItem[]>([])
  const [cartOpen,         setCartOpen]         = useState(false)
  const [searchQuery,      setSearchQuery]      = useState('')
  const [searchFocused,    setSearchFocused]    = useState(false)
  const [darkMode,         setDarkMode]         = useState(false)
  const [toast,            setToast]            = useState<string | null>(null)
  const [loading,          setLoading]          = useState(true)
  const [cats,             setCats]             = useState<{name:string,image:string,label:string,desc:string,type:string}[]>([])
  const [sidebarOpen,      setSidebarOpen]      = useState(false)

  const removeFromCartById = (bookId: number, qiasLabel?: string) => {
    setCart(prev => prev.filter(i => !(i.id === bookId && i.qiasLabel === qiasLabel)))
  }

  const heroRef   = useRef<HTMLDivElement>(null)
  const navigate  = useNavigate()
  const location  = useLocation()

  useEffect(() => { fbTrack('PageView') }, [location.pathname])

  const catalogFetchedRef = useRef(false)

  useEffect(() => {
    const needsCatalog = location.pathname === '/' || location.pathname.startsWith('/books')
    if (!needsCatalog || catalogFetchedRef.current) return
    catalogFetchedRef.current = true

    const fetchBooks = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('id', { ascending: true })
        if (error) { console.error('خطأ في تحميل الكتب:', error); setLoading(false); return }
      setBooks((data || []).map((b: any) => ({
        ...b,
        categories: b.categories && b.categories.length ? b.categories : (b.category ? [b.category] : [])
      })))
      setLoading(false)
    }
    fetchBooks()

    const fetchCats = async () => {
      const { data } = await supabase.from('categories').select('*').order('name')
      if (data) setCats(data.map((c: any) => {
        const found = CATS_META.find(m => m.id === c.name)
        return { name: c.name, image: c.image_url || found?.image || 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=200', label: found?.label || c.name, desc: found?.desc || '', type: c.type || 'category' }
      }))
    }
    fetchCats()
  }, [location.pathname])

  const addToCart = (book: Book, opts?: { price?: number; qiasLabel?: string }) => {
    const price = opts?.price ?? book.price
    const qiasLabel = opts?.qiasLabel
    const title = qiasLabel ? `${book.title} (${qiasLabel})` : book.title

    setCart(prev => {
      const ex = prev.find(i => i.id === book.id && i.qiasLabel === qiasLabel)
      if (ex) return prev.map(i => (i.id === book.id && i.qiasLabel === qiasLabel) ? {...i, qty:i.qty+1} : i)
      return [...prev, { id:book.id, title, author:book.author, price, image_url:book.image_url, qty:1, qiasLabel, free_delivery: book.free_delivery }] // ← ajout ici
    })
    showToast(`تمت إضافة "${title}" ✓`)
    fbTrack('AddToCart', { content_name:title, content_ids:[book.id], content_type:'product', value:price, currency:'DZD' })
}
  const updateQty      = (id:number, qty:number) => setCart(p=>p.map(i=>i.id===id?{...i,qty}:i))
  const removeFromCart = (id:number) => setCart(p=>p.filter(i=>i.id!==id))
  const cartCount      = cart.reduce((s,i)=>s+i.qty,0)
  const buyNow         = (book: Book) => { addToCart(book); setCartOpen(false); navigate('/checkout') }
  const showToast      = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2600) }

  const suggestions = useMemo(() => (
    searchQuery.length >= 1
      ? books.filter(b => b.title.includes(searchQuery) || b.author.includes(searchQuery)).slice(0,5)
      : []
  ), [books, searchQuery])

  const categorySuggestions = useMemo(() => (
    searchQuery.length >= 1
      ? cats.filter(c => c.label.includes(searchQuery) || c.name.includes(searchQuery)).slice(0, 3)
      : []
  ), [cats, searchQuery])

  const scrollHero = (dir:'left'|'right') => {
    if (heroRef.current) heroRef.current.scrollBy({ left:dir==='left'?-280:280, behavior:'smooth' })
  }

  const heroBooks = useMemo(() => books.slice(0, 8), [books])

  const bestsellerBooks = useMemo(() => books.filter(b => b.bestseller).slice(0, 8), [books])

  const catsByType = useMemo(() => ({
    category: cats.filter(c => c.type === 'category'),
    author: cats.filter(c => c.type === 'author'),
    quran: cats.filter(c => c.type === 'quran'),
    publisher: cats.filter(c => c.type === 'publisher'),
  }), [cats])

  const light = { bg:'#FFFFFF', bgCard:'#FFFFFF', text:'#0F1F3D', primary:'#14356B', gold:'#2563EB', goldLight:'#93C5FD', goldDark:'#699bff', muted:'#5B6B82', border:'rgba(114, 151, 232, 0.18)' }
  const dark  = { bg:'#0A1526', bgCard:'#0F2038', text:'#E7F0FF', primary:'#8FC1FF', gold:'#2563EB', goldLight:'#8FC1FF', goldDark:'#2563EB', muted:'#9FB3CE', border:'rgba(37,99,235,0.28)' }
  const C = darkMode ? dark : light

  const currentPath = window.location.pathname
  const activeTab   = currentPath === '/books' ? 'books' : 'home'


  return (
    <div style={{ minHeight:'100vh',width:'100%',backgroundColor:C.bg,color:C.text,direction:'rtl',fontFamily:"'Cairo','Segoe UI',sans-serif",margin:0,padding:0,overflowX:'hidden',position:'relative',transition:'background-color 0.35s,color 0.35s' }}>
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
            return Array.from({ length: 250 }).map((_, i) => (
              <span key={i} style={{
                fontFamily:"'Aref Ruqaa',serif",
                fontWeight:700,
                fontSize:'30px',
                color:'#86beff',
                opacity:0.35,
                whiteSpace:'nowrap',
              }}>
                {catWords[i % catWords.length]}
              </span>
            ))
          })()}
        </div>
      </div>

      <FloatingNav
        darkMode={darkMode} C={C} navigate={navigate} activeTab={activeTab}
        cartCount={cartCount} setCartOpen={setCartOpen}
        setDarkMode={setDarkMode} setSidebarOpen={setSidebarOpen}
      />
      <Sidebar
        sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
        darkMode={darkMode} C={C} navigate={navigate} activeTab={activeTab}
        cartCount={cartCount} setCartOpen={setCartOpen} setDarkMode={setDarkMode}
      />

      {toast && (
        <div style={{ position:'fixed',bottom:'20px',left:'50%',transform:'translateX(-50%)',zIndex:999,background:darkMode?'rgba(15,32,56,0.97)':'rgba(255,255,255,0.97)',border:`1.5px solid ${C.gold}`,borderRadius:'30px',padding:'10px 22px',color:C.primary,fontSize:'0.88rem',fontWeight:'700',boxShadow:`0 8px 30px rgba(74,55,40,0.25)`,display:'flex',alignItems:'center',gap:'8px',whiteSpace:'nowrap',backdropFilter:'blur(10px)',animation:'toastIn 0.3s ease' }}>
          <span style={{ color:C.gold,fontSize:'1rem' }}>✓</span>{toast}
        </div>
      )}

      {cartOpen && (
        <CartDrawer items={cart} darkMode={darkMode} onClose={()=>setCartOpen(false)} onUpdateQty={updateQty} onRemove={removeFromCart} onCheckout={()=>{ setCartOpen(false); navigate('/checkout') }}/>
      )}

      <div style={{ position:'relative',zIndex:1 }}>
        <Routes>
          <Route path="/" element={
            <div style={{ position:'relative',zIndex:1 }}>
              <header style={{ padding:'80px 5% 40px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'40px',minHeight:'500px',position:'relative',flexWrap:'wrap' }}>
                <div style={{ flex:'0 0 42%',maxWidth:'520px',minWidth:'280px',position:'relative',zIndex:2,width:'100%' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px' }}>
                    <div style={{ height:'1px',flex:1,background:`linear-gradient(to left,${C.gold},transparent)` }}/><span style={{ color:C.gold }}>✦</span>
                    <span style={{ color:C.goldDark,fontSize:'0.68rem',letterSpacing:'1.5px' }}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
                    <span style={{ color:C.gold }}>✦</span><div style={{ height:'1px',flex:1,background:`linear-gradient(to right,${C.gold},transparent)` }}/>
                  </div>
                  <h1 style={{ fontSize:'clamp(2rem,8vw,4rem)',fontWeight:'bold',color:C.primary,lineHeight:1.15,marginBottom:'12px' }}>
                    جديد و <span style={{ color:C.goldDark }}>شائع</span>
                  </h1>
                  <p style={{ fontSize:'clamp(0.9rem,3vw,1.15rem)',color:C.muted,lineHeight:1.8,marginBottom:'24px' }}>اكتشف عوالم جديدة من خلال صفحات أفضل الكتب الإسلامية وأكثرها مبيعاً.</p>

                  {/* ── SEARCH ── */}
                  <div style={{ position:'relative' }}>
                    <div style={{ display:'flex',alignItems:'center',background:C.bgCard,padding:'12px 20px',borderRadius:searchFocused&&suggestions.length>0?'20px 20px 0 0':'40px',border:`1.5px solid ${searchFocused?C.gold:C.border}`,boxShadow:searchFocused?`0 0 0 3px rgba(201,168,76,0.15)`:`0 8px 32px rgba(201,168,76,0.12)`,transition:'all 0.25s' }}>
                      <span style={{ color:C.gold,marginLeft:'10px',fontSize:'1rem' }}>🔍</span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                        placeholder="ابحث عن العناوين، المؤلفين..."
                        style={{ border:'none',outline:'none',width:'100%',fontSize:'16px',background:'transparent',color:C.text,fontFamily:'inherit' }}
                      />
                      {searchQuery && <button onClick={() => setSearchQuery('')} style={{ background:'none',border:'none',cursor:'pointer',color:C.muted,fontSize:'1rem',padding:'0 4px',flexShrink:0 }}>✕</button>}
                    </div>
                    {searchFocused && searchQuery.length >= 1 && (
                      <div style={{ position:'absolute',top:'100%',left:0,right:0,background:C.bgCard,border:`1.5px solid ${C.gold}`,borderTop:'none',borderRadius:'0 0 20px 20px',boxShadow:`0 12px 32px rgba(74,55,40,0.2)`,zIndex:50,overflow:'hidden' }}>
                        {categorySuggestions.length === 0 && suggestions.length === 0 ? (
                          <div style={{ padding:'16px',textAlign:'center',color:C.muted,fontSize:'0.85rem' }}>لا توجد نتائج</div>
                        ) : (
                          <>
                            {categorySuggestions.map(cat=>(
                              <div key={cat.name} onClick={()=>{navigate(`/books?category=${encodeURIComponent(cat.name)}`);setSearchQuery('');setSearchFocused(false);}}
                                style={{ display:'flex',alignItems:'center',gap:'12px',padding:'10px 16px',cursor:'pointer',borderBottom:`1px solid ${C.border}`,background:darkMode?'rgba(201,168,76,0.06)':'rgba(201,168,76,0.05)' }}
                                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=darkMode?'rgba(255,255,255,0.1)':'rgba(201,168,76,0.15)'}
                                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=darkMode?'rgba(201,168,76,0.06)':'rgba(201,168,76,0.05)'}>
                                <div style={{ width:'38px',height:'38px',borderRadius:'50%',overflow:'hidden',flexShrink:0,border:`1px solid ${C.border}` }}>
                                  <img src={optimizeImg(cat.image, 100)} loading="lazy" alt={cat.label} style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
                                </div>
                                <div style={{ flex:1,minWidth:0 }}>
                                  <p style={{ fontSize:'0.85rem',fontWeight:'700',color:C.primary,margin:0 }}>{cat.label}</p>
                                  <p style={{ fontSize:'0.68rem',color:C.goldDark,margin:'2px 0 0' }}>تصنيف</p>
                                </div>
                                <span style={{ color:C.gold,fontSize:'1rem' }}>›</span>
                              </div>
                            ))}
                            {suggestions.map(book=>(
                              <div key={book.id} onClick={()=>{navigate(`/book/${book.id}`);setSearchQuery('');setSearchFocused(false);}}
                                style={{ display:'flex',alignItems:'center',gap:'12px',padding:'10px 16px',cursor:'pointer',borderBottom:`1px solid ${C.border}` }}
                                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=darkMode?'rgba(255,255,255,0.06)':'rgba(201,168,76,0.08)'}
                                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
                                <img src={optimizeImg(book.image_url, 300)} loading="lazy" alt={book.title} style={{ width:'38px',height:'50px',objectFit:'cover',borderRadius:'6px',flexShrink:0 }}/>
                                <div style={{ flex:1,minWidth:0 }}>
                                  <p style={{ fontSize:'0.85rem',fontWeight:'700',color:C.primary,margin:0 }}>{book.title}</p>
                                  <p style={{ fontSize:'0.72rem',color:C.muted,margin:'2px 0 0' }}>{book.author}</p>
                                </div>
                                <span style={{ fontSize:'0.8rem',fontWeight:'700',color:C.goldDark }}>{book.price.toLocaleString()} د.ج</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display:'flex',gap:'24px',marginTop:'28px' }}>
                    {[{v:'500+',l:'كتاب'},{v:'120',l:'مؤلف'},{v:'10k',l:'عميل'}].map((s,i)=>(
                      <div key={i} style={{ textAlign:'center' }}>
                        <div style={{ fontSize:'clamp(1.1rem,4vw,1.6rem)',fontWeight:'bold',color:C.goldDark }}>{s.v}</div>
                        <div style={{ fontSize:'0.72rem',color:C.muted }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hero carousel */}
                <div className="hero-carousel" style={{ flex:1,position:'relative',display:'flex',alignItems:'center',overflow:'hidden',minHeight:'320px',minWidth:'200px' }}>
                  <div style={{ position:'absolute',right:0,top:0,bottom:0,width:'60px',background:`linear-gradient(to left,${C.bg},transparent)`,zIndex:3,pointerEvents:'none' }}/>
                  <div style={{ position:'absolute',left:0,top:0,bottom:0,width:'60px',background:`linear-gradient(to right,${C.bg},transparent)`,zIndex:3,pointerEvents:'none' }}/>
                  <button onClick={()=>scrollHero('right')} style={{ position:'absolute',right:'8px',zIndex:10,background:C.bgCard,border:`1px solid ${C.border}`,width:'38px',height:'38px',borderRadius:'50%',cursor:'pointer',fontSize:'1.1rem',color:C.primary,display:'flex',alignItems:'center',justifyContent:'center' }}>›</button>
                  <button onClick={()=>scrollHero('left')}  style={{ position:'absolute',left:'8px',zIndex:10,background:C.bgCard,border:`1px solid ${C.border}`,width:'38px',height:'38px',borderRadius:'50%',cursor:'pointer',fontSize:'1.1rem',color:C.primary,display:'flex',alignItems:'center',justifyContent:'center' }}>‹</button>
                  <div ref={heroRef} style={{ display:'flex',gap:'16px',overflowX:'auto',scrollbarWidth:'none',padding:'20px 50px' }}>
                    {heroBooks.map((book,idx)=>(
                      <div key={idx} className="hero-item" style={{ minWidth:'150px',cursor:'pointer',flexShrink:0 }}>
                        <div style={{ borderRadius:'14px',overflow:'hidden',boxShadow:`0 12px 32px rgba(74,55,40,0.22)`,border:`2px solid rgba(201,168,76,0.2)` }}>
                          <img src={optimizeImg(book.image_url, 300)} loading="lazy" alt={book.title} style={{ width:'150px',height:'210px',objectFit:'cover',display:'block' }}/>
                        </div>
                        <div style={{ marginTop:'8px',textAlign:'center',background:C.bgCard,borderRadius:'8px',padding:'6px 8px',border:`1px solid ${C.border}` }}>
                          <p style={{ margin:0,fontSize:'0.75rem',color:C.primary,fontWeight:'bold' }}>{book.title}</p>
                          <p style={{ margin:'2px 0 0',fontSize:'0.65rem',color:C.muted }}>{book.author}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </header>

              {/* BESTSELLERS */}
              {bestsellerBooks.length > 0 && (
                <div style={{ padding:'0 4% 40px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'20px' }}>
                    <div style={{ flex:1, height:'1px', background:`linear-gradient(to left,${C.gold},transparent)` }}/>
                    <h2 style={{ color:C.primary, fontSize:'clamp(1.2rem,4vw,1.6rem)', fontWeight:'800', margin:0, whiteSpace:'nowrap' }}>الجديد و الحصري</h2>
                    <div style={{ flex:1, height:'1px', background:`linear-gradient(to right,${C.gold},transparent)` }}/>
                  </div>
                  <div className="bestsellers-grid" style={{ gap:'14px', paddingBottom:'8px' }}>
                    {bestsellerBooks.map(book => <BookCard key={book.id} book={book} C={C} navigate={navigate}/>)}
                  </div>
                </div>
              )}

              <main style={{ padding:'0 4% 100px' }}>
                {catsByType.category.length > 0 && (
                  <>
                    <div style={{ marginBottom:'32px', textAlign:'center' }}>
                      <h2 style={{ fontSize:'clamp(1.4rem,5vw,2rem)', color:C.primary, margin:'0 0 8px' }}>تصفّح حسب التصنيف</h2>
                      <p style={{ color:C.muted, fontSize:'0.88rem' }}>اختر تصنيفاً لعرض الكتب المتعلقة به</p>
                    </div>
                    <div className="cats-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(260px,100%),1fr))', gap:'20px', marginBottom:'48px' }}>
                      {catsByType.category.map(cat => <CatCard key={cat.name} cat={cat} books={books} C={C} darkMode={darkMode} navigate={navigate}/>)}
                    </div>
                  </>
                )}
                {catsByType.author.length > 0 && (
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'24px' }}>
                      <div style={{ flex:1, height:'1px', background:`linear-gradient(to left,${C.gold},transparent)` }}/>
                      <h2 style={{ color:C.primary, fontSize:'clamp(1.2rem,4vw,1.6rem)', fontWeight:'800', margin:0, whiteSpace:'nowrap' }}>✍️ تصفّح حسب المؤلف</h2>
                      <div style={{ flex:1, height:'1px', background:`linear-gradient(to right,${C.gold},transparent)` }}/>
                    </div>
                    <div className="cats-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(260px,100%),1fr))', gap:'20px', marginBottom:'48px' }}>
                      {catsByType.author.map(cat => <CatCard key={cat.name} cat={cat} books={books} C={C} darkMode={darkMode} navigate={navigate}/>)}
                    </div>
                  </>
                )}
                {catsByType.quran.map(cat => {
                  const quranBooks = books.filter(b => b.categories?.includes(cat.name))
                  if (quranBooks.length === 0) return null
                  return (
                    <div key={cat.name} style={{ marginBottom:'48px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'24px' }}>
                        <div style={{ flex:1, height:'1px', background:`linear-gradient(to left,${C.gold},transparent)` }}/>
                        <h2 style={{ color:C.primary, fontSize:'clamp(1.2rem,4vw,1.6rem)', fontWeight:'800', margin:0, whiteSpace:'nowrap' }}>كتب القرآن</h2>
                        <div style={{ flex:1, height:'1px', background:`linear-gradient(to right,${C.gold},transparent)` }}/>
                      </div>
                      <div className="bestsellers-grid" style={{ gap:'14px', paddingBottom:'8px' }}>
                        {quranBooks.map(book => <BookCard key={book.id} book={book} C={C} navigate={navigate}/>)}
                      </div>
                    </div>
                  )
                })}
                {catsByType.publisher.length > 0 && (
                  <>
                    <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'24px' }}>
                      <div style={{ flex:1, height:'1px', background:`linear-gradient(to left,${C.gold},transparent)` }}/>
                      <h2 style={{ color:C.primary, fontSize:'clamp(1.2rem,4vw,1.6rem)', fontWeight:'800', margin:0, whiteSpace:'nowrap' }}>🏛️ تصفّح حسب دار النشر</h2>
                      <div style={{ flex:1, height:'1px', background:`linear-gradient(to right,${C.gold},transparent)` }}/>
                    </div>
                    <div className="cats-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(260px,100%),1fr))', gap:'20px', marginBottom:'48px' }}>
                      {catsByType.publisher.map(cat => <CatCard key={cat.name} cat={cat} books={books} C={C} darkMode={darkMode} navigate={navigate}/>)}
                    </div>
                  </>
                )}
                <div style={{ textAlign:'center', marginTop:'40px' }}>
                  <button onClick={() => { navigate('/books'); }} style={{ background:`linear-gradient(135deg,${darkMode?'#2C1810':'#4A3728'},${C.goldDark})`, color:'#FFF8E7', border:'none', padding:'13px 32px', borderRadius:'24px', cursor:'pointer', fontWeight:'700', fontSize:'0.95rem', fontFamily:'inherit', boxShadow:`0 6px 20px rgba(74,55,40,0.3)`, display:'inline-flex', alignItems:'center', gap:'8px' }}>
                    <span>📚</span><span>عرض جميع الكتب</span>
                  </button>
                </div>
              </main>

              <footer style={{ background:darkMode?'#0D0A04':'#002f76',padding:'32px 5% 80px',color:C.goldLight,borderTop:`3px solid ${C.gold}`,position:'relative',overflow:'hidden',transition:'background 0.35s' }}>
                <div style={{ position:'relative',zIndex:1,textAlign:'center' }}>
                  <p style={{ fontSize:'0.95rem',opacity:0.9,fontStyle:'italic',margin:'0 0 16px' }}>وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا</p>
                  <div style={{ borderTop:`1px solid rgba(201,168,76,0.25)`,paddingTop:'14px',display:'flex',justifyContent:'center',flexWrap:'wrap',gap:'16px' }}>
                    {['من نحن','تواصل معنا','سياسة الخصوصية'].map(l=>(
                      <span key={l} style={{ opacity:0.7,fontSize:'0.8rem',cursor:'pointer' }}>{l}</span>
                    ))}
                  </div>
                  <div style={{ opacity:0.5,fontSize:'0.72rem',marginTop:'10px' }}>© 2026 مكتبة القدس</div>
                </div>
              </footer>
            </div>
          }/>
          <Route path="/books" element={<BooksPage books={books} darkMode={darkMode} onAddToCart={addToCart} onBuyNow={buyNow} />}/>
          <Route path="/book/:id" element={
            <BookDetailPage books={books} darkMode={darkMode} onAddToCart={addToCart} cart={cart} onOrderPlaced={removeFromCartById}/>
          }/>
          <Route path="/checkout" element={<CheckoutPage items={cart} darkMode={darkMode} onBack={() => navigate(-1)} onConfirm={() => { setCart([]); navigate('/') }}/>}/>
        </Routes>
        <Analytics />
      </div>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;font-family:'Cairo',sans-serif;}
        body{overflow-x:hidden;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.4);border-radius:4px;}
        input::placeholder{color:#8C7B6B;font-family:'Cairo',sans-serif;}
        @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(12px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @media(min-width:640px){ .hero-carousel{display:flex!important;} }
        @media(max-width:639px){
          header{flex-direction:column;padding:76px 4% 32px!important;min-height:auto!important;}
          .cat-img-wrapper{width:100px!important;height:100px!important;margin:0 auto 12px!important;}
          .cat-card{padding:14px 10px!important;}
          .cats-grid{grid-template-columns:repeat(2,1fr)!important;}
          .hero-carousel{display:none!important;}
          .modal-content{flex-direction:column!important;}
          .modal-cover{flex:none!important;border-radius:24px 24px 0 0!important;}
          .modal-cover img{min-height:200px!important;max-height:240px!important;}
          .app-book-card { transition: transform 0.2s; }
          .app-book-card:hover { transform: translateY(-4px); }
          .cat-card { transition: transform 0.25s, box-shadow 0.25s; }
          .cat-card:hover { transform: translateY(-6px); box-shadow: 0 16px 40px rgba(74,55,40,0.18); }
          .hero-item { transition: transform 0.3s; }
          .hero-item:hover { transform: translateY(-8px) scale(1.03); }
        }
          .cats-grid, .bestsellers-grid {
            content-visibility: auto;
            contain-intrinsic-size: 1px 600px;
          }
        .bestsellers-grid{display:grid!important;grid-template-columns:repeat(6,1fr)!important;overflow-x:visible!important;}
        @media(max-width:639px){
          .bestsellers-grid{display:flex!important;overflow-x:auto!important;scroll-snap-type:x mandatory;}
          .bestsellers-grid>div{scroll-snap-align:start;min-width:150px!important;}
        }
      `}</style>
      
    </div>
  )
}
export default App
