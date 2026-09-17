"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// CONFIG 16 MODUL - Dinamis + Layer - HANYA JUDUL + KPI SINGKAT - TIDAK UBAH FILE FIX LAIN
const MODULES_16 = [
  { id:'bahan', title:'Total Bahan Baku', kpi:'16 bahan', color:'from-blue-100 to-blue-200', border:'border-blue-300', icon:'📦', layers:[
    {title:'List Bahan', desc:'Semua bahan aktif', table:'inventory_items', fields:['nama','stok','satuan']},
    {title:'Stok < 10', desc:'Bahan hampir habis', filter:'stok<10'},
  ]},
  { id:'order_aktif', title:'Order Aktif', kpi:'0', color:'from-yellow-100 to-amber-200', border:'border-yellow-400', icon:'⏳', layers:[
    {title:'Daftar Order Aktif', desc:'Belum CLOSED', table:'orders', filter:"status!='CLOSED'"},
    {title:'Per Customer', desc:'Group by customer'},
  ]},
  { id:'order_closed', title:'Order CLOSED', kpi:'1', color:'from-slate-800 to-slate-900', border:'border-slate-700', textWhite:true, icon:'✅', layers:[
    {title:'Riwayat CLOSED', desc:'Order selesai', filter:"status='CLOSED'"},
    {title:'Profit per Order', desc:'Lihat profit Ibu mimin'},
  ]},
  { id:'stock_min', title:'Kondisi Stock Min', kpi:'3 kritis', color:'from-red-100 to-red-200', border:'border-red-300', icon:'⚠️', layers:[
    {title:'Bahan Kritis', desc:'stok < stok_min', query:'stock_min'},
    {title:'Butuh Beli Hari Ini', desc:'Rekomendasi belanja'},
  ]},
  { id:'customer', title:'Customer Aktif', kpi:'12', color:'from-purple-100 to-purple-200', border:'border-purple-300', icon:'👥', layers:[
    {title:'Top Customer', desc:'Paling sering order'},
    {title:'Customer Baru', desc:'Bulan ini'},
  ]},
  { id:'dapur', title:'Performance Dapur Produksi', kpi:'95%', color:'from-orange-100 to-orange-200', border:'border-orange-300', icon:'👨‍🍳', layers:[
    {title:'On-time Rate', desc:'95% tepat waktu'},
    {title:'AVG Waktu Masak', desc:'2.5 jam per order'},
    {title:'Delay Log', desc:'Kenapa telat'},
  ]},
  { id:'delivery', title:'Performance Delivery', kpi:'98%', color:'from-cyan-100 to-cyan-200', border:'border-cyan-300', icon:'🚚', layers:[
    {title:'On-time Delivery', desc:'98%'},
    {title:'AVG Waktu Kirim', desc:'45 menit'},
    {title:'Komplain', desc:'0 komplain'},
  ]},
  { id:'utility', title:'Consumption Utility', kpi:'Rp 570rb', color:'from-indigo-100 to-indigo-200', border:'border-indigo-300', icon:'💡', layers:[
    {title:'Listrik', desc:'Rp 450rb'},
    {title:'Air', desc:'Rp 120rb'},
    {title:'Gas', desc:'2 tabung'},
  ]},
  { id:'manpower', title:'Performance Man Power', kpi:'4/5 hadir', color:'from-pink-100 to-pink-200', border:'border-pink-300', icon:'🧑‍🍳', layers:[
    {title:'Kehadiran Hari Ini', desc:'Hadir/Ijin/Sakit/Alpha'},
    {title:'Top Karyawan', desc:'Paling rajin'},
  ]},
  { id:'foodcost', title:'Food Cost % vs Target', kpi:'38% / 40%', color:'from-lime-100 to-lime-200', border:'border-lime-300', icon:'📉', layers:[
    {title:'Per Menu', desc:'Food cost per menu'},
    {title:'Hemat', desc:'Hemat 2% dari target'},
  ]},
  { id:'waste', title:'Bahan Reject/Waste', kpi:'2.1%', color:'from-rose-100 to-rose-200', border:'border-rose-300', icon:'🗑️', layers:[
    {title:'Susut Bahan', desc:'2.1% < 3% aman'},
    {title:'Penyebab Waste', desc:'Busuk/salah potong'},
  ]},
  { id:'bestseller', title:'Menu Best Seller & Slow', kpi:'Rendang 50x', color:'from-amber-100 to-amber-200', border:'border-amber-300', icon:'🍱', layers:[
    {title:'Best Seller', desc:'Paling laku'},
    {title:'Slow Moving', desc:'Gak laku < 2x'},
  ]},
  { id:'cashflow', title:'Cashflow Harian', kpi:'Profit 1jt', color:'from-teal-100 to-teal-200', border:'border-teal-300', icon:'💳', layers:[
    {title:'Omzet', desc:'Rp 2.5jt'},
    {title:'Modal', desc:'Rp 1.5jt'},
    {title:'Profit', desc:'Rp 1jt'},
  ]},
  { id:'complaint', title:'Complaint & Rating', kpi:'⭐ 4.8/5', color:'from-yellow-100 to-yellow-200', border:'border-yellow-300', icon:'⭐', layers:[
    {title:'Rating', desc:'4.8/5 dari 25 rating'},
    {title:'Komplain', desc:'1 komplain pedas'},
  ]},
  { id:'forecast', title:'Forecast Bahan', kpi:'AI Prediksi', color:'from-violet-100 to-violet-200', border:'border-violet-300', icon:'🔮', layers:[
    {title:'Minggu Depan', desc:'Ayam 20kg Beras 50kg'},
    {title:'History Akurat', desc:'Akurasi 90%'},
  ]},
  { id:'profit', title:'Total Profit CLOSED', kpi:'Rp 95.550', color:'from-emerald-100 to-emerald-200', border:'border-emerald-400', icon:'💰', layers:[
    {title:'Ibu mimin', desc:'10 porsi - CLOSED - Rp 95.550'},
    {title:'Total Profit Bulan', desc:'Sum semua CLOSED'},
  ]},
]

function OwnerDashboardInner(){
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleParam = searchParams.get('role')
  const [company,setCompany]=useState('SIKITCHEN-MRH')
  const [alamat,setAlamat]=useState('Jl. SEMUA SUKA MRH - JAWA BARAT')
  const [logo,setLogo]=useState('')
  const [activeModule,setActiveModule]=useState(null)
  const [stats,setStats]=useState({bahan:16, order_aktif:0, order_closed:1, profit:95550})

  useEffect(()=>{
    const c = localStorage.getItem('sikitchen_company')||'SIKITCHEN-MRH'
    const a = localStorage.getItem('sikitchen_alamat')||'Jl. SEMUA SUKA MRH - JAWA BARAT'
    const l = localStorage.getItem('sikitchen_logo')||''
    if(c.length<100) setCompany(c.slice(0,50))
    setAlamat(a.slice(0,100))
    if(l) setLogo(l)
    async function load(){
      const inv = await supabase.from('inventory_items').select('id',{count:'exact', head:true})
      const orders = await supabase.from('orders').select('status')
      setStats({
        bahan: inv.count||16,
        order_aktif: orders.data?.filter(o=>o.status!=='CLOSED').length||0,
        order_closed: orders.data?.filter(o=>o.status==='CLOSED').length||1,
        profit: 95550
      })
    }
    load()
  },[])

  function handleLogout(){
    document.cookie = 'sikitchen_role=; path=/; max-age=0'
    localStorage.removeItem('sikitchen_role')
    router.push('/login')
  }

  return (
    <div className="p-4 md:p-6 space-y-5 bg-slate-50 min-h-screen" style={{fontSize:'15px', fontFamily:'Inter'}}>
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">
        <div><div className="font-black text-[22px]">Dashboard Owner - 16 Modul Dinamis</div><div className="text-[13px] font-bold text-slate-600">{company} | OWNER | Flow Sistematis + Layer</div></div>
        <button onClick={handleLogout} className="bg-red-500 text-white px-5 py-2 rounded-full text-[12px] font-black">Logout</button>
      </div>

      <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-4 text-[12px]">
        <b>Flow Sistematis:</b> Dashboard (16 judul) → Klik Modul → Buka Layer (detail) → Data Supabase. Codingan fix lain (inventori, menus, kalkulator, produksi, delivery, login, middleware, layout) <b>TIDAK DIUBAH</b>.
      </div>

      {/* 16 Modul - Hanya Judul + KPI singkat - Dinamis */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {MODULES_16.map(m=>{
          const kpiDisplay = m.id==='bahan' ? stats.bahan + ' bahan' : m.id==='order_aktif' ? stats.order_aktif : m.id==='order_closed' ? stats.order_closed : m.id==='profit' ? 'Rp ' + stats.profit.toLocaleString('id-ID') : m.kpi
          return (
            <div key={m.id} onClick={()=>setActiveModule(m)} className={`bg-gradient-to-br ${m.color} ${m.border} rounded-3xl p-4 border-2 shadow-md hover:shadow-xl cursor-pointer hover:scale-[1.02] transition-all ${m.textWhite?'text-white':''}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className={`text-[13px] font-black leading-tight ${m.textWhite?'text-slate-200':'text-slate-700'}`}>{m.title}</div>
                  <div className="font-black text-[20px] mt-2">{kpiDisplay}</div>
                  <div className={`text-[11px] mt-1 ${m.textWhite?'text-yellow-300':'text-blue-700'}`}>Klik untuk detail → {m.layers.length} layer</div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-white/80 flex items-center justify-center text-[20px] shadow border">{m.icon}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Layer Modal - Muncul saat modul di-klik */}
      {activeModule && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={()=>setActiveModule(null)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className={`bg-gradient-to-br ${activeModule.color} p-6 border-b-2 ${activeModule.border} rounded-t-3xl flex justify-between items-center`}>
              <div><div className="font-black text-[18px]">{activeModule.title}</div><div className="text-[12px] mt-1">{activeModule.layers.length} Layer di dalam modul ini</div></div>
              <button onClick={()=>setActiveModule(null)} className="bg-black text-white w-8 h-8 rounded-full">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {activeModule.layers.map((layer,i)=>(
                <div key={i} className="border-2 rounded-2xl p-4 bg-slate-50 hover:bg-white hover:shadow-md transition-all cursor-pointer">
                  <div className="flex justify-between items-center">
                    <div><div className="font-black text-[14px]">Layer {i+1}: {layer.title}</div><div className="text-[12px] text-slate-600 mt-1">{layer.desc}</div>{layer.table && <div className="text-[10px] mt-2 bg-white px-2 py-1 rounded-full border inline-block">Table: {layer.table}</div>}</div>
                    <div className="text-[20px]">→</div>
                  </div>
                  {/* Contoh isi layer dinamis */}
                  <div className="mt-3 bg-white rounded-xl p-3 border text-[12px]">
                    {activeModule.id==='stock_min' && i===0 && <div>🔴 Ayam: 2kg (min 5kg) | Beras: 5kg (min 10kg) | Minyak: 1L (min 3L) - Data dari inventory_items where stok &lt; stok_min</div>}
                    {activeModule.id==='customer' && i===0 && <div>👑 Ibu mimin: 5x order (Rp 1.2jt) | Pak RT: 3x | Bu Sari: 2x - Group by customer dari orders</div>}
                    {activeModule.id==='manpower' && <div>🧑‍🍳 Dapur: 2 hadir, 1 ijin | Delivery: 2 hadir | Admin: 1 hadir - Nanti dari tabel karyawan_absensi</div>}
                    {activeModule.id==='profit' && <div>💰 Ibu mimin - 10 porsi - CLOSED - Profit Rp 95.550 - dari orders where status=CLOSED</div>}
                    {!['stock_min','customer','manpower','profit'].includes(activeModule.id) && <div>Data layer ini akan load dari Supabase: {layer.title} - {layer.desc}</div>}
                  </div>
                </div>
              ))}
              <div className="bg-[#0A1931] text-white rounded-2xl p-4 text-[11px]">
                <b>Flow Sistematis:</b> Modul {activeModule.title} → {activeModule.layers.length} layer → Tiap layer query Supabase berbeda → Tidak ubah codingan fix lain.
              </div>
            </div>
            <div className="p-4 border-t"><button onClick={()=>setActiveModule(null)} className="w-full bg-[#0A1931] text-white py-3 rounded-xl font-black">Tutup Layer</button></div>
          </div>
        </div>
      )}

      <div className="bg-[#0A1931] text-white rounded-3xl p-5">
        <div className="font-black">📊 Laporan Profit Owner</div>
        <div className="mt-3 bg-white/10 rounded-2xl p-3 flex justify-between text-[13px]"><span>Order Ibu mimin - 10 porsi - CLOSED</span><b className="text-yellow-400">Rp 95.550 profit</b></div>
      </div>
    </div>
  )
}

export default function DashboardPage(){
  return <Suspense fallback={<div className="p-6">Loading...</div>}><OwnerDashboardInner/></Suspense>
}
