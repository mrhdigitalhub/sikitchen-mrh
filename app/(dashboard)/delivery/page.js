"use client"
import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function DeliveryPageV3(){
  const searchParams = useSearchParams()
  const orderIdFromUrl = searchParams.get('order_id')
  const customerFromUrl = searchParams.get('customer')

  const [orders,setOrders]=useState([])
  const [loading,setLoading]=useState(true)
  const [selectedId,setSelectedId]=useState(orderIdFromUrl||'')

  async function load(){
    setLoading(true)
    const {data} = await supabase.from('orders').select('*, menus(name)').order('created_at',{ascending:false}).limit(100)
    if(data) setOrders(data)
    setLoading(false)
  }
  useEffect(()=>{ load() },[])
  useEffect(()=>{ if(orderIdFromUrl) setSelectedId(orderIdFromUrl) },[orderIdFromUrl])

  const deliveryOrders = useMemo(()=>{
    // Hanya yang sudah lewat Production: Diproses, Dikemas, Dikirim, CLOSED, Delivery, Selesai
    return orders.filter(o=> ['Diproses','Dikemas','Dikirim','CLOSED','Delivery','Selesai'].includes(o.status))
  },[orders])

  const selected = useMemo(()=> orders.find(o=>o.id===selectedId)||null,[orders,selectedId])

  // Logic indikator warna sync dari Production
  const getStepStatus = (step)=>{
    if(!selected) return 'idle'
    const s = selected.status
    if(step===1) return ['Diproses','Dikemas','Dikirim','CLOSED','Delivery','Selesai'].includes(s) ? 'active' : 'idle'
    if(step===2) return ['Dikemas','Dikirim','CLOSED','Delivery','Selesai'].includes(s) ? 'active' : 'idle'
    if(step===3) return ['Dikirim','CLOSED'].includes(s) ? 'active' : 'idle'
    if(step===4) return s==='CLOSED' ? 'active' : 'idle'
    return 'idle'
  }

  async function handleDikirim(){
    if(!selected) return
    await supabase.from('orders').update({status:'Dikirim'}).eq('id',selected.id)
    alert(`🚚 ${selected.customer_name} → Dikirim!`)
    load()
  }
  async function handleClosed(){
    if(!selected) return
    if(!confirm(`Tutup order ${selected.customer_name} - ${selected.menus?.name}?`)) return
    await supabase.from('orders').update({status:'CLOSED', closed_at: new Date().toISOString()}).eq('id',selected.id)
    alert(`✅ ${selected.customer_name} CLOSED - Selesai termonitor Admin & Owner`)
    load()
  }

  if(loading) return <div className="p-6">Loading Delivery v3...</div>

  return (
    <div className="p-2 md:p-6 space-y-4 bg-slate-50 min-h-screen" style={{fontFamily:'Inter, Arial, sans-serif'}}>
      <div className="bg-white p-4 rounded-2xl border shadow-sm">
        <div className="font-black text-[18px]">Delivery - Tahap 3 RBAC v3 (2 Tombol Only)</div>
        <div className="text-[12px] text-slate-500 mt-1">Hanya update status: Diproses → Dikemas → Dikirim → CLOSED | {deliveryOrders.length} order | Flow sync dari Production</div>
        {orderIdFromUrl && <div className="mt-2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-xl text-[11px]">📦 Order dari Production: <b>{customerFromUrl?decodeURIComponent(customerFromUrl):orderIdFromUrl}</b></div>}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1 bg-white rounded-2xl border shadow-sm overflow-hidden h-fit">
          <div className="bg-[#0A1931] text-white px-4 py-3 font-bold text-[12px]">DAFTAR DELIVERY</div>
          <div className="max-h-[600px] overflow-y-auto">
            {deliveryOrders.length===0 ? (
              <div className="p-6 text-center text-[12px] text-slate-400">Belum ada delivery<br/>Selesaikan Produksi dulu → klik Proses Produksi → QC → Next Delivery</div>
            ) : deliveryOrders.map(o=>(
              <div key={o.id} onClick={()=>setSelectedId(o.id)} className={`p-3 border-b cursor-pointer text-[12px] hover:bg-slate-50 ${selectedId===o.id?'bg-yellow-50 border-l-4 border-l-yellow-400':''} ${o.id===orderIdFromUrl?'bg-green-50':''}`}>
                <div className="font-bold flex justify-between"><span>{o.menus?.name} - {o.jumlah_porsi} box</span><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${o.status==='Diproses'?'bg-yellow-100 text-yellow-700':o.status==='Dikemas'?'bg-orange-100 text-orange-700':o.status==='Dikirim'?'bg-blue-100 text-blue-700':o.status==='CLOSED'?'bg-black text-white':'bg-slate-100'}`}>{o.status}</span></div>
                <div className="text-[11px] text-slate-500">{o.customer_name} • {new Date(o.created_at).toLocaleDateString('id-ID')}</div>
                {o.id===orderIdFromUrl && <div className="text-[10px] text-green-600 font-bold mt-1">← Baru dari Production</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          {!selected ? (
            <div className="bg-white p-10 rounded-2xl border text-center text-slate-400 text-[13px]">Pilih order di kiri</div>
          ) : (
            <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-5">
              <div className="flex justify-between">
                <div><div className="font-black text-[16px]">{selected.menus?.name}</div><div className="text-[12px] text-slate-600">{selected.jumlah_porsi} porsi • {selected.customer_name}</div><div className="text-[11px] text-slate-400">ID: {selected.id}</div></div>
                <div className={`px-3 py-1 rounded-full text-[11px] font-bold h-fit ${selected.status==='CLOSED'?'bg-black text-white':selected.status==='Dikirim'?'bg-blue-100 text-blue-700':selected.status==='Dikemas'?'bg-orange-100 text-orange-700':'bg-yellow-100 text-yellow-700'}`}>{selected.status}</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl">
                <div className="font-bold text-[11px] mb-3">FLOW STATUS (Sync dari Production):</div>
                <div className="flex flex-col md:flex-row gap-3">
                  {[1,2,3,4].map(step=>{
                    const label = step===1?'Diproses (dari Production)':step===2?'Dikemas (QC OK)':step===3?'Dikirim':step===4?'CLOSED':''
                    const isActive = getStepStatus(step)==='active'
                    return (
                      <div key={step} className="flex items-center gap-2">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black transition ${isActive ? (step===1?'bg-yellow-500 text-white':step===2?'bg-orange-500 text-white':step===3?'bg-blue-600 text-white':'bg-black text-white') : 'bg-slate-200 text-slate-400'}`}>{isActive?'✓':step}</div>
                        <div className={`text-[11px] ${isActive?'font-black text-[#0A1931]':'text-slate-400'}`}>{label}</div>
                        {step<4 && <div className={`hidden md:block w-6 h-[2px] ${getStepStatus(step+1)==='active'?'bg-green-400':'bg-slate-200'}`}></div>}
                      </div>
                    )
                  })}
                </div>
                <div className="text-[10px] text-slate-400 mt-3">1 nyala saat Production klik Proses Produksi • 2 nyala saat QC OK + Next Delivery • 3 & 4 dikontrol di sini</div>
              </div>

              <div className="space-y-3">
                <div className="font-bold text-[12px]">Aksi Delivery (Hanya 2 Tombol):</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button onClick={handleDikirim} disabled={selected.status==='CLOSED'} className={`px-5 py-3.5 rounded-full text-[13px] font-black shadow transition ${selected.status==='CLOSED'?'bg-slate-200 text-slate-400 cursor-not-allowed':'bg-blue-600 text-white hover:bg-blue-700'}`}>🚚 DIKIRIM</button>
                  <button onClick={handleClosed} disabled={selected.status!=='Dikirim'} className={`px-5 py-3.5 rounded-full text-[13px] font-black shadow transition ${selected.status!=='Dikirim'?'bg-slate-100 text-slate-400 border':'bg-black text-white hover:bg-slate-800'}`}>✅ CLOSED</button>
                </div>
                {selected.status!=='Dikirim' && selected.status!=='CLOSED' && <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">Klik DIKIRIM dulu sebelum bisa CLOSED</div>}
                {selected.status==='CLOSED' && <div className="text-[11px] text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-xl">✅ Order selesai - Termonitor di Dashboard Admin & Owner</div>}
              </div>

              <div className="text-[10px] text-slate-400 pt-3 border-t">Dikirim dari Production pada {selected.delivery_at?new Date(selected.delivery_at).toLocaleString('id-ID'):'-'} • Customer: {selected.customer_name} • Alamat: {selected.alamat||'-'} • HP: {selected.no_hp||'-'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
