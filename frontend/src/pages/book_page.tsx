import {useState, useEffect ,useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'


interface Book {
  id: number; title: string; author: string; price: number;
  image_url: string; categories: string[]; rating: number; pages: string;
  publisher: string; qias: string; description: string; paperType: string; tahqiq: string; promotion?: number;
}
// bug pagination fixed.

interface BooksPageProps {
  books: Book[];
  darkMode: boolean;
  onAddToCart: (book: Book) => void;
  onBuyNow: (book: Book) => void;
}

const optimizeImg = (url: string, _width = 400) => url

const BOOKS_PER_PAGE = 21

export default function BooksPage({ books, darkMode }: BooksPageProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [currentPage, setCurrentPage] = useState(1)
  const selectedCategory = searchParams.get('category') || 'الكل'
  const [searchQuery, setSearchQuery]      = useState('');
  const [sortBy, setSortBy]           = useState<'default'|'price_asc'|'price_desc'|'rating'>('default');
  const [viewMode, setViewMode]         = useState<'grid'|'list'>('grid');
  const [searchFocused, setSearchFocused] = useState(false);

  const light = { bg:'#F3F6FB', bgCard:'#FFFFFF', text:'#0F1F3D', primary:'#14356B', gold:'#2563EB', goldLight:'#5B9BFF', goldDark:'#173F91', muted:'#5B6B82', border:'rgba(37,99,235,0.22)', inputBg:'rgba(20,53,107,0.04)' };
  const dark  = { bg:'#0A1526', bgCard:'#0F2038', text:'#E7F0FF', primary:'#8FC1FF', gold:'#2563EB', goldLight:'#8FC1FF', goldDark:'#2563EB', muted:'#9FB3CE', border:'rgba(37,99,235,0.28)', inputBg:'rgba(255,255,255,0.05)' };
  const c = darkMode ? dark : light;

  useEffect(() => { setCurrentPage(1) }, [selectedCategory])

  const categories: string[] = useMemo(() => (
    ['الكل', ...Array.from(new Set(books.flatMap(b => b.categories || [])))]
    ), [books]);
    
  const filtered = useMemo(() => (
    books
      .filter(b => selectedCategory==='الكل' || b.categories?.includes(selectedCategory))
      .sort((a,b) => {
        if (sortBy==='price_asc')  return a.price - b.price;
        if (sortBy==='price_desc') return b.price - a.price;
        if (sortBy==='rating')     return b.rating - a.rating;
        return 0;
      })
  ), [books, selectedCategory, searchQuery, sortBy]);

  const suggestions = useMemo(() => (
    searchQuery.length >= 1
      ? books.filter(b => b.title.includes(searchQuery) || b.author.includes(searchQuery)).slice(0, 6)
      : []
  ), [books, searchQuery]);

  // Réinitialise la page quand les filtres (search/sort) changent (pas initialCategory, car c'est géré au-dessus)
  useEffect(() => { 
    setCurrentPage(1)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [sortBy]);

  const totalPages = Math.ceil(filtered.length / BOOKS_PER_PAGE);
  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * BOOKS_PER_PAGE;
    return filtered.slice(start, start + BOOKS_PER_PAGE);
  }, [filtered, currentPage]);

  return (
    <div style={{ minHeight:'100vh', backgroundColor:c.bg, color:c.text, direction:'rtl', fontFamily:"'Cairo','Segoe UI',sans-serif", paddingTop:'40px', transition:'background 0.35s,color 0.35s', position:'relative' }}>

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
            return Array.from({ length: 250 }).map((_, i) => (
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
      <div style={{ padding:'40px 5% 0', position:'relative', zIndex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px' }}>
          <div style={{ height:'1px', flex:1, background:`linear-gradient(to left,${c.gold},transparent)` }}/>
          <span style={{ color:c.gold }}>✦</span>
          <span style={{ color:c.goldDark, fontSize:'0.72rem', letterSpacing:'1.5px' }}>مجموعتنا الكاملة</span>
          <span style={{ color:c.gold }}>✦</span>
          <div style={{ height:'1px', flex:1, background:`linear-gradient(to right,${c.gold},transparent)` }}/>
        </div>
        <h1 style={{ fontSize:'clamp(1.8rem,7vw,2.8rem)', fontWeight:'800', color:c.primary, margin:'0 0 8px' }}>
          جميع <span style={{ color:c.goldDark }}>الكتب</span>
        </h1>
        <p style={{ color:c.muted, fontSize:'0.9rem', margin:'0 0 20px' }}>{filtered.length} كتاب متاح في مكتبتنا</p>
      </div>

      {/* Filtres */}
      <div style={{ padding:'0 5% 20px' }}>
        <div style={{ position:'relative', marginBottom:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', background:c.bgCard, padding:'10px 16px', borderRadius: searchFocused && suggestions.length>0 ? '20px 20px 0 0' : '40px', border:`1px solid ${searchFocused ? c.gold : c.border}`, transition:'all 0.2s' }}>
            <span style={{ color:c.gold, marginLeft:'8px' }}>🔍</span>
            <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
              placeholder="ابحث عن عنوان أو مؤلف..."
              style={{ border:'none', outline:'none', width:'100%', fontSize:'16px', background:'transparent', color:c.text, fontFamily:'inherit' }}/>
            {searchQuery&&<button onClick={()=>setSearchQuery('')} style={{ background:'none', border:'none', cursor:'pointer', color:c.muted, fontSize:'1rem' }}>✕</button>}
          </div>
          {searchFocused && searchQuery.length >= 1 && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, background:c.bgCard, border:`1.5px solid ${c.gold}`, borderTop:'none', borderRadius:'0 0 20px 20px', boxShadow:`0 12px 32px rgba(74,55,40,0.2)`, zIndex:50, overflow:'hidden', maxHeight:'340px', overflowY:'auto' }}>
              {suggestions.length === 0 ? (
                <div style={{ padding:'16px', textAlign:'center', color:c.muted, fontSize:'0.85rem' }}>لا توجد نتائج</div>
              ) : suggestions.map(book => (
                <div key={book.id} onClick={() => { navigate(`/book/${book.id}`); setSearchQuery(''); setSearchFocused(false); }}
                  style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 16px', cursor:'pointer', borderBottom:`1px solid ${c.border}` }}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(201,168,76,0.08)'}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <img src={optimizeImg(book.image_url, 300)} loading="lazy" alt={book.title} style={{ width:'38px', height:'50px', objectFit:'cover', borderRadius:'6px', flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:'0.85rem', fontWeight:'700', color:c.primary, margin:0 }}>{book.title}</p>
                    <p style={{ fontSize:'0.72rem', color:c.muted, margin:'2px 0 0' }}>{book.author}</p>
                  </div>
                  <span style={{ fontSize:'0.8rem', fontWeight:'700', color:c.goldDark }}>{book.price.toLocaleString()} د.ج</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:'6px', overflowX:'auto', scrollbarWidth:'none', paddingBottom:'4px', marginBottom:'12px' }}>
          {categories.map(cat=>(
            <button key={cat} onClick={() => setSearchParams(cat === 'الكل' ? {} : { category: cat })} style={{
              background: selectedCategory===cat?`linear-gradient(135deg,${darkMode?'#2C1810':c.primary},${c.goldDark})`:c.bgCard,
              color: selectedCategory===cat?'#FFF8E7':c.muted,
              border: `1px solid ${selectedCategory===cat?'transparent':c.border}`,
              padding:'6px 14px', borderRadius:'16px', cursor:'pointer',
              fontSize:'0.8rem', fontFamily:'inherit', fontWeight:selectedCategory===cat?'bold':'normal',
              flexShrink:0, transition:'all 0.2s',
            }}>{cat}</button>
          ))}
        </div>

        <div style={{ display:'flex', gap:'8px', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap' }}>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value as typeof sortBy)}
            style={{ background:c.bgCard, color:c.text, border:`1px solid ${c.border}`, padding:'7px 12px', borderRadius:'16px', fontFamily:'inherit', fontSize:'0.8rem', cursor:'pointer', outline:'none', flex:'1 1 160px', maxWidth:'220px', direction:'rtl' }}>
            <option value="default">الترتيب الافتراضي</option>
            <option value="price_asc">السعر: الأقل أولاً</option>
            <option value="price_desc">السعر: الأعلى أولاً</option>
            <option value="rating">الأعلى تقييماً</option>
          </select>
          <div style={{ display:'flex', background:c.bgCard, border:`1px solid ${c.border}`, borderRadius:'16px', overflow:'hidden' }}>
            {(['grid','list'] as const).map(mode=>(
              <button key={mode} onClick={()=>setViewMode(mode)} style={{
                background: viewMode===mode?`linear-gradient(135deg,${darkMode?'#2C1810':c.primary},${c.goldDark})`:'transparent',
                border:'none', color:viewMode===mode?'#FFF8E7':c.muted,
                padding:'7px 13px', cursor:'pointer', fontSize:'1rem',
              }}>{mode==='grid'?'⊞':'☰'}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ display:'flex', alignItems:'center', padding:'0 5%', marginBottom:'24px' }}>
        <div style={{ flex:1, height:'1px', background:`linear-gradient(to left,${c.gold},transparent)` }}/>
        <div style={{ margin:'0 14px', color:c.gold, display:'flex', gap:'6px' }}>✦ ✦ ✦</div>
        <div style={{ flex:1, height:'1px', background:`linear-gradient(to right,${c.gold},transparent)` }}/>
      </div>

      {/* Livres */}
      <main style={{ padding:'0 4% 100px' }}>
        {filtered.length===0 ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:c.muted }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'14px' }}>📭</div>
            <p>لا توجد كتب تطابق بحثك</p>
            <button onClick={()=>{ setSearchParams({}); }}
              style={{ marginTop:'14px', background:`linear-gradient(135deg,${darkMode?'#2C1810':c.primary},${c.goldDark})`, color:'#FFF8E7', border:'none', padding:'9px 22px', borderRadius:'18px', cursor:'pointer', fontFamily:'inherit', fontSize:'0.88rem' }}>
              إعادة ضبط الفلاتر
            </button>
          </div>
        ) : viewMode==='grid' ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'12px' }} className="bp-grid">
            {paginatedBooks.map(book=>
              <div key={book.id} onClick={()=>navigate(`/book/${book.id}`)}
                className="book-grid-card"
                style={{ background:c.bgCard, borderRadius:'16px', overflow:'hidden', border:`1px solid ${c.border}`, boxShadow:`0 4px 16px rgba(74,55,40,0.08)`, cursor:'pointer', position:'relative' }}
              >
                <div style={{ position:'absolute',top:0,left:0,width:'26px',height:'26px',borderTop:`2px solid ${c.gold}`,borderLeft:`2px solid ${c.gold}`,borderRadius:'16px 0 0 0',zIndex:2 }}/>
                <div style={{ position:'absolute',top:0,right:0,width:'26px',height:'26px',borderTop:`2px solid ${c.gold}`,borderRight:`2px solid ${c.gold}`,borderRadius:'0 16px 0 0',zIndex:2 }}/>
                <div style={{ position:'relative' }}>
                  <img src={optimizeImg(book.image_url, 300)} loading="lazy" decoding="async" width={230} height={160} alt={book.title} style={{ width:'100%', height:'160px', objectFit:'cover', display:'block' }}/>
                  {book.promotion && book.promotion < book.price && (
                    <div style={{
                      position:'absolute', top:'8px', left:'8px', zIndex:4,
                      background:'#e74c3c', color:'white',
                      fontSize:'0.6rem', fontWeight:'800',
                      padding:'3px 8px', borderRadius:'10px',
                      boxShadow:'0 2px 8px rgba(231,76,60,0.5)'
                    }}>
                      تخفيض %{Math.round((1 - book.promotion / book.price) * 100)}
                    </div>
                  )}
                  <div style={{ position:'absolute',inset:0,background:'linear-gradient(to top,rgba(44,24,16,0.55) 0%,transparent 55%)' }}/>
                  {book.categories && book.categories.length > 0 && (
                    <span style={{ position:'absolute',top:'8px',right:'8px',background:`linear-gradient(135deg,${c.goldDark},${c.gold})`,color:'white',fontSize:'0.6rem',fontWeight:'bold',padding:'3px 8px',borderRadius:'10px',zIndex:3, maxWidth:'70%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {book.categories[0]}{book.categories.length > 1 ? ` +${book.categories.length - 1}` : ''}
                    </span>
                  )}
                  <div style={{ position:'absolute',bottom:'7px',right:'8px',color:c.goldLight,fontSize:'0.6rem',zIndex:3 }}>{'★'.repeat(book.rating)}</div>
                </div>
                <div style={{ padding:'10px 10px 12px' }}>
                  <h4 style={{ color:c.primary, fontSize:'0.82rem', margin:'0 0 3px', fontFamily:'inherit', lineHeight:1.3 }}>{book.title}</h4>
                  <p style={{ color:c.muted, fontSize:'0.7rem', margin:'0 0 8px' }}>{book.author}</p>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:`1px solid ${c.border}`, paddingTop:'8px' }}>
                    <div>
                      <span style={{ fontSize:'0.92rem', fontWeight:'bold', color:c.goldDark }}>{book.promotion && book.promotion < book.price
                          ? <>
                          <span
                            style={{
                              textDecoration: 'line-through',
                              color: c.muted,
                              opacity: 0.7,
                              fontSize: '0.75rem',
                              marginLeft: '6px'
                            }}
                          >
                            {book.price.toLocaleString()} د.ج
                          </span>

                          <span
                            style={{
                              color: '#e74c3c',
                              fontWeight: 800,
                              fontSize: '0.92rem'
                            }}
                          >
                            {book.promotion.toLocaleString()} د.ج
                          </span>
                        </>
                          : book.price.toLocaleString()
                        } DA
                      </span>
                      <span style={{ fontSize:'0.62rem', color:c.muted, marginRight:'2px' }}> د.ج</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            {paginatedBooks.map(book=>
              <div key={book.id} onClick={() => {
                  console.log("Navigation vers :", `/book/${book.id}`);
                  navigate(`/book/${book.id}`);
                }}
                className="book-list-card"
                style={{ background:c.bgCard, borderRadius:'14px', border:`1px solid ${c.border}`, display:'flex', overflow:'hidden', cursor:'pointer', position:'relative' }}
              >
                <div style={{ width:'4px', background:`linear-gradient(to bottom,${c.gold},${c.goldDark})`, flexShrink:0 }}/>
                <img src={optimizeImg(book.image_url, 300)} loading="lazy" alt={book.title} style={{ width:'80px', height:'100px', objectFit:'cover', flexShrink:0 }}/>
                {book.promotion && book.promotion < book.price && (
                  <div style={{
                    position:'absolute', top:'8px', left:'8px', zIndex:4,
                    background:'#e74c3c', color:'white',
                    fontSize:'0.6rem', fontWeight:'800',
                    padding:'3px 8px', borderRadius:'10px',
                    boxShadow:'0 2px 8px rgba(231,76,60,0.5)'
                  }}>
                    تخفيض %{Math.round((1 - book.promotion / book.price) * 100)}
                  </div>
                )}
                <div style={{ padding:'12px 14px', flex:1, display:'flex', flexDirection:'column', justifyContent:'space-between', minWidth:0 }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px', flexWrap:'wrap' }}>
                      <h4 style={{ color:c.primary, fontSize:'0.88rem', margin:0, fontFamily:'inherit', flex:1 }}>{book.title}</h4>
                      {book.categories && book.categories.length > 0 && (
                        <span style={{ background:`linear-gradient(135deg,${c.goldDark},${c.gold})`, color:'white', fontSize:'0.6rem', fontWeight:'bold', padding:'2px 8px', borderRadius:'8px', flexShrink:0 }}>
                          {book.categories[0]}{book.categories.length > 1 ? ` +${book.categories.length - 1}` : ''}
                        </span>
                      )}
                    </div>
                    <p style={{ color:c.muted, fontSize:'0.75rem', margin:'0 0 4px' }}>{book.author}</p>
                    <div style={{ color:c.goldLight, fontSize:'0.68rem' }}>{'★'.repeat(book.rating)}{'☆'.repeat(5-book.rating)}</div>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:`1px solid ${c.border}`, paddingTop:'8px', marginTop:'8px' }}>
                    <div>
                      <span style={{ fontSize:'0.95rem', fontWeight:'bold', color:c.goldDark }}>{book.promotion && book.promotion < book.price
                          ? <><span style={{ textDecoration:'line-through', color:'rgba(255,255,255,0.4)', fontSize:'0.75rem', marginLeft:'4px' }}>{book.price.toLocaleString()}</span> <span style={{ color:'#e74c3c', fontWeight:800 }}>{book.promotion.toLocaleString()}</span></>
                          : book.price.toLocaleString()
                        } DA
                      </span>
                      <span style={{ fontSize:'0.68rem', color:c.muted, marginRight:'3px' }}> د.ج</span>
                    </div>
                    <div style={{ display:'flex', gap:'6px' }}>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {totalPages > 1 && (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'8px', marginTop:'32px', flexWrap:'wrap' }}>
          <button
            onClick={() => { 
              setCurrentPage(p => Math.max(1, p-1))
              if (typeof window !== 'undefined') window.scrollTo({top:0, behavior:'smooth'})
            }}
            disabled={currentPage === 1}
            style={{ padding:'8px 14px', borderRadius:'12px', border:`1px solid ${c.border}`, background:c.bgCard, color: currentPage===1 ? c.muted : c.primary, cursor: currentPage===1 ? 'not-allowed' : 'pointer', fontFamily:'inherit', opacity: currentPage===1 ? 0.4 : 1 }}>
            ‹ السابق
          </button>
          {Array.from({length: totalPages}, (_, i) => i+1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((p, i, arr) => (
              <span key={p} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                {i > 0 && arr[i-1] !== p - 1 && <span style={{ color:c.muted }}>...</span>}
                <button
                  onClick={() => { 
                    setCurrentPage(p)
                    if (typeof window !== 'undefined') window.scrollTo({top:0, behavior:'smooth'})
                  }}
                  style={{ width:'36px', height:'36px', borderRadius:'10px', border:`1px solid ${p===currentPage ? 'transparent' : c.border}`, background: p===currentPage ? `linear-gradient(135deg,${darkMode?'#2C1810':c.primary},${c.goldDark})` : c.bgCard, color: p===currentPage ? '#FFF8E7' : c.text, cursor:'pointer', fontFamily:'inherit', fontWeight: p===currentPage?700:400 }}>
                  {p}
                </button>
              </span>
            ))}
          <button
            onClick={() => { 
              setCurrentPage(p => Math.min(totalPages, p+1))
              if (typeof window !== 'undefined') window.scrollTo({top:0, behavior:'smooth'})
            }}
            disabled={currentPage === totalPages}
            style={{ padding:'8px 14px', borderRadius:'12px', border:`1px solid ${c.border}`, background:c.bgCard, color: currentPage===totalPages ? c.muted : c.primary, cursor: currentPage===totalPages ? 'not-allowed' : 'pointer', fontFamily:'inherit', opacity: currentPage===totalPages ? 0.4 : 1 }}>
            التالي ›
          </button>
        </div>
      )}
      </main>

      <style>{`
        input::placeholder { color:#8C7B6B; font-family:'Cairo',sans-serif; }
        select option { background:${c.bgCard}; color:${c.text}; }
        @media(min-width:640px){ .bp-grid { grid-template-columns:repeat(auto-fill,minmax(230px,1fr))!important; gap:22px!important; } }
        @media(max-width:639px){ .bp-modal-inner { flex-direction:column!important; } .bp-modal-cover { flex:none!important; } .bp-modal-cover img { min-height:200px!important; max-height:240px!important; } }
        .book-grid-card { transition: transform 0.25s, box-shadow 0.25s; }
        .book-grid-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(74,55,40,0.18); }
        .book-list-card { transition: box-shadow 0.2s; }
        .book-list-card:hover { box-shadow: 0 8px 24px rgba(74,55,40,0.15); }
        .bp-grid { content-visibility: auto; contain-intrinsic-size: 1px 5000px; }
      `}</style>
    </div>
  );
}
