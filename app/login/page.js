"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function LoginGeneralPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [perusahaan, setPerusahaan] = useState('SIKITCHEN')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const router = useRouter()

  useEffect(() => {
    // cek sudah login
    const saved = localStorage.getItem('sikitchen_session')
    if (saved) {
      router.push('/dashboard')
    }
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      // LOGIN GENERAL - tanpa email, cek di profiles table langsung
      const { data, error } = await supabase.from('profiles').select('*').eq('username', username).eq('password_plain', password).single()
      
      if (error || !data) {
        setMsg('Username atau password salah! Coba: admin/admin123, owner/owner123, dapur/dapur123, delivery/delivery123')
        setLoading(false)
        return
      }

      // Simpan session di localStorage (general, bukan supabase auth)
      localStorage.setItem('sikitchen_session', JSON.stringify({
        id: data.id,
        username: data.username,
        role: data.role,
        nama_lengkap: data.nama_lengkap,
        email: data.email,
        perusahaan: data.perusahaan || perusahaan,
        login_at: new Date().toISOString()
      }))

      router.push('/dashboard')
    } catch (err) {
      setMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleBuatAkunGeneral() {
    setLoading(true)
    setMsg('Membuat 4 akun general...')
    // Insert 4 akun general via SQL - sudah ada file tahap3_general_login.sql tapi kita coba via client juga
    const accounts = [
      { username: 'admin', password_plain: 'admin123', role: 'admin', nama_lengkap: 'Admin', email: 'admin@sikitchen.local' },
      { username: 'owner', password_plain: 'owner123', role: 'owner', nama_lengkap: 'Owner', email: 'owner@sikitchen.local' },
      { username: 'dapur', password_plain: 'dapur123', role: 'kepala_dapur', nama_lengkap: 'Kepala Dapur', email: 'dapur@sikitchen.local' },
      { username: 'delivery', password_plain: 'delivery123', role: 'delivery', nama_lengkap: 'Kurir Delivery', email: 'delivery@sikitchen.local' },
    ]
    
    for (const acc of accounts) {
      const { error } = await supabase.from('profiles').upsert({
        username: acc.username,
        password_plain: acc.password_plain,
        role: acc.role,
        nama_lengkap: acc.nama_lengkap,
        email: acc.email,
        perusahaan: perusahaan
      }, { onConflict: 'username' })
    }
    
    setLoading(false)
    setMsg('4 akun general dibuat! Login: admin/admin123, owner/owner123, dapur/dapur123, delivery/delivery123 - Tidak pakai email!')
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-navy">SIKITCHEN - Login General</h1>
        <p className="text-sm text-slate-500 mb-1">Tahap 3 - 4 Role - Tanpa Email (Multi Perusahaan)</p>
        <p className="text-[11px] text-slate-400 mb-6">Login pakai username saja - bisa dipakai banyak perusahaan</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-slate-500">Perusahaan / Cabang</label>
            <input className="w-full border p-3 rounded-xl mt-1" placeholder="Nama perusahaan - misal SIKITCHEN, CATERING A, dll" value={perusahaan} onChange={e=>setPerusahaan(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500">Username</label>
            <input className="w-full border p-3 rounded-xl mt-1" placeholder="Username - misal admin, owner, dapur, delivery" value={username} onChange={e=>setUsername(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs text-slate-500">Password</label>
            <input className="w-full border p-3 rounded-xl mt-1" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-navy text-white py-3 rounded-xl font-semibold">{loading?'Loading...':'Login'}</button>
        </form>

        {msg && <div className="mt-4 p-3 bg-slate-100 rounded-xl text-xs text-slate-700 whitespace-pre-line">{msg}</div>}

        <div className="mt-6 border-t pt-4">
          <p className="text-xs text-slate-500 mb-2">Belum ada akun general? Buat 4 akun:</p>
          <button onClick={handleBuatAkunGeneral} disabled={loading} className="w-full bg-gold text-navy py-2 rounded-xl text-sm font-semibold">Buat 4 Akun General (Username)</button>
          <div className="mt-3 text-[11px] text-slate-500 space-y-1 bg-slate-50 p-3 rounded-xl">
            <div className="font-semibold">Akun General (Tanpa Email):</div>
            <div><b>admin</b> / admin123 - Full CRUD + Kelola Kategori</div>
            <div><b>owner</b> / owner123 - Monitoring + Approve Harga + Profit</div>
            <div><b>dapur</b> / dapur123 - Produksi + Resep + Pakai Stok</div>
            <div><b>delivery</b> / delivery123 - Diproses→Dikemas→Dikirim→CLOSED</div>
            <div className="mt-2 text-[10px]">Bisa tambah user baru di Dashboard Admin nanti!</div>
          </div>
        </div>
      </div>
    </div>
  )
}
