"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function InventoryV4ExcelFix() {
  const [items, setItems] = useState([])
  const [kategoris, setKategoris] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [kodePreview, setKodePreview] = useState('')
  const [debugMsg, setDebugMsg] = useState('')
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
    setDebugMsg('Load...')
    try {
      const { data: kat, error: katErr } = await supabase.from('kategori_bahan').select('*').order('nama')
      if (katErr) console.warn('kategori error', katErr)
      if (kat && kat.length>0) setKategoris(kat)
      else setKategoris(kategoriList9.map(n=>({nama:n})))

      // Coba load tanpa filter perusahaan dulu untuk debug
      let { data: inv, error } = await supabase.from('inventory_items').select('*').order('created_at', {ascending:false}).limit(100)
      if(error){
        setDebugMsg('❌ LOAD ERROR: ' + error.message)
        console.error(error)
      } else {
        // Filter client side untuk SIKITCHEN-MRH
        const filteredMRH = (inv||[]).filter(it => !it.perusahaan || it.perusahaan === 'SIKITCHEN-MRH')
        setItems(filteredMRH)
        setDebugMsg(`✅ Load OK: ${filteredMRH.length} bahan dari ${inv?.length||0} total | Supabase: ${supabase ? 'Connected' : 'No client'}`)
      }
    } catch(e){
      setDebugMsg('❌ Exception load: ' + e.message)
    }
    setLoading(false)
    setKodePreview('BHN-' + Date.now().toString().slice(-6))
  }
  useEffect(()=>{ load() }, [])

  const filtered = useMemo(()=>{
    return items.filter(it=>{
      if(filterNama && !(it.nama_bahan||it.name||'').toLowerCase().includes(filterNama.toLowerCase())) return false
      if(filterKategori!=='Semua' && (it.kategori||it.klasifikasi||it.category) !== filterKategori) return false
      return true
    })
  }, [items, filterNama, filterKategori])

  async function handleSubmit(e){
    e.preventDefault()
    setDebugMsg('⏳ Menyimpan...')
    
    // VALIDASI WAJIB
    if(!form.nama_bahan.trim()){ alert('Nama Bahan wajib!'); return }
    if(!form.stok){ alert('Stock Saat Ini wajib!'); return }
    if(!form.harga_baru){ alert('Harga Baru wajib!'); return }

    // PAYLOAD MINIMAL + LENGKAP (kompatibel dengan tabel lama & baru)
    const kode = editingId ? undefined : 'BHN-' + Date.now().toString().slice(-6)
    const basePayload = {
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
    // Hanya tambahkan kode_bahan jika insert baru
    const payload = kode ? {...basePayload, kode_bahan: kode} : basePayload

    console.log('PAYLOAD:', payload)

    try {
      if(editingId){
        const { error } = await supabase.from('inventory_items').update(payload).eq('id', editingId)
        if(error){
          setDebugMsg('❌ UPDATE ERROR: ' + error.message + ' | Code: ' + error.code)
          alert('❌ Gagal update: ' + error.message + '\n\nDetail: ' + JSON.stringify(error, null,2))
          console.error(error)
          return
        }
        setDebugMsg('✅ Update OK: ' + form.nama_bahan)
        alert('✅ Berhasil update: ' + form.nama_bahan)
      } else {
        // Coba insert dengan kode_bahan
        let { data, error } = await supabase.from('inventory_items').insert(payload).select().single()
        if(error){
          console.warn('Insert dengan kode_bahan gagal, coba tanpa kode_bahan:', error.message)
          // Fallback tanpa kode_bahan jika kolom belum ada
          const { kode_bahan, ...payloadNoKode } = payload
          const retry = await supabase.from('inventory_items').insert(payloadNoKode).select().single()
          data = retry.data
          error = retry.error
        }
        if(error){
          setDebugMsg('❌ INSERT ERROR: ' + error.message + ' | Code: ' + error.code + ' | Hint: ' + error.hint)
          alert('❌ Gagal simpan: ' + error.message + '\n\nPenyebab umum:\n1. Kolom belum ada di Supabase (jalankan SQL)\n2. RLS belum ada policy\n3. ENV Vercel belum diisi\n\nDetail: ' + JSON.stringify(error, null,2))
          console.error(error)
          return
        }
        setDebugMsg('✅ Simpan OK: ' + data.nama_bahan + ' | ID: ' + data.id)
        alert('✅ Berhasil simpan: ' + data.nama_bahan + ' (' + (data.kode_bahan||'tanpa kode') + ')')
      }
      setForm({ nama_bahan: '', kategori: 'Bahan Pokok', sub_kategori: '', satuan: 'Kg', stok: '', stok_minimum: '5', supplier_nama: '', supplier_wa: '', harga_lama: '', harga_baru: '', perusahaan: 'SIKITCHEN-MRH' })
      setEditingId(null)
      setShowForm(true) // Tetap buka untuk input selanjutnya (Opsi B)
      setKodePreview('BHN-' + Date.now().toString().slice(-6))
      load()
    } catch(e){
      setDebugMsg('❌ Exception save: ' + e.message)
      alert('❌ Exception: ' + e.message)
      console.error(e)
    }
  }

  function editItem(it){
    setForm({
      nama_bahan: it.nama_bahan||it.name||'',
      kategori: it.kategori||it.klasifikasi||it.category||'Bahan Pokok',
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
    setKodePreview(it.kode_bahan||'BHN-xxxx')
    setEditingId(it.id)
    setShowForm(true)
    window.scrollTo({top:0, behavior:'smooth'})
  }

  async function deleteItem(id){
    if(!confirm('Hapus bahan ini?')) return
    const { error } = await supabase.from('inventory_items').delete().eq('id', id)
    if(error){ alert(error.message); return }
    load()
  }

  if(loading) return <div className="p-6">Loading Inventori V4.2 Fix Save...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1931]">Inventori Stok V4.2 - FIX SAVE (Debug)</h1>
          <p className="text-xs text-slate-500 mt-1">Flow: 2.Kategori → 3.Nama → 4.Sub → 5.Satuan → 6.Stock → 7.Min → 8.H.Lama → 9.H.Baru → 10.Supplier → 11.WA → Simpan → Form kosong lagi untuk input berikutnya (Opsi B)</p>
          <div className="mt-2 text-[11px] bg-yellow-50 border border-yellow-300 p-2 rounded">🔍 DEBUG: {debugMsg} | URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ ENV OK' : '❌ ENV MISSING - Cek Vercel Settings'}</div>
        </div>
        <button onClick={()=>{ setShowForm(!showForm); }} className="bg-[#0A1931] text-white px-4 py-2 rounded-xl text-sm shrink-0">{showForm?'Tutup Form':' + Bahan Baru'}</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border-2 border-[#D4AF37]/40 shadow-sm overflow-hidden">
          <div className="bg-[#0A1931] text-white px-4 py-3 flex justify-between items-center">
            <div className="font-bold text-sm">{editingId ? '✏️ Edit Bahan' : '➕ Tambah Bahan Baru - V4.2 (Save Fix + Auto lanjut)'} </div>
            <div className="text-[11px] bg-white/10 px-2 py-1 rounded">Setelah Simpan → Form kosong lagi → Input bahan berikutnya terus</div>
          </div>
          
          <div className="divide-y divide-slate-200">
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">1. Kode Bahan</div><div className="text-[10px] text-slate-500">Auto BHN-xxxx</div></div>
              <div className="px-4 py-2.5"><input className="w-full bg-slate-100 border p-2.5 rounded-lg text-sm font-mono" value={kodePreview} readOnly /></div>
            </div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">2. Kategori *</div><div className="text-[10px] text-slate-500">9 Kategori</div></div>
              <div className="px-4 py-2.5"><select className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" value={form.kategori} onChange={e=>setForm({...form, kategori: e.target.value})} required>{kategoris.map(k=><option key={k.nama} value={k.nama}>{k.nama}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">3. Nama Bahan *</div><div className="text-[10px] text-slate-500">Contoh: Beras ketan hitam</div></div>
              <div className="px-4 py-2.5"><input className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" placeholder="Beras ketan hitam, Ceker ayam, Box sekat 3" value={form.nama_bahan} onChange={e=>setForm({...form, nama_bahan: e.target.value})} required /></div>
            </div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">4. Sub-Kategori</div><div className="text-[10px] text-slate-500">Karbohidrat, Ayam, Box</div></div>
              <div className="px-4 py-2.5"><input className="w-full border p-2.5 rounded-lg text-sm" placeholder="Karbohidrat, Ayam, Daun, Box" value={form.sub_kategori} onChange={e=>setForm({...form, sub_kategori: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">5. Satuan *</div><div className="text-[10px] text-slate-500">Kg/Ltr/Pcs</div></div>
              <div className="px-4 py-2.5"><select className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" value={form.satuan} onChange={e=>setForm({...form, satuan: e.target.value})} required><option>Kg</option><option>Ltr</option><option>Pcs</option><option>Buah</option><option>Ikat</option><option>Karung</option><option>Botol</option><option>Set</option><option>Pack</option><option>Sachet</option></select></div>
            </div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">6. Stock Saat Ini *</div><div className="text-[10px] text-slate-500">Wajib angka</div></div>
              <div className="px-4 py-2.5"><input type="number" step="0.01" className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" placeholder="10" value={form.stok} onChange={e=>setForm({...form, stok: e.target.value})} required /></div>
            </div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">7. Stock Minimum</div><div className="text-[10px] text-slate-500">Alert Low</div></div>
              <div className="px-4 py-2.5"><input type="number" className="w-full border p-2.5 rounded-lg text-sm" value={form.stok_minimum} onChange={e=>setForm({...form, stok_minimum: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">8. Harga Lama (Rp)</div></div>
              <div className="px-4 py-2.5"><input type="number" className="w-full border p-2.5 rounded-lg text-sm" placeholder="12000" value={form.harga_lama} onChange={e=>setForm({...form, harga_lama: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">9. Harga Baru (Rp) *</div></div>
              <div className="px-4 py-2.5"><input type="number" className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" placeholder="15000" value={form.harga_baru} onChange={e=>setForm({...form, harga_baru: e.target.value})} required /></div>
            </div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">10. Supplier Nama</div></div>
              <div className="px-4 py-2.5"><input className="w-full border p-2.5 rounded-lg text-sm" value={form.supplier_nama} onChange={e=>setForm({...form, supplier_nama: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
              <div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">11. Supplier WA</div></div>
              <div className="px-4 py-2.5"><input className="w-full border p-2.5 rounded-lg text-sm" placeholder="0812xxxx" value={form.supplier_wa} onChange={e=>setForm({...form, supplier_wa: e.target.value})} /></div>
            </div>
          </div>

          <div className="p-4 bg-[#FFF8E1] border-t-2 border-[#D4AF37]/30 flex gap-3">
            <button type="submit" className="flex-1 bg-[#D4AF37] hover:bg-[#c19b2e] text-[#0A1931] font-bold px-4 py-3 rounded-xl text-sm shadow">💾 Simpan Bahan Baku - Auto lanjut input berikutnya</button>
            <button type="button" onClick={()=>{ setShowForm(false); setEditingId(null) }} className="bg-white border px-6 py-3 rounded-xl text-sm">Batal / Lihat Tabel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="bg-[#0A1931] text-white px-4 py-2.5">📋 Tabel Inventori ({filtered.length} bahan) - {debugMsg}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#0A1931] text-white"><tr><th className="p-2.5 text-left">Kode</th><th className="p-2.5 text-left">Kategori</th><th className="p-2.5 text-left">Nama</th><th className="p-2.5 text-center">Stock</th><th className="p-2.5 text-right">Harga Baru</th><th className="p-2.5 text-center">Aksi</th></tr></thead>
            <tbody>
              {filtered.map(it=>{
                const baru = Number(it.harga_baru||it.price_per_unit||0)
                const stok = Number(it.stok||it.stock_qty||0)
                return (<tr key={it.id} className="border-b hover:bg-yellow-50"><td className="p-2.5 font-mono text-[11px]">{it.kode_bahan||'-'}</td><td className="p-2.5">{it.kategori||it.klasifikasi}</td><td className="p-2.5 font-bold">{it.nama_bahan||it.name}</td><td className="p-2.5 text-center">{stok} {it.satuan||it.unit}</td><td className="p-2.5 text-right">Rp {baru.toLocaleString('id-ID')}</td><td className="p-2.5 text-center"><button onClick={()=>editItem(it)} className="bg-blue-100 text-blue-700 px-2 py-1 rounded mr-1">Edit</button><button onClick={()=>deleteItem(it.id)} className="bg-red-100 text-red-700 px-2 py-1 rounded">Hapus</button></td></tr>)
              })}
            </tbody>
          </table>
        </div>
        {filtered.length===0 && <div className="p-8 text-center text-sm text-slate-500">Belum ada data - Cek DEBUG di atas. Jika ❌ ENV MISSING, isi Vercel ENV. Jika ❌ column does not exist, jalankan SQL di bawah.</div>}
      </div>

      <div className="bg-white p-4 rounded-xl border text-xs space-y-2">
        <div className="font-bold text-[#0A1931]">🔧 Jika data tidak tersimpan, jalankan SQL ini di Supabase → SQL Editor:</div>
        <pre className="bg-slate-900 text-green-400 p-3 rounded-lg overflow-x-auto text-[11px]">{`-- FIX TABEL INVENTORY_ITEMS untuk V4.2
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS kode_bahan TEXT,
ADD COLUMN IF NOT EXISTS nama_bahan TEXT,
ADD COLUMN IF NOT EXISTS sub_kategori TEXT,
ADD COLUMN IF NOT EXISTS satuan TEXT,
ADD COLUMN IF NOT EXISTS stok NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS stok_minimum NUMERIC DEFAULT 5,
ADD COLUMN IF NOT EXISTS supplier_nama TEXT,
ADD COLUMN IF NOT EXISTS supplier_wa TEXT,
ADD COLUMN IF NOT EXISTS harga_lama NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS harga_baru NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS perusahaan TEXT DEFAULT 'SIKITCHEN-MRH';

-- RLS OFF atau Policy allow all (untuk tahap development)
ALTER TABLE inventory_items DISABLE ROW LEVEL SECURITY;
-- atau jika mau tetap RLS ON:
-- CREATE POLICY "allow all" ON inventory_items FOR ALL USING (true) WITH CHECK (true);

-- Cek ENV di Vercel:
-- NEXT_PUBLIC_SUPABASE_URL = https://xxxx.supabase.co
-- NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbG...
-- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (jika pakai key baru)
`}</pre>
      </div>
    </div>
  )
}
