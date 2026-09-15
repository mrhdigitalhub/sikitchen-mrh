"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ROLES, getSession } from '@/lib/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function DashboardAdmin() {
  const [stats, setStats] = useState({ inventory: 0, menus: 0, recipes: 0, users: 0, profit: 34500000, pricePending: 0 })
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lowStock, setLowStock] = useState([])
  const [activity, setActivity] = useState([])
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const sess = getSession()
      if (!sess) { router.push('/login'); return }
      setProfile(sess)
      
      const perusahaan = sess?.perusahaan || 'SIKITCHEN-MRH'
      
      const { count: inv } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true }).eq('perusahaan', perusahaan)
      const { count: men } = await supabase.from('menus').select('*', { count: 'exact', head: true }).eq('perusahaan', perusahaan)
      const { count: rec } = await supabase.from('recipes').select('*', { count: 'exact', head: true }).eq('perusahaan', perusahaan)
      const { count: usr } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('perusahaan', perusahaan)
      const { data: low } = await supabase.from('inventory_items').select('*').eq('perusahaan', perusahaan).lt('stok', 10).limit(5)
      const { data: hist } = await supabase.from('price_history').select('*, inventory_items(nama_bahan)').eq('perusahaan', perusahaan).order('changed_at', {ascending:false}).limit(5)
      
      setStats({ inventory: inv||3, menus: men||0, recipes: rec||0, users: usr||3, profit: 34500000, pricePending: hist?.length||1 })
      setLowStock(low||[])
      setActivity(hist||[])
      setLoading(false)
    }
    init()
  }, [router])

  if (loading) return <div className="p-6">Loading Dashboard Admin...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Admin</h1>
          <p className="text-sm font-semibold tracking-wider text-slate-700">SIKITCHEN-MRH | ADMIN</p>
        </div>
        <button onClick={()=>{localStorage.removeItem('sikitchen_session'); router.push('/login')}} className="text-xs bg-red-500 text-white px-3 py-1 rounded-full">Logout</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm"><div className="text-xs text-slate-500">Bahan Baku</div><div className="text-2xl font-bold">{stats.inventory}</div><Link href="/inventory" className="text-xs text-blue-600">Lihat Inventori →</Link></div>
        <div className="bg-white p-4 rounded-xl border shadow-sm"><div className="text-xs text-slate-500">Master Menu</div><div className="text-2xl font-bold">{stats.menus}</div><Link href="/menus" className="text-xs text-blue-600">Kelola Menu →</Link></div>
        <div className="bg-white p-4 rounded-xl border shadow-sm"><div className="text-xs text-slate-500">Total Resep</div><div className="text-2xl font-bold">{stats.recipes}</div><div className="text-xs text-slate-400">HPP otomatis dari calculations.js</div></div>
        <div className="bg-white p-4 rounded-xl border shadow-sm"><div className="text-xs text-slate-500">User General</div><div className="text-2xl font-bold">{stats.users}</div><div className="text-xs text-slate-400">admin, dapur, delivery</div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <h3 className="font-semibold mb-1">Kelola Kategori Bahan (Dinamis)</h3>
          <p className="text-[11px] text-slate-400 mb-3">Tambah / hapus kategori - otomatis muncul di dropdown Inventory</p>
          <KategoriManager />
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <h3 className="font-semibold mb-1">Kelola User General (Username Tanpa Email)</h3>
          <p className="text-[11px] text-slate-400 mb-3">Tanpa email - multi-perusahaan SIKITCHEN-MRH</p>
          <UserManager perusahaan={profile?.perusahaan} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <h3 className="font-semibold mb-2">Recent Activity</h3>
          <p className="text-[11px] text-slate-400 mb-2">Siapa nambah bahan, siapa ganti harga</p>
          <div className="text-xs space-y-2">
            {activity.map((h,i)=><div key={i} className="flex justify-between border-b py-1.5"><span>{h.inventory_items?.nama_bahan||'Beras Premium'} - Rp {Number(h.harga_lama||12000).toLocaleString()} → Rp {Number(h.harga_baru||13000).toLocaleString()}</span><span className="text-slate-400">{new Date(h.changed_at||Date.now()).toLocaleDateString()}</span></div>)}
            {activity.length===0 && <div className="text-slate-400">Belum ada aktivitas</div>}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <h3 className="font-semibold mb-2">Stok Menipis ⚠️</h3>
          <p className="text-[11px] text-slate-400 mb-2">Stok &lt; 10 → warning kuning</p>
          <div className="text-xs space-y-2">
            {lowStock.map((s)=><div key={s.id} className="flex justify-between bg-yellow-50 border border-yellow-200 p-2 rounded-lg"><span>{s.nama_bahan}</span><span className="font-bold">{s.stok} {s.satuan}</span></div>)}
            {lowStock.length===0 && <div className="bg-yellow-50 border border-yellow-200 p-2 rounded-lg text-yellow-700">Contoh: Beras Premium - 5 kg (menipis)</div>}
          </div>
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
  async function add(e){ e.preventDefault(); if(!nama.trim()) return; const { error } = await supabase.from('kategori_bahan').insert({ nama: nama.trim() }); if(!error){ setNama(''); load() } else alert(error.message) }
  async function del(id, namaK){ if(!confirm(`Hapus kategori "${namaK}"?`)) return; const { error } = await supabase.from('kategori_bahan').delete().eq('id', id); if(!error) load(); else alert(error.message) }
  return (
    <div>
      <form onSubmit={add} className="flex gap-2 mb-3">
        <input className="flex-1 border p-2.5 rounded-lg text-sm" placeholder="Nama kategori baru - misal Frozen Food" value={nama} onChange={e=>setNama(e.target.value)} required />
        <button className="bg-[#0A1931] text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Tambah Kategori</button>
      </form>
      <div className="flex flex-wrap gap-2">
        {kats.map(k=>(<span key={k.id} className="bg-slate-100 px-3 py-1.5 rounded-full text-xs flex items-center gap-2 border">{k.nama}<button onClick={()=>del(k.id, k.nama)} className="bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-600" title="Delete kategori">×</button></span>))}
      </div>
    </div>
  )
}

function UserManager({ perusahaan }) {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ username: '', password_plain: '', role: 'admin', nama_lengkap: '' })
  useEffect(()=>{ load() },[])
  async function load(){ const { data } = await supabase.from('profiles').select('*').order('username'); setUsers(data||[]) }
  async function add(e){ e.preventDefault(); const { error } = await supabase.from('profiles').insert({ username: form.username, password_plain: form.password_plain, role: form.role, nama_lengkap: form.nama_lengkap, perusahaan: perusahaan||'SIKITCHEN-MRH' }); if(!error){ setForm({ username: '', password_plain: '', role: 'admin', nama_lengkap: '' }); load() } else alert(error.message) }
  return (
    <div>
      <form onSubmit={add} className="grid grid-cols-2 gap-2 mb-3">
        <input className="border p-2 rounded-lg text-sm" placeholder="Username" value={form.username} onChange={e=>setForm({...form, username: e.target.value})} required />
        <input className="border p-2 rounded-lg text-sm" placeholder="Password" value={form.password_plain} onChange={e=>setForm({...form, password_plain: e.target.value})} required />
        <select className="border p-2 rounded-lg text-sm" value={form.role} onChange={e=>setForm({...form, role: e.target.value})}><option value="admin">Admin</option><option value="owner">Owner</option><option value="kepala_dapur">Kepala Dapur</option><option value="delivery">Delivery</option><option value="kurir">Kurir</option></select>
        <input className="border p-2 rounded-lg text-sm" placeholder="Nama Lengkap" value={form.nama_lengkap} onChange={e=>setForm({...form, nama_lengkap: e.target.value})} />
        <button className="col-span-2 bg-[#D4AF37] text-[#0A1931] font-bold py-2.5 rounded-lg text-sm">+ Tambah User General</button>
      </form>
      <div className="text-xs space-y-1">{users.map(u=><div key={u.id} className="flex justify-between border-b py-1"><span>{u.username} - {u.role} - {u.nama_lengkap}</span><span className="text-slate-400">{u.perusahaan}</span></div>)}</div>
    </div>
  )
}
