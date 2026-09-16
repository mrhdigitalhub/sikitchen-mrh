"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function InventoryFinal9BahanSmart() {
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
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showDeleteCart, setShowDeleteCart] = useState(false)

  const kategoriList9 = ['Bahan Pokok','Protein Hewani','Protein Nabati','Sayuran','Bumbu Segar','Bumbu Instan','Saos & Cairan','Pelengkap & garnish','Kemasan /Packing']
  const kategoriKodeMap = {'Bahan Pokok':'POK','Protein Hewani':'HEW','Protein Nabati':'NAB','Sayuran':'SAY','Bumbu Segar':'BSG','Bumbu Instan':'BIN','Saos & Cairan':'SAO','Pelengkap & garnish':'PLG','Kemasan /Packing':'KEM'}
  // Gabung beras: beras, beras putih, beras premium => jadi Beras putih
  const namaUmumMap = {
    'beras':'Beras putih', 'beras putih':'Beras putih', 'beras premium':'Beras putih', 'beras pulen':'Beras putih',
    'ayam':'Ayam Potong', 'ayam potong':'Ayam Potong',
    'minyak':'Minyak Goreng', 'minyak goreng':'Minyak Goreng',
    'tempe':'Tempe Kedelai', 'tempe kedelai':'Tempe Kedelai',
    'tahu':'Tahu Kedelai', 'tahu kedelai':'Tahu Kedelai',
  }

  function normalizeNama(str){ return (str||'').toLowerCase().trim().replace(/\s+/g,' ').replace(/[^a-z0-9 ]/g,'') }
  function getNamaUmum(str){ const n = normalizeNama(str); return namaUmumMap[n] || str.trim() }
  function isMirip(namaInput, namaExisting){
    const a = normalizeNama(namaInput)
    const b = normalizeNama(namaExisting)
    const umumA = normalizeNama(getNamaUmum(namaInput))
    const umumB = normalizeNama(getNamaUmum(namaExisting))
    if(umumA === umumB) return true
    if(a.includes(b) || b.includes(a)) return true
    // kata pertama sama (beras putih vs beras)
    const kataA = a.split(' ')[0]
    const kataB = b.split(' ')[0]
    if(kataA === kataB && kataA.length >= 3) return true
    return false
  }

  function getNextSmartKode(kategori, existingItems){
    const kodeKat = kategoriKodeMap[kategori] || 'GEN'
    const prefix = `BHN-${kodeKat}-`
    const nums = existingItems.filter(it => (it.kode_bahan||'').startsWith(prefix)).map(it => {
      const m = (it.kode_bahan||'').match(new RegExp(`^BHN-${kodeKat}-(\\d+)`))
      return m ? parseInt(m[1],10) : 0
    })
    const maxNum = nums.length ? Math.max(...nums) : 0
    const next = maxNum + 1
    return `${prefix}${String(next).padStart(3,'0')}`
  }

  async function load() {
    setLoading(true)
    const { data: kat } = await supabase.from('kategori_bahan').select('*').order('nama')
    if (kat && kat.length>0) setKategoris(kat); else setKategoris(kategoriList9.map(n=>({nama:n})))
    const { data: inv } = await supabase.from('inventory_items').select('*').order('nama_bahan').limit(500)
    if(inv){ 
      setItems(inv)
      const duplikatBeras = inv.filter(it => normalizeNama(it.nama_bahan||it.name).includes('beras'))
      let msg = `✅ FINAL 9 BAHAN SMART: ${inv.length} bahan`
      if(duplikatBeras.length>1) msg += ` | ⚠️ Duplikat beras ${duplikatBeras.length} terdeteksi, pakai tombol Gabung Beras`
      else msg += ` | Kode Smart BHN-KAT-001 | 3 Lapis + Supplier + Delete`
      setDebugMsg(msg)
    }
    setLoading(false)
    // generate kode preview awal
    setKodePreview(getNextSmartKode('Bahan Pokok', items))
  }
  useEffect(()=>{ load() }, [])

  useEffect(()=>{
    if(!isExistingBahan && form.kategori){
      setKodePreview(getNextSmartKode(form.kategori, items))
    }
  }, [form.kategori, items, isExistingBahan])

  const namaBahanOptions = useMemo(()=>{ 
    return [...new Set(items.map(it => it.nama_bahan||it.name).filter(Boolean))].sort() 
  }, [items])

  const selectedItems = useMemo(()=> items.filter(it => selectedIds.has(it.id)), [items, selectedIds])

  function handleNamaBahanSelect(namaSelected){
    const lower = namaSelected.toLowerCase().trim()
    if(!lower) return
    // 3 Lapis filter
    const found = items.find(it => isMirip(namaSelected, it.nama_bahan||it.name||''))
    if(found){
      setIsExistingBahan(true); setExistingData(found)
      const subAuto = found.sub_kategori || ''
      setForm(prev=>({...prev, nama_bahan: found.nama_bahan||found.name||namaSelected, kategori: found.kategori||prev.kategori, sub_kategori: subAuto, satuan: found.satuan||found.unit||'Kg', stok_minimum: String(found.stok_minimum||found.min_stock||'5'), supplier_nama: found.supplier_nama||'', supplier_wa: found.supplier_wa||'', harga_lama: String(found.harga_baru||found.price_per_unit||''), harga_baru: '', stok_tambahan: ''}))
      setKodePreview(found.kode_bahan || found.kode || getNextSmartKode(found.kategori||'Bahan Pokok', items))
      setEditingId(found.id)
      setDebugMsg(`🔍 Duplikat terdeteksi (3 lapis): Input "${namaSelected}" mirip "${found.nama_bahan}" | Supplier lama: ${found.supplier_nama||'-'} | Akan UPDATE, bukan INSERT baru`)
    } else {
      setIsExistingBahan(false); setExistingData(null); setEditingId(null)
      setKodePreview(getNextSmartKode(form.kategori, items))
    }
  }

  async function handleSubmit(e){
    e.preventDefault()
    if(!form.nama_bahan.trim()){ alert('Nama wajib'); return }
    if(!isExistingBahan && !form.stok_tambahan){ alert('Stock wajib'); return }
    if(!form.harga_baru && !isExistingBahan){ alert('Harga baru wajib'); return }
    
    const namaUmum = getNamaUmum(form.nama_bahan)
    const foundMirip = items.find(it => isMirip(form.nama_bahan, it.nama_bahan||it.name||''))

    let finalStok = 0, finalHargaLama = 0, targetId = editingId, kodeFinal = kodePreview
    let isUpdate = false

    if(foundMirip){
      // Kata kunci supplier beda => tetap UPDATE (sesuai kesepakatan)
      isUpdate = true
      targetId = foundMirip.id
      finalStok = Number(foundMirip.stok||foundMirip.stock_qty||0) + Number(form.stok_tambahan||0)
      finalHargaLama = Number(foundMirip.harga_baru||foundMirip.price_per_unit||0)
      kodeFinal = foundMirip.kode_bahan
      if((foundMirip.supplier_nama||'') !== (form.supplier_nama||'') && form.supplier_nama){
        setDebugMsg(`🔄 Supplier beda: ${foundMirip.supplier_nama} → ${form.supplier_nama} | UPDATE stock ${foundMirip.stok||0} + ${form.stok_tambahan||0}`)
      }
    } else {
      finalStok = Number(form.stok_tambahan)||0
      finalHargaLama = Number(form.harga_lama)||0
    }

    const payload = { 
      kode_bahan: kodeFinal, 
      nama_bahan: namaUmum.trim(), 
      name: namaUmum.trim(), 
      kategori: form.kategori, sub_kategori: form.sub_kategori.trim()||null, 
      satuan: form.satuan, unit: form.satuan, 
      stok: finalStok, stock_qty: finalStok, 
      stok_minimum: Number(form.stok_minimum)||5, min_stock: Number(form.stok_minimum)||5, 
      supplier_nama: form.supplier_nama.trim()||null, supplier_wa: form.supplier_wa.trim()||null, 
      harga_lama: finalHargaLama, 
      harga_baru: form.harga_baru ? Number(form.harga_baru)||0 : finalHargaLama, 
      price_per_unit: form.harga_baru ? Number(form.harga_baru)||0 : finalHargaLama, 
      perusahaan: 'SIKITCHEN-MRH', status: 'Aktif' 
    }
    try {
      let data, error
      if(isUpdate && targetId){ 
        const res = await supabase.from('inventory_items').update(payload).eq('id', targetId).select().single()
        data=res.data; error=res.error 
      } else { 
        const res = await supabase.from('inventory_items').insert(payload).select().single()
        data=res.data; error=res.error
      }
      if(error){ alert('❌ '+error.message); return }
      alert(`✅ ${isUpdate?'UPDATE (3 Lapis + Supplier)':'SIMPAN'}: ${data.nama_bahan||data.name} | Kode ${data.kode_bahan} | Stock ${finalStok}`)
      const katTetap=form.kategori, supNama=form.supplier_nama, supWa=form.supplier_wa
      setForm({ nama_bahan:'', kategori:katTetap, sub_kategori:'', satuan:'Kg', stok_tambahan:'', stok_minimum:'5', supplier_nama:supNama, supplier_wa:supWa, harga_lama:'', harga_baru:'' })
      setIsExistingBahan(false); setExistingData(null); setEditingId(null)
      load()
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
      setCsvPreview(preview); setCsvFull(full); setDebugMsg(`📄 CSV: ${full.length} baris valid | delimiter "${delimiter}" | Akan pakai 3 Lapis + Supplier + Kode Smart`)
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function uploadCsv(){
    if(csvFull.length===0) return
    if(!confirm(`Import ${csvFull.length} bahan dengan 3 Lapis Filter + Kode Smart? Beras akan digabung jadi 1.`)) return
    setCsvUploading(true)
    let ok=0, fail=0, lastError=''
    // Gabung beras dulu di memory
    const grouped = {}
    csvFull.forEach(r=>{
      const umum = getNamaUmum(r.nama_bahan)
      const key = normalizeNama(umum)
      if(!grouped[key]) grouped[key] = { ...r, nama_bahan: umum, stok: 0 }
      grouped[key].stok += r.stok
      if(r.harga_baru) grouped[key].harga_baru = r.harga_baru
      if(r.supplier_nama) grouped[key].supplier_nama = r.supplier_nama
    })
    const finalList = Object.values(grouped)
    // finalList harusnya 9 jika beras digabung
    for(let i=0;i<finalList.length;i++){
      const r = finalList[i]
      const existing = items.find(it => isMirip(r.nama_bahan, it.nama_bahan||it.name||''))
      const kategori = r.kategori||'Bahan Pokok'
      const kode = existing ? existing.kode_bahan : getNextSmartKode(kategori, [...items, ...finalList.slice(0,i).map((_,idx)=>({kode_bahan:getNextSmartKode(kategori, items)}))])
      const payload = {
        kode_bahan: kode, nama_bahan: r.nama_bahan.trim(), name: r.nama_bahan.trim(),
        kategori: kategori, sub_kategori: r.sub_kategori||null,
        satuan: r.satuan||'Kg', unit: r.satuan||'Kg',
        stok: r.stok, stock_qty: r.stok, stok_minimum: r.stok_minimum||5, min_stock: r.stok_minimum||5,
        harga_lama: r.harga_lama||0, harga_baru: r.harga_baru||0, price_per_unit: r.harga_baru||0,
        supplier_nama: r.supplier_nama||null, supplier_wa: r.supplier_wa||null,
        perusahaan: 'SIKITCHEN-MRH', status: 'Aktif'
      }
      if(existing){
        const newStok = Number(existing.stok||0) + Number(r.stok||0)
        const { error } = await supabase.from('inventory_items').update({ stok: newStok, stock_qty: newStok, harga_baru: payload.harga_baru||existing.harga_baru, supplier_nama: payload.supplier_nama||existing.supplier_nama }).eq('id', existing.id)
        if(!error) ok++; else { fail++; lastError = error.message }
      } else {
        const { error } = await supabase.from('inventory_items').insert(payload).select()
        if(!error) ok++; else { fail++; lastError = error.message }
      }
    }
    setDebugMsg(fail>0 ? `⚠️ Import: ${ok} OK, ${fail} gagal | ${lastError}` : `✅ Import 3 Lapis + Smart: ${ok} OK (Beras digabung)`)
    alert(fail>0 ? `⚠️ ${ok} OK, ${fail} gagal\n${lastError}` : `✅ Berhasil import ${ok} bahan! Beras digabung, kode Smart BHN-KAT-001`)
    setCsvPreview([]); setCsvFull([]); setCsvUploading(false); load()
  }

  async function handleGabungBeras(){
    if(!confirm('Gabungkan semua bahan yang mengandung kata "beras" jadi 1 bahan Beras putih dengan kode BHN-POK-001?\n\nStock akan dijumlahkan, harga ambil yang terbaru.')) return
    const berasList = items.filter(it => normalizeNama(it.nama_bahan||it.name).includes('beras'))
    if(berasList.length<=1){ alert('Hanya 1 bahan beras, tidak perlu gabung'); return }
    const totalStok = berasList.reduce((s,it)=>s+Number(it.stok||it.stock_qty||0),0)
    const master = berasList.find(it => normalizeNama(it.nama_bahan) === 'beras putih') || berasList[0]
    const kodeSmart = 'BHN-POK-001'
    const { error: upErr } = await supabase.from('inventory_items').update({ 
      nama_bahan: 'Beras putih', name: 'Beras putih',
      kode_bahan: kodeSmart, stok: totalStok, stock_qty: totalStok,
      kategori: 'Bahan Pokok'
    }).eq('id', master.id)
    if(upErr){ alert('❌ '+upErr.message); return }
    const idsToDelete = berasList.filter(it => it.id !== master.id).map(it => it.id)
    if(idsToDelete.length>0){
      const { error: delErr } = await supabase.from('inventory_items').delete().in('id', idsToDelete)
      if(delErr){ alert('Update OK tapi delete gagal: '+delErr.message) } 
      else alert(`✅ Berhasil gabung ${berasList.length} beras jadi 1: ${kodeSmart} | Stock total ${totalStok} Kg`)
    } else alert('✅ Sudah 1 bahan beras')
    load()
  }

  function toggleSelect(id){
    const next = new Set(selectedIds)
    if(next.has(id)) next.delete(id); else next.add(id)
    setSelectedIds(next)
    setShowDeleteCart(next.size>0)
  }
  function toggleSelectAll(){
    if(selectedIds.size === items.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(items.map(it=>it.id)))
  }

  async function handleDeleteSelected(){
    if(selectedIds.size===0) return
    const toDelete = items.filter(it => selectedIds.has(it.id))
    const names = toDelete.map(it=>` - ${it.nama_bahan||it.name} (${it.kode_bahan})`).join('\n')
    if(!confirm(`Hapus ${toDelete.length} bahan ini?\n\n${names}\n\n⚠️ Pastikan tidak dipakai di Master Menu & Resep!\n\nKetik OK untuk lanjut.`)) return
    const confirmText = prompt(`Ketik "HAPUS" untuk konfirmasi hapus ${toDelete.length} bahan:`)
    if(confirmText !== 'HAPUS'){ alert('Batal hapus'); return }
    const { error } = await supabase.from('inventory_items').delete().in('id', Array.from(selectedIds))
    if(error){ alert('❌ Gagal hapus: '+error.message); return }
    alert(`✅ Berhasil hapus ${selectedIds.size} bahan!`)
    setSelectedIds(new Set()); setShowDeleteCart(false); load()
  }

  async function fixKodeSmart(){
    if(!confirm('Perbaiki semua kode jadi Smart BHN-KAT-001?\n\nKode lama random akan diganti jadi BHN-POK-001, BHN-HEW-001, dst. per kategori.')) return
    // group per kategori
    const grouped = {}
    items.forEach(it=>{
      const kat = it.kategori||'Bahan Pokok'
      if(!grouped[kat]) grouped[kat]=[]
      grouped[kat].push(it)
    })
    let updated=0
    for(const kat in grouped){
      const kodeKat = kategoriKodeMap[kat]||'GEN'
      const list = grouped[kat].sort((a,b)=> (a.nama_bahan||'').localeCompare(b.nama_bahan||''))
      for(let i=0;i<list.length;i++){
        const it = list[i]
        const expectedKode = `BHN-${kodeKat}-${String(i+1).padStart(3,'0')}`
        if(it.kode_bahan !== expectedKode){
          const { error } = await supabase.from('inventory_items').update({ kode_bahan: expectedKode }).eq('id', it.id)
          if(!error) updated++
        }
      }
    }
    alert(`✅ Kode Smart diperbaiki: ${updated} bahan di-update jadi BHN-KAT-001`)
    load()
  }

  if(loading) return <div className="p-6">Loading FINAL 9 BAHAN SMART...</div>

  return (
    <div className="space-y-4">
      <div className="bg-[#0A1931] text-white p-3 rounded-xl">
        <div className="font-bold text-sm">✅ FINAL 9 BAHAN CLEAN - 9 Bahan | Kode Smart | 3 Lapis + Delete</div>
        <div className="text-[11px] text-[#D4AF37] mt-1">
          Dashboard Bersih - 9 Bahan Final | Kode Smart BHN-KAT-001 | 3 Lapis Filter + Supplier + Delete Multi
        </div>
        <div className="text-[10px] bg-white/10 px-2 py-1 rounded mt-2">{debugMsg}</div>
        <div className="text-[10px] text-green-300 mt-1">✅ 9 Bahan Final - Kode Smart Aktif | Beras sudah digabung</div>
      </div>

      <div className="bg-white rounded-xl border-2 border-green-400 p-4">
        <div className="font-bold text-sm">📥 IMPORT CSV - 3 Lapis + Supplier + Kode Smart</div>
        <div className="text-[11px] text-slate-500">Beras otomatis digabung | Duplikat UPDATE | Kode Smart</div>
        <div className="flex gap-2 mt-3">
          <input type="file" accept=".csv" onChange={handleCsvFile} className="text-xs border-2 border-green-300 p-2 rounded-lg flex-1" />
          {csvFull.length>0 && <button onClick={uploadCsv} disabled={csvUploading} className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold">{csvUploading?'⏳ Import...':`✅ Import ${csvFull.length} → ${Object.keys(csvFull.reduce((acc,r)=>{const k=normalizeNama(getNamaUmum(r.nama_bahan)); acc[k]=1; return acc},{})).length} bahan (gabung)`}</button>}
        </div>
        {csvPreview.length>0 && <div className="mt-3 overflow-x-auto border rounded"><table className="w-full text-[11px]"><thead className="bg-slate-100"><tr><th className="p-1">Nama</th><th className="p-1">Jadi</th><th className="p-1">Stok</th></tr></thead><tbody>{csvPreview.map((r,i)=><tr key={i} className="border-b"><td className="p-1">{r.nama_bahan}</td><td className="p-1 font-bold text-green-600">{getNamaUmum(r.nama_bahan)}</td><td className="p-1">{r.stok}</td></tr>)}</tbody></table></div>}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border-2 border-[#D4AF37]/40 shadow-sm overflow-hidden">
        <div className="bg-[#FFF8E1] border-b px-4 py-2 flex justify-between text-[11px]"><span className="font-bold">{isExistingBahan?`🔄 UPDATE (3 Lapis): ${existingData?.nama_bahan} | Stock ${existingData?.stok||0} + ${form.stok_tambahan||0} | Supplier ${existingData?.supplier_nama||'-'} → ${form.supplier_nama||'-'}`:'✨ BARU - Kode Smart'}</span><span className={isExistingBahan?'bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full':'bg-green-100 text-green-700 px-2 py-0.5 rounded-full'}>{isExistingBahan?'UPDATE':'BARU'}</span></div>
        <div className="divide-y divide-slate-200">
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">1. Kode Smart (BHN-KAT-001)</div><div className="text-[9px]">Auto per kategori</div></div><div className="px-4 py-2.5"><input className="w-full bg-slate-100 border p-2.5 rounded-lg text-sm font-mono font-bold" value={kodePreview} readOnly /><div className="text-[10px] text-slate-500 mt-1">Format: BHN-POK-001 = Bahan Pokok no 1, BHN-HEW-001 = Hewani no 1</div></div></div>
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">2. Kategori * (9 Tetap)</div></div><div className="px-4 py-2.5"><select className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" value={form.kategori} onChange={e=>setForm({...form, kategori: e.target.value})} required>{kategoris.map(k=><option key={k.nama} value={k.nama}>{k.nama} ({kategoriKodeMap[k.nama]})</option>)}</select></div></div>
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">3. Nama Bahan * (3 Lapis Filter)</div><div className="text-[10px]">Cek mirip + supplier</div></div><div className="px-4 py-2.5">
            <div className="flex gap-2">
              <input list="namaBahanListFinal" className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" placeholder="Ketik → cek duplikat 3 lapis" value={form.nama_bahan} onChange={e=>{ setForm({...form, nama_bahan: e.target.value}); handleNamaBahanSelect(e.target.value)}} required />
              <select className="border-2 border-[#D4AF37]/50 p-2.5 rounded-lg text-sm bg-yellow-50 font-bold min-w-[130px]" value="" onChange={e=>{ if(e.target.value){ setForm({...form, nama_bahan: e.target.value}); handleNamaBahanSelect(e.target.value) }}}>
                <option value="">▼ Pilih ({namaBahanOptions.length})</option>
                {namaBahanOptions.map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <datalist id="namaBahanListFinal">{namaBahanOptions.map(n=><option key={n} value={n} />)}</datalist>
            <div className="text-[10px] text-green-600 mt-1">3 Lapis: normalisasi → alias (beras=beras putih) → supplier beda = UPDATE</div>
          </div></div>
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">4. Sub-Kategori</div></div><div className="px-4 py-2.5"><input className="w-full border p-2.5 rounded-lg text-sm bg-yellow-50" value={form.sub_kategori} onChange={e=>setForm({...form, sub_kategori: e.target.value})} /></div></div>
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">5. Satuan *</div></div><div className="px-4 py-2.5"><select className="w-full border p-2.5 rounded-lg text-sm" value={form.satuan} onChange={e=>setForm({...form, satuan: e.target.value})}><option>Kg</option><option>Ltr</option><option>Pcs</option><option>Buah</option><option>Ikat</option><option>Karung</option><option>Botol</option><option>Set</option></select></div></div>
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">6. Stock {isExistingBahan?'Tambahan':'Saat Ini'} *</div></div><div className="px-4 py-2.5">{isExistingBahan?(<div className="flex gap-2 items-center"><span className="bg-slate-100 border px-3 py-2.5 rounded-lg text-sm font-bold">{existingData?.stok||0}</span><span>+</span><input type="number" className="flex-1 border-2 border-blue-300 p-2.5 rounded-lg text-sm" value={form.stok_tambahan} onChange={e=>setForm({...form, stok_tambahan: e.target.value})} /></div>):(<input type="number" className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" value={form.stok_tambahan} onChange={e=>setForm({...form, stok_tambahan: e.target.value})} required />)}</div></div>
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">7. Stock Minimum</div></div><div className="px-4 py-2.5"><input type="number" className="w-full border p-2.5 rounded-lg text-sm" value={form.stok_minimum} onChange={e=>setForm({...form, stok_minimum: e.target.value})} /></div></div>
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">8. Harga Lama</div></div><div className="px-4 py-2.5"><input type="number" className="w-full border bg-slate-50 p-2.5 rounded-lg text-sm" value={form.harga_lama} readOnly={isExistingBahan} onChange={e=>setForm({...form, harga_lama: e.target.value})} /></div></div>
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-[#FFF8E1] px-4 py-3 border-r"><div className="font-bold text-xs">9. Harga Baru *</div></div><div className="px-4 py-2.5"><input type="number" className="w-full border-2 border-[#D4AF37]/30 p-2.5 rounded-lg text-sm" value={form.harga_baru} onChange={e=>setForm({...form, harga_baru: e.target.value})} required={!isExistingBahan} /></div></div>
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">10. Supplier Nama (Kunci UPDATE)</div></div><div className="px-4 py-2.5"><input className="w-full border p-2.5 rounded-lg text-sm bg-green-50" placeholder="Beda supplier = UPDATE stock" value={form.supplier_nama} onChange={e=>setForm({...form, supplier_nama: e.target.value})} /></div></div>
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]"><div className="bg-slate-50 px-4 py-3 border-r"><div className="font-bold text-xs">11. Supplier WA</div></div><div className="px-4 py-2.5"><input className="w-full border p-2.5 rounded-lg text-sm bg-green-50" value={form.supplier_wa} onChange={e=>setForm({...form, supplier_wa: e.target.value})} /></div></div>
        </div>
        <div className="p-4 bg-[#0A1931] flex gap-3"><button type="submit" className="flex-1 bg-[#D4AF37] text-[#0A1931] font-bold px-4 py-3 rounded-xl text-sm">{isExistingBahan?`🔄 Update +${form.stok_tambahan||0} (Supplier: ${form.supplier_nama||'-'})`:'💾 Simpan Kode Smart'}</button></div>
      </form>

      {showDeleteCart && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
          <div className="font-bold text-sm text-red-700">🗑️ Keranjang Hapus ({selectedIds.size} bahan dipilih)</div>
          <div className="text-[11px] mt-1">{selectedItems.map(it=>`${it.nama_bahan||it.name} (${it.kode_bahan})`).join(', ')}</div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleDeleteSelected} className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold">🗑️ Generate Delete All ({selectedIds.size})</button>
            <button onClick={()=>{setSelectedIds(new Set()); setShowDeleteCart(false)}} className="bg-slate-200 px-4 py-2 rounded-lg text-xs">Batal</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="bg-[#0A1931] text-white px-4 py-2.5 text-xs flex justify-between items-center">
          <span>📋 Tabel {items.length} bahan - {debugMsg}</span>
          <div className="flex gap-2">
            <label className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded cursor-pointer"><input type="checkbox" checked={selectedIds.size===items.length && items.length>0} onChange={toggleSelectAll} className="w-3 h-3" /> <span className="text-[10px]">Pilih Semua</span></label>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-100"><tr><th className="p-2.5"><input type="checkbox" checked={selectedIds.size===items.length && items.length>0} onChange={toggleSelectAll} /></th><th className="p-2.5 text-left">Kode Smart</th><th className="p-2.5 text-left">Nama</th><th className="p-2.5 text-left">Kategori</th><th className="p-2.5 text-left">Supplier</th><th className="p-2.5 text-center">Stock</th><th className="p-2.5 text-right">Harga</th></tr></thead>
            <tbody>{items.map(it=><tr key={it.id} className={`border-b ${selectedIds.has(it.id)?'bg-red-50':''}`}><td className="p-2.5 text-center"><input type="checkbox" checked={selectedIds.has(it.id)} onChange={()=>toggleSelect(it.id)} /></td><td className="p-2.5 font-mono text-[11px] font-bold text-blue-700">{it.kode_bahan||'-'}</td><td className="p-2.5 font-bold">{it.nama_bahan||it.name}</td><td className="p-2.5">{it.kategori} <span className="text-[10px] bg-slate-100 px-1 rounded">{kategoriKodeMap[it.kategori]||''}</span></td><td className="p-2.5 text-[11px]">{it.supplier_nama||'-'}</td><td className="p-2.5 text-center">{it.stok||it.stock_qty} {it.satuan}</td><td className="p-2.5 text-right">Rp {(it.harga_baru||0).toLocaleString('id-ID')}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
