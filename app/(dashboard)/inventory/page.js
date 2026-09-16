"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function InventoryFixLangkah1_2_3_Button_SeragamKategori() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [kodePreview, setKodePreview] = useState('')
  const [form, setForm] = useState({ kategori: 'POK', namaKategori: 'Beras', subKategori: 'putih', satuan: 'Kg', stok: '50', stokMin: '5', harga: '15500', supplierNama: 'Toko Beras Utama', supplierWa: '081752323656' })
  const [searchQuery, setSearchQuery] = useState('')
  const [filterKategori, setFilterKategori] = useState('Semua')

  const [kategoriLabel, setKategoriLabel] = useState({'POK':'Bahan Pokok','HEW':'Protein Hewani','NAB':'Protein Nabati','SAY':'Sayuran','BSG':'Bumbu Segar','BIN':'Bumbu Instan','SAO':'Saos & Cairan','PLG':'Pelengkap & garnish','KEM':'Kemasan /Packing'})

  const [hierarchy, setHierarchy] = useState({
    'POK': { 'Beras': ['ketan','merah','porang','putih'], 'Jagung': ['Manis'], 'Tepung': ['Beras','Tapioka','Terigu'] },
    'HEW': { 'Ayam': ['Potong','Kampung','Fillet'], 'Daging': ['Sapi','Kambing'], 'Ikan Air Tawar': ['Lele','Nila','Bandeng'], 'Ikan Laut': ['Tongkol','Teri'], 'Seafood': ['Udang','Cumi'], 'Telur': ['Ayam','Bebek'], 'Jeroan': ['Ati Ampela'] },
    'NAB': { 'Olahan Kedelai': ['Tempe Kedelai','Tahu Kedelai','Tahu Kulit'], 'Kacang-kacangan': ['Tanah','Hijau','Kedelai','Merah'], 'Fermentasi': ['Oncom'] },
    'SAY': { 'Daun': ['Bayam','Kangkung','Sawi Hijau','Kol','Daun Singkong'], 'Polong': ['Buncis','Kacang Panjang','Petai','Jengkol'], 'Buah': ['Terong','Timun','Tomat','Labu Siam','Nangka Muda'], 'Umbi Akar': ['Wortel'], 'Umbi Batang': ['Kentang'], 'Tunas': ['Tauge'], 'Jamur': ['Jamur Tiram'], 'Daun Aromatik': ['Daun Jeruk','Daun Salam'] },
    'BSG': { 'Umbi Lapis': ['Bawang Merah','Bawang Putih'], 'Buah Pedas': ['Cabe Merah Besar','Cabe Rawit','Cabe Keriting'], 'Rimpang': ['Jahe','Kunyit','Kencur','Lengkuas'], 'Batang Aromatik': ['Serai'], 'Daun Aromatik': ['Daun Salam','Daun Jeruk'], 'Biji-bijian': ['Kemiri','Ketumbar','Merica','Pala'], 'Buah Asam': ['Asam Jawa','Belimbing Wuluh'] },
    'BIN': { 'Kaldu': ['Ayam','Sapi'], 'Bumbu Racik': ['Gulai','Opor','Rendang','Soto'], 'Fermentasi': ['Terasi'], 'Gula': ['Jawa','Merah','Pasir'] },
    'SAO': { 'Kecap': ['Manis','Asin'], 'Saus': ['Tiram','Tomat','Sambal'], 'Minyak': ['Goreng','Goreng Curah','Wijen'], 'Santan': ['Kara','Segar'], 'Cuka': ['Cuka'] },
    'PLG': { 'Kerupuk': ['Udang','Kampung','Emping'], 'Gorengan': ['Bawang Goreng','Kacang Goreng'], 'Sambal': ['Terasi'], 'Sayur Segar': ['Lalapan'], 'Acar': ['Acar'] },
    'KEM': { 'Box': ['Nasi Sekat 3','Nasi Sekat 4'], 'Dus': ['Snack'], 'Plastik': ['Mika'], 'Alat Makan': ['Sendok Plastik'], 'Tisu': ['Tisu'], 'Label': ['Stiker'] }
  })

  const [inputKategori, setInputKategori] = useState({ kode: '', label: '' })
  const [inputNama, setInputNama] = useState('')
  const [inputSub, setInputSub] = useState('')

  function formatKategori(kode){
    return `${kode} - ${kategoriLabel[kode]||kode}`
  }

  function getKode(kategori, currentItems){
    const prefix = `BHN-${kategori}-`
    const nums = currentItems.filter(it => (it.kode_bahan||'').startsWith(prefix)).map(it => { const m=(it.kode_bahan||'').match(new RegExp(`^BHN-${kategori}-(\\d+)`)); return m?parseInt(m[1],10):0 })
    return `${prefix}${String((nums.length?Math.max(...nums):0)+1).padStart(3,'0')}`
  }

  function parseNamaBahan(namaLengkap, kategori){
    const nama = (namaLengkap||'').trim()
    const hier = hierarchy[kategori] || {}
    for(const [namaKat, subList] of Object.entries(hier)){
      if(nama.toLowerCase().startsWith(namaKat.toLowerCase())){
        const sisa = nama.substring(namaKat.length).trim()
        if(sisa){
          const foundSub = subList.find(s=> sisa.toLowerCase().includes(s.toLowerCase())) || sisa
          return { namaBahan: namaKat, sub: foundSub }
        }
      }
    }
    const parts = nama.split(' ')
    if(parts.length >= 2){
      return { namaBahan: parts.slice(0,-1).join(' '), sub: parts[parts.length-1] }
    }
    return { namaBahan: nama, sub: '-' }
  }

  async function load(){
    setLoading(true)
    const { data } = await supabase.from('inventory_items').select('*').order('kode_bahan').limit(500)
    if(data) setItems(data)
    setLoading(false)
  }
  useEffect(()=>{ load() }, [])
  useEffect(()=>{ setKodePreview(getKode(form.kategori, items)) }, [form.kategori, items])

  const kategoriList = useMemo(()=> Object.keys(kategoriLabel).sort(), [kategoriLabel])
  const namaKategoriList = useMemo(()=> Object.keys(hierarchy[form.kategori]||{}).sort(), [hierarchy, form.kategori])
  const subKategoriList = useMemo(()=> hierarchy[form.kategori]?.[form.namaKategori] || [], [hierarchy, form.kategori, form.namaKategori])

  const filteredItems = useMemo(()=>{
    let f = items
    if(filterKategori !== 'Semua') f = f.filter(it => it.kategori === filterKategori)
    if(searchQuery) f = f.filter(it => (it.nama_bahan||'').toLowerCase().includes(searchQuery.toLowerCase()) || (it.kode_bahan||'').toLowerCase().includes(searchQuery.toLowerCase()))
    return f
  }, [items, searchQuery, filterKategori])

  async function handleSubmit(e){
    e.preventDefault()
    if(!form.namaKategori || !form.subKategori) return alert('Pilih Nama Bahan/Kategori dan Sub!')
    const namaLengkap = `${form.namaKategori} ${form.subKategori}`.trim()
    const existing = items.find(it => (it.nama_bahan||'').toLowerCase() === namaLengkap.toLowerCase())
    if(existing){
      const stokBaru = Number(existing.stok||0) + Number(form.stok||0)
      const payload = { stok: stokBaru, stock_qty: stokBaru, harga_baru: Number(form.harga)||existing.harga_baru||0, price_per_unit: Number(form.harga)||existing.price_per_unit||0, supplier_nama: form.supplierNama||existing.supplier_nama||null, supplier_wa: form.supplierWa||existing.supplier_wa||null, sub_kategori: form.subKategori, kategori: form.kategori, satuan: form.satuan, unit: form.satuan }
      const { error, data } = await supabase.from('inventory_items').update(payload).eq('id', existing.id).select().single()
      if(error) return alert(error.message)
      alert(`🔄 UPDATE: ${data.nama_bahan} stok ${existing.stok} + ${form.stok} = ${data.stok} | Kode tetap ${data.kode_bahan}`)
      load()
    } else {
      const payload = { kode_bahan: kodePreview, nama_bahan: namaLengkap, name: namaLengkap, kategori: form.kategori, sub_kategori: form.subKategori, satuan: form.satuan, unit: form.satuan, stok: Number(form.stok)||0, stock_qty: Number(form.stok)||0, stok_minimum: Number(form.stokMin)||5, min_stock: Number(form.stokMin)||5, harga_baru: Number(form.harga)||0, price_per_unit: Number(form.harga)||0, supplier_nama: form.supplierNama||null, supplier_wa: form.supplierWa||null, perusahaan: 'SIKITCHEN-MRH', status: 'Aktif' }
      const { error, data } = await supabase.from('inventory_items').insert(payload).select().single()
      if(error) return alert(error.message)
      alert(`✅ INSERT: ${data.nama_bahan} (${data.kode_bahan}) - ${formatKategori(data.kategori)} / ${form.namaKategori} / ${data.sub_kategori}`)
      load()
    }
  }

  // ✅ PERBAIKAN: Tombol Tambah/Delete di Langkah 1,2,3
  function addKategori(){
    const kode = inputKategori.kode.trim().toUpperCase()
    const label = inputKategori.label.trim()
    if(!kode || !label) return alert('Kode dan Label Kategori harus diisi! Contoh: POK dan Bahan Pokok')
    if(kategoriLabel[kode]) return alert('Kode kategori sudah ada!')
    setKategoriLabel(prev=>({...prev, [kode]: label}))
    setHierarchy(prev=>({...prev, [kode]: {}}))
    setInputKategori({ kode: '', label: '' })
    setForm(f=>({...f, kategori: kode, namaKategori: '', subKategori: ''}))
  }
  function deleteKategori(){
    const kode = form.kategori
    if(Object.keys(kategoriLabel).length <= 1) return alert('Minimal 1 kategori harus ada!')
    if(!confirm(`Hapus Kategori ${formatKategori(kode)}? Semua Nama Bahan & Sub di dalamnya akan hilang!`)) return
    const newLabel = {...kategoriLabel}
    delete newLabel[kode]
    const newHier = {...hierarchy}
    delete newHier[kode]
    setKategoriLabel(newLabel)
    setHierarchy(newHier)
    const first = Object.keys(newLabel)[0]
    setForm(f=>({...f, kategori: first, namaKategori: '', subKategori: ''}))
  }

  function addNamaKategori(){
    const v = inputNama.trim()
    if(!v) return alert('Nama Bahan/Kategori harus diisi!')
    if(hierarchy[form.kategori][v]) return alert('Sudah ada!')
    setHierarchy(prev=>({...prev, [form.kategori]: {...prev[form.kategori], [v]: []}}))
    setInputNama('')
    setForm(f=>({...f, namaKategori: v, subKategori: ''}))
  }
  function deleteNamaKategori(){
    const nama = form.namaKategori
    if(!nama) return alert('Pilih Nama Bahan/Kategori dulu!')
    if(!confirm(`Hapus Nama Bahan/Kategori "${nama}" di ${formatKategori(form.kategori)}? Semua sub-nya hilang!`)) return
    const copy = {...hierarchy}
    delete copy[form.kategori][nama]
    setHierarchy(copy)
    setForm(f=>({...f, namaKategori: '', subKategori: ''}))
  }

  function addSubKategori(){
    const v = inputSub.trim()
    if(!v) return alert('Sub Kategori harus diisi!')
    if(!form.namaKategori) return alert('Pilih Nama Bahan/Kategori dulu!')
    if(hierarchy[form.kategori][form.namaKategori].includes(v)) return alert('Sub sudah ada!')
    setHierarchy(prev=>({...prev, [form.kategori]: {...prev[form.kategori], [form.namaKategori]: [...prev[form.kategori][form.namaKategori], v]}}))
    setInputSub('')
    setForm(f=>({...f, subKategori: v}))
  }
  function deleteSubKategori(){
    const sub = form.subKategori
    if(!sub) return alert('Pilih Sub Kategori dulu!')
    if(!form.namaKategori) return alert('Pilih Nama Bahan/Kategori dulu!')
    if(!confirm(`Hapus Sub "${sub}" dari ${form.namaKategori} - ${formatKategori(form.kategori)}?`)) return
    setHierarchy(prev=>({...prev, [form.kategori]: {...prev[form.kategori], [form.namaKategori]: prev[form.kategori][form.namaKategori].filter(s=>s!==sub)}}))
    setForm(f=>({...f, subKategori: ''}))
  }

  if(loading) return <div className="p-6">Loading fix Langkah 1,2,3 + seragam kategori...</div>

  return (
    <div className="space-y-4">
      <div className="bg-green-700 text-white p-4 rounded-xl">
        <div className="font-bold">✅ FIX: Tombol Delete/Tambah di Langkah 1,2,3 + Seragam Kategori (POK - Bahan Pokok)</div>
        <div className="text-[11px] text-green-100 mt-1">Perbaikan: Langkah 1 (Kategori 9 LOCK) ada tombol + Tambah & 🗑️ Delete | Langkah 2 (Nama Bahan) ada + Tambah & Delete | Langkah 3 (Sub) ada + Tambah & Delete | Kolom Kategori seragam format POK - Bahan Pokok (bukan Protein Hewani - Protein Hewani lagi)</div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border-2 border-[#D4AF37]/30 shadow overflow-hidden">
        <div className="bg-[#FFF8E1] px-5 py-3 font-bold text-sm border-b">📝 INPUT CEPAT 3 LANGKAH - DENGAN TOMBOL TAMBAH/DELETE DI TIAP KOTAK</div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* LANGKAH 1 */}
          <div className="border-2 border-[#0A1931] rounded-xl p-3 bg-[#0A1931]/5 flex flex-col gap-2">
            <div className="font-bold text-xs">LANGKAH 1: Kategori (9 LOCK)</div>
            <select className="w-full border-2 p-3 rounded-xl font-bold text-sm bg-white min-h-[48px]" value={form.kategori} onChange={e=>setForm({...form, kategori: e.target.value, namaKategori: '', subKategori: ''})}>
              {kategoriList.map(k=><option key={k} value={k}>{formatKategori(k)} ({Object.keys(hierarchy[k]||{}).length} Nama Bahan)</option>)}
            </select>
            <div className="bg-white p-2 rounded border text-[10px]">Kode: <b className="font-mono">{kodePreview}</b><br/>{items.find(it=> (it.nama_bahan||'').toLowerCase() === `${form.namaKategori} ${form.subKategori}`.toLowerCase()) ? <span className="text-blue-600 font-bold">🔄 Akan UPDATE</span> : <span className="text-green-600 font-bold">✨ Akan INSERT</span>}</div>
            <div className="flex gap-2">
              <button type="button" onClick={deleteKategori} className="flex-1 bg-red-500 text-white px-2 py-2 rounded-lg text-[11px] font-bold">🗑️ Delete {form.kategori}</button>
            </div>
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-2 space-y-2">
              <div className="text-[10px] font-bold">+ Tambah Kategori Baru (Kode 3 huruf):</div>
              <div className="flex gap-1">
                <input className="w-[70px] border p-1.5 rounded text-xs font-bold" placeholder="POK" value={inputKategori.kode} onChange={e=>setInputKategori({...inputKategori, kode: e.target.value})} />
                <input className="flex-1 border p-1.5 rounded text-xs" placeholder="Bahan Pokok" value={inputKategori.label} onChange={e=>setInputKategori({...inputKategori, label: e.target.value})} />
              </div>
              <button type="button" onClick={addKategori} className="w-full bg-[#D4AF37] text-black px-3 py-1.5 rounded font-bold text-xs">+ Tambah Kategori</button>
            </div>
          </div>

          {/* LANGKAH 2 */}
          <div className="border-2 border-[#D4AF37] rounded-xl p-3 bg-yellow-50 flex flex-col gap-2">
            <div className="font-bold text-xs">LANGKAH 2: Nama Bahan/Kategori</div>
            <select className="w-full border-2 p-3 rounded-xl font-bold text-sm bg-white min-h-[48px]" value={form.namaKategori} onChange={e=>setForm({...form, namaKategori: e.target.value, subKategori: ''})} required>
              <option value="">▼ Pilih di {formatKategori(form.kategori)} ({namaKategoriList.length})</option>
              {namaKategoriList.map(n=><option key={n} value={n}>{n} ({hierarchy[form.kategori][n]?.length} sub)</option>)}
            </select>
            <div className="text-[10px]">Contoh: POK = Beras, Jagung, Tepung | BIN = Gula</div>
            <div className="flex gap-2">
              <button type="button" onClick={deleteNamaKategori} className="flex-1 bg-red-500 text-white px-2 py-2 rounded-lg text-[11px] font-bold" disabled={!form.namaKategori}>🗑️ Delete {form.namaKategori||'Nama'}</button>
            </div>
            <div className="bg-white border border-yellow-300 rounded-lg p-2 space-y-2">
              <div className="text-[10px] font-bold">+ Tambah Nama Bahan/Kategori baru di {form.kategori}:</div>
              <input className="w-full border p-1.5 rounded text-xs font-bold" placeholder="Contoh: Beras" value={inputNama} onChange={e=>setInputNama(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addNamaKategori() }}} />
              <button type="button" onClick={addNamaKategori} className="w-full bg-[#D4AF37] text-black px-3 py-1.5 rounded font-bold text-xs">+ Tambah Nama Bahan</button>
            </div>
          </div>

          {/* LANGKAH 3 */}
          <div className="border-2 border-blue-300 rounded-xl p-3 bg-blue-50 flex flex-col gap-2">
            <div className="font-bold text-xs">LANGKAH 3: Sub Kategori (spesifik!)</div>
            <select className="w-full border-2 p-3 rounded-xl font-bold text-sm bg-white min-h-[48px]" value={form.subKategori} onChange={e=>setForm({...form, subKategori: e.target.value})} required disabled={!form.namaKategori}>
              <option value="">{form.namaKategori?`▼ Pilih sub di ${form.namaKategori} (${subKategoriList.length})`:'Pilih Nama Bahan dulu'}</option>
              {subKategoriList.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <div className="text-[10px]">Contoh: Beras → ketan, merah, porang, putih (bukan Karbohidrat!)</div>
            <div className="flex gap-2">
              <button type="button" onClick={deleteSubKategori} className="flex-1 bg-red-500 text-white px-2 py-2 rounded-lg text-[11px] font-bold" disabled={!form.subKategori}>🗑️ Delete {form.subKategori||'Sub'}</button>
            </div>
            <div className="bg-white border border-blue-300 rounded-lg p-2 space-y-2">
              <div className="text-[10px] font-bold">+ Tambah Sub baru di {form.namaKategori||'(pilih Nama Bahan dulu)'}:</div>
              <input className="w-full border p-1.5 rounded text-xs font-bold" placeholder="Contoh: putih" value={inputSub} onChange={e=>setInputSub(e.target.value)} disabled={!form.namaKategori} onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addSubKategori() }}} />
              <button type="button" onClick={addSubKategori} className="w-full bg-green-600 text-white px-3 py-1.5 rounded font-bold text-xs" disabled={!form.namaKategori}>+ Tambah Sub</button>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="bg-slate-50 rounded-xl p-4 border">
            <div className="font-bold text-xs mb-3">Detail Stock & Harga - Filter 3 Lapis + Supplier (4):</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className="text-[11px] font-bold">Satuan *</label><select className="w-full border-2 p-3 rounded-xl text-sm min-h-[44px]" value={form.satuan} onChange={e=>setForm({...form, satuan: e.target.value})}><option>Kg</option><option>Ltr</option><option>Pcs</option><option>Buah</option><option>Ikat</option><option>Karung</option><option>Botol</option></select></div>
              <div><label className="text-[11px] font-bold">Stock * (ditambah kalau sudah ada)</label><input type="number" className="w-full border-2 p-3 rounded-xl text-sm min-h-[44px]" value={form.stok} onChange={e=>setForm({...form, stok: e.target.value})} required /></div>
              <div><label className="text-[11px] font-bold">Stock Min</label><input type="number" className="w-full border-2 p-3 rounded-xl text-sm min-h-[44px]" value={form.stokMin} onChange={e=>setForm({...form, stokMin: e.target.value})} /></div>
              <div><label className="text-[11px] font-bold">Harga Baru *</label><input type="number" className="w-full border-2 p-3 rounded-xl text-sm min-h-[44px]" value={form.harga} onChange={e=>setForm({...form, harga: e.target.value})} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div><label className="text-[11px] font-bold">Supplier Nama (Filter 4)</label><input className="w-full border-2 p-3 rounded-xl text-sm min-h-[44px] bg-green-50" placeholder="Toko Beras Utama" value={form.supplierNama} onChange={e=>setForm({...form, supplierNama: e.target.value})} /></div>
              <div><label className="text-[11px] font-bold">Supplier WA</label><input className="w-full border-2 p-3 rounded-xl text-sm min-h-[44px] bg-green-50" placeholder="081752323656" value={form.supplierWa} onChange={e=>setForm({...form, supplierWa: e.target.value})} /></div>
            </div>
          </div>

          <div className="bg-[#0A1931] p-3 rounded-xl text-white text-xs mt-3">
            Preview: <b>{formatKategori(form.kategori)}</b> → <b className="text-yellow-300">{form.namaKategori}</b> → <b className="text-blue-300">{form.subKategori}</b> = Nama lengkap: <b className="text-green-300">{form.namaKategori} {form.subKategori}</b> | Kode: <b>{kodePreview}</b> | Status: {items.find(it=> (it.nama_bahan||'').toLowerCase() === `${form.namaKategori} ${form.subKategori}`.toLowerCase()) ? '🔄 UPDATE' : '✨ INSERT'} | Supplier: {form.supplierNama}
          </div>

          <button type="submit" className="w-full bg-[#D4AF37] text-black font-bold py-4 rounded-xl text-sm mt-3">💾 Simpan - {form.kategori} / {form.namaKategori} / {form.subKategori} - {items.find(it=> (it.nama_bahan||'').toLowerCase() === `${form.namaKategori} ${form.subKategori}`.toLowerCase()) ? 'UPDATE stok (aman, tidak duplicate)' : 'INSERT baru'}</button>
        </div>
      </form>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="bg-[#0A1931] text-white px-5 py-3 flex justify-between items-center">
          <span className="text-sm font-bold">📋 Tabel {filteredItems.length}/{items.length} bahan - FIX Seragam Kategori (POK - Bahan Pokok) + Sub spesifik</span>
          <div className="flex gap-2">
            <input className="px-3 py-1.5 rounded text-xs text-black w-[200px]" placeholder="Search Beras putih..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
            <select className="px-3 py-1.5 rounded text-xs text-black min-w-[180px]" value={filterKategori} onChange={e=>setFilterKategori(e.target.value)}><option value="Semua">Semua (9 Kategori)</option>{kategoriList.map(k=><option key={k} value={k}>{formatKategori(k)}</option>)}</select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-100"><tr><th className="p-2">Kode</th><th className="p-2 text-left">Nama Lengkap</th><th className="p-2 bg-[#FFF8E1]">Kategori (Seragam)</th><th className="p-2 bg-yellow-50">Nama Bahan</th><th className="p-2 bg-blue-50">Sub (spesifik)</th><th className="p-2">Stock</th><th className="p-2">Harga</th><th className="p-2">Supplier</th></tr></thead>
            <tbody>{filteredItems.slice(0,100).map(it=>{
              const parsed = parseNamaBahan(it.nama_bahan, it.kategori)
              const kategoriDisplay = formatKategori(it.kategori)
              return <tr key={it.id} className="border-b hover:bg-slate-50"><td className="p-2 font-mono font-bold text-blue-700 text-[11px]">{it.kode_bahan}</td><td className="p-2 font-bold">{it.nama_bahan}</td><td className="p-2 bg-[#FFF8E1] font-bold text-[11px]">{kategoriDisplay}</td><td className="p-2 bg-yellow-50 font-bold">{parsed.namaBahan}</td><td className="p-2 bg-blue-50 font-bold text-blue-800">{it.sub_kategori && !['Karbohidrat','Ayam','Box','Daun','Minyak'].includes(it.sub_kategori) ? it.sub_kategori : parsed.sub}</td><td className="p-2 text-center font-bold">{it.stok} {it.satuan||''}</td><td className="p-2 text-right">Rp {(it.harga_baru||0).toLocaleString('id-ID')}</td><td className="p-2 text-[11px]">{it.supplier_nama||'-'}</td></tr>
            })}</tbody>
          </table>
        </div>
        <div className="bg-green-50 p-3 text-[11px] border-t">
          <b>✅ Perbaikan Seragam Kategori:</b> Dulu: <span className="bg-red-100 px-1 rounded">Protein Hewani - Protein Hewani, Bahan Pokok - Bahan Pokok, Saos & Cairan - Saos & Cairan</span> → Sekarang: <span className="bg-green-100 px-1 rounded font-bold">POK - Bahan Pokok, HEW - Protein Hewani, BIN - Bumbu Instan, SAO - Saos & Cairan, BSG - Bumbu Segar, SAY - Sayuran, NAB - Protein Nabati, PLG - Pelengkap & garnish, KEM - Kemasan /Packing</span> | Format seragam: KODE - Label
        </div>
      </div>
    </div>
  )
}
