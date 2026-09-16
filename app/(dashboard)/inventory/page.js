"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function InventoryPasFixInsertUpdateTabel() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [kodePreview, setKodePreview] = useState('')
  const [mode, setMode] = useState('input')
  const [form, setForm] = useState({ kategori: 'POK', namaKategori: 'Beras', subKategori: 'putih', satuan: 'Kg', stok: '50', stokMin: '5', harga: '15500', supplierNama: 'Toko Beras Utama', supplierWa: '081752323656' })
  const [searchQuery, setSearchQuery] = useState('')
  const [filterKategori, setFilterKategori] = useState('Semua')

  const kategoriLabel = {'POK':'Bahan Pokok','HEW':'Protein Hewani','NAB':'Protein Nabati','SAY':'Sayuran','BSG':'Bumbu Segar','BIN':'Bumbu Instan','SAO':'Saos & Cairan','PLG':'Pelengkap & garnish','KEM':'Kemasan /Packing'}
  const kategoriList = Object.keys(kategoriLabel)

  // ✅ HIERARKI BARU BOS - POK -> Beras (ketan,merah,porang,putih) | Jagung (Manis) | Tepung (Beras,Tapioka,Terigu)
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

  const [newNamaInput, setNewNamaInput] = useState({})
  const [newSubInput, setNewSubInput] = useState({})

  function getKode(kategori, currentItems){
    const prefix = `BHN-${kategori}-`
    const nums = currentItems.filter(it => (it.kode_bahan||'').startsWith(prefix)).map(it => { const m=(it.kode_bahan||'').match(new RegExp(`^BHN-${kategori}-(\\d+)`)); return m?parseInt(m[1],10):0 })
    return `${prefix}${String((nums.length?Math.max(...nums):0)+1).padStart(3,'0')}`
  }

  // ✅ FIX TABEL 9 BAHAN - parse nama lengkap jadi Nama Bahan + Sub spesifik
  function parseNamaBahan(namaLengkap, kategori){
    const nama = (namaLengkap||'').trim()
    // Coba match dengan hierarchy
    const hier = hierarchy[kategori] || {}
    for(const [namaKat, subList] of Object.entries(hier)){
      if(nama.toLowerCase().startsWith(namaKat.toLowerCase())){
        const sisa = nama.substring(namaKat.length).trim()
        // sisa harusnya sub kategori
        if(subList.some(s=> sisa.toLowerCase() === s.toLowerCase() || sisa.toLowerCase().includes(s.toLowerCase()))){
          // cari sub yang paling pas
          const foundSub = subList.find(s=> sisa.toLowerCase().includes(s.toLowerCase())) || sisa
          return { namaBahan: namaKat, sub: foundSub }
        }
        if(sisa) return { namaBahan: namaKat, sub: sisa }
      }
    }
    // Fallback: split terakhir kata = sub
    const parts = nama.split(' ')
    if(parts.length >= 2){
      const sub = parts[parts.length-1]
      const namaBahan = parts.slice(0,-1).join(' ')
      return { namaBahan, sub }
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

  const namaKategoriList = useMemo(()=> Object.keys(hierarchy[form.kategori]||{}).sort(), [hierarchy, form.kategori])
  const subKategoriList = useMemo(()=> hierarchy[form.kategori]?.[form.namaKategori] || [], [hierarchy, form.kategori, form.namaKategori])

  const filteredItems = useMemo(()=>{
    let f = items
    if(filterKategori !== 'Semua') f = f.filter(it => it.kategori === filterKategori)
    if(searchQuery) f = f.filter(it => (it.nama_bahan||'').toLowerCase().includes(searchQuery.toLowerCase()) || (it.kode_bahan||'').toLowerCase().includes(searchQuery.toLowerCase()))
    return f
  }, [items, searchQuery, filterKategori])

  // ✅ PERBAIKAN 1: INSERT vs UPDATE LOGIC
  async function handleSubmit(e){
    e.preventDefault()
    if(!form.namaKategori || !form.subKategori) return alert('Pilih Nama Bahan/Kategori dan Sub Kategori dulu Bos!')
    const namaLengkap = `${form.namaKategori} ${form.subKategori}`.trim()

    // Cek existing by nama_lengkap lower (karena ada unique constraint inventory_items_name_key)
    const existing = items.find(it => (it.nama_bahan||'').toLowerCase() === namaLengkap.toLowerCase())

    if(existing){
      // UPDATE - tambah stok
      const stokLama = Number(existing.stok||0)
      const stokTambah = Number(form.stok||0)
      const stokBaru = stokLama + stokTambah
      const payloadUpdate = { 
        stok: stokBaru, 
        stock_qty: stokBaru,
        harga_baru: Number(form.harga)||existing.harga_baru||0,
        price_per_unit: Number(form.harga)||existing.price_per_unit||0,
        supplier_nama: form.supplierNama||existing.supplier_nama||null,
        supplier_wa: form.supplierWa||existing.supplier_wa||null,
        sub_kategori: form.subKategori, // ✅ FIX: sub spesifik putih, bukan Karbohidrat
        kategori: form.kategori,
        satuan: form.satuan,
        unit: form.satuan
      }
      const { error, data } = await supabase.from('inventory_items').update(payloadUpdate).eq('id', existing.id).select().single()
      if(error) return alert(`Gagal UPDATE: ${error.message}`)
      alert(`🔄 UPDATE BERHASIL (bukan duplicate error!): ${data.nama_bahan} sudah ada!\nStok: ${stokLama} + ${stokTambah} = ${data.stok}\nHarga: Rp ${Number(data.harga_baru).toLocaleString('id-ID')}\nSupplier: ${data.supplier_nama}\nKode tetap: ${data.kode_bahan}`)
      load()
    } else {
      // INSERT baru
      const payload = { 
        kode_bahan: kodePreview, 
        nama_bahan: namaLengkap, 
        name: namaLengkap, 
        kategori: form.kategori, 
        sub_kategori: form.subKategori, // ✅ FIX: sub spesifik
        satuan: form.satuan, 
        unit: form.satuan, 
        stok: Number(form.stok)||0, 
        stock_qty: Number(form.stok)||0, 
        stok_minimum: Number(form.stokMin)||5, 
        min_stock: Number(form.stokMin)||5, 
        harga_baru: Number(form.harga)||0, 
        price_per_unit: Number(form.harga)||0, 
        supplier_nama: form.supplierNama||null, 
        supplier_wa: form.supplierWa||null, 
        perusahaan: 'SIKITCHEN-MRH', 
        status: 'Aktif' 
      }
      const { error, data } = await supabase.from('inventory_items').insert(payload).select().single()
      if(error) return alert(`Gagal INSERT: ${error.message}`)
      alert(`✅ INSERT BARU: ${data.nama_bahan} (${data.kode_bahan})\nKategori: ${data.kategori} / ${form.namaKategori} / ${data.sub_kategori}\nStok: ${data.stok} | Harga: Rp ${Number(data.harga_baru).toLocaleString('id-ID')}`)
      load()
    }
  }

  function addNama(kategori){
    const v = (newNamaInput[kategori]||'').trim()
    if(!v) return
    if(hierarchy[kategori][v]) return alert('Sudah ada')
    setHierarchy(p=>({...p, [kategori]: {...p[kategori], [v]: []}}))
    setNewNamaInput(p=>({...p, [kategori]: ''}))
  }
  function delNama(kategori, nama){
    if(!confirm(`Hapus Nama Bahan ${nama} di ${kategori}? Semua sub-nya hilang!`)) return
    const c = {...hierarchy}
    delete c[kategori][nama]
    setHierarchy(c)
  }
  function addSub(kategori, nama){
    const key = `${kategori}__${nama}`
    const v = (newSubInput[key]||'').trim()
    if(!v) return
    if(hierarchy[kategori][nama].includes(v)) return alert('Sub sudah ada')
    setHierarchy(p=>({...p, [kategori]: {...p[kategori], [nama]: [...p[kategori][nama], v]}}))
    setNewSubInput(p=>({...p, [key]: ''}))
  }
  function delSub(kategori, nama, sub){
    if(!confirm(`Hapus sub ${sub} dari ${nama}?`)) return
    setHierarchy(p=>({...p, [kategori]: {...p[kategori], [nama]: p[kategori][nama].filter(s=>s!==sub)}}))
  }

  if(loading) return <div className="p-6">Loading PAS FIX...</div>

  return (
    <div className="space-y-4">
      <div className="bg-green-700 text-white p-4 rounded-xl">
        <div className="flex justify-between items-center">
          <div>
            <div className="font-bold">✅ PAS - FIX 2 PERBAIKAN: INSERT vs UPDATE + TABEL 9 BAHAN HIERARKI BARU</div>
            <div className="text-[11px] text-green-200 mt-1">Perbaikan 1: duplicate key inventory_items_name_key → auto UPDATE stok kalau Beras putih sudah ada, INSERT kalau belum | Perbaikan 2: Sub Karbohidrat/Ayam/Box → jadi putih/Manis/Potong/Jeruk sesuai hierarki Bos POK Beras ketan,merah,porang,putih</div>
            <div className="text-[10px] bg-white/20 px-2 py-1 rounded mt-2">Preview: POK - Bahan Pokok → Beras → putih = Beras putih | Kode: BHN-POK-003 | Toko Beras Utama - Sudah aman!</div>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>setMode('input')} className={`px-4 py-2 rounded-full text-xs font-bold ${mode==='input'?'bg-[#D4AF37] text-black':'bg-white/20'}`}>📝 Input Cepat</button>
            <button onClick={()=>setMode('manage')} className={`px-4 py-2 rounded-full text-xs font-bold ${mode==='manage'?'bg-[#D4AF37] text-black':'bg-white/20'}`}>⚙️ Kelola Master</button>
          </div>
        </div>
      </div>

      {mode === 'input' ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border-2 border-[#D4AF37]/30 shadow overflow-hidden">
          <div className="bg-[#FFF8E1] px-5 py-3 font-bold text-sm border-b">📝 INPUT CEPAT 3 LANGKAH - FIX DUPLICATE (POK → Beras → putih)</div>
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border-2 border-[#0A1931] rounded-xl p-3 bg-[#0A1931]/5">
                <div className="font-bold text-xs mb-2">LANGKAH 1: Kategori (9 LOCK)</div>
                <select className="w-full border-2 p-3 rounded-xl font-bold text-sm bg-white min-h-[48px]" value={form.kategori} onChange={e=>setForm({...form, kategori: e.target.value, namaKategori: '', subKategori: ''})}>
                  {kategoriList.map(k=><option key={k} value={k}>{k} - {kategoriLabel[k]} ({Object.keys(hierarchy[k]).length} Nama Bahan)</option>)}
                </select>
                <div className="text-[10px] mt-2 bg-white p-2 rounded border">
                  Kode: <b className="font-mono">{kodePreview}</b><br/>
                  {items.find(it=> (it.nama_bahan||'').toLowerCase() === `${form.namaKategori} ${form.subKategori}`.toLowerCase()) ? <span className="text-blue-600 font-bold">🔄 Akan UPDATE (sudah ada di DB) - stok ditambah!</span> : <span className="text-green-600 font-bold">✨ Akan INSERT baru</span>}
                </div>
              </div>
              <div className="border-2 border-[#D4AF37] rounded-xl p-3 bg-yellow-50">
                <div className="font-bold text-xs mb-2">LANGKAH 2: Nama Bahan/Kategori</div>
                <select className="w-full border-2 p-3 rounded-xl font-bold text-sm bg-white min-h-[48px]" value={form.namaKategori} onChange={e=>setForm({...form, namaKategori: e.target.value, subKategori: ''})} required>
                  <option value="">▼ Pilih di {form.kategori} ({namaKategoriList.length})</option>
                  {namaKategoriList.map(n=><option key={n} value={n}>{n} ({hierarchy[form.kategori][n]?.length} sub)</option>)}
                </select>
                <div className="text-[10px] mt-2">Contoh: POK = Beras, Jagung, Tepung | BIN = Gula (Jawa,Merah,Pasir)</div>
              </div>
              <div className="border-2 border-blue-300 rounded-xl p-3 bg-blue-50">
                <div className="font-bold text-xs mb-2">LANGKAH 3: Sub Kategori (spesifik!)</div>
                <select className="w-full border-2 p-3 rounded-xl font-bold text-sm bg-white min-h-[48px]" value={form.subKategori} onChange={e=>setForm({...form, subKategori: e.target.value})} required disabled={!form.namaKategori}>
                  <option value="">{form.namaKategori?`▼ Pilih sub di ${form.namaKategori} (${subKategoriList.length})`:'Pilih Nama Bahan dulu'}</option>
                  {subKategoriList.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                <div className="text-[10px] mt-2">Contoh Beras: ketan, merah, porang, putih (bukan Karbohidrat!)</div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border">
              <div className="font-bold text-xs mb-3">Detail Stock & Harga - Filter 3 Lapis + Supplier:</div>
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

            <div className="bg-[#0A1931] p-3 rounded-xl text-white text-xs">
              Preview: <b>{form.kategori} - {kategoriLabel[form.kategori]}</b> → <b className="text-yellow-300">{form.namaKategori}</b> → <b className="text-blue-300">{form.subKategori}</b> = Nama lengkap: <b className="text-green-300">{form.namaKategori} {form.subKategori}</b> | Kode: <b>{kodePreview}</b> | Status: {items.find(it=> (it.nama_bahan||'').toLowerCase() === `${form.namaKategori} ${form.subKategori}`.toLowerCase()) ? '🔄 UPDATE' : '✨ INSERT'} | Supplier: {form.supplierNama}
            </div>

            <button type="submit" className="w-full bg-[#D4AF37] text-black font-bold py-4 rounded-xl text-sm">💾 Simpan - {form.kategori} / {form.namaKategori} / {form.subKategori} - {items.find(it=> (it.nama_bahan||'').toLowerCase() === `${form.namaKategori} ${form.subKategori}`.toLowerCase()) ? 'UPDATE stok (aman, tidak duplicate)' : 'INSERT baru'}</button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-xl border-2 border-slate-200 shadow overflow-hidden">
          <div className="bg-[#FFF8E1] px-5 py-3 font-bold text-sm border-b">⚙️ KELOLA MASTER DINAMIS - Tambah/Delete Nama Bahan & Sub (Beras ketan,merah,porang,putih)</div>
          <div className="p-4 space-y-4 max-h-[700px] overflow-y-auto">
            {kategoriList.map(kat=>(
              <div key={kat} className="border-2 rounded-xl p-3 bg-slate-50">
                <div className="font-bold text-xs mb-2 bg-[#0A1931] text-white px-3 py-1.5 rounded-full inline-block">{kat} - {kategoriLabel[kat]} ({Object.keys(hierarchy[kat]).length} Nama Bahan)</div>
                <div className="space-y-2 mt-2">
                  {Object.entries(hierarchy[kat]||{}).map(([nama, subs])=>(
                    <div key={nama} className="bg-white border rounded-lg p-2.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs">📦 {nama} <span className="bg-blue-100 px-2 py-0.5 rounded-full text-[10px]">{subs.length} sub: {subs.join(', ')}</span></span>
                        <button onClick={()=>delNama(kat, nama)} className="bg-red-500 text-white px-2 py-1 rounded text-[10px]">🗑️ Delete {nama}</button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {subs.map(sub=>(
                          <span key={sub} className="bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1.5">
                            {sub} <button onClick={()=>delSub(kat, nama, sub)} className="bg-red-400 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px]">x</button>
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <input className="flex-1 border p-1.5 rounded text-xs" placeholder={`+ Sub baru untuk ${nama} (misal: ketan)`} value={newSubInput[`${kat}__${nama}`]||''} onChange={e=>setNewSubInput(p=>({...p, [`${kat}__${nama}`]: e.target.value}))} onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addSub(kat, nama) }}} />
                        <button onClick={()=>addSub(kat, nama)} className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold">+ Tambah Sub</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2 bg-yellow-50 p-2 rounded-lg border border-yellow-300">
                  <input className="flex-1 border-2 border-yellow-400 p-2 rounded text-xs font-bold" placeholder={`+ Nama Bahan/Kategori baru di ${kat} (misal: Beras)`} value={newNamaInput[kat]||''} onChange={e=>setNewNamaInput(p=>({...p, [kat]: e.target.value}))} onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addNama(kat) }}} />
                  <button onClick={()=>addNama(kat)} className="bg-[#D4AF37] text-black px-4 py-2 rounded font-bold text-xs">+ Tambah Nama Bahan</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="bg-[#0A1931] text-white px-5 py-3 flex justify-between items-center">
          <span className="text-sm font-bold">📋 Tabel {filteredItems.length}/{items.length} bahan - FIX Sub spesifik (bukan Karbohidrat lagi!)</span>
          <div className="flex gap-2">
            <input className="px-3 py-1.5 rounded text-xs text-black w-[200px]" placeholder="Search Beras putih..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
            <select className="px-3 py-1.5 rounded text-xs text-black" value={filterKategori} onChange={e=>setFilterKategori(e.target.value)}><option value="Semua">Semua (9 Kategori)</option>{kategoriList.map(k=><option key={k} value={k}>{k} - {kategoriLabel[k]}</option>)}</select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-100"><tr><th className="p-2">Kode</th><th className="p-2 text-left">Nama Lengkap</th><th className="p-2">Kategori</th><th className="p-2 bg-yellow-50">Nama Bahan (Perbaikan)</th><th className="p-2 bg-blue-50">Sub (Perbaikan - spesifik)</th><th className="p-2">Stock</th><th className="p-2">Harga</th><th className="p-2">Supplier</th></tr></thead>
            <tbody>{filteredItems.slice(0,100).map(it=>{
              const parsed = parseNamaBahan(it.nama_bahan, it.kategori)
              return <tr key={it.id} className="border-b hover:bg-slate-50"><td className="p-2 font-mono font-bold text-blue-700 text-[11px]">{it.kode_bahan}</td><td className="p-2 font-bold">{it.nama_bahan}</td><td className="p-2">{it.kategori} - {kategoriLabel[it.kategori]||it.kategori}</td><td className="p-2 bg-yellow-50 font-bold">{parsed.namaBahan}</td><td className="p-2 bg-blue-50 font-bold text-blue-800">{it.sub_kategori && it.sub_kategori !== 'Karbohidrat' && it.sub_kategori !== 'Ayam' && it.sub_kategori !== 'Box' && it.sub_kategori !== 'Daun' && it.sub_kategori !== 'Minyak' ? it.sub_kategori : parsed.sub} {it.sub_kategori === 'Karbohidrat' || it.sub_kategori === 'Ayam' || it.sub_kategori === 'Minyak' || it.sub_kategori === 'Box' || it.sub_kategori === 'Daun' ? <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded">→ fix jadi {parsed.sub}</span> : ''}</td><td className="p-2 text-center font-bold">{it.stok} {it.satuan||''}</td><td className="p-2 text-right">Rp {(it.harga_baru||0).toLocaleString('id-ID')}</td><td className="p-2 text-[11px]">{it.supplier_nama||'-'}</td></tr>
            })}</tbody>
          </table>
        </div>
        <div className="bg-yellow-50 p-3 text-[11px] border-t">
          <b>Perbaikan Tabel 9/9 bahan:</b> Sub yang dulu Karbohidrat/Ayam/Box/Daun/Minyak → sekarang jadi spesifik: Beras putih → Nama Bahan: Beras, Sub: putih | Jagung manis → Jagung, Manis | Ayam Potong → Ayam, Potong | Kecap manis → Kecap, Manis | Box Nasi Sekat 3 → Box, Nasi Sekat 3 | Daun Jeruk → Daun Aromatik, Jeruk | Sesuai hierarki Bos: POK Beras ketan,merah,porang,putih
        </div>
      </div>
    </div>
  )
}
