"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ROLES, getSession } from '@/lib/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function DashboardRBACGeneral() {
  const [stats, setStats] = useState({ inventory: 0, menus: 0, recipes: 0, profit: 34500000, pricePending: 0 })
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const sess = getSession()
      if (!sess) { router.push('/login'); return }
      setProfile(sess)
      
      const { count: inv } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true })
      const { count: men } = await supabase.from('menus').select('*', { count: 'exact', head: true })
      const { count: rec } = await supabase.from('recipes').select('*', { count: 'exact', head: true })
      const { count: pending } = await supabase.from('price_history').select('*', { count: 'exact', head: true }).gte('changed_at', new Date(Date.now()-7*24*3600*1000).toISOString())
      const { data: orders } = await supabase.from('orders').select('profit')
      const profit = orders?.reduce((s,o)=>s+Number(o.profit||0),0) || 34500000
      
      setStats({ inventory: inv||0, menus: men||0, recipes: rec||0, profit, pricePending: pending||0 })
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return <div className="p-6">Loading Dashboard General...</div>

  const role = profile?.role
  const roleInfo = ROLES[role]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Dashboard {roleInfo?.label} - Tahap 3 RBAC General</h1>
          <p className="text-sm text-slate-500">{profile?.perusahaan} | {profile?.username} - {roleInfo?.desc} | Login tanpa email (multi-perusahaan)</p>
        </div>
        <button onClick={()=>{localStorage.removeItem('sikitchen_session'); router.push('/login')}} className="text-xs bg-red-500 text-white px-3 py-1 rounded-full">Logout</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border"><div className="text-xs text-slate-500">Bahan Baku</div><div className="text-2xl font-bold">{stats.inventory}</div><Link href="/inventory" className="text-xs text-blue-600">Lihat Inventori →</Link></div>
        <div className="bg-white p-4 rounded-xl border"><div className="text-xs text-slate-500">Master Menu</div><div className="text-2xl font-bold">{stats.menus}</div><Link href="/menus" className="text-xs text-blue-600">Kelola Menu →</Link></div>
        <div className="bg-white p-4 rounded-xl border"><div className="text-xs text-slate-500">Total Resep</div><div className="text-2xl font-bold">{stats.recipes}</div><div className="text-xs text-slate-400">HPP otomatis</div></div>
        
        {(role==='owner' || role==='admin') && (
          <div className="bg-navy text-white p-4 rounded-xl border"><div className="text-xs text-white/60">Profit Bersih (Owner)</div><div className="text-2xl font-bold text-gold-light">Rp {(stats.profit/1000000).toFixed(1)}jt</div><div className="text-xs text-white/60">Approve Harga: {stats.pricePending} pending</div></div>
        )}
        {role==='kepala_dapur' && (
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-200"><div className="text-xs text-slate-500">Akses Dapur</div><div className="text-sm font-bold">Produksi + Resep + Pakai Stok</div><Link href="/produksi" className="text-xs text-orange-600">Ke Produksi →</Link></div>
        )}
        {role==='delivery' && (
          <div className="bg-green-50 p-4 rounded-xl border border-green-200"><div className="text-xs text-slate-500">Akses Delivery</div><div className="text-sm font-bold">Diproses → Dikemas → Dikirim → CLOSED</div><Link href="/delivery" className="text-xs text-green-600">Ke Delivery →</Link></div>
        )}
      </div>

      {(role==='admin') && (
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <h3 className="font-semibold mb-2">Admin - Kelola Kategori Bahan (Dinamis) + User General</h3>
          <p className="text-xs text-slate-500 mb-3">Tambah kategori baru - otomatis muncul di dropdown Inventory. Kelola user tanpa email untuk multi-perusahaan.</p>
          <KategoriManagerInline />
          <UserManagerInline />
        </div>
      )}

      {(role==='owner' || role==='admin') && (
        <div className="bg-white p-4 rounded-xl border">
          <h3 className="font-semibold">Owner - Approve Harga & Monitoring</h3>
          <PriceApproval />
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border">
        <h3 className="font-semibold">Tahap 3 RBAC General - Status ✅ (Tanpa Email)</h3>
        <ul className="text-sm list-disc pl-5 mt-2 text-slate-600">
          <li>Login: {profile?.username} - Role: {role} - {roleInfo?.label}</li>
          <li>Perusahaan: {profile?.perusahaan} - Bisa multi-perusahaan</li>
          <li>Admin: Full CRUD + Kelola Kategori + Kelola User (username saja)</li>
          <li>Owner: Monitoring + Approve Harga + Profit Rp {(stats.profit/1000000).toFixed(1)}jt</li>
          <li>Kepala Dapur: Produksi + Resep + Pakai Stok</li>
          <li>Delivery: Diproses → Dikemas → Dikirim → CLOSED</li>
        </ul>
      </div>
    </div>
  )
}

function KategoriManagerInline() {
  const [kats, setKats] = useState([])
  const [nama, setNama] = useState('')
  useEffect(()=>{ load() },[])
  async function load(){ const { data } = await supabase.from('kategori_bahan').select('*').order('nama'); setKats(data||[]) }
  async function add(e){
    e.preventDefault()
    const { error } = await supabase.from('kategori_bahan').insert({ nama })
    if(!error){ setNama(''); load() } else alert(error.message)
  }
  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold mb-2">Kategori Bahan</h4>
      <form onSubmit={add} className="flex gap-2 mb-3">
        <input className="flex-1 border p-2 rounded-lg text-sm" placeholder="Nama kategori baru - misal Frozen Food" value={nama} onChange={e=>setNama(e.target.value)} required />
        <button className="bg-navy text-white px-4 py-2 rounded-lg text-sm">+ Tambah Kategori</button>
      </form>
      <div className="flex flex-wrap gap-2">
        {kats.map(k=><span key={k.id} className="bg-slate-100 px-3 py-1 rounded-full text-xs">{k.nama}</span>)}
      </div>
    </div>
  )
}

function UserManagerInline() {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ username: '', password_plain: '', role: 'admin', nama_lengkap: '' })
  useEffect(()=>{ load() },[])
  async function load(){ const { data } = await supabase.from('profiles').select('*').order('username'); setUsers(data||[]) }
  async function add(e){
    e.preventDefault()
    const { error } = await supabase.from('profiles').insert({ username: form.username, password_plain: form.password_plain, role: form.role, nama_lengkap: form.nama_lengkap, perusahaan: 'SIKITCHEN' })
    if(!error){ setForm({ username: '', password_plain: '', role: 'admin', nama_lengkap: '' }); load() } else alert(error.message)
  }
  return (
    <div>
      <h4 className="text-sm font-semibold mb-2">Kelola User General (Username Tanpa Email)</h4>
      <form onSubmit={add} className="grid grid-cols-4 gap-2 mb-3">
        <input className="border p-2 rounded-lg text-sm" placeholder="Username" value={form.username} onChange={e=>setForm({...form, username: e.target.value})} required />
        <input className="border p-2 rounded-lg text-sm" placeholder="Password" value={form.password_plain} onChange={e=>setForm({...form, password_plain: e.target.value})} required />
        <select className="border p-2 rounded-lg text-sm" value={form.role} onChange={e=>setForm({...form, role: e.target.value})}>
          <option value="admin">Admin</option><option value="owner">Owner</option><option value="kepala_dapur">Kepala Dapur</option><option value="delivery">Delivery</option>
        </select>
        <input className="border p-2 rounded-lg text-sm" placeholder="Nama Lengkap" value={form.nama_lengkap} onChange={e=>setForm({...form, nama_lengkap: e.target.value})} />
        <button className="col-span-4 bg-gold text-navy font-semibold py-2 rounded-lg text-sm">+ Tambah User General</button>
      </form>
      <div className="text-xs space-y-1">
        {users.map(u=><div key={u.id} className="flex justify-between border-b py-1"><span>{u.username} - {u.role} - {u.nama_lengkap}</span><span className="text-slate-400">{u.perusahaan}</span></div>)}
      </div>
    </div>
  )
}

function PriceApproval() {
  const [history, setHistory] = useState([])
  useEffect(()=>{ (async()=>{
    const { data } = await supabase.from('price_history').select('*, inventory_items(nama_bahan)').order('changed_at', {ascending:false}).limit(5)
    setHistory(data||[])
  })() },[])
  return (
    <div className="mt-2 text-xs space-y-2">
      {history.length===0 ? <div className="text-slate-400">Belum ada perubahan harga</div> :
        history.map(h=>(
          <div key={h.id} className="flex justify-between border-b py-1">
            <span>{h.inventory_items?.nama_bahan} - Rp {Number(h.harga_lama).toLocaleString('id-ID')} → Rp {Number(h.harga_baru).toLocaleString('id-ID')}</span>
            <span className="text-slate-400">{new Date(h.changed_at).toLocaleDateString('id-ID')}</span>
          </div>
        ))
      }
    </div>
  )
}
