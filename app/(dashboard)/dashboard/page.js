"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ROLES, getSession } from '@/lib/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function DashboardMain() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const sess = getSession()
    if (!sess) { router.push('/login'); return }
    setProfile(sess)
    setLoading(false)
  }, [router])

  if (loading) return <div className="p-6">Loading Dashboard...</div>
  
  const role = profile?.role

  if (role === 'owner') return <DashboardOwnerBlueprint profile={profile} />
  if (role === 'admin') return <DashboardAdmin profile={profile} />
  if (role === 'kepala_dapur') return <DashboardDapur profile={profile} />
  if (role === 'delivery' || role === 'kurir') return <DashboardDelivery profile={profile} />
  
  return <DashboardAdmin profile={profile} />
}

// ================= ADMIN - LOCKED & FIXED =================
function DashboardAdmin({ profile }) {
  const [stats, setStats] = useState({ inventory: 3, menus: 0, recipes: 0, users: 5 })
  const [lowStock, setLowStock] = useState([])
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const perusahaan = profile?.perusahaan || 'SIKITCHEN-MRH'
      const { count: inv } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true }).eq('perusahaan', perusahaan)
      const { count: men } = await supabase.from('menus').select('*', { count: 'exact', head: true }).eq('perusahaan', perusahaan)
      const { count: usr } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('perusahaan', perusahaan)
      const { data: low } = await supabase.from('inventory_items').select('*').eq('perusahaan', perusahaan).lt('stok', 10).limit(5)
      setStats({ inventory: inv||3, menus: men||0, recipes: 0, users: usr||5 })
      setLowStock(low||[])
    }
    init()
  }, [profile])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold">Dashboard Admin</h1><p className="text-sm font-semibold tracking-wider">SIKITCHEN-MRH | ADMIN</p></div>
        <button onClick={()=>{localStorage.removeItem('sikitchen_session'); router.push('/login')}} className="text-xs bg-red-500 text-white px-3 py-1 rounded-full">Logout</button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border"><div className="text-xs text-slate-500">Bahan Baku</div><div className="text-2xl font-bold">{stats.inventory}</div><Link href="/inventory" className="text-xs text-blue-600">Lihat Inventori →</Link></div>
        <div className="bg-white p-4 rounded-xl border"><div className="text-xs text-slate-500">Master Menu</div><div className="text-2xl font-bold">{stats.menus}</div><Link href="/menus" className="text-xs text-blue-600">Kelola Menu →</Link></div>
        <div className="bg-white p-4 rounded-xl border"><div className="text-xs text-slate-500">Total Resep</div><div className="text-2xl font-bold">{stats.recipes}</div><div className="text-xs text-slate-400">HPP otomatis</div></div>
        <div className="bg-white p-4 rounded-xl border"><div className="text-xs text-slate-500">User General</div><div className="text-2xl font-bold">{stats.users}</div><div className="text-xs text-slate-400">admin, dapur, delivery</div></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-xl border"><h3 className="font-semibold mb-1">Kelola Kategori Bahan (Dinamis)</h3><p className="text-[11px] text-slate-400 mb-3">Tambah / hapus kategori - otomatis di dropdown Inventory</p><KategoriManager /></div>
        <div className="bg-white p-4 rounded-xl border"><h3 className="font-semibold mb-1">Kelola User General (Username Tanpa Email)</h3><UserManager perusahaan={profile?.perusahaan} /></div>
      </div>
    </div>
  )
}

// ================= OWNER - BLUEPRINT ADAPTASI REAL-TIME =================
function DashboardOwnerBlueprint({ profile }) {
  const [kpi, setKpi] = useState({ porsi: 450, pengiriman: 3, masuk: 12.5, tagihan: 3.2 })
  const [timeline, setTimeline] = useState([])
  const [produksi, setProduksi] = useState([])
  const [stokKritis, setStokKritis] = useState([])
  const [diet, setDiet] = useState([])
  const [tagihan, setTagihan] = useState([])
  const [now, setNow] = useState(new Date())
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(()=>setNow(new Date()), 60000)
    fetchOwnerData()
    const interval = setInterval(fetchOwnerData, 30000) // Auto-update 30s - cepat
    // Real-time Supabase channel
    const channel = supabase.channel('owner-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOwnerData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, fetchOwnerData)
      .subscribe()
    return ()=>{ clearInterval(id); clearInterval(interval); supabase.removeChannel(channel) }
  }, [])

  async function fetchOwnerData() {
    const perusahaan = profile?.perusahaan || 'SIKITCHEN-MRH'
    try {
      // KPI dari Supabase dengan fallback blueprint
      const { data: ordersToday } = await supabase.from('orders').select('*').eq('perusahaan', perusahaan).eq('tanggal', new Date().toISOString().split('T')[0])
      const { data: low } = await supabase.from('inventory_items').select('*').eq('perusahaan', perusahaan).lt('stok', 10).limit(5)
      const { data: pendingTagihan } = await supabase.from('orders').select('*').eq('perusahaan', perusahaan).eq('status_bayar', 'pending').limit(5)
      
      const totalPorsi = ordersToday?.reduce((s,o)=>s+Number(o.jumlah_porsi||0),0) || 450
      const diJalan = ordersToday?.filter(o=>o.status_pengiriman==='Di Jalan').length || 3
      const uangMasuk = ordersToday?.filter(o=>o.status_bayar==='lunas').reduce((s,o)=>s+Number(o.total||0),0) / 1000000 || 12.5
      const sisaTagihan = pendingTagihan?.reduce((s,o)=>s+Number(o.sisa||0),0) / 1000000 || 3.2

      setKpi({ porsi: totalPorsi, pengiriman: diJalan, masuk: uangMasuk, tagihan: sisaTagihan })
      setTimeline(ordersToday?.slice(0,3) || [
        { jam: '11:30 WIB', judul: 'Makan Siang PT Synapse (150 Box Standard + 5 Veggie)', lokasi: 'Gedung Jaya Lt.4, Jl. Sudirman - Kurir: Pak Joko (0812 xxxx)', status: 'Di Jalan' },
        { jam: '15:00 WIB', judul: 'Syukuran Pranikahan Ibu Maya (50 Porsi Special)', lokasi: 'Komp. Buana Indah C3 - Tim Dapur 2 (Setup On Site)', status: 'Packing' }
      ])
      setProduksi([
        { nama: 'Ayam Bakar Madu (200 Porsi)', progress: 100, status: 'Selesai' },
        { nama: 'Sambal Goreng Ati Balado (150 Porsi)', progress: 75, status: 'Proses Masak' },
        { nama: 'Tumis Capcay Seafood (150 Porsi)', progress: 20, status: 'Menunggu Penggorengan' }
      ])
      setStokKritis(low || [
        { nama: 'Box Bento 20x20', sisa: 'Sisa 25 Pcs' },
        { nama: 'Daging Sapi Lulur', sisa: 'Sisa 18 Kg' },
        { nama: 'Minyak Goreng 2L', sisa: 'Sisa 6 Pouch' }
      ])
      setDiet([
        'PT Synapse: 5 Box Wajib Vegetarian (Tanpa Daging & Telur)',
        'Ibu Maya: Bebas Olahan Kacang Tanah (Alergi Berat)'
      ])
      setTagihan(pendingTagihan || [
        { nama: 'Pernikahan Dodi & Laras', nilai: 'Sisa: Rp 2.500.000' },
        { nama: 'Arisan Ibu-Ibu', nilai: 'Sisa: Rp 700.000' }
      ])
    } catch(e) { console.log('Fallback blueprint data') }
  }

  return (
    <div className="space-y-4 bg-[#F8FAFC] -m-6 p-6">
      {/* HEADER BLUEPRINT */}
      <div className="bg-[#0A1931] text-white rounded-xl p-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">🍱 CateringOS — Ringkasan Operasional & Keuangan Hari Ini</h1>
          <p className="text-xs text-white/60">{now.toLocaleDateString('id-ID', { weekday:'short', day:'numeric', month:'short', year:'numeric' })} | SIKITCHEN-MRH | OWNER</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] bg-green-500/20 text-green-300 px-3 py-1 rounded-full flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>Server Live - Real-Time Sync Enabled</span>
          <button className="bg-[#FF8C00] text-white text-xs px-4 py-2 rounded-lg font-semibold">+ Pesanan Baru</button>
          <button onClick={()=>{localStorage.removeItem('sikitchen_session'); router.push('/login')}} className="text-xs bg-red-500 px-3 py-1 rounded-full">Logout</button>
        </div>
      </div>

      {/* 4 KPI TOP - BLUEPRINT */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border-l-4 border-l-[#0A1931] shadow-sm"><div className="text-[11px] text-slate-500">TOTAL PORSI HARI INI</div><div className="text-2xl font-bold">{kpi.porsi} <span className="text-sm font-normal">Box</span></div><div className="text-[11px] text-green-600 mt-1">320 Box Selesai Packed (71%)</div></div>
        <div className="bg-white p-4 rounded-xl border-l-4 border-l-orange-400 shadow-sm"><div className="text-[11px] text-slate-500">STATUS PENGIRIMAN</div><div className="text-2xl font-bold">{kpi.pengiriman} <span className="text-sm font-normal">Di Jalan</span></div><div className="text-[11px] text-slate-500 mt-1">2 Selesai + 1 Siap Kurir</div></div>
        <div className="bg-white p-4 rounded-xl border-l-4 border-l-green-500 shadow-sm"><div className="text-[11px] text-slate-500">UANG MASUK HARI INI</div><div className="text-2xl font-bold">Rp {kpi.masuk}M</div><div className="text-[11px] text-slate-500 mt-1">DP + Pelunasan Cair Hari Ini</div></div>
        <div className="bg-white p-4 rounded-xl border-l-4 border-l-red-400 shadow-sm"><div className="text-[11px] text-slate-500">SISA TAGIHAN (PENDING)</div><div className="text-2xl font-bold">Rp {kpi.tagihan}M</div><div className="text-[11px] text-red-500 mt-1">2 Klien H-1 Belum Pelunasan</div></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* LEFT - 2/3 */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <div className="flex justify-between mb-3"><h3 className="font-semibold text-sm">📌 Antrean & Timeline Pengiriman Terdekat</h3><span className="text-[11px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Auto-Update (30s)</span></div>
            <div className="space-y-3">
              {timeline.map((t,i)=>(
                <div key={i} className="flex gap-3 border-l-4 pl-3 py-2" style={{borderColor: t.status==='Di Jalan' ? '#0A1931' : '#F59E0B'}}>
                  <div className="flex-1"><div className="text-[11px] font-bold text-[#0A1931]">JAM KIRIM: {t.jam}</div><div className="text-sm font-semibold">{t.judul}</div><div className="text-[11px] text-slate-500">📍 {t.lokasi}</div></div>
                  <span className={`text-[11px] px-2 py-1 rounded h-fit ${t.status==='Di Jalan' ? 'bg-[#0A1931] text-white' : 'bg-yellow-100 text-yellow-700'}`}>{t.status}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <h3 className="font-semibold text-sm mb-3">🔍 Progress Dapur & Masak Harian (Batch Tracker)</h3>
            <div className="space-y-3">
              {produksi.map((p,i)=>(
                <div key={i}><div className="flex justify-between text-xs mb-1"><span>{p.nama}</span><span className={`font-semibold ${p.progress===100?'text-green-600':p.progress>=50?'text-orange-600':'text-slate-500'}`}>{p.progress===100?'✅ Selesai':p.progress>=50?'👨‍🍳 Proses Masak':'⏳ Menunggu'} ({p.progress}%)</span></div><div className="w-full bg-slate-100 h-2 rounded-full"><div className={`h-2 rounded-full ${p.progress===100?'bg-green-500':p.progress>=50?'bg-orange-400':'bg-slate-300'}`} style={{width:`${p.progress}%`}}></div></div></div>
              ))}
            </div>
          </div>
        </div>
        {/* RIGHT - 1/3 */}
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3"><h4 className="text-xs font-bold text-red-700 mb-2">⚠️ Catatan Diet & Alergi Khusus</h4><ul className="text-[11px] text-red-600 space-y-1 list-disc pl-4">{diet.map((d,i)=><li key={i}>{d}</li>)}</ul></div>
          <div className="bg-white rounded-xl border shadow-sm p-3"><h4 className="text-xs font-bold mb-2">💰 Tagihan Jatuh Tempo (H-1 / H-0)</h4><div className="space-y-2">{tagihan.map((t,i)=><div key={i} className="flex justify-between items-center text-xs border-b pb-2"><div><div className="font-semibold">{t.nama}</div><div className="text-slate-500">{t.nilai}</div></div><a href={`https://wa.me/6281234567890?text=Halo ${t.nama}, tagihan ${t.nilai} jatuh tempo`} target="_blank" className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px]">Kirim WA</a></div>)}</div></div>
          <div className="bg-white rounded-xl border shadow-sm p-3"><h4 className="text-xs font-bold mb-2">📦 Stok Kritis & Belanja Besok (H+1)</h4><div className="space-y-1.5 text-[11px]">{stokKritis.map((s,i)=><div key={i} className="flex justify-between"><span>• {s.nama_bahan||s.nama}</span><span className="text-red-600 font-semibold">{s.sisa||`${s.stok} ${s.satuan}`}</span></div>)}</div></div>
          <div className="bg-white rounded-xl border shadow-sm p-3"><h4 className="text-xs font-bold mb-2">Owner - Approve Harga</h4><ApproveHargaOwner /></div>
        </div>
      </div>
    </div>
  )
}

function KategoriManager() {
  const [kats, setKats] = useState([])
  const [nama, setNama] = useState('')
  useEffect(()=>{ load() },[])
  async function load(){ const { data } = await supabase.from('kategori_bahan').select('*').order('nama'); setKats(data||[{id:1,nama:'Buah'},{id:2,nama:'Bumbu'},{id:3,nama:'Daging'},{id:4,nama:'Minuman'},{id:5,nama:'Padi-padian'},{id:6,nama:'Pendukung'},{id:7,nama:'Sayuran'},{id:8,nama:'Tepung'}]) }
  async function add(e){ e.preventDefault(); if(!nama.trim()) return; const { error } = await supabase.from('kategori_bahan').insert({ nama: nama.trim() }); if(!error){ setNama(''); load() } }
  async function del(id, namaK){ if(!confirm(`Hapus kategori "${namaK}"?`)) return; const { error } = await supabase.from('kategori_bahan').delete().eq('id', id); if(!error) load(); }
  return (<div><form onSubmit={add} className="flex gap-2 mb-3"><input className="flex-1 border p-2.5 rounded-lg text-sm" placeholder="Nama kategori baru" value={nama} onChange={e=>setNama(e.target.value)} required /><button className="bg-[#0A1931] text-white px-4 py-2 rounded-lg text-sm">+ Tambah Kategori</button></form><div className="flex flex-wrap gap-2">{kats.map(k=>(<span key={k.id} className="bg-slate-100 px-3 py-1.5 rounded-full text-xs flex items-center gap-2 border">{k.nama}<button onClick={()=>del(k.id, k.nama)} className="bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center">×</button></span>))}</div></div>)
}

function UserManager({ perusahaan }) {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ username: '', password_plain: '', role: 'admin', nama_lengkap: '' })
  useEffect(()=>{ load() },[])
  async function load(){ const { data } = await supabase.from('profiles').select('*').order('username'); setUsers(data||[]) }
  async function add(e){ e.preventDefault(); const { error } = await supabase.from('profiles').insert({ username: form.username, password_plain: form.password_plain, role: form.role, nama_lengkap: form.nama_lengkap, perusahaan: perusahaan||'SIKITCHEN-MRH' }); if(!error){ setForm({ username: '', password_plain: '', role: 'admin', nama_lengkap: '' }); load() } }
  return (<div><form onSubmit={add} className="grid grid-cols-2 gap-2 mb-3"><input className="border p-2 rounded-lg text-sm" placeholder="Username" value={form.username} onChange={e=>setForm({...form, username: e.target.value})} required /><input className="border p-2 rounded-lg text-sm" placeholder="Password" value={form.password_plain} onChange={e=>setForm({...form, password_plain: e.target.value})} required /><select className="border p-2 rounded-lg text-sm" value={form.role} onChange={e=>setForm({...form, role: e.target.value})}><option value="admin">Admin</option><option value="owner">Owner</option><option value="kepala_dapur">Kepala Dapur</option><option value="delivery">Delivery</option><option value="kurir">Kurir</option></select><input className="border p-2 rounded-lg text-sm" placeholder="Nama Lengkap" value={form.nama_lengkap} onChange={e=>setForm({...form, nama_lengkap: e.target.value})} /><button className="col-span-2 bg-[#D4AF37] text-[#0A1931] font-bold py-2.5 rounded-lg text-sm">+ Tambah User General</button></form><div className="text-xs space-y-1">{users.map(u=><div key={u.id} className="flex justify-between border-b py-1"><span>{u.username} - {u.role}</span><span className="text-slate-400">{u.perusahaan}</span></div>)}</div></div>)
}

function ApproveHargaOwner() {
  const [list, setList] = useState([{ id:1, nama:'Beras Premium', lama:12000, baru:13000 }])
  useEffect(()=>{ (async()=>{ const { data } = await supabase.from('price_history').select('*, inventory_items(nama_bahan)').order('changed_at',{ascending:false}).limit(3); if(data?.length) setList(data.map(d=>({id:d.id, nama:d.inventory_items?.nama_bahan||'Beras', lama:d.harga_lama, baru:d.harga_baru})) ) })() },[])
  return (<div className="space-y-2">{list.map(h=><div key={h.id} className="flex justify-between items-center text-[11px] border-b pb-1"><span>{h.nama}: Rp {Number(h.lama).toLocaleString()} → Rp {Number(h.baru).toLocaleString()}</span><div className="flex gap-1"><button className="bg-green-500 text-white px-2 py-0.5 rounded">✓</button><button className="bg-red-500 text-white px-2 py-0.5 rounded">✕</button></div></div>)}</div>)
}

function DashboardDapur({ profile }) {
  const router = useRouter()
  return <div className="p-4">Dapur Dashboard - {profile.perusahaan} - Produksi & Resep - coming next</div>
}
function DashboardDelivery({ profile }) {
  const router = useRouter()
  return <div className="p-4">Delivery Dashboard - {profile.perusahaan} - Status Antar - coming next</div>
}
