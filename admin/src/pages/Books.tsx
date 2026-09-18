import { useEffect, useRef, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import AutocompleteInput from '../components/AutocompleteInput'

interface Book {
  id: number; title: string; author: string; price: number
  description: string; image_url: string; categories: string[]
  publisher: string; qias: string; paperType: string; pages: string; tahqiq: string; promotion?: number;
  bestseller?: boolean; free_delivery?: boolean; stock: number; wholesale_available?: boolean;
}
// vente en gros
interface BookImage { id: number; book_id: number; url: string; position: number }
// fixing historic.
const emptyBook: Omit<Book, 'id'> = {
  title: '', author: '', price: 0, description: '', image_url: '', categories: [],
  publisher: '', qias: '', paperType: '', pages: '', tahqiq: '', promotion: undefined as number | undefined,
  bestseller: false, free_delivery: false, stock: 0, wholesale_available: false,
}

// Fonction utilitaire à ajouter en haut de chaque fichier
const optimizeImg = (url: string, _width = 400) => url

export default function Books() {
  const [books, setBooks] = useState<Book[]>([])
  const [categories, setCategories] = useState<{name: string, image_url: string | null, type?: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatType, setNewCatType] = useState<'category'|'author'|'publisher'|'quran'>('category')
  const [addingCat, setAddingCat] = useState(false)
  const [deletingCat, setDeletingCat] = useState<string | null>(null)
  const [editBook, setEditBook] = useState<Book | null>(null)
  const [form, setForm] = useState(emptyBook)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [existingImages, setExistingImages] = useState<BookImage[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingCatImg, setUploadingCatImg] = useState<string | null>(null)
  const catImgRef = useRef<HTMLInputElement>(null)
  const [activeCatUpload, setActiveCatUpload] = useState<string | null>(null)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [showBundleModal, setShowBundleModal] = useState(false)
  const [bundles, setBundles] = useState<any[]>([])
  const [newBundle, setNewBundle] = useState({ qty: 0, price: 0, label: '', badge: '', free_delivery: false, qias_choice: '' })
  const [wilayaDelivery, setWilayaDelivery] = useState<{wilaya:string, home_price:number, dhd_price:number}[]>([])
  const [globalHomePrice, setGlobalHomePrice] = useState(0)
  const [globalDhdPrice, setGlobalDhdPrice] = useState(0)
  const BOOKS_PER_PAGE = 12
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('book_search_history') || '[]') } catch { return [] }
  })
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const [savingDelivery, setSavingDelivery] = useState(false)
  const [editingCat, setEditingCat] = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [options, setOptions] = useState<{
  id?: number;
  label: string;
  choices: {name: string, price: number, auto?: boolean}[];
  newChoice: string;
  newPrice: number;
  affects_price: boolean;
}[]>([])

  async function addBundle() {
    if (!editBook || !newBundle.qty || !newBundle.price) return
    const { data, error } = await supabase.from('book_bundles').insert({
      book_id: editBook.id,
      qty: newBundle.qty,
      price: newBundle.price,
      label: newBundle.label || null,
      badge: newBundle.badge || null,
      free_delivery: newBundle.free_delivery,
      qias_choice: newBundle.qias_choice || null,
    }).select().single()
    if (!error && data) {
      setBundles(p => [...p, data].sort((a, b) => a.qty - b.qty))
      setNewBundle({ qty: 0, price: 0, label: '', badge: '', free_delivery: false, qias_choice: '' })
    }
  }

  function compressImage(file: File, maxWidth = 1000, quality = 0.75): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new window.Image()
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('canvas error'))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('compression failed'))
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        }, 'image/jpeg', quality)
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

  async function deleteBundle(bundleId: number) {
    await supabase.from('book_bundles').delete().eq('id', bundleId)
    setBundles(p => p.filter(b => b.id !== bundleId))
  }

  useEffect(() => { setCurrentPage(1) }, [search])

  useEffect(() => {
    fetchBooks()
    fetchCategories()
    fetchDeliverySettings()
  }, [])

  useEffect(() => {
    if (!showModal) return
    if (!form.qias?.trim()) return

    setOptions(prev => {
      const hasQias = prev.some(o => o.label === 'القياس')
      const base = hasQias ? prev : [
        { label: 'القياس', choices: [], newChoice: '', newPrice: 0, affects_price: true },
        ...prev,
      ]
      return base.map(o => {
        if (o.label !== 'القياس') return o
        const manualChoices = o.choices.filter(c => !c.auto)
        const autoChoice = { name: form.qias, price: form.price || 0, auto: true }
        return { ...o, choices: [autoChoice, ...manualChoices] }
      })
    })
  }, [form.qias, form.price, showModal])

  const filteredBooks = useMemo(() => books.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.author.toLowerCase().includes(search.toLowerCase()) ||
    b.publisher?.toLowerCase().includes(search.toLowerCase()) ||
    b.categories?.some(cat => cat.toLowerCase().includes(search.toLowerCase()))
  ), [books, search])

  const totalPages = Math.ceil(filteredBooks.length / BOOKS_PER_PAGE)
  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * BOOKS_PER_PAGE
    return filteredBooks.slice(start, start + BOOKS_PER_PAGE)
  }, [filteredBooks, currentPage])

 const booksByCategory = useMemo(() => {
    const map: Record<string, Book[]> = {}
    for (const b of books) {
      for (const cat of b.categories || []) {
        if (!map[cat]) map[cat] = []
        map[cat].push(b)
      }
    }
    return map
  }, [books])

  const suggestions = useMemo(() => (
    search.length >= 1
      ? books.filter(b =>
          b.title.toLowerCase().includes(search.toLowerCase()) ||
          b.author.toLowerCase().includes(search.toLowerCase()) ||
          b.publisher?.toLowerCase().includes(search.toLowerCase()) ||
          b.categories?.some(cat => cat.toLowerCase().includes(search.toLowerCase()))
        ).slice(0, 5)
      : []
  ), [books, search])

  function handleSearchSelect(term: string) {
    setSearch(term)
    setShowSuggestions(false)
    const updated = [term, ...searchHistory.filter(h => h !== term)].slice(0, 5)
    setSearchHistory(updated)
    localStorage.setItem('book_search_history', JSON.stringify(updated))
  }

  function clearHistory() {
    setSearchHistory([])
    localStorage.removeItem('book_search_history')
  }

  async function fetchBooks() {
  setLoading(true)
  const { data } = await supabase.from('books').select('*').order('created_at', { ascending: false })
  setBooks((data || []).map((b: any) => ({ ...b, categories: b.categories || (b.category ? [b.category] : []) })))
  setLoading(false)
}

  // Modifie fetchCategories pour inclure type
  async function fetchCategories() {
    const { data } = await supabase.from('categories').select('name, image_url, type').order('name')
    setCategories(data || [])
  }

  async function addCategory() {
    const name = newCatName.trim()
    if (!name) return

    // Vérifie si elle existe déjà
    const exists = categories.some(c => c.name === name)
    if (exists) {
      alert(`La catégorie "${name}" existe déjà !`)
      return
    }

    setAddingCat(true)
    const { error } = await supabase.from('categories').insert({ name, type: newCatType })
    if (!error) {
      setCategories(prev => [...prev, { name, image_url: null, type: newCatType }].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCatName('')
      setNewCatType('category')
    } else {
      alert(`Erreur : "${name}" existe peut-être déjà.`)
    }
    setAddingCat(false)
  }

  async function uploadCatImage(catName: string, file: File) {
    setUploadingCatImg(catName)
    const compressedFile = await compressImage(file)
    const ext = compressedFile.name.split('.').pop()
    const safeName = encodeURIComponent(catName).replace(/%/g, '_')
    const path = `categories/${safeName}_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('book-images').upload(path, compressedFile, { upsert: true, cacheControl: '31536000' })
    if (!error) {
      const { data: u } = supabase.storage.from('book-images').getPublicUrl(path)
      await supabase.from('categories').update({ image_url: u.publicUrl }).eq('name', catName)
      setCategories(prev => prev.map(c => c.name === catName ? { ...c, image_url: u.publicUrl } : c))
    } else {
      console.error('Upload error:', error)
    }
    setUploadingCatImg(null)
  }

  async function deleteCategory(name: string) {
    if (!confirm(`Supprimer "${name}" ?`)) return
    setDeletingCat(name)
    await supabase.from('categories').delete().eq('name', name)
    setCategories(prev => prev.filter(c => c.name !== name))
    setDeletingCat(null)
  }

  async function fetchDeliverySettings() {
    const { data } = await supabase.from('wilaya_delivery').select('*').order('id')
    if (data && data.length > 0) {
      setWilayaDelivery(data)
    } else {
      const wilayas = ['أدرار','الشلف','الأغواط','أم البواقي','باتنة','بجاية','بسكرة','بشار','البليدة','البويرة','تمنراست','تبسة','تلمسان','تيارت','تيزي وزو','الجزائر','الجلفة','جيجل','سطيف','سعيدة','سكيكدة','سيدي بلعباس','عنابة','قالمة','قسنطينة','المدية','مستغانم','المسيلة','معسكر','ورقلة','وهران','البيض','إليزي','برج بوعريريج','بومرداس','الطارف','تندوف','تيسمسيلت','الوادي','خنشلة','سوق أهراس','تيبازة','ميلة','عين الدفلى','النعامة','عين تموشنت','غرداية','غليزان','تيميمون','برج باجي مختار','أولاد جلال','بني عباس','عين صالح','عين قزام','توقرت','جانت','المغير','المنيعة']
      const rows = wilayas.map(w => ({ wilaya: w, home_price: 0, dhd_price: 0 }))
      await supabase.from('wilaya_delivery').insert(rows)
      setWilayaDelivery(rows as any)
    }
  }

  function openAdd() {
    setEditBook(null); setForm(emptyBook); setExistingImages([])
    setNewFiles([]); setNewPreviews([]); setDeletedImageIds([]); setUploadProgress(0)
    setBundles([])
    setNewBundle({ qty: 0, price: 0, label: '', badge: '', free_delivery: false, qias_choice: '' })
    setShowModal(true)
    // Quand tu ouvres le formulaire d'ajout, pré-remplis le qias
    setOptions([{
      label: 'القياس',
      choices: [],  // sera rempli avec le prix du livre après saisie
      newChoice: '',
      newPrice: 0,
      affects_price: true  // le qias affecte toujours le prix
    }])
  }

  async function openEdit(book: Book) {
    setEditBook(book)
    setForm({ title: book.title, author: book.author, price: book.price, description: book.description, image_url: book.image_url, categories: book.categories || [], publisher: book.publisher || '', qias: book.qias || '', paperType: book.paperType || '', pages: book.pages || '', tahqiq: book.tahqiq || '', promotion: book.promotion ?? undefined, bestseller: book.bestseller || false, free_delivery: book.free_delivery || false, stock: book.stock ?? 0, wholesale_available: book.wholesale_available || false })
    
    const { data: imgData } = await supabase.from('book_images').select('*').eq('book_id', book.id).order('position')
    
    // Si book_images est vide mais image_url existe, on synchro d'abord
    if ((!imgData || imgData.length === 0) && book.image_url) {
      await supabase.from('book_images').insert({ book_id: book.id, url: book.image_url, position: 0 })
      const { data: synced } = await supabase.from('book_images').select('*').eq('book_id', book.id)
      setExistingImages(synced || [])
    } else {
      setExistingImages(imgData || [])
    }
    
    const { data: bundleData } = await supabase.from('book_bundles').select('*').eq('book_id', book.id).order('qty')
    setBundles(bundleData || [])
    setShowModal(true)

    const { data: optData } = await supabase
  .from('book_options')
  .select('*')
  .eq('book_id', book.id)
  .order('id')

const loaded = (optData || []).map(o => ({
  id: o.id,
  label: o.label,
  choices: (o.choices || []).map((c: any) => c.auto ? c : c), // garde tel quel
  newChoice: '',
  newPrice: 0,
  affects_price: o.affects_price ?? false
}))

const hasQias = loaded.some(o => o.label === 'القياس')
setOptions(hasQias ? loaded : [
  { label: 'القياس', choices: [], newChoice: '', newPrice: 0, affects_price: true },
  ...loaded,
])
  }

  function toggleCategory(catName: string) {
    setForm(p => {
      const has = p.categories.includes(catName)
      return { ...p, categories: has ? p.categories.filter(c => c !== catName) : [...p.categories, catName] }
    })
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const compressed = await Promise.all(files.map(f => compressImage(f)))
    setNewFiles(prev => [...prev, ...compressed])
    setNewPreviews(prev => [...prev, ...compressed.map(f => URL.createObjectURL(f))])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeNewFile(i: number) {
    URL.revokeObjectURL(newPreviews[i])
    setNewFiles(p => p.filter((_, j) => j !== i))
    setNewPreviews(p => p.filter((_, j) => j !== i))
  }

  function markDeleteExisting(imgId: number) {
    setDeletedImageIds(p => [...p, imgId])
    setExistingImages(p => p.filter(img => img.id !== imgId))
  }

  async function uploadFiles(bookId: number): Promise<string[]> {
    const urls: string[] = []
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i]
      const ext = file.name.split('.').pop()
      const path = `${bookId}/${Date.now()}_${i}.${ext}`
      const { error } = await supabase.storage.from('book-images').upload(path, file, { upsert: true, cacheControl: '31536000' })
      if (!error) {
        const { data: u } = supabase.storage.from('book-images').getPublicUrl(path)
        urls.push(u.publicUrl)
      }
      setUploadProgress(Math.round(((i + 1) / newFiles.length) * 100))
    }
    return urls
  }

  function updateWilayaPrice(wilaya: string, field: 'home_price' | 'dhd_price', value: number) {
    setWilayaDelivery(p => p.map(w => w.wilaya === wilaya ? {...w, [field]: value} : w))
  }

  function applyGlobalPrices() {
    setWilayaDelivery(p => p.map(w => ({...w, home_price: globalHomePrice, dhd_price: globalDhdPrice})))
  }

  async function saveWilayaDelivery() {
    setSavingDelivery(true)
    const { error } = await supabase.from('wilaya_delivery').upsert(
      wilayaDelivery.map(w => ({ wilaya: w.wilaya, home_price: w.home_price, dhd_price: w.dhd_price })),
      { onConflict: 'wilaya' }
    )
    console.log('SAVE WILAYA:', error)
    setSavingDelivery(false)
    setShowDeliveryModal(false)
  }

  async function handleSave() {
    if (!form.title || !form.price) return
    setSaving(true)

    let bookId: number
    try {
      const dataToSave = {
        ...form,
        promotion: form.promotion && form.promotion > 0 ? form.promotion : null,
        category: form.categories[0] || null,
      }
      if (editBook) {
        const { data, error } = await supabase.from('books').update(dataToSave).eq('id', editBook.id).select()
        console.log("UPDATE DATA :", data)
        console.log("UPDATE ERROR :", error)
        if (error) throw error
        bookId = editBook.id
        if (data && data.length > 0) {
          setBooks(p => p.map(b => (b.id === editBook.id ? { ...data[0], categories: data[0].categories || [] } : b)))
        }
        if (deletedImageIds.length > 0) {
          await supabase.from('book_images').delete().in('id', deletedImageIds)
        }

        // ← AJOUTE CES LIGNES : recalculer image_url après modification des photos
        const { data: remainingImgs } = await supabase
          .from('book_images')
          .select('url')
          .eq('book_id', bookId)
          .order('position')
          .limit(1)

        const newImageUrl = remainingImgs?.[0]?.url || null

        await supabase.from('books').update({ image_url: newImageUrl }).eq('id', bookId)
        setBooks(p => p.map(b => b.id === bookId ? { ...b, image_url: newImageUrl || b.image_url } : b))
      } else {
        const { data, error } = await supabase.from("books").insert(dataToSave).select().single()
        console.log("INSERT DATA :", data)
        console.log("INSERT ERROR :", error)
        if (error) throw error
        if (!data) throw new Error("Insert failed")
        bookId = data.id
        setBooks(p => [{ ...data, categories: data.categories || [] }, ...p])
      }
      if (newFiles.length > 0) {
        const urls = await uploadFiles(bookId)
        
        // Récupère les URLs déjà en base
        const { data: existingUrls } = await supabase
          .from('book_images').select('url').eq('book_id', bookId)
        const alreadyInDb = new Set((existingUrls || []).map((i: any) => i.url))
        
        // Compte les images restantes pour calculer la bonne position
        const { data: currentImgs } = await supabase
          .from('book_images').select('id').eq('book_id', bookId)
        const startPosition = (currentImgs || []).length

        const toInsert = urls
          .filter(url => !alreadyInDb.has(url))
          .map((url, i) => ({ book_id: bookId, url, position: startPosition + i }))
        
        if (toInsert.length > 0) {
          await supabase.from('book_images').insert(toInsert)
        }

        if (urls[0]) {
          await supabase.from('books').update({ image_url: urls[0] }).eq('id', bookId)
          setBooks(p => p.map(b => b.id === bookId ? { ...b, image_url: urls[0] } : b))
        }
      }

      // ── Sauvegarder les options ──
      await supabase.from('book_options').delete().eq('book_id', bookId)
      if (options.length > 0) {
        await supabase.from('book_options').insert(
          options.filter(o => o.label && o.choices.length > 0).map(o => ({
            book_id: bookId,
            label: o.label,
            choices: o.choices,
            affects_price: o.affects_price,
          }))
        )
      }

    } catch (e) { console.error(e) }

    setSaving(false)
    setShowModal(false)
    if (editBook) {
      const savedBookId = editBook.id
      const { data: freshImgs } = await supabase
        .from('book_images')
        .select('*')
        .eq('book_id', savedBookId)
        .order('position')
      setExistingImages(freshImgs || [])
      setNewFiles([])
      setNewPreviews([])
      setDeletedImageIds([])
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer ce livre et toutes ses photos ?')) return
    setDeleting(id)
    await supabase.from('book_images').delete().eq('book_id', id)
    await supabase.from('books').delete().eq('id', id)
    setBooks(p => p.filter(b => b.id !== id))
    setDeleting(null)
  }

  const inp = {
    width: '100%', padding: '11px 14px',
    background: 'rgba(255,253,248,0.05)', border: '1.5px solid rgba(232,184,0,0.15)',
    borderRadius: '10px', color: '#FFF8E7', fontSize: '16px',
    outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit',
    transition: 'border-color 0.2s'
  }
  const lbl = { color: 'rgba(232,184,0,0.6)', fontSize: '12px', display: 'block', marginBottom: '6px', fontWeight: 600 as const }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: '#FFD700', fontSize: 'clamp(20px,5vw,28px)', fontWeight: 800, margin: 0 }}>📚 Livres</h1>
          <p style={{ color: 'rgba(232,184,0,0.4)', fontSize: '13px', marginTop: '4px' }}>
            {filteredBooks.length} livre(s){search && ` trouvé(s) pour "${search}"`}
          </p>

          {/* Barre de recherche */}
          <div ref={searchRef} style={{ position: 'relative', marginTop: '12px', width: 'clamp(240px, 40vw, 420px)' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', pointerEvents: 'none' }}>🔍</span>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setShowSuggestions(true) }}
                onFocus={e => { setShowSuggestions(true); e.target.style.borderColor = '#E8B800' }}
                onBlur={e => { setTimeout(() => setShowSuggestions(false), 150); e.target.style.borderColor = 'rgba(232,184,0,0.2)' }}
                placeholder="البحث عن كتاب، مؤلف، دار نشر..."
                style={{
                  width: '100%', padding: '10px 36px 10px 38px',
                  background: 'rgba(255,253,248,0.05)', border: '1.5px solid rgba(232,184,0,0.2)',
                  borderRadius: '12px', color: '#FFF8E7', fontSize: '16px',
                  outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit',
                  transition: 'border-color 0.2s'
                }}
              />
              {search && (
                <button onClick={() => { setSearch(''); setShowSuggestions(false) }}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(232,184,0,0.5)', cursor: 'pointer', fontSize: '16px', padding: '0', lineHeight: 1 }}>
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown suggestions + historique */}
            {showSuggestions && (search.length >= 1 ? suggestions.length > 0 : searchHistory.length > 0) && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 500,
                background: '#1A1208', border: '1px solid rgba(232,184,0,0.2)',
                borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
              }}>
                {search.length >= 1 ? (
                  suggestions.map(book => (
                    <div key={book.id} onMouseDown={() => handleSearchSelect(book.title)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232,184,0,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {book.image_url
                        ? <img src={optimizeImg(book.image_url, 300)} loading="lazy" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                        : <span style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>📖</span>
                      }
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#FFF8E7', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{book.title}</div>
                        <div style={{ color: 'rgba(232,184,0,0.45)', fontSize: '11px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {book.author && <span>{book.author}</span>}
                          {book.publisher && <span>· {book.publisher}</span>}
                          {book.categories?.length > 0 && <span>· {book.categories.join(', ')}</span>}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid rgba(232,184,0,0.08)' }}>
                      <span style={{ color: 'rgba(232,184,0,0.4)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>🕐 Recherches récentes</span>
                      <button onMouseDown={clearHistory} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.5)', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>Effacer</button>
                    </div>
                    {searchHistory.map(h => (
                      <div key={h} onMouseDown={() => handleSearchSelect(h)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232,184,0,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <span style={{ color: 'rgba(232,184,0,0.35)', fontSize: '14px' }}>🕐</span>
                        <span style={{ color: 'rgba(232,184,0,0.7)', fontSize: '13px' }}>{h}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowDeliveryModal(true)} style={{ background: 'rgba(232,184,0,0.1)', border: '1.5px solid rgba(232,184,0,0.3)', borderRadius: '12px', color: '#E8B800', padding: '11px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            🚚 Livraison
          </button>
          <button onClick={() => setShowCatModal(true)} style={{ background: 'rgba(232,184,0,0.1)', border: '1.5px solid rgba(232,184,0,0.3)', borderRadius: '12px', color: '#E8B800', padding: '11px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>🏷️ Catégories</button>
          <button onClick={openAdd} style={{ background: 'linear-gradient(135deg, #5C3A1E, #B8860B)', border: 'none', borderRadius: '12px', color: '#FFF8E7', padding: '11px 18px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(184,134,11,0.3)' }}>+ Ajouter</button>
        </div>
      </div>

      {/* Grille livres */}
      {loading ? (
        <div style={{ color: 'rgba(232,184,0,0.4)', textAlign: 'center', paddingTop: '60px' }}>Chargement...</div>
      ) : (
        <div className="books-grid" style={{ display: 'grid', gap: '14px' }}>
          {paginatedBooks.map(book => (
            <div key={book.id} style={{ background: 'rgba(255,253,248,0.03)', border: '1px solid rgba(232,184,0,0.1)', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
              {book.image_url
                ? <img src={optimizeImg(book.image_url, 300)} loading="lazy" alt={book.title} style={{ width: '100%', height: '170px', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '170px', background: 'rgba(232,184,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>📖</div>
              }
              {book.stock === 0 && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '170px', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                  <span style={{ background: '#ef4444', color: '#fff', fontWeight: 800, fontSize: '14px', padding: '6px 18px', borderRadius: '20px', letterSpacing: '1px' }}>نفذت الكمية</span>
                </div>
              )}
              {book.stock > 0 && book.stock <= 5 && (
                <div style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 3 }}>
                  <span style={{ background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '11px', padding: '3px 8px', borderRadius: '10px' }}>آخر {book.stock} نسخ</span>
                </div>
              )}
              <div style={{ padding: '14px' }}>
                <div style={{ color: '#FFF8E7', fontWeight: 700, fontSize: '15px', marginBottom: '3px' }}>{book.title}</div>
                <div style={{ color: 'rgba(232,184,0,0.5)', fontSize: '12px', marginBottom: '8px' }}>{book.author}</div>
                {book.categories && book.categories.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                    {book.categories.map(cat => (
                      <span key={cat} style={{ background: 'rgba(184,134,11,0.15)', color: '#E8B800', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', display: 'inline-block', border: '1px solid rgba(232,184,0,0.15)' }}>{cat}</span>
                    ))}
                  </div>
                )}
                <div style={{ marginBottom: '12px' }}>
                  {book.promotion && book.promotion < book.price ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '17px' }}>{book.promotion.toLocaleString()} DA</span>
                      <span style={{ color: 'rgba(232,184,0,0.4)', fontWeight: 400, fontSize: '13px', textDecoration: 'line-through' }}>{book.price.toLocaleString()}</span>
                      <span style={{ background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '8px' }}>-{Math.round((1 - book.promotion / book.price) * 100)}%</span>
                    </div>
                  ) : (
                    <span style={{ color: '#E8B800', fontWeight: 800, fontSize: '17px' }}>{book.price.toLocaleString()} DA</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => openEdit(book)} style={{ flex: 1, padding: '9px', background: 'rgba(184,134,11,0.12)', border: '1px solid rgba(232,184,0,0.2)', borderRadius: '10px', color: '#E8B800', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', fontWeight: 600 }}>✏️ Modifier</button>
                  <button onClick={() => handleDelete(book.id)} disabled={deleting === book.id} style={{ flex: 1, padding: '9px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '10px', color: '#ef4444', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', fontWeight: 600 }}>
                    {deleting === book.id ? '...' : '🗑️ Supprimer'}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {totalPages > 1 && (
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'8px', marginTop:'24px', flexWrap:'wrap' }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1}
                style={{ padding:'8px 14px', borderRadius:'10px', border:'1px solid rgba(232,184,0,0.2)', background:'rgba(232,184,0,0.05)', color: currentPage===1 ? 'rgba(232,184,0,0.3)' : '#E8B800', cursor: currentPage===1 ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
                ‹ السابق
              </button>
              <span style={{ color:'rgba(232,184,0,0.6)', fontSize:'13px' }}>{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages}
                style={{ padding:'8px 14px', borderRadius:'10px', border:'1px solid rgba(232,184,0,0.2)', background:'rgba(232,184,0,0.05)', color: currentPage===totalPages ? 'rgba(232,184,0,0.3)' : '#E8B800', cursor: currentPage===totalPages ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
                التالي ›
              </button>
            </div>
          )}
          <style>{`
            .books-grid {
              grid-template-columns: repeat(2, 1fr);
            }
            @media (min-width: 480px) {
              .books-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
            }
          `}</style>
        </div>
      )}

      {/* ══ Modal Catégories ══ */}
      
      {showCatModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1A1208', border: '1px solid rgba(232,184,0,0.15)', borderRadius: '24px 24px 0 0', padding: 'clamp(20px,4vw,32px)', width: '100%', maxWidth: '480px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ width: '40px', height: '4px', background: 'rgba(232,184,0,0.2)', borderRadius: '2px', margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#FFD700', fontSize: '18px', fontWeight: 800 }}>🏷️ Gérer les catégories</h2>
              <button onClick={() => setShowCatModal(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(232,184,0,0.15)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: 'rgba(232,184,0,0.6)', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ marginBottom: '20px' }}>
              {/* Sélecteur type */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                {[
                  { val: 'category', label: '🏷️ تصنيف' },
                  { val: 'author',   label: '✍️ مؤلف' },
                  { val: 'publisher',label: '🏛️ دار نشر' },
                  { val: 'quran',    label: '📖 قرآن' },
                ].map(t => (
                  <button
                    key={t.val}
                    type="button"
                    onClick={() => setNewCatType(t.val as any)}
                    style={{
                      flex: '1 1 calc(50% - 3px)', padding: '9px 4px', borderRadius: '10px', fontSize: '12px',
                      fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer',
                      border: `1.5px solid ${newCatType === t.val ? '#E8B800' : 'rgba(232,184,0,0.2)'}`,
                      background: newCatType === t.val ? 'rgba(232,184,0,0.2)' : 'transparent',
                      color: newCatType === t.val ? '#FFD700' : 'rgba(232,184,0,0.5)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCategory()}
                  placeholder='اسم التصنيف...'
                  style={{ ...inp, flex: 1 }}
                  onFocus={e => e.target.style.borderColor = '#E8B800'}
                  onBlur={e => e.target.style.borderColor = 'rgba(232,184,0,0.15)'}
                />
                <button onClick={addCategory} disabled={addingCat || !newCatName.trim()} style={{
                  padding: '11px 18px', background: addingCat ? 'rgba(184,134,11,0.3)' : 'linear-gradient(135deg, #5C3A1E, #B8860B)',
                  border: 'none', borderRadius: '10px', color: '#FFF8E7',
                  cursor: addingCat ? 'not-allowed' : 'pointer', fontSize: '14px',
                  fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap'
                }}>
                  {addingCat ? '...' : '+ Ajouter'}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {categories.length === 0 ? (
                <p style={{ color: 'rgba(232,184,0,0.3)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Aucune catégorie</p>
              ) : categories.map(cat => {
  const typeLabel = cat.type === 'author' ? { icon: 'مؤلف ✍️', color: '#a78bfa' }
    : cat.type === 'publisher' ? { icon: 'دار نشر 🏛️', color: '#34d399' }
    : cat.type === 'quran' ? { icon: ' قرآن📖', color: '#60a5fa' }
    : { icon: 'تصنيف 🏷️', color: '#E8B800' }

  const isEditing = editingCat === cat.name

  return (
    <div key={cat.name} style={{ background: 'rgba(232,184,0,0.06)', border: `1px solid ${isEditing ? 'rgba(232,184,0,0.4)' : 'rgba(232,184,0,0.12)'}`, borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
      
      {/* Ligne principale */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
          <div onClick={() => { setActiveCatUpload(cat.name); catImgRef.current?.click() }}
            style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(232,184,0,0.3)', cursor: 'pointer', flexShrink: 0, background: 'rgba(232,184,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {uploadingCatImg === cat.name ? <span style={{ fontSize: '10px', color: '#E8B800' }}>...</span>
              : cat.image_url ? <img src={optimizeImg(cat.image_url, 300)} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '16px' }}>📷</span>}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: '#FFF8E7', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '10px', color: typeLabel.color, background: `${typeLabel.color}18`, padding: '1px 6px', borderRadius: '6px', fontWeight: 700 }}>
                {typeLabel.icon}
              </span>
              <span style={{ color: 'rgba(232,184,0,0.35)', fontSize: '11px' }}>
                {(booksByCategory[cat.name]?.length || 0)} livre{(booksByCategory[cat.name]?.length || 0) !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {/* Select type */}
          <select
            value={cat.type || 'category'}
            onChange={async e => {
              const newType = e.target.value
              await supabase.from('categories').update({ type: newType }).eq('name', cat.name)
              setCategories(prev => prev.map(c => c.name === cat.name ? { ...c, type: newType } : c))
            }}
            style={{
              background: 'rgba(255,253,248,0.05)', border: `1.5px solid ${typeLabel.color}40`,
              borderRadius: '8px', color: typeLabel.color, fontSize: '16px', fontWeight: 700,
              padding: '5px 4px', cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
            }}
          >
            <option value="category" style={{ background: '#1A1208', color: '#E8B800' }}>تصنيف 🏷️</option>
            <option value="author" style={{ background: '#1A1208', color: '#a78bfa' }}>مؤلف ✍️</option>
            <option value="publisher" style={{ background: '#1A1208', color: '#34d399' }}>دار نشر  🏛️</option>
            <option value="quran" style={{ background: '#1A1208', color: '#60a5fa' }}>قرآن 📖</option>
          </select>

          {/* Bouton éditer */}
          <button
            onClick={() => {
              if (isEditing) { setEditingCat(null) }
              else { setEditingCat(cat.name); setEditCatName(cat.name) }
            }}
            style={{ background: isEditing ? 'rgba(232,184,0,0.2)' : 'rgba(232,184,0,0.08)', border: `1px solid ${isEditing ? '#E8B800' : 'rgba(232,184,0,0.2)'}`, borderRadius: '8px', color: '#E8B800', cursor: 'pointer', padding: '5px 8px', fontSize: '12px', fontFamily: 'inherit' }}>
            ✏️
          </button>

          {/* Bouton supprimer */}
          <button onClick={() => deleteCategory(cat.name)} disabled={deletingCat === cat.name}
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', padding: '5px 8px', fontSize: '12px', fontFamily: 'inherit' }}>
            {deletingCat === cat.name ? '...' : '🗑️'}
          </button>
        </div>
      </div>

      {/* Panneau d'édition inline */}
      {isEditing && (
        <div style={{ borderTop: '1px solid rgba(232,184,0,0.1)', padding: '12px 14px', background: 'rgba(232,184,0,0.03)' }}>
          <p style={{ color: 'rgba(232,184,0,0.5)', fontSize: '11px', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>✏️ تعديل التصنيف</p>
          
          {/* Nouveau nom */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{ color: 'rgba(232,184,0,0.6)', fontSize: '11px', display: 'block', marginBottom: '4px', fontWeight: 600 }}>الاسم الجديد</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                value={editCatName}
                onChange={e => setEditCatName(e.target.value)}
                onKeyDown={async e => {
                  if (e.key === 'Enter') {
                    const newName = editCatName.trim()
                    if (!newName || newName === cat.name) return
                    const exists = categories.some(c => c.name === newName)
                    if (exists) { alert(`"${newName}" existe déjà`); return }
                    await supabase.from('categories').update({ name: newName }).eq('name', cat.name)
                    setCategories(prev => prev.map(c => c.name === cat.name ? { ...c, name: newName } : c))
                    setEditingCat(null)
                  }
                }}
                style={{ ...inp, flex: 1, padding: '8px 12px', fontSize: '16px' }}
                onFocus={e => e.target.style.borderColor = '#E8B800'}
                onBlur={e => e.target.style.borderColor = 'rgba(232,184,0,0.15)'}
              />
              <button
                onClick={async () => {
                  const newName = editCatName.trim()
                  if (!newName || newName === cat.name) { setEditingCat(null); return }
                  const exists = categories.some(c => c.name === newName && c.name !== cat.name)
                  if (exists) { alert(`"${newName}" existe déjà`); return }
                  await supabase.from('categories').update({ name: newName }).eq('name', cat.name)
                  setCategories(prev => prev.map(c => c.name === cat.name ? { ...c, name: newName } : c))
                  setEditingCat(null)
                }}
                style={{ padding: '8px 14px', background: 'linear-gradient(135deg, #5C3A1E, #B8860B)', border: 'none', borderRadius: '8px', color: '#FFF8E7', cursor: 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                ✅ حفظ
              </button>
            </div>
          </div>

          {/* Changer image */}
          <button
            onClick={() => { setActiveCatUpload(cat.name); catImgRef.current?.click() }}
            style={{ width: '100%', padding: '8px', background: 'rgba(232,184,0,0.08)', border: '1px dashed rgba(232,184,0,0.3)', borderRadius: '8px', color: '#E8B800', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', fontWeight: 600 }}>
            📷 تغيير الصورة
          </button>

          {/* Livres de cette catégorie */}
          {(booksByCategory[cat.name]?.length || 0) > 0 && (
            <div style={{ marginTop: '10px' }}>
              <label style={{ color: 'rgba(232,184,0,0.5)', fontSize: '11px', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                📚 الكتب في هذا التصنيف ({booksByCategory[cat.name]?.length || 0})
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '140px', overflowY: 'auto' }}>
                {(booksByCategory[cat.name] || []).map(book => (
                  <div key={book.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px', background: 'rgba(255,253,248,0.03)', borderRadius: '6px', border: '1px solid rgba(232,184,0,0.08)' }}>
                    {book.image_url
                      ? <img src={optimizeImg(book.image_url, 300)} loading="lazy" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
                      : <span style={{ fontSize: '16px', flexShrink: 0 }}>📖</span>}
                    <span style={{ color: '#FFF8E7', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{book.title}</span>
                    <span style={{ color: '#E8B800', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{book.price.toLocaleString()} DA</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
})}
            </div>
            <input ref={catImgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const file = e.target.files?.[0]; if (file && activeCatUpload) uploadCatImage(activeCatUpload, file); if (catImgRef.current) catImgRef.current.value = '' }} />
          </div>
        </div>
      )}

      {/* ══ Modal Livraison ══ */}
      {showDeliveryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', background: '#1A1208', border: '1px solid rgba(232,184,0,0.15)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: '#FFD700', margin: 0 }}>🚚 أسعار التوصيل حسب الولاية</h2>
              <button onClick={() => setShowDeliveryModal(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(232,184,0,0.15)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: 'rgba(232,184,0,0.6)', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ background: 'rgba(232,184,0,0.06)', border: '1px solid rgba(232,184,0,0.12)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
              <p style={{ color: 'rgba(232,184,0,0.6)', fontSize: '12px', fontWeight: 700, margin: '0 0 10px' }}>⚡ تطبيق سريع على كل الولايات</p>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label style={lbl}>🏠 منزل (دج)</label>
                  <input type="number" value={globalHomePrice || ''} onWheel={e => e.currentTarget.blur()} onChange={e => setGlobalHomePrice(Number(e.target.value))} placeholder="مثال: 800" style={inp} onFocus={e => e.target.style.borderColor = '#E8B800'} onBlur={e => e.target.style.borderColor = 'rgba(232,184,0,0.15)'} />
                </div>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label style={lbl}>🏢 DHD (دج)</label>
                  <input type="number" value={globalDhdPrice || ''} onWheel={e => e.currentTarget.blur()} onChange={e => setGlobalDhdPrice(Number(e.target.value))} placeholder="مثال: 400" style={inp} onFocus={e => e.target.style.borderColor = '#E8B800'} onBlur={e => e.target.style.borderColor = 'rgba(232,184,0,0.15)'} />
                </div>
                <button onClick={applyGlobalPrices} style={{ padding: '11px 18px', background: 'linear-gradient(135deg, #5C3A1E, #B8860B)', border: 'none', borderRadius: '10px', color: '#FFF8E7', fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-end' }}>تطبيق على الكل</button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#1A1208', zIndex: 1 }}>
                  <tr>
                    <th style={{ color: 'rgba(232,184,0,0.6)', fontSize: '12px', padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>الولاية</th>
                    <th style={{ color: 'rgba(232,184,0,0.6)', fontSize: '12px', padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>🏠 منزل (دج)</th>
                    <th style={{ color: 'rgba(232,184,0,0.6)', fontSize: '12px', padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>🏢 DHD (دج)</th>
                  </tr>
                </thead>
                <tbody>
                  {wilayaDelivery.map((w, i) => (
                    <tr key={w.wilaya} style={{ borderBottom: '1px solid rgba(232,184,0,0.06)', background: i % 2 === 0 ? 'transparent' : 'rgba(232,184,0,0.02)' }}>
                      <td style={{ color: '#FFF8E7', fontSize: '13px', padding: '8px 12px', fontWeight: 600 }}>{w.wilaya}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <input type="number" value={w.home_price || ''} onWheel={e => e.currentTarget.blur()} onChange={e => updateWilayaPrice(w.wilaya, 'home_price', Number(e.target.value))} style={{ ...inp, padding: '7px 10px', fontSize: '16px', textAlign: 'center' }} onFocus={e => e.target.style.borderColor = '#E8B800'} onBlur={e => e.target.style.borderColor = 'rgba(232,184,0,0.15)'} />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input type="number" value={w.dhd_price || ''} onWheel={e => e.currentTarget.blur()} onChange={e => updateWilayaPrice(w.wilaya, 'dhd_price', Number(e.target.value))} style={{ ...inp, padding: '7px 10px', fontSize: '16px', textAlign: 'center' }} onFocus={e => e.target.style.borderColor = '#E8B800'} onBlur={e => e.target.style.borderColor = 'rgba(232,184,0,0.15)'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={() => setShowDeliveryModal(false)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(232,184,0,0.15)', borderRadius: '10px', color: 'rgba(232,184,0,0.6)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '14px' }}>إلغاء</button>
              <button onClick={saveWilayaDelivery} disabled={savingDelivery} style={{ flex: 2, padding: '12px', background: savingDelivery ? 'rgba(184,134,11,0.4)' : 'linear-gradient(135deg, #5C3A1E, #B8860B)', border: 'none', borderRadius: '10px', color: '#FFF8E7', cursor: savingDelivery ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '14px' }}>
                {savingDelivery ? '...' : '💾 حفظ جميع الأسعار'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal Livre ══ */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }} className="modal-overlay">
          <div style={{ background: '#1A1208', border: '1px solid rgba(232,184,0,0.15)', borderRadius: '24px 24px 0 0', padding: 'clamp(20px,4vw,32px)', width: '100%', maxWidth: '560px', maxHeight: '94vh', overflowY: 'auto' }} className="modal-sheet">
            <div style={{ width: '40px', height: '4px', background: 'rgba(232,184,0,0.2)', borderRadius: '2px', margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#FFD700', fontSize: '18px', fontWeight: 800 }}>
                {editBook ? '✏️ Modifier le livre' : '➕ Nouveau livre'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(232,184,0,0.15)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: 'rgba(232,184,0,0.6)', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* Titre (sans autocomplete) */}
            <div style={{ marginBottom: '14px' }}>
              <label style={lbl}>Titre *</label>
              <input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Titre du livre"
                style={inp}
                onFocus={e => e.target.style.borderColor = '#E8B800'}
                onBlur={e => e.target.style.borderColor = 'rgba(232,184,0,0.15)'}
              />
            </div>

            {/* Auteur (avec autocomplete) */}
            <div style={{ marginBottom: '14px' }}>
              <label style={lbl}>Auteur / المؤلف</label>
              <AutocompleteInput
                field="author"
                value={form.author}
                onChange={v => setForm(p => ({ ...p, author: v }))}
                placeholder="Nom de l'auteur"
              />
            </div>

            {/* Catégories */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={lbl}>التصنيفات (يمكن اختيار أكثر من واحد)</label>
                <button onClick={() => { setShowModal(false); setShowCatModal(true) }} style={{ background: 'none', border: 'none', color: '#E8B800', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, padding: 0 }}>+ Gérer les catégories</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', background: 'rgba(255,253,248,0.05)', border: '1.5px solid rgba(232,184,0,0.15)', borderRadius: '10px', padding: '12px' }}>
                {categories.length === 0 ? (
                  <span style={{ color: 'rgba(232,184,0,0.3)', fontSize: '13px' }}>لا توجد تصنيفات</span>
                ) : categories.map(cat => {
                  const selected = form.categories.includes(cat.name)
                  return (
                    <button key={cat.name} type="button" onClick={() => toggleCategory(cat.name)} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: `1.5px solid ${selected ? '#E8B800' : 'rgba(232,184,0,0.2)'}`, background: selected ? 'rgba(232,184,0,0.2)' : 'transparent', color: selected ? '#FFD700' : 'rgba(232,184,0,0.6)' }}>
                      {selected ? '✓ ' : ''}{cat.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Prix normal */}
            <div style={{ marginBottom: '14px' }}>
              <label style={lbl}>Prix (DA) *</label>
              <input type="number" value={form.price || ''}
                onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setForm(p => ({ ...p, price: val === '' ? 0 : Number(val) })) }}
                onWheel={e => e.currentTarget.blur()} placeholder='مثال: 1200' style={inp}
                onFocus={e => e.target.style.borderColor = '#E8B800'} onBlur={e => e.target.style.borderColor = 'rgba(232,184,0,0.15)'} />
            </div>

            {/* Prix promotion */}
            <div style={{ marginBottom: '14px' }}>
              <label style={lbl}>💸 سعر التخفيض (اتركه فارغاً إذا لا يوجد)</label>
              <input type="number" value={form.promotion ?? ''}
                onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setForm(p => ({ ...p, promotion: val === '' ? undefined : Number(val) })) }}
                onWheel={e => e.currentTarget.blur()} placeholder='مثال: 800' style={inp}
                onFocus={e => e.target.style.borderColor = '#E8B800'} onBlur={e => e.target.style.borderColor = 'rgba(232,184,0,0.15)'} />
            </div>

            {showBundleModal && editBook && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#1A1208', border: '1px solid rgba(232,184,0,0.2)', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ color: '#FFD700', fontSize: '18px', fontWeight: 800 }}>📦 العروض المجمعة</h2>
                    <button onClick={() => setShowBundleModal(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(232,184,0,0.15)', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: 'rgba(232,184,0,0.6)', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                    {bundles.map((b, i) => (
                      <div key={i} style={{ background: 'rgba(232,184,0,0.06)', border: '1px solid rgba(232,184,0,0.12)', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#FFF8E7', fontWeight: 700, fontSize: '14px' }}>{b.qty} {b.qty === 1 ? 'نسخة' : 'نسخ'} — {b.price.toLocaleString()} دج</div>
                          {b.label && <div style={{ color: 'rgba(232,184,0,0.5)', fontSize: '12px', marginTop: '2px' }}>{b.label}</div>}
                          <span style={{ background: b.qias_choice ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.08)', color: b.qias_choice ? '#60a5fa' : 'rgba(255,255,255,0.5)', fontSize: '11px', padding: '2px 8px', borderRadius: '8px', display: 'inline-block', marginTop: '4px', marginRight: '4px' }}>
                            📐 {b.qias_choice || 'كل القياسات'}
                          </span>
                          {b.free_delivery && <span style={{ background: 'rgba(39,174,96,0.15)', color: '#27ae60', fontSize: '11px', padding: '2px 8px', borderRadius: '8px', display: 'inline-block', marginTop: '4px' }}>توصيل مجاني</span>}
                          {b.badge && <span style={{ background: 'rgba(232,184,0,0.15)', color: '#E8B800', fontSize: '11px', padding: '2px 8px', borderRadius: '8px', display: 'inline-block', marginTop: '4px', marginRight: '4px' }}>{b.badge}</span>}
                        </div>
                        <button onClick={() => deleteBundle(b.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', padding: '5px 10px', fontSize: '12px', fontFamily: 'inherit' }}>🗑️</button>
                      </div>
                    ))}
                    {bundles.length === 0 && <p style={{ color: 'rgba(232,184,0,0.3)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>لا توجد عروض بعد</p>}
                  </div>
                  <div style={{ borderTop: '1px solid rgba(232,184,0,0.1)', paddingTop: '16px' }}>
                    <p style={{ color: 'rgba(232,184,0,0.6)', fontSize: '12px', marginBottom: '12px', fontWeight: 700 }}>➕ إضافة عرض جديد</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <label style={lbl}>عدد النسخ *</label>
                        <input type="number" value={newBundle.qty || ''} onWheel={e => e.currentTarget.blur()} onChange={e => setNewBundle(p => ({ ...p, qty: Number(e.target.value) }))} placeholder="مثال: 2" style={inp} onFocus={e => e.target.style.borderColor = '#E8B800'} onBlur={e => e.target.style.borderColor = 'rgba(232,184,0,0.15)'} />
                      </div>
                      <div>
                        <label style={lbl}>السعر الإجمالي (دج) *</label>
                        <input type="number" value={newBundle.price || ''} onWheel={e => e.currentTarget.blur()} onChange={e => setNewBundle(p => ({ ...p, price: Number(e.target.value) }))} placeholder="مثال: 20000" style={inp} onFocus={e => e.target.style.borderColor = '#E8B800'} onBlur={e => e.target.style.borderColor = 'rgba(232,184,0,0.15)'} />
                      </div>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={lbl}>التسمية (اختياري)</label>
                      <input value={newBundle.label} onChange={e => setNewBundle(p => ({ ...p, label: e.target.value }))} placeholder="مثال: نسختان" style={inp} onFocus={e => e.target.style.borderColor = '#E8B800'} onBlur={e => e.target.style.borderColor = 'rgba(232,184,0,0.15)'} />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={lbl}>شارة العرض (اختياري)</label>
                      <input value={newBundle.badge} onChange={e => setNewBundle(p => ({ ...p, badge: e.target.value }))} placeholder="مثال: تخفيض مع توصيل مجاني" style={inp} onFocus={e => e.target.style.borderColor = '#E8B800'} onBlur={e => e.target.style.borderColor = 'rgba(232,184,0,0.15)'} />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={lbl}>📐 يخص أي قياس؟</label>
                      <select
                        value={newBundle.qias_choice}
                        onChange={e => setNewBundle(p => ({ ...p, qias_choice: e.target.value }))}
                        style={{ ...inp, cursor: 'pointer' }}
                      >
                        <option value="" style={{ background: '#1A1208' }}>🔁 كل القياسات</option>
                        {options.find(o => o.label === 'القياس')?.choices.map(ch => (
                          <option key={ch.name} value={ch.name} style={{ background: '#1A1208' }}>{ch.name}</option>
                        ))}
                      </select>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'rgba(39,174,96,0.06)', border: '1.5px solid rgba(39,174,96,0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px' }}>
                      <input type="checkbox" checked={newBundle.free_delivery} onChange={e => setNewBundle(p => ({ ...p, free_delivery: e.target.checked }))} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#27ae60' }} />
                      <span style={{ color: '#FFF8E7', fontSize: '14px', fontWeight: 600 }}>🚚 توصيل مجاني لهذا العرض</span>
                    </label>
                    <button onClick={addBundle} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #5C3A1E, #B8860B)', border: 'none', borderRadius: '10px', color: '#FFF8E7', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✅ إضافة العرض</button>
                  </div>
                </div>
              </div>
            )}

            {/* Photos */}
            <div style={{ borderTop: '1px solid rgba(232,184,0,0.1)', margin: '18px 0', paddingTop: '18px' }}>
              <p style={{ color: 'rgba(232,184,0,0.4)', fontSize: '11px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>📸 Photos du livre</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {existingImages.map(img => (
                  <div key={img.id} style={{ position: 'relative', width: '80px', height: '80px' }}>
                    <img src={img.url} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '2px solid rgba(232,184,0,0.2)' }} />
                    <button onClick={() => markDeleteExisting(img.id)} style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                ))}
                {newPreviews.map((src, i) => (
                  <div key={`n${i}`} style={{ position: 'relative', width: '80px', height: '80px' }}>
                    <img src={optimizeImg(src, 300)} loading="lazy" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '2px solid #E8B800' }} />
                    <button onClick={() => removeNewFile(i)} style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    <div style={{ position: 'absolute', bottom: '2px', left: '2px', background: '#E8B800', borderRadius: '4px', fontSize: '8px', color: '#1A1208', padding: '1px 4px', fontWeight: 700 }}>NEW</div>
                  </div>
                ))}
                <button onClick={() => { if (fileInputRef.current) { fileInputRef.current.removeAttribute('capture'); fileInputRef.current.click() } }} style={{ width: '80px', height: '80px', background: 'rgba(232,184,0,0.06)', border: '2px dashed rgba(232,184,0,0.25)', borderRadius: '10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '20px' }}>📷</span>
                  <span style={{ color: '#E8B800', fontSize: '9px', fontWeight: 700 }}>Ajouter</span>
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <button onClick={() => { if (fileInputRef.current) { fileInputRef.current.removeAttribute('capture'); fileInputRef.current.click() } }} style={{ flex: 1, padding: '10px', fontSize: '13px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,184,0,0.15)', borderRadius: '10px', color: 'rgba(232,184,0,0.6)', cursor: 'pointer', fontFamily: 'inherit' }}>🖼️ Galerie</button>
                <button onClick={() => { if (fileInputRef.current) { fileInputRef.current.setAttribute('capture', 'environment'); fileInputRef.current.click() } }} style={{ flex: 1, padding: '10px', fontSize: '13px', background: 'rgba(232,184,0,0.1)', border: '1px solid rgba(232,184,0,0.25)', borderRadius: '10px', color: '#E8B800', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>📸 Appareil photo</button>
              </div>
              {saving && newFiles.length > 0 && uploadProgress > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ background: 'rgba(232,184,0,0.1)', borderRadius: '4px', height: '5px' }}>
                    <div style={{ width: `${uploadProgress}%`, height: '5px', background: 'linear-gradient(90deg, #B8860B, #E8B800)', borderRadius: '4px', transition: 'width 0.3s' }} />
                  </div>
                  <p style={{ color: '#E8B800', fontSize: '11px', marginTop: '4px' }}>Upload : {uploadProgress}%</p>
                </div>
              )}
            </div>

            {/* Détails */}
            <div style={{ borderTop: '1px solid rgba(232,184,0,0.1)', margin: '18px 0', paddingTop: '18px' }}>
              <p style={{ color: 'rgba(232,184,0,0.4)', fontSize: '11px', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>تفاصيل الكتاب</p>

              <div style={{ marginBottom: '14px' }}>
                <label style={lbl}>🏛️ دار النشر — Maison d'édition</label>
                <AutocompleteInput field="publisher" value={form.publisher} onChange={v => setForm(p => ({ ...p, publisher: v }))} placeholder='دار ابن حزم...' />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={lbl}>📐 القياس</label>
                  <AutocompleteInput field="qias" value={form.qias} onChange={v => setForm(p => ({ ...p, qias: v }))} placeholder='21/25' />
                </div>
                <div>
                  <label style={lbl}>📄 عدد الصفحات</label>
                  <AutocompleteInput field="pages" value={form.pages} onChange={v => setForm(p => ({ ...p, pages: v }))} placeholder='512' />
                </div>
              </div>

              {/* Stock */}
              <div style={{ marginBottom: '14px' }}>
                <label style={lbl}>📦 الكمية المتاحة (المخزون)</label>
                <input type="number" value={form.stock ?? ''}
                  onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setForm(p => ({ ...p, stock: val === '' ? 0 : Number(val) })) }}
                  onWheel={e => e.currentTarget.blur()} placeholder='مثال: 50' style={inp}
                  onFocus={e => e.target.style.borderColor = '#E8B800'} onBlur={e => e.target.style.borderColor = 'rgba(232,184,0,0.15)'} />
                <p style={{ color: 'rgba(232,184,0,0.4)', fontSize: '11px', marginTop: '4px' }}>⚠ ستنخفض الكمية تلقائياً عند كل طلب جديد</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={lbl}>🌐 نوع الورق</label>
                  <AutocompleteInput field="paperType" value={form.paperType} onChange={v => setForm(p => ({ ...p, paperType: v }))} placeholder='عربي...' />
                </div>
                <div>
                  <label style={lbl}>🔍 التحقيق</label>
                  <AutocompleteInput field="tahqiq" value={form.tahqiq} onChange={v => setForm(p => ({ ...p, tahqiq: v }))} placeholder='الألباني...' />
                </div>
              </div>
            </div>

            {/* Description (sans autocomplete) */}
            <div style={{ marginBottom: '24px' }}>
              <label style={lbl}>نبذة عن الكتاب</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
                style={{ ...inp, resize: 'vertical' }}
                onFocus={e => e.target.style.borderColor = '#E8B800'}
                onBlur={e => e.target.style.borderColor = 'rgba(232,184,0,0.15)'} />
            </div>

            <div style={{ marginTop:'24px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
                <label style={lbl}>الخيارات (لون، حجم...)</label>
                <button onClick={() => setOptions(p => [...p, { label:'', choices:[], newChoice:'', newPrice:0, affects_price:false }])}
                  style={{ background:'rgba(232,184,0,0.15)', border:`1px solid rgba(232,184,0,0.4)`, color:'#E8B800', padding:'5px 12px', borderRadius:'10px', cursor:'pointer', fontSize:'0.8rem', fontFamily:'inherit', fontWeight:700 }}>
                  + إضافة خيار
                </button>
              </div>
              {options.map((opt, oi) => (
              <div key={oi} style={{ background:'rgba(232,184,0,0.05)', border:`1px solid rgba(232,184,0,0.2)`, borderRadius:'14px', padding:'14px', marginBottom:'10px' }}>
                
                {/* اسم الخيار + supprimer */}
                <div style={{ display:'flex', gap:'8px', marginBottom:'8px' }}>
                  <input
                    value={opt.label}
                    onChange={e => setOptions(p => p.map((o,i) => i===oi ? {...o, label:e.target.value} : o))}
                    placeholder="اسم الخيار"
                    style={{ ...inp, flex:1 }}
                    readOnly={opt.label === 'القياس'}  // le label qias est fixe
                  />
                  {opt.label !== 'القياس' && (
                    <button onClick={() => setOptions(p => p.filter((_,i) => i !== oi))}
                      style={{ background:'rgba(239,68,68,0.15)', border:'1px solid #ef4444', color:'#ef4444', width:'36px', borderRadius:'10px', cursor:'pointer' }}>
                      🗑
                    </button>
                  )}
                </div>

                {/* Choix existants */}
                <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom:'10px' }}>
                  {opt.choices.map((ch, ci) => (
                    <div key={ci} style={{ display:'flex', alignItems:'center', gap:'8px', background:'rgba(232,184,0,0.08)', border:`1px solid rgba(232,184,0,0.2)`, borderRadius:'10px', padding:'8px 12px' }}>
                      <span style={{ flex:1, color:'#E8B800', fontSize:'0.85rem', fontWeight:700 }}>
                        {ch.name} {ch.auto && <span style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.4)' }}>(تلقائي)</span>}
                      </span>
                      {opt.affects_price && (
                        <span style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.8rem' }}>{ch.price.toLocaleString()} دج</span>
                      )}
                      {!ch.auto && (
                        <button onClick={() => setOptions(p => p.map((o,i) => i===oi ? {...o, choices:o.choices.filter((_,j)=>j!==ci)} : o))}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(239,68,68,0.7)', fontSize:'1rem', padding:0 }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Ajouter un choix */}
                <div style={{ display:'flex', gap:'6px' }}>
                  <input
                    value={opt.newChoice}
                    onChange={e => setOptions(p => p.map((o,i) => i===oi ? {...o, newChoice:e.target.value} : o))}
                    placeholder={opt.label === 'القياس' ? 'مثال: 17/24' : 'اسم الخيار'}
                    style={{ ...inp, flex:2, fontSize:'16px' }}
                  />
                  {opt.affects_price && (
                    <input
                      type="number"
                      value={opt.newPrice || ''}
                      onChange={e => setOptions(p => p.map((o,i) => i===oi ? {...o, newPrice:Number(e.target.value)} : o))}
                      onWheel={e => e.currentTarget.blur()}
                      placeholder="السعر الكلي دج"
                      style={{ ...inp, flex:1, fontSize:'16px' }}
                    />
                  )}
                  <button onClick={() => {
                    if (!opt.newChoice.trim()) return
                    const price = opt.affects_price ? (opt.newPrice || 0) : 0
                    setOptions(p => p.map((o,i) => i===oi
                      ? {...o, choices:[...o.choices, {name:o.newChoice.trim(), price}], newChoice:'', newPrice:0}
                      : o
                    ))
                  }} style={{ background:'rgba(39,174,96,0.15)', border:'1px solid #27ae60', color:'#27ae60', padding:'8px 12px', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit', fontWeight:700, fontSize:'0.8rem', whiteSpace:'nowrap' }}>
                    + إضافة
                  </button>
                </div>

                {/* Pour le qias : bouton pour ajouter le prix du livre automatiquement */}
                {opt.label === 'القياس' && opt.choices.length === 0 && (
                  <div style={{ marginTop:'8px', padding:'8px', background:'rgba(232,184,0,0.05)', borderRadius:'8px', fontSize:'0.78rem', color:'rgba(255,255,255,0.5)' }}>
                    💡 اكتب القياس الموجود في الحقل أعلاه وأدخل سعر الكتاب
                  </div>
                )}
              </div>
            ))}
            </div>

            {/* Bestseller */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'rgba(232,184,0,0.06)', border: '1.5px solid rgba(232,184,0,0.15)', borderRadius: '10px', padding: '12px 14px' }}>
                <input type="checkbox" checked={form.bestseller || false} onChange={e => setForm(p => ({ ...p, bestseller: e.target.checked }))} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#E8B800' }} />
                <span style={{ color: '#FFF8E7', fontSize: '14px', fontWeight: 600 }}>الإضافة إلى الجديد و الحصري"</span>
              </label>
            </div>

            {/* Livraison gratuite */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'rgba(232,184,0,0.06)', border: '1.5px solid rgba(232,184,0,0.15)', borderRadius: '10px', padding: '12px 14px' }}>
                <input type="checkbox" checked={form.free_delivery || false} onChange={e => setForm(p => ({ ...p, free_delivery: e.target.checked }))} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#E8B800' }} />
                <span style={{ color: '#FFF8E7', fontSize: '14px', fontWeight: 600 }}>🚚 توصيل مجاني لهذا الكتاب</span>
              </label>
            </div>
            
            {/* Achat en gros */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'rgba(37,211,102,0.06)', border: '1.5px solid rgba(37,211,102,0.2)', borderRadius: '10px', padding: '12px 14px' }}>
                <input type="checkbox" checked={form.wholesale_available || false} onChange={e => setForm(p => ({ ...p, wholesale_available: e.target.checked }))} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#25D366' }} />
                <span style={{ color: '#FFF8E7', fontSize: '14px', fontWeight: 600 }}>📦 متاح للشراء بالجملة (يظهر زر واتساب)</span>
              </label>
            </div>

            {/* Offres groupées */}
            <div style={{ marginBottom: '14px' }}>
              <button type="button" onClick={() => setShowBundleModal(true)} style={{ width: '100%', padding: '12px 14px', background: 'rgba(232,184,0,0.06)', border: '1.5px solid rgba(232,184,0,0.15)', borderRadius: '10px', cursor: 'pointer', color: '#FFF8E7', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>📦</span>
                <span>إدارة العروض المجمعة ({bundles.length} عرض)</span>
              </button>
            </div>

            <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '15px', background: saving ? 'rgba(184,134,11,0.4)' : 'linear-gradient(135deg, #5C3A1E, #B8860B)', border: 'none', borderRadius: '12px', color: '#FFF8E7', fontSize: '15px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: saving ? 'none' : '0 6px 20px rgba(184,134,11,0.3)' }}>
              {saving ? `⏳ Enregistrement${newFiles.length > 0 ? ` (${uploadProgress}%)` : '...'}` : '✅ Enregistrer'}
            </button>
          </div>

          <style>{`
            @media (min-width: 641px) {
              .modal-overlay { align-items: center !important; }
              .modal-sheet { border-radius: 24px !important; margin: 20px; }
            }
              .books-grid { content-visibility: auto; contain-intrinsic-size: 1px 3000px; }
          `}</style>
        </div>
      )}
    </div>
  )
}
