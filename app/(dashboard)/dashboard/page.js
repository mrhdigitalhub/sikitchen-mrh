"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function DashboardMain() {
  const [profile, setProfile] = useState(null)
  const [company, setCompany] = useState({ nama: 'SIKITCHEN-MRH', logo: null })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const sess = getSession()
    if (!sess) { router.push('/login'); return }
    setProfile(sess)
    const saved = localStorage.getItem('sikitchen_company')
    if (saved) { try { setCompany(JSON.parse(saved)) } catch {} }
    supabase.from('perusahaan_settings').select('*').eq('perusahaan', sess?.perusahaan || 'SIKITCHEN-MRH').single().then(({data})=>{
      if(data){
        const comp = { nama: data.nama_perusahaan || data.perusahaan, logo: data.logo_url }
        setCompany(comp)
        localStorage.setItem('sikitchen_company', JSON.stringify(comp))
      }
    })
    setLoading(false)
  }, [router])

  if (loading) return <div className="p-6">Loading Dashboard...</div>
  const role = profile?.role
  if (role === 'owner') return <DashboardOwnerBlueprint profile={profile} company={company} />
  if (role === 'admin') return <DashboardAdmin profile={profile} company={company} setCompany={setCompany} />
  if (role === 'kepala_dapur' || role === 'dapur') return <DashboardDapurV4 profile={profile} company={company} />
  if (role === 'delivery' || role === 'kurir') return <DashboardDeliveryV4 profile={profile} company={company} />
  return <DashboardAdmin profile={profile} company={company} setCompany={setCompany} />
}

// ================= ADMIN =================
function DashboardAdmin({ profile, company, setCompany }) {
  const [stats, setStats] = useState({ inventory: 3, menus: 0, recipes: 0, users: 5 })
  const router = useRouter()
  useEffect(() => {
    async function init() {
      const perusahaan = profile?.perusahaan || company.nama || 'SIKITCHEN-MRH'
      const { count: inv } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true }).eq('perusahaan', perusahaan)
      const { count: men } = await supabase.from('menus').select('*', { count: 'exact', head: true }).eq('perusahaan', perusahaan)
      const { count: usr } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('perusahaan', perusahaan)
      setStats({ inventory: inv||3, menus: men||0, recipes: 0, users: usr||5 })
    }
    init()
  }, [profile, company])
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold">Dashboard Admin</h1><p className="text-sm font-semibold tracking-wider">SIKITCHEN-MRH | ADMIN</p></div><button onClick={()=>{localStorage.removeItem('sikitchen_session'); router.push('/login')}} className="text-xs bg-red-500 text-white px-3 py-1 rounded-full">Logout</button></div>
      <CompanySettingsManager company={company} setCompany={setCompany} profile={profile} />
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border"><div className="text-xs text-slate-500">Bahan Baku</div><div className="text-2xl font-bold">{stats.inventory}</div><Link href="/inventory" className="text-xs text-blue-600">Lihat Inventori →</Link></div>
        <div className="bg-white p-4 rounded-xl border"><div className="text-xs text-slate-500">Master Menu</div><div className="text-2xl font-bold">{stats.menus}</div><Link href="/menus" className="text-xs text-blue-600">Kelola Menu →</Link></div>
        <div className="bg-white p-4 rounded-xl border"><div className="text-xs text-slate-500">Total Resep</div><div className="text-2xl font-bold">{stats.recipes}</div><div className="text-xs text-slate-400">HPP otomatis</div></div>
        <div className="bg-white p-4 rounded-xl border"><div className="text-xs text-slate-500">User General</div><div className="text-2xl font-bold">{stats.users}</div><div className="text-xs text-slate-400">admin, dapur, delivery</div></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-xl border"><h3 className="font-semibold mb-1">Kelola Kategori Bahan (Dinamis)</h3><p className="text-[11px] text-slate-400 mb-3">Tambah / hapus - auto di dropdown Inventory</p><KategoriManager /></div>
        <div className="bg-white p-4 rounded-xl border"><h3 className="font-semibold mb-1">Kelola User General</h3><UserManager perusahaan={profile?.perusahaan} /></div>
      </div>
    </div>
  )
}

function CompanySettingsManager({ company, setCompany, profile }) {
  const [nama, setNama] = useState(company.nama)
  const [logoPreview, setLogoPreview] = useState(company.logo)
  const [uploading, setUploading] = useState(false)
  useEffect(()=>{ setNama(company.nama); setLogoPreview(company.logo) }, [company])
  async function handleLogoChange(e) {
    const file = e.target.files[0]; if (!file) return; setUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result; setLogoPreview(base64)
      const newComp = { nama: nama, logo: base64 }; setCompany(newComp)
      localStorage.setItem('sikitchen_company', JSON.stringify(newComp))
      try { await supabase.from('perusahaan_settings').upsert({ perusahaan: profile?.perusahaan || nama, nama_perusahaan: nama, logo_url: base64, updated_at: new Date().toISOString() }, { onConflict: 'perusahaan' }) } catch(err){}
      setUploading(false)
    }
    reader.readAsDataURL(file)
  }
  async function saveNama() {
    if (!nama.trim()) return alert('Nama perusahaan tidak boleh kosong')
    const newComp = { nama: nama.trim(), logo: logoPreview }; setCompany(newComp)
    localStorage.setItem('sikitchen_company', JSON.stringify(newComp))
    try { await supabase.from('perusahaan_settings').upsert({ perusahaan: profile?.perusahaan || nama, nama_perusahaan: nama.trim(), logo_url: logoPreview, updated_at: new Date().toISOString() }, { onConflict: 'perusahaan' }); alert(`Disimpan: Performance Catering - ${nama.trim()}`) } catch(e){ alert(`Disimpan lokal: ${nama.trim()}`) }
  }
  return (
    <div className="bg-white p-4 rounded-xl border-2 border-[#D4AF37]/30 shadow-sm">
      <h3 className="font-semibold mb-1 flex items-center gap-2">🏢 Pengaturan Perusahaan</h3>
      <p className="text-[11px] text-slate-500 mb-4">Atur nama & logo - tampil di header sebagai <b>Performance Catering - (Nama)</b></p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div><label className="text-xs font-semibold">Logo Perusahaan</label><div className="mt-2 border-2 border-dashed rounded-xl p-4 text-center bg-slate-50">{logoPreview ? <img src={logoPreview} alt="Logo" className="w-24 h-24 object-contain mx-auto rounded-lg mb-2" /> : <div className="w-24 h-24 bg-slate-200 rounded-lg mx-auto mb-2 flex items-center justify-center text-2xl">🏢</div>}<input type="file" accept="image/*" onChange={handleLogoChange} className="text-[11px] w-full" /><p className="text-[10px] text-slate-400 mt-1">{uploading ? 'Uploading...' : 'PNG/JPG max 2MB'}</p></div></div>
        <div className="col-span-2"><label className="text-xs font-semibold">Nama Perusahaan</label><input value={nama} onChange={e=>setNama(e.target.value)} placeholder="Contoh: SIKITCHEN-MRH" className="w-full border p-3 rounded-xl mt-2 text-sm" /><div className="mt-3 bg-[#0A1931] text-white p-3 rounded-lg"><div className="text-[11px] text-white/60">Preview Header:</div><div className="text-sm font-bold mt-1 flex items-center gap-2">{logoPreview && <img src={logoPreview} className="w-6 h-6 object-contain rounded bg-white p-0.5" />}Performance Catering - {nama || 'Nama Perusahaan'}</div></div><button onClick={saveNama} className="mt-3 w-full bg-[#D4AF37] text-[#0A1931] font-bold py-2.5 rounded-xl text-sm">💾 Simpan Nama & Logo</button></div>
      </div>
    </div>
  )
}

// ================= OWNER (keep V3) =================
function DashboardOwnerBlueprint({ profile, company }) {
  const [kpi, setKpi] = useState({ porsi: 450, pengiriman: 3, masuk: 12.5, tagihan: 3.2 })
  const [timeline, setTimeline] = useState([]); const [produksi, setProduksi] = useState([]); const [stokKritis, setStokKritis] = useState([]); const [diet, setDiet] = useState([]); const [tagihan, setTagihan] = useState([]); const [now, setNow] = useState(new Date()); const router = useRouter()
  const namaPerusahaan = company?.nama || profile?.perusahaan || 'SIKITCHEN-MRH'; const logoPerusahaan = company?.logo
  useEffect(() => {
    const id = setInterval(()=>setNow(new Date()), 60000); fetchOwnerData(); const interval = setInterval(fetchOwnerData, 30000)
    const channel = supabase.channel('owner-dashboard').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOwnerData).on('postgres_changes', { event: '*', schema: 'public', table: 'produksi_batch' }, fetchOwnerData).on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, fetchOwnerData).subscribe()
    return ()=>{ clearInterval(id); clearInterval(interval); supabase.removeChannel(channel) }
  }, [])
  async function fetchOwnerData() {
    const perusahaan = profile?.perusahaan || namaPerusahaan
    try {
      const { data: ordersToday } = await supabase.from('orders').select('*').eq('perusahaan', perusahaan).eq('tanggal', new Date().toISOString().split('T')[0])
      const { data: low } = await supabase.from('inventory_items').select('*').eq('perusahaan', perusahaan).lt('stok', 10).limit(5)
      const { data: pendingTagihan } = await supabase.from('orders').select('*').eq('perusahaan', perusahaan).eq('status_bayar', 'pending').limit(5)
      const { data: batch } = await supabase.from('produksi_batch').select('*').eq('perusahaan', perusahaan).eq('tanggal', new Date().toISOString().split('T')[0])
      const totalPorsi = ordersToday?.reduce((s,o)=>s+Number(o.jumlah_porsi||0),0) || 450
      const diJalan = ordersToday?.filter(o=>o.status_pengiriman==='Di Jalan').length || 3
      const uangMasuk = ordersToday?.filter(o=>o.status_bayar==='lunas').reduce((s,o)=>s+Number(o.total||0),0) / 1000000 || 12.5
      const sisaTagihan = pendingTagihan?.reduce((s,o)=>s+Number(o.sisa||0),0) / 1000000 || 3.2
      setKpi({ porsi: totalPorsi, pengiriman: diJalan, masuk: uangMasuk, tagihan: sisaTagihan })
      setTimeline(ordersToday?.slice(0,3) || [{ jam: '11:30 WIB', judul: 'Makan Siang PT Synapse (150 Box Standard + 5 Veggie)', lokasi: 'Gedung Jaya Lt.4, Jl. Sudirman - Kurir: Pak Joko (0812 xxxx)', status: 'Di Jalan' }, { jam: '15:00 WIB', judul: 'Syukuran Pranikahan Ibu Maya (50 Porsi Special)', lokasi: 'Komp. Buana Indah C3 - Tim Dapur 2 (Setup On Site)', status: 'Packing' }])
      if (batch?.length) setProduksi(batch.map(b=>({ nama: b.nama_menu || b.nama, progress: b.progress||0, jam_mulai: b.jam_mulai, jam_selesai: b.jam_selesai_estimasi, manpower: b.manpower })))
      else setProduksi([{ nama: 'Ayam Bakar Madu (200 Porsi)', progress: 100, jam_mulai: '05:00', jam_selesai: '08:30', manpower: 4 }, { nama: 'Sambal Goreng Ati Balado (150 Porsi)', progress: 75, jam_mulai: '06:00', jam_selesai: '09:00', manpower: 3 }, { nama: 'Tumis Capcay Seafood (150 Porsi)', progress: 20, jam_mulai: '07:00', jam_selesai: '10:00', manpower: 2 }])
      setStokKritis(low || [{ nama: 'Box Bento 20x20', sisa: 'Sisa 25 Pcs' }, { nama: 'Daging Sapi Lulur', sisa: 'Sisa 18 Kg' }, { nama: 'Minyak Goreng 2L', sisa: 'Sisa 6 Pouch' }])
      setDiet(['PT Synapse: 5 Box Wajib Vegetarian (Tanpa Daging & Telur)', 'Ibu Maya: Bebas Olahan Kacang Tanah (Alergi Berat)'])
      setTagihan(pendingTagihan || [{ nama: 'Pernikahan Dodi & Laras', nilai: 'Sisa: Rp 2.500.000' }, { nama: 'Arisan Ibu-Ibu', nilai: 'Sisa: Rp 700.000' }])
    } catch(e){}
  }
  return (
    <div className="space-y-4 bg-[#F8FAFC] -m-6 p-6">
      <div className="bg-[#0A1931] text-white rounded-xl p-4 flex justify-between items-center"><div className="flex items-center gap-3">{logoPerusahaan ? <img src={logoPerusahaan} alt="Logo" className="w-10 h-10 rounded-lg object-contain bg-white p-1" /> : <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-lg">🏢</div>}<div><h1 className="text-lg font-bold">Performance Catering - {namaPerusahaan}</h1><p className="text-xs text-white/60">Ringkasan Operasional & Keuangan Hari Ini | {now.toLocaleDateString('id-ID', { weekday:'short', day:'numeric', month:'short', year:'numeric' })} | SIKITCHEN-MRH | OWNER</p></div></div><div className="flex items-center gap-3"><span className="text-[11px] bg-green-500/20 text-green-300 px-3 py-1 rounded-full flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>Server Live - Real-Time Sync Enabled</span><button className="bg-[#FF8C00] text-white text-xs px-4 py-2 rounded-lg font-semibold">+ Pesanan Baru</button><button onClick={()=>{localStorage.removeItem('sikitchen_session'); router.push('/login')}} className="text-xs bg-red-500 px-3 py-1 rounded-full">Logout</button></div></div>
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border-l-4 border-l-[#0A1931] shadow-sm"><div className="text-[11px] text-slate-500">TOTAL PORSI HARI INI</div><div className="text-2xl font-bold">{kpi.porsi} <span className="text-sm font-normal">Box</span></div><div className="text-[11px] text-green-600 mt-1">320 Box Selesai Packed (71%)</div></div>
        <div className="bg-white p-4 rounded-xl border-l-4 border-l-orange-400 shadow-sm"><div className="text-[11px] text-slate-500">STATUS PENGIRIMAN</div><div className="text-2xl font-bold">{kpi.pengiriman} <span className="text-sm font-normal">Di Jalan</span></div><div className="text-[11px] text-slate-500 mt-1">2 Selesai + 1 Siap Kurir</div></div>
        <div className="bg-white p-4 rounded-xl border-l-4 border-l-green-500 shadow-sm"><div className="text-[11px] text-slate-500">UANG MASUK HARI INI</div><div className="text-2xl font-bold">Rp {kpi.masuk}M</div><div className="text-[11px] text-slate-500 mt-1">DP + Pelunasan Cair Hari Ini</div></div>
        <div className="bg-white p-4 rounded-xl border-l-4 border-l-red-400 shadow-sm"><div className="text-[11px] text-slate-500">SISA TAGIHAN (PENDING)</div><div className="text-2xl font-bold">Rp {kpi.tagihan}M</div><div className="text-[11px] text-red-500 mt-1">2 Klien H-1 Belum Pelunasan</div></div>
      </div>
      <div className="grid grid-cols-3 gap-4"><div className="col-span-2 space-y-4"><div className="bg-white rounded-xl border shadow-sm p-4"><div className="flex justify-between mb-3"><h3 className="font-semibold text-sm">📌 Antrean & Timeline Pengiriman Terdekat</h3><span className="text-[11px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Auto-Update (30s)</span></div><div className="space-y-3">{timeline.map((t,i)=>(<div key={i} className="flex gap-3 border-l-4 pl-3 py-2" style={{borderColor: t.status==='Di Jalan' ? '#0A1931' : '#F59E0B'}}><div className="flex-1"><div className="text-[11px] font-bold text-[#0A1931]">JAM KIRIM: {t.jam}</div><div className="text-sm font-semibold">{t.judul}</div><div className="text-[11px] text-slate-500">📍 {t.lokasi}</div></div><span className={`text-[11px] px-2 py-1 rounded h-fit ${t.status==='Di Jalan' ? 'bg-[#0A1931] text-white' : 'bg-yellow-100 text-yellow-700'}`}>{t.status}</span></div>))}</div></div><div className="bg-white rounded-xl border shadow-sm p-4"><h3 className="font-semibold text-sm mb-3">🔍 Progress Dapur & Masak Harian (Batch Tracker) - Live dari Dapur</h3><div className="space-y-3">{produksi.map((p,i)=><div key={i} className="border rounded-lg p-2"><div className="flex justify-between text-xs mb-1"><span className="font-semibold">{p.nama}</span><span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded">{p.manpower ? `${p.manpower} orang` : ''} {p.jam_mulai ? `• ${p.jam_mulai} - ${p.jam_selesai}` : ''}</span><span className={`font-semibold ${p.progress===100?'text-green-600':p.progress>=50?'text-orange-600':'text-slate-500'}`}>{p.progress}%</span></div><div className="w-full bg-slate-100 h-2 rounded-full"><div className={`h-2 rounded-full ${p.progress===100?'bg-green-500':p.progress>=50?'bg-orange-400':'bg-slate-300'}`} style={{width:`${p.progress}%`}}></div></div></div>)}</div></div></div><div className="space-y-4"><div className="bg-red-50 border border-red-200 rounded-xl p-3"><h4 className="text-xs font-bold text-red-700 mb-2">⚠️ Catatan Diet & Alergi Khusus</h4><ul className="text-[11px] text-red-600 space-y-1 list-disc pl-4">{diet.map((d,i)=><li key={i}>{d}</li>)}</ul></div><div className="bg-white rounded-xl border shadow-sm p-3"><h4 className="text-xs font-bold mb-2">💰 Tagihan Jatuh Tempo (H-1 / H-0)</h4><div className="space-y-2">{tagihan.map((t,i)=><div key={i} className="flex justify-between items-center text-xs border-b pb-2"><div><div className="font-semibold">{t.nama}</div><div className="text-slate-500">{t.nilai}</div></div><a href={`https://wa.me/6281234567890?text=Halo ${t.nama}, tagihan ${t.nilai} jatuh tempo`} target="_blank" className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px]">Kirim WA</a></div>)}</div></div><div className="bg-white rounded-xl border shadow-sm p-3"><h4 className="text-xs font-bold mb-2">📦 Stok Kritis & Belanja Besok (H+1)</h4><div className="space-y-1.5 text-[11px]">{stokKritis.map((s,i)=><div key={i} className="flex justify-between"><span>• {s.nama_bahan||s.nama}</span><span className="text-red-600 font-semibold">{s.sisa||`${s.stok} ${s.satuan}`}</span></div>)}</div></div></div></div>
    </div>
  )
}

// ================= KEPALA DAPUR V4 - NEW =================
function DashboardDapurV4({ profile, company }) {
  const [batch, setBatch] = useState([
    { id:1, nama: 'Ayam Bakar Madu (200 Porsi)', porsi: 200, manpower: 4, jam_mulai: '05:00', jam_selesai: '08:30', progress: 75, status: 'Proses Masak', bahan: 'Ayam 20kg, Madu 2L' },
    { id:2, nama: 'Sambal Goreng Ati Balado (150 Porsi)', porsi: 150, manpower: 3, jam_mulai: '06:00', jam_selesai: '09:00', progress: 100, status: 'Selesai', bahan: 'Ati 10kg' },
    { id:3, nama: 'Tumis Capcay Seafood (150 Porsi)', porsi: 150, manpower: 2, jam_mulai: '07:00', jam_selesai: '10:00', progress: 20, status: 'Menunggu', bahan: 'Mix Sayur 15kg' },
  ])
  const [lowStock, setLowStock] = useState([])
  const [manpowerTotal, setManpowerTotal] = useState(9)
  const [now, setNow] = useState(new Date())
  const router = useRouter()
  const namaPerusahaan = company?.nama || profile?.perusahaan || 'SIKITCHEN-MRH'
  const logoPerusahaan = company?.logo

  useEffect(()=>{
    fetchDapur()
    const channel = supabase.channel('dapur-v4').on('postgres_changes', { event: '*', schema: 'public', table: 'produksi_batch' }, fetchDapur).subscribe()
    const id = setInterval(()=>setNow(new Date()), 60000)
    return ()=>{ clearInterval(id); supabase.removeChannel(channel) }
  }, [])

  async function fetchDapur(){
    const perusahaan = profile?.perusahaan || namaPerusahaan
    const { data: low } = await supabase.from('inventory_items').select('*').eq('perusahaan', perusahaan).lt('stok', 10).limit(6)
    if(low?.length) setLowStock(low)
    else setLowStock([{nama_bahan:'Box Bento 20x20', stok:25, satuan:'Pcs'}, {nama_bahan:'Minyak Goreng 2L', stok:6, satuan:'Pouch'}])
    // Load batch dari Supabase jika ada
    const { data: batchDb } = await supabase.from('produksi_batch').select('*').eq('perusahaan', perusahaan).eq('tanggal', new Date().toISOString().split('T')[0])
    if(batchDb?.length) setBatch(batchDb.map(b=>({ id:b.id, nama:b.nama_menu, porsi:b.porsi, manpower:b.manpower, jam_mulai:b.jam_mulai, jam_selesai:b.jam_selesai_estimasi, progress:b.progress, status:b.status, bahan:b.catatan })))
  }

  function updateProgress(id, newProgress){
    const updated = batch.map(b=> b.id===id ? { ...b, progress: newProgress, status: newProgress===100 ? 'Selesai' : newProgress>=50 ? 'Proses Masak' : 'Menunggu' } : b)
    setBatch(updated)
    // Auto update ke Owner via Supabase - agar Owner bisa lihat tepat waktu
    const item = updated.find(b=>b.id===id)
    supabase.from('produksi_batch').upsert({ id: id, perusahaan: profile?.perusahaan || namaPerusahaan, tanggal: new Date().toISOString().split('T')[0], nama_menu: item.nama, porsi: item.porsi, manpower: item.manpower, jam_mulai: item.jam_mulai, jam_selesai_estimasi: item.jam_selesai, progress: newProgress, status: item.status, updated_at: new Date().toISOString() }, { onConflict: 'id' }).then(()=>{})
  }

  function mulaiMasak(id){
    const nowStr = new Date().toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})
    const updated = batch.map(b=> b.id===id ? { ...b, jam_mulai: nowStr, progress: 10, status: 'Proses Masak' } : b)
    setBatch(updated)
    const item = updated.find(b=>b.id===id)
    supabase.from('produksi_batch').upsert({ id: id, perusahaan: profile?.perusahaan || namaPerusahaan, tanggal: new Date().toISOString().split('T')[0], nama_menu: item.nama, porsi: item.porsi, manpower: item.manpower, jam_mulai: nowStr, jam_selesai_estimasi: item.jam_selesai, progress: 10, status: 'Proses Masak' }, { onConflict: 'id' }).then(()=>{})
  }

  return (
    <div className="space-y-4 bg-[#FFF8F0] -m-6 p-6">
      <div className="bg-[#0A1931] text-white rounded-xl p-4 flex justify-between items-center"><div className="flex items-center gap-3">{logoPerusahaan ? <img src={logoPerusahaan} alt="Logo" className="w-10 h-10 rounded-lg object-contain bg-white p-1" /> : <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">👨‍🍳</div>}<div><h1 className="text-lg font-bold">Performance Catering - {namaPerusahaan} | KEPALA DAPUR</h1><p className="text-xs text-white/60">Batch Hari Ini | {now.toLocaleDateString('id-ID', { weekday:'short', day:'numeric', month:'short', year:'numeric' })} | Manpower: {manpowerTotal} Orang | Live Sync ke Owner</p></div></div><div className="flex items-center gap-3"><span className="text-[11px] bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full">🔥 Dapur Aktif</span><button onClick={()=>{localStorage.removeItem('sikitchen_session'); router.push('/login')}} className="text-xs bg-red-500 px-3 py-1 rounded-full">Logout</button></div></div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-sm">🍳 Batch Hari Ini - Produksi</h3><div className="flex items-center gap-2 text-xs"><span className="text-slate-500">Jumlah Manpower:</span><input type="number" value={manpowerTotal} onChange={e=>setManpowerTotal(Number(e.target.value))} className="w-16 border rounded-lg px-2 py-1 text-center" /><span>orang</span></div></div>
            <div className="space-y-4">
              {batch.map((b)=>(
                <div key={b.id} className="border-2 rounded-xl p-4 bg-slate-50">
                  <div className="flex justify-between items-start mb-2"><div><div className="font-bold text-sm">{b.nama}</div><div className="text-[11px] text-slate-500 mt-1">Bahan: {b.bahan} | 👥 {b.manpower} orang | 🕐 {b.jam_mulai || '-'} - Estimasi {b.jam_selesai || '-'} | ⏱ Progress: {b.progress}%</div></div><span className={`text-[11px] px-2 py-1 rounded-full font-bold ${b.progress===100?'bg-green-100 text-green-700':b.progress>=50?'bg-orange-100 text-orange-700':'bg-slate-200 text-slate-600'}`}>{b.status}</span></div>
                  <div className="w-full bg-slate-200 h-3 rounded-full mb-3"><div className={`h-3 rounded-full transition-all ${b.progress===100?'bg-green-500':b.progress>=50?'bg-orange-500':'bg-slate-400'}`} style={{width:`${b.progress}%`}}></div></div>
                  <div className="flex gap-2">
                    <button onClick={()=>mulaiMasak(b.id)} className="text-xs bg-[#0A1931] text-white px-3 py-2 rounded-lg">▶️ Mulai Masak ({b.jam_mulai ? 'Reset '+b.jam_mulai : 'Set Jam Mulai'})</button>
                    <div className="flex items-center gap-1 bg-white border rounded-lg px-2"><span className="text-[11px]">Progress:</span><input type="range" min="0" max="100" step="5" value={b.progress} onChange={e=>updateProgress(b.id, Number(e.target.value))} className="w-20" /><span className="text-xs font-bold w-8">{b.progress}%</span></div>
                    <button onClick={()=>updateProgress(b.id, 100)} className="text-xs bg-green-600 text-white px-3 py-2 rounded-lg">✅ Selesai 100% ({new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})})</button>
                    <button className="text-xs bg-orange-100 text-orange-700 px-3 py-2 rounded-lg">📦 Pakai Stok</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-xl border shadow-sm p-4"><h4 className="font-bold text-sm mb-3">📦 Inventori Stok - Real-time Menipis &lt;10</h4><div className="space-y-2 text-xs">{lowStock.map((s,i)=><div key={i} className="flex justify-between border-b pb-1.5"><span>{s.nama_bahan}</span><span className="text-red-600 font-bold">{s.stok} {s.satuan}</span></div>)}</div><Link href="/inventory" className="text-[11px] text-blue-600 mt-2 block">Lihat Inventori Lengkap →</Link></div>
          <div className="bg-white rounded-xl border shadow-sm p-4"><h4 className="font-bold text-sm mb-2">📖 Resep & HPP - calculations.js</h4><p className="text-[11px] text-slate-500 mb-3">HPP otomatis dari stok real-time</p><div className="space-y-2 text-[11px]"><div className="flex justify-between"><span>Ayam Bakar Madu</span><span className="font-bold">HPP Rp 12.500</span></div><div className="flex justify-between"><span>Sambal Ati Balado</span><span className="font-bold">HPP Rp 8.200</span></div></div><Link href="/menus" className="text-[11px] bg-[#D4AF37] text-[#0A1931] px-3 py-1.5 rounded-lg font-bold mt-3 block text-center">Lihat Master Menu & Resep →</Link></div>
          <div className="bg-[#0A1931] text-white rounded-xl p-3"><h4 className="text-xs font-bold mb-2">👁️ Owner Monitoring - Tepat Waktu</h4><p className="text-[11px] text-white/70">Setiap update Jam Mulai - Estimasi Selesai - Progress (%) otomatis terkirim ke Dashboard Owner via Realtime. Owner bisa cek order dibuat tepat waktu.</p><div className="mt-2 text-[11px] bg-white/10 rounded p-2">✅ Channel: produksi_batch → owner-dashboard</div></div>
        </div>
      </div>
    </div>
  )
}

// ================= DELIVERY V4 - TANPA UANG MASUK =================
function DashboardDeliveryV4({ profile, company }) {
  const [orders, setOrders] = useState([
    { id:1, jam:'11:30 WIB', judul:'Makan Siang PT Synapse (150 Box Standard + 5 Veggie)', alamat:'Gedung Jaya Lt.4, Jl. Sudirman', kurir:'Pak Joko', status:'Di Jalan', foto: null },
    { id:2, jam:'15:00 WIB', judul:'Syukuran Pranikahan Ibu Maya (50 Porsi Special)', alamat:'Komp. Buana Indah C3', kurir:'Tim Dapur 2', status:'Packing', foto: null },
  ])
  const [now, setNow] = useState(new Date())
  const router = useRouter()
  const namaPerusahaan = company?.nama || profile?.perusahaan || 'SIKITCHEN-MRH'
  const logoPerusahaan = company?.logo

  useEffect(()=>{
    const id = setInterval(()=>setNow(new Date()), 60000)
    fetchDelivery()
    return ()=>clearInterval(id)
  }, [])

  async function fetchDelivery(){
    const perusahaan = profile?.perusahaan || namaPerusahaan
    const { data } = await supabase.from('orders').select('*').eq('perusahaan', perusahaan).eq('tanggal', new Date().toISOString().split('T')[0])
    if(data?.length) setOrders(data.map(o=>({ id:o.id, jam:o.jam_kirim||o.jam, judul:o.judul||o.nama_acara, alamat:o.alamat, kurir:o.kurir, status:o.status_pengiriman||o.status, foto:o.foto_bukti })))
  }

  function updateStatus(id, newStatus){
    setOrders(orders.map(o=> o.id===id ? { ...o, status: newStatus } : o))
    supabase.from('orders').update({ status_pengiriman: newStatus, status: newStatus }).eq('id', id).then(()=>{})
  }

  return (
    <div className="space-y-4 bg-[#F0FFF4] -m-6 p-6">
      <div className="bg-[#0A1931] text-white rounded-xl p-4 flex justify-between items-center"><div className="flex items-center gap-3">{logoPerusahaan ? <img src={logoPerusahaan} alt="Logo" className="w-10 h-10 rounded-lg object-contain bg-white p-1" /> : <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">🚚</div>}<div><h1 className="text-lg font-bold">Performance Catering - {namaPerusahaan} | DELIVERY</h1><p className="text-xs text-white/60">Timeline Pengiriman Hari Ini | {now.toLocaleDateString('id-ID', { weekday:'short', day:'numeric', month:'short', year:'numeric' })} | {orders.length} Order</p></div></div><div className="flex items-center gap-2"><span className="text-[11px] bg-green-500/20 text-green-300 px-3 py-1 rounded-full">🚚 {orders.filter(o=>o.status==='Di Jalan').length} Di Jalan</span><button onClick={()=>{localStorage.removeItem('sikitchen_session'); router.push('/login')}} className="text-xs bg-red-500 px-3 py-1 rounded-full">Logout</button></div></div>

      <div className="bg-white rounded-xl border shadow-sm p-4">
        <h3 className="font-bold text-sm mb-4">📦 Timeline Pengiriman Hari Ini - Diproses → Dikemas → Di Jalan → Selesai → CLOSED</h3>
        <div className="space-y-4">
          {orders.map((o)=>(
            <div key={o.id} className="border-2 rounded-xl p-4 flex gap-4">
              <div className="text-center"><div className="text-xs font-bold bg-[#0A1931] text-white px-2 py-1 rounded">{o.jam}</div><div className="mt-2 w-3 h-3 bg-orange-400 rounded-full mx-auto"></div></div>
              <div className="flex-1"><div className="font-bold text-sm">{o.judul}</div><div className="text-xs text-slate-500 mt-1">📍 {o.alamat} | Kurir: {o.kurir}</div><div className="mt-3 flex gap-2 flex-wrap">{['Diproses','Dikemas','Di Jalan','Selesai','CLOSED'].map((s)=>(<button key={s} onClick={()=>updateStatus(o.id, s)} className={`text-[11px] px-3 py-1.5 rounded-full border font-semibold ${o.status===s ? 'bg-[#0A1931] text-white border-[#0A1931]' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>{s}{o.status===s && ' ✓'}</button>))}</div></div>
              <div className="text-right"><span className={`text-xs px-3 py-1 rounded-full font-bold ${o.status==='Di Jalan' ? 'bg-blue-100 text-blue-700' : o.status==='Selesai' ? 'bg-green-100 text-green-700' : o.status==='CLOSED' ? 'bg-slate-800 text-white' : 'bg-yellow-100 text-yellow-700'}`}>{o.status}</span><div className="mt-3"><button className="text-[11px] bg-slate-100 px-3 py-1.5 rounded-lg">📸 Foto Bukti</button>{o.foto && <img src={o.foto} alt="Bukti" className="w-20 h-20 object-cover rounded-lg mt-2" />}</div></div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border p-3 text-[11px] text-slate-500">💡 Flow: Kepala Dapur Selesai 100% → Auto masuk Antrean Delivery Packing → Kurir klik Di Jalan → Selesai + Foto Bukti → CLOSED (Owner lihat real-time)</div>
    </div>
  )
}

function KategoriManager() {
  const [kats, setKats] = useState([]); const [nama, setNama] = useState('')
  useEffect(()=>{ load() },[]); async function load(){ const { data } = await supabase.from('kategori_bahan').select('*').order('nama'); setKats(data||[]) }
  async function add(e){ e.preventDefault(); if(!nama.trim()) return; const { error } = await supabase.from('kategori_bahan').insert({ nama: nama.trim() }); if(!error){ setNama(''); load() } }
  async function del(id, namaK){ if(!confirm(`Hapus kategori "${namaK}"?`)) return; const { error } = await supabase.from('kategori_bahan').delete().eq('id', id); if(!error) load(); }
  return (<div><form onSubmit={add} className="flex gap-2 mb-3"><input className="flex-1 border p-2.5 rounded-lg text-sm" placeholder="Nama kategori baru" value={nama} onChange={e=>setNama(e.target.value)} required /><button className="bg-[#0A1931] text-white px-4 py-2 rounded-lg text-sm">+ Tambah Kategori</button></form><div className="flex flex-wrap gap-2">{kats.map(k=>(<span key={k.id} className="bg-slate-100 px-3 py-1.5 rounded-full text-xs flex items-center gap-2 border">{k.nama}<button onClick={()=>del(k.id, k.nama)} className="bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center">×</button></span>))}</div></div>)
}
function UserManager({ perusahaan }) {
  const [users, setUsers] = useState([]); const [form, setForm] = useState({ username: '', password_plain: '', role: 'admin', nama_lengkap: '' })
  useEffect(()=>{ load() },[]); async function load(){ const { data } = await supabase.from('profiles').select('*').order('username'); setUsers(data||[]) }
  async function add(e){ e.preventDefault(); const { error } = await supabase.from('profiles').insert({ username: form.username, password_plain: form.password_plain, role: form.role, nama_lengkap: form.nama_lengkap, perusahaan: perusahaan||'SIKITCHEN-MRH' }); if(!error){ setForm({ username: '', password_plain: '', role: 'admin', nama_lengkap: '' }); load() } }
  return (<div><form onSubmit={add} className="grid grid-cols-2 gap-2 mb-3"><input className="border p-2 rounded-lg text-sm" placeholder="Username" value={form.username} onChange={e=>setForm({...form, username: e.target.value})} required /><input className="border p-2 rounded-lg text-sm" placeholder="Password" value={form.password_plain} onChange={e=>setForm({...form, password_plain: e.target.value})} required /><select className="border p-2 rounded-lg text-sm" value={form.role} onChange={e=>setForm({...form, role: e.target.value})}><option value="admin">Admin</option><option value="owner">Owner</option><option value="kepala_dapur">Kepala Dapur</option><option value="delivery">Delivery</option><option value="kurir">Kurir</option></select><input className="border p-2 rounded-lg text-sm" placeholder="Nama Lengkap" value={form.nama_lengkap} onChange={e=>setForm({...form, nama_lengkap: e.target.value})} /><button className="col-span-2 bg-[#D4AF37] text-[#0A1931] font-bold py-2.5 rounded-lg text-sm">+ Tambah User General</button></form><div className="text-xs space-y-1">{users.map(u=><div key={u.id} className="flex justify-between border-b py-1"><span>{u.username} - {u.role}</span><span className="text-slate-400">{u.perusahaan}</span></div>)}</div></div>)
}
