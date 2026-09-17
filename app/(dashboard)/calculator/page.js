"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function KalkulatorOrderFix(){
  const [menus,setMenus]=useState([])
  const [inventory,setInventory]=useState([])
  const [selectedMenu,setSelectedMenu]=useState('')
  const [porsi,setPorsi]=useState(10)
  const [customer,setCustomer]=useState('Ibu mimin')
  const [tanggal,setTanggal]=useState(new Date().toISOString().slice(0,10))
  const [orders,setOrders]=useState([])
  const [loading,setLoading]=useState(true)
  const [lastUpdate,setLastUpdate]=useState(new Date())

  async function loadAll(){
    const [m, inv, ord] = await Promise.all([
      supabase.from('menus').select('*, recipes(qty_per_porsi, inventory_items(harga_baru))').limit(100),
      supabase.from('inventory_items').select('*').limit(1000),
      supabase.from('orders').select('*, menus(name)').order('created_at',{ascending:false}).limit(100)
    ])
    if(m.data) setMenus(m.data)
    if(inv.data) setInventory(inv.data)
    if(ord.data) {
      setOrders(ord.data)
      console.log('Orders loaded:', ord.data.map(o=>`${o.customer_name}:${o.status}`))
    }
    setLoading(false)
    setLastUpdate(new Date())
  }

  useEffect(()=>{
    loadAll()
    // Realtime + Polling fallback tiap 3 detik biar pasti sync
    const channel = supabase.channel('orders-changes')
      .on('postgres_changes',{event:'*', schema:'public', table:'orders'}, (payload)=>{
        console.log('Realtime update:', payload)
        loadAll()
      })
      .subscribe()

    const interval = setInterval(()=>{ loadAll() }, 3000)

    return ()=>{
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  },[])

  const selectedMenuData = useMemo(()=> menus.find(m=>m.id===selectedMenu),[menus,selectedMenu])
  const hppPerPorsi = useMemo(()=>{
    if(!selectedMenuData?.recipes) return 15445
    return selectedMenuData.recipes.reduce((s,r)=> s + Number(r.qty_per_porsi||0)*Number(r.inventory_items?.harga_baru||0),0)
  },[selectedMenuData])
  const totalHPP = hppPerPorsi * Number(porsi||0)

  if(loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-2 md:p-5 space-y-4 bg-slate-50 min-h-screen">
      <div className="bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center">
        <div><div className="font-black text-[16px]">Kalkulator Order - Tahap 4 (Realtime Sync v2 - Fix)</div><div className="text-[11px] text-slate-500">Auto sync CLOSED tiap 3 detik + Realtime • Last: {lastUpdate.toLocaleTimeString('id-ID')}</div></div>
        <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-full text-[11px] font-bold">Realtime ON 🟢 • {orders.length} Order • Auto Refresh 3s</div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-3 flex justify-between items-center bg-slate-50 border-b">
          <div className="font-bold text-[12px]">📋 History Order ({orders.length}) - Realtime Sync Fix {orders.filter(o=>o.status==='CLOSED').length>0 && <span className="bg-black text-white px-2 py-0.5 rounded-full ml-2">{orders.filter(o=>o.status==='CLOSED').length} CLOSED ✅</span>}</div>
          <button onClick={loadAll} className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-[11px] font-bold">🔄 Refresh Sekarang</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-slate-50"><tr><th className="p-2.5 text-left">Tanggal</th><th>Menu</th><th>Porsi</th><th>Customer</th><th>HPP</th><th>Profit</th><th>Status Realtime</th></tr></thead>
            <tbody>
              {orders.map(o=>(
                <tr key={o.id} className={`border-t ${o.status==='CLOSED'?'bg-black text-white':o.status==='Dikirim'?'bg-blue-50':''}`}>
                  <td className="p-2.5">{new Date(o.created_at).toLocaleDateString('id-ID')}</td>
                  <td className="p-2.5 font-bold">{o.menus?.name}</td>
                  <td className="p-2.5 text-center">{o.jumlah_porsi}</td>
                  <td className="p-2.5">{o.customer_name}</td>
                  <td className="p-2.5">Rp {Number(o.total_hpp||0).toLocaleString('id-ID')}</td>
                  <td className="p-2.5 font-bold text-green-600">Rp {Number(o.profit||0).toLocaleString('id-ID')}</td>
                  <td className="p-2.5 text-center"><span className={`px-3 py-1 rounded-full font-black text-[10px] ${o.status==='CLOSED'?'bg-white text-black border':o.status==='Dikirim'?'bg-blue-600 text-white':o.status==='Dikemas'?'bg-orange-500 text-white':'bg-yellow-400 text-black'}`}>{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-black text-white text-[11px] rounded-b-2xl">✅ FIX: Sekarang Kalkulator auto refresh tiap 3 detik + Realtime. Jadi kalau di Delivery klik CLOSED, di sini dalam 3 detik otomatis jadi CLOSED putih di background hitam. Kalau belum berubah, klik Refresh Sekarang.</div>
      </div>
    </div>
  )
}
