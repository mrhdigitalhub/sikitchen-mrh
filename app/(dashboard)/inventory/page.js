"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function InventoryImprovedModel() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [kodePreview, setKodePreview] = useState('')
  const [mode, setMode] = useState('input') // input | manage
  const [form, setForm] = useState({ kategori: 'POK', namaKategori: '', subKategori: '', satuan: 'Kg', stok: '', stokMin: '5', harga: '', supplierNama: '', supplierWa: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [filterKategori, setFilterKategori] = useState('Semua')

  const kategoriLabel = {'POK':'Bahan Pokok','HEW':'Protein Hewani','NAB':'Protein Nabati','SAY':'Sayuran','BSG':'Bumbu Segar','BIN':'Bumbu Instan','SAO':'Saos & Cairan','PLG':'Pelengkap & garnish','KEM':'Kemasan /Packing'}
  const kategoriList = Object.keys(kategoriLabel)

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

  function getKode(kategori){
    const prefix = `BHN-${kategori}-`
    const nums = items.filter(it => (it.kode_bahan||'').startsWith(prefix)).map(it => { const m=(it.kode_bahan||'').match(new RegExp(`^BHN-${kategori}-(\\d+)`)); return m?parseInt(m[1],10):0 })
    return `${prefix}${String((nums.length?Math.max(...nums):0)+1).padStart(3,'0')}`
  }

  async function load(){
    setLoading(true)
    const { data } = await supabase.from('inventory_items').select('*').order('nama_bahan').limit(500)
    if(data) setItems(data)
    setLoading(false)
  }
  useEffect(()=>{ load() }, [])
  useEffect(()=>{ setKodePreview(getKode(form.kategori)) }, [form.kategori, items])

  const namaKategoriList = useMemo(()=> Object.keys(hierarchy[form.kategori]||{}).sort(), [hierarchy, form.kategori])
  const subKategoriList = useMemo(()=> hierarchy[form.kategori]?.[form.namaKategori] || [], [hierarchy, form.kategori, form.namaKategori])

  const filteredItems = useMemo(()=>{
    let f = items
    if(filterKategori !== 'Semua') f = f.filter(it => it.kategori === filterKategori)
    if(searchQuery) f = f.filter(it => (it.nama_bahan||'').toLowerCase().includes(searchQuery.toLowerCase()))
    return f
  }, [items, searchQuery, filterKategori])

  async function handleSubmit(e){
    e.preventDefault()
    if(!form.namaKategori || !form.subKategori) return alert('Pilih Nama Bahan/Kategori dan Sub Kategori dulu Bos!')
    const namaLengkap = `${form.namaKategori} ${form.subKategori}`
    const payload = { kode_bahan: kodePreview, nama_bahan: namaLengkap, name: namaLengkap, kategori: form.kategori, sub_kategori: form.subKategori, satuan: form.satuan, unit: form.satuan, stok: Number(form.stok)||0, stock_qty: Number(form.stok)||0, stok_minimum: Number(form.stokMin)||5, min_stock: Number(form.stokMin)||5, harga_baru: Number(form.harga)||0, price_per_unit: Number(form.harga)||0, supplier_nama: form.supplierNama||null, supplier_wa: form.supplierWa||null, perusahaan: 'SIKITCHEN-MRH', status: 'Aktif' }
    const { error, data } = await supabase.from('inventory_items').insert(payload).select().single()
    if(error) return alert(error.message)
    alert(`✅ Berhasil input: ${data.nama_bahan} (${data.kode_bahan}) - ${data.kategori}/${form.namaKategori}/${data.sub_kategori}`)
    setForm(f=>({...f, namaKategori: '', subKategori: '', stok: '', harga: ''}))
    load()
  }

  // Manage functions
  function addNama(kategori){
    const v = (newNamaInput[kategori]||'').trim()
    if(!v) return
    if(hierarchy[kategori][v]) return alert('Sudah ada')
    setHierarchy(p=>({...p, [kategori]: {...p[kategori], [v]: []}}))
    setNewNamaInput(p=>({...p, [kategori]: ''}))
  }
  function delNama(kategori, nama){
    if(!confirm(`Hapus ${nama} di ${kategori}?`)) return
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

  if(loading) return <div className="p-6">Loading model baru...</div>

  return (
    <div className="space-y-4">
      <div className="bg-[#0A1931] text-white p-4 rounded-xl">
        <div className="flex justify-between items-center">
          <div>
            <div className="font-bold">✅ MODEL BARU - Input Cepat 3 Langkah + Kelola Master Dinamis</div>
            <div className="text-[11px] text-green-300 mt-1">Cara Input: 1. Pilih KATEGORI (9 LOCK) → 2. Pilih Nama Bahan/Kategori (Beras/Jagung/Tepung) → 3. Pilih Sub (ketan/merah/porang/putih) → Isi Stok/Harga → Simpan</div>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>setMode('input')} className={`px-4 py-2 rounded-full text-xs font-bold ${mode==='input'?'bg-[#D4AF37] text-black':'bg-white/20'}`}>📝 Mode Input Cepat</button>
            <button onClick={()=>setMode('manage')} className={`px-4 py-2 rounded-full text-xs font-bold ${mode==='manage'?'bg-[#D4AF37] text-black':'bg-white/20'}`}>⚙️ Mode Kelola Master</button>
          </div>
        </div>
      </div>

      {mode === 'input' ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border-2 border-[#D4AF37]/30 shadow overflow-hidden">
          <div className="bg-[#FFF8E1] px-5 py-3 font-bold text-sm border-b">📝 INPUT CEPAT - 3 Langkah (Contoh Bos: POK → Beras → putih)</div>
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border-2 border-[#0A1931] rounded-xl p-3 bg-[#0A1931]/5">
                <div className="font-bold text-xs mb-2">LANGKAH 1: Kategori (9 LOCK)</div>
                <select className="w-full border-2 p-3 rounded-xl font-bold text-sm bg-white" value={form.kategori} onChange={e=>setForm({...form, kategori: e.target.value, namaKategori: '', subKategori: ''})}>
                  {kategoriList.map(k=><option key={k} value={k}>{k} - {kategoriLabel[k]} ({Object.keys(hierarchy[k]).length} Nama Bahan)</option>)}
                </select>
                <div className="text-[10px] mt-2 bg-white p-2 rounded border">Kode Preview: <b className="font-mono">{kodePreview}</b></div>
              </div>
              <div className="border-2 border-[#D4AF37] rounded-xl p-3 bg-yellow-50">
                <div className="font-bold text-xs mb-2">LANGKAH 2: Nama Bahan/Kategori</div>
                <select className="w-full border-2 p-3 rounded-xl font-bold text-sm bg-white" value={form.namaKategori} onChange={e=>setForm({...form, namaKategori: e.target.value, subKategori: ''})} required>
                  <option value="">▼ Pilih di {form.kategori} ({namaKategoriList.length} pilihan)</option>
                  {namaKategoriList.map(n=><option key={n} value={n}>{n} ({hierarchy[form.kategori][n]?.length} sub)</option>)}
                </select>
                <div className="text-[10px] mt-2">Contoh POK: Beras, Jagung, Tepung</div>
              </div>
              <div className="border-2 border-blue-300 rounded-xl p-3 bg-blue-50">
                <div className="font-bold text-xs mb-2">LANGKAH 3: Sub Kategori</div>
                <select className="w-full border-2 p-3 rounded-xl font-bold text-sm bg-white" value={form.subKategori} onChange={e=>setForm({...form, subKategori: e.target.value})} required disabled={!form.namaKategori}>
                  <option value="">{form.namaKategori?`▼ Pilih sub di ${form.namaKategori} (${subKategoriList.length})`:'Pilih Nama Bahan dulu'}</option>
                  {subKategoriList.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                <div className="text-[10px] mt-2">Contoh Beras: ketan, merah, porang, putih</div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border">
              <div className="font-bold text-xs mb-3">Detail Stock & Harga - Setelah 3 Langkah di atas terpilih:</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="text-[11px] font-bold">Satuan *</label><select className="w-full border-2 p-3 rounded-xl text-sm" value={form.satuan} onChange={e=>setForm({...form, satuan: e.target.value})}><option>Kg</option><option>Ltr</option><option>Pcs</option><option>Buah</option><option>Ikat</option><option>Karung</option></select></div>
                <div><label className="text-[11px] font-bold">Stock *</label><input type="number" className="w-full border-2 p-3 rounded-xl text-sm" placeholder="20" value={form.stok} onChange={e=>setForm({...form, stok: e.target.value})} required /></div>
                <div><label className="text-[11px] font-bold">Stock Min</label><input type="number" className="w-full border-2 p-3 rounded-xl text-sm" value={form.stokMin} onChange={e=>setForm({...form, stokMin: e.target.value})} /></div>
                <div><label className="text-[11px] font-bold">Harga Baru *</label><input type="number" className="w-full border-2 p-3 rounded-xl text-sm" placeholder="15000" value={form.harga} onChange={e=>setForm({...form, harga: e.target.value})} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <input className="border-2 p-3 rounded-xl text-sm" placeholder="Supplier Nama (opsional)" value={form.supplierNama} onChange={e=>setForm({...form, supplierNama: e.target.value})} />
                <input className="border-2 p-3 rounded-xl text-sm" placeholder="Supplier WA (opsional)" value={form.supplierWa} onChange={e=>setForm({...form, supplierWa: e.target.value})} />
              </div>
            </div>

            <div className="bg-[#0A1931] p-3 rounded-xl text-white text-xs">
              Preview: <b>{form.kategori} - {kategoriLabel[form.kategori]}</b> → <b className="text-yellow-300">{form.namaKategori||'(pilih Nama Bahan)'}</b> → <b className="text-blue-300">{form.subKategori||'(pilih Sub)'}</b> = Nama lengkap: <b>{form.namaKategori} {form.subKategori}</b> | Kode: <b>{kodePreview}</b>
            </div>

            <button type="submit" className="w-full bg-[#D4AF37] text-[#0A1931] font-bold py-4 rounded-xl text-sm">💾 Simpan - {form.kategori} / {form.namaKategori} / {form.subKategori}</button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-xl border-2 border-slate-200 shadow overflow-hidden">
          <div className="bg-[#FFF8E1] px-5 py-3 font-bold text-sm border-b">⚙️ KELOLA MASTER - Tambah/Delete Nama Bahan & Sub Kategori Dinamis (9 Kategori)</div>
          <div className="p-4 space-y-4 max-h-[700px] overflow-y-auto">
            {kategoriList.map(kat=>(
              <div key={kat} className="border-2 rounded-xl p-3 bg-slate-50">
                <div className="font-bold text-xs mb-2 bg-[#0A1931] text-white px-3 py-1.5 rounded-full inline-block">{kat} - {kategoriLabel[kat]} ({Object.keys(hierarchy[kat]).length} Nama Bahan)</div>
                <div className="space-y-2 mt-2">
                  {Object.entries(hierarchy[kat]||{}).map(([nama, subs])=>(
                    <div key={nama} className="bg-white border rounded-lg p-2.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs">📦 {nama} <span className="bg-blue-100 px-2 py-0.5 rounded-full text-[10px]">{subs.length} sub</span></span>
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
                        <input className="flex-1 border p-1.5 rounded text-xs" placeholder={`+ Sub baru untuk ${nama}`} value={newSubInput[`${kat}__${nama}`]||''} onChange={e=>setNewSubInput(p=>({...p, [`${kat}__${nama}`]: e.target.value}))} onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addSub(kat, nama) }}} />
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
        <div className="bg-[#0A1931] text-white px-5 py-3 flex justify-between">
          <span className="text-sm font-bold">📋 Tabel {filteredItems.length}/{items.length} bahan</span>
          <div className="flex gap-2">
            <input className="px-3 py-1.5 rounded text-xs text-black w-[200px]" placeholder="Search..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
            <select className="px-3 py-1.5 rounded text-xs text-black" value={filterKategori} onChange={e=>setFilterKategori(e.target.value)}><option value="Semua">Semua</option>{kategoriList.map(k=><option key={k} value={k}>{k}</option>)}</select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-100"><tr><th className="p-2">Kode</th><th className="p-2 text-left">Nama Lengkap</th><th className="p-2">Kategori</th><th className="p-2">Nama Bahan</th><th className="p-2">Sub</th><th className="p-2">Stock</th><th className="p-2">Harga</th></tr></thead>
            <tbody>{filteredItems.slice(0,50).map(it=><tr key={it.id} className="border-b"><td className="p-2 font-mono font-bold text-blue-700">{it.kode_bahan}</td><td className="p-2 font-bold">{it.nama_bahan}</td><td className="p-2">{it.kategori}</td><td className="p-2 bg-yellow-50">{(it.nama_bahan||'').split(' ').slice(0,-1).join(' ')||'-'}</td><td className="p-2 bg-blue-50 font-bold">{it.sub_kategori}</td><td className="p-2 text-center">{it.stok}</td><td className="p-2 text-right">Rp {(it.harga_baru||0).toLocaleString('id-ID')}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
