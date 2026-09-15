"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function DeliveryPage() {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(()=>{ load() },[])
  async function load(){
    setLoading(true)
    const { data } = await supabase.from('deliveries').select('*, orders(customer_name, jumlah_porsi)').order('created_at', {ascending:false})
    setDeliveries(data||[])
    setLoading(false)
  }
  async function updateStatus(id, newStatus){
    await supabase.from('deliveries').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id)
    load()
  }
  if(loading) return <div className="p-6">Loading Delivery - Tahap 3 RBAC</div>
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Delivery - Tahap 3 RBAC (Delivery Role)</h1>
      <p className="text-sm text-slate-500">Hanya update status: Diproses → Dikemas → Dikirim → CLOSED</p>
      <div className="space-y-3">
        {deliveries.length===0 ? <div className="bg-white p-6 rounded-xl border text-sm text-slate-500">Belum ada delivery - buat order dulu di Kalkulator Order</div> :
          deliveries.map(d=>(
            <div key={d.id} className="bg-white p-4 rounded-xl border flex justify-between items-center">
              <div>
                <div className="font-semibold">{d.orders?.customer_name || 'Order'} - {d.orders?.jumlah_porsi} porsi</div>
                <div className="text-xs text-slate-500">{d.alamat || 'Alamat belum'} | Status: <span className="font-bold">{d.status}</span></div>
              </div>
              <div className="flex gap-2">
                {['Diproses','Dikemas','Dikirim','CLOSED'].map(s=>(
                  <button key={s} onClick={()=>updateStatus(d.id, s)} className={`text-xs px-3 py-1 rounded-full ${d.status===s?'bg-navy text-white':'bg-slate-100'}`}>{s}</button>
                ))}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}
