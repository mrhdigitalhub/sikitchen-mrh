"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function InventoryTablePage() {
  const [items, setItems] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [kategoris, setKategoris] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nama_bahan: '', klasifikasi: 'Bumbu', merek: '', stok: '', harga_lama: '', harga_baru: '', supplier_id: '', unit: 'kg' })
  
  const [filterNama, setFilterNama] = useState('')
  const [filterKlasifikasi, setFilterKlasifikasi] = useState('Semua')
  const [filterMerek, setFilterMerek] = useState('Semua')
  const [filterSupplier, setFilterSupplier] = useState('Semua')
  const [sortBy, setSortBy] = useState('nama_bahan')

  async function load() {
    setLoading(true)
    const { data: inv } = await supabase.from('inventory_items').select('*, suppliers(nama,no_hp)').order('nama_bahan')
    const { data: sup } = await supabase.from('suppliers').select('*').order('nama')
    const { data: kat } = await supabase.from('kategori_bahan').select('*').order('nama')
    setItems(inv || [])
    setSuppliers(sup || [])
    setKategoris(kat || [])
    if (kat && kat.length>0 && !form.klasifikasi) setForm(f=>({...f, klasifikasi: kat[0].nama}))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const klasifikasiList = useMemo(() => {
    if (kategoris.length>0) return ['Semua', ...kategoris.map(k=>k.nama)]
    return ['Semua','Bumbu','Sayuran','Daging','Padi-padian','Buah','Tepung','Minuman','Pendukung']
  }, [kategoris])

  const klasifikasiFormList = useMemo(() => {
    if (kategoris.length>0) return kategoris.map(k=>k.nama)
    return ['Bumbu','Sayuran','Daging','Padi-padian','Buah','Tepung','Minuman','Pendukung']
  }, [kategoris])

  const allMereks = useMemo(() => {
    const set = new Set()
    items.forEach(it => (it.merek||[]).forEach(m => set.add(m)))
    return ['Semua', ...Array.from(set)]
  }, [items])

  const filtered = useMemo(() => {
    return items.filter(it => {
      if (filterNama && !(it.nama_bahan||it.name||'').toLowerCase().includes(filterNama.toLowerCase())) return false
      if (filterKlasifikasi !== 'Semua' && (it.klasifikasi||it.category) !== filterKlasifikasi) return false
      if (filterMerek !== 'Semua' && !(it.merek||[]).includes(filterMerek)) return false
      if (filterSupplier !== 'Semua' && (it.suppliers?.nama) !== filterSupplier) return false
      return true
    }).sort((a,b) => {
      if (sortBy==='harga_baru') return (a.harga_baru||a.price_per_unit||0) - (b.harga_baru||b.price_per_unit||0)
      if (sortBy==='stok') return (a.stok||a.stock_qty||0) - (b.stok||b.stock_qty||0)
      return (a.nama_bahan||a.name||'').localeCompare(b.nama_bahan||b.name||'')
    })
  }, [items, filterNama, filterKlasifikasi, filterMerek, filterSupplier, sortBy])

  async function createItem(e) {
    e.preventDefault()
    const merekArr = form.merek.split(',').map(s=>s.trim()).filter(Boolean)
    const payload = {
      nama_bahan: form.nama_bahan,
      name: form.nama_bahan,
      klasifikasi: form.klasifikasi,
      category: form.klasifikasi,
      merek: merekArr,
      stok: Number(form.stok),
      stock_qty: Number(form.stok),
      harga_lama: Number(form.harga_lama),
      harga_baru: Number(form.harga_baru),
      price_per_unit: Number(form.harga_baru),
      unit: form.unit,
      supplier_id: form.supplier_id || null
    }
    const { data, error } = await supabase.from('inventory_items').insert(payload).select().single()
    if (error) alert(error.message)
    else {
      if (Number(form.harga_lama) !== Number(form.harga_baru)) {
        await supabase.from('price_history').insert({ inventory_item_id: data.id, harga_lama: Number(form.harga_lama), harga_baru: Number(form.harga_baru), notes: 'Input Tabel Dropdown Dinamis' })
      }
      setForm({ nama_bahan: '', klasifikasi: klasifikasiFormList[0]||'Bumbu', merek: '', stok: '', harga_lama: '', harga_baru: '', supplier_id: '', unit: 'kg' })
      setShowForm(false)
      load()
    }
  }

  if (loading) return <div className="p-6">Loading Tabel Dropdown Dinamis...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-navy">Inventori Stok (Tahap 2 Lengkap - Tabel Dropdown Dinamis)</h1>
          <p className="text-sm text-slate-500">Kategori dinamis dari DB kategori_bahan - Admin bisa tambah di Dashboard</p>
        </div>
        <button onClick={()=>setShowForm(!showForm)} className="bg-navy text-white px-4 py-2 rounded-xl text-sm">{showForm?'Tutup':'+ Bahan Baru'}</button>
      </div>

      {showForm && (
        <form onSubmit={createItem} className="bg-white p-4 rounded-xl border shadow-sm grid grid-cols-2 gap-3">
          <input className="border p-2 rounded-lg col-span-2" placeholder="Nama Bahan" value={form.nama_bahan} onChange={e=>setForm({...form, nama_bahan: e.target.value})} required />
          <select className="border p-2 rounded-lg" value={form.klasifikasi} onChange={e=>setForm({...form, klasifikasi: e.target.value})}>
            {klasifikasiFormList.map(k=><option key={k} value={k}>{k}</option>)}
          </select>
          <input className="border p-2 rounded-lg" placeholder="Merek[] pisah koma" value={form.merek} onChange={e=>setForm({...form, merek: e.target.value})} />
          <input type="number" className="border p-2 rounded-lg" placeholder="Stok" value={form.stok} onChange={e=>setForm({...form, stok: e.target.value})} />
          <select className="border p-2 rounded-lg" value={form.unit} onChange={e=>setForm({...form, unit: e.target.value})}>
            <option value="kg">kg</option><option value="liter">liter</option><option value="pcs">pcs</option><option value="ikat">ikat</option><option value="karung">karung</option>
          </select>
          <input type="number" className="border p-2 rounded-lg" placeholder="Harga Lama" value={form.harga_lama} onChange={e=>setForm({...form, harga_lama: e.target.value})} />
          <input type="number" className="border p-2 rounded-lg" placeholder="Harga Baru" value={form.harga_baru} onChange={e=>setForm({...form, harga_baru: e.target.value})} />
          <select className="border p-2 rounded-lg col-span-2" value={form.supplier_id} onChange={e=>setForm({...form, supplier_id: e.target.value})}>
            <option value="">Pilih Supplier (no_hp WA)</option>
            {suppliers.map(s=><option key={s.id} value={s.id}>{s.nama || s.name} - {s.no_hp || s.phone}</option>)}
          </select>
          <button type="submit" className="bg-gold text-navy font-semibold px-4 py-2 rounded-xl col-span-2">Simpan</button>
        </form>
      )}

      <div className="bg-white p-3 rounded-xl border shadow-sm grid grid-cols-5 gap-3">
        <div>
          <label className="text-[11px] text-slate-500 font-semibold">Cari Nama Bahan</label>
          <input className="w-full border p-2 rounded-lg text-sm mt-1" placeholder="Ketik nama..." value={filterNama} onChange={e=>setFilterNama(e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] text-slate-500 font-semibold">Dropdown Klasifikasi (Dinamis)</label>
          <select className="w-full border p-2 rounded-lg text-sm mt-1" value={filterKlasifikasi} onChange={e=>setFilterKlasifikasi(e.target.value)}>
            {klasifikasiList.map(k=><option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-slate-500 font-semibold">Dropdown Merek[]</label>
          <select className="w-full border p-2 rounded-lg text-sm mt-1" value={filterMerek} onChange={e=>setFilterMerek(e.target.value)}>
            {allMereks.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-slate-500 font-semibold">Dropdown Supplier + WA</label>
          <select className="w-full border p-2 rounded-lg text-sm mt-1" value={filterSupplier} onChange={e=>setFilterSupplier(e.target.value)}>
            <option value="Semua">Semua Supplier</option>
            {suppliers.map(s=><option key={s.id} value={s.nama || s.name}>{s.nama || s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-slate-500 font-semibold">Sort By</label>
          <select className="w-full border p-2 rounded-lg text-sm mt-1" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="nama_bahan">Nama A-Z</option>
            <option value="harga_baru">Harga Baru</option>
            <option value="stok">Stok</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy text-white">
              <tr>
                <th className="text-left p-3 font-semibold">Nama Bahan</th>
                <th className="text-left p-3 font-semibold">Klasifikasi ▼</th>
                <th className="text-left p-3 font-semibold">Merek[] ▼</th>
                <th className="text-center p-3 font-semibold">Stok</th>
                <th className="text-left p-3 font-semibold">Supplier + WA ▼</th>
                <th className="text-right p-3 font-semibold">Harga Lama</th>
                <th className="text-right p-3 font-semibold">Harga Baru</th>
                <th className="text-center p-3 font-semibold">WA</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(it=>(
                <tr key={it.id} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-medium">{it.nama_bahan || it.name}<div className="text-[11px] text-slate-500">{it.unit}</div></td>
                  <td className="p-3"><span className="bg-slate-100 px-2 py-1 rounded-full text-xs">{it.klasifikasi || it.category}</span></td>
                  <td className="p-3 text-xs">{(it.merek||[]).join(', ') || '-'}</td>
                  <td className="p-3 text-center">{it.stok ?? it.stock_qty} {it.unit}</td>
                  <td className="p-3 text-xs">
                    <div className="font-medium">{it.suppliers?.nama || '-'}</div>
                    <div className="text-green-600">{it.suppliers?.no_hp ? `WA: ${it.suppliers.no_hp}` : ''}</div>
                  </td>
                  <td className="p-3 text-right text-slate-400 line-through text-xs">Rp {Number(it.harga_lama||0).toLocaleString('id-ID')}</td>
                  <td className="p-3 text-right font-bold">Rp {Number(it.harga_baru||it.price_per_unit||0).toLocaleString('id-ID')}</td>
                  <td className="p-3 text-center"><button onClick={()=> window.open(`https://wa.me/${it.suppliers?.no_hp?.replace(/[^0-9]/g,'')}`, '_blank')} className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">WA</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length===0 && <div className="p-6 text-center text-sm text-slate-500">Tidak ada data sesuai filter dropdown</div>}
        <div className="p-3 bg-slate-50 text-xs text-slate-500">Total: {filtered.length} dari {items.length} bahan | Kategori dinamis: {klasifikasiFormList.length} kategori | Filter: {filterKlasifikasi} | {filterMerek} | {filterSupplier}</div>
      </div>
    </div>
  )
}
