"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

function formatQty(qty, satuan){
  if(satuan==null) satuan='Kg'
  const s = String(satuan).toLowerCase()
  if(s.includes('kg')){
    if(qty < 1) return `${(qty*1000).toFixed(0)} gram`
    if(Number.isInteger(qty)) return `${qty} Kg`
    return `${qty.toFixed(2)} Kg (${(qty*1000).toFixed(0)} gram)`
  }
  if(s.includes('ltr') || s.includes('liter') || s === 'l'){
    if(qty < 1) return `${(qty*1000).toFixed(0)} ml`
    return `${qty.toFixed(2)} Ltr (${(qty*1000).toFixed(0)} ml)`
  }
  if(s.includes('pcs') || s.includes('box')) return `${Math.round(qty)} Pcs`
  return `${qty} ${satuan}`
}

export default function ProduksiTahap5() {
  const [recipes, setRecipes] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [statusFilter, setStatusFilter] = useState('Semua')
  const [phase1Times, setPhase1Times] = useState({})
  const [phase1Staff, setPhase1Staff] = useState({})
  const [phase1Checked, setPhase1Checked] = useState({})
  const [phase2Checked, setPhase2Checked] = useState({})
  const [phase2Time, setPhase2Time] = useState(5)
  const [phase3Time, setPhase3Time] = useState(90)
  const [phase3Checked, setPhase3Checked] = useState(false)
  const [phase4Time, setPhase4Time] = useState(15)
  const [phase4Checked, setPhase4Checked] = useState(false)
  const [phase4Foto, setPhase4Foto] = useState(false)
  const [phase6QCChecked, setPhase6QCChecked] = useState({})
  const [phase6Time, setPhase6Time] = useState(5)
  const [phase6Foto, setPhase6Foto] = useState(false)

  async function loadAll(){
    setLoading(true)
    const { data: rec } = await supabase.from('recipes').select('*, inventory_items(kode_bahan,nama_bahan,satuan,sub_kategori,harga_baru,stok), menus(name)').limit(1000)
    const { data: ord } = await supabase.from('orders').select('*, menus(name,harga_jual_per_porsi)').order('created_at', { ascending: false }).limit(100)
    if(rec) setRecipes(rec)
    if(ord) setOrders(ord)
    setLoading(false)
  }
  useEffect(()=>{ loadAll() }, [])
  useEffect(()=>{ setPhase1Times({}); setPhase1Checked({}); setPhase2Checked({}); setPhase3Checked(false); setPhase4Checked(false); setPhase6QCChecked({}) }, [selectedOrderId])

  const filteredOrders = useMemo(()=> statusFilter==='Semua'?orders:orders.filter(o=>o.status===statusFilter), [orders, statusFilter])
  const selectedOrder = useMemo(()=> orders.find(o=>o.id===selectedOrderId) || null, [orders, selectedOrderId])
  const produksiDetail = useMemo(()=>{
    if(!selectedOrder) return null
    const recs = recipes.filter(r=>r.menu_id===selectedOrder.menu_id)
    let kebutuhan=[]; let totalHPP=0
    for(const r of recs){
      const harga=Number(r.inventory_items?.harga_baru||0)
      const qtyPerPorsi=Number(r.qty_per_porsi||0)
      const totalQty=qtyPerPorsi*Number(selectedOrder.jumlah_porsi||0)
      const stok=Number(r.inventory_items?.stok||0)
      totalHPP+=harga*qtyPerPorsi*Number(selectedOrder.jumlah_porsi||0)
      kebutuhan.push({...r,qtyPerPorsi,totalQty,stok,sisa:stok-totalQty,cukup:stok>=totalQty})
    }
    return {kebutuhan, allCukup:kebutuhan.every(k=>k.cukup), totalHPP}
  }, [selectedOrder, recipes])

  const totalPhase1Time = useMemo(()=> produksiDetail? produksiDetail.kebutuhan.reduce((s,k,i)=>s+Number(phase1Times[i]||5),0) : 0, [phase1Times, produksiDetail])
  const totalEstimasi = totalPhase1Time + Number(phase2Time||0) + Number(phase3Time||0) + Number(phase4Time||0) + Number(phase6Time||0)

  async function updateStatus(newStatus){
    if(!selectedOrder) return
    if(newStatus==='Produksi' && produksiDetail){
      for(const k of produksiDetail.kebutuhan){
        const newStok=Number(k.stok)-Number(k.totalQty)
        await supabase.from('inventory_items').update({stok:newStok,stock_qty:newStok}).eq('id',k.inventory_item_id)
      }
    }
    await supabase.from('orders').update({status:newStatus}).eq('id',selectedOrder.id)
    alert(`✅ ${selectedOrder.menus?.name} → ${newStatus} - Estimasi ${totalEstimasi} menit`)
    loadAll()
  }

  if(loading) return <div className="p-6">Loading Flow 7...</div>
  return (
    <div className="space-y-4" style={{fontFamily:'Arial, sans-serif'}}>
      <div className="bg-white p-4 rounded-xl border flex justify-between">
        <div><div className="font-bold text-[18px]">Produksi - Flow 7 Phase Modern (Perbaikan Bos)</div><div className="text-[11px] text-slate-500">Phase1 OK | Phase2 Checklist saja (QR & Ya/Tidak dihapus) | Phase3 OK | Phase4 Foto Optional | Phase5 OK | Phase6 Foto Optional tanpa tanda tangan | Phase7 OK - Total {totalEstimasi} menit</div></div>
        <div className="bg-[#0A1931] text-white px-3 py-1 rounded-full text-[12px]">{orders.length} Order</div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1 bg-white rounded-xl border overflow-hidden">
          <div className="bg-[#0A1931] text-white px-4 py-2 flex justify-between"><span className="font-bold text-[13px]">Daftar Order</span><select className="text-black text-[11px] rounded px-1" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>Semua</option><option>Draft</option><option>Produksi</option><option>Selesai</option></select></div>
          <div className="max-h-[600px] overflow-y-auto">{filteredOrders.map(o=>(<div key={o.id} onClick={()=>setSelectedOrderId(o.id)} className={`p-2 border-b cursor-pointer text-[12px] ${selectedOrderId===o.id?'bg-yellow-50 border-l-4 border-l-yellow-500':''}`}><b>{o.menus?.name} - {o.jumlah_porsi} porsi</b><div>{o.customer_name}</div></div>))}</div>
        </div>
        <div className="md:col-span-2 space-y-3">
          {!selectedOrder? <div className="bg-white p-6 border rounded-xl text-center">Pilih Order</div> : (
            <>
              <div className="bg-white p-3 rounded-xl border"><b>{selectedOrder.menus?.name} - {selectedOrder.jumlah_porsi} porsi - {selectedOrder.customer_name}</b><div className="text-[11px]">Estimasi {totalEstimasi} menit = {(totalEstimasi/60).toFixed(1)} jam</div></div>

              <div className="bg-white rounded-xl border"><div className="bg-blue-600 text-white px-3 py-2 font-bold text-[13px] flex justify-between"><span>I. PHASE 1 - Persiapan Bahan (Dropdown Pesanan + Menit + Staff) - OK</span><span className="bg-white text-blue-600 px-2 rounded text-[11px]">{totalPhase1Time} menit</span></div><div className="p-2 space-y-1">{produksiDetail?.kebutuhan.map((k,i)=>(<div key={i} className="grid grid-cols-12 gap-1 border p-1 rounded text-[11px] items-center"><div className="col-span-1 font-bold">{i+1}</div><div className="col-span-4">{k.inventory_items?.nama_bahan} = {formatQty(k.totalQty,k.inventory_items?.satuan)}</div><div className="col-span-2"><select className="w-full border rounded text-[10px]"><option>{selectedOrder.menus?.name}</option></select></div><div className="col-span-2 flex gap-1"><input type="number" value={phase1Times[i]||5} onChange={e=>setPhase1Times(p=>({...p,[i]:e.target.value}))} className="w-10 border rounded px-1 text-[10px]"/><span className="text-[10px]">menit</span><input type="checkbox" checked={!!phase1Checked[i]} onChange={e=>setPhase1Checked(p=>({...p,[i]:e.target.checked}))}/></div><div className="col-span-3"><select value={phase1Staff[i]||'Chef A'} onChange={e=>setPhase1Staff(p=>({...p,[i]:e.target.value}))} className="w-full border rounded text-[10px]"><option>Chef A</option><option>Chef B</option><option>Helper</option></select></div></div>))}</div></div>

              <div className="bg-white rounded-xl border"><div className="bg-orange-500 text-white px-3 py-2 font-bold text-[13px] flex justify-between"><span>II. PHASE 2 - Perlengkapan Masak - Checklist Saja (Perbaikan Bos)</span><div className="flex gap-1 items-center"><input type="number" value={phase2Time} onChange={e=>setPhase2Time(e.target.value)} className="w-10 text-black rounded text-[10px] px-1"/><span className="text-[10px]">menit</span></div></div><div className="p-2 grid grid-cols-2 gap-1 text-[11px]">{['Wajan Besar','Panci Nasi','Kompor Gas','Pisau Talenan','Box Sekat 3','Sendok Saji'].map((a,i)=>(<label key={i} className="border p-1 rounded flex gap-1"><input type="checkbox" checked={!!phase2Checked[i]} onChange={e=>setPhase2Checked(p=>({...p,[i]:e.target.checked}))}/>{a}</label>))}</div></div>

              <div className="bg-white rounded-xl border"><div className="bg-red-600 text-white px-3 py-2 font-bold text-[13px] flex justify-between"><span>III. PHASE 3 - Proses Memasak - OK</span><div className="flex gap-1 items-center"><input type="number" value={phase3Time} onChange={e=>setPhase3Time(e.target.value)} className="w-10 text-black rounded text-[10px] px-1"/><span className="text-[10px]">menit</span><input type="checkbox" checked={phase3Checked} onChange={e=>setPhase3Checked(e.target.checked)}/></div></div><div className="p-2 text-[11px]">Masak {selectedOrder.menus?.name} {selectedOrder.jumlah_porsi} porsi</div></div>

              <div className="bg-white rounded-xl border"><div className="bg-purple-600 text-white px-3 py-2 font-bold text-[13px] flex justify-between"><span>IV. PHASE 4 - Penyajian (Foto Optional - Perbaikan Bos)</span><div className="flex gap-1 items-center"><input type="number" value={phase4Time} onChange={e=>setPhase4Time(e.target.value)} className="w-10 text-black rounded text-[10px] px-1"/><span className="text-[10px]">menit</span><input type="checkbox" checked={phase4Checked} onChange={e=>setPhase4Checked(e.target.checked)}/></div></div><div className="p-2 text-[11px] flex gap-2"><label className="flex gap-1"><input type="checkbox" checked={phase4Foto} onChange={e=>setPhase4Foto(e.target.checked)}/>Foto hasil (optional)</label><span>Packing {selectedOrder.jumlah_porsi} box</span></div></div>

              <div className="bg-white rounded-xl border p-3"><div className="font-bold text-[13px] mb-2">V. PHASE 5 - Tombol Proses Selesai - OK</div>{selectedOrder.status==='Draft' && <button onClick={()=>updateStatus('Produksi')} className="bg-blue-600 text-white px-5 py-2 rounded-full text-[12px] font-bold">🔥 Mulai Produksi - Potong Stok - {totalEstimasi} menit</button>}{selectedOrder.status==='Produksi' && <button onClick={()=>updateStatus('Selesai')} className="bg-green-600 text-white px-5 py-2 rounded-full text-[12px] font-bold">✅ Proses Selesai</button>}</div>

              <div className="bg-white rounded-xl border"><div className="bg-green-600 text-white px-3 py-2 font-bold text-[13px] flex justify-between"><span>VI. PHASE 6 - QC (Foto Optional, Tanda Tangan Dihilangkan - Perbaikan Bos)</span><div className="flex gap-1 items-center"><input type="number" value={phase6Time} onChange={e=>setPhase6Time(e.target.value)} className="w-10 text-black rounded text-[10px] px-1"/><span className="text-[10px]">menit</span></div></div><div className="p-2 grid grid-cols-2 gap-1 text-[11px]">{['Rasa OK','Porsi Sesuai','Box Rapi','Label Benar'].map((q,i)=>(<label key={i} className="border p-1 rounded flex gap-1"><input type="checkbox" checked={!!phase6QCChecked[i]} onChange={e=>setPhase6QCChecked(p=>({...p,[i]:e.target.checked}))}/>{q}</label>))}<label className="border p-1 rounded flex gap-1 col-span-2"><input type="checkbox" checked={phase6Foto} onChange={e=>setPhase6Foto(e.target.checked)}/>Foto QC (optional)</label></div></div>

              <div className="bg-white rounded-xl border p-3"><div className="font-bold text-[13px] mb-2">VII. PHASE 7 - Next Delivery - OK</div><button className="bg-[#0A1931] text-white px-5 py-2 rounded-full text-[12px] font-bold">🚚 Next Delivery - {selectedOrder.customer_name}</button><div className="text-[10px] text-slate-500 mt-1">Total {totalEstimasi} menit = {(totalEstimasi/60).toFixed(1)} jam | Phase1 {totalPhase1Time} + Phase2 {phase2Time} + Phase3 {phase3Time} + Phase4 {phase4Time} + Phase6 {phase6Time}</div></div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}