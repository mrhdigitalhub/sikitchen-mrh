"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function InventoryDataInventoryMasterBahan() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [kodePreview, setKodePreview] = useState('')
  const [form, setForm] = useState({ kategori: 'POK', namaKategori: 'Beras', subKategori: 'putih', satuan: 'Kg', stok: '50', stokMin: '5', harga: '15500', supplierNama: 'Toko Beras Utama', supplierWa: '081752323656' })
  const [searchQuery, setSearchQuery] = useState('')
  const [filterKategori, setFilterKategori] = useState('Semua')

  const [kategoriLabel] = useState({'POK':'Bahan Pokok','HEW':'Protein Hewani','NAB':'Protein Nabati','SAY':'Sayuran','BSG':'Bumbu Segar','BIN':'Bumbu Instan','SAO':'Saos & Cairan','PLG':'Pelengkap & garnish','KEM':'Kemasan /Packing'})

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

  function getKodeB1(kategori, currentItems){
    const prefix = `BHN-${kategori}-`
    const nums = currentItems.filter(it => (it.kode_bahan||'').startsWith(prefix)).map(it => { const m=(it.kode_bahan||'').match(new RegExp(`^BHN-${kategori}-(\\d+)`)); return m?parseInt(m[1],10):0 })
    const next = (nums.length?Math.max(...nums):0)+1
    return `${prefix}${String(next).padStart(3,'0')}`
  }

  // ✅ Harga Awal auto dari kesamaan nama bahan + supplier + sub kategori
  const hargaAwalData = useMemo(()=>{
    const namaLengkap = `${form.namaKategori} ${form.subKategori}`.trim().toLowerCase()
    if(!namaLengkap || !form.namaKategori || !form.subKategori) return null
    // cari exact match nama bahan + sub kategori
    let found = items.find(it => (it.nama_bahan||'').toLowerCase() === namaLengkap)
    if(found) return found
    // cari berdasarkan nama bahan + supplier + sub kategori mirip
    found = items.find(it => {
      const namaMatch = (it.nama_bahan||'').toLowerCase().includes(form.namaKategori.toLowerCase()) && (it.sub_kategori||'').toLowerCase() === form.subKategori.toLowerCase()
      const supplierMatch = form.supplierNama ? (it.supplier_nama||'').toLowerCase() === form.supplierNama.toLowerCase() : true
      return namaMatch && supplierMatch
    })
    if(found) return found
    // fallback cari hanya nama bahan + sub
    found = items.find(it => (it.nama_bahan||'').toLowerCase().includes(form.namaKategori.toLowerCase()) && (it.nama_bahan||'').toLowerCase().includes(form.subKategori.toLowerCase()))
    return found || null
  }, [form.namaKategori, form.subKategori, form.supplierNama, items])

  async function load(){
    setLoading(true)
    const { data } = await supabase.from('inventory_items').select('*').order('kode_bahan').limit(500)
    if(data) setItems(data)
    setLoading(false)
  }
  useEffect(()=>{ load() }, [])
  useEffect(()=>{ setKodePreview(getKodeB1(form.kategori, items)) }, [form.kategori, items])

  const kategoriList = Object.keys(kategoriLabel).sort()
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
      const payload = { stok: stokBaru, stock_qty: stokBaru, stok_minimum: Number(form.stokMin)||5, min_stock: Number(form.stokMin)||5, harga_baru: Number(form.harga)||existing.harga_baru||0, price_per_unit: Number(form.harga)||existing.price_per_unit||0, supplier_nama: form.supplierNama||existing.supplier_nama||null, supplier_wa: form.supplierWa||existing.supplier_wa||null, sub_kategori: form.subKategori, kategori: form.kategori, satuan: form.satuan, unit: form.satuan }
      const { error } = await supabase.from('inventory_items').update(payload).eq('id', existing.id)
      if(error) return alert(error.message)
      alert(`UPDATE: ${namaLengkap} stok ${stokBaru}`)
      load()
    } else {
      const payload = { kode_bahan: kodePreview, nama_bahan: namaLengkap, name: namaLengkap, kategori: form.kategori, sub_kategori: form.subKategori, satuan: form.satuan, unit: form.satuan, stok: Number(form.stok)||0, stock_qty: Number(form.stok)||0, stok_minimum: Number(form.stokMin)||5, min_stock: Number(form.stokMin)||5, harga_baru: Number(form.harga)||0, price_per_unit: Number(form.harga)||0, supplier_nama: form.supplierNama||null, supplier_wa: form.supplierWa||null, perusahaan: 'SIKITCHEN-MRH', status: 'Aktif' }
      const { error } = await supabase.from('inventory_items').insert(payload)
      if(error) return alert(error.message)
      alert(`INSERT: ${namaLengkap} (${kodePreview})`)
      load()
    }
  }

  function addKategori(){ const kode = inputKategori.kode.trim().toUpperCase(); const label = inputKategori.label.trim(); if(!kode || !label) return; if(kategoriLabel[kode]) return alert('Sudah ada'); setInputKategori({ kode: '', label: '' }); load() }
  function deleteKategori(){ if(!confirm(`Hapus ${formatKategori(form.kategori)}?`)) return; }
  function addNamaKategori(){ const v=inputNama.trim(); if(!v) return; setHierarchy(prev=>({...prev, [form.kategori]: {...prev[form.kategori], [v]: []}})); setInputNama(''); setForm(f=>({...f, namaKategori: v, subKategori: ''})); }
  function deleteNamaKategori(){ if(!confirm(`Hapus ${form.namaKategori}?`)) return; const copy={...hierarchy}; delete copy[form.kategori][form.namaKategori]; setHierarchy(copy); setForm(f=>({...f, namaKategori: '', subKategori: ''})); }
  function addSubKategori(){ const v=inputSub.trim(); if(!v || !form.namaKategori) return; setHierarchy(prev=>({...prev, [form.kategori]: {...prev[form.kategori], [form.namaKategori]: [...prev[form.kategori][form.namaKategori], v]}})); setInputSub(''); setForm(f=>({...f, subKategori: v})); }
  function deleteSubKategori(){ if(!confirm(`Hapus ${form.subKategori}?`)) return; }

  async function migrasiDataLama(){
    if(!confirm('Migrasi data lama?')) return
    let count=0
    for(const it of items){
      let newSub = it.sub_kategori
      if(['Karbohidrat','Ayam','Box','Daun','Minyak'].includes(it.sub_kategori)){
        newSub = (it.nama_bahan||'').split(' ').pop()
      }
      if(newSub!==it.sub_kategori){
        await supabase.from('inventory_items').update({ sub_kategori: newSub }).eq('id', it.id)
        count++
      }
    }
    alert(`${count} dimigrasi`)
    load()
  }

  if(loading) return <div className="p-6">Loading...</div>

  return (
    <div className="space-y-4">
      {/* 1. Header menjadi Data Inventory-Master Bahan */}
      <div className="bg-[#0A1931] text-white p-4 rounded-xl flex justify-between items-center">
        <div className="font-bold text-sm">Data Inventory-Master Bahan</div>
        <div className="flex gap-2">
          <button onClick={migrasiDataLama} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-2 rounded-full text-xs font-bold">Migrasi</button>
          <button onClick={migrasiDataLama} className="bg-[#D4AF37] hover:bg-[#c19a2e] text-[#0A1931] px-3 py-2 rounded-full text-xs font-bold">Fix Data Lama</button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border shadow overflow-hidden">
        <div className="bg-[#FFF8E1] px-5 py-3 font-bold text-sm border-b">INPUT CEPAT 3 LANGKAH</div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border-2 border-[#0A1931] rounded-xl p-3 bg-[#0A1931]/5 flex flex-col gap-2">
            <div className="font-bold text-xs">LANGKAH 1: Kategori (9 LOCK)</div>
            <select className="w-full border-2 p-3 rounded-xl font-bold text-sm bg-white" value={form.kategori} onChange={e=>setForm({...form, kategori: e.target.value, namaKategori: '', subKategori: ''})}>
              {kategoriList.map(k=><option key={k} value={k}>{k} - {kategoriLabel[k]} ({Object.keys(hierarchy[k]||{}).length})</option>)}
            </select>
            <div className="bg-white p-2 rounded border text-[10px]">Kode: <b className="font-mono">{kodePreview}</b></div>
            <button type="button" onClick={deleteKategori} className="bg-red-500 text-white px-2 py-2 rounded-lg text-[11px] font-bold">🗑️ Delete {form.kategori}</button>
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-2 space-y-2"><div className="flex gap-1"><input className="w-[60px] border p-1.5 rounded text-xs" placeholder="POK" value={inputKategori.kode} onChange={e=>setInputKategori({...inputKategori, kode: e.target.value})} /><input className="flex-1 border p-1.5 rounded text-xs" placeholder="Bahan Pokok" value={inputKategori.label} onChange={e=>setInputKategori({...inputKategori, label: e.target.value})} /></div><button type="button" onClick={addKategori} className="w-full bg-[#D4AF37] text-black px-3 py-1.5 rounded font-bold text-xs">+ Tambah Kategori</button></div>
          </div>
          <div className="border-2 border-[#D4AF37] rounded-xl p-3 bg-yellow-50 flex flex-col gap-2">
            <div className="font-bold text-xs">LANGKAH 2: Nama Bahan/Kategori</div>
            <select className="w-full border-2 p-3 rounded-xl font-bold text-sm bg-white" value={form.namaKategori} onChange={e=>setForm({...form, namaKategori: e.target.value, subKategori: ''})} required><option value="">▼ Pilih</option>{Object.keys(hierarchy[form.kategori]||{}).sort().map(n=><option key={n} value={n}>{n} ({hierarchy[form.kategori][n]?.length})</option>)}</select>
            <button type="button" onClick={deleteNamaKategori} className="bg-red-500 text-white px-2 py-2 rounded-lg text-[11px] font-bold">🗑️ Delete {form.namaKategori||'Nama'}</button>
            <div className="bg-white border border-yellow-300 rounded-lg p-2"><input className="w-full border p-1.5 rounded text-xs" placeholder="Contoh: Beras" value={inputNama} onChange={e=>setInputNama(e.target.value)} /><button type="button" onClick={addNamaKategori} className="w-full bg-[#D4AF37] text-black mt-2 px-3 py-1.5 rounded font-bold text-xs">+ Tambah Nama Bahan</button></div>
          </div>
          <div className="border-2 border-blue-300 rounded-xl p-3 bg-blue-50 flex flex-col gap-2">
            <div className="font-bold text-xs">LANGKAH 3: Sub Kategori (spesifik!)</div>
            <select className="w-full border-2 p-3 rounded-xl font-bold text-sm bg-white" value={form.subKategori} onChange={e=>setForm({...form, subKategori: e.target.value})} required><option value="">▼ Pilih</option>{(hierarchy[form.kategori]?.[form.namaKategori]||[]).map(s=><option key={s} value={s}>{s}</option>)}</select>
            <button type="button" onClick={deleteSubKategori} className="bg-red-500 text-white px-2 py-2 rounded-lg text-[11px] font-bold">🗑️ Delete {form.subKategori||'Sub'}</button>
            <div className="bg-white border border-blue-300 rounded-lg p-2"><input className="w-full border p-1.5 rounded text-xs" placeholder="Contoh: putih" value={inputSub} onChange={e=>setInputSub(e.target.value)} /><button type="button" onClick={addSubKategori} className="w-full bg-green-600 text-white mt-2 px-3 py-1.5 rounded font-bold text-xs">+ Tambah Sub</button></div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="bg-slate-50 rounded-xl p-4 border">
            <div className="font-bold text-xs mb-3">Detail Stock Qty Supplier WA Harga:</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div><label className="text-[11px] font-bold">Satuan *</label><select className="w-full border-2 p-3 rounded-xl text-sm bg-white" value={form.satuan} onChange={e=>setForm({...form, satuan: e.target.value})}><option>Kg</option><option>Ltr</option><option>Pcs</option><option>Buah</option><option>Ikat</option><option>Karung</option></select></div>
              <div><label className="text-[11px] font-bold">Stock - Qty *</label><input type="number" className="w-full border-2 p-3 rounded-xl text-sm bg-white" value={form.stok} onChange={e=>setForm({...form, stok: e.target.value})} required /></div>
              <div><label className="text-[11px] font-bold">Stock Minimum</label><input type="number" className="w-full border-2 p-3 rounded-xl text-sm bg-white" value={form.stokMin} onChange={e=>setForm({...form, stokMin: e.target.value})} /></div>
              <div>
                <label className="text-[11px] font-bold">Harga Awal (auto)</label>
                <div className="w-full border-2 p-3 rounded-xl text-sm bg-yellow-50 font-bold">
                  {hargaAwalData ? `Rp ${(hargaAwalData.harga_baru||0).toLocaleString('id-ID')} - ${hargaAwalData.nama_bahan} | ${hargaAwalData.supplier_nama||''} | ${hargaAwalData.sub_kategori}` : '-'}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Diambil dari kesamaan nama bahan + supplier + sub kategori</div>
              </div>
              <div><label className="text-[11px] font-bold">Harga Baru *</label><input type="number" className="w-full border-2 p-3 rounded-xl text-sm bg-white" value={form.harga} onChange={e=>setForm({...form, harga: e.target.value})} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div><label className="text-[11px] font-bold">Nama Supplier</label><input className="w-full border-2 p-3 rounded-xl text-sm bg-green-50" value={form.supplierNama} onChange={e=>setForm({...form, supplierNama: e.target.value})} /></div>
              <div><label className="text-[11px] font-bold">Supplier WA</label><input className="w-full border-2 p-3 rounded-xl text-sm bg-green-50" value={form.supplierWa} onChange={e=>setForm({...form, supplierWa: e.target.value})} /></div>
            </div>
          </div>

          <div className="bg-[#0A1931] p-3 rounded-xl text-white text-xs mt-3">
            Preview: <b>{formatKategori(form.kategori)}</b> → {form.namaKategori} → {form.subKategori} = <b>{form.namaKategori} {form.subKategori}</b> | {kodePreview} | {form.stok} {form.satuan} | Harga Awal: {hargaAwalData ? `Rp ${(hargaAwalData.harga_baru||0).toLocaleString('id-ID')}` : '-'} | Harga Baru: Rp {Number(form.harga||0).toLocaleString('id-ID')}
          </div>

          <div className="mt-3 flex justify-center">
            <button type="submit" className="bg-[#D4AF37] text-black font-bold px-8 py-2.5 rounded-full text-sm">Simpan Data</button>
          </div>
        </div>
      </form>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="bg-[#0A1931] text-white px-5 py-3 flex justify-between items-center">
          <span className="text-sm font-bold">Tabel {filteredItems.length}/{items.length} Bahan</span>
          <div className="flex gap-2">
            <input className="px-3 py-1.5 rounded text-xs text-black w-[200px]" placeholder="Search..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
            <select className="px-3 py-1.5 rounded text-xs text-black min-w-[160px]" value={filterKategori} onChange={e=>setFilterKategori(e.target.value)}><option value="Semua">Semua (9 Kategori)</option>{kategoriList.map(k=><option key={k} value={k}>{k} - {kategoriLabel[k]}</option>)}</select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-100"><tr><th className="p-2">Kode</th><th className="p-2 text-left">Nama Lengkap</th><th className="p-2">Kategori</th><th className="p-2">Nama Bahan</th><th className="p-2">Sub</th><th className="p-2">Stock - Qty</th><th className="p-2">Harga Baru</th><th className="p-2">Supplier</th></tr></thead>
            <tbody>{filteredItems.slice(0,100).map(it=><tr key={it.id} className="border-b"><td className="p-2 font-mono font-bold text-blue-700">{it.kode_bahan}</td><td className="p-2 font-bold">{it.nama_bahan}</td><td className="p-2 bg-[#FFF8E1]">{formatKategori(it.kategori)}</td><td className="p-2 bg-yellow-50">{it.nama_bahan.split(' ').slice(0,-1).join(' ')}</td><td className="p-2 bg-blue-50 font-bold">{it.sub_kategori}</td><td className="p-2 text-center">{it.stok} {it.satuan}</td><td className="p-2 text-right">Rp {(it.harga_baru||0).toLocaleString('id-ID')}</td><td className="p-2 text-[11px]">{it.supplier_nama}<br/><span className="text-green-600">{it.supplier_wa}</span></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
