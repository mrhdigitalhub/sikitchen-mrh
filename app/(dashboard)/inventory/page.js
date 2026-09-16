"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function InventoryOpsiB1FinalBersih() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [kodePreview, setKodePreview] = useState('')
  const [form, setForm] = useState({ kategori: 'POK', namaKategori: 'Beras', subKategori: 'putih', satuan: 'Kg', stok: '50', stokMin: '5', harga: '15500', supplierNama: 'Toko Beras Utama', supplierWa: '081752323656' })
  const [searchQuery, setSearchQuery] = useState('')
  const [filterKategori, setFilterKategori] = useState('Semua')
  const [showMigrasi, setShowMigrasi] = useState(false)

  const [kategoriLabel, setKategoriLabel] = useState({'POK':'Bahan Pokok','HEW':'Protein Hewani','NAB':'Protein Nabati','SAY':'Sayuran','BSG':'Bumbu Segar','BIN':'Bumbu Instan','SAO':'Saos & Cairan','PLG':'Pelengkap & garnish','KEM':'Kemasan /Packing'})

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

  const [inputKategori, setInputKategori] = useState({ kode: '', label: '' })
  const [inputNama, setInputNama] = useState('')
  const [inputSub, setInputSub] = useState('')

  function formatKategori(kodeOrLabel){
    if(!kodeOrLabel) return '-'
    // Normalisasi data lama: "Bahan Pokok - Bahan Pokok" atau "Protein Hewani - Protein Hewani" atau "Bahan Pokok"
    const s = String(kodeOrLabel).trim()
    // Jika sudah format POK - Bahan Pokok, return apa adanya
    if(/^[A-Z]{3}\s*-\s*/.test(s)) return s
    // Jika "Bahan Pokok - Bahan Pokok", ambil depan
    if(s.includes(' - ')){
      const depan = s.split(' - ')[0].trim()
      // cari kode dari label
      for(const [k,l] of Object.entries(kategoriLabel)){
        if(l.toLowerCase() === depan.toLowerCase() || s.toLowerCase().includes(l.toLowerCase())){
          return `${k} - ${l}`
        }
      }
      // fallback: coba label mapping
      const mapLama = {
        'Bahan Pokok':'POK - Bahan Pokok',
        'Protein Hewani':'HEW - Protein Hewani',
        'Protein Nabati':'NAB - Protein Nabati',
        'Sayuran':'SAY - Sayuran',
        'Bumbu Segar':'BSG - Bumbu Segar',
        'Bumbu Instan':'BIN - Bumbu Instan',
        'Saos & Cairan':'SAO - Saos & Cairan',
        'Pelengkap & garnish':'PLG - Pelengkap & garnish',
        'Kemasan /Packing':'KEM - Kemasan /Packing'
      }
      if(mapLama[depan]) return mapLama[depan]
      if(mapLama[s]) return mapLama[s]
    }
    // Jika cuma label "Bahan Pokok"
    for(const [k,l] of Object.entries(kategoriLabel)){
      if(l.toLowerCase() === s.toLowerCase()) return `${k} - ${l}`
      if(k === s) return `${k} - ${l}`
    }
    return s
  }

  function normalizeKategoriToKode(kategoriValue){
    const formatted = formatKategori(kategoriValue)
    const m = formatted.match(/^([A-Z]{3})\s*-/)
    return m ? m[1] : kategoriValue
  }

  function getKodeB1(kategoriKode, currentItems){
    const prefix = `BHN-${kategoriKode}-`
    const nums = currentItems.filter(it => {
      const kode = it.kode_bahan||''
      // hanya yang kategori kodenya sama (sudah dinormalisasi)
      const katKode = normalizeKategoriToKode(it.kategori)
      return katKode === kategoriKode && kode.startsWith(prefix)
    }).map(it => { const m=(it.kode_bahan||'').match(new RegExp(`^BHN-${kategoriKode}-(\\d+)`)); return m?parseInt(m[1],10):0 })
    const next = (nums.length?Math.max(...nums):0)+1
    return `${prefix}${String(next).padStart(3,'0')}`
  }

  function parseNamaBahan(namaLengkap){
    const nama = (namaLengkap||'').trim()
    const parts = nama.split(' ')
    if(parts.length >= 2){
      const sub = parts[parts.length-1]
      const namaBahan = parts.slice(0,-1).join(' ')
      return { namaBahan, sub }
    }
    return { namaBahan: nama, sub: '-' }
  }

  function getSubSpesifik(it){
    const genericList = ['Karbohidrat','Ayam','Box','Daun','Minyak','Kedelai','Beras','Jagung','Kecap','Tahu','Tempe','Ikan','Santan','Saus','Tahu','Tempe']
    if(it.sub_kategori && !genericList.includes(it.sub_kategori)){
      // sudah spesifik dan bukan generic
      return it.sub_kategori
    }
    // Ambil kata terakhir dari nama_bahan sebagai sub spesifik
    const parsed = parseNamaBahan(it.nama_bahan)
    return parsed.sub
  }

  async function load(){
    setLoading(true)
    const { data } = await supabase.from('inventory_items').select('*').order('kode_bahan').limit(500)
    if(data) setItems(data)
    setLoading(false)
  }
  useEffect(()=>{ load() }, [])
  useEffect(()=>{ setKodePreview(getKodeB1(form.kategori, items)) }, [form.kategori, items])

  const kategoriList = Object.keys(kategoriLabel).sort()
  const namaKategoriList = Object.keys(hierarchy[form.kategori]||{}).sort()
  const subKategoriList = hierarchy[form.kategori]?.[form.namaKategori] || []

  const filteredItems = useMemo(()=>{
    let f = items
    if(filterKategori !== 'Semua'){
      f = f.filter(it => normalizeKategoriToKode(it.kategori) === filterKategori)
    }
    if(searchQuery) f = f.filter(it => (it.nama_bahan||'').toLowerCase().includes(searchQuery.toLowerCase()) || (it.kode_bahan||'').toLowerCase().includes(searchQuery.toLowerCase()))
    return f
  }, [items, searchQuery, filterKategori])

  async function handleSubmit(e){
    e.preventDefault()
    if(!form.namaKategori || !form.subKategori) return alert('Pilih Nama Bahan/Kategori dan Sub!')
    const namaLengkap = `${form.namaKategori} ${form.subKategori}`.trim()
    const existing = items.find(it => (it.nama_bahan||'').toLowerCase() === namaLengkap.toLowerCase())
    if(existing){
      const stokBaru = Number(existing.stok||0) + Number(form.stok||0)
      const payload = { stok: stokBaru, stock_qty: stokBaru, harga_baru: Number(form.harga)||existing.harga_baru||0, price_per_unit: Number(form.harga)||existing.price_per_unit||0, supplier_nama: form.supplierNama||existing.supplier_nama||null, supplier_wa: form.supplierWa||existing.supplier_wa||null, sub_kategori: form.subKategori, kategori: form.kategori, satuan: form.satuan, unit: form.satuan }
      const { error, data } = await supabase.from('inventory_items').update(payload).eq('id', existing.id).select().single()
      if(error) return alert(error.message)
      alert(`🔄 UPDATE OPSI B1: ${data.nama_bahan} stok ${existing.stok} + ${form.stok} = ${data.stok} | Kode tetap ${data.kode_bahan}`)
      load()
    } else {
      const payload = { kode_bahan: kodePreview, nama_bahan: namaLengkap, name: namaLengkap, kategori: form.kategori, sub_kategori: form.subKategori, satuan: form.satuan, unit: form.satuan, stok: Number(form.stok)||0, stock_qty: Number(form.stok)||0, stok_minimum: Number(form.stokMin)||5, min_stock: Number(form.stokMin)||5, harga_baru: Number(form.harga)||0, price_per_unit: Number(form.harga)||0, supplier_nama: form.supplierNama||null, supplier_wa: form.supplierWa||null, perusahaan: 'SIKITCHEN-MRH', status: 'Aktif' }
      const { error, data } = await supabase.from('inventory_items').insert(payload).select().single()
      if(error) return alert(error.message)
      alert(`✅ INSERT OPSI B1: ${data.nama_bahan} (${data.kode_bahan}) - ${formatKategori(data.kategori)}`)
      load()
    }
  }

  // CRUD Langkah 1,2,3
  function addKategori(){ const kode = inputKategori.kode.trim().toUpperCase(); const label = inputKategori.label.trim(); if(!kode || !label) return alert('Isi Kode dan Label!'); if(kategoriLabel[kode]) return alert('Sudah ada!'); setKategoriLabel(prev=>({...prev, [kode]: label})); setHierarchy(prev=>({...prev, [kode]: {}})); setInputKategori({ kode: '', label: '' }); setForm(f=>({...f, kategori: kode, namaKategori: '', subKategori: ''})); }
  function deleteKategori(){ const kode = form.kategori; if(Object.keys(kategoriLabel).length <= 1) return alert('Minimal 1!'); if(!confirm(`Hapus ${formatKategori(kode)}?`)) return; const nl={...kategoriLabel}; delete nl[kode]; const nh={...hierarchy}; delete nh[kode]; setKategoriLabel(nl); setHierarchy(nh); const first=Object.keys(nl)[0]; setForm(f=>({...f, kategori: first, namaKategori: '', subKategori: ''})); }
  function addNamaKategori(){ const v=inputNama.trim(); if(!v) return alert('Isi!'); if(hierarchy[form.kategori][v]) return alert('Sudah ada!'); setHierarchy(prev=>({...prev, [form.kategori]: {...prev[form.kategori], [v]: []}})); setInputNama(''); setForm(f=>({...f, namaKategori: v, subKategori: ''})); }
  function deleteNamaKategori(){ const nama=form.namaKategori; if(!nama) return alert('Pilih Nama dulu!'); if(!confirm(`Hapus ${nama} di ${formatKategori(form.kategori)}?`)) return; const copy={...hierarchy}; delete copy[form.kategori][nama]; setHierarchy(copy); setForm(f=>({...f, namaKategori: '', subKategori: ''})); }
  function addSubKategori(){ const v=inputSub.trim(); if(!v) return alert('Isi!'); if(!form.namaKategori) return alert('Pilih Nama Bahan!'); if(hierarchy[form.kategori][form.namaKategori].includes(v)) return alert('Sudah ada!'); setHierarchy(prev=>({...prev, [form.kategori]: {...prev[form.kategori], [form.namaKategori]: [...prev[form.kategori][form.namaKategori], v]}})); setInputSub(''); setForm(f=>({...f, subKategori: v})); }
  function deleteSubKategori(){ const sub=form.subKategori; if(!sub) return alert('Pilih Sub!'); if(!form.namaKategori) return alert('Pilih Nama!'); if(!confirm(`Hapus Sub ${sub}?`)) return; setHierarchy(prev=>({...prev, [form.kategori]: {...prev[form.kategori], [form.namaKategori]: prev[form.kategori][form.namaKategori].filter(s=>s!==sub)}})); setForm(f=>({...f, subKategori: ''})); }

  // Fungsi migrasi data lama langsung dari UI (tanpa SQL Editor)
  async function migrasiDataLama(){
    if(!confirm('Migrasi data lama Supabase? Ini akan ubah kategori double jadi POK - Bahan Pokok dan sub Karbohidrat jadi spesifik (putih, Manis, Potong dll). Lanjut?')) return
    let count=0
    for(const it of items){
      let newKategori = normalizeKategoriToKode(it.kategori)
      // format final POK, HEW, dll (simpan sebagai kode saja, display akan jadi POK - Bahan Pokok)
      let newSub = getSubSpesifik(it)
      let needUpdate = false
      const payload={}
      if(newKategori !== it.kategori){
        payload.kategori = newKategori
        needUpdate=true
      }
      if(newSub !== it.sub_kategori){
        payload.sub_kategori = newSub
        needUpdate=true
      }
      if(needUpdate){
        const { error } = await supabase.from('inventory_items').update(payload).eq('id', it.id)
        if(!error) count++
      }
    }
    alert(`✅ Migrasi selesai! ${count} data diperbaiki dari ${items.length} total. Refresh tabel!`)
    load()
  }

  if(loading) return <div className="p-6">Loading OPSI B1 Final Bersih...</div>

  return (
    <div className="space-y-4">
      <div className="bg-[#0A1931] text-white p-4 rounded-xl flex justify-between items-start">
        <div>
          <div className="font-bold">✅ OPSI B1 FINAL BERSIH - FIX Data Lama + Kode BHN-POK-001 tanpa tulisan "urut dari Sub"</div>
          <div className="text-[11px] text-green-300 mt-1">Perbaikan: Kolom Kode bersih BHN-POK-001 (hapus label "urut dari Sub") | Kolom Kategori seragam POK - Bahan Pokok (fix double "Bahan Pokok - Bahan Pokok") | Nomor urut dari Sub: POK Beras ketan=001, merah=002, porang=003, putih=004, Jagung Manis=005 lanjut global per POK | Sub spesifik: putih, Manis, Potong bukan Karbohidrat</div>
          <div className="text-[10px] bg-white/20 px-2 py-1 rounded mt-2 inline-block">Preview: {formatKategori(form.kategori)} → {form.namaKategori} → {form.subKategori} = {form.namaKategori} {form.subKategori} | Kode: {kodePreview}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setShowMigrasi(!showMigrasi)} className="bg-yellow-500 text-black px-3 py-1.5 rounded-full text-xs font-bold">⚙️ {showMigrasi?'Tutup':'Migrasi Data Lama'}</button>
          <button onClick={migrasiDataLama} className="bg-green-600 text-white px-3 py-1.5 rounded-full text-xs font-bold">🔄 Fix Data Lama Sekarang</button>
        </div>
      </div>

      {showMigrasi && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4">
          <div className="font-bold text-sm mb-2">🔧 Migrasi Data Lama Supabase - OPSI B1</div>
          <div className="text-xs space-y-1">
            <div>Data lama di screenshot Bos: <b>Protein Hewani - Protein Hewani, Bahan Pokok - Bahan Pokok, Saos & Cairan - Saos & Cairan</b> → harusnya <b>POK - Bahan Pokok, HEW - Protein Hewani</b></div>
            <div>Sub lama: <b>Karbohidrat, Ayam, Box, Daun, Minyak</b> → harusnya <b>putih, Manis, Potong, Jeruk, Goreng</b> (kata terakhir dari nama_bahan)</div>
            <div className="bg-white p-2 rounded border mt-2 text-[11px] font-mono">Klik tombol "🔄 Fix Data Lama Sekarang" di atas untuk auto-fix tanpa buka SQL Editor. Atau jalankan file SQL MIGRASI-FIX-DATA-LAMA-SUPABASE-OPSI-B1.sql di Supabase SQL Editor.</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border-2 border-[#D4AF37]/30 shadow overflow-hidden">
        <div className="bg-[#FFF8E1] px-5 py-3 font-bold text-sm border-b">📝 OPSI B1 - INPUT CEPAT 3 LANGKAH - Nomor Urut dari Sub (Bersih tanpa label)</div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border-2 border-[#0A1931] rounded-xl p-3 bg-[#0A1931]/5 flex flex-col gap-2">
            <div className="font-bold text-xs">LANGKAH 1: Kategori (9 LOCK)</div>
            <select className="w-full border-2 p-3 rounded-xl font-bold text-sm bg-white min-h-[48px]" value={form.kategori} onChange={e=>setForm({...form, kategori: e.target.value, namaKategori: '', subKategori: ''})}>
              {kategoriList.map(k=><option key={k} value={k}>{k} - {kategoriLabel[k]} ({Object.keys(hierarchy[k]||{}).length} Nama Bahan)</option>)}
            </select>
            <div className="bg-white p-2 rounded border text-[10px]">Kode: <b className="font-mono">{kodePreview}</b><br/>Nomor urut dari Sub, lanjut global per {form.kategori}</div>
            <div className="flex gap-2"><button type="button" onClick={deleteKategori} className="flex-1 bg-red-500 text-white px-2 py-2 rounded-lg text-[11px] font-bold">🗑️ Delete {form.kategori}</button></div>
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-2 space-y-2"><div className="text-[10px] font-bold">+ Tambah Kategori Baru:</div><div className="flex gap-1"><input className="w-[70px] border p-1.5 rounded text-xs font-bold" placeholder="POK" value={inputKategori.kode} onChange={e=>setInputKategori({...inputKategori, kode: e.target.value})} /><input className="flex-1 border p-1.5 rounded text-xs" placeholder="Bahan Pokok" value={inputKategori.label} onChange={e=>setInputKategori({...inputKategori, label: e.target.value})} /></div><button type="button" onClick={addKategori} className="w-full bg-[#D4AF37] text-black px-3 py-1.5 rounded font-bold text-xs">+ Tambah Kategori</button></div>
          </div>
          <div className="border-2 border-[#D4AF37] rounded-xl p-3 bg-yellow-50 flex flex-col gap-2">
            <div className="font-bold text-xs">LANGKAH 2: Nama Bahan/Kategori</div>
            <select className="w-full border-2 p-3 rounded-xl font-bold text-sm bg-white min-h-[48px]" value={form.namaKategori} onChange={e=>setForm({...form, namaKategori: e.target.value, subKategori: ''})} required><option value="">▼ Pilih di {formatKategori(form.kategori)}</option>{(Object.keys(hierarchy[form.kategori]||{}).sort()).map(n=><option key={n} value={n}>{n} ({hierarchy[form.kategori][n]?.length} sub)</option>)}</select>
            <div className="flex gap-2"><button type="button" onClick={deleteNamaKategori} className="flex-1 bg-red-500 text-white px-2 py-2 rounded-lg text-[11px] font-bold" disabled={!form.namaKategori}>🗑️ Delete {form.namaKategori||'Nama'}</button></div>
            <div className="bg-white border border-yellow-300 rounded-lg p-2 space-y-2"><div className="text-[10px] font-bold">+ Tambah Nama Bahan baru:</div><input className="w-full border p-1.5 rounded text-xs font-bold" placeholder="Contoh: Beras" value={inputNama} onChange={e=>setInputNama(e.target.value)} /><button type="button" onClick={addNamaKategori} className="w-full bg-[#D4AF37] text-black px-3 py-1.5 rounded font-bold text-xs">+ Tambah Nama Bahan</button></div>
          </div>
          <div className="border-2 border-blue-300 rounded-xl p-3 bg-blue-50 flex flex-col gap-2">
            <div className="font-bold text-xs">LANGKAH 3: Sub Kategori (spesifik!)</div>
            <select className="w-full border-2 p-3 rounded-xl font-bold text-sm bg-white min-h-[48px]" value={form.subKategori} onChange={e=>setForm({...form, subKategori: e.target.value})} required disabled={!form.namaKategori}><option value="">{form.namaKategori?`▼ Pilih sub di ${form.namaKategori}`:'Pilih Nama Bahan dulu'}</option>{(hierarchy[form.kategori]?.[form.namaKategori]||[]).map(s=><option key={s} value={s}>{s}</option>)}</select>
            <div className="text-[10px]">Spesifik: ketan, merah, porang, putih (bukan Karbohidrat) | Sumber nomor urut!</div>
            <div className="flex gap-2"><button type="button" onClick={deleteSubKategori} className="flex-1 bg-red-500 text-white px-2 py-2 rounded-lg text-[11px] font-bold" disabled={!form.subKategori}>🗑️ Delete {form.subKategori||'Sub'}</button></div>
            <div className="bg-white border border-blue-300 rounded-lg p-2 space-y-2"><div className="text-[10px] font-bold">+ Tambah Sub baru:</div><input className="w-full border p-1.5 rounded text-xs font-bold" placeholder="Contoh: putih" value={inputSub} onChange={e=>setInputSub(e.target.value)} disabled={!form.namaKategori} /><button type="button" onClick={addSubKategori} className="w-full bg-green-600 text-white px-3 py-1.5 rounded font-bold text-xs" disabled={!form.namaKategori}>+ Tambah Sub</button></div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="bg-[#0A1931] p-3 rounded-xl text-white text-xs mt-2">Preview: <b>{formatKategori(form.kategori)}</b> → <b className="text-yellow-300">{form.namaKategori}</b> → <b className="text-blue-300">{form.subKategori}</b> = <b className="text-green-300">{form.namaKategori} {form.subKategori}</b> | Kode: <b>{kodePreview}</b> | OPSI B1: Nomor urut dari Sub Kategori, lanjut global per {form.kategori}</div>
          <button type="submit" className="w-full bg-[#D4AF37] text-black font-bold py-4 rounded-xl text-sm mt-3">💾 Simpan OPSI B1 - {formatKategori(form.kategori)} / {form.namaKategori} / {form.subKategori} - Kode {kodePreview}</button>
        </div>
      </form>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="bg-[#0A1931] text-white px-5 py-3 flex justify-between items-center"><span className="text-sm font-bold">📋 Tabel {filteredItems.length}/{items.length} - OPSI B1 Final Bersih (tanpa "urut dari Sub")</span><div className="flex gap-2"><input className="px-3 py-1.5 rounded text-xs text-black w-[200px]" placeholder="Search..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} /><select className="px-3 py-1.5 rounded text-xs text-black min-w-[180px]" value={filterKategori} onChange={e=>setFilterKategori(e.target.value)}><option value="Semua">Semua (9 Kategori)</option>{kategoriList.map(k=><option key={k} value={k}>{k} - {kategoriLabel[k]}</option>)}</select></div></div>
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-slate-100"><tr><th className="p-2">Kode</th><th className="p-2 text-left">Nama Lengkap</th><th className="p-2 bg-[#FFF8E1]">Kategori (Seragam)</th><th className="p-2 bg-yellow-50">Nama Bahan</th><th className="p-2 bg-blue-50">Sub (spesifik)</th><th className="p-2">Stock</th><th className="p-2">Harga</th></tr></thead><tbody>{filteredItems.slice(0,100).map(it=>{ const kategoriDisplay = formatKategori(it.kategori); const subDisplay = getSubSpesifik(it); const namaBahanDisplay = parseNamaBahan(it.nama_bahan).namaBahan; return <tr key={it.id} className="border-b hover:bg-slate-50"><td className="p-2 font-mono font-bold text-blue-700 text-[11px]">{it.kode_bahan}</td><td className="p-2 font-bold">{it.nama_bahan}</td><td className="p-2 bg-[#FFF8E1] font-bold text-[11px]">{kategoriDisplay}</td><td className="p-2 bg-yellow-50 font-bold">{namaBahanDisplay}</td><td className="p-2 bg-blue-50 font-bold text-blue-800">{subDisplay}</td><td className="p-2 text-center font-bold">{it.stok} {it.satuan||''}</td><td className="p-2 text-right">Rp {(it.harga_baru||0).toLocaleString('id-ID')}</td></tr>})}</tbody></table></div>
        <div className="bg-green-50 p-3 text-[11px] border-t"><b>✅ OPSI B1 FINAL FIX:</b> Kolom Kode bersih <span className="font-mono bg-white px-1 rounded">BHN-POK-001</span> tanpa tulisan "urut dari Sub" | Kolom Kategori seragam <span className="bg-yellow-100 px-1 rounded font-bold">POK - Bahan Pokok, HEW - Protein Hewani, BIN - Bumbu Instan, SAO - Saos & Cairan</span> (fix double "Bahan Pokok - Bahan Pokok") | Nomor urut dari Sub: Beras ketan=001, merah=002, porang=003, putih=004, Jagung Manis=005 | Sub spesifik: putih, Manis, Potong bukan Karbohidrat | Klik "🔄 Fix Data Lama Sekarang" untuk migrasi data lama di Supabase!</div>
      </div>
    </div>
  )
}
