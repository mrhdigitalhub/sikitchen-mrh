"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function InventoryV4Excel() {
  const [items, setItems] = useState([])
  const [kategoris, setKategoris] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [kodePreview, setKodePreview] = useState('')
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

  const satuanList = ['Kg','Ltr','Pcs','Buah','Ikat','Karung','Botol','Set','Pack','Sachet']

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
    // generate kode preview
    setKodePreview('BHN-' + Date.now().toString().slice(-6))
  }
  useEffect(()=>{ load() }, [])

  const filtered = useMemo(()=>{
    return items.filter(it=>{
      if(filterNama && !(it.nama_bahan||'').toLowerCase().includes(filterNama.toLowerCase())) return false
      if(filterKategori!=='Semua' && (it.kategori||it.klasifikasi) !== filterKategori) return false
      return true
    })
  }, [items, filterNama, filterKategori])

  // Hitung naik/turun preview
  const lamaNum = Number(form.harga_lama)||0
  const baruNum = Number(form.harga_baru)||0
  const selisihPreview = baruNum - lamaNum
  const persenPreview = lamaNum>0 ? ((baruNum-lamaNum)/lamaNum*100) : 0

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
          await supabase.from('price_history').insert({ inventory_item_id: editingId, harga_lama: Number(form.harga_lama), harga_baru: Number(form.harga_baru), notes: 'Update Admin V4 Excel' })
        }
      }
    } else {
      const kode = 'BHN-' + Date.now().toString().slice(-6)
      const { data, error } = await supabase.from('inventory_items').insert({...payload, kode_bahan: kode}).select().single()
      if(error) alert(error.message)
      else {
        if(Number(form.harga_lama)!==Number(form.harga_baru) && Number(form.harga_lama)>0){
          await supabase.from('price_history').insert({ inventory_item_id: data.id, harga_lama: Number(form.harga_lama), harga_baru: Number(form.harga_baru), notes: 'Input Baru V4 Excel' })
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
    setKodePreview(it.kode_bahan||'')
    setEditingId(it.id)
    setShowForm(true)
    window.scrollTo({top:0, behavior:'smooth'})
  }

  async function deleteItem(id){
    if(!confirm('Hapus bahan ini?')) return
    const { error } = await supabase.from('inventory_items').delete().eq('id', id)
    if(!error) load()
  }

  if(loading) return <div className="p-6">Loading Inventori V4 Excel...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1931]">Inventori Stok V4 - Excel Sistematis (9 Kategori Foto)</h1>
          <p className="text-xs text-slate-500 mt-1">Format Long: 1 baris = 1 bahan | Kode BHN-xxxx | Input Excel-Style: Label jelas di setiap baris, runtun vertikal | Sync ke Master Menu & Bahan → Dapur → Owner</p>
        </div>
        <button onClick={()=>{ setShowForm(!showForm); if(!showForm){ setEditingId(null); setForm({ nama_bahan: '', kategori: 'Bahan Pokok', sub_kategori: '', satuan: 'Kg', stok: '', stok_minimum: '5', supplier_nama: '', supplier_wa: '', harga_lama: '', harga_baru: '', perusahaan: 'SIKITCHEN-MRH' }); setKodePreview('BHN-' + Date.now().toString().slice(-6)) } }} className="bg-[#0A1931] text-white px-4 py-2 rounded-xl text-sm shrink-0">{showForm?'Tutup Form':' + Bahan Baru'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border-2 border-[#D4AF37]/40 shadow-sm overflow-hidden">
          <div className="bg-[#0A1931] text-white px-4 py-3 flex justify-between items-center">
            <div className="font-bold text-sm">{editingId ? '✏️ Edit Bahan - Mode Excel' : '➕ Tambah Bahan Baru (Tanpa Dummy) - Mode Excel Sistematis'}</div>
            <div className="text-[11px] bg-white/10 px-2 py-1 rounded">Format: 1 baris = 1 kolom Excel | Label kiri, Input kanan</div>
          </div>
          
          <div className="divide-y divide-slate-200">
            {/* 1 Kode */}
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-slate-50 px-4 py-3 border-r flex flex-col justify-center">
                <div className="font-bold text-xs text-[#0A1931]">1. Kode Bahan</div>
                <div className="text-[10px] text-slate-500">Auto generate BHN-xxxx</div>
              </div>
              <div className="px-4 py-2.5 flex items-center">
                <input className="w-full bg-slate-100 border border-slate-200 p-2.5 rounded-lg text-sm font-mono text-slate-600" value={editingId? kodePreview : kodePreview} readOnly placeholder="BHN-xxxx auto" />
              </div>
            </div>

            {/* 2 Nama Bahan */}
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-[#FFF8E1] px-4 py-3 border-r flex flex-col justify-center">
                <div className="font-bold text-xs text-[#0A1931]">2. Nama Bahan <span className="text-red-500">*</span></div>
                <div className="text-[10px] text-slate-500">Contoh: Beras ketan hitam</div>
              </div>
              <div className="px-4 py-2.5">
                <input className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm focus:border-[#D4AF37] focus:outline-none" placeholder="Ketik nama bahan - contoh: Beras ketan hitam, Ceker ayam, Box nasi sekat 3" value={form.nama_bahan} onChange={e=>setForm({...form, nama_bahan: e.target.value})} required />
              </div>
            </div>

            {/* 3 Kategori */}
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-[#FFF8E1] px-4 py-3 border-r flex flex-col justify-center">
                <div className="font-bold text-xs text-[#0A1931]">3. Kategori <span className="text-red-500">*</span></div>
                <div className="text-[10px] text-slate-500">9 Kategori dari foto Bos</div>
              </div>
              <div className="px-4 py-2.5">
                <select className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm focus:border-[#D4AF37] focus:outline-none" value={form.kategori} onChange={e=>setForm({...form, kategori: e.target.value})} required>
                  {kategoris.map(k=><option key={k.nama} value={k.nama}>{k.nama}</option>)}
                </select>
                <div className="text-[10px] text-slate-400 mt-1">Pilih: Bahan Pokok, Protein Hewani, Protein Nabati, Sayuran, Bumbu Segar, Bumbu Instan, Saos & Cairan, Pelengkap & garnish, Kemasan/Packing</div>
              </div>
            </div>

            {/* 4 Sub Kategori */}
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-slate-50 px-4 py-3 border-r flex flex-col justify-center">
                <div className="font-bold text-xs text-[#0A1931]">4. Sub-Kategori</div>
                <div className="text-[10px] text-slate-500">Contoh: Karbohidrat, Ayam, Daun, Box</div>
              </div>
              <div className="px-4 py-2.5">
                <input className="w-full border p-2.5 rounded-lg text-sm" placeholder="Sub-kategori - contoh: Karbohidrat, Ayam, Daun, Bumbu Kering, Box, dll" value={form.sub_kategori} onChange={e=>setForm({...form, sub_kategori: e.target.value})} />
              </div>
            </div>

            {/* 5 Satuan */}
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-[#FFF8E1] px-4 py-3 border-r flex flex-col justify-center">
                <div className="font-bold text-xs text-[#0A1931]">5. Satuan <span className="text-red-500">*</span></div>
                <div className="text-[10px] text-slate-500">Kg/Ltr/Pcs/Buah/Ikat/Karung/Botol/Set</div>
              </div>
              <div className="px-4 py-2.5">
                <select className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm focus:border-[#D4AF37] focus:outline-none" value={form.satuan} onChange={e=>setForm({...form, satuan: e.target.value})} required>
                  {satuanList.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* 6 Stock Saat Ini */}
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-[#FFF8E1] px-4 py-3 border-r flex flex-col justify-center">
                <div className="font-bold text-xs text-[#0A1931]">6. Stock Saat Ini <span className="text-red-500">*</span></div>
                <div className="text-[10px] text-slate-500">Jumlah stok tersedia</div>
              </div>
              <div className="px-4 py-2.5">
                <input type="number" step="0.01" className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm focus:border-[#D4AF37] focus:outline-none" placeholder="Contoh: 10 (Kg), 100 (Pcs), 5 (Ltr)" value={form.stok} onChange={e=>setForm({...form, stok: e.target.value})} required />
              </div>
            </div>

            {/* 7 Stock Minimum */}
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-slate-50 px-4 py-3 border-r flex flex-col justify-center">
                <div className="font-bold text-xs text-[#0A1931]">7. Stock Minimum</div>
                <div className="text-[10px] text-slate-500">Alert Low Stock &lt; Minimum</div>
              </div>
              <div className="px-4 py-2.5">
                <input type="number" step="0.01" className="w-full border p-2.5 rounded-lg text-sm" placeholder="Default 5 - Jika stock &lt; ini, baris merah" value={form.stok_minimum} onChange={e=>setForm({...form, stok_minimum: e.target.value})} />
              </div>
            </div>

            {/* 8 Harga Lama */}
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-slate-50 px-4 py-3 border-r flex flex-col justify-center">
                <div className="font-bold text-xs text-[#0A1931]">8. Harga Lama (Rp)</div>
                <div className="text-[10px] text-slate-500">Harga sebelumnya</div>
              </div>
              <div className="px-4 py-2.5">
                <input type="number" className="w-full border p-2.5 rounded-lg text-sm" placeholder="Contoh: 12000 - untuk hitung naik/turun" value={form.harga_lama} onChange={e=>setForm({...form, harga_lama: e.target.value})} />
              </div>
            </div>

            {/* 9 Harga Baru */}
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-[#FFF8E1] px-4 py-3 border-r flex flex-col justify-center">
                <div className="font-bold text-xs text-[#0A1931]">9. Harga Baru (Rp) <span className="text-red-500">*</span></div>
                <div className="text-[10px] text-slate-500">Harga per Satuan - Wajib</div>
              </div>
              <div className="px-4 py-2.5">
                <input type="number" className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm focus:border-[#D4AF37] focus:outline-none" placeholder="Contoh: 15000 - Harga per Kg/Pcs/Ltr" value={form.harga_baru} onChange={e=>setForm({...form, harga_baru: e.target.value})} required />
                {lamaNum>0 && baruNum>0 && (
                  <div className="mt-2 text-[11px] bg-slate-50 border rounded p-2 flex gap-3">
                    <span>Selisih: <b className={selisihPreview>0?'text-red-600':'text-green-600'}>{selisihPreview>0?'+':''}Rp {selisihPreview.toLocaleString('id-ID')}</b></span>
                    <span>%: <b className={persenPreview>0?'text-red-600':'text-green-600'}>{persenPreview>0?'+':''}{persenPreview.toFixed(1)}%</b></span>
                    <span className="text-slate-500">(Baru-Lama)/Lama*100%</span>
                  </div>
                )}
              </div>
            </div>

            {/* 10 Supplier Nama */}
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-slate-50 px-4 py-3 border-r flex flex-col justify-center">
                <div className="font-bold text-xs text-[#0A1931]">10. Supplier Nama</div>
                <div className="text-[10px] text-slate-500">Nama toko/supplier</div>
              </div>
              <div className="px-4 py-2.5">
                <input className="w-full border p-2.5 rounded-lg text-sm" placeholder="Contoh: Toko Beras Jaya, Pasar Brebes, Suplier Ayam" value={form.supplier_nama} onChange={e=>setForm({...form, supplier_nama: e.target.value})} />
              </div>
            </div>

            {/* 11 Supplier WA */}
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-slate-50 px-4 py-3 border-r flex flex-col justify-center">
                <div className="font-bold text-xs text-[#0A1931]">11. Supplier WA</div>
                <div className="text-[10px] text-slate-500">Untuk tombol WA order</div>
              </div>
              <div className="px-4 py-2.5">
                <input className="w-full border p-2.5 rounded-lg text-sm" placeholder="Contoh: 0812xxxx - Format 08, auto jadi wa.me" value={form.supplier_wa} onChange={e=>setForm({...form, supplier_wa: e.target.value})} />
              </div>
            </div>

            {/* 12 Perusahaan */}
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-slate-50 px-4 py-3 border-r flex flex-col justify-center">
                <div className="font-bold text-xs text-[#0A1931]">12. Perusahaan</div>
                <div className="text-[10px] text-slate-500">Default SIKITCHEN-MRH</div>
              </div>
              <div className="px-4 py-2.5">
                <input className="w-full border p-2.5 rounded-lg text-sm bg-slate-50" placeholder="SIKITCHEN-MRH" value={form.perusahaan} onChange={e=>setForm({...form, perusahaan: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#FFF8E1] border-t-2 border-[#D4AF37]/30 flex gap-3">
            <button type="submit" className="flex-1 bg-[#D4AF37] hover:bg-[#c19b2e] text-[#0A1931] font-bold px-4 py-3 rounded-xl text-sm shadow">{editingId ? '💾 Update Bahan - Sync ke Master Menu' : '💾 Simpan Bahan Baru - Sync ke Master Menu & Dapur'}</button>
            <button type="button" onClick={()=>{ setShowForm(false); setEditingId(null) }} className="bg-white border px-6 py-3 rounded-xl text-sm">Batal</button>
          </div>
          <div className="px-4 py-2 bg-slate-50 text-[10px] text-slate-500 border-t">Rumus Excel: Selisih = Harga Baru - Harga Lama | % = (Baru-Lama)/Lama*100% | Kode auto BHN-xxxx | Sync ke Dapur dropdown Bahan & HPP 2 model Box & Fine Dining | Total: {items.length} bahan</div>
        </form>
      )}

      <div className="bg-white p-3 rounded-xl border shadow-sm grid grid-cols-3 gap-3">
        <div><label className="text-[11px] font-bold text-[#0A1931]">1. Cari Nama Bahan</label><input className="w-full border-2 border-slate-200 p-2.5 rounded-lg text-sm mt-1 focus:border-[#0A1931] focus:outline-none" placeholder="Ketik: Beras, Ayam, Box..." value={filterNama} onChange={e=>setFilterNama(e.target.value)} /></div>
        <div><label className="text-[11px] font-bold text-[#0A1931]">2. Filter Kategori (9 Kategori Foto)</label><select className="w-full border-2 border-slate-200 p-2.5 rounded-lg text-sm mt-1 focus:border-[#0A1931] focus:outline-none" value={filterKategori} onChange={e=>setFilterKategori(e.target.value)}><option value="Semua">Semua Kategori</option>{kategoris.map(k=><option key={k.nama} value={k.nama}>{k.nama}</option>)}</select></div>
        <div className="text-xs bg-[#0A1931] text-white p-3 rounded-lg"><div className="font-bold">Total: {filtered.length} dari {items.length} bahan</div><div className="text-[#D4AF37] text-[11px] mt-1">Kategori: {kategoris.length} | Format: 1 baris=1 bahan | Kode BHN- | Tanpa dummy - input langsung di dashboard!</div></div>
      </div>

      <div className="bg-white rounded-xl border-2 border-[#0A1931]/10 shadow-sm overflow-hidden">
        <div className="bg-[#0A1931] text-white px-4 py-2.5 flex justify-between items-center">
          <div className="font-bold text-sm">📋 Tabel Inventori Sistematis - Mode Excel</div>
          <div className="text-[11px] bg-white/10 px-2 py-1 rounded">Kode | Nama | Kategori | Sub | Stock | Supplier+WA | Harga Lama | Harga Baru | Naik/Turun | WA | Aksi</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#0A1931] text-white">
              <tr>
                <th className="text-left p-2.5 whitespace-nowrap">Kode</th>
                <th className="text-left p-2.5 whitespace-nowrap">Nama Bahan</th>
                <th className="text-left p-2.5 whitespace-nowrap">Kategori</th>
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
                  <tr key={it.id} className={`border-b hover:bg-yellow-50 ${low ? 'bg-red-50' : ''}`}>
                    <td className="p-2.5 font-mono text-[11px] font-bold">{it.kode_bahan||'BHN-...'}</td>
                    <td className="p-2.5 font-medium">{it.nama_bahan||it.name}<div className="text-[10px] text-slate-400">{it.satuan||it.unit}</div></td>
                    <td className="p-2.5"><span className="bg-slate-100 px-2 py-1 rounded-full text-[11px] border font-medium">{it.kategori||it.klasifikasi}</span></td>
                    <td className="p-2.5 text-[11px]">{it.sub_kategori||'-'}</td>
                    <td className="p-2.5 text-center"><span className={`${low ? 'text-red-600 font-bold' : 'font-bold'}`}>{stok} {it.satuan||it.unit}</span>{low && <div className="text-[10px] text-red-500">Low &lt;{min}</div>}</td>
                    <td className="p-2.5"><div className="font-medium">{it.supplier_nama||'-'}</div><div className="text-[11px] text-slate-500">{it.supplier_wa||''}</div></td>
                    <td className="p-2.5 text-right text-slate-400 line-through">Rp {lama.toLocaleString('id-ID')}</td>
                    <td className="p-2.5 text-right font-bold">Rp {baru.toLocaleString('id-ID')}</td>
                    <td className="p-2.5 text-right"><div className={`${selisih>0?'text-red-600':'text-green-600'} text-[11px] font-bold`}>{selisih>0?'+':''}Rp {selisih.toLocaleString('id-ID')}</div><div className={`${persen>0?'text-red-500':'text-green-500'} text-[10px]`}>{persen>0?'+':''}{persen.toFixed(1)}%</div></td>
                    <td className="p-2.5 text-center"><button onClick={()=>{ if(it.supplier_wa) window.open(`https://wa.me/${it.supplier_wa.replace(/[^0-9]/g,'')}`, '_blank') }} className="text-[11px] bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-full disabled:bg-slate-300" disabled={!it.supplier_wa}>WA</button></td>
                    <td className="p-2.5 text-center"><div className="flex gap-1 justify-center"><button onClick={()=>editItem(it)} className="text-[11px] bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded font-bold">Edit</button><button onClick={()=>deleteItem(it.id)} className="text-[11px] bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded font-bold">Hapus</button></div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length===0 && <div className="p-8 text-center"><div className="text-sm text-slate-500">Belum ada bahan - Format baru sistematis tanpa dummy!</div><div className="text-xs text-slate-400 mt-1">Klik + Bahan Baru untuk input: Beras ketan hitam, Ceker ayam, Tempe kedelai, Box nasi sekat 3, dll (9 kategori dari foto Bos). Stock & Harga input langsung di dashboard!</div></div>}
        <div className="p-3 bg-slate-50 text-[11px] text-slate-600 border-t flex justify-between"><span>Format Sistematis Excel: Kode BHN-xxxx | Nama Bahan | Kategori (9) | Sub-Kategori | Stock (Kg/Ltr/Pcs) | Supplier+WA | Harga Lama | Harga Baru | Naik/Turun | WA Button | Sync ke Master Menu & Bahan (Dropdown) → Dapur → Owner HPP 2 Model Box & Fine Dining</span><span className="font-bold">Total: {filtered.length} bahan</span></div>
      </div>
    </div>
  )
}
