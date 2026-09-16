"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function InventoryPerbaikan12WideBox() {
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

  // ✅ 9 KATEGORI TETAP LOCK
  const kategoriList9 = ['Bahan Pokok','Protein Hewani','Protein Nabati','Sayuran','Bumbu Segar','Bumbu Instan','Saos & Cairan','Pelengkap & garnish','Kemasan /Packing']
  const kategoriKodeMap = {'Bahan Pokok':'POK','Protein Hewani':'HEW','Protein Nabati':'NAB','Sayuran':'SAY','Bumbu Segar':'BSG','Bumbu Instan':'BIN','Saos & Cairan':'SAO','Pelengkap & garnish':'PLG','Kemasan /Packing':'KEM'}
  
  // ✅ MASTER BAHAN JAWA - untuk dropdown per kategori
  const masterBahanJawa = {
    'Bahan Pokok': ['Beras putih','Beras merah','Beras ketan','Jagung manis','Tepung terigu','Tepung beras','Gula pasir','Gula merah','Gula jawa','Minyak goreng curah','Tepung tapioka','Beras porang','Jagung pipil'],
    'Protein Hewani': ['Ayam Potong','Ayam Kampung','Daging Sapi','Daging Kambing','Telur Ayam','Telur Bebek','Ikan Lele','Ikan Nila','Ikan Bandeng','Ikan Tongkol','Udang','Cumi','Ati Ampela','Daging Ayam Fillet','Ikan Teri'],
    'Protein Nabati': ['Tempe Kedelai','Tahu Kedelai','Tahu Kulit','Oncom','Kacang Tanah','Kacang Hijau','Kacang Kedelai','Kacang Merah'],
    'Sayuran': ['Bayam','Kangkung','Sawi Hijau','Kol','Wortel','Buncis','Kacang Panjang','Labu Siam','Terong','Timun','Tomat','Kentang','Daun Singkong','Petai','Jengkol','Nangka Muda','Tauge','Jamur Tiram','Daun Jeruk','Daun Salam'],
    'Bumbu Segar': ['Bawang Merah','Bawang Putih','Cabe Merah Besar','Cabe Rawit','Cabe Keriting','Jahe','Kunyit','Kencur','Lengkuas','Serai','Daun Salam','Daun Jeruk','Kemiri','Ketumbar','Merica','Pala','Asam Jawa','Belimbing Wuluh','Kunyit','Salam'],
    'Bumbu Instan': ['Kaldu Ayam','Kaldu Sapi','Bumbu Gulai Instan','Bumbu Opor Instan','Bumbu Rendang Instan','Terasi','Bumbu Soto Instan'],
    'Saos & Cairan': ['Kecap Manis','Kecap Asin','Saus Tiram','Saus Tomat','Saus Sambal','Minyak Goreng','Minyak Wijen','Santan Kara','Santan Segar','Cuka'],
    'Pelengkap & garnish': ['Bawang Goreng','Kerupuk Udang','Kerupuk Kampung','Emping','Kacang Goreng','Sambal Terasi','Lalapan','Acar'],
    'Kemasan /Packing': ['Box Nasi Sekat 3','Box Nasi Sekat 4','Dus Snack','Plastik Mika','Sendok Plastik','Tisu','Stiker']
  }

  const namaUmumMap = {
    'beras':'Beras putih', 'beras putih':'Beras putih', 'beras premium':'Beras putih',
    'ayam':'Ayam Potong', 'ayam potong':'Ayam Potong',
    'minyak':'Minyak Goreng', 'minyak goreng':'Minyak Goreng',
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
    return `${prefix}${String(maxNum+1).padStart(3,'0')}`
  }

  async function load() {
    setLoading(true)
    // ✅ LOCK 9 KATEGORI
    setKategoris(kategoriList9.map(n=>({nama:n})))
    const { data: inv } = await supabase.from('inventory_items').select('*').order('nama_bahan').limit(500)
    if(inv){ setItems(inv); setDebugMsg(`✅ PERBAIKAN 1+2 WIDE BOX: ${inv.length} bahan | 9 Kategori LOCK | Dropdown per Kategori + Kotak Diperlebar`) }
    setLoading(false)
    setKodePreview(getNextSmartKode('Bahan Pokok', items))
  }
  useEffect(()=>{ load() }, [])

  useEffect(()=>{
    if(!isExistingBahan && form.kategori){
      setKodePreview(getNextSmartKode(form.kategori, items))
    }
  }, [form.kategori, items, isExistingBahan])

  // ✅ FILTER NAMA BAHAN BY KATEGORI DIPILIH - untuk dropdown diperlebar
  const filteredNamaByKategori = useMemo(()=>{
    // Bahan dari DB yang kategori = form.kategori
    const dariDB = items.filter(it => it.kategori === form.kategori).map(it => it.nama_bahan||it.name)
    // Bahan dari master Jawa
    const dariMaster = masterBahanJawa[form.kategori] || []
    // Gabung unik
    const gabung = [...new Set([...dariDB, ...dariMaster])].sort()
    return gabung
  }, [items, form.kategori])

  const namaBahanOptionsAll = useMemo(()=> [...new Set(items.map(it => it.nama_bahan||it.name).filter(Boolean))].sort(), [items])
  const selectedItems = useMemo(()=> items.filter(it => selectedIds.has(it.id)), [items, selectedIds])

  const filteredItems = useMemo(()=>{
    let filtered = items
    if(filterKategori !== 'Semua') filtered = filtered.filter(it => it.kategori === filterKategori)
    if(searchQuery.trim()){
      const q = normalizeNama(searchQuery)
      filtered = filtered.filter(it => normalizeNama(it.nama_bahan||it.name||'').includes(q) || normalizeNama(it.kode_bahan||'').includes(q) || normalizeNama(it.supplier_nama||'').includes(q))
    }
    return filtered
  }, [items, searchQuery, filterKategori])

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1
  const paginatedItems = useMemo(()=> filteredItems.slice((currentPage-1)*pageSize, currentPage*pageSize), [filteredItems, currentPage])
  useEffect(()=>{ setCurrentPage(1) }, [searchQuery, filterKategori])

  function handleNamaBahanSelect(namaSelected){
    if(!namaSelected.trim()) return
    const found = items.find(it => isMirip(namaSelected, it.nama_bahan||it.name||''))
    if(found){
      setIsExistingBahan(true); setExistingData(found)
      setForm(prev=>({...prev, nama_bahan: found.nama_bahan||found.name||namaSelected, kategori: found.kategori||prev.kategori, sub_kategori: found.sub_kategori||'', satuan: found.satuan||found.unit||'Kg', stok_minimum: String(found.stok_minimum||'5'), supplier_nama: found.supplier_nama||'', supplier_wa: found.supplier_wa||'', harga_lama: String(found.harga_baru||''), harga_baru: '', stok_tambahan: ''}))
      setKodePreview(found.kode_bahan)
      setEditingId(found.id)
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
    let finalStok=0, targetId=editingId, kodeFinal=kodePreview, isUpdate=false
    if(foundMirip){ isUpdate=true; targetId=foundMirip.id; finalStok=Number(foundMirip.stok||0)+Number(form.stok_tambahan||0); kodeFinal=foundMirip.kode_bahan } else { finalStok=Number(form.stok_tambahan)||0 }
    const payload = { kode_bahan: kodeFinal, nama_bahan: namaUmum.trim(), name: namaUmum.trim(), kategori: form.kategori, sub_kategori: form.sub_kategori||null, satuan: form.satuan, unit: form.satuan, stok: finalStok, stock_qty: finalStok, stok_minimum: Number(form.stok_minimum)||5, min_stock: Number(form.stok_minimum)||5, supplier_nama: form.supplier_nama||null, supplier_wa: form.supplier_wa||null, harga_baru: form.harga_baru?Number(form.harga_baru):0, price_per_unit: form.harga_baru?Number(form.harga_baru):0, perusahaan: 'SIKITCHEN-MRH', status: 'Aktif' }
    let res
    if(isUpdate && targetId) res = await supabase.from('inventory_items').update(payload).eq('id', targetId).select().single()
    else res = await supabase.from('inventory_items').insert(payload).select().single()
    if(res.error) return alert(res.error.message)
    alert(`✅ ${isUpdate?'UPDATE':'SIMPAN'}: ${res.data.nama_bahan} | ${res.data.kode_bahan}`)
    setForm({ nama_bahan:'', kategori:form.kategori, sub_kategori:'', satuan:'Kg', stok_tambahan:'', stok_minimum:'5', supplier_nama:form.supplier_nama, supplier_wa:form.supplier_wa, harga_lama:'', harga_baru:'' })
    setIsExistingBahan(false); setExistingData(null); setEditingId(null); load()
  }

  function toggleSelect(id){ const next=new Set(selectedIds); if(next.has(id)) next.delete(id); else next.add(id); setSelectedIds(next); setShowDeleteCart(next.size>0) }
  function toggleSelectAllFiltered(){ const ids=paginatedItems.map(it=>it.id); const all=ids.every(id=>selectedIds.has(id)); const next=new Set(selectedIds); if(all) ids.forEach(id=>next.delete(id)); else ids.forEach(id=>next.add(id)); setSelectedIds(next); setShowDeleteCart(next.size>0) }
  async function handleDeleteSelected(){ if(!confirm(`Hapus ${selectedIds.size} bahan?`)) return; const c=prompt('Ketik HAPUS'); if(c!=='HAPUS') return; await supabase.from('inventory_items').delete().in('id', Array.from(selectedIds)); setSelectedIds(new Set()); setShowDeleteCart(false); load() }

  if(loading) return <div className="p-6">Loading WIDE BOX...</div>

  return (
    <div className="space-y-4">
      <div className="bg-[#0A1931] text-white p-3 rounded-xl">
        <div className="font-bold text-sm">✅ INVENTORY WIDE BOX - 9 Kategori LOCK + Dropdown per Kategori + Kotak Diperlebar</div>
        <div className="text-[10px] bg-white/10 px-2 py-1 rounded mt-2">{debugMsg}</div>
        <div className="text-[10px] text-green-300 mt-1">Kotak pilihan diperlebar 350px → 450px | Pilih Kategori = Bahan Pokok → Nama Bahan hanya Beras putih, Beras merah, Jagung (tidak semua 9)</div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border-2 border-[#D4AF37]/40 shadow-sm overflow-hidden">
        <div className="bg-[#FFF8E1] border-b px-4 py-2 flex justify-between text-[11px]"><span className="font-bold">{isExistingBahan?`🔄 UPDATE: ${existingData?.nama_bahan}`:'✨ BARU - Kode Smart Wide Box'}</span><span className={isExistingBahan?'bg-blue-100 text-blue-700 px-3 py-1 rounded-full':'bg-green-100 text-green-700 px-3 py-1 rounded-full'}>{isExistingBahan?'UPDATE':'BARU'}</span></div>
        <div className="divide-y divide-slate-200">
          {/* KODE SMART */}
          <div className="grid grid-cols-[280px_1fr]"><div className="bg-slate-50 px-5 py-4 border-r"><div className="font-bold text-sm">1. Kode Smart</div><div className="text-[11px] text-slate-500">Auto BHN-KAT-001</div></div><div className="px-5 py-3"><input className="w-full bg-slate-100 border-2 p-3.5 rounded-xl text-sm font-mono font-bold" value={kodePreview} readOnly /></div></div>
          
          {/* KATEGORI - DIPERLEBAR */}
          <div className="grid grid-cols-[280px_1fr]"><div className="bg-[#FFF8E1] px-5 py-4 border-r"><div className="font-bold text-sm">2. Kategori * (9 Tetap LOCK)</div><div className="text-[11px] text-green-600 font-bold mt-1">Hanya 9! Kotak diperlebar!</div></div><div className="px-5 py-3"><select className="w-full border-2 border-[#D4AF37]/50 p-4 rounded-xl text-sm font-bold bg-white min-h-[52px]" value={form.kategori} onChange={e=>setForm({...form, kategori: e.target.value})} required>{kategoris.map(k=><option key={k.nama} value={k.nama}>{k.nama} ({kategoriKodeMap[k.nama]}) - {masterBahanJawa[k.nama]?.length||0} pilihan bahan</option>)}</select></div></div>
          
          {/* NAMA BAHAN - DIPERLEBAR + FILTER BY KATEGORI */}
          <div className="grid grid-cols-[280px_1fr]"><div className="bg-[#FFF8E1] px-5 py-4 border-r"><div className="font-bold text-sm">3. Nama Bahan * (Dropdown per Kategori)</div><div className="text-[11px] text-blue-600 mt-1">Pilih {form.kategori} → {filteredNamaByKategori.length} pilihan<br/>Kotak diperlebar 450px!</div></div><div className="px-5 py-3">
            <div className="flex gap-3">
              <input list="namaBahanListWide" className="flex-1 border-2 border-[#D4AF37]/30 p-4 rounded-xl text-sm min-h-[52px]" placeholder={`Ketik bahan ${form.kategori} → cek duplikat 3 lapis`} value={form.nama_bahan} onChange={e=>{ setForm({...form, nama_bahan: e.target.value}); handleNamaBahanSelect(e.target.value)}} required />
              {/* KOTAK PILIHAN DIPERLEBAR dari 130px ke 350px */}
              <select className="border-2 border-[#D4AF37]/50 p-4 rounded-xl text-sm bg-yellow-50 font-bold min-w-[350px] max-w-[450px] min-h-[52px]" value="" onChange={e=>{ if(e.target.value){ setForm({...form, nama_bahan: e.target.value}); handleNamaBahanSelect(e.target.value) }}}>
                <option value="">▼ Pilih {form.kategori} ({filteredNamaByKategori.length} pilihan) - Kotak Lebar</option>
                {filteredNamaByKategori.map(n=><option key={n} value={n}>{n} - {form.kategori} ({kategoriKodeMap[form.kategori]})</option>)}
              </select>
            </div>
            <datalist id="namaBahanListWide">{filteredNamaByKategori.map(n=><option key={n} value={n} />)}</datalist>
            <div className="text-[11px] text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg">Contoh: Pilih Kategori <b>Bahan Pokok</b> → dropdown hanya muncul: Beras putih, Beras merah, Beras ketan, Jagung manis, Tepung terigu, Gula pasir (20 pilihan), bukan 9 bahan semua! | Pilih <b>Bumbu Segar</b> → Bawang Merah, Bawang Putih, Cabe, Jahe (30 pilihan)</div>
          </div></div>

          <div className="grid grid-cols-[280px_1fr]"><div className="bg-slate-50 px-5 py-4 border-r"><div className="font-bold text-sm">4. Sub-Kategori</div></div><div className="px-5 py-3"><input className="w-full border-2 p-4 rounded-xl text-sm bg-yellow-50 min-h-[52px]" placeholder="Contoh: Karbohidrat, Ayam, Daun" value={form.sub_kategori} onChange={e=>setForm({...form, sub_kategori: e.target.value})} /></div></div>
          <div className="grid grid-cols-[280px_1fr]"><div className="bg-[#FFF8E1] px-5 py-4 border-r"><div className="font-bold text-sm">5. Satuan *</div></div><div className="px-5 py-3"><select className="w-full border-2 p-4 rounded-xl text-sm min-h-[52px]" value={form.satuan} onChange={e=>setForm({...form, satuan: e.target.value})}><option>Kg</option><option>Ltr</option><option>Pcs</option><option>Buah</option><option>Ikat</option><option>Karung</option><option>Botol</option><option>Set</option></select></div></div>
          <div className="grid grid-cols-[280px_1fr]"><div className="bg-[#FFF8E1] px-5 py-4 border-r"><div className="font-bold text-sm">6. Stock *</div></div><div className="px-5 py-3">{isExistingBahan?(<div className="flex gap-3 items-center"><span className="bg-slate-100 border-2 px-5 py-4 rounded-xl text-sm font-bold min-w-[100px] text-center">{existingData?.stok||0}</span><span className="font-bold">+</span><input type="number" className="flex-1 border-2 border-blue-400 p-4 rounded-xl text-sm min-h-[52px]" value={form.stok_tambahan} onChange={e=>setForm({...form, stok_tambahan: e.target.value})} /></div>):(<input type="number" className="w-full border-2 border-[#D4AF37]/30 p-4 rounded-xl text-sm min-h-[52px]" placeholder="Masukkan stock awal" value={form.stok_tambahan} onChange={e=>setForm({...form, stok_tambahan: e.target.value})} required />)}</div></div>
          <div className="grid grid-cols-[280px_1fr]"><div className="bg-slate-50 px-5 py-4 border-r"><div className="font-bold text-sm">7. Stock Minimum</div></div><div className="px-5 py-3"><input type="number" className="w-full border-2 p-4 rounded-xl text-sm min-h-[52px]" value={form.stok_minimum} onChange={e=>setForm({...form, stok_minimum: e.target.value})} /></div></div>
          <div className="grid grid-cols-[280px_1fr]"><div className="bg-[#FFF8E1] px-5 py-4 border-r"><div className="font-bold text-sm">8. Harga Baru *</div></div><div className="px-5 py-3"><input type="number" className="w-full border-2 border-[#D4AF37]/30 p-4 rounded-xl text-sm min-h-[52px]" placeholder="Harga per satuan" value={form.harga_baru} onChange={e=>setForm({...form, harga_baru: e.target.value})} required={!isExistingBahan} /></div></div>
          <div className="grid grid-cols-[280px_1fr]"><div className="bg-slate-50 px-5 py-4 border-r"><div className="font-bold text-sm">9. Supplier Nama</div></div><div className="px-5 py-3"><input className="w-full border-2 p-4 rounded-xl text-sm bg-green-50 min-h-[52px]" placeholder="Nama supplier (kunci UPDATE kalau beda)" value={form.supplier_nama} onChange={e=>setForm({...form, supplier_nama: e.target.value})} /></div></div>
          <div className="grid grid-cols-[280px_1fr]"><div className="bg-slate-50 px-5 py-4 border-r"><div className="font-bold text-sm">10. Supplier WA</div></div><div className="px-5 py-3"><input className="w-full border-2 p-4 rounded-xl text-sm bg-green-50 min-h-[52px]" placeholder="WA supplier" value={form.supplier_wa} onChange={e=>setForm({...form, supplier_wa: e.target.value})} /></div></div>
        </div>
        <div className="p-5 bg-[#0A1931] flex gap-3"><button type="submit" className="flex-1 bg-[#D4AF37] text-[#0A1931] font-bold px-6 py-4 rounded-xl text-sm">{isExistingBahan?`🔄 Update +${form.stok_tambahan||0} (${form.kategori})`:'💾 Simpan Kode Smart Wide Box'}</button></div>
      </form>

      {showDeleteCart && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
          <div className="font-bold text-sm text-red-700">🗑️ Keranjang Hapus ({selectedIds.size})</div>
          <div className="text-[11px] mt-2">{selectedItems.map(it=>`${it.nama_bahan} (${it.kode_bahan})`).join(', ')}</div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleDeleteSelected} className="bg-red-600 text-white px-6 py-3 rounded-xl text-xs font-bold">🗑️ Delete All ({selectedIds.size})</button>
            <button onClick={()=>{setSelectedIds(new Set()); setShowDeleteCart(false)}} className="bg-slate-200 px-6 py-3 rounded-xl text-xs">Batal</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="bg-[#0A1931] text-white px-5 py-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <span className="text-sm font-bold">📋 Tabel {filteredItems.length}/{items.length} bahan - Wide Box - {debugMsg}</span>
            <div className="flex gap-3">
              <input type="text" placeholder="🔍 Search 200: nama / kode / supplier..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="px-4 py-2.5 rounded-xl text-sm text-black w-[320px] md:w-[400px] border-2" />
              <select value={filterKategori} onChange={e=>setFilterKategori(e.target.value)} className="px-4 py-2.5 rounded-xl text-sm text-black border-2 min-w-[200px]">
                <option value="Semua">Semua Kategori (9)</option>
                {kategoriList9.map(k=><option key={k} value={k}>{k} ({kategoriKodeMap[k]}) - {masterBahanJawa[k]?.length||0} bahan</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100"><tr><th className="p-3"><input type="checkbox" checked={paginatedItems.length>0 && paginatedItems.every(it=>selectedIds.has(it.id))} onChange={toggleSelectAllFiltered} /></th><th className="p-3 text-left">Kode Smart</th><th className="p-3 text-left">Nama</th><th className="p-3 text-left">Kategori</th><th className="p-3 text-left">Supplier</th><th className="p-3 text-center">Stock</th><th className="p-3 text-right">Harga</th></tr></thead>
            <tbody>{paginatedItems.map(it=><tr key={it.id} className={`border-b ${selectedIds.has(it.id)?'bg-red-50':''}`}><td className="p-3 text-center"><input type="checkbox" checked={selectedIds.has(it.id)} onChange={()=>toggleSelect(it.id)} /></td><td className="p-3 font-mono text-[12px] font-bold text-blue-700">{it.kode_bahan||'-'}</td><td className="p-3 font-bold">{it.nama_bahan||it.name}</td><td className="p-3">{it.kategori} <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full">{kategoriKodeMap[it.kategori]||''}</span></td><td className="p-3 text-[12px]">{it.supplier_nama||'-'}</td><td className="p-3 text-center">{it.stok||0} {it.satuan}</td><td className="p-3 text-right">Rp {(it.harga_baru||0).toLocaleString('id-ID')}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
