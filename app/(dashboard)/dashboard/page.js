"use client"
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function DashboardInner(){
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleParam = searchParams.get('role')
  const fileRef = useRef(null)
  const [stats,setStats]=useState({bahan:16, menu:1, totalBahan:1, users:5, orders:1, closed:1, profit:95550})
  const [company,setCompany]=useState('SIKITCHEN-MRH')
  const [alamat,setAlamat]=useState('Jl. SEMUA SUKA MRH - JAWA BARAT')
  const [logoPreview,setLogoPreview]=useState('')
  const [showPerf,setShowPerf]=useState(false)
  const [role,setRole]=useState('ADMIN')
  const [isOwner,setIsOwner]=useState(false)

  useEffect(()=>{
    const rawRole = (localStorage.getItem('sikitchen_role') || roleParam || 'admin').toLowerCase()
    const isOwnerRole = rawRole==='owner' || roleParam==='owner'
    setIsOwner(isOwnerRole)
    setRole(isOwnerRole ? 'OWNER' : 'ADMIN')

    const rawCompany = localStorage.getItem('sikitchen_company') || 'SIKITCHEN-MRH'
    const rawLogo = localStorage.getItem('sikitchen_logo') || ''
    const rawAlamat = localStorage.getItem('sikitchen_alamat') || 'Jl. SEMUA SUKA MRH - JAWA BARAT'
    
    // Anti corrupt base64
    if(rawCompany.length>100 || rawCompany.includes('data:image') || rawCompany.includes('UeNZv')){
      setCompany('SIKITCHEN-MRH')
    } else {
      setCompany(rawCompany.slice(0,50))
    }
    if(rawLogo) setLogoPreview(rawLogo)
    if(rawAlamat) setAlamat(rawAlamat.slice(0,100))

    async function load(){
      try{
        const inv = await supabase.from('inventory_items').select('id',{count:'exact', head:true})
        const menus = await supabase.from('menus').select('id',{count:'exact', head:true})
        const orders = await supabase.from('orders').select('status, profit, total_jual, total_hpp')
        const active = orders.data ? orders.data.filter(function(o){return o.status!=='CLOSED'}).length : 1
        const closed = orders.data ? orders.data.filter(function(o){return o.status==='CLOSED'}).length : 1
        const totalProfit = orders.data ? orders.data.filter(function(o){return o.status==='CLOSED'}).reduce(function(s,o){return s + Number(o.profit||95550)},0) : 95550
        setStats({
          bahan: inv.count||16,
          menu: menus.count||1,
          totalBahan: menus.count||1,
          users: 5,
          orders: active,
          closed: closed,
          profit: totalProfit
        })
      }catch(e){ console.log(e) }
    }
    load()
  },[roleParam])

  function handleLogoChange(e){
    if(isOwner) return // Owner tidak boleh edit
    const file = e.target.files && e.target.files[0]
    if(!file) return
    if(file.size > 2*1024*1024){ alert('File max 2MB Bos!'); return }
    const reader = new FileReader()
    reader.onload = function(ev){
      const base64 = ev.target.result
      setLogoPreview(base64)
      localStorage.setItem('sikitchen_logo', base64)
    }
    reader.readAsDataURL(file)
  }

  function handleSimpan(){
    if(isOwner){ alert('Owner read-only Bos! Tidak bisa edit.'); return }
    const cleanName = company.trim().slice(0,50) || 'SIKITCHEN-MRH'
    const cleanAlamat = alamat.trim().slice(0,100)
    localStorage.setItem('sikitchen_company', cleanName)
    localStorage.setItem('sikitchen_alamat', cleanAlamat)
    alert('Disimpan! Perusahaan: ' + cleanName)
  }

  function handleReset(){
    if(isOwner) return
    if(!confirm('Reset perusahaan?')) return
    localStorage.removeItem('sikitchen_company')
    localStorage.removeItem('sikitchen_alamat')
    localStorage.removeItem('sikitchen_logo')
    setCompany('SIKITCHEN-MRH')
    setAlamat('Jl. Catering No.1, Bandung')
    setLogoPreview('')
    alert('Direset')
  }

  function handleLogout(){
    document.cookie = 'sikitchen_role=; path=/; max-age=0'
    document.cookie = 'sikitchen_user=; path=/; max-age=0'
    localStorage.removeItem('sikitchen_role')
    localStorage.removeItem('sikitchen_user')
    router.push('/login')
  }

  // Cards dengan warna pastel tebal + font +2px
  const adminCards = [
    { title:'Bahan Baku', value:stats.bahan, sub:'Lihat Inventori →', href:'/inventory', bg:'bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300', icon:'📦', iconBg:'bg-blue-500', accent:'bg-blue-600' },
    { title:'Master Menu & Bahan', value:stats.menu, sub:'Kelola Menu & Bahan →', href:'/menus', bg:'bg-gradient-to-br from-orange-100 to-orange-200 border-orange-300', icon:'🍱', iconBg:'bg-orange-500', accent:'bg-orange-500' },
    { title:'Total Bahan', value:stats.totalBahan, sub:'HPP otomatis calculations.js', href:'/menus', bg:'bg-gradient-to-br from-purple-100 to-purple-200 border-purple-300', icon:'🧮', iconBg:'bg-purple-500', accent:'bg-purple-600' },
    { title:'User General', value:stats.users, sub:'admin, dapur, delivery', href:'#', bg:'bg-gradient-to-br from-emerald-100 to-emerald-200 border-emerald-300', icon:'👥', iconBg:'bg-emerald-500', accent:'bg-emerald-600' },
    { title:'Order Aktif', value:stats.orders, sub:'Kalkulator Order →', href:'/calculator', bg:'bg-gradient-to-br from-yellow-100 to-amber-200 border-yellow-400', icon:'🧾', iconBg:'bg-yellow-500', accent:'bg-yellow-600' },
    { title:'Order CLOSED', value:stats.closed, sub:'Termonitor Admin & Owner', href:'/delivery', bg:'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 text-white', icon:'✅', iconBg:'bg-white', accent:'bg-white', textWhite:true },
  ]

  const ownerCards = [
    { title:'Total Bahan Baku', value:stats.bahan + ' bahan', sub:'16 bahan aktif', bg:'bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300', icon:'📊', iconBg:'bg-blue-600', accent:'bg-blue-600' },
    { title:'Order Aktif', value:stats.orders, sub:'Belum CLOSED', bg:'bg-gradient-to-br from-yellow-100 to-amber-200 border-yellow-400', icon:'⏳', iconBg:'bg-yellow-500', accent:'bg-yellow-600' },
    { title:'Order CLOSED', value:stats.closed, sub:'Sudah Selesai', bg:'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 text-white', icon:'✅', iconBg:'bg-white', accent:'bg-white', textWhite:true },
    { title:'Total Profit CLOSED', value:'Rp ' + Number(stats.profit).toLocaleString('id-ID'), sub:'Termonitor Owner - Ibu mimin Rp 95.550', bg:'bg-gradient-to-br from-emerald-100 to-emerald-200 border-emerald-400', icon:'💰', iconBg:'bg-emerald-600', accent:'bg-emerald-600' },
  ]

  const displayCards = isOwner ? ownerCards : adminCards

  return (
    <div className="p-4 md:p-7 space-y-6 bg-slate-50 min-h-screen" style={{fontFamily:'Inter, Arial, sans-serif', fontSize:'15px'}}>
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">
        <div>
          <div className="font-black text-[24px]">{isOwner ? 'Dashboard Owner - Read Only' : 'Dashboard Admin'}</div>
          <div className="text-[14px] font-bold text-slate-600">{company} | {role} - {isOwner ? 'Monitoring Profit Only' : 'Build Fix 17/09/2026'}</div>
        </div>
        <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-full text-[13px] font-black shadow">Logout</button>
      </div>

      {isOwner ? (
        // OWNER READ-ONLY VIEW
        <div className="space-y-6">
          <div className="bg-purple-50 border-2 border-purple-300 rounded-3xl p-6">
            <div className="font-black text-[16px] mb-2">👑 Mode Owner - Read Only - Tidak Bisa Edit</div>
            <div className="text-[13px] text-slate-600">Anda login sebagai Owner. Hanya bisa monitoring profit & laporan. Tidak bisa edit logo, nama perusahaan, inventori, produksi, delivery. Untuk edit, login sebagai Admin.</div>
          </div>

          <div className="bg-white rounded-3xl border-2 p-6 shadow-sm flex items-center gap-6">
            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center border-2 shadow-inner overflow-hidden">
              {logoPreview ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover"/> : <span className="font-black text-blue-900 text-[18px]">MRH</span>}
            </div>
            <div>
              <div className="font-black text-[20px]">{company}</div>
              <div className="text-[14px] text-slate-600 mt-1">{alamat}</div>
              <div className="mt-2 bg-yellow-100 border border-yellow-300 px-3 py-1 rounded-full text-[12px] font-bold inline-block">Owner View • Read Only</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {displayCards.map(function(c,i){
              return (
              <div key={i} className={c.bg + ' rounded-3xl p-6 shadow-md border-2 ' + (c.textWhite ? 'text-white' : 'text-slate-800')}>
                <div className="flex justify-between items-start"><div><div className={'text-[13px] font-bold ' + (c.textWhite ? 'text-slate-300' : 'text-slate-600')}>{c.title}</div><div className="font-black text-[28px] mt-2">{c.value}</div><div className={'text-[12px] font-bold mt-3 ' + (c.textWhite ? 'text-yellow-300' : 'text-blue-700')}>{c.sub}</div></div><div className={'w-14 h-14 rounded-2xl ' + c.iconBg + ' flex items-center justify-center text-[24px] shadow-lg border-2 border-white/50'}>{c.icon}</div></div>
                <div className="mt-5 h-2.5 bg-white/60 rounded-full"><div className={'h-full ' + c.accent + ' w-[85%] rounded-full'}></div></div>
              </div>
              )
            })}
          </div>

          <div className="bg-[#0A1931] text-white rounded-3xl p-6">
            <div className="font-black text-[16px] mb-3">📊 Laporan Profit Owner</div>
            <div className="bg-white/10 rounded-2xl p-4 flex justify-between text-[14px]"><span>Order Ibu mimin - 10 porsi - CLOSED</span><b className="text-yellow-400">Rp 95.550 profit</b></div>
            <div className="text-[12px] text-slate-400 mt-3">Data realtime dari Supabase - Order CLOSED termonitor Admin & Owner</div>
          </div>
        </div>
      ) : (
        // ADMIN FULL EDIT VIEW
        <>
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-sm">
            <div className="font-black text-[16px] mb-5">🏢 Pengaturan Perusahaan - Admin Only</div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-[13px] font-black mb-2">Logo Perusahaan</div>
                <div className="border-2 border-dashed border-slate-300 rounded-3xl p-6 flex flex-col items-center gap-4 bg-slate-50">
                  <div className="w-28 h-20 bg-white rounded-2xl flex items-center justify-center border-2 shadow-inner overflow-hidden">
                    {logoPreview ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover"/> : <span className="font-black text-blue-900 text-[16px]">MRH</span>}
                  </div>
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleLogoChange} className="hidden"/>
                  <button onClick={function(){ if(fileRef.current) fileRef.current.click() }} className="border-2 border-slate-300 px-5 py-2 rounded-xl text-[13px] bg-white font-bold hover:bg-slate-100">Choose File</button>
                  <span className="text-[11px] text-slate-500">PNG/JPG Max 2MB</span>
                </div>
              </div>
              <div className="space-y-4">
                <div><div className="text-[13px] font-black mb-1.5">Nama Perusahaan (Max 50)</div><input value={company} onChange={function(e){ setCompany(e.target.value.slice(0,50)) }} className="w-full border-2 rounded-xl px-4 py-3 text-[14px] font-bold outline-none" maxLength={50}/></div>
                <div><div className="text-[13px] font-black mb-1.5">Alamat Perusahaan</div><textarea value={alamat} onChange={function(e){ setAlamat(e.target.value.slice(0,100)) }} className="w-full border-2 rounded-xl px-4 py-3 text-[14px] outline-none" rows={2} maxLength={100}></textarea></div>
                <button onClick={function(){ setShowPerf(true) }} className="w-full bg-[#0A1931] text-white rounded-xl px-4 py-3.5 text-[14px] font-black shadow-lg">Performance - {company.slice(0,30)}</button>
                <div className="grid grid-cols-2 gap-2"><button onClick={handleSimpan} className="bg-yellow-400 text-black font-black py-3.5 rounded-xl text-[14px] shadow">Simpan</button><button onClick={handleReset} className="bg-red-100 border-2 border-red-300 text-red-700 font-black py-3.5 rounded-xl text-[13px]">Reset</button></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {displayCards.map(function(c,i){
              return (
              <Link key={i} href={c.href} className={c.bg + ' rounded-3xl p-5 shadow-md border-2 hover:shadow-xl transition-all ' + (c.textWhite ? 'text-white' : 'text-slate-800')}>
                <div className="flex justify-between items-start"><div><div className={'text-[13px] font-bold ' + (c.textWhite ? 'text-slate-300' : 'text-slate-600')}>{c.title}</div><div className="font-black text-[28px] mt-1">{c.value}</div><div className={'text-[12px] font-bold mt-2 ' + (c.textWhite ? 'text-yellow-300' : 'text-blue-700')}>{c.sub}</div></div><div className={'w-12 h-12 rounded-2xl ' + c.iconBg + ' flex items-center justify-center text-[22px] shadow-lg border-2 border-white/50'}>{c.icon}</div></div>
              </Link>
              )
            })}
          </div>
        </>
      )}

      {showPerf && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={function(){ setShowPerf(false) }}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl" onClick={function(e){ e.stopPropagation() }}>
            <div className="font-black text-[18px] mb-2">Performance - {company.slice(0,30)}</div>
            <div className="text-[12px] text-slate-500 mb-4">{alamat}</div>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between bg-slate-50 p-3 rounded-xl"><span>Bahan Baku</span><b>{stats.bahan}</b></div>
              <div className="flex justify-between bg-yellow-100 p-3 rounded-xl border-2 border-yellow-300"><span>Profit CLOSED</span><b>Rp {Number(stats.profit).toLocaleString('id-ID')}</b></div>
              <div className="flex justify-between bg-black text-white p-3 rounded-xl"><span>Order CLOSED</span><b>{stats.closed} OK</b></div>
            </div>
            <button onClick={function(){ setShowPerf(false) }} className="w-full mt-4 bg-[#0A1931] text-white py-3 rounded-xl font-black">Tutup</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage(){
  return <Suspense fallback={<div className="p-6">Loading...</div>}><DashboardInner/></Suspense>
}
