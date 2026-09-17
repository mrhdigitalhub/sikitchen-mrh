"use client"
import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

function DeliveryInner(){
  const searchParams = useSearchParams()
  const orderIdFromUrl = searchParams.get('order_id')
  const [orders,setOrders]=useState([])
  const [loading,setLoading]=useState(true)
  const [selectedId,setSelectedId]=useState(orderIdFromUrl||'')

  async function load(){
    const {data} = await supabase.from('orders').select('*, menus(name)').order('created_at',{ascending:false}).limit(100)
    if(data) {
      setOrders(data)
      // FIX: kalau selectedId ada, pastikan selected ikut ke-update
      if(selectedId){
        const updated = data.find(o=>o.id===selectedId)
        if(updated) console.log('Updated status:', updated.status)
      }
    }
    setLoading(false)
  }
  useEffect(()=>{ load() },[])
  useEffect(()=>{ if(orderIdFromUrl) setSelectedId(orderIdFromUrl) },[orderIdFromUrl])

  const deliveryOrders = useMemo(()=> orders.filter(o=> ['Diproses','Dikemas','Dikirim','CLOSED','Delivery','Selesai'].includes(o.status)),[orders])
  const selected = useMemo(()=> orders.find(o=>o.id===selectedId)||null,[orders,selectedId])

  const getStep = (step)=>{
    if(!selected) return false
    const s = selected.status
    if(step===1) return ['Diproses','Dikemas','Dikirim','CLOSED'].includes(s)
    if(step===2) return ['Dikemas','Dikirim','CLOSED'].includes(s)
    if(step===3) return ['Dikirim','CLOSED'].includes(s)
    if(step===4) return s==='CLOSED'
    return false
  }

  async function handleDikirim(){
    if(!selected) return
    const {error} = await supabase.from('orders').update({status:'Dikirim'}).eq('id',selected.id)
    if(error){ alert('Gagal: '+error.message); return }
    // Optimistic update biar langsung berubah warna
    setOrders(prev=> prev.map(o=> o.id===selected.id ? {...o, status:'Dikirim'} : o))
    alert(`🚚 ${selected.customer_name} → Dikirim!`)
  }
  async function handleClosed(){
    if(!selected) return
    if(!confirm(`Tutup order ${selected.customer_name}?`)) return
    const {error} = await supabase.from('orders').update({status:'CLOSED', closed_at: new Date().toISOString()}).eq('id',selected.id)
    if(error){ alert('Gagal: '+error.message+' - cek RLS policy'); return }
    // Optimistic update - INI YANG BIKIN INDIKATOR 4 LANGSUNG HITAM
    setOrders(prev=> prev.map(o=> o.id===selected.id ? {...o, status:'CLOSED'} : o))
    alert(`✅ ${selected.customer_name} CLOSED - Indikator 4 harusnya hitam sekarang!`)
    // Force reload dari DB untuk pastikan
    setTimeout(()=>load(), 500)
  }

  if(loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-2 md:p-6 space-y-4 bg-slate-50 min-h-screen">
      <div className="bg-white p-4 rounded-2xl border shadow-sm">
        <div className="font-black text-[18px]">Delivery - Tahap 3 RBAC v3.1 (Fix CLOSED Hitam)</div>
        <div className="text-[12px] text-slate-500 mt-1">Flow: Diproses → Dikemas → Dikirim → CLOSED | {deliveryOrders.length} order | Fix: Indikator CLOSED langsung hitam</div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1 bg-white rounded-2xl border shadow-sm overflow-hidden h-fit">
          <div className="bg-[#0A1931] text-white px-4 py-3 font-bold text-[12px]">DAFTAR DELIVERY</div>
          <div className="max-h-[600px] overflow-y-auto">
            {deliveryOrders.map(o=>(
              <div key={o.id} onClick={()=>setSelectedId(o.id)} className={`p-3 border-b cursor-pointer text-[12px] ${selectedId===o.id?'bg-yellow-50 border-l-4 border-l-yellow-400':''} ${o.status==='CLOSED'?'bg-slate-900 text-white':''}`}>
                <div className="font-bold flex justify-between"><span>{o.menus?.name} - {o.jumlah_porsi} box</span><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${o.status==='CLOSED'?'bg-white text-black':o.status==='Dikirim'?'bg-blue-100 text-blue-700':'bg-yellow-100'}`}>{o.status}</span></div>
                <div className="text-[11px] opacity-70">{o.customer_name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          {!selected ? <div className="bg-white p-10 rounded-2xl border text-center text-slate-400">Pilih order</div> : (
            <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-5">
              <div className="flex justify-between"><div><div className="font-black text-[16px]">{selected.menus?.name}</div><div className="text-[12px]">{selected.jumlah_porsi} porsi • {selected.customer_name}</div></div><div className={`px-3 py-1 rounded-full text-[11px] font-bold ${selected.status==='CLOSED'?'bg-black text-white':selected.status==='Dikirim'?'bg-blue-100 text-blue-700':'bg-orange-100'}`}>{selected.status}</div></div>

              <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed">
                <div className="font-bold text-[11px] mb-3">FLOW STATUS (Fix: No 4 CLOSED harus hitam setelah klik):</div>
                <div className="flex gap-3 flex-wrap">
                  <div className="flex items-center gap-2"><div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${getStep(1)?'bg-yellow-500':'bg-slate-300'}`}>{getStep(1)?'✓':'1'}</div><span className={`text-[11px] ${getStep(1)?'font-black':''}`}>Diproses</span></div>
                  <div className="flex items-center gap-2"><div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${getStep(2)?'bg-orange-500':'bg-slate-300'}`}>{getStep(2)?'✓':'2'}</div><span className={`text-[11px] ${getStep(2)?'font-black':''}`}>Dikemas</span></div>
                  <div className="flex items-center gap-2"><div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${getStep(3)?'bg-blue-600':'bg-slate-300'}`}>{getStep(3)?'✓':'3'}</div><span className={`text-[11px] ${getStep(3)?'font-black':''}`}>Dikirim</span></div>
                  <div className="flex items-center gap-2"><div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${getStep(4)?'bg-black':'bg-slate-300'} border-2 ${getStep(4)?'border-black':''}`}>{getStep(4)?'✓':'4'}</div><span className={`text-[11px] ${getStep(4)?'font-black text-black':'text-slate-400'}`}>CLOSED</span></div>
                </div>
                {selected.status==='CLOSED' && <div className="mt-3 bg-black text-white px-3 py-2 rounded-xl text-[11px] font-bold">✅ Order CLOSED - Selesai termonitor Admin & Owner - Flow Complete!</div>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleDikirim} className={`py-3.5 rounded-full font-black text-[13px] ${selected.status==='CLOSED'?'bg-slate-200 text-slate-400':'bg-blue-600 text-white'}`}>🚚 DIKIRIM</button>
                <button onClick={handleClosed} className={`py-3.5 rounded-full font-black text-[13px] ${selected.status==='CLOSED'?'bg-green-600 text-white':'bg-black text-white'}`}>{selected.status==='CLOSED'?'✅ SUDAH CLOSED':'✅ CLOSED'}</button>
              </div>
              <div className="text-[10px] text-slate-400">ID: {selected.id} • Status di DB: {selected.status}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Page(){
  return <Suspense fallback={<div className="p-6">Loading...</div>}><DeliveryInner/></Suspense>
}
