"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function KalkulatorOrder(){
  const [menus,setMenus]=useState([])
  const [inventory,setInventory]=useState([])
  const [selectedMenu,setSelectedMenu]=useState('')
  const [porsi,setPorsi]=useState(10)
  const [customer,setCustomer]=useState('Ibu mimin')
  const [tanggal,setTanggal]=useState(new Date().toISOString().slice(0,10))
  const [orders,setOrders]=useState([])
  const [loading,setLoading]=useState(true)

  async function loadAll(){
    setLoading(true)
    const [m, inv, ord] = await Promise.all([
      supabase.from('menus').select('*, recipes(qty_per_porsi, inventory_items(harga_baru,satuan))').limit(100),
      supabase.from('inventory_items').select('*').limit(1000),
      supabase.from('orders').select('*, menus(name)').order('created_at',{ascending:false}).limit(100)
    ])
    if(m.data) setMenus(m.data)
    if(inv.data) setInventory(inv.data)
    if(ord.data) setOrders(ord.data)
    setLoading(false)
  }

  useEffect(()=>{
    loadAll()
    // REALTIME SYNC - ini yang bikin Kalkulator auto update pas Delivery klik CLOSED
    const channel = supabase.channel('orders-realtime')
      .on('postgres_changes',{event:'*', schema:'public', table:'orders'}, payload=>{
        console.log('Realtime order update:', payload)
        if(payload.eventType==='UPDATE'){
          setOrders(prev=> prev.map(o=> o.id===payload.new.id ? {...o, ...payload.new, menus: o.menus} : o))
        }
        if(payload.eventType==='INSERT'){
          loadAll()
        }
      })
      .subscribe()
    return ()=>{ supabase.removeChannel(channel) }
  },[])

  const selectedMenuData = useMemo(()=> menus.find(m=>m.id===selectedMenu),[menus,selectedMenu])
  const hppPerPorsi = useMemo(()=>{
    if(!selectedMenuData?.recipes) return 15445
    return selectedMenuData.recipes.reduce((s,r)=> s + Number(r.qty_per_porsi||0)*Number(r.inventory_items?.harga_baru||0),0)
  },[selectedMenuData])
  const totalHPP = hppPerPorsi * Number(porsi||0)
  const hargaJual = Number(selectedMenuData?.harga_jual||25000) * Number(porsi||0)
  const profit = hargaJual - totalHPP

  async function handleBuatOrder(){
    if(!selectedMenu){ alert('Pilih menu dulu Bos'); return }
    const payload = {
      menu_id: selectedMenu,
      jumlah_porsi: Number(porsi),
      customer_name: customer,
      tanggal: tanggal,
      status: 'Draft',
      total_hpp: totalHPP,
      total_jual: hargaJual,
      profit: profit
    }
    const {data, error} = await supabase.from('orders').insert(payload).select().single()
    if(error){ alert('Error: '+error.message); return }
    alert(`✅ Order ${customer} - ${porsi} porsi dibuat! Lanjut ke Produksi`)
    loadAll()
    // Simpan ke localStorage juga biar history tidak hilang
    const hist = JSON.parse(localStorage.getItem('sikitchen_history')||'[]')
    hist.unshift({...data, menu_name: selectedMenuData?.name})
    localStorage.setItem('sikitchen_history', JSON.stringify(hist.slice(0,50)))
  }

  async function handleRefresh(){ loadAll() }
  function handleHapusLokal(){
    if(confirm('Hapus history lokal? Data di Supabase tetap aman')){
      localStorage.removeItem('sikitchen_history')
      alert('History lokal dihapus')
    }
  }

  if(loading) return <div className="p-6">Loading Kalkulator...</div>

  return (
    <div className="p-2 md:p-5 space-y-4 bg-slate-50 min-h-screen" style={{fontFamily:'Inter, Arial, sans-serif'}}>
      <div className="bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center">
        <div>
          <div className="font-black text-[16px]">Kalkulator Order - Tahap 4 (Realtime Sync)</div>
          <div className="text-[11px] text-slate-500">Daging rendang • {porsi} porsi • {inventory.length} bahan • Tombol Buat Order Sudah Berfungsi + Auto Sync CLOSED - Arial +2px</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-1.5 rounded-full text-[11px] font-bold">{orders.length} History • {menus.length} Menu • {inventory.length} Bahan • Realtime ON 🟢</div>
      </div>

      <div className="bg-white p-4 rounded-2xl border shadow-sm grid md:grid-cols-3 gap-4">
        <div>
          <div className="text-[11px] font-bold mb-1">Pilih Menu ({menus.length})</div>
          <select value={selectedMenu} onChange={e=>setSelectedMenu(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-[12px]">
            <option value="">▼ Pilih Menu - Daging rendang Rp {hppPerPorsi.toLocaleString('id-ID')} HPP</option>
            {menus.map(m=>(
              <option key={m.id} value={m.id}>{m.name} - Rp {m.harga_jual?.toLocaleString('id-ID')} Jual</option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-[11px] font-bold mb-1">Jumlah Porsi</div>
          <input type="number" value={porsi} onChange={e=>setPorsi(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-[13px] font-bold"/>
        </div>
        <div className="space-y-2">
          <div className="text-[11px] font-bold">Customer & Tanggal</div>
          <input value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Nama Customer" className="w-full border rounded-xl px-3 py-2.5 text-[12px]"/>
          <input type="date" value={tanggal} onChange={e=>setTanggal(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-[12px]"/>
          <button onClick={handleBuatOrder} className="w-full bg-[#0A1931] text-white py-2.5 rounded-xl text-[12px] font-black hover:bg-black">🛒 Buat Order - HPP Rp {totalHPP.toLocaleString('id-ID')} | Jual Rp {hargaJual.toLocaleString('id-ID')}</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-3 flex justify-between items-center bg-slate-50 border-b">
          <div className="font-bold text-[12px]">📋 History Order ({orders.length}) - Realtime Sync - Tidak Hilang! {orders.some(o=>o.status==='CLOSED') && <span className="bg-black text-white px-2 py-0.5 rounded-full text-[10px] ml-2">Ada CLOSED ✅</span>}</div>
          <div className="flex gap-2">
            <button onClick={handleHapusLokal} className="bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-bold">🗑️ Hapus Lokal</button>
            <button onClick={handleRefresh} className="bg-blue-50 border px-3 py-1 rounded-full text-[10px] font-bold">🔄 Refresh</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-slate-50 text-slate-500">
              <tr><th className="p-2.5 text-left">Tanggal</th><th className="p-2.5">Menu</th><th>Porsi</th><th>Customer</th><th>HPP</th><th>Jual</th><th>Profit</th><th>Status (Realtime)</th></tr>
            </thead>
            <tbody>
              {orders.map(o=>(
                <tr key={o.id} className={`border-t hover:bg-slate-50 ${o.status==='CLOSED'?'bg-green-50':o.status==='Dikirim'?'bg-blue-50/50':''}`}>
                  <td className="p-2.5">{new Date(o.created_at||o.tanggal).toLocaleDateString('id-ID')}</td>
                  <td className="p-2.5 font-bold">{o.menus?.name||o.menu_name||'Daging rendang'}</td>
                  <td className="p-2.5 text-center">{o.jumlah_porsi}</td>
                  <td className="p-2.5">{o.customer_name}</td>
                  <td className="p-2.5">Rp {(o.total_hpp||totalHPP).toLocaleString('id-ID')}</td>
                  <td className="p-2.5">Rp {(o.total_jual||hargaJual).toLocaleString('id-ID')}</td>
                  <td className={`p-2.5 font-bold ${o.status==='CLOSED'?'text-green-700':'text-emerald-600'}`}>Rp {(o.profit||profit).toLocaleString('id-ID')}</td>
                  <td className="p-2.5 text-center"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${o.status==='CLOSED'?'bg-black text-white':o.status==='Dikirim'?'bg-blue-100 text-blue-700':o.status==='Dikemas'?'bg-orange-100 text-orange-700':o.status==='Diproses'?'bg-yellow-100 text-yellow-700':'bg-slate-100'}`}>{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-2 bg-yellow-50 text-[10px] text-yellow-700 border-t">💡 Realtime: Kalau Delivery klik CLOSED, status di sini auto berubah jadi CLOSED hitam tanpa refresh. Kalau masih Dikirim, klik Refresh atau tunggu 2 detik.</div>
      </div>
    </div>
  )
}
