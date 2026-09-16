"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function InventoryFinal5Hijau() {
  const [items, setItems] = useState([])
  const [kategoris, setKategoris] = useState([])
  const [loading, setLoading] = useState(true)
  const [kodePreview, setKodePreview] = useState('')
  const [debugMsg, setDebugMsg] = useState('')
  const [isExistingBahan, setIsExistingBahan] = useState(false)
  const [existingData, setExistingData] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [csvPreview, setCsvPreview] = useState([])
  const [csvFull, setCsvFull] = useState([])
  const [csvUploading, setCsvUploading] = useState(false)
  const [form, setForm] = useState({ nama_bahan: '', kategori: 'Bahan Pokok', sub_kategori: '', satuan: 'Kg', stok_tambahan: '', stok_minimum: '5', supplier_nama: '', supplier_wa: '', harga_lama: '', harga_baru: '' })

  // ✅ Kategori 9 tetap - sesuai kesepakatan pagi
  const kategoriList9 = ['Bahan Pokok','Protein Hewani','Protein Nabati','Sayuran','Bumbu Segar','Bumbu Instan','Saos & Cairan','Pelengkap & garnish','Kemasan /Packing']
  const subKategoriMap = {'beras putih':'Karbohidrat','beras premium':'Karbohidrat','beras':'Karbohidrat','ayam potong':'Ayam','minyak goreng':'Minyak','daun jeruk':'Daun','box nasi sekat 3':'Box'}

  async function load() {
    setLoading(true)
    const { data: kat } = await supabase.from('kategori_bahan').select('*').order('nama')
    if (kat && kat.length>0) setKategoris(kat); else setKategoris(kategoriList9.map(n=>({nama:n})))
    const { data: inv } = await supabase.from('inventory_items').select('*').order('nama_bahan').limit(500)
    if(inv){ setItems(inv); setDebugMsg(`✅ FINAL 5 HIJAU: ${inv.length} bahan | Dropdown klik, Kode fix, UPSERT, Kategori 9, Supabase sync`) }
    setLoading(false); 
    if(!isExistingBahan) setKodePreview('BHN-' + Date.now().toString().slice(-6))
  }
  useEffect(()=>{ load() }, [])

  // ✅ Dropdown tinggal klik (V4.8 benar) - tampil SEMUA bahan, tidak filter kategori
  const namaBahanOptions = useMemo(()=>{ 
    return [...new Set(items.map(it => it.nama_bahan||it.name).filter(Boolean))].sort() 
  }, [items])

  // ✅ Kode tidak kosong (fix found.kode_bahan || found.kode || id)
  function handleNamaBahanSelect(namaSelected){
    const lower = namaSelected.toLowerCase().trim()
    if(!lower) return
    const found = items.find(it => (it.nama_bahan||it.name||'').toLowerCase() === lower)
    if(found){
      setIsExistingBahan(true); setExistingData(found)
      const subAuto = found.sub_kategori || subKategoriMap[lower] || ''
      setForm(prev=>({...prev, nama_bahan: found.nama_bahan||found.name||namaSelected, kategori: found.kategori||prev.kategori, sub_kategori: subAuto, satuan: found.satuan||found.unit||'Kg', stok_minimum: String(found.stok_minimum||found.min_stock||'5'), supplier_nama: found.supplier_nama||'', supplier_wa: found.supplier_wa||'', harga_lama: String(found.harga_baru||found.price_per_unit||''), harga_baru: '', stok_tambahan: ''}))
      const kodeFix = found.kode_bahan || found.kode || found.code || ('BHN-'+String(found.id).slice(-6))
      setKodePreview(kodeFix); setEditingId(found.id)
    } else {
      const subAuto = subKategoriMap[lower] || ''
      setIsExistingBahan(false); setExistingData(null); setEditingId(null)
      setForm(prev=>({...prev, sub_kategori: subAuto || prev.sub_kategori})); setKodePreview('BHN-' + Date.now().toString().slice(-6))
    }
  }

  // ✅ Flow Supabase sinkron (payload name + nama_bahan)
  async function handleSubmit(e){
    e.preventDefault()
    if(!form.nama_bahan.trim()){ alert('Nama wajib'); return }
    if(!isExistingBahan && !form.stok_tambahan){ alert('Stock wajib'); return }
    if(isExistingBahan && !form.stok_tambahan && !form.harga_baru){ alert('Untuk UPDATE isi Stock Tambahan atau Harga Baru'); return }
    if(!isExistingBahan && !form.harga_baru){ alert('Harga baru wajib'); return }
    let finalStok = 0, finalHargaLama = 0
    if(isExistingBahan && existingData){ finalStok = Number(existingData.stok||existingData.stock_qty||0) + Number(form.stok_tambahan||0); finalHargaLama = Number(existingData.harga_baru||existingData.price_per_unit||0) }
    else { finalStok = Number(form.stok_tambahan)||0; finalHargaLama = Number(form.harga_lama)||0 }
    const payload = { kode_bahan: isExistingBahan ? existingData.kode_bahan : kodePreview, nama_bahan: form.nama_bahan.trim(), name: form.nama_bahan.trim(), kategori: form.kategori, sub_kategori: form.sub_kategori.trim()||null, satuan: form.satuan, unit: form.satuan, stok: finalStok, stock_qty: finalStok, stok_minimum: Number(form.stok_minimum)||5, min_stock: Number(form.stok_minimum)||5, supplier_nama: form.supplier_nama.trim()||null, supplier_wa: form.supplier_wa.trim()||null, harga_lama: finalHargaLama, harga_baru: isExistingBahan && !form.harga_baru ? finalHargaLama : Number(form.harga_baru)||0, price_per_unit: isExistingBahan && !form.harga_baru ? finalHargaLama : Number(form.harga_baru)||0, perusahaan: 'SIKITCHEN-MRH', status: 'Aktif' }
    try {
      let data, error
      if(isExistingBahan && editingId){ const res = await supabase.from('inventory_items').update(payload).eq('id', editingId).select().single(); data=res.data; error=res.error }
      else { const res = await supabase.from('inventory_items').insert(payload).select().single(); data=res.data; error=res.error; if(error && error.code==='23505'){ const {kode_bahan, ...noKode}=payload; const retry=await supabase.from('inventory_items').insert(noKode).select().single(); data=retry.data; error=retry.error } }
      if(error){ alert('❌ '+error.message); return }
      alert(`✅ ${isExistingBahan?'UPDATE':'SIMPAN'}: ${data.nama_bahan||data.name} | Stock ${finalStok}`)
      const katTetap=form.kategori, supNama=form.supplier_nama, supWa=form.supplier_wa
      setForm({ nama_bahan:'', kategori:katTetap, sub_kategori:'', satuan:'Kg', stok_tambahan:'', stok_minimum:'5', supplier_nama:supNama, supplier_wa:supWa, harga_lama:'', harga_baru:'' })
      setIsExistingBahan(false); setExistingData(null); setEditingId(null); setKodePreview('BHN-'+Date.now().toString().slice(-6)); load()
    } catch(e){ alert(e.message) }
  }

  function parseCSVLine(line, delimiter){
    const result = []; let current = ''; let inQuotes = false
    for(let i=0;i<line.length;i++){ const c=line[i]; if(c==='"'){ inQuotes=!inQuotes } else if(c===delimiter && !inQuotes){ result.push(current.trim()); current='' } else { current+=c } }
    result.push(current.trim()); return result.map(v=>v.replace(/^"|"$/g,'').trim())
  }

  function handleCsvFile(e){
    const file = e.target.files[0]; if(!file) return
    if(file.name.endsWith('.xlsx') || file.name.endsWith('.xls')){ alert('❌ File masih XLSX! Save As CSV UTF-8'); return }
    const reader = new FileReader()
    reader.onload = (ev)=>{
      const text = ev.target.result; const lines = text.split(/\r?\n/).filter(l=>l.trim()); if(lines.length<2){ alert('CSV kosong'); return }
      const firstLine = lines[0]; const delimiter = firstLine.includes(';') ? ';' : ','
      const headers = parseCSVLine(firstLine, delimiter).map(h=>h.toLowerCase().replace(/"/g,'').trim())
      const required = ['nama_bahan']; const missing = required.filter(r=>!headers.includes(r))
      if(missing.length){ alert('Header wajib: nama_bahan\nFile: '+headers.join(',')); return }
      const preview = []; const full = []
      for(let i=1;i<lines.length;i++){
        const vals = parseCSVLine(lines[i], delimiter)
        const obj = {}; headers.forEach((h, idx)=>{ obj[h]=vals[idx]||'' })
        obj.stok = Number(String(obj.stok||'0').replace(/[^0-9.-]/g,''))||0
        obj.stok_minimum = Number(String(obj.stok_minimum||'5').replace(/[^0-9.-]/g,''))||5
        obj.harga_lama = Number(String(obj.harga_lama||'0').replace(/[^0-9.-]/g,''))||0
        obj.harga_baru = Number(String(obj.harga_baru||'0').replace(/[^0-9.-]/g,''))||0
        if(obj.nama_bahan){ full.push(obj); if(preview.length<15) preview.push(obj) }
      }
      setCsvPreview(preview); setCsvFull(full); setDebugMsg(`📄 CSV: ${full.length} baris valid | delimiter "${delimiter}" | Siap UPSERT`)
    }
    reader.readAsText(file, 'UTF-8')
  }

  // ✅ Import UPSERT tidak error duplikat (V4.9 benar)
  async function uploadCsv(){
    if(csvFull.length===0) return
    if(!confirm(`Import ${csvFull.length} bahan? Duplikat akan UPDATE, bukan error.`)) return
    setCsvUploading(true)
    let ok=0, fail=0, lastError=''
    for(let i=0;i<csvFull.length;i+=50){
      const batchSlice = csvFull.slice(i,i+50)
      const batch = batchSlice.map((r, idx)=>({
        kode_bahan: 'BHN-' + Date.now().toString().slice(-6) + '-' + (i+idx+1) + '-' + Math.random().toString(36).slice(2,5).toUpperCase(),
        nama_bahan: r.nama_bahan.trim(), name: r.nama_bahan.trim(),
        kategori: r.kategori||'Bahan Pokok', sub_kategori: r.sub_kategori||null,
        satuan: r.satuan||'Kg', unit: r.satuan||'Kg',
        stok: r.stok, stock_qty: r.stok, stok_minimum: r.stok_minimum, min_stock: r.stok_minimum,
        harga_lama: r.harga_lama, harga_baru: r.harga_baru, price_per_unit: r.harga_baru,
        supplier_nama: r.supplier_nama||null, supplier_wa: r.supplier_wa||null,
        perusahaan: 'SIKITCHEN-MRH', status: 'Aktif'
      }))
      const { data, error } = await supabase.from('inventory_items').upsert(batch, { onConflict: 'name', ignoreDuplicates: false }).select()
      if(error){
        if(error.message.includes('name_key') || error.message.includes('duplicate') || error.code==='23505'){
          for(let j=0;j<batch.length;j++){
            const item = batch[j]
            const existing = items.find(it => (it.nama_bahan||it.name||'').toLowerCase() === item.nama_bahan.toLowerCase())
            if(existing){
              const { error: upErr } = await supabase.from('inventory_items').update({ stok: item.stok, stock_qty: item.stok, harga_baru: item.harga_baru, price_per_unit: item.harga_baru, kategori: item.kategori, satuan: item.satuan }).eq('id', existing.id)
              if(!upErr) ok++; else { fail++; lastError = upErr.message }
            } else {
              const { error: insErr } = await supabase.from('inventory_items').insert(item).select()
              if(!insErr) ok++; else { fail++; lastError = insErr.message }
            }
          }
        } else { lastError = error.message; fail+=batch.length }
      } else { ok+=data?.length||batch.length }
    }
    setDebugMsg(fail>0 ? `⚠️ Import: ${ok} OK, ${fail} gagal | ${lastError}` : `✅ Import UPSERT: ${ok} OK`)
    alert(fail>0 ? `⚠️ ${ok} OK, ${fail} gagal\n${lastError}` : `✅ Berhasil import/update ${ok} bahan!`)
    setCsvPreview([]); setCsvFull([]); setCsvUploading(false); load()
  }

  if(loading) return <div className="p-6">Loading FINAL 5 HIJAU...</div>

  return (
    <div className="space-y-4">
      <div className="bg-[#0A1931] text-white p-3 rounded-xl">
        <div className="font-bold text-sm">✅ FINAL 5 HIJAU - GABUNGAN SEMUA YANG BENAR</div>
        <div className="text-[11px] text-[#D4AF37] mt-1">
          ✅ Dropdown tinggal klik (V4.8) | ✅ Kode tidak kosong (fix) | ✅ Import UPSERT (V4.9) | ✅ Kategori 9 | ✅ Supabase sync (name+nama_bahan)
        </div>
        <div className="text-[10px] bg-white/10 px-2 py-1 rounded mt-2">{debugMsg}</div>
      </div>

      <div className="bg-white rounded-xl border-2 border-green-400 p-4">
        <div className="font-bold text-sm">📥 IMPORT CSV - UPSERT (tidak error duplikat)</div>
        <div className="text-[11px] text-slate-500">Duplikat nama akan UPDATE otomatis | Support koma & titik-koma</div>
        <div className="flex gap-2 mt-3">
          <input type="file" accept=".csv" onChange={handleCsvFile} className="text-xs border-2 border-green-300 p-2 rounded-lg flex-1" />
          {csvFull.length>0 && <button onClick={uploadCsv} disabled={csvUploading} className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold">{csvUploading?'⏳ Import...':`✅ Import ${csvFull.length} Bahan UPSERT`}</button>}
        </div>
        {csvPreview.length>0 && <div className="mt-3 overflow-x-auto border rounded"><table className="w-full text-[11px]"><thead className="bg-slate-100"><tr><th className="p-1">Nama</th><th className="p-1">Kategori</th><th className="p-1">Stok</th><th className="p-1">Harga</th></tr></thead><tbody>{csvPreview.map((r,i)=><tr key={i} className="border-b"><td className="p-1 font-bold">{r.nama_bahan}</td><td className="p-1">{r.kategori}</td><td className="p-1">{r.stok}</td><td className="p-1">{r.harga_baru}</td></tr>)}</tbody></table></div>}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border-2 border-[#D4AF37]/40 shadow-sm overflow-hidden">
        <div className="bg-[#FFF8E1] border-b px-4 py-2 flex justify-between text-[11px]"><span className="font-bold">{isExistingBahan?`🔄 UPDATE: ${existingData?.nama_bahan} | Lama ${existingData?.stok||0} + ${form.stok_tambahan||0}`:'✨ BARU'}</span><span className={isExistingBahan?'bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full':'bg-green-100 text-green-700 px-2 py-0.5 rounded-full'}>{isExistingBahan?'UPDATE':'BARU'}</span></div>
        <div className="divide-y divide-slate-200">
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">1. Kode (Auto - fix tidak kosong)</div></div><div className="px-4 py-2.5"><input className="w-full bg-slate-100 border p-2.5 rounded-lg text-sm font-mono font-bold" value={kodePreview} readOnly /></div></div>
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">2. Kategori * (9 Kategori Tetap)</div></div><div className="px-4 py-2.5"><select className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" value={form.kategori} onChange={e=>setForm({...form, kategori: e.target.value})} required>{kategoris.map(k=><option key={k.nama} value={k.nama}>{k.nama}</option>)}</select></div></div>
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">3. Nama Bahan * (Dropdown Tinggal Klik)</div><div className="text-[10px]">Klik ▼ Pilih</div></div><div className="px-4 py-2.5">
            <div className="flex gap-2">
              <input list="namaBahanListFinal" className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" placeholder="Ketik atau klik ▼ → Auto-fill" value={form.nama_bahan} onChange={e=>{ setForm({...form, nama_bahan: e.target.value}); handleNamaBahanSelect(e.target.value)}} required />
              <select className="border-2 border-[#D4AF37]/50 p-2.5 rounded-lg text-sm bg-yellow-50 font-bold min-w-[130px]" value="" onChange={e=>{ if(e.target.value){ setForm({...form, nama_bahan: e.target.value}); handleNamaBahanSelect(e.target.value) }}}>
                <option value="">▼ Pilih ({namaBahanOptions.length})</option>
                {namaBahanOptions.map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <datalist id="namaBahanListFinal">{namaBahanOptions.map(n=><option key={n} value={n} />)}</datalist>
            <div className="text-[10px] text-green-600 mt-1">Total {namaBahanOptions.length} bahan - tinggal klik ▼</div>
          </div></div>
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">4. Sub-Kategori (Auto)</div></div><div className="px-4 py-2.5"><input className="w-full border p-2.5 rounded-lg text-sm bg-yellow-50" value={form.sub_kategori} onChange={e=>setForm({...form, sub_kategori: e.target.value})} /></div></div>
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">5. Satuan *</div></div><div className="px-4 py-2.5"><select className="w-full border p-2.5 rounded-lg text-sm" value={form.satuan} onChange={e=>setForm({...form, satuan: e.target.value})}><option>Kg</option><option>Ltr</option><option>Pcs</option><option>Buah</option><option>Ikat</option><option>Karung</option><option>Botol</option><option>Set</option></select></div></div>
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">6. Stock {isExistingBahan?'Tambahan':'Saat Ini'} *</div></div><div className="px-4 py-2.5">{isExistingBahan?(<div className="flex gap-2 items-center"><span className="bg-slate-100 border px-3 py-2.5 rounded-lg text-sm font-bold">{existingData?.stok||0}</span><span>+</span><input type="number" className="flex-1 border-2 border-blue-300 p-2.5 rounded-lg text-sm" value={form.stok_tambahan} onChange={e=>setForm({...form, stok_tambahan: e.target.value})} /></div>):(<input type="number" className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" value={form.stok_tambahan} onChange={e=>setForm({...form, stok_tambahan: e.target.value})} required />)}</div></div>
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">7. Stock Minimum</div></div><div className="px-4 py-2.5"><input type="number" className="w-full border p-2.5 rounded-lg text-sm" value={form.stok_minimum} onChange={e=>setForm({...form, stok_minimum: e.target.value})} /></div></div>
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">8. Harga Lama (Auto Supabase)</div></div><div className="px-4 py-2.5"><input type="number" className="w-full border bg-slate-50 p-2.5 rounded-lg text-sm" value={form.harga_lama} readOnly={isExistingBahan} onChange={e=>setForm({...form, harga_lama: e.target.value})} /></div></div>
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">9. Harga Baru *</div></div><div className="px-4 py-2.5"><input type="number" className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" value={form.harga_baru} onChange={e=>setForm({...form, harga_baru: e.target.value})} required={!isExistingBahan} /></div></div>
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">10. Supplier Nama</div></div><div className="px-4 py-2.5"><input className="w-full border p-2.5 rounded-lg text-sm bg-green-50" value={form.supplier_nama} onChange={e=>setForm({...form, supplier_nama: e.target.value})} /></div></div>
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">11. Supplier WA</div></div><div className="px-4 py-2.5"><input className="w-full border p-2.5 rounded-lg text-sm bg-green-50" value={form.supplier_wa} onChange={e=>setForm({...form, supplier_wa: e.target.value})} /></div></div>
        </div>
        <div className="p-4 bg-[#0A1931] flex gap-3"><button type="submit" className="flex-1 bg-[#D4AF37] text-[#0A1931] font-bold px-4 py-3 rounded-xl text-sm">{isExistingBahan?`🔄 Update +${form.stok_tambahan||0}`:'💾 Simpan'}</button></div>
      </form>
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden"><div className="bg-[#0A1931] text-white px-4 py-2.5 text-xs">📋 Tabel {items.length} bahan - {debugMsg}</div><div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-slate-100"><tr><th className="p-2.5 text-left">Kode</th><th className="p-2.5 text-left">Nama</th><th className="p-2.5 text-left">Kategori</th><th className="p-2.5 text-center">Stock</th><th className="p-2.5 text-right">Harga</th></tr></thead><tbody>{items.map(it=><tr key={it.id} className="border-b"><td className="p-2.5 font-mono text-[11px]">{it.kode_bahan||it.kode||'-'}</td><td className="p-2.5 font-bold">{it.nama_bahan||it.name}</td><td className="p-2.5">{it.kategori}</td><td className="p-2.5 text-center">{it.stok||it.stock_qty} {it.satuan}</td><td className="p-2.5 text-right">Rp {(it.harga_baru||0).toLocaleString('id-ID')}</td></tr>)}</tbody></table></div></div>
    </div>
  )
}
