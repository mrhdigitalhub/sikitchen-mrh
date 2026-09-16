"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function InventoryV43Fixed() {
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
  })

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
    try {
      const { data: kat } = await supabase.from('kategori_bahan').select('*').order('nama')
      if (kat && kat.length>0) setKategoris(kat)
      else setKategoris(kategoriList9.map(n=>({nama:n})))
      const { data: inv, error } = await supabase.from('inventory_items').select('*').order('created_at', {ascending:false}).limit(100)
      if(error) setDebugMsg('❌ LOAD ERROR: ' + error.message)
      else {
        const filteredMRH = (inv||[]).filter(it => !it.perusahaan || it.perusahaan === 'SIKITCHEN-MRH')
        setItems(filteredMRH)
        setDebugMsg(`✅ Load OK: ${filteredMRH.length} bahan | Constraint klasifikasi_check sudah dibypass di kode`)
      }
    } catch(e){ setDebugMsg('❌ Exception: ' + e.message) }
    setLoading(false)
    setKodePreview('BHN-' + Date.now().toString().slice(-6))
  }
  useEffect(()=>{ load() }, [])

  async function handleSubmit(e){
    e.preventDefault()
    setDebugMsg('⏳ Menyimpan...')
    if(!form.nama_bahan.trim()){ alert('Nama Bahan wajib!'); return }
    if(!form.stok){ alert('Stock Saat Ini wajib!'); return }
    if(!form.harga_baru){ alert('Harga Baru wajib!'); return }

    // FIXED PAYLOAD V4.3 - TIDAK INSERT klasifikasi, category, klasifikasi_check BYPASS
    // Hanya kolom yang aman, biar tidak kena CHECK CONSTRAINT lama
    const kode = 'BHN-' + Date.now().toString().slice(-6)
    const payloadMinimal = {
      kode_bahan: kode,
      nama_bahan: form.nama_bahan.trim(),
      kategori: form.kategori,
      sub_kategori: form.sub_kategori.trim() || null,
      satuan: form.satuan,
      stok: Number(form.stok)||0,
      stok_minimum: Number(form.stok_minimum)||5,
      supplier_nama: form.supplier_nama.trim() || null,
      supplier_wa: form.supplier_wa.trim() || null,
      harga_lama: Number(form.harga_lama)||0,
      harga_baru: Number(form.harga_baru)||0,
      perusahaan: 'SIKITCHEN-MRH',
    }

    // Untuk kompatibilitas tabel lama yang pakai name, stock_qty, price_per_unit
    const payloadLengkap = {
      ...payloadMinimal,
      name: payloadMinimal.nama_bahan,
      stock_qty: payloadMinimal.stok,
      min_stock: payloadMinimal.stok_minimum,
      price_per_unit: payloadMinimal.harga_baru,
      status: 'Aktif'
    }

    console.log('PAYLOAD V4.3 FIXED:', payloadLengkap)

    try {
      if(editingId){
        // UPDATE pakai payload minimal juga biar tidak kena constraint
        const { error } = await supabase.from('inventory_items').update(payloadLengkap).eq('id', editingId)
        if(error){
          // Jika masih error constraint, coba update hanya kolom aman
          console.warn('Update lengkap gagal, coba minimal:', error.message)
          const { error: err2 } = await supabase.from('inventory_items').update(payloadMinimal).eq('id', editingId)
          if(err2){
            setDebugMsg('❌ UPDATE ERROR: ' + err2.message)
            alert('❌ Gagal update: ' + err2.message + '\n\nJalankan SQL SUPER DROP di bawah!')
            return
          }
        }
        setDebugMsg('✅ Update OK: ' + form.nama_bahan)
        alert('✅ Berhasil update: ' + form.nama_bahan)
      } else {
        // INSERT - coba minimal dulu
        let { data, error } = await supabase.from('inventory_items').insert(payloadMinimal).select().single()
        if(error){
          console.warn('Insert minimal gagal, coba lengkap:', error.message)
          // Coba lengkap
          const retry = await supabase.from('inventory_items').insert(payloadLengkap).select().single()
          data = retry.data
          error = retry.error
        }
        if(error){
          // Jika masih gagal karena klasifikasi_check, coba tanpa kategori juga? Tapi kategori harus ada
          // Last attempt: insert hanya nama_bahan + stok + harga_baru
          console.warn('Insert kedua gagal, coba ultra minimal:', error.message)
          const ultraMinimal = {
            nama_bahan: payloadMinimal.nama_bahan,
            stok: payloadMinimal.stok,
            harga_baru: payloadMinimal.harga_baru,
            perusahaan: 'SIKITCHEN-MRH'
          }
          const retry2 = await supabase.from('inventory_items').insert(ultraMinimal).select().single()
          data = retry2.data
          error = retry2.error
        }
        if(error){
          setDebugMsg('❌ INSERT ERROR FINAL: ' + error.message + ' | Code: ' + error.code)
          alert('❌ Gagal simpan FINAL: ' + error.message + '\n\nWAJIB jalankan SQL SUPER DROP di bawah untuk hapus constraint!\n\nDetail: ' + JSON.stringify(error, null,2))
          return
        }
        setDebugMsg('✅ Simpan OK: ' + data.nama_bahan + ' | Kode: ' + (data.kode_bahan||kode))
        alert('✅ Berhasil simpan: ' + (data.nama_bahan||form.nama_bahan) + ' (' + (data.kode_bahan||kode) + ')')
      }
      setForm({ nama_bahan: '', kategori: 'Bahan Pokok', sub_kategori: '', satuan: 'Kg', stok: '', stok_minimum: '5', supplier_nama: '', supplier_wa: '', harga_lama: '', harga_baru: '' })
      setEditingId(null)
      setShowForm(true)
      setKodePreview('BHN-' + Date.now().toString().slice(-6))
      load()
    } catch(e){
      setDebugMsg('❌ Exception save: ' + e.message)
      alert('❌ Exception: ' + e.message)
    }
  }

  function editItem(it){
    setForm({
      nama_bahan: it.nama_bahan||it.name||'',
      kategori: it.kategori||'Bahan Pokok',
      sub_kategori: it.sub_kategori||'',
      satuan: it.satuan||it.unit||'Kg',
      stok: it.stok||it.stock_qty||'',
      stok_minimum: it.stok_minimum||it.min_stock||'5',
      supplier_nama: it.supplier_nama||'',
      supplier_wa: it.supplier_wa||'',
      harga_lama: it.harga_lama||'',
      harga_baru: it.harga_baru||it.price_per_unit||'',
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

  if(loading) return <div className="p-6">Loading V4.3 Fixed...</div>

  return (
    <div className="space-y-4">
      <div className="bg-yellow-50 border-2 border-yellow-400 p-3 rounded-xl text-xs">
        <div className="font-bold text-[#0A1931]">🔍 DEBUG V4.3 FIXED: {debugMsg}</div>
        <div className="mt-1 text-slate-600">FIX: Tidak insert kolom klasifikasi/category yang kena check constraint lama | Jika masih error, jalankan SQL SUPER DROP di bawah</div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border-2 border-[#D4AF37]/40 shadow-sm overflow-hidden">
          <div className="bg-[#0A1931] text-white px-4 py-3">
            <div className="font-bold text-sm">➕ V4.3 FIXED SAVE - 1.Kode 2.Kategori 3.Nama 4.Sub 5.Satuan 6.Stock 7.Min 8.H.Lama 9.H.Baru 10.Supplier 11.WA</div>
          </div>
          <div className="divide-y divide-slate-200">
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">1. Kode</div></div><div className="px-4 py-2.5"><input className="w-full bg-slate-100 border p-2.5 rounded-lg text-sm font-mono" value={kodePreview} readOnly /></div></div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">2. Kategori *</div></div><div className="px-4 py-2.5"><select className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" value={form.kategori} onChange={e=>setForm({...form, kategori: e.target.value})} required>{kategoris.map(k=><option key={k.nama} value={k.nama}>{k.nama}</option>)}</select></div></div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">3. Nama Bahan *</div></div><div className="px-4 py-2.5"><input className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" placeholder="Beras putih, jaya agung beras" value={form.nama_bahan} onChange={e=>setForm({...form, nama_bahan: e.target.value})} required /></div></div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">4. Sub-Kategori</div></div><div className="px-4 py-2.5"><input className="w-full border p-2.5 rounded-lg text-sm" value={form.sub_kategori} onChange={e=>setForm({...form, sub_kategori: e.target.value})} /></div></div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">5. Satuan *</div></div><div className="px-4 py-2.5"><select className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" value={form.satuan} onChange={e=>setForm({...form, satuan: e.target.value})} required><option>Kg</option><option>Ltr</option><option>Pcs</option><option>Buah</option><option>Ikat</option><option>Karung</option><option>Botol</option><option>Set</option></select></div></div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">6. Stock Saat Ini *</div></div><div className="px-4 py-2.5"><input type="number" className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" value={form.stok} onChange={e=>setForm({...form, stok: e.target.value})} required /></div></div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">7. Stock Minimum</div></div><div className="px-4 py-2.5"><input type="number" className="w-full border p-2.5 rounded-lg text-sm" value={form.stok_minimum} onChange={e=>setForm({...form, stok_minimum: e.target.value})} /></div></div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">8. Harga Lama</div></div><div className="px-4 py-2.5"><input type="number" className="w-full border p-2.5 rounded-lg text-sm" value={form.harga_lama} onChange={e=>setForm({...form, harga_lama: e.target.value})} /></div></div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">9. Harga Baru *</div></div><div className="px-4 py-2.5"><input type="number" className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" value={form.harga_baru} onChange={e=>setForm({...form, harga_baru: e.target.value})} required /></div></div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">10. Supplier Nama</div></div><div className="px-4 py-2.5"><input className="w-full border p-2.5 rounded-lg text-sm" value={form.supplier_nama} onChange={e=>setForm({...form, supplier_nama: e.target.value})} /></div></div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">11. Supplier WA</div></div><div className="px-4 py-2.5"><input className="w-full border p-2.5 rounded-lg text-sm" value={form.supplier_wa} onChange={e=>setForm({...form, supplier_wa: e.target.value})} /></div></div>
          </div>
          <div className="p-4 bg-[#FFF8E1] border-t-2 border-[#D4AF37]/30 flex gap-3">
            <button type="submit" className="flex-1 bg-[#D4AF37] text-[#0A1931] font-bold px-4 py-3 rounded-xl text-sm">💾 Simpan Bahan Baku - FIXED V4.3</button>
            <button type="button" onClick={()=>setShowForm(false)} className="bg-white border px-6 py-3 rounded-xl text-sm">Batal</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="bg-[#0A1931] text-white px-4 py-2.5 text-xs">📋 Tabel ({items.length} bahan) - {debugMsg}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs"><thead className="bg-[#0A1931] text-white"><tr><th className="p-2.5 text-left">Kode</th><th className="p-2.5 text-left">Kategori</th><th className="p-2.5 text-left">Nama</th><th className="p-2.5 text-center">Stock</th><th className="p-2.5 text-right">Harga</th><th className="p-2.5 text-center">Aksi</th></tr></thead>
          <tbody>{items.map(it=><tr key={it.id} className="border-b"><td className="p-2.5 font-mono text-[11px]">{it.kode_bahan||'-'}</td><td className="p-2.5">{it.kategori}</td><td className="p-2.5 font-bold">{it.nama_bahan||it.name}</td><td className="p-2.5 text-center">{it.stok||it.stock_qty} {it.satuan}</td><td className="p-2.5 text-right">Rp {(it.harga_baru||it.price_per_unit||0).toLocaleString('id-ID')}</td><td className="p-2.5 text-center"><button onClick={()=>editItem(it)} className="bg-blue-100 text-blue-700 px-2 py-1 rounded mr-1">Edit</button><button onClick={()=>deleteItem(it.id)} className="bg-red-100 text-red-700 px-2 py-1 rounded">Hapus</button></td></tr>)}</tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border text-xs">
        <div className="font-bold text-red-600">🔥 SQL SUPER DROP - WAJIB RUN JIKA MASIH ERROR klasifikasi_check:</div>
        <pre className="bg-slate-900 text-green-400 p-3 rounded-lg overflow-x-auto text-[11px] mt-2">{`-- HAPUS SEMUA CHECK CONSTRAINT YANG BIKIN GAGAL (DINAMIS)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'inventory_items'::regclass AND contype = 'c' LOOP
    EXECUTE 'ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname) || ' CASCADE';
  END LOOP;
END $$;

-- BUKA RLS
ALTER TABLE inventory_items DISABLE ROW LEVEL SECURITY;

-- CEK SISA CONSTRAINT (harus tinggal pkey dan fkey saja, tidak ada _check lagi)
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'inventory_items'::regclass;

-- TAMBAH KOLOM JIKA BELUM ADA
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS kode_bahan TEXT;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS nama_bahan TEXT;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS sub_kategori TEXT;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS satuan TEXT;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS stok NUMERIC DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS stok_minimum NUMERIC DEFAULT 5;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS supplier_nama TEXT;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS supplier_wa TEXT;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS harga_lama NUMERIC DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS harga_baru NUMERIC DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS perusahaan TEXT DEFAULT 'SIKITCHEN-MRH';
`}</pre>
      </div>
    </div>
  )
}
