"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function InventoryV45SmartCSV() {
  const [items, setItems] = useState([])
  const [kategoris, setKategoris] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [kodePreview, setKodePreview] = useState('')
  const [debugMsg, setDebugMsg] = useState('')
  const [isExistingBahan, setIsExistingBahan] = useState(false)
  const [existingData, setExistingData] = useState(null)
  const [csvPreview, setCsvPreview] = useState([])
  const [csvUploading, setCsvUploading] = useState(false)
  const [form, setForm] = useState({ 
    nama_bahan: '', kategori: 'Bahan Pokok', sub_kategori: '', satuan: 'Kg',
    stok_tambahan: '', stok_minimum: '5', supplier_nama: '', supplier_wa: '',
    harga_lama: '', harga_baru: '',
  })

  const kategoriList9 = ['Bahan Pokok','Protein Hewani','Protein Nabati','Sayuran','Bumbu Segar','Bumbu Instan','Saos & Cairan','Pelengkap & garnish','Kemasan /Packing']
  const subKategoriMap = {'beras putih':'Karbohidrat','beras':'Karbohidrat','ayam potong':'Ayam','minyak goreng':'Minyak','daun jeruk':'Daun','box nasi sekat 3':'Box'}

  async function load() {
    setLoading(true)
    try {
      const { data: kat } = await supabase.from('kategori_bahan').select('*').order('nama')
      if (kat && kat.length>0) setKategoris(kat); else setKategoris(kategoriList9.map(n=>({nama:n})))
      const { data: inv } = await supabase.from('inventory_items').select('*').order('nama_bahan').limit(500)
      if(inv){ setItems(inv); setDebugMsg(`✅ V4.5 SMART+CSV: ${inv.length} bahan | Manual auto-fill + Import CSV massal`) }
    } catch(e){ setDebugMsg('❌ ' + e.message) }
    setLoading(false); setKodePreview('BHN-' + Date.now().toString().slice(-6))
  }
  useEffect(()=>{ load() }, [])

  const namaBahanOptions = useMemo(()=>{ const f = items.filter(it => (it.kategori||'') === form.kategori); return [...new Set(f.map(it => it.nama_bahan||it.name).filter(Boolean))].sort() }, [items, form.kategori])
  const semuaNamaBahan = useMemo(()=>[...new Set(items.map(it => it.nama_bahan||it.name).filter(Boolean))].sort(), [items])

  function handleNamaBahanSelect(namaSelected){
    const lower = namaSelected.toLowerCase().trim()
    const found = items.find(it => (it.nama_bahan||it.name||'').toLowerCase() === lower)
    if(found){
      setIsExistingBahan(true); setExistingData(found)
      const subAuto = found.sub_kategori || subKategoriMap[lower] || ''
      setForm(prev=>({...prev, nama_bahan: found.nama_bahan||found.name||namaSelected, kategori: found.kategori||prev.kategori, sub_kategori: subAuto, satuan: found.satuan||found.unit||'Kg', stok_minimum: String(found.stok_minimum||found.min_stock||'5'), supplier_nama: found.supplier_nama||'', supplier_wa: found.supplier_wa||'', harga_lama: String(found.harga_baru||found.price_per_unit||''), harga_baru: '', stok_tambahan: ''}))
      setKodePreview(found.kode_bahan||''); setEditingId(found.id)
      setDebugMsg(`🔄 EXIST: ${found.nama_bahan} | Stock: ${found.stok||found.stock_qty} | Harga: Rp ${found.harga_baru||0} → Auto-fill!`)
    } else {
      const subAuto = subKategoriMap[lower] || ''
      setIsExistingBahan(false); setExistingData(null); setEditingId(null)
      setForm(prev=>({...prev, sub_kategori: subAuto || prev.sub_kategori})); setKodePreview('BHN-' + Date.now().toString().slice(-6))
      setDebugMsg(`✨ BARU: ${namaSelected} | Sub auto: ${subAuto||'-'} | Insert baru`)
    }
  }

  async function handleSubmit(e){
    e.preventDefault()
    if(!form.nama_bahan.trim()){ alert('Nama wajib'); return }
    if(!form.stok_tambahan && !isExistingBahan){ alert('Stock wajib'); return }
    if(!form.harga_baru){ alert('Harga baru wajib'); return }
    let finalStok = 0, finalHargaLama = 0
    if(isExistingBahan && existingData){ finalStok = Number(existingData.stok||existingData.stock_qty||0) + Number(form.stok_tambahan||0); finalHargaLama = Number(existingData.harga_baru||existingData.price_per_unit||0) }
    else { finalStok = Number(form.stok_tambahan)||0; finalHargaLama = Number(form.harga_lama)||0 }
    const payload = { kode_bahan: isExistingBahan ? existingData.kode_bahan : kodePreview, nama_bahan: form.nama_bahan.trim(), name: form.nama_bahan.trim(), kategori: form.kategori, sub_kategori: form.sub_kategori.trim()||null, satuan: form.satuan, unit: form.satuan, stok: finalStok, stock_qty: finalStok, stok_minimum: Number(form.stok_minimum)||5, min_stock: Number(form.stok_minimum)||5, supplier_nama: form.supplier_nama.trim()||null, supplier_wa: form.supplier_wa.trim()||null, harga_lama: finalHargaLama, harga_baru: Number(form.harga_baru)||0, price_per_unit: Number(form.harga_baru)||0, perusahaan: 'SIKITCHEN-MRH', status: 'Aktif' }
    try {
      let data, error
      if(isExistingBahan && editingId){ const res = await supabase.from('inventory_items').update(payload).eq('id', editingId).select().single(); data=res.data; error=res.error }
      else { const res = await supabase.from('inventory_items').insert(payload).select().single(); data=res.data; error=res.error; if(error && error.code==='23505'){ const {kode_bahan, ...noKode}=payload; const retry=await supabase.from('inventory_items').insert(noKode).select().single(); data=retry.data; error=retry.error } }
      if(error){ alert('❌ '+error.message); return }
      alert(`✅ ${isExistingBahan?'UPDATE':'SIMPAN'}: ${data.nama_bahan} | Stock ${finalStok} | Rp ${Number(data.harga_baru).toLocaleString('id-ID')}`)
      const katTetap=form.kategori, supNama=form.supplier_nama, supWa=form.supplier_wa
      setForm({ nama_bahan:'', kategori:katTetap, sub_kategori:'', satuan:'Kg', stok_tambahan:'', stok_minimum:'5', supplier_nama:supNama, supplier_wa:supWa, harga_lama:'', harga_baru:'' })
      setIsExistingBahan(false); setExistingData(null); setEditingId(null); setKodePreview('BHN-'+Date.now().toString().slice(-6)); load()
    } catch(e){ alert(e.message) }
  }

  // CSV IMPORT LOGIC
  function handleCsvFile(e){
    const file = e.target.files[0]
    if(!file) return
    const reader = new FileReader()
    reader.onload = (ev)=>{
      const text = ev.target.result
      const lines = text.split('\n').filter(l=>l.trim())
      if(lines.length<2){ alert('CSV kosong atau header salah'); return }
      const headers = lines[0].split(',').map(h=>h.trim().toLowerCase())
      const required = ['nama_bahan','kategori','satuan','stok','harga_baru']
      const missing = required.filter(r=>!headers.includes(r))
      if(missing.length){ alert('Header wajib: '+required.join(', ')+'\nMissing: '+missing.join(', ')+'\n\nGunakan template!'); return }
      const preview = []
      for(let i=1;i<Math.min(lines.length, 21);i++){ // preview 20 baris
        const vals = lines[i].split(',').map(v=>v.trim())
        const obj = {}
        headers.forEach((h, idx)=>{ obj[h]=vals[idx]||'' })
        obj._row = i
        preview.push(obj)
      }
      setCsvPreview(preview)
      // Simpan full data untuk upload
      const full = []
      for(let i=1;i<lines.length;i++){
        const vals = lines[i].split(',').map(v=>v.trim())
        const obj = {}
        headers.forEach((h, idx)=>{ obj[h]=vals[idx]||'' })
        // Normalisasi
        if(!obj.perusahaan) obj.perusahaan='SIKITCHEN-MRH'
        obj.stok = Number(obj.stok)||0
        obj.stok_minimum = Number(obj.stok_minimum)||5
        obj.harga_lama = Number(obj.harga_lama)||0
        obj.harga_baru = Number(obj.harga_baru)||0
        obj.kode_bahan = 'BHN-' + Date.now().toString().slice(-6) + '-' + i
        obj.name = obj.nama_bahan
        obj.stock_qty = obj.stok
        obj.price_per_unit = obj.harga_baru
        obj.status='Aktif'
        full.push(obj)
      }
      setCsvPreviewFull(full)
    }
    reader.readAsText(file)
  }
  const [csvPreviewFull, setCsvPreviewFull] = useState([])

  async function uploadCsvToSupabase(){
    if(csvPreviewFull.length===0){ alert('Tidak ada data CSV'); return }
    if(!confirm(`Import ${csvPreviewFull.length} bahan dari CSV?`)) return
    setCsvUploading(true)
    setDebugMsg(`⏳ Import ${csvPreviewFull.length} bahan...`)
    try {
      // Hapus kolom yang tidak ada di tabel jika error (hanya insert kolom aman)
      const safePayload = csvPreviewFull.map(r=>({
        kode_bahan: r.kode_bahan,
        nama_bahan: r.nama_bahan,
        kategori: r.kategori,
        sub_kategori: r.sub_kategori||null,
        satuan: r.satuan||'Kg',
        stok: r.stok,
        stok_minimum: r.stok_minimum,
        harga_lama: r.harga_lama,
        harga_baru: r.harga_baru,
        supplier_nama: r.supplier_nama||null,
        supplier_wa: r.supplier_wa||null,
        perusahaan: 'SIKITCHEN-MRH',
        name: r.nama_bahan,
        stock_qty: r.stok,
        price_per_unit: r.harga_baru,
        status: 'Aktif'
      }))
      // Batch insert 50 per batch biar tidak timeout
      let totalOk=0
      for(let i=0;i<safePayload.length;i+=50){
        const batch = safePayload.slice(i, i+50)
        const { data, error } = await supabase.from('inventory_items').insert(batch).select()
        if(error){
          console.error('Batch error', i, error)
          // Coba satu per satu jika batch gagal
          for(const row of batch){
            const { error: e2 } = await supabase.from('inventory_items').insert(row)
            if(!e2) totalOk++
          }
        } else {
          totalOk += data?.length||batch.length
        }
      }
      setDebugMsg(`✅ CSV Import OK: ${totalOk}/${csvPreviewFull.length} bahan berhasil!`)
      alert(`✅ Berhasil import ${totalOk} bahan dari CSV!`)
      setCsvPreview([]); setCsvPreviewFull([]); load()
    } catch(e){ setDebugMsg('❌ CSV Error: '+e.message); alert(e.message) }
    setCsvUploading(false)
  }

  if(loading) return <div className="p-6">Loading V4.5 SMART+CSV...</div>

  return (
    <div className="space-y-4">
      <div className="bg-[#0A1931] text-white p-3 rounded-xl">
        <div className="font-bold text-sm">🚀 V4.5 SMART + IMPORT CSV MASSAL</div>
        <div className="text-[11px] text-[#D4AF37]">Manual: Kategori→Nama(dropdown)→Auto-fill | Massal: Upload CSV 100 bahan sekaligus → 10 detik selesai!</div>
        <div className="text-[10px] bg-white/10 px-2 py-1 rounded mt-2">{debugMsg}</div>
      </div>

      {/* CSV IMPORT SECTION */}
      <div className="bg-white rounded-xl border-2 border-green-300 shadow-sm p-4">
        <div className="font-bold text-sm text-[#0A1931]">📥 IMPORT CSV MASSAL (Cara cepat input 50-100 bahan)</div>
        <div className="text-[11px] text-slate-500 mt-1">Format: nama_bahan,kategori,sub_kategori,satuan,stok,stok_minimum,harga_lama,harga_baru,supplier_nama,supplier_wa,perusahaan</div>
        <div className="flex gap-2 mt-3 items-center">
          <input type="file" accept=".csv" onChange={handleCsvFile} className="text-xs border p-2 rounded-lg flex-1" />
          <a href="/template-inventori-SIKITCHEN.csv" download className="text-xs bg-slate-100 border px-3 py-2 rounded-lg">📄 Download Template CSV</a>
          {csvPreview.length>0 && <button onClick={uploadCsvToSupabase} disabled={csvUploading} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold disabled:bg-slate-300">{csvUploading?'⏳ Importing...':`✅ Import ${csvPreviewFull.length} Bahan`}</button>}
        </div>
        {csvPreview.length>0 && (
          <div className="mt-3 overflow-x-auto border rounded-lg">
            <div className="text-[11px] bg-yellow-50 p-2">Preview 20 baris pertama dari {csvPreviewFull.length} total:</div>
            <table className="w-full text-[11px]"><thead className="bg-slate-100"><tr><th className="p-2 text-left">Row</th><th className="p-2 text-left">Nama</th><th className="p-2 text-left">Kategori</th><th className="p-2 text-left">Sub</th><th className="p-2 text-center">Stok</th><th className="p-2 text-right">Harga Baru</th><th className="p-2 text-left">Supplier</th></tr></thead>
            <tbody>{csvPreview.map((r,i)=><tr key={i} className="border-b"><td className="p-2">{r._row}</td><td className="p-2 font-bold">{r.nama_bahan}</td><td className="p-2">{r.kategori}</td><td className="p-2">{r.sub_kategori}</td><td className="p-2 text-center">{r.stok}</td><td className="p-2 text-right">{r.harga_baru}</td><td className="p-2">{r.supplier_nama}</td></tr>)}</tbody></table>
          </div>
        )}
      </div>

      {/* MANUAL SMART FORM */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border-2 border-[#D4AF37]/40 shadow-sm overflow-hidden">
          <div className="bg-[#FFF8E1] border-b px-4 py-2 flex justify-between text-[11px]"><span className="font-bold">{isExistingBahan?`🔄 UPDATE: ${existingData?.nama_bahan} | ${existingData?.stok||0} + ${form.stok_tambahan||0} = ${Number(existingData?.stok||0)+Number(form.stok_tambahan||0)}`:'✨ INPUT MANUAL SMART - Auto-fill cepat'}</span><span className={isExistingBahan?'bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full':'bg-green-100 text-green-700 px-2 py-0.5 rounded-full'}>{isExistingBahan?'Mode UPDATE':'Mode BARU'}</span></div>
          <div className="divide-y divide-slate-200">
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">1. Kode</div></div><div className="px-4 py-2.5"><input className="w-full bg-slate-100 border p-2.5 rounded-lg text-sm font-mono" value={kodePreview} readOnly /></div></div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">2. Kategori *</div></div><div className="px-4 py-2.5"><select className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" value={form.kategori} onChange={e=>setForm({...form, kategori: e.target.value, nama_bahan: ''})} required>{kategoris.map(k=><option key={k.nama} value={k.nama}>{k.nama}</option>)}</select></div></div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">3. Nama Bahan * (Dropdown)</div><div className="text-[10px] text-slate-500">Pilih → Auto-fill</div></div><div className="px-4 py-2.5"><input list="namaBahanListV45" className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" placeholder="Ketik atau pilih" value={form.nama_bahan} onChange={e=>{ setForm({...form, nama_bahan: e.target.value}); if(e.target.value.length>2) handleNamaBahanSelect(e.target.value)}} onBlur={e=>{ if(e.target.value) handleNamaBahanSelect(e.target.value)}} required /><datalist id="namaBahanListV45">{namaBahanOptions.map(n=><option key={n} value={n} />)}{semuaNamaBahan.map(n=><option key={n} value={n} />)}</datalist></div></div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">4. Sub-Kategori (Auto)</div></div><div className="px-4 py-2.5"><input className="w-full border p-2.5 rounded-lg text-sm bg-yellow-50" value={form.sub_kategori} onChange={e=>setForm({...form, sub_kategori: e.target.value})} /></div></div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">5. Satuan *</div></div><div className="px-4 py-2.5"><select className="w-full border p-2.5 rounded-lg text-sm" value={form.satuan} onChange={e=>setForm({...form, satuan: e.target.value})}><option>Kg</option><option>Ltr</option><option>Pcs</option><option>Buah</option><option>Ikat</option><option>Karung</option><option>Botol</option><option>Set</option></select></div></div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">6. Stock {isExistingBahan?'Tambahan':'Saat Ini'} *</div><div className="text-[10px] text-slate-500">{isExistingBahan?`Lama: ${existingData?.stok||0} + baru`:'Awal'}</div></div><div className="px-4 py-2.5">{isExistingBahan?(<div className="flex gap-2 items-center"><span className="bg-slate-100 border px-3 py-2.5 rounded-lg text-sm font-bold">{existingData?.stok||0} {existingData?.satuan}</span><span>+</span><input type="number" className="flex-1 border-2 border-blue-300 p-2.5 rounded-lg text-sm" value={form.stok_tambahan} onChange={e=>setForm({...form, stok_tambahan: e.target.value})} required /><span className="text-xs">= {Number(existingData?.stok||0)+Number(form.stok_tambahan||0)}</span></div>):(<input type="number" className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" value={form.stok_tambahan} onChange={e=>setForm({...form, stok_tambahan: e.target.value})} required />)}</div></div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">7. Stock Minimum</div></div><div className="px-4 py-2.5"><input type="number" className="w-full border p-2.5 rounded-lg text-sm" value={form.stok_minimum} onChange={e=>setForm({...form, stok_minimum: e.target.value})} /></div></div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">8. Harga Lama (Auto)</div></div><div className="px-4 py-2.5"><input type="number" className="w-full border bg-slate-50 p-2.5 rounded-lg text-sm" value={form.harga_lama} onChange={e=>setForm({...form, harga_lama: e.target.value})} readOnly={isExistingBahan} /></div></div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">9. Harga Baru *</div></div><div className="px-4 py-2.5"><input type="number" className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" value={form.harga_baru} onChange={e=>setForm({...form, harga_baru: e.target.value})} required /></div></div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">10. Supplier Nama (Auto)</div></div><div className="px-4 py-2.5"><input className="w-full border p-2.5 rounded-lg text-sm bg-green-50" value={form.supplier_nama} onChange={e=>setForm({...form, supplier_nama: e.target.value})} /></div></div>
            <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">11. Supplier WA (Auto)</div></div><div className="px-4 py-2.5"><input className="w-full border p-2.5 rounded-lg text-sm bg-green-50" value={form.supplier_wa} onChange={e=>setForm({...form, supplier_wa: e.target.value})} /></div></div>
          </div>
          <div className="p-4 bg-[#0A1931] flex gap-3"><button type="submit" className="flex-1 bg-[#D4AF37] text-[#0A1931] font-bold px-4 py-3 rounded-xl text-sm">{isExistingBahan?`🔄 Update +${form.stok_tambahan||0} ${form.satuan}`:'💾 Simpan Bahan Baru'}</button><button type="button" onClick={()=>{ setForm({ nama_bahan:'', kategori:'Bahan Pokok', sub_kategori:'', satuan:'Kg', stok_tambahan:'', stok_minimum:'5', supplier_nama:'', supplier_wa:'', harga_lama:'', harga_baru:'' }); setIsExistingBahan(false); setExistingData(null); setEditingId(null) }} className="bg-white border px-6 py-3 rounded-xl text-sm">Reset</button></div>
        </form>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden"><div className="bg-[#0A1931] text-white px-4 py-2.5 text-xs">📋 Tabel {items.length} bahan</div><div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-slate-100"><tr><th className="p-2.5 text-left">Kode</th><th className="p-2.5 text-left">Kategori</th><th className="p-2.5 text-left">Nama</th><th className="p-2.5 text-center">Stock</th><th className="p-2.5 text-right">Harga</th><th className="p-2.5 text-left">Supplier</th></tr></thead><tbody>{items.map(it=><tr key={it.id} className="border-b hover:bg-yellow-50"><td className="p-2.5 font-mono text-[11px]">{it.kode_bahan||'-'}</td><td className="p-2.5">{it.kategori}</td><td className="p-2.5 font-bold">{it.nama_bahan||it.name}</td><td className="p-2.5 text-center">{it.stok||it.stock_qty} {it.satuan}</td><td className="p-2.5 text-right">Rp {(it.harga_baru||0).toLocaleString('id-ID')}</td><td className="p-2.5 text-[11px]">{it.supplier_nama||'-'}</td></tr>)}</tbody></table></div></div>
    </div>
  )
}
