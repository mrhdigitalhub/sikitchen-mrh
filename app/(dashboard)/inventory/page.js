"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function GabunganInventoryMenuResepFinal() {
  // ===== TAB =====
  const [activeTab, setActiveTab] = useState('menu') // inventory | menu

  // ===== INVENTORY STATES (SEARCH 200) =====
  const [items, setItems] = useState([])
  const [kategoris, setKategoris] = useState([])
  const [loading, setLoading] = useState(true)
  const [kodePreview, setKodePreview] = useState('')
  const [debugMsg, setDebugMsg] = useState('')
  const [isExistingBahan, setIsExistingBahan] = useState(false)
  const [existingData, setExistingData] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ nama_bahan: '', kategori: 'Bahan Pokok', sub_kategori: '', satuan: 'Kg', stok_tambahan: '', stok_minimum: '5', supplier_nama: '', supplier_wa: '', harga_lama: '', harga_baru: '' })
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showDeleteCart, setShowDeleteCart] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterKategori, setFilterKategori] = useState('Semua')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 50
  const [csvPreview, setCsvPreview] = useState([])
  const [csvFull, setCsvFull] = useState([])
  const [csvUploading, setCsvUploading] = useState(false)

  // ===== MENU & RESEP STATES =====
  const [menus, setMenus] = useState([])
  const [recipes, setRecipes] = useState([])
  const [showMenuForm, setShowMenuForm] = useState(false)
  const [menuForm, setMenuForm] = useState({ name: '', description: '', base_porsi: 50, harga_jual: 25000, kategori_menu: 'Nasi Kotak' })
  const [selectedMenu, setSelectedMenu] = useState(null)
  const [newRecipe, setNewRecipe] = useState({ inventory_item_id: '', qty_per_porsi: '' })
  const [searchBahanMenu, setSearchBahanMenu] = useState('') // search 200 untuk pilih bahan di menu

  const kategoriList9 = ['Bahan Pokok','Protein Hewani','Protein Nabati','Sayuran','Bumbu Segar','Bumbu Instan','Saos & Cairan','Pelengkap & garnish','Kemasan /Packing']
  const kategoriKodeMap = {'Bahan Pokok':'POK','Protein Hewani':'HEW','Protein Nabati':'NAB','Sayuran':'SAY','Bumbu Segar':'BSG','Bumbu Instan':'BIN','Saos & Cairan':'SAO','Pelengkap & garnish':'PLG','Kemasan /Packing':'KEM'}
  const namaUmumMap = {
    'beras':'Beras putih', 'beras putih':'Beras putih', 'beras premium':'Beras putih', 'beras pulen':'Beras putih',
    'ayam':'Ayam Potong', 'ayam potong':'Ayam Potong',
    'minyak':'Minyak Goreng', 'minyak goreng':'Minyak Goreng',
    'tempe':'Tempe Kedelai', 'tempe kedelai':'Tempe Kedelai',
    'tahu':'Tahu Kedelai', 'tahu kedelai':'Tahu Kedelai',
  }

  function normalizeNama(str){ return (str||'').toLowerCase().trim().replace(/\s+/g,' ').replace(/[^a-z0-9 ]/g,'') }
  function getNamaUmum(str){ const n = normalizeNama(str); return namaUmumMap[n] || str.trim() }
  function isMirip(a,b){
    const an = normalizeNama(a), bn = normalizeNama(b)
    const au = normalizeNama(getNamaUmum(a)), bu = normalizeNama(getNamaUmum(b))
    if(au===bu) return true
    if(an.includes(bn) || bn.includes(an)) return true
    const ka = an.split(' ')[0], kb = bn.split(' ')[0]
    if(ka===kb && ka.length>=3) return true
    return false
  }
  function getNextSmartKode(kategori, existingItems){
    const kodeKat = kategoriKodeMap[kategori] || 'GEN'
    const prefix = `BHN-${kodeKat}-`
    const nums = existingItems.filter(it => (it.kode_bahan||'').startsWith(prefix)).map(it => {
      const m = (it.kode_bahan||'').match(new RegExp(`^BHN-${kodeKat}-(\\d+)`))
      return m ? parseInt(m[1],10) : 0
    })
    const maxNum = nums.length ? Math.max(...nums) : 0
    return `${prefix}${String(nextNum(maxNum)).padStart(3,'0')}`
    function nextNum(n){return n+1}
  }

  async function loadAll() {
    setLoading(true)
    const { data: kat } = await supabase.from('kategori_bahan').select('*').order('nama')
    if (kat && kat.length>0) setKategoris(kat); else setKategoris(kategoriList9.map(n=>({nama:n})))
    const { data: inv } = await supabase.from('inventory_items').select('*').order('nama_bahan').limit(500)
    const { data: m } = await supabase.from('menus').select('*').order('name')
    const { data: rec } = await supabase.from('recipes').select('*, inventory_items(nama_bahan,name,unit,satuan,price_per_unit,harga_baru,kode_bahan), menus(name)').limit(1000)
    if(inv) setItems(inv)
    setMenus(m||[])
    setRecipes(rec||[])
    setLoading(false)
    setDebugMsg(`✅ GABUNGAN FINAL: ${inv?.length||0} bahan | ${m?.length||0} menu | ${rec?.length||0} resep | Kode Smart + Search200 + Flow Menu`)
    if(inv) setKodePreview(getNextSmartKode('Bahan Pokok', inv))
  }
  useEffect(()=>{ loadAll() }, [])

  useEffect(()=>{
    if(!isExistingBahan && form.kategori){
      setKodePreview(getNextSmartKode(form.kategori, items))
    }
  }, [form.kategori, items, isExistingBahan])

  const namaBahanOptions = useMemo(()=> [...new Set(items.map(it => it.nama_bahan||it.name).filter(Boolean))].sort(), [items])
  const selectedItems = useMemo(()=> items.filter(it => selectedIds.has(it.id)), [items, selectedIds])

  // FILTER SEARCH 200 - INVENTORY
  const filteredItems = useMemo(()=>{
    let filtered = items
    if(filterKategori !== 'Semua') filtered = filtered.filter(it => it.kategori === filterKategori)
    if(searchQuery.trim()){
      const q = normalizeNama(searchQuery)
      filtered = filtered.filter(it => {
        return normalizeNama(it.nama_bahan||it.name||'').includes(q) || normalizeNama(it.kode_bahan||'').includes(q) || normalizeNama(it.kategori||'').includes(q) || normalizeNama(it.supplier_nama||'').includes(q)
      })
    }
    return filtered
  }, [items, searchQuery, filterKategori])
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1
  const paginatedItems = useMemo(()=> filteredItems.slice((currentPage-1)*pageSize, currentPage*pageSize), [filteredItems, currentPage])
  useEffect(()=>{ setCurrentPage(1) }, [searchQuery, filterKategori])

  // FILTER SEARCH 200 - UNTUK PILIH BAHAN DI MENU
  const filteredBahanForMenu = useMemo(()=>{
    if(!searchBahanMenu.trim()) return items.slice(0,50) // tampil 50 pertama kalau belum search
    const q = normalizeNama(searchBahanMenu)
    return items.filter(it => {
      return normalizeNama(it.nama_bahan||it.name||'').includes(q) || normalizeNama(it.kode_bahan||'').includes(q) || normalizeNama(it.supplier_nama||'').includes(q)
    }).slice(0,50)
  }, [items, searchBahanMenu])

  function handleNamaBahanSelect(namaSelected){
    if(!namaSelected.trim()) return
    const found = items.find(it => isMirip(namaSelected, it.nama_bahan||it.name||''))
    if(found){
      setIsExistingBahan(true); setExistingData(found)
      setForm(prev=>({...prev, nama_bahan: found.nama_bahan||found.name||namaSelected, kategori: found.kategori||prev.kategori, sub_kategori: found.sub_kategori||'', satuan: found.satuan||found.unit||'Kg', stok_minimum: String(found.stok_minimum||found.min_stock||'5'), supplier_nama: found.supplier_nama||'', supplier_wa: found.supplier_wa||'', harga_lama: String(found.harga_baru||found.price_per_unit||''), harga_baru: '', stok_tambahan: ''}))
      setKodePreview(found.kode_bahan)
      setEditingId(found.id)
      setDebugMsg(`🔍 Duplikat 3 Lapis: "${namaSelected}" mirip "${found.nama_bahan}" | Supplier ${found.supplier_nama||'-'} → UPDATE`)
    } else {
      setIsExistingBahan(false); setExistingData(null); setEditingId(null)
      setKodePreview(getNextSmartKode(form.kategori, items))
    }
  }

  async function handleSubmit(e){
    e.preventDefault()
    if(!form.nama_bahan.trim()) return alert('Nama wajib')
    const namaUmum = getNamaUmum(form.nama_bahan)
    const foundMirip = items.find(it => isMirip(form.nama_bahan, it.nama_bahan||it.name||''))
    let finalStok=0, finalHargaLama=0, targetId=editingId, kodeFinal=kodePreview, isUpdate=false
    if(foundMirip){
      isUpdate=true; targetId=foundMirip.id
      finalStok = Number(foundMirip.stok||0) + Number(form.stok_tambahan||0)
      finalHargaLama = Number(foundMirip.harga_baru||0)
      kodeFinal = foundMirip.kode_bahan
    } else {
      finalStok = Number(form.stok_tambahan)||0
      finalHargaLama = Number(form.harga_lama)||0
    }
    const payload = { kode_bahan: kodeFinal, nama_bahan: namaUmum.trim(), name: namaUmum.trim(), kategori: form.kategori, sub_kategori: form.sub_kategori||null, satuan: form.satuan, unit: form.satuan, stok: finalStok, stock_qty: finalStok, stok_minimum: Number(form.stok_minimum)||5, min_stock: Number(form.stok_minimum)||5, supplier_nama: form.supplier_nama||null, supplier_wa: form.supplier_wa||null, harga_lama: finalHargaLama, harga_baru: form.harga_baru?Number(form.harga_baru):finalHargaLama, price_per_unit: form.harga_baru?Number(form.harga_baru):finalHargaLama, perusahaan: 'SIKITCHEN-MRH', status: 'Aktif' }
    let data, error
    if(isUpdate && targetId){ const res = await supabase.from('inventory_items').update(payload).eq('id', targetId).select().single(); data=res.data; error=res.error }
    else { const res = await supabase.from('inventory_items').insert(payload).select().single(); data=res.data; error=res.error }
    if(error) return alert('❌ '+error.message)
    alert(`✅ ${isUpdate?'UPDATE':'SIMPAN'}: ${data.nama_bahan} | ${data.kode_bahan} | Stock ${finalStok}`)
    const katTetap=form.kategori, supNama=form.supplier_nama, supWa=form.supplier_wa
    setForm({ nama_bahan:'', kategori:katTetap, sub_kategori:'', satuan:'Kg', stok_tambahan:'', stok_minimum:'5', supplier_nama:supNama, supplier_wa:supWa, harga_lama:'', harga_baru:'' })
    setIsExistingBahan(false); setExistingData(null); setEditingId(null); loadAll()
  }

  function parseCSVLine(line, delimiter){
    const result = []; let current = ''; let inQuotes = false
    for(let i=0;i<line.length;i++){ const c=line[i]; if(c==='"'){ inQuotes=!inQuotes } else if(c===delimiter && !inQuotes){ result.push(current.trim()); current='' } else { current+=c } }
    result.push(current.trim()); return result.map(v=>v.replace(/^"|"$/g,'').trim())
  }
  function handleCsvFile(e){
    const file = e.target.files[0]; if(!file) return
    const reader = new FileReader()
    reader.onload = (ev)=>{
      const text = ev.target.result; const lines = text.split(/\r?\n/).filter(l=>l.trim()); if(lines.length<2){ alert('CSV kosong'); return }
      const firstLine = lines[0]; const delimiter = firstLine.includes(';') ? ';' : ','
      const headers = parseCSVLine(firstLine, delimiter).map(h=>h.toLowerCase().replace(/"/g,'').trim())
      const full=[]
      for(let i=1;i<lines.length;i++){
        const vals = parseCSVLine(lines[i], delimiter)
        const obj = {}; headers.forEach((h, idx)=>{ obj[h]=vals[idx]||'' })
        obj.stok = Number(String(obj.stok||'0').replace(/[^0-9.-]/g,''))||0
        obj.stok_minimum = Number(String(obj.stok_minimum||'5').replace(/[^0-9.-]/g,''))||5
        obj.harga_baru = Number(String(obj.harga_baru||'0').replace(/[^0-9.-]/g,''))||0
        if(obj.nama_bahan){ full.push(obj) }
      }
      setCsvPreview(full.slice(0,10)); setCsvFull(full)
    }
    reader.readAsText(file, 'UTF-8')
  }
  async function uploadCsv(){
    if(csvFull.length===0) return
    if(!confirm(`Import ${csvFull.length} bahan?`)) return
    setCsvUploading(true)
    let ok=0
    const grouped={}
    csvFull.forEach(r=>{
      const umum = getNamaUmum(r.nama_bahan)
      const key = normalizeNama(umum)
      if(!grouped[key]) grouped[key]={...r, nama_bahan: umum, stok:0}
      grouped[key].stok+=r.stok
      if(r.harga_baru) grouped[key].harga_baru=r.harga_baru
    })
    for(const r of Object.values(grouped)){
      const existing = items.find(it => isMirip(r.nama_bahan, it.nama_bahan||it.name||''))
      const kode = existing ? existing.kode_bahan : getNextSmartKode(r.kategori||'Bahan Pokok', items)
      const payload = { kode_bahan: kode, nama_bahan: r.nama_bahan, name: r.nama_bahan, kategori: r.kategori||'Bahan Pokok', satuan: r.satuan||'Kg', unit: r.satuan||'Kg', stok: r.stok, stock_qty: r.stok, stok_minimum: r.stok_minimum||5, min_stock: r.stok_minimum||5, harga_baru: r.harga_baru||0, price_per_unit: r.harga_baru||0, perusahaan: 'SIKITCHEN-MRH', status: 'Aktif' }
      if(existing){
        const newStok = Number(existing.stok||0)+Number(r.stok||0)
        await supabase.from('inventory_items').update({ stok: newStok, stock_qty: newStok }).eq('id', existing.id)
        ok++
      } else {
        const { error } = await supabase.from('inventory_items').insert(payload)
        if(!error) ok++
      }
    }
    alert(`✅ Import ${ok} bahan!`); setCsvPreview([]); setCsvFull([]); setCsvUploading(false); loadAll()
  }

  function toggleSelect(id){
    const next = new Set(selectedIds)
    if(next.has(id)) next.delete(id); else next.add(id)
    setSelectedIds(next); setShowDeleteCart(next.size>0)
  }
  function toggleSelectAllFiltered(){
    const ids = paginatedItems.map(it=>it.id)
    const allSelected = ids.every(id=>selectedIds.has(id))
    const next = new Set(selectedIds)
    if(allSelected) ids.forEach(id=>next.delete(id)); else ids.forEach(id=>next.add(id))
    setSelectedIds(next); setShowDeleteCart(next.size>0)
  }
  async function handleDeleteSelected(){
    if(selectedIds.size===0) return
    if(!confirm(`Hapus ${selectedIds.size} bahan? Pastikan tidak dipakai di Menu!`)) return
    const confirmText = prompt(`Ketik "HAPUS" untuk hapus ${selectedIds.size} bahan:`)
    if(confirmText !== 'HAPUS') return alert('Batal hapus')
    const { error } = await supabase.from('inventory_items').delete().in('id', Array.from(selectedIds))
    if(error) return alert('❌ '+error.message)
    alert(`✅ Hapus ${selectedIds.size} bahan!`); setSelectedIds(new Set()); setShowDeleteCart(false); loadAll()
  }

  // ===== MENU FUNCTIONS =====
  function getRecipesForMenu(menuId){ return recipes.filter(r => r.menu_id === menuId) }
  function calculateHPP(menuId){
    const rs = getRecipesForMenu(menuId)
    let total=0
    rs.forEach(r=>{
      const price = r.inventory_items?.harga_baru || r.inventory_items?.price_per_unit || 0
      total += Number(r.qty_per_porsi) * Number(price)
    })
    return total
  }
  async function createMenu(e){
    e.preventDefault()
    const { data, error } = await supabase.from('menus').insert({
      name: menuForm.name, description: menuForm.description,
      base_porsi: Number(menuForm.base_porsi), harga_jual_per_porsi: Number(menuForm.harga_jual),
      kategori_menu: menuForm.kategori_menu, perusahaan: 'SIKITCHEN-MRH'
    }).select().single()
    if(!error){ setMenuForm({ name:'', description:'', base_porsi:50, harga_jual:25000, kategori_menu:'Nasi Kotak' }); setShowMenuForm(false); loadAll() }
    else alert(error.message)
  }
  async function addRecipe(){
    if(!selectedMenu || !newRecipe.inventory_item_id || !newRecipe.qty_per_porsi) return alert('Lengkapi bahan & qty')
    // cek duplikat bahan di menu yang sama (3 lapis)
    const existingBahan = recipes.find(r => r.menu_id === selectedMenu.id && r.inventory_item_id === newRecipe.inventory_item_id)
    if(existingBahan) return alert('Bahan sudah ada di resep ini! Edit qty saja.')
    const { error } = await supabase.from('recipes').insert({
      menu_id: selectedMenu.id, inventory_item_id: newRecipe.inventory_item_id, qty_per_porsi: Number(newRecipe.qty_per_porsi), perusahaan: 'SIKITCHEN-MRH'
    })
    if(error) alert(error.message)
    else { setNewRecipe({ inventory_item_id:'', qty_per_porsi:'' }); setSearchBahanMenu(''); loadAll() }
  }
  async function deleteRecipe(id){ if(!confirm('Hapus bahan dari resep?')) return; await supabase.from('recipes').delete().eq('id', id); loadAll() }

  if(loading) return <div className="p-6">Loading GABUNGAN FINAL...</div>

  return (
    <div className="space-y-4">
      {/* HEADER + TAB */}
      <div className="bg-[#0A1931] text-white p-3 rounded-xl">
        <div className="font-bold text-sm">✅ Master Menu & Resep (Flow dari Inventori) - BARU! | Kode Smart BHN-KAT-001 | Search200 + 3 Lapis</div>
        <div className="text-[10px] bg-white/10 px-2 py-1 rounded mt-2">{debugMsg}</div>
        <div className="flex gap-2 mt-3">
          <button onClick={()=>setActiveTab('inventory')} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeTab==='inventory'?'bg-[#D4AF37] text-black':'bg-white/10 text-white'}`}>📦 Inventori Stok (Search 200)</button>
          <button onClick={()=>setActiveTab('menu')} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeTab==='menu'?'bg-[#D4AF37] text-black':'bg-white/10 text-white'}`}>🍱 Master Menu & Resep (Flow dari Inventori)</button>
        </div>
        <div className="text-[10px] text-yellow-300 mt-2">
          Flow: Inventori (9 Bahan Final) → Pilih Bahan di Menu → Input Takaran → HPP Auto → Simpan Resep → Stock auto kepotong saat order
        </div>
      </div>

      {/* TAB INVENTORY */}
      {activeTab==='inventory' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border-2 border-green-400 p-4">
            <div className="font-bold text-sm">📥 IMPORT CSV - 3 Lapis + Supplier + Kode Smart</div>
            <div className="flex gap-2 mt-3">
              <input type="file" accept=".csv" onChange={handleCsvFile} className="text-xs border-2 border-green-300 p-2 rounded-lg flex-1" />
              {csvFull.length>0 && <button onClick={uploadCsv} disabled={csvUploading} className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold">{csvUploading?'⏳':'✅ Import '+csvFull.length}</button>}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-xl border-2 border-[#D4AF37]/40 shadow-sm overflow-hidden">
            <div className="bg-[#FFF8E1] border-b px-4 py-2 flex justify-between text-[11px]"><span className="font-bold">{isExistingBahan?`🔄 UPDATE: ${existingData?.nama_bahan} | ${existingData?.stok||0}+${form.stok_tambahan||0}`:'✨ BARU - Kode Smart'}</span><span className={isExistingBahan?'bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full':'bg-green-100 text-green-700 px-2 py-0.5 rounded-full'}>{isExistingBahan?'UPDATE':'BARU'}</span></div>
            <div className="divide-y divide-slate-200">
              <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">1. Kode Smart</div></div><div className="px-4 py-2.5"><input className="w-full bg-slate-100 border p-2.5 rounded-lg text-sm font-mono font-bold" value={kodePreview} readOnly /></div></div>
              <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">2. Kategori * (9 Tetap)</div></div><div className="px-4 py-2.5"><select className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" value={form.kategori} onChange={e=>setForm({...form, kategori: e.target.value})} required>{kategoris.map(k=><option key={k.nama} value={k.nama}>{k.nama} ({kategoriKodeMap[k.nama]})</option>)}</select></div></div>
              <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">3. Nama Bahan * (3 Lapis Filter)</div></div><div className="px-4 py-2.5">
                <div className="flex gap-2">
                  <input list="namaBahanListFinal" className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" placeholder="Ketik → cek duplikat 3 lapis" value={form.nama_bahan} onChange={e=>{ setForm({...form, nama_bahan: e.target.value}); handleNamaBahanSelect(e.target.value)}} required />
                  <select className="border-2 border-[#D4AF37]/50 p-2.5 rounded-lg text-sm bg-yellow-50 font-bold min-w-[130px]" value="" onChange={e=>{ if(e.target.value){ setForm({...form, nama_bahan: e.target.value}); handleNamaBahanSelect(e.target.value) }}}>
                    <option value="">▼ Pilih ({namaBahanOptions.length})</option>
                    {namaBahanOptions.map(n=><option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <datalist id="namaBahanListFinal">{namaBahanOptions.map(n=><option key={n} value={n} />)}</datalist>
              </div></div>
              <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">4. Sub-Kategori</div></div><div className="px-4 py-2.5"><input className="w-full border p-2.5 rounded-lg text-sm bg-yellow-50" value={form.sub_kategori} onChange={e=>setForm({...form, sub_kategori: e.target.value})} /></div></div>
              <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">5. Satuan *</div></div><div className="px-4 py-2.5"><select className="w-full border p-2.5 rounded-lg text-sm" value={form.satuan} onChange={e=>setForm({...form, satuan: e.target.value})}><option>Kg</option><option>Ltr</option><option>Pcs</option><option>Buah</option><option>Ikat</option><option>Karung</option><option>Botol</option><option>Set</option></select></div></div>
              <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">6. Stock *</div></div><div className="px-4 py-2.5">{isExistingBahan?(<div className="flex gap-2 items-center"><span className="bg-slate-100 border px-3 py-2.5 rounded-lg text-sm font-bold">{existingData?.stok||0}</span><span>+</span><input type="number" className="flex-1 border-2 border-blue-300 p-2.5 rounded-lg text-sm" value={form.stok_tambahan} onChange={e=>setForm({...form, stok_tambahan: e.target.value})} /></div>):(<input type="number" className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" value={form.stok_tambahan} onChange={e=>setForm({...form, stok_tambahan: e.target.value})} required />)}</div></div>
              <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">7. Stock Minimum</div></div><div className="px-4 py-2.5"><input type="number" className="w-full border p-2.5 rounded-lg text-sm" value={form.stok_minimum} onChange={e=>setForm({...form, stok_minimum: e.target.value})} /></div></div>
              <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">8. Harga Baru *</div></div><div className="px-4 py-2.5"><input type="number" className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" value={form.harga_baru} onChange={e=>setForm({...form, harga_baru: e.target.value})} required={!isExistingBahan} /></div></div>
              <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">9. Supplier Nama (Kunci UPDATE)</div></div><div className="px-4 py-2.5"><input className="w-full border p-2.5 rounded-lg text-sm bg-green-50" value={form.supplier_nama} onChange={e=>setForm({...form, supplier_nama: e.target.value})} /></div></div>
              <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">10. Supplier WA</div></div><div className="px-4 py-2.5"><input className="w-full border p-2.5 rounded-lg text-sm bg-green-50" value={form.supplier_wa} onChange={e=>setForm({...form, supplier_wa: e.target.value})} /></div></div>
            </div>
            <div className="p-4 bg-[#0A1931] flex gap-3"><button type="submit" className="flex-1 bg-[#D4AF37] text-[#0A1931] font-bold px-4 py-3 rounded-xl text-sm">{isExistingBahan?`🔄 Update +${form.stok_tambahan||0}`:'💾 Simpan Kode Smart'}</button></div>
          </form>

          {showDeleteCart && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
              <div className="font-bold text-sm text-red-700">🗑️ Keranjang Hapus ({selectedIds.size})</div>
              <div className="text-[11px] mt-1">{selectedItems.map(it=>`${it.nama_bahan||it.name} (${it.kode_bahan})`).join(', ')}</div>
              <div className="flex gap-2 mt-3">
                <button onClick={handleDeleteSelected} className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold">🗑️ Delete All ({selectedIds.size})</button>
                <button onClick={()=>{setSelectedIds(new Set()); setShowDeleteCart(false)}} className="bg-slate-200 px-4 py-2 rounded-lg text-xs">Batal</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-[#0A1931] text-white px-4 py-2.5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <span className="text-xs">📋 Tabel {filteredItems.length}/{items.length} bahan - Siap pakai untuk Menu!</span>
                <div className="flex gap-2">
                  <input type="text" placeholder="🔍 Search 200: nama / kode / supplier..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs text-black w-[220px] md:w-[280px] border" />
                  <select value={filterKategori} onChange={e=>setFilterKategori(e.target.value)} className="px-2 py-1.5 rounded-lg text-xs text-black border">
                    <option value="Semua">Semua Kategori</option>
                    {kategoriList9.map(k=><option key={k} value={k}>{k} ({kategoriKodeMap[k]})</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-100"><tr><th className="p-2.5"><input type="checkbox" checked={paginatedItems.length>0 && paginatedItems.every(it=>selectedIds.has(it.id))} onChange={toggleSelectAllFiltered} /></th><th className="p-2.5 text-left">Kode Smart</th><th className="p-2.5 text-left">Nama</th><th className="p-2.5 text-left">Kategori</th><th className="p-2.5 text-left">Supplier</th><th className="p-2.5 text-center">Stock</th><th className="p-2.5 text-right">Harga</th></tr></thead>
                <tbody>{paginatedItems.map(it=><tr key={it.id} className={`border-b ${selectedIds.has(it.id)?'bg-red-50':''}`}><td className="p-2.5 text-center"><input type="checkbox" checked={selectedIds.has(it.id)} onChange={()=>toggleSelect(it.id)} /></td><td className="p-2.5 font-mono text-[11px] font-bold text-blue-700">{it.kode_bahan||'-'}</td><td className="p-2.5 font-bold">{it.nama_bahan||it.name}</td><td className="p-2.5">{it.kategori} <span className="text-[10px] bg-slate-100 px-1 rounded">{kategoriKodeMap[it.kategori]||''}</span></td><td className="p-2.5 text-[11px]">{it.supplier_nama||'-'}</td><td className="p-2.5 text-center">{it.stok||0} {it.satuan}</td><td className="p-2.5 text-right">Rp {(it.harga_baru||0).toLocaleString('id-ID')}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="bg-slate-50 px-4 py-2.5 flex justify-between items-center text-xs">
              <div>Menampilkan {paginatedItems.length} dari {filteredItems.length} (total {items.length})</div>
              <div className="flex gap-1">
                <button onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1} className="px-3 py-1 border rounded bg-white disabled:opacity-30">‹ Prev</button>
                <span className="px-2 py-1">{currentPage}/{totalPages}</span>
                <button onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages} className="px-3 py-1 border rounded bg-white disabled:opacity-30">Next ›</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB MENU & RESEP */}
      {activeTab==='menu' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border-2 border-[#D4AF37]/40 p-4">
            <div className="font-bold text-sm">📋 Flow Inventori → Menu & Resep - 9 Bahan Final Siap Pakai!</div>
            <div className="text-[11px] text-slate-600 mt-1">
              1. Pilih Menu → 2. Search bahan dari Inventori (Kode Smart BHN-KAT-001) → 3. Input Takaran/Porsi → 4. HPP Auto Hitung → 5. Simpan
            </div>
            <div className="text-[11px] text-green-700 bg-green-50 p-2 rounded mt-2">
              ✅ Inventori {items.length} bahan dengan Kode Smart sudah load. Search bahan di bawah pakai nama/kode/supplier (siap 200 bahan!)
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div><h2 className="font-bold text-[#0A1931]">Master Menu ({menus.length} menu)</h2><p className="text-[11px] text-slate-500">HPP = SUM(qty_per_porsi × harga_bahan_live dari Inventori)</p></div>
            <button onClick={()=>setShowMenuForm(!showMenuForm)} className="bg-[#0A1931] text-white px-4 py-2 rounded-xl text-xs">{showMenuForm?'Tutup':'+ Menu Baru'}</button>
          </div>

          {showMenuForm && (
            <form onSubmit={createMenu} className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
              <input className="w-full border p-2.5 rounded-lg text-sm" placeholder="Nama Menu - misal Nasi Ayam Bakar Komplit" value={menuForm.name} onChange={e=>setMenuForm({...menuForm, name: e.target.value})} required />
              <textarea className="w-full border p-2.5 rounded-lg text-sm" placeholder="Deskripsi menu" value={menuForm.description} onChange={e=>setMenuForm({...menuForm, description: e.target.value})} />
              <div className="grid grid-cols-3 gap-3">
                <label className="text-xs">Base Porsi<input type="number" className="w-full border p-2 rounded-lg mt-1 text-sm" value={menuForm.base_porsi} onChange={e=>setMenuForm({...menuForm, base_porsi: e.target.value})} /></label>
                <label className="text-xs">Harga Jual / Porsi<input type="number" className="w-full border p-2 rounded-lg mt-1 text-sm" value={menuForm.harga_jual} onChange={e=>setMenuForm({...menuForm, harga_jual: e.target.value})} /></label>
                <label className="text-xs">Kategori<select className="w-full border p-2 rounded-lg mt-1 text-sm" value={menuForm.kategori_menu} onChange={e=>setMenuForm({...menuForm, kategori_menu: e.target.value})}><option>Nasi Kotak</option><option>Nasi Box</option><option>Snack Box</option><option>Tumpeng</option><option>Prasmanan</option></select></label>
              </div>
              <button type="submit" className="bg-[#D4AF37] text-[#0A1931] font-bold px-4 py-2 rounded-xl text-sm">Simpan Menu</button>
            </form>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {menus.map(menu=>{
              const hpp = calculateHPP(menu.id)
              const profit = Number(menu.harga_jual_per_porsi) - hpp
              const isSelected = selectedMenu?.id === menu.id
              return (
                <div key={menu.id} className={`bg-white rounded-xl border shadow-sm p-4 ${isSelected?'ring-2 ring-[#D4AF37]':''}`}>
                  <div className="flex justify-between"><h3 className="font-bold text-sm">{menu.name}</h3><span className="text-[10px] bg-slate-100 px-2 py-1 rounded-full">{menu.base_porsi} porsi</span></div>
                  <p className="text-[11px] text-slate-500 mt-1">{menu.description}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                    <div className="bg-slate-50 p-2 rounded-lg"><div className="text-slate-500">HPP / Porsi</div><div className="font-bold text-[#0A1931]">Rp {hpp.toLocaleString('id-ID')}</div></div>
                    <div className="bg-slate-50 p-2 rounded-lg"><div className="text-slate-500">Jual / Porsi</div><div className="font-bold">Rp {Number(menu.harga_jual_per_porsi).toLocaleString('id-ID')}</div></div>
                    <div className={`${profit>=0?'bg-green-50 text-green-700':'bg-red-50 text-red-700'} p-2 rounded-lg`}><div>Profit</div><div className="font-bold">Rp {profit.toLocaleString('id-ID')}</div></div>
                  </div>
                  <div className="mt-3"><div className="text-[11px] font-semibold mb-1">Resep per porsi (dari Inventori {items.length} bahan):</div>
                    {getRecipesForMenu(menu.id).length===0 ? <div className="text-[11px] text-slate-400">Belum ada resep</div> :
                    getRecipesForMenu(menu.id).map(r=>(
                      <div key={r.id} className="flex justify-between text-[11px] py-1 border-b last:border-0">
                        <span><b>{r.inventory_items?.kode_bahan||''}</b> {r.inventory_items?.nama_bahan||r.inventory_items?.name} - {r.qty_per_porsi} {r.inventory_items?.satuan} @ Rp {Number(r.inventory_items?.harga_baru||0).toLocaleString('id-ID')}</span>
                        <button onClick={()=>deleteRecipe(r.id)} className="text-red-500 ml-2">x</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={()=>setSelectedMenu(menu)} className="mt-3 w-full text-[11px] bg-[#0A1931] text-white py-2 rounded-lg">Kelola Resep {isSelected?'✓':''}</button>
                </div>
              )
            })}
          </div>

          {selectedMenu && (
            <div className="bg-white p-4 rounded-xl border-2 border-[#D4AF37]/50 shadow-sm">
              <h4 className="font-bold text-sm mb-2">Tambah Bahan untuk: {selectedMenu.name} (dari {items.length} bahan Inventori)</h4>
              <div className="flex flex-col md:flex-row gap-2">
                <div className="flex-1">
                  <input type="text" placeholder="🔍 Search 200: ketik nama / kode smart / supplier..." value={searchBahanMenu} onChange={e=>setSearchBahanMenu(e.target.value)} className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-xs mb-2" />
                  <select className="w-full border p-2.5 rounded-lg text-xs" value={newRecipe.inventory_item_id} onChange={e=>setNewRecipe({...newRecipe, inventory_item_id: e.target.value})}>
                    <option value="">Pilih Bahan Baku ({filteredBahanForMenu.length} hasil search)</option>
                    {filteredBahanForMenu.map(inv => <option key={inv.id} value={inv.id}>{inv.kode_bahan} - {inv.nama_bahan||inv.name} - Stock {inv.stok||0} {inv.satuan} - Rp {Number(inv.harga_baru||0).toLocaleString('id-ID')} / {inv.satuan} - {inv.supplier_nama||''}</option>)}
                  </select>
                  <div className="text-[10px] text-slate-500 mt-1">Search kosong = tampil 50 bahan pertama | Ketik "POK" = Bahan Pokok, "HEW" = Hewani, "jaya" = supplier</div>
                </div>
                <div className="flex gap-2">
                  <input type="number" step="0.0001" placeholder="Qty / porsi" className="w-32 border p-2.5 rounded-lg text-xs" value={newRecipe.qty_per_porsi} onChange={e=>setNewRecipe({...newRecipe, qty_per_porsi: e.target.value})} />
                  <button onClick={addRecipe} className="bg-[#D4AF37] text-[#0A1931] font-bold px-4 py-2.5 rounded-lg text-xs">+ Tambah</button>
                </div>
              </div>
              <div className="mt-3 bg-slate-50 p-2 rounded-lg text-[11px]">
                <div className="font-bold">Flow setelah tambah bahan:</div>
                <div>1. Bahan dipilih dari Inventori {items.length} dengan Kode Smart → 2. Qty per porsi diinput → 3. HPP menu auto hitung (qty × harga_baru live) → 4. Saat ada order, stock Inventori auto kepotong</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
