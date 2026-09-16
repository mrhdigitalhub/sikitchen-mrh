"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function InventoryDynamicKategoriSub() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [kodePreview, setKodePreview] = useState('')
  const [debugMsg, setDebugMsg] = useState('')
  const [isExistingBahan, setIsExistingBahan] = useState(false)
  const [existingData, setExistingData] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ kategori: 'POK', namaBahanKategori: '', sub_kategori: '', satuan: 'Kg', stok_tambahan: '', stok_minimum: '5', supplier_nama: '', supplier_wa: '', harga_baru: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [filterKategori, setFilterKategori] = useState('Semua')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 50

  const kategoriList9 = ['POK','HEW','NAB','SAY','BSG','BIN','SAO','PLG','KEM']
  const kategoriLabel = {'POK':'Bahan Pokok','HEW':'Protein Hewani','NAB':'Protein Nabati','SAY':'Sayuran','BSG':'Bumbu Segar','BIN':'Bumbu Instan','SAO':'Saos & Cairan','PLG':'Pelengkap & garnish','KEM':'Kemasan /Packing'}

  // ✅ HIERARKI 3 LEVEL DINAMIS - bisa tambah/delete per kategori & sub
  const [masterHierarchy, setMasterHierarchy] = useState({
    'POK': {
      'Beras': ['ketan','merah','porang','putih'],
      'Jagung': ['Manis'],
      'Tepung': ['Beras','Tapioka','Terigu']
    },
    'HEW': {
      'Ayam': ['Potong','Kampung','Fillet'],
      'Daging': ['Sapi','Kambing'],
      'Ikan Air Tawar': ['Lele','Nila','Bandeng'],
      'Ikan Laut': ['Tongkol','Teri'],
      'Seafood': ['Udang','Cumi'],
      'Telur': ['Ayam','Bebek'],
      'Jeroan': ['Ati Ampela']
    },
    'NAB': {
      'Olahan Kedelai': ['Tempe Kedelai','Tahu Kedelai','Tahu Kulit'],
      'Kacang-kacangan': ['Tanah','Hijau','Kedelai','Merah'],
      'Fermentasi': ['Oncom']
    },
    'SAY': {
      'Daun': ['Bayam','Kangkung','Sawi Hijau','Kol','Daun Singkong'],
      'Polong': ['Buncis','Kacang Panjang','Petai','Jengkol'],
      'Buah': ['Terong','Timun','Tomat','Labu Siam','Nangka Muda'],
      'Umbi Akar': ['Wortel'],
      'Umbi Batang': ['Kentang'],
      'Tunas': ['Tauge'],
      'Jamur': ['Jamur Tiram'],
      'Daun Aromatik': ['Daun Jeruk','Daun Salam']
    },
    'BSG': {
      'Umbi Lapis': ['Bawang Merah','Bawang Putih'],
      'Buah Pedas': ['Cabe Merah Besar','Cabe Rawit','Cabe Keriting'],
      'Rimpang': ['Jahe','Kunyit','Kencur','Lengkuas'],
      'Batang Aromatik': ['Serai'],
      'Daun Aromatik': ['Daun Salam','Daun Jeruk'],
      'Biji-bijian': ['Kemiri','Ketumbar','Merica','Pala'],
      'Buah Asam': ['Asam Jawa','Belimbing Wuluh']
    },
    'BIN': {
      'Kaldu': ['Ayam','Sapi'],
      'Bumbu Racik': ['Gulai','Opor','Rendang','Soto'],
      'Fermentasi': ['Terasi'],
      'Gula': ['Jawa','Merah','Pasir']
    },
    'SAO': {
      'Kecap': ['Manis','Asin'],
      'Saus': ['Tiram','Tomat','Sambal'],
      'Minyak': ['Goreng','Goreng Curah','Wijen'],
      'Santan': ['Kara','Segar'],
      'Cuka': ['Cuka']
    },
    'PLG': {
      'Kerupuk': ['Udang','Kampung','Emping'],
      'Gorengan': ['Bawang Goreng','Kacang Goreng'],
      'Sambal': ['Terasi'],
      'Sayur Segar': ['Lalapan'],
      'Acar': ['Acar']
    },
    'KEM': {
      'Box': ['Nasi Sekat 3','Nasi Sekat 4'],
      'Dus': ['Snack'],
      'Plastik': ['Mika'],
      'Alat Makan': ['Sendok Plastik'],
      'Tisu': ['Tisu'],
      'Label': ['Stiker']
    }
  })

  const [showManager, setShowManager] = useState(true)
  const [newNamaBahanInput, setNewNamaBahanInput] = useState({})
  const [newSubInput, setNewSubInput] = useState({})

  function normalizeNama(str){ return (str||'').toLowerCase().trim() }

  function getNextSmartKode(kategori, existingItems){
    const prefix = `BHN-${kategori}-`
    const nums = existingItems.filter(it => (it.kode_bahan||'').startsWith(prefix)).map(it => { const m=(it.kode_bahan||'').match(new RegExp(`^BHN-${kategori}-(\\d+)`)); return m?parseInt(m[1],10):0 })
    return `${prefix}${String((nums.length?Math.max(...nums):0)+1).padStart(3,'0')}`
  }

  async function load() {
    setLoading(true)
    const { data: inv } = await supabase.from('inventory_items').select('*').order('nama_bahan').limit(500)
    if(inv){ setItems(inv); setDebugMsg(`✅ DINAMIS: ${inv.length} bahan | 9 Kategori LOCK | Nama Bahan & Sub Kategori bisa + / Delete dinamis`) }
    setLoading(false)
    setKodePreview(getNextSmartKode('POK', items))
  }
  useEffect(()=>{ load() }, [])
  useEffect(()=>{ if(!isExistingBahan && form.kategori) setKodePreview(getNextSmartKode(form.kategori, items)) }, [form.kategori, items, isExistingBahan])

  const filteredNamaBahanByKategori = useMemo(()=>{
    const hier = masterHierarchy[form.kategori] || {}
    return Object.keys(hier).sort()
  }, [masterHierarchy, form.kategori])

  const filteredSubByNamaBahan = useMemo(()=>{
    const hier = masterHierarchy[form.kategori] || {}
    return hier[form.namaBahanKategori] || []
  }, [masterHierarchy, form.kategori, form.namaBahanKategori])

  // CRUD DINAMIS
  function addNamaBahanKategori(kategori){
    const val = (newNamaBahanInput[kategori]||'').trim()
    if(!val) return alert('Nama bahan/kategori tidak boleh kosong')
    if(masterHierarchy[kategori][val]) return alert('Sudah ada')
    setMasterHierarchy(prev=>({...prev, [kategori]: {...prev[kategori], [val]: []}}))
    setNewNamaBahanInput(prev=>({...prev, [kategori]: ''}))
  }
  function deleteNamaBahanKategori(kategori, namaBahan){
    if(!confirm(`Hapus Nama Bahan/Kategori "${namaBahan}" di ${kategori}? Semua sub-nya akan hilang!`)) return
    const copy = {...masterHierarchy}
    delete copy[kategori][namaBahan]
    setMasterHierarchy(copy)
    if(form.kategori===kategori && form.namaBahanKategori===namaBahan){
      setForm(f=>({...f, namaBahanKategori: '', sub_kategori: ''}))
    }
  }
  function addSubKategori(kategori, namaBahan){
    const key = `${kategori}__${namaBahan}`
    const val = (newSubInput[key]||'').trim()
    if(!val) return alert('Sub kategori tidak boleh kosong')
    if(masterHierarchy[kategori][namaBahan].includes(val)) return alert('Sub sudah ada')
    setMasterHierarchy(prev=>({...prev, [kategori]: {...prev[kategori], [namaBahan]: [...prev[kategori][namaBahan], val]}}))
    setNewSubInput(prev=>({...prev, [key]: ''}))
  }
  function deleteSubKategori(kategori, namaBahan, sub){
    if(!confirm(`Hapus Sub "${sub}" dari ${namaBahan} - ${kategori}?`)) return
    setMasterHierarchy(prev=>({...prev, [kategori]: {...prev[kategori], [namaBahan]: prev[kategori][namaBahan].filter(s=>s!==sub)}}))
    if(form.kategori===kategori && form.namaBahanKategori===namaBahan && form.sub_kategori===sub){
      setForm(f=>({...f, sub_kategori: ''}))
    }
  }

  function handleNamaBahanKategoriSelect(val){
    setForm(prev=>({...prev, namaBahanKategori: val, sub_kategori: ''}))
  }

  async function handleSubmit(e){
    e.preventDefault()
    if(!form.namaBahanKategori.trim() || !form.sub_kategori.trim()) return alert('Nama Bahan/Kategori dan Sub wajib')
    const namaLengkap = `${form.namaBahanKategori} ${form.sub_kategori}`.trim()
    const payload = { kode_bahan: kodePreview, nama_bahan: namaLengkap, name: namaLengkap, kategori: form.kategori, sub_kategori: form.sub_kategori, satuan: form.satuan, unit: form.satuan, stok: Number(form.stok_tambahan)||0, stock_qty: Number(form.stok_tambahan)||0, stok_minimum: Number(form.stok_minimum)||5, min_stock: Number(form.stok_minimum)||5, supplier_nama: form.supplier_nama||null, supplier_wa: form.supplier_wa||null, harga_baru: form.harga_baru?Number(form.harga_baru):0, price_per_unit: form.harga_baru?Number(form.harga_baru):0, perusahaan: 'SIKITCHEN-MRH', status: 'Aktif' }
    const res = await supabase.from('inventory_items').insert(payload).select().single()
    if(res.error) return alert(res.error.message)
    alert(`✅ SIMPAN: ${res.data.nama_bahan} | ${res.data.kode_bahan} | ${res.data.kategori} - ${res.data.sub_kategori}`)
    setForm({ kategori: form.kategori, namaBahanKategori: '', sub_kategori: '', satuan: 'Kg', stok_tambahan: '', stok_minimum: '5', supplier_nama: '', supplier_wa: '', harga_baru: '' })
    load()
  }

  const filteredItems = useMemo(()=>{
    let f = items
    if(filterKategori !== 'Semua') f = f.filter(it => it.kategori === filterKategori)
    if(searchQuery.trim()){ const q=normalizeNama(searchQuery); f=f.filter(it=>normalizeNama(it.nama_bahan||'').includes(q)||normalizeNama(it.kode_bahan||'').includes(q)) }
    return f
  }, [items, searchQuery, filterKategori])
  const paginatedItems = useMemo(()=> filteredItems.slice((currentPage-1)*pageSize, currentPage*pageSize), [filteredItems, currentPage])

  if(loading) return <div className="p-6">Loading DINAMIS...</div>

  return (
    <div className="space-y-4">
      <div className="bg-[#0A1931] text-white p-3 rounded-xl">
        <div className="font-bold text-sm">✅ INVENTORY DINAMIS - Tambah/Delete Kategori & Sub Kategori Dinamis</div>
        <div className="text-[10px] bg-white/10 px-2 py-1 rounded mt-2">{debugMsg}</div>
        <div className="text-[10px] text-green-300 mt-1">Hierarki: KATEGORI (9 LOCK: POK,HEW,NAB,SAY,BSG,BIN,SAO,PLG,KEM) → Nama Bahan/Kategori (Beras,Jagung,Tepung) bisa + / Delete → Sub Kategori (ketan,merah,porang,putih) bisa + / Delete</div>
      </div>

      <div className="bg-white rounded-xl border-2 border-[#D4AF37]/40 shadow-sm overflow-hidden">
        <div className="bg-[#FFF8E1] px-4 py-3 flex justify-between items-center">
          <span className="font-bold text-sm">⚙️ Manager Kategori & Sub Kategori Dinamis (9 Kategori)</span>
          <button onClick={()=>setShowManager(!showManager)} className="bg-[#0A1931] text-white px-3 py-1.5 rounded-lg text-xs">{showManager?'Sembunyikan':'Tampilkan Manager'}</button>
        </div>
        {showManager && (
          <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
            {kategoriList9.map(kat=>(
              <div key={kat} className="border-2 border-slate-200 rounded-xl p-3 bg-slate-50">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-sm bg-[#0A1931] text-white px-3 py-1 rounded-full">{kat} - {kategoriLabel[kat]} ({Object.keys(masterHierarchy[kat]||{}).length} Nama Bahan)</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(masterHierarchy[kat]||{}).map(([namaBahan, subList])=>(
                    <div key={namaBahan} className="bg-white border rounded-lg p-2.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs">📦 {namaBahan} <span className="text-[10px] bg-blue-100 px-2 py-0.5 rounded-full">{subList.length} sub</span></span>
                        <button onClick={()=>deleteNamaBahanKategori(kat, namaBahan)} className="bg-red-500 text-white px-2 py-1 rounded text-[10px]">🗑️ Delete Nama Bahan</button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {subList.map(sub=>(
                          <span key={sub} className="bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1.5">
                            {sub}
                            <button onClick={()=>deleteSubKategori(kat, namaBahan, sub)} className="bg-red-400 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px]">x</button>
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <input className="flex-1 border p-1.5 rounded text-xs" placeholder={`+ Sub baru untuk ${namaBahan} (misal: ketan)`} value={newSubInput[`${kat}__${namaBahan}`]||''} onChange={e=>setNewSubInput(prev=>({...prev, [`${kat}__${namaBahan}`]: e.target.value}))} onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addSubKategori(kat, namaBahan) }}} />
                        <button onClick={()=>addSubKategori(kat, namaBahan)} className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold">+ Tambah Sub</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2 bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                  <input className="flex-1 border-2 border-yellow-400 p-2 rounded text-xs font-bold" placeholder={`+ Nama Bahan/Kategori baru di ${kat} (misal: Beras / Jagung / Tepung)`} value={newNamaBahanInput[kat]||''} onChange={e=>setNewNamaBahanInput(prev=>({...prev, [kat]: e.target.value}))} onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addNamaBahanKategori(kat) }}} />
                  <button onClick={()=>addNamaBahanKategori(kat)} className="bg-[#D4AF37] text-[#0A1931] px-4 py-2 rounded font-bold text-xs">+ Tambah Nama Bahan</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border-2 border-[#D4AF37]/40 shadow-sm overflow-hidden">
        <div className="bg-[#FFF8E1] border-b px-4 py-2 text-[11px] font-bold">✨ Input Bahan - Hierarki Dinamis (Gula Jawa sudah di BIN, Jagung pipil deleted)</div>
        <div className="divide-y divide-slate-200">
          <div className="grid grid-cols-[280px_1fr]"><div className="bg-slate-50 px-5 py-4 border-r"><div className="font-bold text-sm">1. Kode Smart</div></div><div className="px-5 py-3"><input className="w-full bg-slate-100 border-2 p-3.5 rounded-xl text-sm font-mono font-bold" value={kodePreview} readOnly /></div></div>
          <div className="grid grid-cols-[280px_1fr]"><div className="bg-[#FFF8E1] px-5 py-4 border-r"><div className="font-bold text-sm">2. Kategori * (9 LOCK)</div><div className="text-[10px] text-green-600 font-bold">Dinamis!</div></div><div className="px-5 py-3"><select className="w-full border-2 border-[#D4AF37]/50 p-4 rounded-xl text-sm font-bold bg-white min-h-[52px]" value={form.kategori} onChange={e=>setForm({...form, kategori: e.target.value, namaBahanKategori: '', sub_kategori: ''})} required>{kategoriList9.map(k=><option key={k} value={k}>{k} - {kategoriLabel[k]} ({Object.keys(masterHierarchy[k]||{}).length} Nama Bahan)</option>)}</select></div></div>
          <div className="grid grid-cols-[280px_1fr]"><div className="bg-[#FFF8E1] px-5 py-4 border-r"><div className="font-bold text-sm">3. Nama Bahan/Kategori *</div><div className="text-[10px] text-blue-600">Beras, Jagung, Tepung → + / Delete dinamis!</div></div><div className="px-5 py-3"><select className="w-full border-2 border-[#D4AF37]/30 p-4 rounded-xl text-sm min-h-[52px] font-bold bg-yellow-50" value={form.namaBahanKategori} onChange={e=>handleNamaBahanKategoriSelect(e.target.value)} required><option value="">▼ Pilih Nama Bahan/Kategori di {form.kategori} ({filteredNamaBahanByKategori.length} pilihan)</option>{filteredNamaBahanByKategori.map(n=><option key={n} value={n}>{n} - {form.kategori} ({masterHierarchy[form.kategori][n]?.length||0} sub)</option>)}</select></div></div>
          <div className="grid grid-cols-[280px_1fr]"><div className="bg-[#E3F2FD] px-5 py-4 border-r"><div className="font-bold text-sm">4. Sub Kategori *</div><div className="text-[10px] text-blue-700">ketan, merah, porang, putih → + / Delete dinamis!</div></div><div className="px-5 py-3"><select className="w-full border-2 border-blue-300 p-4 rounded-xl text-sm min-h-[52px] font-bold bg-blue-50" value={form.sub_kategori} onChange={e=>setForm({...form, sub_kategori: e.target.value})} required disabled={!form.namaBahanKategori}><option value="">{form.namaBahanKategori?`▼ Pilih Sub di ${form.namaBahanKategori} (${filteredSubByNamaBahan.length} pilihan) - bisa + / Delete di manager atas`:'Pilih Nama Bahan/Kategori dulu'}</option>{filteredSubByNamaBahan.map(s=><option key={s} value={s}>{s}</option>)}</select><div className="text-[10px] text-slate-500 mt-1">Contoh: POK → Beras → ketan/merah/porang/putih | SAY → Polong → Buncis/Kacang Panjang | BIN → Gula → Jawa/Merah/Pasir</div></div></div>
          <div className="grid grid-cols-[280px_1fr]"><div className="bg-slate-50 px-5 py-4 border-r"><div className="font-bold text-sm">5. Satuan</div></div><div className="px-5 py-3"><select className="w-full border-2 p-4 rounded-xl text-sm min-h-[52px]" value={form.satuan} onChange={e=>setForm({...form, satuan: e.target.value})}><option>Kg</option><option>Ltr</option><option>Pcs</option><option>Buah</option><option>Ikat</option><option>Karung</option><option>Botol</option><option>Set</option></select></div></div>
          <div className="grid grid-cols-[280px_1fr]"><div className="bg-slate-50 px-5 py-4 border-r"><div className="font-bold text-sm">6. Stock</div></div><div className="px-5 py-3"><input type="number" className="w-full border-2 p-4 rounded-xl text-sm min-h-[52px]" value={form.stok_tambahan} onChange={e=>setForm({...form, stok_tambahan: e.target.value})} required /></div></div>
          <div className="grid grid-cols-[280px_1fr]"><div className="bg-slate-50 px-5 py-4 border-r"><div className="font-bold text-sm">7. Harga Baru</div></div><div className="px-5 py-3"><input type="number" className="w-full border-2 p-4 rounded-xl text-sm min-h-[52px]" value={form.harga_baru} onChange={e=>setForm({...form, harga_baru: e.target.value})} required /></div></div>
        </div>
        <div className="p-5 bg-[#0A1931]"><button type="submit" className="w-full bg-[#D4AF37] text-[#0A1931] font-bold px-6 py-4 rounded-xl text-sm">💾 Simpan Dinamis - {form.kategori} / {form.namaBahanKategori} / {form.sub_kategori}</button></div>
      </form>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="bg-[#0A1931] text-white px-5 py-3 text-sm font-bold">📋 Tabel {filteredItems.length}/{items.length} bahan</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100"><tr><th className="p-3">Kode</th><th className="p-3 text-left">Nama Lengkap</th><th className="p-3">Kategori</th><th className="p-3">Nama Bahan/Kategori</th><th className="p-3">Sub</th><th className="p-3">Stock</th></tr></thead>
            <tbody>{paginatedItems.map(it=>{
              const parts = (it.nama_bahan||'').split(' ')
              const sub = it.sub_kategori||parts[parts.length-1]||'-'
              const namaKat = parts.slice(0,-1).join(' ')||it.nama_bahan
              return <tr key={it.id} className="border-b"><td className="p-3 font-mono text-[12px] font-bold text-blue-700">{it.kode_bahan}</td><td className="p-3 font-bold">{it.nama_bahan}</td><td className="p-3">{it.kategori}</td><td className="p-3 bg-yellow-50">{namaKat}</td><td className="p-3 bg-blue-50 font-bold text-blue-800">{sub}</td><td className="p-3 text-center">{it.stok}</td></tr>
            })}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
