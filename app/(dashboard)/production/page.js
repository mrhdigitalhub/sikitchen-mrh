"use client"
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const PERLENGKAPAN = ['Wajan Besar','Panci Nasi','Kompor Gas','Pisau Talenan','Box Sekat 3','Sendok Saji']
const QC_LIST = ['Rasa OK','Porsi Sesuai','Box Rapi','Label Benar']
const STAFF = ['Chef A','Chef B','Helper']

function formatQty(qty, satuan='Kg'){
  const s = String(satuan).toLowerCase()
  if(s.includes('kg')){ if(qty<1) return `${(qty*1000).toFixed(0)} gram`; return Number.isInteger(qty)?`${qty} Kg`:`${qty.toFixed(2)} Kg`}
  if(s.includes('ltr')||s.includes('liter')||s==='l'){ if(qty<1) return `${(qty*1000).toFixed(0)} ml`; return `${qty.toFixed(2)} Ltr`}
  return `${Math.round(qty)} ${satuan}`
}

export default function ProduksiPage(){
  const router = useRouter()
  const [recipes,setRecipes]=useState([])
  const [orders,setOrders]=useState([])
  const [loading,setLoading]=useState(true)
  const [selectedId,setSelectedId]=useState('')
  const [filter,setFilter]=useState('Semua')
  
  const [p1Times,setP1Times]=useState({})
  const [p1Staff,setP1Staff]=useState({})
  const [p1Check,setP1Check]=useState({})
  const [p2Check,setP2Check]=useState({})
  const [p2Time,setP2Time]=useState(5)
  const [p3Time,setP3Time]=useState(90)
  const [p3Check,setP3Check]=useState(false)
  const [p4Time,setP4Time]=useState(15)
  const [p4Check,setP4Check]=useState(false)
  const [p4Foto,setP4Foto]=useState(false)
  const [p4File,setP4File]=useState(null)
  const [p6Time,setP6Time]=useState(5)
  const [p6Check,setP6Check]=useState({})
  const [p6Foto,setP6Foto]=useState(false)
  const [p6File,setP6File]=useState(null)

  async function load(){
    setLoading(true)
    const [{data:rec},{data:ord}] = await Promise.all([
      supabase.from('recipes').select('*, inventory_items(kode_bahan,nama_bahan,satuan,stok,harga_baru), menus(name)').limit(1000),
      supabase.from('orders').select('*, menus(name)').order('created_at',{ascending:false}).limit(100)
    ])
    if(rec) setRecipes(rec)
    if(ord) setOrders(ord)
    setLoading(false)
  }
  useEffect(()=>{ load() },[])
  useEffect(()=>{
    setP1Times({}); setP1Staff({}); setP1Check({});
    setP2Check({}); setP3Check(false); setP4Check(false); setP4Foto(false); setP4File(null);
    setP6Check({}); setP6Foto(false); setP6File(null);
  },[selectedId])

  const filtered = useMemo(()=> filter==='Semua'?orders:orders.filter(o=>o.status===filter),[orders,filter])
  const selected = useMemo(()=> orders.find(o=>o.id===selectedId)||null,[orders,selectedId])
  
  const detail = useMemo(()=>{
    if(!selected) return null
    const recs = recipes.filter(r=>r.menu_id===selected.menu_id)
    let totalHPP=0
    const kebutuhan = recs.map(r=>{
      const harga=Number(r.inventory_items?.harga_baru||0)
      const perPorsi=Number(r.qty_per_porsi||0)
      const total=perPorsi*Number(selected.jumlah_porsi||0)
      const stok=Number(r.inventory_items?.stok||0)
      totalHPP+=harga*total
      return {...r,perPorsi,total,stok,sisa:stok-total,cukup:stok>=total}
    })
    return {kebutuhan, allCukup: kebutuhan.every(k=>k.cukup), totalHPP}
  },[selected,recipes])

  const totalP1 = useMemo(()=> detail? detail.kebutuhan.reduce((s,_,i)=>s+Number(p1Times[i]||5),0):0 ,[p1Times,detail])
  const totalMenit = totalP1 + Number(p2Time)+Number(p3Time)+Number(p4Time)+Number(p6Time)

  // GATE LOGIC
  const isP1Done = useMemo(()=> detail && detail.kebutuhan.length>0 && detail.kebutuhan.every((_,i)=>!!p1Check[i]),[detail,p1Check])
  const isP2Done = useMemo(()=> PERLENGKAPAN.every((_,i)=>!!p2Check[i]),[p2Check])
  const isP3Done = p3Check
  const isP4Done = p4Check
  const canProsesProduksi = isP1Done && isP2Done && isP3Done && isP4Done && detail?.allCukup && selected?.status==='Draft'
  const isQCDone = Object.values(p6Check).some(v=>v)
  const canNextDelivery = isQCDone && ['Diproses','Produksi'].includes(selected?.status||'')

  async function handleProsesProduksi(){
    if(!selected||!detail) return
    if(!canProsesProduksi){ alert('Selesaikan checklist Phase 1-4 dulu Bos!'); return }
    // Potong stok
    for(const k of detail.kebutuhan){
      const newStok = Number(k.stok)-Number(k.total)
      await supabase.from('inventory_items').update({stok:newStok, stock_qty:newStok}).eq('id',k.inventory_item_id)
    }
    // Status jadi Diproses -> indikator 1 di Delivery nyala
    await supabase.from('orders').update({status:'Diproses'}).eq('id',selected.id)
    alert(`🔥 ${selected.menus?.name} PROSES PRODUKSI dimulai! Status → Diproses (Indikator Delivery 1 nyala)`)
    load()
  }

  async function handleNextDelivery(){
    if(!selected) return
    if(!isQCDone){ alert('QC wajib dichecklist dulu Bos!'); return }
    // Status jadi Dikemas -> indikator 2 di Delivery nyala
    await supabase.from('orders').update({status:'Dikemas', delivery_at: new Date().toISOString()}).eq('id',selected.id)
    alert(`📦 ${selected.customer_name} QC OK → Dikemas! Lanjut ke Delivery`)
    router.push(`/delivery?order_id=${selected.id}&customer=${encodeURIComponent(selected.customer_name||'')}`)
  }

  if(loading) return <div className="p-6 font-mono">Loading Flow 7 Phase v3...</div>

  return (
    <div className="space-y-4 p-2 md:p-4 bg-slate-50 min-h-screen" style={{fontFamily:'Inter, Arial, sans-serif'}}>
      <div className="bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center">
        <div>
          <div className="font-black text-[16px]">Produksi - Flow 7 Phase v3 (Gated)</div>
          <div className="text-[11px] text-slate-500">P1 {isP1Done?'✅':'⬜'} P2 {isP2Done?'✅':'⬜'} P3 {isP3Done?'✅':'⬜'} P4 {isP4Done?'✅':'⬜'} | QC {isQCDone?'✅':'⬜'} | Est {totalMenit}m = {(totalMenit/60).toFixed(1)}j</div>
        </div>
        <div className="bg-[#0A1931] text-white px-4 py-1.5 rounded-full text-[11px] font-bold">{orders.length} Order</div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1 bg-white rounded-2xl border shadow-sm overflow-hidden h-fit">
          <div className="bg-[#0A1931] text-white px-4 py-3 flex justify-between items-center">
            <span className="font-bold text-[12px]">DAFTAR ORDER</span>
            <select className="text-black text-[11px] rounded-lg px-2 py-1" value={filter} onChange={e=>setFilter(e.target.value)}>
              <option>Semua</option><option>Draft</option><option>Diproses</option><option>Dikemas</option><option>Dikirim</option><option>CLOSED</option>
            </select>
          </div>
          <div className="max-h-[700px] overflow-y-auto">
            {filtered.map(o=>(
              <div key={o.id} onClick={()=>setSelectedId(o.id)} className={`p-3 border-b cursor-pointer hover:bg-slate-50 text-[12px] ${selectedId===o.id?'bg-yellow-50 border-l-4 border-l-yellow-400':''}`}>
                <div className="font-bold">{o.menus?.name} - {o.jumlah_porsi} box</div>
                <div className="text-[11px] text-slate-500">{o.customer_name} • {o.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          {!selected? <div className="bg-white p-10 border rounded-2xl text-center text-slate-400">Pilih Order di kiri</div> : (
            <>
              <div className="bg-white p-4 rounded-2xl border shadow-sm flex justify-between">
                <div><b className="text-[14px]">{selected.menus?.name} - {selected.jumlah_porsi} box</b><div className="text-[11px] text-slate-500">{selected.customer_name} | {selected.status} | {totalMenit} menit</div></div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold h-fit ${detail?.allCukup?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{detail?.allCukup?'Stok OK':'Stok Kurang'}</div>
              </div>

              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="bg-blue-600 text-white px-4 py-2.5 font-bold text-[12px] flex justify-between"><span>I. PHASE 1 - Persiapan {isP1Done?'✅':''}</span><span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-[10px]">{totalP1} mnt</span></div>
                <div className="p-2 space-y-1.5 max-h-[220px] overflow-y-auto">
                  {detail?.kebutuhan.map((k,i)=>(
                    <div key={i} className="grid grid-cols-12 gap-1.5 border rounded-xl p-2 text-[11px] items-center bg-slate-50/50">
                      <div className="col-span-1 font-black">{i+1}</div>
                      <div className="col-span-5"><b>{k.inventory_items?.nama_bahan}</b><br/><span className="text-[10px] text-slate-500">{formatQty(k.total,k.inventory_items?.satuan)}</span></div>
                      <div className="col-span-3 flex gap-1 items-center"><input type="number" value={p1Times[i]||5} onChange={e=>setP1Times(p=>({...p,[i]:e.target.value}))} className="w-12 border rounded-lg px-1.5 py-1 text-[11px]"/><span className="text-[10px]">mnt</span><input type="checkbox" checked={!!p1Check[i]} onChange={e=>setP1Check(p=>({...p,[i]:e.target.checked}))} className="ml-1 w-4 h-4"/></div>
                      <div className="col-span-3"><select value={p1Staff[i]||'Chef A'} onChange={e=>setP1Staff(p=>({...p,[i]:e.target.value}))} className="w-full border rounded-lg text-[10px] px-1 py-1">{STAFF.map(s=><option key={s}>{s}</option>)}</select></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="bg-orange-500 text-white px-4 py-2.5 font-bold text-[12px] flex justify-between"><span>II. PHASE 2 - Perlengkapan {isP2Done?'✅':''}</span><div className="flex gap-1 items-center bg-white/20 px-2 py-1 rounded-full"><input type="number" value={p2Time} onChange={e=>setP2Time(e.target.value)} className="w-10 text-black rounded text-[11px] px-1"/><span className="text-[10px]">mnt</span></div></div>
                <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                  {PERLENGKAPAN.map((a,i)=>(<label key={i} className={`border rounded-xl p-2.5 flex items-center gap-2 cursor-pointer text-[11px] ${p2Check[i]?'bg-orange-50 border-orange-300 font-bold':''}`}><input type="checkbox" checked={!!p2Check[i]} onChange={e=>setP2Check(p=>({...p,[i]:e.target.checked}))} className="w-4 h-4"/>{a}</label>))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="bg-red-600 text-white px-4 py-2.5 font-bold text-[12px] flex justify-between"><span>III. PHASE 3 - Memasak {isP3Done?'✅':''}</span><div className="flex gap-2 items-center"><div className="flex gap-1 items-center bg-white/20 px-2 py-1 rounded-full"><input type="number" value={p3Time} onChange={e=>setP3Time(e.target.value)} className="w-10 text-black rounded text-[11px] px-1"/><span className="text-[10px]">mnt</span></div><input type="checkbox" checked={p3Check} onChange={e=>setP3Check(e.target.checked)} className="w-5 h-5"/></div></div>
                <div className="p-3 text-[11px] bg-red-50/50">🔥 Masak {selected.menus?.name} {selected.jumlah_porsi} porsi</div>
              </div>

              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="bg-purple-600 text-white px-4 py-2.5 font-bold text-[12px] flex justify-between"><span>IV. PHASE 4 - Penyajian {isP4Done?'✅':''}</span><div className="flex gap-2 items-center"><div className="flex gap-1 items-center bg-white/20 px-2 py-1 rounded-full"><input type="number" value={p4Time} onChange={e=>setP4Time(e.target.value)} className="w-10 text-black rounded text-[11px] px-1"/><span className="text-[10px]">mnt</span></div><input type="checkbox" checked={p4Check} onChange={e=>setP4Check(e.target.checked)} className="w-5 h-5"/></div></div>
                <div className="p-3 flex flex-col gap-2 text-[11px]"><label className="flex gap-2 items-center border rounded-xl p-2.5 cursor-pointer"><input type="checkbox" checked={p4Foto} onChange={e=>setP4Foto(e.target.checked)}/>Foto (optional)</label>{p4Foto && <input type="file" accept="image/*" onChange={e=>setP4File(e.target.files?.[0]||null)} className="text-[11px]"/>}</div>
              </div>

              <div className="bg-white rounded-2xl border shadow-sm p-4">
                <div className="font-black text-[12px] mb-3">V. PHASE 5 - Eksekusi Produksi (Tombol Baru)</div>
                {!isP1Done||!isP2Done||!isP3Done||!isP4Done ? <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-[11px]">⚠️ Selesaikan checklist Phase 1-4 dulu untuk buka tombol Proses Produksi</div> :
                selected.status==='Draft' ? <button onClick={handleProsesProduksi} className="bg-[#0A1931] text-white px-6 py-3 rounded-full text-[12px] font-black hover:bg-black">🔥 PROSES PRODUKSI - Potong Stok - {totalMenit} mnt</button> :
                selected.status==='Diproses' ? <div className="bg-yellow-50 text-yellow-800 px-4 py-2 rounded-full text-[12px] font-bold border border-yellow-200">✅ Sudah Diproses - Indikator Delivery 1 nyala - Lanjut QC Phase 6</div> :
                <div className="bg-green-50 text-green-700 px-4 py-2 rounded-full text-[12px] font-bold">✔ Status: {selected.status}</div>
                }
              </div>

              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="bg-emerald-600 text-white px-4 py-2.5 font-bold text-[12px] flex justify-between"><span>VI. PHASE 6 - QC {isQCDone?'✅':''} (Tanpa TTD)</span><div className="flex gap-1 items-center bg-white/20 px-2 py-1 rounded-full"><input type="number" value={p6Time} onChange={e=>setP6Time(e.target.value)} className="w-10 text-black rounded text-[11px] px-1"/><span className="text-[10px]">mnt</span></div></div>
                <div className="p-3 grid grid-cols-2 gap-2 text-[11px]">
                  {['Rasa OK','Porsi Sesuai','Box Rapi','Label Benar'].map((q,i)=>(<label key={i} className={`border rounded-xl p-2.5 flex gap-2 cursor-pointer ${p6Check[i]?'bg-emerald-50 border-emerald-300 font-bold':''}`}><input type="checkbox" checked={!!p6Check[i]} onChange={e=>setP6Check(p=>({...p,[i]:e.target.checked}))} className="w-4 h-4"/>{q}</label>))}
                </div>
              </div>

              <div className="bg-[#0A1931] text-white rounded-2xl p-4 shadow-lg">
                <div className="font-black text-[12px] mb-3">VII. PHASE 7 - Next Delivery (Terkunci QC)</div>
                {!isQCDone ? <div className="bg-white/10 border border-white/20 text-white/70 px-4 py-2.5 rounded-full text-[11px]">🔒 Checklist QC dulu untuk buka tombol Next Delivery</div> :
                <button onClick={handleNextDelivery} disabled={!canNextDelivery} className={`px-6 py-3 rounded-full text-[12px] font-black transition shadow ${canNextDelivery?'bg-white text-[#0A1931] hover:bg-yellow-300':'bg-slate-500 text-slate-300 cursor-not-allowed'}`}>📦 Next Delivery → {selected.customer_name} - Indikator Dikemas Nyala</button>}
                <div className="text-[10px] text-slate-400 mt-3">Flow: Draft → (Proses Produksi) → Diproses → (QC + Next Delivery) → Dikemas → Delivery → Dikirim → CLOSED</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
