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
  catsByType: { category: any[]; author: any[]; quran: any[]; publisher: any[] };
}

// Fonction utilitaire à ajouter en haut de chaque fichier
const optimizeImg = (url: string, _width = 400) => url

const useDesktopCols = () => {
  const get = () => {
    const w = window.innerWidth
    if (w <= 900) return 0
    if (w >= 1700) return 7
    if (w >= 1400) return 6
    if (w >= 1150) return 5
    return 4
  }
  const [cols, setCols] = useState(get)
  useEffect(() => {
    const h = () => setCols(get())
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return cols
}

const MOBILE_PROMO_LIMIT = 6   // 3 colonnes × 2 rangées

const Sidebar = ({ sidebarOpen, setSidebarOpen, darkMode, C, navigate, activeTab, cartCount, setCartOpen, setDarkMode, catsByType }: SidebarProps) => (
  <>
    <div onClick={() => setSidebarOpen(false)} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', opacity: sidebarOpen ? 1 : 0, pointerEvents: sidebarOpen ? 'all' : 'none', transition:'opacity 0.3s' }}/>
    <div style={{ position:'fixed', top:0, right:0, bottom:0, zIndex:500, width:'75vw', maxWidth:'300px', background: darkMode ? '#0F2038' : '#FFFFFF', borderLeft:`2px solid ${C.gold}`, transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)', transition:'transform 0.35s cubic-bezier(0.34,1.1,0.64,1)', display:'flex', flexDirection:'column', boxShadow:'-8px 0 40px rgba(0,0,0,0.3)', direction:'rtl' }}>
      <div style={{ padding:'20px 20px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'44px',height:'44px',borderRadius:'12px',overflow:'hidden',border:`2px solid ${C.gold}` }}>
            <img src={optimizeImg("/elquds.png")} loading="lazy" alt="" style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
          </div>
          <div>
            <div style={{ fontWeight:'800', fontSize:'0.95rem', color:C.primary }}>القدس للكتاب</div>
            <div style={{ fontSize:'0.6rem', color:C.gold, letterSpacing:'1px' }}>elquds/القدس</div>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(false)} style={{ background:'none', border:`1px solid ${C.border}`, color:C.muted, width:'32px', height:'32px', borderRadius:'50%', cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
      </div>
      <div style={{ flex:1, padding:'20px 16px', display:'flex', flexDirection:'column', gap:'8px', overflowY:'auto' }}>
        {[{id:'home',label:'الرئيسية',icon:'🏠',path:'/'},{id:'books',label:'الكتب',icon:'📚',path:'/books'}].map(tab => (
          <button key={tab.id} onClick={() => { navigate(tab.path); setSidebarOpen(false); }} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 16px', borderRadius:'16px', cursor:'pointer', fontFamily:'inherit', fontSize:'1rem', fontWeight:'700', border: activeTab===tab.id ? 'none' : `1px solid ${C.border}`, background: activeTab===tab.id ? `linear-gradient(135deg,${darkMode?'#2C1810':C.primary},${C.goldDark})` : 'transparent', color: activeTab===tab.id ? '#FFF8E7' : C.text, transition:'all 0.2s' }}>
            <span style={{ fontSize:'1.3rem' }}>{tab.icon}</span>
            <span>{tab.label}</span>
            {activeTab===tab.id && <span style={{ marginRight:'auto', fontSize:'0.8rem' }}>●</span>}
          </button>
        ))}

        {[
          { key:'category', label:'🏷️ التصنيفات', list: catsByType?.category || [] },
          { key:'author',   label:'✍️ المؤلفون',   list: catsByType?.author || [] },
          { key:'publisher',label:'🏛️ دور النشر',  list: catsByType?.publisher || [] },
        ].map(group => group.list.length > 0 && (
          <div key={group.key} style={{ marginTop:'12px' }}>
            <p style={{ color:C.muted, fontSize:'0.75rem', fontWeight:'700', margin:'0 0 8px', padding:'0 4px' }}>{group.label}</p>
            <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
              {group.list.map((cat:any) => (
                <button key={cat.name} onClick={() => { navigate(`/books?category=${encodeURIComponent(cat.name)}`); setSidebarOpen(false); }}
                  style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 12px', borderRadius:'12px', cursor:'pointer', fontFamily:'inherit', fontSize:'0.85rem', fontWeight:'600', border:`1px solid ${C.border}`, background:'transparent', color:C.text, textAlign:'right' }}>
                  <div style={{ width:'24px', height:'24px', borderRadius:'50%', overflow:'hidden', flexShrink:0, border:`1px solid ${C.border}` }}>
                    <img src={optimizeImg(cat.image, 100)} loading="lazy" alt={cat.label} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  </div>
                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
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
  catsByType: { category: any[]; author: any[]; quran: any[]; publisher: any[] };
}
const FloatingNav = ({ darkMode, C, navigate, activeTab, cartCount, setCartOpen, setDarkMode, setSidebarOpen, catsByType }: FloatingNavProps) => (
  <>
    <style>{`
      .fn-mobile { display: none !important; }
      .logo-spin-3d {
        animation: spin3d 5s linear infinite;
        transform-style: preserve-3d;
      }
      @keyframes spin3d {
        from { transform: rotateY(0deg); }
        to   { transform: rotateY(360deg); }
      }
      .mobile-topbar { overflow: visible; }

.topbar-glow {
  position:absolute; left:8%; right:8%; bottom:0; height:2px;
  background: linear-gradient(90deg, transparent, #2563EB, #8FC1FF, #2563EB, transparent);
  background-size: 200% 100%;
  animation: glowMove 3s linear infinite;
  border-radius:2px;
}
@keyframes glowMove {
  from { background-position: 0% 0; }
  to   { background-position: 200% 0; }
}

.logo-ring {
  position: relative;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  filter: drop-shadow(0 0 8px rgba(37,99,235,0.55));
}
  .logo-ring-desktop {
  width: 96px;
  height: 96px;
}

/* Anneau lumineux qui tourne */
.logo-ring::before {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    transparent 0%,
    #2563EB 25%,
    #8FC1FF 50%,
    #2563EB 75%,
    transparent 100%
  );
  animation: ringSpin 2.6s linear infinite;
}

@keyframes ringSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* Disque qui masque le carré blanc du PNG */
.logo-ring-inner {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  perspective: 600px;
}

.topbar-btn { transition: transform 0.15s; }
.topbar-btn:active { transform: scale(0.92); }

.cart-badge-pulse { animation: badgePop 1.6s ease-in-out infinite; }
@keyframes badgePop {
  0%,100% { transform: scale(1); }
  50%     { transform: scale(1.15); }
}
      @media(max-width:640px) {
        .fn-desktop { display: none !important; }
        .fn-mobile  { display: flex !important; }
      }
    `}</style>
    {/* DESKTOP */}
    <div className="fn-desktop" style={{ position:'fixed', top:'10px', right:'16px', zIndex:200 }}>
      <div onClick={()=>navigate('/')} style={{ cursor:'pointer' }}>
        <div className="logo-ring logo-ring-desktop">
          <div className="logo-ring-inner" style={{ background: darkMode ? '#0F2038' : '#FFFFFF' }}>
            <img
              src={optimizeImg(darkMode ? "/elquds3d2-dark.png" : "/elquds3d2-transparent.png")}
              alt="القدس للكتاب"
              style={{ width:'100%', height:'100%', objectFit:'contain', padding:'8px' }}
            />
          </div>
        </div>
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
<div className="fn-mobile mobile-topbar" style={{
  position:'fixed', top:0, left:0, right:0, zIndex:200,
  height:'84px',
  background: darkMode
    ? 'linear-gradient(180deg, rgba(10,21,38,0.97) 0%, rgba(15,32,56,0.92) 100%)'
    : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(216,229,253,0.92) 100%)',
  backdropFilter:'blur(14px)',
  WebkitBackdropFilter:'blur(14px)',
  display:'flex', alignItems:'center', justifyContent:'space-between',
  padding:'0 14px',
  boxShadow: darkMode
    ? '0 6px 24px rgba(0,0,0,0.45)'
    : '0 6px 24px rgba(37,99,235,0.18)',
  borderBottomLeftRadius:'26px',
  borderBottomRightRadius:'26px',
}}>
  {/* Ligne lumineuse animée en bas */}
  <div className="topbar-glow" />

  {/* Panier (gauche) */}
  <div style={{ display:'flex', alignItems:'center', width:'56px' }}>
    <button onClick={()=>setCartOpen(true)} className="topbar-btn" style={{
      position:'relative', width:'42px', height:'42px', borderRadius:'14px',
      border:`1px solid ${C.border}`,
      background: darkMode ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.9)',
      boxShadow:'0 4px 12px rgba(37,99,235,0.18)',
      cursor:'pointer', fontSize:'1.15rem',
      display:'flex', alignItems:'center', justifyContent:'center', color:C.text
    }}>
      🛒
      {cartCount>0 && (
        <span className="cart-badge-pulse" style={{ position:'absolute', top:'-6px', right:'-6px', background:'linear-gradient(135deg,#ff5f6d,#e74c3c)', color:'#fff', borderRadius:'50%', width:'20px', height:'20px', fontSize:'0.62rem', fontWeight:'800', display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #fff' }}>{cartCount}</span>
      )}
    </button>
  </div>

  {/* Logo au milieu : cercle + anneau lumineux */}
  <div onClick={()=>navigate('/')} style={{ display:'flex', justifyContent:'center', alignItems:'center', cursor:'pointer', flex:1 }}>
    <div className="logo-ring">
      <div className="logo-ring-inner" style={{ background: darkMode ? '#0F2038' : '#FFFFFF' }}>
        <img
          src={optimizeImg(darkMode ? "/elquds3d2-dark.png" : "/elquds3d2-transparent.png")}
          loading="lazy"
          alt="القدس للكتاب"
          style={{ width:'100%', height:'100%', objectFit:'contain', padding:'6px' }}
        />
      </div>
    </div>
  </div>

  {/* Menu (droite) */}
  <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', width:'56px' }}>
    <button onClick={()=>setSidebarOpen(true)} className="topbar-btn" style={{
      width:'42px', height:'42px', borderRadius:'14px', border:'none',
      background:`linear-gradient(135deg,${C.gold},#5B9BFF)`,
      boxShadow:'0 6px 16px rgba(37,99,235,0.4)',
      cursor:'pointer', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', gap:'5px', padding:'10px'
    }}>
      <span style={{ display:'block', width:'20px', height:'2.5px', background:'#fff', borderRadius:'2px' }}/>
      <span style={{ display:'block', width:'14px', height:'2.5px', background:'#fff', borderRadius:'2px', alignSelf:'flex-end' }}/>
      <span style={{ display:'block', width:'20px', height:'2.5px', background:'#fff', borderRadius:'2px' }}/>
    </button>
  </div>
</div>
    <Sidebar sidebarOpen={false} setSidebarOpen={()=>{}} darkMode={darkMode} C={C} navigate={navigate} activeTab={activeTab} cartCount={cartCount} setCartOpen={setCartOpen} setDarkMode={setDarkMode} catsByType={catsByType}/>
  </>
)
interface CatCardProps {
  cat: {name:string;image:string;label:string;desc:string;type:string};
  books: Book[]; C: any; darkMode: boolean;
  navigate: any;
}
const CatCard = memo(({ cat, books, C, darkMode, navigate }: CatCardProps) => {
  const count = books.filter(b => b.categories?.includes(cat.name)).length
  return (
    <div
      onClick={() => navigate(`/books?category=${encodeURIComponent(cat.name)}`)}
      className="cat-card"
      style={{
        background: C.bgCard,
        borderRadius: '12px',
        border: `1px solid ${C.border}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        padding: '8px 10px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '160px',
        height: '56px',
        boxSizing: 'border-box',
      }}
    >
      <div className="cat-card-img" style={{ width:'36px', height:'36px', borderRadius:'50%', border:`2px solid ${C.gold}`, flexShrink:0, overflow:'hidden' }}>
        <img src={optimizeImg(cat.image, 100)} loading="lazy" alt={cat.label} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
      </div>
      <div className="cat-card-body" style={{ flex:1, minWidth:0 }}>
        <div className="cat-card-title" style={{ color:C.primary, fontSize:'0.78rem', fontWeight:'700', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {cat.label}
        </div>
        <div className="cat-card-footer" style={{ color:C.muted, fontSize:'0.65rem', marginTop:'2px', display:'flex', alignItems:'center' }}>
          <span className="cat-card-arrow" style={{ display:'none' }}>←</span>
          <span className="cat-card-count">{count > 0 ? `${count} كتاب` : 'قريباً'}</span>
        </div>
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

const CollectionPage = ({ title, books, C, navigate }: { title: string; books: Book[]; C: any; navigate: any }) => (
  <div style={{ padding:'110px 4% 100px' }}>
    <button onClick={() => navigate('/')} style={{ background:'none', border:`1px solid ${C.border}`, color:C.primary, padding:'8px 16px', borderRadius:'20px', cursor:'pointer', fontFamily:'inherit', fontWeight:700, marginBottom:'16px' }}>
      → الرئيسية
    </button>
    <h1 style={{ color:C.primary, fontSize:'clamp(1.3rem,4vw,1.8rem)', fontWeight:800, textAlign:'center', marginBottom:'24px' }}>{title}</h1>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'14px' }}>
      {books.map(book => <BookCard key={book.id} book={book} C={C} navigate={navigate}/>)}
    </div>
  </div>
)
const makeStarTile = (color: string) => `
<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'
     fill='none' stroke='${color}' stroke-width='1' stroke-linejoin='round'>
  <polygon points='50,16 56.5,36.5 76.6,28.8 64.6,46.7 83.2,57.6 61.7,59.4 64.8,80.6 50,65 35.3,80.6 38.3,59.4 16.9,57.6 35.4,46.7 23.4,28.8 43.5,36.5'/>
</svg>`

const IslamicBg = ({ darkMode }: { darkMode: boolean }) => {
  const svg = makeStarTile(darkMode ? '#2563EB' : '#7FA8F0')
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
      backgroundImage:`url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
      backgroundSize:'100px 100px',
      backgroundRepeat:'repeat',
      opacity: darkMode ? 0.25 : 0.45,
    }}/>
  )
}
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
  const [bannerImages, setBannerImages] = useState<string[]>([])
  const [bannerImagesMobile, setBannerImagesMobile] = useState<string[]>([])
  const [activeBannerIndex, setActiveBannerIndex] = useState(0)
  const [activeBannerIndexMobile, setActiveBannerIndexMobile] = useState(0)
  const [sidebarOpen,      setSidebarOpen]      = useState(false)
  const [showAllBestsellers, setShowAllBestsellers] = useState(false)
  const [showAllPromotions,  setShowAllPromotions]  = useState(false)
  const bannerVisible   = Math.min(3, bannerImages.length)
  const bannerPositions = Math.max(1, bannerImages.length - bannerVisible + 1)


  const removeFromCartById = (bookId: number, qiasLabel?: string) => {
    setCart(prev => prev.filter(i => !(i.id === bookId && i.qiasLabel === qiasLabel)))
  }

  const heroRef   = useRef<HTMLDivElement>(null)
  const navigate  = useNavigate()
  const location  = useLocation()
  const cols = useDesktopCols()


  useEffect(() => { fbTrack('PageView') }, [location.pathname])

  useEffect(() => {
    if (bannerPositions <= 1) return
    const interval = setInterval(() => {
      setActiveBannerIndex(prev => (prev + 1) % bannerPositions)
    }, 4000)
    return () => clearInterval(interval)
  }, [bannerPositions, activeBannerIndex])

  useEffect(() => {
    if (bannerImagesMobile.length <= 1) return
    const interval = setInterval(() => {
      setActiveBannerIndexMobile(prev => (prev + 1) % bannerImagesMobile.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [bannerImagesMobile.length, activeBannerIndexMobile])

  const catalogFetchedRef = useRef(false)
const swipeStartX = useRef<number | null>(null)
const didDrag = useRef(false)

const makeSwipe = (len: number, setIndex: (fn: (i: number) => number) => void) => {
  const start = (x: number) => { swipeStartX.current = x; didDrag.current = false }
  const end = (x: number) => {
    if (swipeStartX.current === null) return
    const dx = x - swipeStartX.current
    swipeStartX.current = null
    if (Math.abs(dx) < 40) return
    didDrag.current = true
    setIndex(i => dx > 0 ? (i + 1) % len : (i - 1 + len) % len)
  }
  return {
    // téléphone
    onTouchStart: (e: React.TouchEvent) => start(e.touches[0].clientX),
    onTouchEnd:   (e: React.TouchEvent) => end(e.changedTouches[0].clientX),
    // PC (glisser avec la souris)
    onMouseDown:  (e: React.MouseEvent) => { e.preventDefault(); start(e.clientX) },
    onMouseUp:    (e: React.MouseEvent) => end(e.clientX),
    onMouseLeave: (e: React.MouseEvent) => end(e.clientX),
  }
}

  useEffect(() => {
    const needsCatalog = location.pathname === '/' || location.pathname.startsWith('/books')
      || location.pathname === '/promotions' || location.pathname === '/new'
    if (!needsCatalog || catalogFetchedRef.current) return
    catalogFetchedRef.current = true

    const fetchBanner = async () => {
      const { data } = await supabase.from('site_banner').select('images, images_mobile').eq('id', 1).single()
      setBannerImages(data?.images || [])
      setBannerImagesMobile(data?.images_mobile?.length ? data.images_mobile : (data?.images || []))
    }
    fetchBanner()



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

  const bestsellerBooks = useMemo(() => books.filter(b => b.bestseller), [books])
  const promotionBooks = useMemo(() => 
    books.filter(b => b.promotion && b.promotion > 0 && b.promotion < b.price), 
  [books])

  const bestsellerShown = cols ? bestsellerBooks.slice(0, cols) : bestsellerBooks
  const promotionShown  = cols ? promotionBooks.slice(0, cols)  : promotionBooks.slice(0, MOBILE_PROMO_LIMIT)
  const promoHasMore    = cols
    ? promotionBooks.length > cols
    : promotionBooks.length > MOBILE_PROMO_LIMIT

  const catsByType = useMemo(() => ({
    category: cats.filter(c => c.type === 'category'),
    author: cats.filter(c => c.type === 'author'),
    quran: cats.filter(c => c.type === 'quran'),
    publisher: cats.filter(c => c.type === 'publisher'),
  }), [cats])

  const light = { bg:'#FFFFFF', bgCard:'#d8e5fd', text:'#0F1F3D', primary:'#14356B', gold:'#2563EB', goldLight:'#0f69cf', goldDark:'#699bff', muted:'#5B6B82', border:'rgba(114, 151, 232, 0.28)' }
  const dark  = { bg:'#0A1526', bgCard:'#003785', text:'#E7F0FF', primary:'#8FC1FF', gold:'#2563EB', goldLight:'#8FC1FF', goldDark:'#2563EB', muted:'#9FB3CE', border:'rgba(37,99,235,0.28)' }
  const C = darkMode ? dark : light

  const currentPath = window.location.pathname
  const activeTab   = currentPath === '/books' ? 'books' : 'home'


  return (
    <div style={{ minHeight:'100vh',width:'100%',backgroundColor:C.bg,color:C.text,direction:'rtl',fontFamily:"'Cairo','Segoe UI',sans-serif",margin:0,padding:0,overflowX:'hidden',position:'relative',transition:'background-color 0.35s,color 0.35s' }}>
      <IslamicBg darkMode={darkMode} />
      <FloatingNav
        darkMode={darkMode} C={C} navigate={navigate} activeTab={activeTab}
        cartCount={cartCount} setCartOpen={setCartOpen}
        setDarkMode={setDarkMode} setSidebarOpen={setSidebarOpen} catsByType={catsByType}
      />
      <Sidebar
        sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
        darkMode={darkMode} C={C} navigate={navigate} activeTab={activeTab}
        cartCount={cartCount} setCartOpen={setCartOpen} setDarkMode={setDarkMode}
        catsByType={catsByType}
      />

      {toast && (
        <div style={{ position:'fixed',bottom:'20px',left:'50%',transform:'translateX(-50%)',zIndex:999,background:darkMode?'rgba(15,32,56,0.97)':'rgba(255,255,255,0.97)',border:`1.5px solid ${C.gold}`,borderRadius:'30px',padding:'10px 22px',color:C.primary,fontSize:'0.88rem',fontWeight:'700',boxShadow:`0 8px 30px rgba(74,55,40,0.25)`,display:'flex',alignItems:'center',gap:'8px',whiteSpace:'nowrap',backdropFilter:'blur(10px)',animation:'toastIn 0.3s ease' }}>
          <span style={{ color:C.gold,fontSize:'1rem' }}>✓</span>{toast}
        </div>
      )}

      {cartOpen && (
        <CartDrawer items={cart} darkMode={darkMode} onClose={()=>setCartOpen(false)} onUpdateQty={updateQty} onRemove={removeFromCart} onCheckout={()=>{ setCartOpen(false); navigate('/checkout') }}/>
      )}

      <div
        className="site-frame"
        style={{
          position:'relative', zIndex:1,
          ['--frame-bg' as any]: darkMode ? 'rgba(10,21,38,0.35)' : 'rgba(255,255,255,0.35)',
          ['--frame-border' as any]: C.border,
        }}
      >
        <Routes>
          <Route path="/" element={
            <div style={{ position:'relative',zIndex:1 }}>
              <div className="home-hero-grid">
                <header style={{ padding:'80px 5% 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'40px',minHeight:'auto',position:'relative',flexWrap:'wrap' }}>
                  {/* ── BRAND (PC seulement) ── */}
                  <div className="hero-brand">
                    <img
                      src={optimizeImg(darkMode ? "/elquds3d2-dark.png" : "/elquds3d2-transparent.png")}
                      alt="القدس للكتاب"
                      className="hero-brand-logo"
                    />
                    <div className="hero-brand-text">
                      <h1 className="hero-brand-name">مكتبة القدس للكتاب</h1>
                      <p className="hero-brand-sub">
                        <span>✦</span> كتب إسلامية أصيلة · توصيل إلى 58 ولاية <span>✦</span>
                      </p>
                    </div>
                  </div>
                  <div style={{ flex:'1 1 100%',maxWidth:'100%',minWidth:'280px',position:'relative',zIndex:2,width:'100%' }}>
                    <div className="hero-bismillah" style={{ display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px' ,marginTop:'80px' }}>
                        <div style={{ height:'1px',flex:1,background:`linear-gradient(to left,${C.gold},transparent)` }}/><span style={{ color:C.gold }}>✦</span>
                        <span style={{ color:C.goldDark,fontSize:'0.68rem',letterSpacing:'1.5px' }}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
                        <span style={{ color:C.gold }}>✦</span><div style={{ height:'1px',flex:1,background:`linear-gradient(to right,${C.gold},transparent)` }}/>
                    </div>
                    <div className="hero-bismillah" style={{ display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px' }}></div>
                    <h1 className="hero-title" style={{ fontSize:'clamp(2rem,8vw,4rem)',fontWeight:'bold',color:C.primary,lineHeight:1.15,marginBottom:'12px' }}>
                      جديد و <span style={{ color:C.goldDark }}>شائع</span>
                    </h1>
                    <p className="hero-desc" style={{ fontSize:'clamp(0.9rem,3vw,1.15rem)',color:C.muted,lineHeight:1.8,marginBottom:'24px' }}>اكتشف عوالم جديدة من خلال صفحات أفضل الكتب الإسلامية وأكثرها مبيعاً.</p>
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
                  </div>
                </header>

                <div className="home-sections">
                  <div className="home-section home-section-categories">
                    <div className="cats-groups-wrap" style={{ marginTop:'16px' }}>
                      {catsByType.category.length > 0 && (
                          <div className="cats-group">
                            <h3 className="cats-group-title" style={{ color:C.primary, fontSize:'0.85rem', fontWeight:'700', margin:'0 0 8px' }}>🏷️ تصفّح حسب التصنيف</h3>                        <div className="cats-hscroll">
                            {catsByType.category.map(cat => <CatCard key={cat.name} cat={cat} books={books} C={C} darkMode={darkMode} navigate={navigate}/>)}
                          </div>
                        </div>
                      )}
                    {catsByType.author.length > 0 && (
                      <div className="cats-group">
                          <h3 className="cats-group-title" style={{ color:C.primary, fontSize:'0.85rem', fontWeight:'700', margin:'0 0 8px' }}>✍️ تصفّح حسب المؤلف</h3>                        <div className="cats-hscroll">
                          {catsByType.author.map(cat => <CatCard key={cat.name} cat={cat} books={books} C={C} darkMode={darkMode} navigate={navigate}/>)}
                        </div>
                      </div>
                    )}
                    {catsByType.publisher.length > 0 && (
                      <div className="cats-group">
<h3 className="cats-group-title" style={{ color:C.primary, fontSize:'0.85rem', fontWeight:'700', margin:'0 0 8px' }}>🏛️ تصفّح حسب دار النشر</h3>                        <div className="cats-hscroll">
                          {catsByType.publisher.map(cat => <CatCard key={cat.name} cat={cat} books={books} C={C} darkMode={darkMode} navigate={navigate}/>)}
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                </div>

              {bannerImages.length > 0 && (
                <div className="home-section home-section-banner banner-desktop-only" style={{ position:'relative' }}>
                  {bannerPositions > 1 && (
                    <>
                      <button
                        onClick={() => setActiveBannerIndex(i => (i - 1 + bannerPositions) % bannerPositions)}
                        style={{ position:'absolute', top:'140px', right:'10px', width:'40px', height:'40px', borderRadius:'50%', border:'none', background:'rgba(255,255,255,0.85)', color:C.primary, fontSize:'1.4rem', cursor:'pointer', boxShadow:'0 4px 12px rgba(0,0,0,0.2)', zIndex:5 }}>‹</button>
                      <button
                        onClick={() => setActiveBannerIndex(i => (i + 1) % bannerPositions)}
                        style={{ position:'absolute', top:'140px', left:'10px', width:'40px', height:'40px', borderRadius:'50%', border:'none', background:'rgba(255,255,255,0.85)', color:C.primary, fontSize:'1.4rem', cursor:'pointer', boxShadow:'0 4px 12px rgba(0,0,0,0.2)', zIndex:5 }}>›</button>
                    </>
                  )}
                  <div
                    className="highlights-banner-scroll"
                    style={{ position:'relative', overflow:'hidden', width:'100%', touchAction:'pan-y' }}
                    {...makeSwipe(bannerPositions, setActiveBannerIndex)}
                  >
                    <div style={{
                      display:'flex',
                      width: `${bannerImages.length * (100 / bannerVisible)}%`,
                      flexShrink: 0,
                      transform: `translateX(${(activeBannerIndex % bannerPositions) * (100 / bannerImages.length)}%)`,
                      transition:'transform 0.6s ease',
                    }}>
                      {bannerImages.map((url, i) => (
                        <div key={i} style={{ width: `${100 / bannerImages.length}%`, flex:'0 0 auto', padding:'0 6px', boxSizing:'border-box' }}>
                          <div onClick={() => {
                            if (didDrag.current) { didDrag.current = false; return }
                            navigate('/books')
                          }} style={{ position:'relative', height:'320px', borderRadius:'20px', overflow:'hidden', cursor:'pointer', border:`1px solid ${C.border}`, boxShadow:'0 8px 30px rgba(37,99,235,0.15)' }}>
                            <img src={url} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', filter:'blur(20px)', transform:'scale(1.2)', opacity:0.6 }}/>
                            <img src={url} alt="عروض" className="banner-main-img" style={{ position:'relative', width:'100%', height:'100%', objectFit:'contain' }}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {bannerPositions > 1 && (
                    <div style={{ display:'flex', justifyContent:'center', gap:'6px', marginTop:'10px' }}>
                      {Array.from({ length: bannerPositions }).map((_, i) => (
                        <span key={i} onClick={() => setActiveBannerIndex(i)} style={{
                          width: i === (activeBannerIndex % bannerPositions) ? '18px' : '6px',
                          height:'6px', borderRadius:'3px', cursor:'pointer',
                          background: i === (activeBannerIndex % bannerPositions) ? C.gold : C.border,
                          transition:'all 0.25s'
                        }}/>
                      ))}
                    </div>
                  )}
                </div>
              )}

                {bannerImagesMobile.length > 0 && (
                <div className="home-section home-section-banner banner-mobile-only">
                  <div
                    className="highlights-banner-scroll"
                    style={{ position:'relative', overflow:'hidden', width:'100%', touchAction:'pan-y' }}
                    {...makeSwipe(bannerImagesMobile.length, setActiveBannerIndexMobile)}
                  >
                    <div style={{
                      display:'flex',
                      width: `${bannerImagesMobile.length * 100}%`,
                      flexShrink: 0,
                      transform: `translateX(${activeBannerIndexMobile * (100 / bannerImagesMobile.length)}%)`,
                      transition:'transform 0.6s ease',
                    }}>
                      {bannerImagesMobile.map((url, i) => (
                        <div key={i} onClick={() => {
  if (didDrag.current) { didDrag.current = false; return }
  navigate('/books')
}} style={{ width: `${100 / bannerImagesMobile.length}%`, flex:'0 0 auto', position:'relative', height:'320px', borderRadius:'20px', overflow:'hidden', cursor:'pointer', border:`1px solid ${C.border}`, boxShadow:'0 8px 30px rgba(37,99,235,0.15)' }}>
                          <img src={url} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', filter:'blur(20px)', transform:'scale(1.2)', opacity:0.6 }}/>
                          <img src={url} alt="عروض" className="banner-main-img" style={{ position:'relative', width:'100%', height:'100%', objectFit:'contain' }}/>
                        </div>
                      ))}
                    </div>
                  </div>
                  {bannerImagesMobile.length > 1 && (
                    <div style={{ display:'flex', justifyContent:'center', gap:'6px', marginTop:'10px' }}>
                      {bannerImagesMobile.map((_, i) => (
                        <span key={i} onClick={() => setActiveBannerIndexMobile(i)} style={{
                          width: i === activeBannerIndexMobile ? '18px' : '6px',
                          height:'6px', borderRadius:'3px', cursor:'pointer',
                          background: i === activeBannerIndexMobile ? C.gold : C.border,
                          transition:'all 0.25s'
                        }}/>
                      ))}
                    </div>
                  )}
                </div>
              )}

                {bestsellerBooks.length > 0 && (
                  <div className="home-section home-section-bestsellers">
                    <h2 style={{ color:C.primary, fontSize:'clamp(1.1rem,3vw,1.4rem)', fontWeight:'800', marginBottom:'14px', textAlign:'center' }}>الجديد والحصري</h2>
                    <div className="highlights-col-scroll row-one" style={{ ['--cols' as any]: cols }}>
                      {bestsellerShown.map(book => <BookCard key={book.id} book={book} C={C} navigate={navigate}/>)}
                    </div>
                    {cols > 0 && bestsellerBooks.length > cols && (
                      <div style={{ textAlign:'center', marginTop:'18px' }}>
                        <button className="see-all-btn" onClick={() => navigate('/new')}>عرض كل الجديد والحصري ←</button>
                      </div>
                    )}
                  </div>
                )}

                {promotionBooks.length > 0 && (
                  <div className="home-section home-section-promotions">
                    <h2 style={{ color:C.primary, fontSize:'clamp(1.1rem,3vw,1.4rem)', fontWeight:'800', marginBottom:'14px', textAlign:'center' }}>🔥 عروض وتخفيضات</h2>
                    <div className="highlights-col row-one" style={{ ['--cols' as any]: cols }}>
                      {promotionShown.map(book => <BookCard key={book.id} book={book} C={C} navigate={navigate}/>)}
                    </div>
                    {promoHasMore && (
                      <div style={{ textAlign:'center', marginTop:'18px' }}>
                        <button className="see-all-btn" onClick={() => navigate('/promotions')}>عرض كل العروض والتخفيضات ←</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Extension pleine largeur : reste des réductions */}
              {promotionBooks.length > 4 && (
                <div className="extra-books extra-books-promotions" style={{ padding:'0 4% 40px', display: showAllPromotions ? 'block' : 'none' }}>
                  <div className="extra-books-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'14px' }}>
                    {promotionBooks.slice(6).map(book => <BookCard key={book.id} book={book} C={C} navigate={navigate}/>)}
                  </div>
                </div>
              )}

              <main style={{ padding:'0 4% 100px' }}>
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
                <div style={{ textAlign:'center', marginTop:'40px' }}>
                  <button onClick={() => { navigate('/books'); }} style={{ background:`linear-gradient(135deg,${darkMode?'#2C1810':'#4A3728'},${C.goldDark})`, color:'#FFF8E7', border:'none', padding:'13px 32px', borderRadius:'24px', cursor:'pointer', fontWeight:'700', fontSize:'0.95rem', fontFamily:'inherit', boxShadow:`0 6px 20px rgba(74,55,40,0.3)`, display:'inline-flex', alignItems:'center', gap:'8px' }}>
                    <span>📚</span><span>عرض جميع الكتب</span>
                  </button>
                </div>
              </main>

              <footer style={{ background:darkMode?'#0D0A04':'#002f76',padding:'32px 5% 80px',color:C.goldLight,borderTop:`3px solid ${C.gold}`,position:'relative',overflow:'hidden',transition:'background 0.35s' }}>
                <div style={{ position:'relative',zIndex:1,textAlign:'center' }}>
                  <p style={{ fontSize:'0.95rem',opacity:0.9,fontStyle:'italic',margin:'0 0 16px' }}>وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا</p>

                  <p style={{ fontSize:'0.85rem', opacity:0.85, margin:'0 0 14px', fontWeight:600 }}>
                    تواصلوا معنا عبر صفحتنا على فيسبوك وقناتنا على تيليجرام لتبقوا على اطلاع دائم بجديدنا 
                  </p>

                  {/* Réseaux sociaux */}
                  <div style={{ display:'flex', justifyContent:'center', gap:'14px', marginBottom:'20px' }}>
                    <a href="https://www.facebook.com/share/19veoXHdB4/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer"
                      style={{ width:'42px', height:'42px', borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none', transition:'transform 0.2s, background 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#1877F2'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFF8E7"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>
                    </a>
                    <a href="https://t.me/elqudslilkitab1" target="_blank" rel="noopener noreferrer"
                      style={{ width:'42px', height:'42px', borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none', transition:'transform 0.2s, background 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#26A5E4'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFF8E7"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71l-4.14-3.05-2 1.92c-.23.23-.42.42-.82.42z"/></svg>
                    </a>
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
          <Route path="/promotions" element={<CollectionPage title="🔥 عروض وتخفيضات" books={promotionBooks} C={C} navigate={navigate}/>}/>
          <Route path="/new" element={<CollectionPage title="الجديد والحصري" books={bestsellerBooks} C={C} navigate={navigate}/>}/>  
        </Routes>
        <Analytics />
      </div>

     <style>{`
     .cats-groups-wrap{
      display:flex;
      flex-direction:column;
      gap:16px;
    }
    .cats-hscroll{
      display:flex;
      flex-direction:row-reverse;
      direction:ltr;
      gap:8px;
      overflow-x:auto;
      padding-bottom:6px;
      scrollbar-width:none;
      scroll-behavior:smooth;
      width:100%;
      max-width:100%;
      min-width:0;
    }
    .cats-hscroll > * { direction:rtl; flex-shrink:0; min-width:0; }
    .cats-hscroll::-webkit-scrollbar{ display:none; }
    .cats-group{ position:relative; min-width:0; }
    .cats-scroll-arrow{
      display:none;
      position:absolute;
      top:38px;
      width:30px; height:30px;
      border-radius:50%;
      align-items:center; justify-content:center;
      cursor:pointer;
      z-index:5;
      font-size:0.9rem;
      font-weight:700;
    }
           @media(min-width:900px){/* ── Cartes catégories : petites pastilles (toutes tailles) ── */
.cat-card{
  border-radius:40px !important;
  transition:transform .25s, box-shadow .25s, border-color .25s;
}
.cat-card:hover{
  transform:translateY(-3px);
  border-color:#2563EB !important;
  box-shadow:0 8px 20px rgba(37,99,235,0.22) !important;
}
.cat-card-count{
  display:inline-block;
  font-size:0.68rem;
  background:rgba(37,99,235,0.12);
  color:#2563EB;
  padding:1px 8px;
  border-radius:10px;
}
.cat-card-arrow{ display:none !important; }

/* ── PC : pastilles centrées, retour à la ligne automatique ── */
@media(min-width:900px){
  .cats-groups-wrap{ gap:22px !important; }

  .cats-hscroll{
    direction:rtl !important;
    flex-direction:row !important;
    flex-wrap:wrap !important;
    justify-content:center !important;
    overflow:visible !important;
    gap:12px !important;
    padding-bottom:0 !important;
  }

  .cats-group-title{
    text-align:center !important;
    font-size:1.15rem !important;
    margin-bottom:14px !important;
  }

  .cat-card{
    width:auto !important;
    min-width:190px;
    max-width:260px;
    height:60px !important;
    padding:6px 16px 6px 12px !important;
    gap:10px !important;
  }
  .cat-card-img{
    width:44px !important;
    height:44px !important;
    border-width:2px !important;
  }
  .cat-card-title{
    font-size:0.88rem !important;
  }
}
      .cat-card-count{
        font-size:0.8rem !important;
        background:rgba(37,99,235,0.1);
        padding:4px 10px;
        border-radius:10px;
      }
    }
      .highlights-row > div { min-width: 0; }
      .home-sections{
        display:flex;
        flex-direction:column;
        padding:10px 4% 40px;
        gap:32px;
      }
      .home-section-categories{ order:1; }
      .home-section-bestsellers{ order:2; }
        .home-section-banner{
          grid-area: hero-banner;
          margin-top: 95px;
        }
        .banner-mobile-only{ display:none; }
               @media(max-width:900px){
        .banner-desktop-only{ display:none !important; }
        .banner-mobile-only{ display:block !important; }

        .home-sections,
        .home-hero-grid{ display:flex !important; flex-direction:column !important; }
        .home-hero-grid > .home-sections{ display:contents !important; }

        .home-section-banner{ order:1 !important; margin-top:0 !important; }
        .home-section-bestsellers{ order:2 !important; }
        .home-section-promotions{ order:3 !important; }
        .home-section-categories{ order:4 !important; }
        }

      @media(min-width:901px){@media(min-width:901px){
        .home-hero-grid{
          display:grid;
          grid-template-columns: 1fr;
          grid-template-areas:
            "hero-text"
            "hero-banner"
            "content";
          gap:16px;
          align-items:start;
        }

  /* Marque + recherche : colonne centrée */
  .home-hero-grid > header{
    grid-area: hero-text;
    padding: 90px 5% 0 !important;
    display:flex !important;
    flex-direction:column !important;
    align-items:center !important;
    justify-content:center !important;
  }
  .home-hero-grid > header > div{
    width:100% !important;
    max-width:760px !important;
    margin:0 auto !important;
    flex:0 0 auto !important;
    display:flex;
    flex-direction:column;
    align-items:center;
  }
  /* La barre de recherche prend toute la largeur du bloc (760px) */
  .home-hero-grid > header > div > div:last-child{
    width:100%;
  }
  /* On cache bismillah / titre / description sur PC pour que la recherche soit en haut */
  .home-hero-grid .hero-bismillah,
  .home-hero-grid .hero-title,
  .home-hero-grid .hero-desc{
    display:none !important;
  }

  .home-hero-grid > .home-sections{
    display:contents;
  }

  /* Bannière : centrée sous la recherche */
  .home-section-banner{
    grid-area: hero-banner;
    width:100%;
    max-width:1200px;
    margin:0 auto !important;   /* annule le margin-top:95px */
    min-width:0;
    order:0;
  }
  .home-section-bestsellers{ order:1; }
  .home-section-promotions{ order:2; }
  .home-section-categories{ order:3; }

  .home-section-categories,
  .home-section-bestsellers,
  .home-section-promotions{
    grid-column: 1 / -1;
  }
 
        }
        .highlights-col-scroll{
          display:grid !important;
          grid-template-columns:repeat(auto-fill,minmax(180px,1fr)) !important;
          overflow-x:visible !important;
          gap:14px !important;
        }
        .highlights-col{
          grid-template-columns:repeat(auto-fill,minmax(180px,1fr)) !important;
        }
      }
      .highlights-banner-scroll{
  display:flex;
  gap:10px;
  overflow-x:auto;
  scroll-snap-type:x mandatory;
  -webkit-overflow-scrolling:touch;
  border-radius:20px;
  align-self:flex-start;
  min-width: 0;   /* ← ajoute cette ligne */
}
    .highlights-banner-scroll::-webkit-scrollbar{ display:none; }
   .highlights-banner-img{
      flex:0 0 100%;
      scroll-snap-align:start;
      width:100%;
      max-height:320px;
      object-fit:contain;
      border-radius:20px;
      cursor:pointer;
      display:block;
      margin:0 auto;
    }
      .highlights-col{
        display:grid;
        grid-template-columns: repeat(2, 1fr);
        gap:12px;
      }
      @media(max-width:900px){
        .highlights-row{ grid-template-columns: 1fr !important; }
        .highlights-banner{ order:0; height:auto; }
        .home-hero-grid > header{ padding-top:100px !important; }
        .hero-bismillah{display:none!important;}
        .hero-title{display:none!important;}
        .hero-desc{display:none!important;}
        .highlights-col{ display:grid !important; grid-template-columns: repeat(2,1fr) !important; gap:10px !important; }
        .highlights-col-scroll{
          display:flex !important;
          flex-direction:row-reverse !important;
          direction:ltr !important;
          overflow-x:auto !important;
          gap:10px !important;
          padding-bottom:6px;
          scrollbar-width:none;
          scroll-snap-type:x mandatory;
          -webkit-overflow-scrolling:touch;
          min-width:0;
          width:100%;
          max-width:100%;
        }
        .highlights-col-scroll::-webkit-scrollbar{ display:none; }
        .highlights-col-scroll > * {
          flex:0 0 140px !important;
          scroll-snap-align:start;
          min-width:0;
          direction:rtl;
        }
      }
     
      .hero-logo-banner{
      display:block!important;
      width:80%;
      height:80px;
      margin-bottom:4px;
      background:transparent;
      }
      .hero-logo-banner img{
      width:100%; height:100%; object-fit:contain;
      -webkit-mask-image:linear-gradient(to bottom, transparent 0%, black 18%, black 55%, transparent 100%);
      mask-image:linear-gradient(to bottom, transparent 0%, black 18%, black 55%, transparent 100%);
      }
        *{box-sizing:border-box;margin:0;padding:0;font-family:'Cairo',sans-serif;}
        html, body{overflow-x:hidden; max-width:100%;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:rgba(201,168,76,0.4);border-radius:4px;}
        input::placeholder{color:#8C7B6B;font-family:'Cairo',sans-serif;}
        @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(12px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .hidden-carousel{display:none!important;}
        .bestsellers-grid {
          content-visibility: auto;
          contain-intrinsic-size: 1px 600px;
        }
        .bestsellers-grid{display:grid!important;grid-template-columns:repeat(6,1fr)!important;overflow-x:visible!important;}
        @media (max-width: 639px) {
        .extra-books-grid{ grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; }
        .highlights-col{ grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; }
        .highlights-col .app-book-card img,
        .extra-books-grid .app-book-card img{ height: 130px !important; }
        .cats-groups-wrap{ gap:8px !important; margin-top:8px !important; }
        .cats-group h3{ margin-bottom:4px !important; font-size:0.75rem !important; }
        .cat-card{ height:44px !important; padding:6px 8px !important; }
        .cat-card > div:first-child{ width:28px !important; height:28px !important; }
        .highlights-row{ padding-top:0 !important; }
        .highlights-row h2{ margin-bottom:8px !important; font-size:1rem !important; }
        .highlights-col-scroll{ align-items:flex-start !important; }
        .highlights-col-scroll > *{ flex:0 0 120px !important; }
        .highlights-col-scroll .app-book-card img{ height:150px !important; }
        .highlights-col-scroll .app-book-card > div:last-child{ padding:6px 8px !important; }
        .highlights-col-scroll .app-book-card p{
          font-size:0.7rem !important;
          line-height:1.25 !important;
          margin-bottom:2px !important;
        }
        .highlights-col-scroll .app-book-card p:first-child{
          -webkit-line-clamp:1 !important;
        }
        .highlights-col-scroll .app-book-card p:nth-child(2){
          white-space:nowrap !important;
          overflow:hidden !important;
          text-overflow:ellipsis !important;
          margin-bottom:4px !important;
        }
        .highlights-col-scroll .app-book-card > div:last-child > div{
          padding-top:4px !important;
        }
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
        .show-more-btn{ display:none !important; }
        .extra-books-bestsellers{ display:none !important; }
        .bestsellers-grid{display:flex!important;overflow-x:auto!important;scroll-snap-type:x mandatory;}
        .bestsellers-grid>div{scroll-snap-align:start;min-width:150px!important;}
        .hero-logo-banner img{
          width:100%; height:100%; object-fit:contain;
          -webkit-mask-image:linear-gradient(to bottom, transparent 0%, black 18%, black 55%, transparent 100%);
          mask-image:linear-gradient(to bottom, transparent 0%, black 18%, black 55%, transparent 100%);
        }

      }
        /* ── Bloc marque (logo + nom) ── */
.hero-brand{ display:none; }

@media(min-width:901px){
  .hero-brand{
    display:flex;
    align-items:center;
    justify-content:center;
    gap:22px;
    margin:0 auto 22px;
    width:100%;
    text-align:center;
  }
  .hero-brand-logo{
    width:130px;
    height:130px;
    object-fit:contain;
    filter:drop-shadow(0 6px 18px rgba(37,99,235,0.35));
  }
  .hero-brand-name{
    font-size:clamp(2.2rem,3.6vw,3.4rem);
    font-weight:800;
    line-height:1.15;
    background:linear-gradient(135deg,#14356B,#2563EB 60%,#5B9BFF);
    -webkit-background-clip:text;
    background-clip:text;
    -webkit-text-fill-color:transparent;
    margin:0 0 6px;
  }
  .hero-brand-sub{
    font-size:1rem;
    color:#5B6B82;
    margin:0;
    letter-spacing:.3px;
  }
  .hero-brand-sub span{ color:#2563EB; margin:0 6px; }
}
        .see-all-btn{
  background:linear-gradient(135deg,#2563EB,#5B9BFF);
  color:#fff; border:none; padding:11px 28px; border-radius:24px;
  cursor:pointer; font-weight:700; font-size:0.9rem; font-family:inherit;
  box-shadow:0 6px 18px rgba(37,99,235,0.35); transition:transform .2s;
}
.see-all-btn:hover{ transform:translateY(-2px); }

@media(min-width:901px){
  .highlights-col-scroll.row-one,
  .highlights-col.row-one{
    display:grid !important;
    grid-template-columns:repeat(var(--cols),1fr) !important;
    overflow:visible !important;
  }
}
  /* ── Cadre du site (grands écrans) ── */
@media(min-width:1200px){
  .site-frame{
    max-width:1600px;
    margin:0 auto;
    min-height:100vh;
    background:var(--frame-bg);
    border-left:1px solid var(--frame-border);
    border-right:1px solid var(--frame-border);
    box-shadow:0 0 50px rgba(37,99,235,0.12);
  }
}
      `}</style>
      
    </div>
  )
}
export default App