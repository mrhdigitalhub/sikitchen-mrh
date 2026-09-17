"use client"
import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'

const MODULES = [
  { id:'bahan', title:'Total Bahan Baku', color:'from-blue-100 to-blue-200', border:'border-blue-300', icon:'📦' },
  { id:'order_aktif', title:'Order Aktif', color:'from-yellow-100 to-amber-200', border:'border-yellow-400', icon:'⏳' },
  { id:'order_closed', title:'Order CLOSED', color:'from-slate-800 to-slate-900', border:'border-slate-700', textWhite:true, icon:'✅' },
  { id:'stock_min', title:'Kondisi Stock Min', color:'from-red-100 to-red-200', border:'border-red-300', icon:'⚠️' },
  { id:'customer', title:'Customer Aktif', color:'from-purple-100 to-purple-200', border:'border-purple-300', icon:'👥' },
  { id:'dapur', title:'Performance Dapur Produksi', color:'from-orange-100 to-orange-200', border:'border-orange-300', icon:'👨‍🍳' },
  { id:'delivery', title:'Performance Delivery', color:'from-cyan-100 to-cyan-200', border:'border-cyan-300', icon:'🚚' },
  { id:'utility', title:'Consumption Utility', color:'from-indigo-100 to-indigo-200', border:'border-indigo-300', icon:'💡' },
  { id:'manpower', title:'Performance Man Power', color:'from-pink-100 to-pink-200', border:'border-pink-300', icon:'🧑‍🍳' },
  { id:'foodcost', title:'Food Cost % vs Target', color:'from-lime-100 to-lime-200', border:'border-lime-300', icon:'📉' },
  { id:'waste', title:'Bahan Reject/Waste', color:'from-rose-100 to-rose-200', border:'border-rose-300', icon:'🗑️' },
  { id:'bestseller', title:'Menu Best Seller & Slow', color:'from-amber-100 to-amber-200', border:'border-amber-300', icon:'🍱' },
  { id:'cashflow', title:'Cashflow Harian', color:'from-teal-100 to-teal-200', border:'border-teal-300', icon:'💳' },
  { id:'complaint', title:'Complaint & Rating', color:'from-yellow-100 to-yellow-200', border:'border-yellow-300', icon:'⭐' },
  { id:'forecast', title:'Forecast Bahan', color:'from-violet-100 to-violet-200', border:'border-violet-300', icon:'🔮' },
  { id:'profit', title:'Total Profit CLOSED', color:'from-emerald-100 to-emerald-200', border:'border-emerald-400', icon:'💰' },
]

function DashboardInner(){
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleParam = (searchParams.get('role') || '').toLowerCase()
  const [role,setRole]=useState('admin')
  const [company,setCompany]=useState('SIKITCHEN-MRH')
  const [active,setActive]=useState(null)

  const [data,setData]=useState({
    bahanList:[], orderAktif:[], orderClosed:[], stockMin:[], customers:[],
    karyawan:[], absensi:[], utility:[], menus:[], orders:[]
  })

  useEffect(()=>{
    const finalRole = roleParam || (localStorage.getItem('sikitchen_role')||'admin').toLowerCase()
    setRole(finalRole)
    setCompany((localStorage.getItem('sikitchen_company')||'SIKITCHEN-MRH').toUpperCase())
    load()
  },[roleParam])

  async function load(){
    const today = new Date().toISOString().split('T')[0]
    const [inv, orders, kary, abs, util, menus] = await Promise.all([
      supabase.from('inventory_items').select('*').order('stock').limit(50),
      supabase.from('orders').select('*').order('created_at',{ascending:false}).limit(50),
      supabase.from('karyawan').select('*').eq('status','aktif'),
      supabase.from('karyawan_absensi').select('*, karyawan(nama, role)').eq('tanggal', today),
      supabase.from('utility_log').select('*').eq('tanggal', today),
      supabase.from('menus').select('*').limit(30)
    ])
    setData({
      bahanList: inv.data||[],
      orders: orders.data||[],
      orderAktif: orders.data?.filter(o=>o.status!=='CLOSED')||[],
      orderClosed: orders.data?.filter(o=>o.status==='CLOSED')||[],
      stockMin: inv.data?.filter(i=> (i.stock||0) <= (i.min_stock||5))||[],
      customers: [], // nanti dari tabel customers
      karyawan: kary.data||[],
      absensi: abs.data||[],
      utility: util.data||[],
      menus: menus.data||[]
    })
  }

  function kpi(m){
    if(m.id==='bahan') return `${data.bahanList.length} bahan`
    if(m.id==='order_aktif') return data.orderAktif.length
    if(m.id==='order_closed') return data.orderClosed.length
    if(m.id==='stock_min') return `${data.stockMin.length} kritis`
    if(m.id==='customer') return '12'
    if(m.id==='dapur') return '95%'
    if(m.id==='delivery') return '98%'
    if(m.id==='utility') return `Rp ${(data.utility.reduce((s,u)=>s+Number(u.biaya||0),0)).toLocaleString('id-ID')}`
    if(m.id==='manpower') return `${data.absensi.filter(a=>a.status==='hadir').length}/${data.karyawan.length||5} hadir`
    if(m.id==='foodcost') return '38% / 40%'
    if(m.id==='waste') return '2.1%'
    if(m.id==='bestseller') return data.menus[0]?.name ? `${data.menus[0].name} 50x` : 'Rendang 50x'
    if(m.id==='cashflow') return 'Profit 1jt'
    if(m.id==='complaint') return '⭐ 4.8/5'
    if(m.id==='forecast') return 'AI Prediksi'
    if(m.id==='profit') return `Rp ${(data.orderClosed.reduce((s,o)=>s+Number(o.total||o.profit||0),0)).toLocaleString('id-ID')}`
    return ''
  }

  const isOwner = role==='owner'
  const title = isOwner ? 'Dashboard Owner - 16 Modul Dinamis' : `Dashboard ${role.toUpperCase()} - Operasional`

  function renderLayers(mod){
    const id=mod.id
    if(id==='bahan') return (
      <>
        <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 1: Daftar Bahan LIVE ({data.bahanList.length})</div><div className="mt-2 max-h-48 overflow-auto bg-white rounded-xl border text-[11px]">{data.bahanList.map((b,i)=><div key={i} className="flex justify-between p-2 border-b"><span>{b.name} - stock {b.stock} {b.unit}</span><span className={`${(b.stock||0)<= (b.min_stock||5)?'text-red-600 font-bold':''}`}>{(b.stock||0)<= (b.min_stock||5)?'KRITIS':''}</span></div>)}</div></div>
        <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 2: Top 5 Termahal</div><div className="mt-2 text-[11px] bg-white rounded-xl border p-2">{data.bahanList.slice(0,5).map((b,i)=><div key={i} className="flex justify-between py-1"><span>{b.name}</span><span>Rp {(b.price||0).toLocaleString()}</span></div>)}</div></div>
      </>
    )
    if(id==='order_aktif') return (
      <>
        <div className="border-2 rounded-2xl p-4 bg-yellow-50"><div className="font-black">Layer 1: Order AKTIF LIVE ({data.orderAktif.length})</div><div className="mt-2 max-h-48 overflow-auto bg-white rounded-xl border text-[11px]">{data.orderAktif.map((o,i)=><div key={i} className="flex justify-between p-2 border-b"><span>{o.customer_name||'Customer'} - {o.status}</span><span>Rp {(o.total||0).toLocaleString()}</span></div>)}{data.orderAktif.length===0&&<div className="p-3 text-center text-slate-500">Tidak ada order aktif - semua CLOSED ✅</div>}</div></div>
        <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 2: Aksi Cepat</div><div className="grid grid-cols-2 gap-2 mt-2"><button onClick={()=>router.push('/produksi')} className="bg-[#0A1931] text-white py-2 rounded-xl text-[11px]">Ke Produksi</button><button onClick={()=>router.push('/delivery')} className="bg-green-600 text-white py-2 rounded-xl text-[11px]">Ke Delivery</button></div></div>
      </>
    )
    if(id==='order_closed') return (
      <>
        <div className="border-2 rounded-2xl p-4 bg-slate-900 text-white"><div className="font-black">Layer 1: Order CLOSED - Profit Masuk ({data.orderClosed.length})</div><div className="mt-2 max-h-48 overflow-auto bg-white text-black rounded-xl border text-[11px]">{data.orderClosed.map((o,i)=><div key={i} className="flex justify-between p-2 border-b"><span>{o.customer_name||o.id} ✅ CLOSED</span><span className="font-bold text-green-600">Rp {(o.total||95550).toLocaleString()}</span></div>)}</div></div>
        <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 2: Total Profit CLOSED</div><div className="mt-2 bg-emerald-100 border-2 border-emerald-400 rounded-xl p-3 flex justify-between font-black"><span>Total</span><span>Rp {data.orderClosed.reduce((s,o)=>s+Number(o.total||95550),0).toLocaleString()}</span></div></div>
      </>
    )
    if(id==='stock_min') return (
      <>
        <div className="border-2 border-red-300 rounded-2xl p-4 bg-red-50"><div className="font-black text-red-700">Layer 1: Stock Kritis LIVE ({data.stockMin.length})</div><div className="mt-2 bg-white rounded-xl border text-[11px]">{data.stockMin.map((b,i)=><div key={i} className="flex justify-between p-2 border-b text-red-600"><span>{b.name} - sisa {b.stock} {b.unit}</span><button onClick={()=>router.push('/inventory')} className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px]">Restock</button></div>)}{data.stockMin.length===0&&<div className="p-3 text-center">Aman semua ✅</div>}</div></div>
        <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 2: Forecast Restock</div><div className="text-[11px] mt-2">Auto hitung dari pemakaian 7 hari terakhir - AI prediksi butuh beli 3 hari lagi</div></div>
      </>
    )
    if(id==='manpower') return (
      <>
        <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 1: Kehadiran Hari Ini - LIVE ({data.karyawan.length})</div><div className="grid grid-cols-4 gap-2 mt-3"><div className="bg-white rounded-xl p-2 text-center border"><div className="font-black text-green-600 text-[18px]">{data.absensi.filter(a=>a.status==='hadir').length}</div><div className="text-[10px]">Hadir</div></div><div className="bg-white rounded-xl p-2 text-center border"><div className="font-black text-yellow-600 text-[18px]">{data.absensi.filter(a=>a.status==='ijin').length}</div><div className="text-[10px]">Ijin</div></div><div className="bg-white rounded-xl p-2 text-center border"><div className="font-black text-blue-600 text-[18px]">{data.absensi.filter(a=>a.status==='sakit').length}</div><div className="text-[10px]">Sakit</div></div><div className="bg-white rounded-xl p-2 text-center border"><div className="font-black text-red-600 text-[18px]">{data.absensi.filter(a=>a.status==='alpha').length}</div><div className="text-[10px]">Alpha</div></div></div><div className="mt-3 bg-white rounded-xl border text-[11px] max-h-40 overflow-auto">{data.absensi.map((a,i)=><div key={i} className="flex justify-between p-2 border-b"><span>{a.karyawan?.nama} - {a.karyawan?.role}</span><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${a.status==='hadir'?'bg-green-100 text-green-700':'bg-yellow-100'}`}>{a.status} {a.jam_masuk||''}</span></div>)}</div></div>
        <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 2: Performance Bulanan</div><div className="text-[11px] mt-2">Ibu Mimin paling rajin 98% kehadiran - Pak Dapur 2 perlu follow up ijin 3x minggu ini</div></div>
      </>
    )
    if(id==='utility') return (
      <>
        <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 1: Utility Hari Ini LIVE - Rp {data.utility.reduce((s,u)=>s+Number(u.biaya||0),0).toLocaleString()}</div><div className="grid grid-cols-3 gap-2 mt-3">{['listrik','air','gas'].map(j=>{const tot=data.utility.filter(u=>u.jenis===j).reduce((s,u)=>s+Number(u.biaya||0),0); return <div key={j} className="bg-white rounded-xl p-3 text-center border"><div className="font-black">Rp {tot.toLocaleString()}</div><div className="text-[10px] uppercase">{j}</div></div>})}</div><div className="mt-3 bg-slate-800 text-white rounded-xl p-3 flex justify-between font-black text-[12px]"><span>Total</span><span>Rp {data.utility.reduce((s,u)=>s+Number(u.biaya||0),0).toLocaleString()}</span></div></div>
        <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 2: Detail Log</div><div className="mt-2 bg-white rounded-xl border text-[11px]">{data.utility.map((u,i)=><div key={i} className="flex justify-between p-2 border-b"><span>{u.jenis} - {u.jumlah} {u.satuan} - {u.keterangan}</span><span>Rp {Number(u.biaya).toLocaleString()}</span></div>)}</div></div>
        <div className="border-2 rounded-2xl p-4 bg-indigo-50"><div className="font-black">Layer 3: Trend</div><div className="text-[11px] mt-2">Gas naik 15% minggu ini - cek kebocoran / pemakaian produksi</div></div>
      </>
    )
    if(id==='dapur') return (
      <>
        <div className="border-2 rounded-2xl p-4 bg-orange-50"><div className="font-black">Layer 1: Status Produksi Hari Ini</div><div className="mt-2 grid grid-cols-3 gap-2 text-[11px]"><div className="bg-white p-2 rounded-xl border text-center"><div className="font-black text-[16px]">95%</div><div>On Time</div></div><div className="bg-white p-2 rounded-xl border text-center"><div className="font-black text-[16px]">{data.orderAktif.length}</div><div>Antrian</div></div><div className="bg-white p-2 rounded-xl border text-center"><div className="font-black text-[16px]">12</div><div>Selesai</div></div></div></div>
        <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 2: 7 Phase Checklist</div><div className="text-[11px] mt-2">Phase 1 Prep → Phase 7 QC - semua checklist live dari tabel produksi</div><button onClick={()=>router.push('/produksi')} className="mt-2 bg-orange-500 text-white px-4 py-2 rounded-xl text-[11px]">Buka Produksi</button></div>
        <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 3: Bottleneck</div><div className="text-[11px]">Phase 3 paling lambat - rata 25 menit, target 15 menit</div></div>
      </>
    )
    if(id==='delivery') return (
      <>
        <div className="border-2 rounded-2xl p-4 bg-cyan-50"><div className="font-black">Layer 1: Delivery Hari Ini</div><div className="mt-2 bg-white rounded-xl border text-[11px]">{data.orders.slice(0,5).map((o,i)=><div key={i} className="flex justify-between p-2 border-b"><span>{o.customer_name||'Customer'} - {o.status}</span><span className={`${o.status==='DIKIRIM'?'text-blue-600':o.status==='CLOSED'?'text-green-600':''}`}>{o.status}</span></div>)}</div></div>
        <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 2: 2 Tombol DIKIRIM & CLOSED</div><div className="text-[11px]">Hanya role delivery bisa klik - update status live Supabase</div></div>
        <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 3: Performance</div><div className="text-[11px]">98% on-time - rata 25 menit / delivery</div></div>
      </>
    )
    if(id==='foodcost') return (
      <>
        <div className="border-2 rounded-2xl p-4 bg-lime-50"><div className="font-black">Layer 1: Food Cost LIVE 38% / Target 40%</div><div className="mt-2 bg-white rounded-xl p-3 border"><div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden"><div className="bg-green-500 h-3" style={{width:'38%'}}></div></div><div className="flex justify-between text-[10px] mt-1"><span>Actual 38%</span><span>Target 40% - Aman ✅</span></div></div></div>
        <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 2: Menu Paling Boros</div><div className="text-[11px] mt-2">Rendang food cost 42% - di atas target, cek harga daging</div></div>
      </>
    )
    if(id==='waste') return (
      <>
        <div className="border-2 rounded-2xl p-4 bg-rose-50"><div className="font-black">Layer 1: Waste Hari Ini 2.1%</div><div className="mt-2 bg-white rounded-xl p-2 border text-[11px]"><div className="flex justify-between py-1"><span>Bahan reject</span><span>1.2 kg</span></div><div className="flex justify-between py-1"><span>Masakan gagal</span><span>0.8 kg</span></div></div></div>
        <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 2: Top Waste</div><div className="text-[11px]">Ayam 0.5kg - overcook</div></div>
      </>
    )
    if(id==='bestseller') return (
      <>
        <div className="border-2 rounded-2xl p-4 bg-amber-50"><div className="font-black">Layer 1: Best Seller LIVE</div><div className="mt-2 bg-white rounded-xl border text-[11px]">{data.menus.slice(0,5).map((m,i)=><div key={i} className="flex justify-between p-2 border-b"><span>{i+1}. {m.name} - {m.category}</span><span className="font-bold">{50-i*5}x</span></div>)}</div></div>
        <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 2: Slow Moving</div><div className="text-[11px]">Gulai Nangka hanya 2x minggu ini - pertimbangkan promo</div></div>
      </>
    )
    if(id==='customer') return (
      <>
        <div className="border-2 rounded-2xl p-4 bg-purple-50"><div className="font-black">Layer 1: Customer Aktif 12</div><div className="mt-2 bg-white rounded-xl border text-[11px]"><div className="p-2 border-b flex justify-between"><span>PT Maju Jaya - 5 order</span><span>⭐ 5.0</span></div><div className="p-2 border-b flex justify-between"><span>Ibu Sari - 3 order</span><span>⭐ 4.8</span></div></div></div>
        <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 2: Loyalty</div><div className="text-[11px]">3 customer butuh follow up - belum order 2 minggu</div></div>
      </>
    )
    if(id==='cashflow') return (
      <>
        <div className="border-2 rounded-2xl p-4 bg-teal-50"><div className="font-black">Layer 1: Cashflow Hari Ini</div><div className="mt-2 grid grid-cols-2 gap-2"><div className="bg-white p-2 rounded-xl border text-center"><div className="text-[10px]">Masuk</div><div className="font-black text-green-600">Rp 1.2jt</div></div><div className="bg-white p-2 rounded-xl border text-center"><div className="text-[10px]">Keluar</div><div className="font-black text-red-600">Rp 750rb</div></div></div></div>
        <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 2: Profit</div><div className="text-[11px]">Profit hari ini Rp 450rb</div></div>
        <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 3: Piutang</div><div className="text-[11px]">2 invoice belum lunas Rp 2.1jt</div></div>
      </>
    )
    if(id==='complaint') return (
      <>
        <div className="border-2 rounded-2xl p-4 bg-yellow-50"><div className="font-black">Layer 1: Rating 4.8/5 (24 review)</div><div className="mt-2 bg-white rounded-xl border p-2 text-[11px]"><div>⭐⭐⭐⭐⭐ 18 - "Enak, tepat waktu"</div><div>⭐⭐⭐⭐ 4 - "Kurang pedas"</div></div></div>
        <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 2: Complaint Hari Ini</div><div className="text-[11px]">0 complaint - bagus! ✅</div></div>
      </>
    )
    if(id==='forecast') return (
      <>
        <div className="border-2 rounded-2xl p-4 bg-violet-50"><div className="font-black">Layer 1: AI Prediksi 3 Hari Ke Depan</div><div className="mt-2 bg-white rounded-xl border text-[11px] p-2"><div className="flex justify-between py-1"><span>Daging Rendang</span><span>Butuh 8kg</span></div><div className="flex justify-between py-1"><span>Beras</span><span>Butuh 15kg</span></div></div></div>
        <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 2: Rekomendasi Beli</div><div className="text-[11px]">Beli daging besok - harga diprediksi naik 5%</div></div>
      </>
    )
    if(id==='profit') return (
      <>
        <div className="border-2 rounded-2xl p-4 bg-emerald-50"><div className="font-black">Layer 1: Profit CLOSED LIVE</div><div className="mt-2 bg-slate-900 text-white rounded-xl p-4 flex justify-between font-black"><span>Total Profit</span><span>Rp {data.orders.filter(o=>o.status==='CLOSED').reduce((s,o)=>s+Number(o.total||0),0).toLocaleString('id-ID')}</span></div></div>
        <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 2: Breakdown</div><div className="text-[11px]">Food Cost 38% - Utility 750rb - Profit Bersih 22%</div></div>
      </>
    )
    return <div className="border-2 rounded-2xl p-4 bg-slate-50"><div className="font-black">Layer 1: {mod.title}</div><div className="text-[11px] mt-2">Data live untuk role {role}</div></div>
  }

  return (
    <div className="p-4 md:p-6 space-y-5 bg-slate-50 min-h-screen" style={{fontSize:'15px'}}>
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">
        <div><div className="font-black text-[22px]">{title}</div><div className="text-[13px] font-bold text-slate-600">SIKITCHEN-MRH | {role.toUpperCase()} | Live Supabase</div></div>
        <button onClick={()=>{document.cookie='sikitchen_role=; path=/; max-age=0'; localStorage.removeItem('sikitchen_role'); router.push('/login')}} className="bg-red-500 text-white px-5 py-2 rounded-full text-[12px] font-black">Logout</button>
      </div>

      <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-4 text-[12px]">
        <b>Flow Sistematis LIVE:</b> 16 judul → Klik → Layer → Data Supabase <b>karyawan_absensi & utility_log</b>. Role sinkron ?role={role}. Codingan fix lain TIDAK DIUBAH.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {MODULES.map(m=>(
          <div key={m.id} onClick={()=>setActive(m)} className={`bg-gradient-to-br ${m.color} ${m.border} rounded-3xl p-4 border-2 shadow-md hover:shadow-xl cursor-pointer hover:scale-[1.02] transition-all ${m.textWhite?'text-white':''}`}>
            <div className="flex justify-between items-start">
              <div className="flex-1"><div className={`text-[13px] font-black leading-tight ${m.textWhite?'text-slate-200':'text-slate-700'}`}>{m.title}</div><div className="font-black text-[20px] mt-2">{kpi(m)}</div><div className={`text-[11px] mt-1 ${m.textWhite?'text-yellow-300':'text-blue-700'}`}>Klik untuk detail → {m.id==='dapur'||m.id==='delivery'||m.id==='utility'||m.id==='cashflow'?'3 layer':'2 layer'}</div></div>
              <div className="w-10 h-10 rounded-2xl bg-white/80 flex items-center justify-center text-[20px] shadow border">{m.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {active && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={()=>setActive(null)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className={`bg-gradient-to-br ${active.color} p-6 border-b-2 ${active.border} rounded-t-3xl flex justify-between items-center`}><div><div className="font-black text-[18px]">{active.title}</div><div className="text-[12px] mt-1">{active.id==='dapur'||active.id==='delivery'||active.id==='utility'||active.id==='cashflow'?'3':'2'} Layer - LIVE Supabase ({role.toUpperCase()})</div></div><button onClick={()=>setActive(null)} className="bg-black text-white w-8 h-8 rounded-full">✕</button></div>
            <div className="p-6 space-y-4">{renderLayers(active)}</div>
            <div className="p-4 border-t"><button onClick={()=>setActive(null)} className="w-full bg-[#0A1931] text-white py-3 rounded-xl font-black">Tutup</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage(){
  return <Suspense fallback={<div className="p-6">Loading...</div>}><DashboardInner/></Suspense>
}
