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
    supabase.from('perusahaan_settings').select('*').eq('perusahaan', sess?.perusahaan || 'SIKITCHEN-MRH').single().then(({data})=>{ if(data){ const comp={nama:data.nama_perusahaan||data.perusahaan, logo:data.logo_url}; setCompany(comp); localStorage.setItem('sikitchen_company', JSON.stringify(comp)) } })
    setLoading(false)
  }, [router])
  if (loading) return <div className="p-6">Loading...</div>
  const role = profile?.role
  if (role === 'owner') return <DashboardOwnerV6 profile={profile} company={company} />
  if (role === 'admin') return <DashboardAdminV6 profile={profile} company={company} setCompany={setCompany} />
  if (role === 'kepala_dapur' || role === 'dapur') return <DashboardDapurV6 profile={profile} company={company} />
  if (role === 'delivery' || role === 'kurir') return <DashboardDeliveryV6 profile={profile} company={company} />
  return <DashboardAdminV6 profile={profile} company={company} setCompany={setCompany} />
}

// ================= ADMIN V6 - LABEL BAHAN =================
function DashboardAdminV6({ profile, company, setCompany }) {
  const [stats, setStats] = useState({ inventory: 3, menus: 0, bahan: 0, users: 5 })
  const router = useRouter()
  useEffect(() => {
    async function init() {
      const perusahaan = profile?.perusahaan || company.nama || 'SIKITCHEN-MRH'
      const { count: inv } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true }).eq('perusahaan', perusahaan)
      const { count: men } = await supabase.from('menus').select('*', { count: 'exact', head: true }).eq('perusahaan', perusahaan)
      const { count: usr } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('perusahaan', perusahaan)
      setStats({ inventory: inv||3, menus: men||0, bahan: 0, users: usr||5 })
    }
    init()
  }, [profile, company])
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold">Dashboard Admin</h1><p className="text-sm font-semibold tracking-wider">SIKITCHEN-MRH | ADMIN</p></div><button onClick={()=>{localStorage.removeItem('sikitchen_session'); router.push('/login')}} className="text-xs bg-red-500 text-white px-3 py-1 rounded-full">Logout</button></div>
      <CompanySettingsManagerV6 company={company} setCompany={setCompany} profile={profile} />
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border"><div className="text-xs text-slate-500">Bahan Baku</div><div className="text-2xl font-bold">{stats.inventory}</div><Link href="/inventory" className="text-xs text-blue-600">Lihat Inventori →</Link></div>
        <div className="bg-white p-4 rounded-xl border"><div className="text-xs text-slate-500">Master Menu & Bahan</div><div className="text-2xl font-bold">{stats.menus}</div><Link href="/menus" className="text-xs text-blue-600">Kelola Menu & Bahan →</Link></div>
        <div className="bg-white p-4 rounded-xl border"><div className="text-xs text-slate-500">Total Bahan</div><div className="text-2xl font-bold">{stats.bahan}</div><div className="text-xs text-slate-400">HPP otomatis calculations.js</div></div>
        <div className="bg-white p-4 rounded-xl border"><div className="text-xs text-slate-500">User General</div><div className="text-2xl font-bold">{stats.users}</div><div className="text-xs text-slate-400">admin, dapur, delivery</div></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-xl border"><h3 className="font-semibold mb-1">Kelola Kategori Bahan (Dinamis)</h3><p className="text-[11px] text-slate-400 mb-2">Kategori ini jadi dropdown di Inventori & Master Menu & Bahan</p><KategoriManagerV6 /></div>
        <div className="bg-white p-4 rounded-xl border"><h3 className="font-semibold mb-1">Kelola User General</h3><UserManagerV6 perusahaan={profile?.perusahaan} /></div>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[11px]"><div className="font-bold">Konsep V6 - Master Menu & Bahan Sync:</div>Admin input di Master Menu & Bahan = Nama Menu + Bahan (Ayam 100gr/porsi, Madu 10ml/porsi) → auto HPP → Kepala Dapur pilih Dropdown Nama Menu → Bahan auto isi → Porsi x Bahan → Pakai Stok auto kurang inventory → Owner lihat real-time</div>
    </div>
  )
}

function CompanySettingsManagerV6({ company, setCompany, profile }) {
  const [nama, setNama] = useState(company.nama); const [logoPreview, setLogoPreview] = useState(company.logo); const [uploading, setUploading] = useState(false)
  useEffect(()=>{ setNama(company.nama); setLogoPreview(company.logo) }, [company])
  async function handleLogoChange(e) {
    const file = e.target.files[0]; if (!file) return; setUploading(true)
    const reader = new FileReader(); reader.onload = async () => { const base64 = reader.result; setLogoPreview(base64); const newComp = { nama: nama, logo: base64 }; setCompany(newComp); localStorage.setItem('sikitchen_company', JSON.stringify(newComp)); try { await supabase.from('perusahaan_settings').upsert({ perusahaan: profile?.perusahaan || nama, nama_perusahaan: nama, logo_url: base64, updated_at: new Date().toISOString() }, { onConflict: 'perusahaan' }) } catch(err){} setUploading(false) }; reader.readAsDataURL(file)
  }
  async function saveNama() {
    if (!nama.trim()) return alert('Nama perusahaan tidak boleh kosong'); const newComp = { nama: nama.trim(), logo: logoPreview }; setCompany(newComp); localStorage.setItem('sikitchen_company', JSON.stringify(newComp))
    try { await supabase.from('perusahaan_settings').upsert({ perusahaan: profile?.perusahaan || nama, nama_perusahaan: nama.trim(), logo_url: logoPreview, updated_at: new Date().toISOString() }, { onConflict: 'perusahaan' }); alert(`Disimpan: Performance Catering - ${nama.trim()}`) } catch(e){ alert(`Disimpan lokal: ${nama.trim()}`) }
  }
  return (<div className="bg-white p-4 rounded-xl border-2 border-[#D4AF37]/30 shadow-sm"><h3 className="font-semibold mb-1">🏢 Pengaturan Perusahaan</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3"><div><label className="text-xs font-semibold">Logo</label><div className="mt-2 border-2 border-dashed rounded-xl p-4 text-center bg-slate-50">{logoPreview ? <img src={logoPreview} alt="Logo" className="w-24 h-24 object-contain mx-auto rounded-lg mb-2" /> : <div className="w-24 h-24 bg-slate-200 rounded-lg mx-auto mb-2 flex items-center justify-center text-2xl">🏢</div>}<input type="file" accept="image/*" onChange={handleLogoChange} className="text-[11px] w-full" /><p className="text-[10px] text-slate-400 mt-1">{uploading ? 'Uploading...' : 'PNG/JPG'}</p></div></div><div className="col-span-2"><label className="text-xs font-semibold">Nama Perusahaan</label><input value={nama} onChange={e=>setNama(e.target.value)} className="w-full border p-3 rounded-xl mt-2 text-sm" /><div className="mt-3 bg-[#0A1931] text-white p-3 rounded-lg flex items-center gap-2"><div className="text-sm font-bold flex items-center gap-2">{logoPreview && <img src={logoPreview} className="w-6 h-6 bg-white rounded p-0.5" />}Performance Catering - {nama}</div></div><button onClick={saveNama} className="mt-3 w-full bg-[#D4AF37] text-[#0A1931] font-bold py-2.5 rounded-xl text-sm">💾 Simpan</button></div></div></div>)
}

// ================= OWNER V6 =================
function DashboardOwnerV6({ profile, company }) {
  const [kpi, setKpi] = useState({ porsi: 450, pengiriman: 1, masuk: 12.5, tagihan: 3.2 })
  const [timeline, setTimeline] = useState([]); const [produksi, setProduksi] = useState([]); const [now, setNow] = useState(new Date()); const router = useRouter()
  const namaPerusahaan = company?.nama || 'SIKITCHEN-MRH'; const logoPerusahaan = company?.logo
  useEffect(() => { const id = setInterval(()=>setNow(new Date()), 60000); fetchOwner(); const interval = setInterval(fetchOwner, 30000); const channel = supabase.channel('owner-v6').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOwner).on('postgres_changes', { event: '*', schema: 'public', table: 'produksi_batch' }, fetchOwner).subscribe(); return ()=>{ clearInterval(id); clearInterval(interval); supabase.removeChannel(channel) } }, [])
  async function fetchOwner() {
    const perusahaan = profile?.perusahaan || namaPerusahaan
    const { data: ordersToday } = await supabase.from('orders').select('*').eq('perusahaan', perusahaan).eq('tanggal', new Date().toISOString().split('T')[0])
    const { data: batch } = await supabase.from('produksi_batch').select('*').eq('perusahaan', perusahaan).order('tanggal')
    setTimeline(ordersToday || [{ jam_kirim: '11:30 WIB', judul: 'PT Synapse (150 Box)', alamat: 'Gedung Jaya - Pak Joko', status_pengiriman: 'Di Jalan', foto_bukti_url: null }])
    setProduksi(batch?.length ? batch : [{ nama_menu: 'Ayam Bakar Madu (200)', manpower:4, jam_mulai:'05:00', jam_selesai_estimasi:'08:30', progress:75, status:'Proses Masak' }])
  }
  return (<div className="space-y-4 bg-[#F8FAFC] -m-6 p-6"><div className="bg-[#0A1931] text-white rounded-xl p-4 flex justify-between items-center"><div className="flex items-center gap-3">{logoPerusahaan ? <img src={logoPerusahaan} className="w-10 h-10 bg-white rounded-lg p-1 object-contain" /> : <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">🏢</div>}<div><h1 className="text-lg font-bold">Performance Catering - {namaPerusahaan}</h1><p className="text-xs text-white/60">{now.toLocaleDateString('id-ID')} | OWNER | Live Sync Dapur Bahan & Delivery</p></div></div><button onClick={()=>{localStorage.removeItem('sikitchen_session'); router.push('/login')}} className="text-xs bg-red-500 px-3 py-1 rounded-full">Logout</button></div><div className="grid grid-cols-4 gap-4"><div className="bg-white p-4 rounded-xl border-l-4 border-l-[#0A1931]"><div className="text-[11px] text-slate-500">TOTAL PORSI</div><div className="text-2xl font-bold">{kpi.porsi} Box</div></div><div className="bg-white p-4 rounded-xl border-l-4 border-l-orange-400"><div className="text-[11px]">DI JALAN</div><div className="text-2xl font-bold">{kpi.pengiriman}</div></div><div className="bg-white p-4 rounded-xl border-l-4 border-l-green-500"><div className="text-[11px]">UANG MASUK</div><div className="text-2xl font-bold">Rp {kpi.masuk}M</div></div><div className="bg-white p-4 rounded-xl border-l-4 border-l-red-400"><div className="text-[11px]">TAGIHAN</div><div className="text-2xl font-bold">Rp {kpi.tagihan}M</div></div></div><div className="grid grid-cols-3 gap-4"><div className="col-span-2 space-y-4"><div className="bg-white rounded-xl border p-4"><h3 className="font-semibold text-sm mb-3">📌 Timeline Delivery - Live dari Kurir + Foto Bukti</h3><div className="space-y-3">{timeline.map((t,i)=><div key={i} className="flex gap-3 border-l-4 pl-3 py-2" style={{borderColor: t.status_pengiriman==='Di Jalan' ? '#0A1931' : '#F59E0B'}}><div className="flex-1"><div className="text-[11px] font-bold">JAM KIRIM: {t.jam_kirim}</div><div className="text-sm font-semibold">{t.judul}</div><div className="text-[11px] text-slate-500">📍 {t.alamat} {t.foto_bukti_url ? '📸 Foto Ada' : ''}</div>{t.foto_bukti_url && <img src={t.foto_bukti_url} className="w-24 h-16 object-cover rounded mt-2" />}</div><span className="text-[11px] bg-[#0A1931] text-white px-2 py-1 rounded h-fit">{t.status_pengiriman}</span></div>)}</div></div><div className="bg-white rounded-xl border p-4"><h3 className="font-semibold text-sm mb-3">🔍 Progress Dapur - Bahan & HPP Live</h3><div className="space-y-3">{produksi.map((p,i)=><div key={i}><div className="flex justify-between text-xs"><span>{p.nama_menu}</span><span>{p.manpower} orang • {p.jam_mulai}-{p.jam_selesai_estimasi} • {p.progress}%</span></div><div className="w-full bg-slate-100 h-2 rounded-full mt-1"><div className={`h-2 rounded-full ${p.progress===100?'bg-green-500':'bg-orange-400'}`} style={{width:`${p.progress}%`}}></div></div></div>)}</div></div></div><div className="space-y-4"><div className="bg-white rounded-xl border p-3"><h4 className="text-xs font-bold">📦 Bahan & HPP</h4><div className="text-[11px] mt-2 text-slate-500">HPP otomatis dari Master Menu & Bahan + calculations.js</div></div></div></div></div>)
}

// ================= DAPUR V6 - MASTER MENU & BAHAN SYNC + DROPDOWN =================
function DashboardDapurV6({ profile, company }) {
  const [tab, setTab] = useState('hari_ini')
  const [masterMenu, setMasterMenu] = useState([
    { id:1, nama: 'Ayam Bakar Madu', bahan: 'Ayam 20kg, Madu 2L, Bumbu Bakar 1kg', hpp: 12500, porsi_default: 100 },
    { id:2, nama: 'Sambal Goreng Ati Balado', bahan: 'Ati 10kg, Cabai 2kg, Bawang 1kg', hpp: 8200, porsi_default: 100 },
    { id:3, nama: 'Tumis Capcay Seafood', bahan: 'Mix Sayur 15kg, Seafood 5kg, Saus 1L', hpp: 9500, porsi_default: 100 },
    { id:4, nama: 'Rendang Daging', bahan: 'Daging 15kg, Santan 5L, Bumbu Rendang 2kg', hpp: 15000, porsi_default: 100 },
  ])
  const [batch, setBatch] = useState([
    { id:1, tanggal:'2026-09-15', nama: 'Ayam Bakar Madu (200 Porsi)', menu_id:1, porsi:200, manpower:4, jam_mulai:'05:00', jam_selesai:'08:30', progress:75, status:'Proses Masak', bahan:'Ayam 20kg, Madu 2L, Bumbu Bakar 1kg' },
    { id:2, tanggal:'2026-09-15', nama: 'Sambal Goreng Ati Balado (150 Porsi)', menu_id:2, porsi:150, manpower:3, jam_mulai:'06:00', jam_selesai:'09:00', progress:100, status:'Selesai', bahan:'Ati 10kg, Cabai 2kg' },
  ])
  const [form, setForm] = useState({ tanggal: new Date().toISOString().split('T')[0], menu_id: '', nama: '', porsi: 100, manpower: 2, jam_mulai:'05:00', jam_selesai:'08:00', bahan:'' })
  const [lowStock, setLowStock] = useState([]); const [manpowerTotal, setManpowerTotal] = useState(9); const [now, setNow] = useState(new Date()); const router = useRouter()
  const namaPerusahaan = company?.nama || profile?.perusahaan || 'SIKITCHEN-MRH'; const logoPerusahaan = company?.logo

  useEffect(()=>{
    fetchMasterMenu(); fetchDapur()
    const channel = supabase.channel('dapur-v6').on('postgres_changes', { event: '*', schema: 'public', table: 'produksi_batch' }, fetchDapur).on('postgres_changes', { event: '*', schema: 'public', table: 'menus' }, fetchMasterMenu).subscribe()
    const id=setInterval(()=>setNow(new Date()),60000)
    return ()=>{ clearInterval(id); supabase.removeChannel(channel) }
  }, [])

  async function fetchMasterMenu(){
    const perusahaan = profile?.perusahaan || namaPerusahaan
    try {
      const { data: menus } = await supabase.from('menus').select('*').eq('perusahaan', perusahaan)
      if(menus?.length){
        // Map menus to masterMenu with bahan dari kolom bahan / description / resep
        setMasterMenu(menus.map(m=>({ id:m.id, nama:m.nama_menu||m.nama, bahan:m.bahan||m.resep||m.deskripsi||'Bahan dari inventory', hpp:m.hpp||0, porsi_default:m.porsi_default||100 })))
      }
    } catch(e){}
  }

  async function fetchDapur(){
    const perusahaan = profile?.perusahaan || namaPerusahaan
    const { data: low } = await supabase.from('inventory_items').select('*').eq('perusahaan', perusahaan).lt('stok', 10).limit(6)
    setLowStock(low || [{nama_bahan:'Box Bento 20x20', stok:25, satuan:'Pcs'}])
    const { data: batchDb } = await supabase.from('produksi_batch').select('*').eq('perusahaan', perusahaan).order('tanggal')
    if(batchDb?.length) setBatch(batchDb.map(b=>({ id:b.id, tanggal:b.tanggal, nama:b.nama_menu, menu_id:b.menu_id, porsi:b.porsi, manpower:b.manpower, jam_mulai:b.jam_mulai, jam_selesai:b.jam_selesai_estimasi, progress:b.progress, status:b.status, bahan:b.catatan })))
  }

  function handleMenuChange(menuId){
    const selected = masterMenu.find(m=> String(m.id)===String(menuId))
    if(selected){
      // Auto hitung bahan untuk porsi form.porsi: misal default 100 porsi = bahan X, kalau 200 porsi = x2 (simplified)
      const multiplier = form.porsi / (selected.porsi_default || 100)
      const bahanAuto = selected.bahan + ` (untuk ${form.porsi} Porsi - auto dari Master Menu & Bahan)`
      setForm({ ...form, menu_id: menuId, nama: selected.nama, bahan: bahanAuto })
    } else {
      setForm({ ...form, menu_id: '', nama: '', bahan: '' })
    }
  }

  function handlePorsiChange(newPorsi){
    // Re-calc bahan when porsi changes if menu selected
    if(form.menu_id){
      const selected = masterMenu.find(m=> String(m.id)===String(form.menu_id))
      if(selected){
        const bahanAuto = selected.bahan + ` (untuk ${newPorsi} Porsi - ${newPorsi}x auto)`
        setForm({ ...form, porsi: newPorsi, bahan: bahanAuto })
        return
      }
    }
    setForm({ ...form, porsi: newPorsi })
  }

  function filteredBatch(){
    const today = new Date().toISOString().split('T')[0]
    if(tab==='hari_ini') return batch.filter(b=>b.tanggal===today || b.tanggal==='2026-09-15')
    if(tab==='minggu'){ const weekLater = new Date(); weekLater.setDate(weekLater.getDate()+7); return batch.filter(b=> new Date(b.tanggal) <= weekLater) }
    return batch
  }

  async function tambahRencana(e){
    e.preventDefault()
    if(!form.menu_id) return alert('Pilih Nama Menu dari dropdown Master Menu & Bahan')
    if(!form.nama.trim()) return alert('Nama Menu wajib')
    const newItem = { id: Date.now(), tanggal: form.tanggal, nama: `${form.nama} (${form.porsi} Porsi)`, menu_id: form.menu_id, porsi: form.porsi, manpower: form.manpower, jam_mulai: form.jam_mulai, jam_selesai: form.jam_selesai, progress:0, status:'Menunggu', bahan: form.bahan }
    setBatch([...batch, newItem])
    try { await supabase.from('produksi_batch').insert({ perusahaan: profile?.perusahaan || namaPerusahaan, tanggal: form.tanggal, menu_id: form.menu_id, nama_menu: `${form.nama} (${form.porsi} Porsi)`, porsi: form.porsi, manpower: form.manpower, jam_mulai: form.jam_mulai, jam_selesai_estimasi: form.jam_selesai, progress:0, status:'Menunggu', catatan: form.bahan }) } catch(err){}
    setForm({ tanggal: form.tanggal, menu_id: '', nama:'', porsi:100, manpower:2, jam_mulai:'05:00', jam_selesai:'08:00', bahan:'' })
    alert(`Rencana ${newItem.nama} ditambah - Bahan auto dari Master Menu & Bahan - Owner bisa lihat!`)
  }

  function updateProgress(id, newProgress){
    const updated = batch.map(b=> b.id===id ? { ...b, progress: newProgress, status: newProgress===100 ? 'Selesai' : newProgress>=50 ? 'Proses Masak' : 'Menunggu' } : b)
    setBatch(updated)
    const item = updated.find(b=>b.id===id)
    supabase.from('produksi_batch').upsert({ id: id, perusahaan: profile?.perusahaan || namaPerusahaan, tanggal: item.tanggal, menu_id: item.menu_id, nama_menu: item.nama, porsi: item.porsi, manpower: item.manpower, jam_mulai: item.jam_mulai, jam_selesai_estimasi: item.jam_selesai, progress: newProgress, status: item.status, catatan: item.bahan }, { onConflict: 'id' }).then(()=>{})
  }
  function mulaiMasak(id){
    const nowStr = new Date().toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})
    const updated = batch.map(b=> b.id===id ? { ...b, jam_mulai: nowStr, progress: 10, status: 'Proses Masak' } : b)
    setBatch(updated)
    const item = updated.find(b=>b.id===id)
    supabase.from('produksi_batch').upsert({ id: id, perusahaan: profile?.perusahaan || namaPerusahaan, tanggal: item.tanggal, menu_id: item.menu_id, nama_menu: item.nama, porsi: item.porsi, manpower: item.manpower, jam_mulai: nowStr, jam_selesai_estimasi: item.jam_selesai, progress: 10, status: 'Proses Masak', catatan: item.bahan }, { onConflict: 'id' }).then(()=>{})
  }

  return (
    <div className="space-y-4 bg-[#FFF8F0] -m-6 p-6">
      <div className="bg-[#0A1931] text-white rounded-xl p-4 flex justify-between items-center"><div className="flex items-center gap-3">{logoPerusahaan ? <img src={logoPerusahaan} className="w-10 h-10 bg-white rounded-lg p-1 object-contain" /> : <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">👨‍🍳</div>}<div><h1 className="text-lg font-bold">Performance Catering - {namaPerusahaan} | KEPALA DAPUR</h1><p className="text-xs text-white/60">Batch {tab==='hari_ini' ? 'Hari Ini' : tab==='minggu' ? 'Minggu Ini (7 Hari)' : '2 Minggu (14 Hari)'} | {now.toLocaleDateString('id-ID')} | Manpower: {manpowerTotal} Orang | Sync Master Menu & Bahan</p></div></div><button onClick={()=>{localStorage.removeItem('sikitchen_session'); router.push('/login')}} className="text-xs bg-red-500 px-3 py-1 rounded-full">Logout</button></div>

      <div className="bg-white rounded-xl border shadow-sm p-4">
        <div className="flex justify-between items-center mb-3"><h3 className="font-bold text-sm">📅 Rencana Produksi - Planning | Master Menu & Bahan Sync</h3><div className="flex gap-2"><button onClick={()=>setTab('hari_ini')} className={`text-xs px-3 py-1.5 rounded-full ${tab==='hari_ini'?'bg-[#0A1931] text-white':'bg-slate-100'}`}>Hari Ini</button><button onClick={()=>setTab('minggu')} className={`text-xs px-3 py-1.5 rounded-full ${tab==='minggu'?'bg-[#0A1931] text-white':'bg-slate-100'}`}>1 Minggu (7 Hari)</button><button onClick={()=>setTab('dua_minggu')} className={`text-xs px-3 py-1.5 rounded-full ${tab==='dua_minggu'?'bg-[#0A1931] text-white':'bg-slate-100'}`}>2 Minggu (14 Hari) Optional</button><div className="flex items-center gap-1 ml-2"><span className="text-xs">Manpower Total:</span><input type="number" value={manpowerTotal} onChange={e=>setManpowerTotal(Number(e.target.value))} className="w-14 border rounded px-1 py-1 text-center text-xs" /><span className="text-xs">orang</span></div></div></div>
        
        <form onSubmit={tambahRencana} className="bg-slate-50 p-4 rounded-xl border">
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-2"><label className="text-[11px] font-bold text-slate-700 mb-1 block">[Tanggal]</label><input type="date" value={form.tanggal} onChange={e=>setForm({...form, tanggal:e.target.value})} className="w-full border p-2.5 rounded-lg text-xs bg-white" required /></div>
            <div className="col-span-3"><label className="text-[11px] font-bold text-slate-700 mb-1 block">[Nama Menu] - Dropdown Master Menu & Bahan</label><select value={form.menu_id} onChange={e=>handleMenuChange(e.target.value)} className="w-full border p-2.5 rounded-lg text-xs bg-white font-semibold" required><option value="">-- Pilih Menu dari Master --</option>{masterMenu.map(m=><option key={m.id} value={m.id}>{m.nama} - HPP Rp {m.hpp}</option>)}</select><div className="text-[10px] text-green-600 mt-1">✅ Sync dari Master Menu & Bahan (sidebar) - Tidak ketik manual!</div></div>
            <div className="col-span-1"><label className="text-[11px] font-bold text-slate-700 mb-1 block">[Porsi]</label><input type="number" value={form.porsi} onChange={e=>handlePorsiChange(Number(e.target.value))} className="w-full border p-2.5 rounded-lg text-xs bg-white text-center" /></div>
            <div className="col-span-1"><label className="text-[11px] font-bold text-slate-700 mb-1 block">[Manpower]</label><input type="number" value={form.manpower} onChange={e=>setForm({...form, manpower:Number(e.target.value)})} className="w-full border p-2.5 rounded-lg text-xs bg-white text-center" /></div>
            <div className="col-span-2"><label className="text-[11px] font-bold text-slate-700 mb-1 block">[Jam Mulai - Estimasi Selesai]</label><div className="flex gap-1"><input type="time" value={form.jam_mulai} onChange={e=>setForm({...form, jam_mulai:e.target.value})} className="w-1/2 border p-2.5 rounded-lg text-xs bg-white" /><input type="time" value={form.jam_selesai} onChange={e=>setForm({...form, jam_selesai:e.target.value})} className="w-1/2 border p-2.5 rounded-lg text-xs bg-white" /></div></div>
            <div className="col-span-2"><label className="text-[11px] font-bold text-slate-700 mb-1 block">[Bahan] - Auto dari Master Menu</label><input value={form.bahan} onChange={e=>setForm({...form, bahan:e.target.value})} placeholder="Auto isi dari Master Menu & Bahan" className="w-full border p-2.5 rounded-lg text-xs bg-white" /><div className="text-[10px] text-blue-600 mt-1">🔄 Auto sync - Edit jika perlu</div></div>
            <div className="col-span-1 flex justify-end"><button className="w-full bg-[#0A1931] text-white rounded-lg text-xs font-bold py-2.5 px-4 hover:bg-black">+ Tambah Rencana</button></div>
          </div>
        </form>

        <div className="space-y-3 mt-4">
          {filteredBatch().map((b)=>(
            <div key={b.id} className="border-2 rounded-xl p-3 bg-slate-50">
              <div className="flex justify-between mb-1"><div><span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{b.tanggal}</span><span className="font-bold text-sm ml-2">{b.nama}</span><span className="text-[11px] text-slate-500 ml-2">{b.porsi} Porsi | 👥 {b.manpower} orang | 🕐 {b.jam_mulai} - Estimasi {b.jam_selesai} | ⏱ {b.progress}% | Bahan: {b.bahan}</span></div><span className={`text-[11px] px-2 py-1 rounded-full font-bold ${b.progress===100?'bg-green-100 text-green-700':b.progress>=50?'bg-orange-100 text-orange-700':'bg-slate-200'}`}>{b.status}</span></div>
              <div className="w-full bg-slate-200 h-2 rounded-full mb-2"><div className={`h-2 rounded-full ${b.progress===100?'bg-green-500':'bg-orange-500'}`} style={{width:`${b.progress}%`}}></div></div>
              <div className="flex gap-2"><button onClick={()=>mulaiMasak(b.id)} className="text-[11px] bg-[#0A1931] text-white px-3 py-1.5 rounded-lg">▶️ Mulai Masak (Reset {b.jam_mulai})</button><div className="flex items-center gap-1 bg-white border rounded-lg px-2"><span className="text-[11px]">Progress:</span><input type="range" min="0" max="100" step="5" value={b.progress} onChange={e=>updateProgress(b.id, Number(e.target.value))} className="w-16" /><span className="text-[11px] font-bold w-6">{b.progress}%</span></div><button onClick={()=>updateProgress(b.id,100)} className="text-[11px] bg-green-600 text-white px-3 py-1.5 rounded-lg">✅ Selesai 100% ({new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})})</button><button className="text-[11px] bg-orange-100 px-3 py-1.5 rounded-lg">📦 Pakai Stok</button></div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4"><div className="bg-white rounded-xl border p-4"><h4 className="font-bold text-sm">📦 Stok Real-time &lt;10</h4><div className="text-xs mt-2">{lowStock.map((s,i)=><div key={i} className="flex justify-between border-b py-1"><span>{s.nama_bahan}</span><span className="text-red-600">{s.stok} {s.satuan}</span></div>)}</div><Link href="/inventory" className="text-[11px] text-blue-600 mt-2 block">Lihat Inventori →</Link></div><div className="bg-white rounded-xl border p-4"><h4 className="font-bold text-sm">📦 Bahan & HPP</h4><p className="text-[11px] text-slate-500">Auto calculations.js - dari Master Menu & Bahan (bukan Resep)</p><Link href="/menus" className="text-[11px] bg-[#D4AF37] px-3 py-1 rounded block text-center mt-2 font-bold">Lihat Master Menu & Bahan →</Link></div></div>
    </div>
  )
}

// ================= DELIVERY V6 - KAMERA AKTIF + SYNC =================
function DashboardDeliveryV6({ profile, company }) {
  const [orders, setOrders] = useState([
    { id:1, jam:'11:30 WIB', tanggal:'2026-09-15', judul:'Makan Siang PT Synapse (150 Box Standard + 5 Veggie)', alamat:'Gedung Jaya Lt.4, Jl. Sudirman', kurir:'Pak Joko', status:'Di Jalan', foto: null },
  ])
  const [uploadingId, setUploadingId] = useState(null); const [now, setNow] = useState(new Date()); const router = useRouter()
  const namaPerusahaan = company?.nama || profile?.perusahaan || 'SIKITCHEN-MRH'; const logoPerusahaan = company?.logo
  useEffect(()=>{ const id=setInterval(()=>setNow(new Date()),60000); fetchDelivery(); return ()=>clearInterval(id) }, [])
  async function fetchDelivery(){
    const perusahaan = profile?.perusahaan || namaPerusahaan
    const { data } = await supabase.from('orders').select('*').eq('perusahaan', perusahaan).order('jam_kirim')
    if(data?.length) setOrders(data.map(o=>({ id:o.id, jam:o.jam_kirim||'11:30 WIB', tanggal:o.tanggal, judul:o.judul||o.nama_acara||'Order', alamat:o.alamat, kurir:o.kurir, status:o.status_pengiriman||o.status||'Diproses', foto:o.foto_bukti_url||o.foto_bukti })))
  }
  function updateStatus(id, newStatus){
    setOrders(orders.map(o=> o.id===id ? { ...o, status: newStatus } : o))
    supabase.from('orders').update({ status_pengiriman: newStatus, status: newStatus, updated_at: new Date().toISOString() }).eq('id', id).then(()=>{})
  }
  async function handleFotoUpload(e, orderId){
    const file = e.target.files[0]; if(!file) return; setUploadingId(orderId)
    const reader = new FileReader(); reader.onload = async () => {
      const base64 = reader.result; setOrders(orders.map(o=> o.id===orderId ? { ...o, foto: base64 } : o))
      try { await supabase.from('orders').update({ foto_bukti_url: base64, status_pengiriman: 'Selesai', status: 'Selesai' }).eq('id', orderId); alert(`Foto bukti order ${orderId} berhasil - Owner & Admin bisa lihat real-time!`) } catch(err){} setUploadingId(null)
    }; reader.readAsDataURL(file)
  }
  return (
    <div className="space-y-4 bg-[#F0FFF4] -m-6 p-6">
      <div className="bg-[#0A1931] text-white rounded-xl p-4 flex justify-between items-center"><div className="flex items-center gap-3">{logoPerusahaan ? <img src={logoPerusahaan} className="w-10 h-10 bg-white rounded-lg p-1 object-contain" /> : <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">🚚</div>}<div><h1 className="text-lg font-bold">Performance Catering - {namaPerusahaan} | DELIVERY</h1><p className="text-xs text-white/60">Timeline Hari Ini | {now.toLocaleDateString('id-ID')} | {orders.length} Order | Driver klik tombol → Owner/Admin Live | Bahan & HPP Sync</p></div></div><div className="flex items-center gap-2"><span className="text-[11px] bg-green-500/20 text-green-300 px-3 py-1 rounded-full">🚚 {orders.filter(o=>o.status==='Di Jalan').length} Di Jalan</span><button onClick={()=>{localStorage.removeItem('sikitchen_session'); router.push('/login')}} className="text-xs bg-red-500 px-3 py-1 rounded-full">Logout</button></div></div>
      <div className="bg-white rounded-xl border shadow-sm p-4"><h3 className="font-bold text-sm mb-4">📦 Timeline Pengiriman - Diproses → Dikemas → Di Jalan → Selesai → CLOSED + 📸 Foto Bukti (Kamera Aktif)</h3><div className="space-y-4">{orders.map((o)=>(<div key={o.id} className="border-2 rounded-xl p-4"><div className="flex gap-4"><div className="text-center"><div className="text-xs font-bold bg-[#0A1931] text-white px-2 py-1 rounded">{o.jam}</div><div className="mt-2 w-3 h-3 bg-orange-400 rounded-full mx-auto"></div><div className="text-[10px] text-slate-400 mt-1">{o.tanggal}</div></div><div className="flex-1"><div className="font-bold text-sm">{o.judul}</div><div className="text-xs text-slate-500 mt-1">📍 {o.alamat} | Kurir: {o.kurir}</div><div className="mt-3 flex gap-2 flex-wrap">{['Diproses','Dikemas','Di Jalan','Selesai','CLOSED'].map((s)=>(<button key={s} onClick={()=>updateStatus(o.id, s)} className={`text-[11px] px-3 py-1.5 rounded-full border font-semibold ${o.status===s ? 'bg-[#0A1931] text-white border-[#0A1931]' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>{s}{o.status===s && ' ✓'}</button>))}</div><div className="mt-2 text-[11px] text-slate-400">💡 Driver klik tombol sesuai progress → auto sync Owner & Admin real-time</div></div><div className="text-right"><span className={`text-xs px-3 py-1 rounded-full font-bold ${o.status==='Di Jalan' ? 'bg-blue-100 text-blue-700' : o.status==='Selesai' ? 'bg-green-100 text-green-700' : o.status==='CLOSED' ? 'bg-slate-800 text-white' : 'bg-yellow-100 text-yellow-700'}`}>{o.status}</span><div className="mt-3"><label className="text-[11px] bg-slate-100 px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 justify-center border hover:bg-slate-200"><span>📸</span> {uploadingId===o.id ? 'Uploading...' : 'Foto Bukti (Kamera)'}<input type="file" accept="image/*" capture="environment" onChange={(e)=>handleFotoUpload(e, o.id)} className="hidden" /></label>{o.foto && <div className="mt-2"><img src={o.foto} alt="Bukti" className="w-32 h-24 object-cover rounded-lg border" /><div className="text-[10px] text-green-600 mt-1">✅ Foto terupload</div></div>}</div></div></div></div>))}</div></div>
      <div className="bg-white rounded-xl border p-3 text-[11px] text-slate-600"><div className="font-bold">Flow V6 - Master Menu & Bahan Sync:</div>1. Admin input Master Menu & Bahan (Nama Menu + Bahan + HPP) → 2. Kepala Dapur pilih Dropdown Nama Menu (sync dari Master) → Bahan auto isi → Porsi x Bahan → Mulai Masak + Progress → Selesai 100% → Pakai Stok → 3. Delivery: Driver klik progress + 📸 Foto → Owner & Admin live! ✅ Tanpa Uang Masuk</div>
    </div>
  )
}

function KategoriManagerV6() {
  const [kats, setKats] = useState([]); const [nama, setNama] = useState('')
  useEffect(()=>{ load() },[]); async function load(){ const { data } = await supabase.from('kategori_bahan').select('*').order('nama'); setKats(data||[]) }
  async function add(e){ e.preventDefault(); if(!nama.trim()) return; const { error } = await supabase.from('kategori_bahan').insert({ nama: nama.trim() }); if(!error){ setNama(''); load() } }
  async function del(id, namaK){ if(!confirm(`Hapus kategori "${namaK}"?`)) return; const { error } = await supabase.from('kategori_bahan').delete().eq('id', id); if(!error) load(); }
  return (<div><form onSubmit={add} className="flex gap-2 mb-3"><input className="flex-1 border p-2.5 rounded-lg text-sm" placeholder="Nama kategori baru" value={nama} onChange={e=>setNama(e.target.value)} required /><button className="bg-[#0A1931] text-white px-4 py-2 rounded-lg text-sm">+ Tambah Kategori</button></form><div className="flex flex-wrap gap-2">{kats.map(k=>(<span key={k.id} className="bg-slate-100 px-3 py-1.5 rounded-full text-xs flex items-center gap-2 border">{k.nama}<button onClick={()=>del(k.id, k.nama)} className="bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center">×</button></span>))}</div></div>)
}
function UserManagerV6({ perusahaan }) {
  const [users, setUsers] = useState([]); const [form, setForm] = useState({ username: '', password_plain: '', role: 'admin', nama_lengkap: '' })
  useEffect(()=>{ load() },[]); async function load(){ const { data } = await supabase.from('profiles').select('*').order('username'); setUsers(data||[]) }
  async function add(e){ e.preventDefault(); const { error } = await supabase.from('profiles').insert({ username: form.username, password_plain: form.password_plain, role: form.role, nama_lengkap: form.nama_lengkap, perusahaan: perusahaan||'SIKITCHEN-MRH' }); if(!error){ setForm({ username: '', password_plain: '', role: 'admin', nama_lengkap: '' }); load() } }
  return (<div><form onSubmit={add} className="grid grid-cols-2 gap-2 mb-3"><input className="border p-2 rounded-lg text-sm" placeholder="Username" value={form.username} onChange={e=>setForm({...form, username: e.target.value})} required /><input className="border p-2 rounded-lg text-sm" placeholder="Password" value={form.password_plain} onChange={e=>setForm({...form, password_plain: e.target.value})} required /><select className="border p-2 rounded-lg text-sm" value={form.role} onChange={e=>setForm({...form, role: e.target.value})}><option value="admin">Admin</option><option value="owner">Owner</option><option value="kepala_dapur">Kepala Dapur</option><option value="delivery">Delivery</option></select><input className="border p-2 rounded-lg text-sm" placeholder="Nama Lengkap" value={form.nama_lengkap} onChange={e=>setForm({...form, nama_lengkap: e.target.value})} /><button className="col-span-2 bg-[#D4AF37] text-[#0A1931] font-bold py-2.5 rounded-lg text-sm">+ Tambah User General</button></form><div className="text-xs space-y-1">{users.map(u=><div key={u.id} className="flex justify-between border-b py-1"><span>{u.username} - {u.role}</span><span className="text-slate-400">{u.perusahaan}</span></div>)}</div></div>)
}
