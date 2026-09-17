"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function DashboardAdmin(){
  const [stats,setStats]=useState({bahan:0, menu:0, totalBahan:0, users:0, orders:0, closed:0})
  const [company,setCompany]=useState('SIKITCHEN-MRH')

  useEffect(()=>{
    async function load(){
      const [inv, menus, users, orders] = await Promise.all([
        supabase.from('inventory_items').select('id',{count:'exact', head:true}),
        supabase.from('menus').select('id',{count:'exact', head:true}),
        supabase.from('profiles').select('id',{count:'exact', head:true}),
        supabase.from('orders').select('status')
      ])
      setStats({
        bahan: inv.count||3,
        menu: menus.count||0,
        totalBahan: menus.count||0,
        users: users.count||5,
        orders: orders.data?.length||0,
        closed: orders.data?.filter(o=>o.status==='CLOSED').length||0
      })
    }
    load()
  },[])

  const cards = [
    { title:'Bahan Baku', value:stats.bahan, sub:'Lihat Inventori →', href:'/inventory', color:'border-blue-500', bg:'bg-blue-50', dot:'bg-blue-500', icon:'📦' },
    { title:'Master Menu & Bahan', value:stats.menu, sub:'Kelola Menu & Bahan →', href:'/menus', color:'border-orange-500', bg:'bg-orange-50', dot:'bg-orange-500', icon:'🍱' },
    { title:'Total Bahan', value:stats.totalBahan, sub:'HPP otomatis calculations.js', href:'/menus', color:'border-purple-500', bg:'bg-purple-50', dot:'bg-purple-500', icon:'🧮' },
    { title:'User General', value:stats.users, sub:'admin, dapur, delivery', href:'#', color:'border-emerald-500', bg:'bg-emerald-50', dot:'bg-emerald-500', icon:'👥' },
    { title:'Order Aktif', value:stats.orders, sub:'Kalkulator Order →', href:'/calculator', color:'border-yellow-500', bg:'bg-yellow-50', dot:'bg-yellow-500', icon:'🧾' },
    { title:'Order CLOSED', value:stats.closed, sub:'Termonitor Admin & Owner', href:'/delivery', color:'border-black', bg:'bg-slate-100', dot:'bg-black', icon:'✅' },
  ]

  return (
    <div className="p-3 md:p-6 space-y-5 bg-slate-50 min-h-screen" style={{fontFamily:'Inter, Arial, sans-serif'}}>
      <div className="flex justify-between items-center">
        <div><div className="font-black text-[22px]">Dashboard Admin</div><div className="text-[12px] font-bold tracking-wider text-slate-600">SIKITCHEN-MRH | ADMIN</div></div>
        <button className="bg-red-500 text-white px-4 py-1.5 rounded-full text-[11px] font-bold">Logout</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="font-bold text-[14px] mb-4 flex items-center gap-2">🏢 Pengaturan Perusahaan</div>
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <div className="text-[11px] font-bold mb-2">Logo</div>
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center gap-3 bg-slate-50">
              <div className="w-24 h-16 bg-white rounded-xl flex items-center justify-center border"><span className="font-black text-blue-900">MRH</span></div>
              <button className="border px-3 py-1 rounded text-[11px] bg-white">Choose File</button>
              <span className="text-[10px] text-slate-400">PNG/JPG</span>
            </div>
          </div>
          <div className="space-y-3">
            <div><div className="text-[11px] font-bold mb-1">Nama Perusahaan</div><input value={company} onChange={e=>setCompany(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-[13px]"/></div>
            <div className="bg-[#0A1931] text-white rounded-xl px-4 py-3 text-[13px] font-bold flex items-center gap-2">📊 Performance Catering - SIKITCHEN-MRH</div>
            <button className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2.5 rounded-xl text-[13px]">💾 Simpan</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((c,i)=>(
          <Link key={i} href={c.href} className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 ${c.color} border-t border-r border-b border-slate-200 hover:shadow-md transition group`}>
            <div className="flex justify-between items-start">
              <div><div className="text-[11px] text-slate-500">{c.title}</div><div className="font-black text-[22px] mt-1">{c.value}</div><div className="text-[11px] text-blue-600 mt-2 group-hover:underline">{c.sub}</div></div>
              <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center text-[18px]`}>{c.icon}</div>
            </div>
            <div className="mt-3 flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${c.dot}`}></div><div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${c.dot} w-[70%]`}></div></div></div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="font-bold text-[13px]">Kelola Kategori Bahan (Dinamis)</div>
          <div className="text-[11px] text-slate-400">Kategori ini jadi dropdown di Inventori & Master Menu & Bahan</div>
          <div className="mt-3 flex gap-2"><input placeholder="Nama kategori baru" className="flex-1 border rounded-xl px-3 py-2 text-[12px]"/><button className="bg-[#0A1931] text-white px-4 py-2 rounded-xl text-[12px]">+ Tambah Kategori</button></div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="font-bold text-[13px]">Kelola User General</div>
          <div className="mt-3 grid grid-cols-2 gap-2"><input placeholder="Username" className="border rounded-xl px-3 py-2 text-[12px]"/><input placeholder="Password" className="border rounded-xl px-3 py-2 text-[12px]"/></div>
        </div>
      </div>
    </div>
  )
}
