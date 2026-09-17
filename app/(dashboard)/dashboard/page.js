"use client"
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function DashboardAdmin(){
  const router = useRouter()
  const fileRef = useRef(null)
  const [stats,setStats]=useState({bahan:16, menu:1, totalBahan:1, users:5, orders:1, closed:1})
  const [company,setCompany]=useState('SIKITCHEN-MRH')
  const [alamat,setAlamat]=useState('Jl. Catering No.1, Bandung')
  const [logoPreview,setLogoPreview]=useState('')
  const [showPerf,setShowPerf]=useState(false)

  useEffect(()=>{
    // CLEAN CORRUPTED DATA - fix bug nama perusahaan jadi base64 panjang
    const rawCompany = localStorage.getItem('sikitchen_company')||''
    const rawLogo = localStorage.getItem('sikitchen_logo')||''
    // Kalau company isinya base64 panjang ( >100 char atau ada data:image atau iVBORw0KGgo), reset
    if(rawCompany.length>100 || rawCompany.includes('data:image') || rawCompany.includes('iVBORw') || rawCompany.includes('UeNZv')){
      console.log('Corrupted company detected, resetting...')
      localStorage.removeItem('sikitchen_company')
      setCompany('SIKITCHEN-MRH')
    } else if(rawCompany){
      setCompany(rawCompany.slice(0,50)) // max 50 char
    }
    if(rawLogo && rawLogo.length>10){
      setLogoPreview(rawLogo)
    }
    const savedAlamat = localStorage.getItem('sikitchen_alamat')
    if(savedAlamat && savedAlamat.length<200) setAlamat(savedAlamat)

    async function load(){
      const [inv, menus, orders] = await Promise.all([
        supabase.from('inventory_items').select('id',{count:'exact', head:true}),
        supabase.from('menus').select('id',{count:'exact', head:true}),
        supabase.from('orders').select('status')
      ])
      setStats({
        bahan: inv.count||16,
        menu: menus.count||1,
        totalBahan: menus.count||1,
        users: 5,
        orders: orders.data?.filter(o=>o.status!=='CLOSED').length||1,
        closed: orders.data?.filter(o=>o.status==='CLOSED').length||1
      })
    }
    load()
  },[])

  function handleLogoChange(e){
    const file = e.target.files?.[0]
    if(!file) return
    if(file.size>2*1024*1024){ alert('File max 2MB Bos!'); return }
    const reader = new FileReader()
    reader.onload = (ev)=>{
      const base64 = ev.target.result as string
      // FIX: Hanya save ke logo, jangan ke company!
      setLogoPreview(base64)
      localStorage.setItem('sikitchen_logo', base64)
    }
    reader.readAsDataURL(file)
  }

  function handleSimpan(){
    // Validasi - pastikan company bukan base64
    const cleanName = company.trim().slice(0,50).replace(/[^a-zA-Z0-9 \-]/g,'') || 'SIKITCHEN-MRH'
    const cleanAlamat = alamat.trim().slice(0,100)
    
    if(cleanName.length>50){ alert('Nama perusahaan max 50 huruf Bos!'); return }
    if(cleanName.includes('data:') || cleanName.includes('base64') || cleanName.length>80){
      alert('Nama perusahaan tidak boleh base64! Reset otomatis')
      setCompany('SIKITCHEN-MRH')
      localStorage.setItem('sikitchen_company','SIKITCHEN-MRH')
      return
    }

    localStorage.setItem('sikitchen_company', cleanName)
    localStorage.setItem('sikitchen_alamat', cleanAlamat)
    setCompany(cleanName)
    alert(`✅ Disimpan!\nPerusahaan: ${cleanName}\nAlamat: ${cleanAlamat}`)
  }

  function handleReset(){
    if(!confirm('Reset nama perusahaan yang panjang itu?')) return
    localStorage.removeItem('sikitchen_company')
    localStorage.removeItem('sikitchen_alamat')
    localStorage.removeItem('sikitchen_logo')
    setCompany('SIKITCHEN-MRH')
    setAlamat('Jl. Catering No.1, Bandung')
    setLogoPreview('')
    alert('✅ Sudah direset jadi SIKITCHEN-MRH')
  }

  function handleLogout(){
    document.cookie = 'sikitchen_role=; path=/; max-age=0'
    document.cookie = 'sikitchen_user=; path=/; max-age=0'
    localStorage.removeItem('sikitchen_role')
    localStorage.removeItem('sikitchen_user')
    router.push('/login')
  }

  const cards = [
    { title:'Bahan Baku', value:stats.bahan, sub:'Lihat Inventori →', href:'/inventory', bg:'bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300', icon:'📦', iconBg:'bg-blue-500', accent:'bg-blue-600' },
    { title:'Master Menu & Bahan', value:stats.menu, sub:'Kelola Menu & Bahan →', href:'/menus', bg:'bg-gradient-to-br from-orange-100 to-orange-200 border-orange-300', icon:'🍱', iconBg:'bg-orange-500', accent:'bg-orange-500' },
    { title:'Total Bahan', value:stats.totalBahan, sub:'HPP otomatis calculations.js', href:'/menus', bg:'bg-gradient-to-br from-purple-100 to-purple-200 border-purple-300', icon:'🧮', iconBg:'bg-purple-500', accent:'bg-purple-600' },
    { title:'User General', value:stats.users, sub:'admin, dapur, delivery', href:'#', bg:'bg-gradient-to-br from-emerald-100 to-emerald-200 border-emerald-300', icon:'👥', iconBg:'bg-emerald-500', accent:'bg-emerald-600' },
    { title:'Order Aktif', value:stats.orders, sub:'Kalkulator Order →', href:'/calculator', bg:'bg-gradient-to-br from-yellow-100 to-amber-200 border-yellow-400', icon:'🧾', iconBg:'bg-yellow-500', accent:'bg-yellow-600' },
    { title:'Order CLOSED', value:stats.closed, sub:'Termonitor Admin & Owner', href:'/delivery', bg:'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 text-white', icon:'✅', iconBg:'bg-white', accent:'bg-white', textWhite:true },
  ]

  return (
    <div className="p-4 md:p-7 space-y-6 bg-slate-50 min-h-screen" style={{fontFamily:'Inter, Arial, sans-serif', fontSize:'15px'}}>
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">
        <div><div className="font-black text-[24px]">Dashboard Admin</div><div className="text-[14px] font-bold text-slate-600">SIKITCHEN-MRH | ADMIN • Font +2px • Fix Corrupt</div></div>
        <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-full text-[13px] font-black shadow">Logout</button>
      </div>

      <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-sm">
        <div className="font-black text-[16px] mb-5">🏢 Pengaturan Perusahaan - Fix Nama Panjang</div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-[12px] mb-4">
          ⚠️ Bug sebelumnya: Nama perusahaan kesimpan base64 panjang. Klik <b>Reset Perusahaan</b> di bawah untuk hapus, atau file baru ini otomatis reset kalau deteksi base64.
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="text-[13px] font-black mb-2">Logo Perusahaan</div>
            <div className="border-2 border-dashed border-slate-300 rounded-3xl p-6 flex flex-col items-center gap-4 bg-slate-50">
              <div className="w-28 h-20 bg-white rounded-2xl flex items-center justify-center border-2 shadow-inner overflow-hidden">
                {logoPreview ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover"/> : <span className="font-black text-blue-900 text-[16px]">MRH</span>}
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleLogoChange} className="hidden"/>
              <button onClick={()=>fileRef.current?.click()} className="border-2 border-slate-300 px-5 py-2 rounded-xl text-[13px] bg-white font-bold hover:bg-slate-100">📁 Choose File</button>
              <span className="text-[11px] text-slate-500">PNG/JPG Max 2MB</span>
            </div>
          </div>
          <div className="space-y-4">
            <div><div className="text-[13px] font-black mb-1.5">Nama Perusahaan (Max 50 huruf)</div><input value={company} onChange={e=>setCompany(e.target.value.slice(0,50))} className="w-full border-2 rounded-xl px-4 py-3 text-[14px] font-bold focus:border-blue-400 outline-none" placeholder="SIKITCHEN-MRH" maxLength={50}/><div className="text-[11px] text-slate-500 mt-1">{company.length}/50 huruf</div></div>
            <div><div className="text-[13px] font-black mb-1.5">Alamat Perusahaan</div><textarea value={alamat} onChange={e=>setAlamat(e.target.value.slice(0,100))} className="w-full border-2 rounded-xl px-4 py-3 text-[14px] focus:border-blue-400 outline-none" rows={2} placeholder="Jl. Catering No.1 Bandung" maxLength={100}/><div className="text-[11px] text-slate-500">{alamat.length}/100</div></div>
            <button onClick={()=>setShowPerf(true)} className="w-full bg-[#0A1931] text-white rounded-xl px-4 py-3.5 text-[14px] font-black hover:bg-black shadow-lg">📊 Performance - {company.slice(0,30)}</button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleSimpan} className="bg-yellow-400 hover:bg-yellow-500 text-black font-black py-3.5 rounded-xl text-[14px] shadow">💾 Simpan</button>
              <button onClick={handleReset} className="bg-red-100 border-2 border-red-300 text-red-700 font-black py-3.5 rounded-xl text-[13px]">🗑️ Reset Perusahaan</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {cards.map((c,i)=>(
          <Link key={i} href={c.href} className={`${c.bg} rounded-3xl p-5 shadow-md border-2 hover:shadow-xl transition-all hover:scale-[1.02] ${c.textWhite?'':'text-slate-800'}`}>
            <div className="flex justify-between items-start"><div><div className={`text-[13px] font-bold ${c.textWhite?'text-slate-300':'text-slate-600'}`}>{c.title}</div><div className="font-black text-[28px] mt-1">{c.value}</div><div className={`text-[12px] font-bold mt-2 ${c.textWhite?'text-yellow-300':'text-blue-700'}`}>{c.sub}</div></div><div className={`w-12 h-12 rounded-2xl ${c.iconBg} flex items-center justify-center text-[22px] shadow-lg border-2 border-white/50`}>{c.icon}</div></div>
            <div className="mt-4 h-2 bg-white/60 rounded-full"><div className={`h-full ${c.accent} w-[75%] rounded-full`}></div></div>
          </Link>
        ))}
      </div>

      {showPerf && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={()=>setShowPerf(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="font-black text-[18px] mb-2">📊 Performance - {company.slice(0,30)}</div>
            <div className="text-[12px] text-slate-500 mb-4">{alamat}</div>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between bg-slate-50 p-3 rounded-xl"><span>Bahan Baku</span><b>{stats.bahan}</b></div>
              <div className="flex justify-between bg-black text-white p-3 rounded-xl"><span>Order CLOSED</span><b>{stats.closed} ✅</b></div>
            </div>
            <button onClick={()=>setShowPerf(false)} className="w-full mt-4 bg-[#0A1931] text-white py-3 rounded-xl font-black">Tutup</button>
          </div>
        </div>
      )}
    </div>
  )
}
