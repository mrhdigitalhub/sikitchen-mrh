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
    if (kat && kat.length>0) setKategoris(kat)
    else setKategoris(kategoriList9.map(n=>({nama:n})))
    const { data: inv } = await supabase.from('inventory_items').select('*').order('nama_bahan').eq('perusahaan','SIKITCHEN-MRH')
    setItems(inv || [])
    setLoading(false)
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
      perusahaan: 'SIKITCHEN-MRH',
      status: 'Aktif'
    }
    if(editingId){
      const { error } = await supabase.from('inventory_items').update(payload).eq('id', editingId)
      if(error) alert(error.message)
    } else {
      const kode = 'BHN-' + Date.now().toString().slice(-6)
      const { error } = await supabase.from('inventory_items').insert({...payload, kode_bahan: kode}).select().single()
      if(error) alert(error.message)
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
      perusahaan: 'SIKITCHEN-MRH'
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

  if(loading) return <div className="p-6">Loading Inventori V4.1...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1931]">Inventori Stok V4.1 - Excel Sistematis (9 Kategori)</h1>
          <p className="text-xs text-slate-500 mt-1">Urutan baru: 1.Kode → 2.Kategori → 3.Nama Bahan → 4.Sub → 5.Satuan → 6.Stock → 7.Min → 8.Harga Lama → 9.Harga Baru → 10.Supplier Nama → 11.Supplier WA | No 12 Perusahaan dihapus | Kode BHN-xxxx</p>
        </div>
        <button onClick={()=>{ setShowForm(!showForm); if(!showForm){ setEditingId(null); setForm({ nama_bahan: '', kategori: 'Bahan Pokok', sub_kategori: '', satuan: 'Kg', stok: '', stok_minimum: '5', supplier_nama: '', supplier_wa: '', harga_lama: '', harga_baru: '', perusahaan: 'SIKITCHEN-MRH' }); setKodePreview('BHN-' + Date.now().toString().slice(-6)) } }} className="bg-[#0A1931] text-white px-4 py-2 rounded-xl text-sm shrink-0">{showForm?'Tutup Form':' + Bahan Baru'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border-2 border-[#D4AF37]/40 shadow-sm overflow-hidden">
          <div className="bg-[#0A1931] text-white px-4 py-3 flex justify-between items-center">
            <div className="font-bold text-sm">{editingId ? '✏️ Edit Bahan - V4.1' : '➕ Tambah Bahan Baru - V4.1 Excel (No 12 dihapus)'}</div>
            <div className="text-[11px] bg-white/10 px-2 py-1 rounded">1.Kode | 2.Kategori | 3.Nama | 4.Sub | 5.Satuan | 6.Stock | 7.Min | 8.H.Lama | 9.H.Baru | 10.Supplier | 11.WA</div>
          </div>
          
          <div className="divide-y divide-slate-200">
            {/* 1 Kode */}
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-slate-50 px-4 py-3 border-r flex flex-col justify-center">
                <div className="font-bold text-xs text-[#0A1931]">1. Kode Bahan</div>
                <div className="text-[10px] text-slate-500">Auto BHN-xxxx</div>
              </div>
              <div className="px-4 py-2.5 flex items-center">
                <input className="w-full bg-slate-100 border border-slate-200 p-2.5 rounded-lg text-sm font-mono text-slate-600" value={kodePreview} readOnly />
              </div>
            </div>

            {/* 2 Kategori - PINDAH DARI NO 3 */}
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-[#FFF8E1] px-4 py-3 border-r flex flex-col justify-center">
                <div className="font-bold text-xs text-[#0A1931]">2. Kategori <span className="text-red-500">*</span></div>
                <div className="text-[10px] text-slate-500">9 Kategori dari foto Bos</div>
              </div>
              <div className="px-4 py-2.5">
                <select className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm focus:border-[#D4AF37] focus:outline-none" value={form.kategori} onChange={e=>setForm({...form, kategori: e.target.value})} required>
                  {kategoris.map(k=><option key={k.nama} value={k.nama}>{k.nama}</option>)}
                </select>
              </div>
            </div>

            {/* 3 Nama Bahan - PINDAH DARI NO 2 */}
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-[#FFF8E1] px-4 py-3 border-r flex flex-col justify-center">
                <div className="font-bold text-xs text-[#0A1931]">3. Nama Bahan <span className="text-red-500">*</span></div>
                <div className="text-[10px] text-slate-500">Contoh: Beras ketan hitam</div>
              </div>
              <div className="px-4 py-2.5">
                <input className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm focus:border-[#D4AF37] focus:outline-none" placeholder="Beras ketan hitam, Ceker ayam, Box nasi sekat 3" value={form.nama_bahan} onChange={e=>setForm({...form, nama_bahan: e.target.value})} required />
              </div>
            </div>

            {/* 4 Sub-Kategori */}
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-slate-50 px-4 py-3 border-r flex flex-col justify-center">
                <div className="font-bold text-xs text-[#0A1931]">4. Sub-Kategori</div>
                <div className="text-[10px] text-slate-500">Karbohidrat, Ayam, Daun, Box</div>
              </div>
              <div className="px-4 py-2.5">
                <input className="w-full border p-2.5 rounded-lg text-sm" placeholder="Karbohidrat, Ayam, Daun, Box, dll" value={form.sub_kategori} onChange={e=>setForm({...form, sub_kategori: e.target.value})} />
              </div>
            </div>

            {/* 5 Satuan */}
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-[#FFF8E1] px-4 py-3 border-r flex flex-col justify-center">
                <div className="font-bold text-xs text-[#0A1931]">5. Satuan <span className="text-red-500">*</span></div>
                <div className="text-[10px] text-slate-500">Kg/Ltr/Pcs/Buah/Ikat/Karung/Botol/Set</div>
              </div>
              <div className="px-4 py-2.5">
                <select className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" value={form.satuan} onChange={e=>setForm({...form, satuan: e.target.value})} required>
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
                <input type="number" step="0.01" className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" placeholder="10 (Kg), 100 (Pcs)" value={form.stok} onChange={e=>setForm({...form, stok: e.target.value})} required />
              </div>
            </div>

            {/* 7 Stock Minimum */}
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-slate-50 px-4 py-3 border-r flex flex-col justify-center">
                <div className="font-bold text-xs text-[#0A1931]">7. Stock Minimum</div>
                <div className="text-[10px] text-slate-500">Alert Low &lt; Min</div>
              </div>
              <div className="px-4 py-2.5">
                <input type="number" step="0.01" className="w-full border p-2.5 rounded-lg text-sm" value={form.stok_minimum} onChange={e=>setForm({...form, stok_minimum: e.target.value})} />
              </div>
            </div>

            {/* 8 Harga Lama */}
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-slate-50 px-4 py-3 border-r flex flex-col justify-center">
                <div className="font-bold text-xs text-[#0A1931]">8. Harga Lama (Rp)</div>
                <div className="text-[10px] text-slate-500">Harga sebelumnya</div>
              </div>
              <div className="px-4 py-2.5">
                <input type="number" className="w-full border p-2.5 rounded-lg text-sm" placeholder="12000" value={form.harga_lama} onChange={e=>setForm({...form, harga_lama: e.target.value})} />
              </div>
            </div>

            {/* 9 Harga Baru */}
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-[#FFF8E1] px-4 py-3 border-r flex flex-col justify-center">
                <div className="font-bold text-xs text-[#0A1931]">9. Harga Baru (Rp) <span className="text-red-500">*</span></div>
                <div className="text-[10px] text-slate-500">Harga per Satuan - Wajib</div>
              </div>
              <div className="px-4 py-2.5">
                <input type="number" className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" placeholder="15000" value={form.harga_baru} onChange={e=>setForm({...form, harga_baru: e.target.value})} required />
                {lamaNum>0 && baruNum>0 && (
                  <div className="mt-2 text-[11px] bg-slate-50 border rounded p-2 flex gap-3">
                    <span>Selisih: <b className={selisihPreview>0?'text-red-600':'text-green-600'}>{selisihPreview>0?'+':''}Rp {selisihPreview.toLocaleString('id-ID')}</b></span>
                    <span>%: <b className={persenPreview>0?'text-red-600':'text-green-600'}>{persenPreview>0?'+':''}{persenPreview.toFixed(1)}%</b></span>
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
                <input className="w-full border p-2.5 rounded-lg text-sm" placeholder="Toko Beras Jaya" value={form.supplier_nama} onChange={e=>setForm({...form, supplier_nama: e.target.value})} />
              </div>
            </div>

            {/* 11 Supplier WA */}
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-slate-50 px-4 py-3 border-r flex flex-col justify-center">
                <div className="font-bold text-xs text-[#0A1931]">11. Supplier WA</div>
                <div className="text-[10px] text-slate-500">Untuk tombol WA order</div>
              </div>
              <div className="px-4 py-2.5">
                <input className="w-full border p-2.5 rounded-lg text-sm" placeholder="0812xxxx" value={form.supplier_wa} onChange={e=>setForm({...form, supplier_wa: e.target.value})} />
              </div>
            </div>

            {/* No 12 DIHAPUS - Perusahaan */}
          </div>

          <div className="p-4 bg-[#FFF8E1] border-t-2 border-[#D4AF37]/30 flex gap-3">
            <button type="submit" className="flex-1 bg-[#D4AF37] hover:bg-[#c19b2e] text-[#0A1931] font-bold px-4 py-3 rounded-xl text-sm shadow">{editingId ? '💾 Update Bahan' : '💾 Simpan Bahan Baru'}</button>
            <button type="button" onClick={()=>{ setShowForm(false); setEditingId(null) }} className="bg-white border px-6 py-3 rounded-xl text-sm">Batal</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border-2 border-[#0A1931]/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#0A1931] text-white">
              <tr>
                <th className="text-left p-2.5">Kode</th>
                <th className="text-left p-2.5">Kategori</th>
                <th className="text-left p-2.5">Nama Bahan</th>
                <th className="text-left p-2.5">Sub</th>
                <th className="text-center p-2.5">Stock</th>
                <th className="text-right p-2.5">Harga Baru</th>
                <th className="text-right p-2.5">Naik/Turun</th>
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
                return (
                  <tr key={it.id} className="border-b hover:bg-yellow-50">
                    <td className="p-2.5 font-mono text-[11px] font-bold">{it.kode_bahan||'BHN-...'}</td>
                    <td className="p-2.5"><span className="bg-slate-100 px-2 py-1 rounded-full text-[11px] border">{it.kategori||it.klasifikasi}</span></td>
                    <td className="p-2.5 font-medium">{it.nama_bahan||it.name}</td>
                    <td className="p-2.5 text-[11px]">{it.sub_kategori||'-'}</td>
                    <td className="p-2.5 text-center font-bold">{stok} {it.satuan||it.unit}</td>
                    <td className="p-2.5 text-right font-bold">Rp {baru.toLocaleString('id-ID')}</td>
                    <td className="p-2.5 text-right text-[11px]"><span className={selisih>0?'text-red-600':'text-green-600'}>{selisih>0?'+':''}{persen.toFixed(1)}%</span></td>
                    <td className="p-2.5 text-center"><div className="flex gap-1 justify-center"><button onClick={()=>editItem(it)} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[11px]">Edit</button><button onClick={()=>deleteItem(it.id)} className="bg-red-100 text-red-700 px-2 py-1 rounded text-[11px]">Hapus</button></div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
