"use client"
import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const STATUS_FLOW = ['Diproses','Dikemas','Dikirim','CLOSED']
const STATUS_COLOR = {
  Draft:'bg-slate-100 text-slate-600',
  Produksi:'bg-blue-100 text-blue-700',
  Selesai:'bg-green-100 text-green-700',
  Delivery:'bg-yellow-100 text-yellow-700',
  Diproses:'bg-yellow-100 text-yellow-700',
  Dikemas:'bg-orange-100 text-orange-700',
  Dikirim:'bg-blue-100 text-blue-700',
  CLOSED:'bg-black text-white'
}

export default function DeliveryPage(){
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
    // Tampilkan semua yang sudah lewat produksi
    return orders.filter(o=> ['Selesai','Delivery','Diproses','Dikemas','Dikirim','CLOSED'].includes(o.status))
  },[orders])

  const selected = useMemo(()=> orders.find(o=>o.id===selectedId)||null,[orders,selectedId])
  const filteredHighlight = customerFromUrl ? ` (Filter: ${decodeURIComponent(customerFromUrl)})` : ''

  async function updateDeliveryStatus(newStatus){
    if(!selected) return
    await supabase.from('orders').update({status:newStatus}).eq('id',selected.id)
    alert(`🚚 ${selected.customer_name} → ${newStatus}`)
    load()
  }

  if(loading) return <div className="p-6">Loading Delivery...</div>

  return (
    <div className="p-2 md:p-6 space-y-4 bg-slate-50 min-h-screen" style={{fontFamily:'Inter, Arial, sans-serif'}}>
      <div className="bg-white p-4 rounded-2xl border shadow-sm">
        <div className="font-black text-[18px]">Delivery - Tahap 3 RBAC (Delivery Role)</div>
        <div className="text-[12px] text-slate-500 mt-1">Hanya update status: Diproses → Dikemas → Dikirim → CLOSED | {deliveryOrders.length} order siap{filteredHighlight}</div>
        {orderIdFromUrl && <div className="mt-2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-xl text-[11px]">📦 Order dari Production: <b>{customerFromUrl?decodeURIComponent(customerFromUrl):orderIdFromUrl}</b> - ID: {orderIdFromUrl}</div>}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1 bg-white rounded-2xl border shadow-sm overflow-hidden h-fit">
          <div className="bg-[#0A1931] text-white px-4 py-3 font-bold text-[12px]">DAFTAR DELIVERY</div>
          <div className="max-h-[600px] overflow-y-auto">
            {deliveryOrders.length===0 ? (
              <div className="p-6 text-center text-[12px] text-slate-400">Belum ada delivery - buat order dulu di Kalkulator Order<br/><br/>Tip: Klik Next Delivery di halaman Produksi untuk kirim order kesini</div>
            ) : deliveryOrders.map(o=>(
              <div key={o.id} onClick={()=>setSelectedId(o.id)} className={`p-3 border-b cursor-pointer text-[12px] hover:bg-slate-50 ${selectedId===o.id?'bg-yellow-50 border-l-4 border-l-yellow-400':''} ${o.id===orderIdFromUrl?'bg-green-50':''}`}>
                <div className="font-bold flex justify-between"><span>{o.menus?.name} - {o.jumlah_porsi} box</span><span className={`px-2 py-0.5 rounded-full text-[9px] ${STATUS_COLOR[o.status]||'bg-slate-100'}`}>{o.status}</span></div>
                <div className="text-[11px] text-slate-500">{o.customer_name} • {new Date(o.created_at).toLocaleDateString('id-ID')}</div>
                {o.id===orderIdFromUrl && <div className="text-[10px] text-green-600 font-bold mt-1">← Baru dari Production</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          {!selected ? (
            <div className="bg-white p-10 rounded-2xl border text-center text-slate-400 text-[13px]">Pilih order di kiri untuk update status delivery</div>
          ) : (
            <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-black text-[16px]">{selected.menus?.name}</div>
                  <div className="text-[12px] text-slate-600">{selected.jumlah_porsi} porsi • {selected.customer_name}</div>
                  <div className="text-[11px] text-slate-400">ID: {selected.id}</div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[11px] font-bold ${STATUS_COLOR[selected.status]||'bg-slate-100'}`}>{selected.status}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl">
                <div className="font-bold text-[11px] mb-2">FLOW STATUS DELIVERY:</div>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_FLOW.map((s,i)=>(
                    <div key={s} className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${selected.status===s?'bg-[#0A1931] text-white': i < STATUS_FLOW.indexOf(selected.status) ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{i+1}</div>
                      <span className={`text-[11px] ${selected.status===s?'font-black':''}`}>{s}</span>
                      {i<3 && <span className="text-slate-300">→</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={()=>updateDeliveryStatus('Diproses')} className="bg-yellow-500 text-white px-4 py-2.5 rounded-full text-[12px] font-bold hover:bg-yellow-600">📦 Diproses</button>
                <button onClick={()=>updateDeliveryStatus('Dikemas')} className="bg-orange-500 text-white px-4 py-2.5 rounded-full text-[12px] font-bold hover:bg-orange-600">📦 Dikemas</button>
                <button onClick={()=>updateDeliveryStatus('Dikirim')} className="bg-blue-600 text-white px-4 py-2.5 rounded-full text-[12px] font-bold hover:bg-blue-700">🚚 Dikirim</button>
                <button onClick={()=>updateDeliveryStatus('CLOSED')} className="bg-black text-white px-4 py-2.5 rounded-full text-[12px] font-bold hover:bg-slate-800">✅ CLOSED</button>
              </div>

              <div className="text-[10px] text-slate-400 pt-2 border-t">Order ini dikirim dari Production pada {selected.delivery_at ? new Date(selected.delivery_at).toLocaleString('id-ID') : 'baru saja'} • Customer: {selected.customer_name} • Alamat: {selected.alamat||'-'} • HP: {selected.no_hp||'-'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
