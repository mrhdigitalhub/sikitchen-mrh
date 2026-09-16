"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function InventoryV3Sistematis() {
  const [items, setItems] = useState([])
  const [kategoris, setKategoris] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ 
    nama_bahan: '', 
    kategori: 'Bahan Pokok', 
    sub_kategori: '', 
    satuan: 'Kg',
    stok: '', 
    stok_minimum: '5',
    supplier_nama: '', 
    supplier_wa: '',
    harga_lama: '', 
    harga_baru: '',
    perusahaan: 'SIKITCHEN-MRH'
  })
  const [filterNama, setFilterNama] = useState('')
  const [filterKategori, setFilterKategori] = useState('Semua')

  const kategoriList9 = [
    'Bahan Pokok',
    'Protein Hewani',
    'Protein Nabati',
    'Sayuran',
    'Bumbu Segar',
    'Bumbu Instan',
    'Saos & Cairan',
    'Pelengkap & garnish',
    'Kemasan /Packing'
  ]

  async function load() {
    setLoading(true)
    const { data: kat } = await supabase.from('kategori_bahan').select('*').order('nama')
    if (kat && kat.length>0) {
      setKategoris(kat)
    } else {
      setKategoris(kategoriList9.map(n=>({nama:n})))
    }
    const { data: inv } = await supabase.from('inventory_items').select('*').order('nama_bahan').eq('perusahaan','SIKITCHEN-MRH')
    setItems(inv || [])
    setLoading(false)
  }
  useEffect(()=>{ load() }, [])

  const filtered = useMemo(()=>{
    return items.filter(it=>{
      if(filterNama && !(it.nama_bahan||'').toLowerCase().includes(filterNama.toLowerCase())) return false
      if(filterKategori!=='Semua' && (it.kategori||it.klasifikasi) !== filterKategori) return false
      return true
    })
  }, [items, filterNama, filterKategori])

  async function handleSubmit(e){
    e.preventDefault()
    const payload = {
      nama_bahan: form.nama_bahan.trim(),
      name: form.nama_bahan.trim(),
      kategori: form.kategori,
      klasifikasi: form.kategori,
      category: form.kategori,
      sub_kategori: form.sub_kategori.trim(),
      satuan: form.satuan,
      unit: form.satuan,
      stok: Number(form.stok)||0,
      stock_qty: Number(form.stok)||0,
      stok_minimum: Number(form.stok_minimum)||5,
      min_stock: Number(form.stok_minimum)||5,
      supplier_nama: form.supplier_nama.trim(),
      supplier_wa: form.supplier_wa.trim(),
      harga_lama: Number(form.harga_lama)||0,
      harga_baru: Number(form.harga_baru)||0,
      price_per_unit: Number(form.harga_baru)||0,
      perusahaan: form.perusahaan || 'SIKITCHEN-MRH',
      status: 'Aktif'
    }
    if(editingId){
      const { error } = await supabase.from('inventory_items').update(payload).eq('id', editingId)
      if(error) alert(error.message)
      else {
        if(Number(form.harga_lama)!==Number(form.harga_baru)){
          await supabase.from('price_history').insert({ inventory_item_id: editingId, harga_lama: Number(form.harga_lama), harga_baru: Number(form.harga_baru), notes: 'Update Admin V3 Sistematis' })
        }
      }
    } else {
      // generate kode BHN-
      const kode = 'BHN-' + Date.now().toString().slice(-6)
      const { data, error } = await supabase.from('inventory_items').insert({...payload, kode_bahan: kode}).select().single()
      if(error) alert(error.message)
      else {
        if(Number(form.harga_lama)!==Number(form.harga_baru) && Number(form.harga_lama)>0){
          await supabase.from('price_history').insert({ inventory_item_id: data.id, harga_lama: Number(form.harga_lama), harga_baru: Number(form.harga_baru), notes: 'Input Baru V3' })
        }
      }
    }
    setForm({ nama_bahan: '', kategori: 'Bahan Pokok', sub_kategori: '', satuan: 'Kg', stok: '', stok_minimum: '5', supplier_nama: '', supplier_wa: '', harga_lama: '', harga_baru: '', perusahaan: 'SIKITCHEN-MRH' })
    setEditingId(null)
    setShowForm(false)
    load()
  }

  function editItem(it){
    setForm({
      nama_bahan: it.nama_bahan||'',
      kategori: it.kategori||it.klasifikasi||'Bahan Pokok',
      sub_kategori: it.sub_kategori||'',
      satuan: it.satuan||it.unit||'Kg',
      stok: it.stok||it.stock_qty||'',
      stok_minimum: it.stok_minimum||it.min_stock||'5',
      supplier_nama: it.supplier_nama||'',
      supplier_wa: it.supplier_wa||'',
      harga_lama: it.harga_lama||'',
      harga_baru: it.harga_baru||it.price_per_unit||'',
      perusahaan: it.perusahaan||'SIKITCHEN-MRH'
    })
    setEditingId(it.id)
    setShowForm(true)
  }

  async function deleteItem(id){
    if(!confirm('Hapus bahan ini?')) return
    const { error } = await supabase.from('inventory_items').delete().eq('id', id)
    if(!error) load()
  }

  if(loading) return <div className="p-6">Loading Inventori V3 Sistematis...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1931]">Inventori Stok V3 - Sistematis (9 Kategori Foto)</h1>
          <p className="text-xs text-slate-500">Format Long: 1 baris = 1 bahan | Kode BHN-0001 | Kategori: Bahan Pokok, Protein Hewani, Protein Nabati, Sayuran, Bumbu Segar, Bumbu Instan, Saos & Cairan, Pelengkap & garnish, Kemasan/Packing | Sync ke Master Menu & Bahan → Dapur → Owner</p>
        </div>
        <button onClick={()=>{ setShowForm(!showForm); setEditingId(null); setForm({ nama_bahan: '', kategori: 'Bahan Pokok', sub_kategori: '', satuan: 'Kg', stok: '', stok_minimum: '5', supplier_nama: '', supplier_wa: '', harga_lama: '', harga_baru: '', perusahaan: 'SIKITCHEN-MRH' }) }} className="bg-[#0A1931] text-white px-4 py-2 rounded-xl text-sm">{showForm?'Tutup':' + Bahan Baru'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl border-2 border-[#D4AF37]/30 shadow-sm grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="col-span-3 font-bold text-sm text-[#0A1931]">{editingId ? 'Edit Bahan' : 'Tambah Bahan Baru (Tanpa Dummy)'} - Format Sistematis</div>
          <input className="border p-2.5 rounded-lg text-sm col-span-2" placeholder="Nama Bahan (contoh: Beras ketan hitam)" value={form.nama_bahan} onChange={e=>setForm({...form, nama_bahan: e.target.value})} required />
          <select className="border p-2.5 rounded-lg text-sm" value={form.satuan} onChange={e=>setForm({...form, satuan: e.target.value})}>
            <option value="Kg">Kg</option><option value="Ltr">Ltr</option><option value="Pcs">Pcs</option><option value="Buah">Buah</option><option value="Ikat">Ikat</option><option value="Karung">Karung</option><option value="Botol">Botol</option><option value="Set">Set</option>
          </select>
          <select className="border p-2.5 rounded-lg text-sm" value={form.kategori} onChange={e=>setForm({...form, kategori: e.target.value})} required>
            {kategoris.map(k=><option key={k.nama} value={k.nama}>{k.nama}</option>)}
          </select>
          <input className="border p-2.5 rounded-lg text-sm" placeholder="Sub-Kategori (Karbohidrat, Ayam, Daun, Box, dll)" value={form.sub_kategori} onChange={e=>setForm({...form, sub_kategori: e.target.value})} />
          <input type="number" step="0.01" className="border p-2.5 rounded-lg text-sm" placeholder="Stock Saat Ini (Kg/Ltr/Pcs)" value={form.stok} onChange={e=>setForm({...form, stok: e.target.value})} required />
          <input type="number" step="0.01" className="border p-2.5 rounded-lg text-sm" placeholder="Stock Minimum (default 5)" value={form.stok_minimum} onChange={e=>setForm({...form, stok_minimum: e.target.value})} />
          <input type="number" className="border p-2.5 rounded-lg text-sm" placeholder="Harga Lama (Rp)" value={form.harga_lama} onChange={e=>setForm({...form, harga_lama: e.target.value})} />
          <input type="number" className="border p-2.5 rounded-lg text-sm" placeholder="Harga Baru (Rp) - Harga per Satuan" value={form.harga_baru} onChange={e=>setForm({...form, harga_baru: e.target.value})} required />
          <input className="border p-2.5 rounded-lg text-sm" placeholder="Supplier Nama" value={form.supplier_nama} onChange={e=>setForm({...form, supplier_nama: e.target.value})} />
          <input className="border p-2.5 rounded-lg text-sm" placeholder="Supplier WA (0812xxxx)" value={form.supplier_wa} onChange={e=>setForm({...form, supplier_wa: e.target.value})} />
          <input className="border p-2.5 rounded-lg text-sm col-span-1" placeholder="Perusahaan" value={form.perusahaan} onChange={e=>setForm({...form, perusahaan: e.target.value})} />
          <button type="submit" className="bg-[#D4AF37] text-[#0A1931] font-bold px-4 py-2.5 rounded-xl text-sm col-span-2">{editingId ? 'Update Bahan' : 'Simpan Bahan - Sync ke Master Menu'}</button>
          <div className="col-span-3 text-[11px] text-slate-500">Rumus Naik/Turun: (Harga Baru - Harga Lama) & % = (Baru-Lama)/Lama*100% | Kode auto BHN-xxxx | Sync ke Dapur dropdown Bahan & HPP 2 model Box & Fine Dining</div>
        </form>
      )}

      <div className="bg-white p-3 rounded-xl border shadow-sm grid grid-cols-3 gap-3">
        <div><label className="text-[11px] font-semibold text-slate-500">Cari Nama Bahan</label><input className="w-full border p-2 rounded-lg text-sm mt-1" placeholder="Ketik: Beras, Ayam, Box..." value={filterNama} onChange={e=>setFilterNama(e.target.value)} /></div>
        <div><label className="text-[11px] font-semibold text-slate-500">Filter Kategori (9 Kategori Foto)</label><select className="w-full border p-2 rounded-lg text-sm mt-1" value={filterKategori} onChange={e=>setFilterKategori(e.target.value)}><option value="Semua">Semua Kategori</option>{kategoris.map(k=><option key={k.nama} value={k.nama}>{k.nama}</option>)}</select></div>
        <div className="text-xs bg-slate-50 p-2 rounded-lg border"><div className="font-bold">Total: {filtered.length} dari {items.length} bahan</div><div className="text-slate-500">Kategori: {kategoris.length} | Format: 1 baris=1 bahan | Kode BHN- | Tanpa dummy - input langsung di dashboard!</div></div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#0A1931] text-white">
              <tr>
                <th className="text-left p-2.5">Kode</th>
                <th className="text-left p-2.5">Nama Bahan</th>
                <th className="text-left p-2.5">Kategori</th>
                <th className="text-left p-2.5">Sub</th>
                <th className="text-center p-2.5">Stock (Kg/Ltr/Pcs)</th>
                <th className="text-left p-2.5">Supplier+ WA</th>
                <th className="text-right p-2.5">Harga Lama</th>
                <th className="text-right p-2.5">Harga Baru</th>
                <th className="text-right p-2.5">Naik/Turun</th>
                <th className="text-center p-2.5">WA</th>
                <th className="text-center p-2.5">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(it=>{
                const lama = Number(it.harga_lama||0)
                const baru = Number(it.harga_baru||it.price_per_unit||0)
                const selisih = baru - lama
                const persen = lama>0 ? ((baru-lama)/lama*100) : 0
                const stok = Number(it.stok||it.stock_qty||0)
                const min = Number(it.stok_minimum||it.min_stock||5)
                const low = stok < min
                return (
                  <tr key={it.id} className={`border-b hover:bg-slate-50 ${low ? 'bg-red-50' : ''}`}>
                    <td className="p-2.5 font-mono text-[11px]">{it.kode_bahan||'BHN-...'}</td>
                    <td className="p-2.5 font-medium">{it.nama_bahan||it.name}<div className="text-[10px] text-slate-400">{it.satuan||it.unit}</div></td>
                    <td className="p-2.5"><span className="bg-slate-100 px-2 py-1 rounded-full text-[11px] border">{it.kategori||it.klasifikasi}</span></td>
                    <td className="p-2.5 text-[11px]">{it.sub_kategori||'-'}</td>
                    <td className="p-2.5 text-center"><span className={`${low ? 'text-red-600 font-bold' : ''}`}>{stok} {it.satuan||it.unit}</span>{low && <div className="text-[10px] text-red-500">Low &lt;{min}</div>}</td>
                    <td className="p-2.5"><div className="font-medium">{it.supplier_nama||'-'}</div><div className="text-[11px] text-slate-500">{it.supplier_wa||''}</div></td>
                    <td className="p-2.5 text-right text-slate-400 line-through">Rp {lama.toLocaleString('id-ID')}</td>
                    <td className="p-2.5 text-right font-bold">Rp {baru.toLocaleString('id-ID')}</td>
                    <td className="p-2.5 text-right"><div className={`${selisih>0?'text-red-600':'text-green-600'} text-[11px]`}>{selisih>0?'+':''}Rp {selisih.toLocaleString('id-ID')}</div><div className={`${persen>0?'text-red-500':'text-green-500'} text-[10px]`}>{persen>0?'+':''}{persen.toFixed(1)}%</div></td>
                    <td className="p-2.5 text-center"><button onClick={()=>{ if(it.supplier_wa) window.open(`https://wa.me/${it.supplier_wa.replace(/[^0-9]/g,'')}`, '_blank') }} className="text-[11px] bg-green-500 text-white px-2 py-1 rounded-full disabled:bg-slate-300" disabled={!it.supplier_wa}>WA</button></td>
                    <td className="p-2.5 text-center"><div className="flex gap-1 justify-center"><button onClick={()=>editItem(it)} className="text-[11px] bg-blue-100 text-blue-700 px-2 py-1 rounded">Edit</button><button onClick={()=>deleteItem(it.id)} className="text-[11px] bg-red-100 text-red-700 px-2 py-1 rounded">Hapus</button></div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length===0 && <div className="p-8 text-center"><div className="text-sm text-slate-500">Belum ada bahan - Format baru sistematis tanpa dummy!</div><div className="text-xs text-slate-400 mt-1">Klik + Bahan Baru untuk input: Beras ketan hitam, Ceker ayam, Tempe kedelai, Box nasi sekat 3, dll (9 kategori dari foto Bos). Stock & Harga input langsung di dashboard!</div></div>}
        <div className="p-3 bg-slate-50 text-[11px] text-slate-600 border-t">Format Sistematis: Kode BHN-xxxx | Nama Bahan | Kategori (9) | Sub-Kategori | Stock (Kg/Ltr/Pcs) | Supplier+WA | Harga Lama | Harga Baru | Naik/Turun | WA Button | Sync ke Master Menu & Bahan (Dropdown) → Dapur → Owner HPP 2 Model Box & Fine Dining | Total: {filtered.length} bahan</div>
      </div>
    </div>
  )
}
