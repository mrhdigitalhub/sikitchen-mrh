"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

function formatQty(qty, satuan){
  if(satuan===undefined || satuan===null) satuan='Kg'
  const s = String(satuan).toLowerCase()
  if(s.includes('kg')){
    if(qty < 0.001) return `${qty} Kg`
    if(qty < 1) return `${(qty*1000).toFixed(0)} gram`
    if(Number.isInteger(qty)) return `${qty} Kg`
    return `${qty.toFixed(2).replace(/\.00$/,'')} Kg (${(qty*1000).toFixed(0)} gram)`
  }
  if(s.includes('ltr') || s.includes('liter') || s === 'l'){
    if(qty < 1) return `${(qty*1000).toFixed(0)} ml`
    return `${qty.toFixed(3).replace(/\.?0+$/,'')} Ltr (${(qty*1000).toFixed(0)} ml)`
  }
  if(s.includes('pcs') || s.includes('buah') || s.includes('box')){
    return `${Math.round(qty)} Pcs`
  }
  return `${qty} ${satuan}`
}

export default function ProduksiTahap5() {
  const [items, setItems] = useState([])
  const [recipes, setRecipes] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [statusFilter, setStatusFilter] = useState('Semua')
  const [checkedItems, setCheckedItems] = useState({})

  async function loadAll(){
    setLoading(true)
    const { data: inv } = await supabase.from('inventory_items').select('*').order('kode_bahan').limit(500)
    const { data: rec } = await supabase.from('recipes').select('*, inventory_items(kode_bahan,nama_bahan,satuan,sub_kategori,harga_baru,stok), menus(name)').limit(1000)
    const { data: ord } = await supabase.from('orders').select('*, menus(name,harga_jual_per_porsi)').order('created_at', { ascending: false }).limit(100)
    if(inv) setItems(inv)
    if(rec) setRecipes(rec)
    if(ord) setOrders(ord)
    setLoading(false)
  }
  useEffect(()=>{ loadAll() }, [])
  useEffect(()=>{ setCheckedItems({}) }, [selectedOrderId])

  const filteredOrders = useMemo(()=>{
    if(statusFilter==='Semua') return orders
    return orders.filter(o=>o.status===statusFilter)
  }, [orders, statusFilter])

  const selectedOrder = useMemo(()=> orders.find(o=>o.id===selectedOrderId) || null, [orders, selectedOrderId])
  
  const produksiDetail = useMemo(()=>{
    if(!selectedOrder) return null
    const recs = recipes.filter(r=>r.menu_id===selectedOrder.menu_id)
    let kebutuhan = []
    let totalHPP = 0
    for(const r of recs){
      const harga = Number(r.inventory_items?.harga_baru||0)
      const qtyPerPorsi = Number(r.qty_per_porsi||r.quantity||0)
      const totalQty = qtyPerPorsi * Number(selectedOrder.jumlah_porsi||0)
      const stok = Number(r.inventory_items?.stok||0)
      const biayaPerPorsi = harga * qtyPerPorsi
      totalHPP += biayaPerPorsi * Number(selectedOrder.jumlah_porsi||0)
      kebutuhan.push({
        ...r,
        qtyPerPorsi,
        totalQty,
        stok,
        sisa: stok - totalQty,
        cukup: stok >= totalQty,
        kekurangan: Math.max(0, totalQty - stok),
        biaya: harga * totalQty
      })
    }
    return { kebutuhan, allCukup: kebutuhan.every(k=>k.cukup), totalHPP }
  }, [selectedOrder, recipes])

  async function updateStatus(newStatus){
    if(!selectedOrder) return
    if(newStatus==='Produksi' && produksiDetail && !produksiDetail.allCukup){
      if(!confirm('Stok tidak cukup! Tetap mulai produksi?')) return
    }
    if(newStatus==='Produksi' && produksiDetail){
      for(const k of produksiDetail.kebutuhan){
        const newStok = Number(k.stok) - Number(k.totalQty)
        await supabase.from('inventory_items').update({ stok: newStok, stock_qty: newStok }).eq('id', k.inventory_item_id)
      }
    }
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', selectedOrder.id)
    if(error) return alert(error.message)
    alert(`✅ ${selectedOrder.menus?.name} ${selectedOrder.jumlah_porsi} porsi → ${newStatus}`)
    loadAll()
  }

  async function batalProduksi(){
    if(!selectedOrder || selectedOrder.status!=='Produksi') return
    if(!confirm('Batalkan produksi & kembalikan stok?')) return
    if(produksiDetail){
      for(const k of produksiDetail.kebutuhan){
        const newStok = Number(k.stok) + Number(k.totalQty)
        await supabase.from('inventory_items').update({ stok: newStok, stock_qty: newStok }).eq('id', k.inventory_item_id)
      }
    }
    await supabase.from('orders').update({ status: 'Draft' }).eq('id', selectedOrder.id)
    alert('✅ Dibatalkan, stok kembali')
    loadAll()
  }

  if(loading) return <div className="p-6">Loading Produksi...</div>

  return (
    <div className="space-y-4" style={{fontFamily:'Arial, sans-serif'}}>
      <div className="bg-white p-4 rounded-xl border flex justify-between">
        <div>
          <div className="font-bold text-[20px]">Produksi - Tahap 5 (Layout Baru)</div>
          <div className="text-slate-500 text-[13px]">No Urut + Satuan Umum + Checklist Sinkron + Tombol di Bawah + Ide 30 Menu</div>
        </div>
        <div className="bg-[#0A1931] text-white px-3 py-1.5 rounded-full font-bold text-[13px]">{orders.length} Order • {filteredOrders.filter(o=>o.status==='Draft').length} Draft</div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1 bg-white rounded-xl border overflow-hidden">
          <div className="bg-[#0A1931] text-white px-4 py-3 flex justify-between">
            <span className="font-bold text-[14px]">Daftar Order ({filteredOrders.length})</span>
            <select className="text-black px-2 py-1 rounded text-[12px]" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option>Semua</option><option>Draft</option><option>Produksi</option><option>Selesai</option>
            </select>
          </div>
          <div className="max-h-[700px] overflow-y-auto">
            {filteredOrders.map(o=>(
              <div key={o.id} onClick={()=>setSelectedOrderId(o.id)} className={`p-3 border-b cursor-pointer ${selectedOrderId===o.id?'bg-[#FFF8E1] border-l-4 border-l-[#D4AF37]':''}`}>
                <div className="font-bold text-[14px]">{o.menus?.name} - {o.jumlah_porsi} porsi</div>
                <div className="text-[12px] text-slate-600">{o.customer_name} - {o.tanggal_order} - {o.id.slice(0,8)}</div>
                <div className="text-[11px]">{o.status} | HPP Rp {Number(o.total_hpp||0).toLocaleString('id-ID')}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          {!selectedOrder ? <div className="bg-white p-8 rounded-xl border text-center">Pilih Order di kiri</div> : (
            <>
              <div className="bg-white p-5 rounded-xl border">
                <div className="font-bold text-[16px]">{selectedOrder.menus?.name} - {selectedOrder.jumlah_porsi} porsi - {selectedOrder.customer_name}</div>
                <div className="text-[13px] text-slate-600">{selectedOrder.tanggal_order} - ID {selectedOrder.id.slice(0,8)} - HPP Rp {Number(selectedOrder.total_hpp||0).toLocaleString('id-ID')}</div>
                <div className="mt-2"><span className="px-3 py-1 rounded-full bg-slate-500 text-white text-[13px]">Status: {selectedOrder.status}</span></div>
              </div>

              {produksiDetail && (
                <>
                  <div className="bg-white rounded-xl border overflow-hidden">
                    <div className="bg-[#0A1931] text-white px-5 py-3 flex justify-between">
                      <span className="font-bold text-[14px]">KOTAK 1 - Kebutuhan Produksi: {selectedOrder.jumlah_porsi} porsi - {produksiDetail.kebutuhan.length} bahan</span>
                      <span className={`px-3 py-1 rounded-full font-bold text-[12px] ${produksiDetail.allCukup?'bg-green-500':'bg-red-500'}`}>{produksiDetail.allCukup?'✅ Stok Cukup':'⚠️ Kurang'}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[13px]">
                        <thead className="bg-slate-100"><tr><th className="p-2">No</th><th className="p-2 text-left">Kode - Bahan</th><th className="p-2">Qty/Porsi</th><th className="p-2">Total Butuh</th><th className="p-2">Stok</th><th className="p-2">Sisa</th><th className="p-2">Status</th></tr></thead>
                        <tbody>
                          {produksiDetail.kebutuhan.map((k, idx)=>(
                            <tr key={k.id} className="border-b">
                              <td className="p-2 text-center font-bold bg-slate-50">{idx+1}</td>
                              <td className="p-2"><b className="text-blue-700">{k.inventory_items?.kode_bahan}</b> {k.inventory_items?.nama_bahan} <span className="text-[11px] bg-slate-100 px-1 rounded">{k.inventory_items?.satuan}</span></td>
                              <td className="p-2 text-center">{formatQty(k.qtyPerPorsi, k.inventory_items?.satuan)}</td>
                              <td className="p-2 text-center font-bold bg-yellow-50">{formatQty(k.totalQty, k.inventory_items?.satuan)}</td>
                              <td className="p-2 text-center">{formatQty(k.stok, k.inventory_items?.satuan)}</td>
                              <td className="p-2 text-center font-bold text-green-700">{formatQty(k.sisa, k.inventory_items?.satuan)}</td>
                              <td className="p-2 text-center">{k.cukup?'✅':'❌'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-3 bg-blue-50 text-[12px] border-t">
                      <b>Penjelasan Beras No 1 (contoh satuan umum):</b><br/>
                      Qty/Porsi resep = 0.1 Kg = <b>100 gram</b> per porsi. Order 10 porsi × 100 gram = <b>1.000 gram = 1 Kg</b> Total Butuh.<br/>
                      Stok sekarang 170 Kg - Total Butuh 1 Kg = <b>Sisa 169 Kg</b> setelah potong. Jadi <b>1.000 di tabel lama = 1 Kg, bukan 1.000 Kg (seribu Kg)!</b> Seribu Kg itu 1 Ton untuk 10.000 porsi!<br/>
                      <span className="text-slate-600">Format baru: &lt;1 Kg pakai gram (800 gram), &lt;1 Ltr pakai ml (150 ml), Pcs pakai Pcs (10 Pcs)</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border overflow-hidden">
                    <div className="bg-yellow-50 border-b px-5 py-3 font-bold text-[14px]">📋 KOTAK 2 - Checklist Produksi (No sinkron dengan Kotak 1)</div>
                    <div className="p-4 grid md:grid-cols-2 gap-2 text-[13px]">
                      {produksiDetail.kebutuhan.map((k, idx)=>(
                        <label key={k.id} className={`p-2 rounded border flex gap-2 cursor-pointer ${checkedItems[idx]?'bg-green-50':''}`}>
                          <span className="w-6 h-6 rounded-full bg-[#0A1931] text-white flex items-center justify-center text-[11px] font-bold shrink-0">{idx+1}</span>
                          <input type="checkbox" checked={!!checkedItems[idx]} onChange={e=>setCheckedItems(p=>({...p,[idx]:e.target.checked}))} />
                          <span className={checkedItems[idx]?'line-through':''}>{idx+1}. Siapkan {k.inventory_items?.nama_bahan} = {formatQty(k.totalQty, k.inventory_items?.satuan)} ({k.inventory_items?.kode_bahan})</span>
                        </label>
                      ))}
                      <label className="p-2 rounded border flex gap-2"><span className="w-6 h-6 rounded-full bg-slate-500 text-white flex items-center justify-center text-[11px] font-bold">{produksiDetail.kebutuhan.length+1}</span><input type="checkbox" /> Masak {selectedOrder.menus?.name}</label>
                      <label className="p-2 rounded border flex gap-2"><span className="w-6 h-6 rounded-full bg-slate-500 text-white flex items-center justify-center text-[11px] font-bold">{produksiDetail.kebutuhan.length+2}</span><input type="checkbox" /> Packing {selectedOrder.jumlah_porsi} box</label>
                      <label className="p-2 rounded border flex gap-2 md:col-span-2"><span className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-[11px] font-bold">{produksiDetail.kebutuhan.length+3}</span><input type="checkbox" /> QC - Delivery {selectedOrder.customer_name}</label>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border">
                    <div className="font-bold mb-3">AKSI - Tombol di Bawah</div>
                    <div className="flex gap-3">
                      {selectedOrder.status==='Draft' && <button onClick={()=>updateStatus('Produksi')} className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold">🔥 Mulai Produksi - Potong Stok {produksiDetail.kebutuhan.length} bahan</button>}
                      {selectedOrder.status==='Produksi' && <><button onClick={()=>updateStatus('Selesai')} className="bg-green-600 text-white px-6 py-3 rounded-full font-bold">✅ Selesai</button><button onClick={batalProduksi} className="bg-red-100 text-red-700 px-4 py-2 rounded-full">↩️ Batal</button></>}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="bg-[#0A1931] text-white p-5 rounded-xl text-[13px]">
        <b>💡 Ide 30 Menu / 1 Pesanan (Nasi Kotak Besar):</b><br/>
        1. Tab Kategori: Nasi (5) | Lauk Utama (10) | Sayur (8) | Pelengkap (7) - tiap tab No 1..n<br/>
        2. Gabung Duplicate: 30 menu pakai Beras sama → total 1 bahan, bukan 30 baris. Hitung total gabungan + expand per menu.<br/>
        3. Batch Produksi: Batch 1 (Menu 1-10), Batch 2 (11-20), Batch 3 (21-30) + progress bar + filter hanya kurang stok.
      </div>
    </div>
  )
}
