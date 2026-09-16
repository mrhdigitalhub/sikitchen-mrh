"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function ProduksiTahap5() {
  const [items, setItems] = useState([])
  const [menus, setMenus] = useState([])
  const [recipes, setRecipes] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [statusFilter, setStatusFilter] = useState('Semua')

  async function loadAll(){
    setLoading(true)
    const { data: inv } = await supabase.from('inventory_items').select('*').order('kode_bahan').limit(500)
    const { data: m } = await supabase.from('menus').select('*').limit(100)
    const { data: rec } = await supabase.from('recipes').select('*, inventory_items(kode_bahan,nama_bahan,satuan,sub_kategori,harga_baru,stok), menus(name)').limit(1000)
    const { data: ord } = await supabase.from('orders').select('*, menus(name,harga_jual_per_porsi)').order('created_at', { ascending: false }).limit(100)
    if(inv) setItems(inv)
    if(m) setMenus(m)
    if(rec) setRecipes(rec)
    if(ord) setOrders(ord)
    setLoading(false)
  }
  useEffect(()=>{ loadAll() }, [])

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
        cukup: stok >= totalQty,
        kekurangan: Math.max(0, totalQty - stok),
        biaya: harga * totalQty
      })
    }
    const allCukup = kebutuhan.every(k=>k.cukup)
    return { recs, kebutuhan, allCukup, totalHPP }
  }, [selectedOrder, recipes])

  async function updateStatus(newStatus){
    if(!selectedOrder) return
    if(newStatus==='Produksi'){
      if(produksiDetail && !produksiDetail.allCukup){
        if(!confirm('Stok tidak cukup! Tetap mulai produksi? Stock akan minus!')) return
      }
      // Potong stok inventory_items
      if(produksiDetail){
        for(const k of produksiDetail.kebutuhan){
          const invId = k.inventory_item_id
          const newStok = Number(k.stok) - Number(k.totalQty)
          const { error } = await supabase.from('inventory_items').update({ stok: newStok, stock_qty: newStok }).eq('id', invId)
          if(error) console.log('Error potong stok', k.inventory_items?.kode_bahan, error.message)
        }
      }
    }
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', selectedOrder.id)
    if(error) return alert(error.message)
    alert(`✅ Order ${selectedOrder.menus?.name} ${selectedOrder.jumlah_porsi} porsi - ${selectedOrder.customer_name} status ${selectedOrder.status} → ${newStatus}${newStatus==='Produksi'?' - Stok dipotong!':''}`)
    loadAll()
  }

  async function batalProduksi(){
    if(!selectedOrder) return
    if(selectedOrder.status!=='Produksi') return alert('Hanya order status Produksi yang bisa dibatalkan & stok dikembalikan')
    if(!confirm(`Batalkan produksi ${selectedOrder.menus?.name} ${selectedOrder.jumlah_porsi} porsi? Stok akan dikembalikan!`)) return
    if(produksiDetail){
      for(const k of produksiDetail.kebutuhan){
        const invId = k.inventory_item_id
        const newStok = Number(k.stok) + Number(k.totalQty)
        await supabase.from('inventory_items').update({ stok: newStok, stock_qty: newStok }).eq('id', invId)
      }
    }
    await supabase.from('orders').update({ status: 'Draft' }).eq('id', selectedOrder.id)
    alert('✅ Produksi dibatalkan, stok dikembalikan, status → Draft')
    loadAll()
  }

  if(loading) return <div className="p-6" style={{fontFamily:'Arial, sans-serif', fontSize:'16px'}}>Loading Produksi Tahap 5...</div>

  return (
    <div className="space-y-4" style={{fontFamily:'Arial, sans-serif'}}>
      <div className="bg-white p-4 rounded-xl border flex justify-between items-start">
        <div>
          <div className="font-bold" style={{fontSize:'20px'}}>Produksi - Tahap 5</div>
          <div className="text-slate-500 mt-1" style={{fontSize:'14px'}}>Ambil Order dari Kalkulator Order • Mulai Produksi = Potong Stok {items.length} bahan • Selesai = Siap Delivery • Arial +2px</div>
        </div>
        <div className="bg-[#0A1931] text-white px-3 py-1.5 rounded-full font-bold" style={{fontSize:'13px'}}>{orders.length} Order • {filteredOrders.filter(o=>o.status==='Draft').length} Draft • {filteredOrders.filter(o=>o.status==='Produksi').length} Produksi • {filteredOrders.filter(o=>o.status==='Selesai').length} Selesai</div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1 bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-[#0A1931] text-white px-4 py-3 flex justify-between items-center">
            <span className="font-bold" style={{fontSize:'14px'}}>Daftar Order ({filteredOrders.length}/{orders.length})</span>
            <select className="text-black px-2 py-1 rounded text-[12px]" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="Semua">Semua</option><option value="Draft">Draft</option><option value="Produksi">Produksi</option><option value="Selesai">Selesai</option>
            </select>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {filteredOrders.length===0 ? <div className="p-4 text-slate-500" style={{fontSize:'13px'}}>Belum ada order. Buat dulu di Kalkulator Order - Daging rendang 10 porsi Ibu mimin 18/09/2026</div> :
            filteredOrders.map(o=>{
              const isSelected = selectedOrderId===o.id
              return (
                <div key={o.id} onClick={()=>setSelectedOrderId(o.id)} className={`p-3 border-b cursor-pointer hover:bg-slate-50 ${isSelected?'bg-[#FFF8E1] border-l-4 border-l-[#D4AF37]':''}`}>
                  <div className="font-bold" style={{fontSize:'14px'}}>{o.menus?.name||'Menu'} - {o.jumlah_porsi} porsi</div>
                  <div style={{fontSize:'12px'}} className="text-slate-600">{o.customer_name} - {o.tanggal_order||o.created_at?.slice(0,10)} - {o.id.slice(0,8)}</div>
                  <div className="flex gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-white ${o.status==='Draft'?'bg-slate-500':o.status==='Produksi'?'bg-blue-600':'bg-green-600'}`} style={{fontSize:'11px'}}>{o.status}</span>
                    <span style={{fontSize:'11px'}}>HPP Rp {Number(o.total_hpp||0).toLocaleString('id-ID')} | Jual Rp {Number(o.total_jual||0).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          {!selectedOrder ? (
            <div className="bg-white p-8 rounded-xl border text-center">
              <div className="font-bold" style={{fontSize:'16px'}}>Pilih Order di kiri untuk mulai Produksi</div>
              <div className="text-slate-500 mt-2" style={{fontSize:'13px'}}>Contoh: Daging rendang 10 porsi Ibu mimin 18/09/2026 - Draft → Produksi (potong stok BHN-POK-001 Beras 1 Kg, BHN-HEW-003 Daging 0.8 Kg, BHN-SAO-002 Minyak 0.15 Ltr) → Selesai → Delivery</div>
            </div>
          ) : (
            <>
              <div className="bg-white p-5 rounded-xl border shadow-sm">
                <div className="font-bold" style={{fontSize:'16px'}}>{selectedOrder.menus?.name} - {selectedOrder.jumlah_porsi} porsi - {selectedOrder.customer_name}</div>
                <div style={{fontSize:'13px'}} className="text-slate-600 mt-1">{selectedOrder.tanggal_order} - ID {selectedOrder.id.slice(0,8)} - HPP Rp {Number(selectedOrder.total_hpp||0).toLocaleString('id-ID')} - Jual Rp {Number(selectedOrder.total_jual||0).toLocaleString('id-ID')} - Profit Rp {Number(selectedOrder.total_profit||0).toLocaleString('id-ID')}</div>
                <div className="mt-3 flex gap-2">
                  <span className={`px-3 py-1 rounded-full font-bold text-white ${selectedOrder.status==='Draft'?'bg-slate-500':selectedOrder.status==='Produksi'?'bg-blue-600':'bg-green-600'}`} style={{fontSize:'13px'}}>Status: {selectedOrder.status}</span>
                  {selectedOrder.status==='Draft' && <button onClick={()=>updateStatus('Produksi')} className="bg-blue-600 text-white px-5 py-2 rounded-full font-bold" style={{fontSize:'13px'}}>🔥 Mulai Produksi - Potong Stok {produksiDetail?.kebutuhan.length} bahan</button>}
                  {selectedOrder.status==='Produksi' && (
                    <>
                      <button onClick={()=>updateStatus('Selesai')} className="bg-green-600 text-white px-5 py-2 rounded-full font-bold" style={{fontSize:'13px'}}>✅ Selesai Produksi - Siap Delivery</button>
                      <button onClick={batalProduksi} className="bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-full font-bold" style={{fontSize:'13px'}}>↩️ Batal & Kembalikan Stok</button>
                    </>
                  )}
                  {selectedOrder.status==='Selesai' && <span className="bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-full font-bold" style={{fontSize:'13px'}}>✅ Siap Delivery - Lihat di Delivery</span>}
                </div>
              </div>

              {produksiDetail && (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <div className="bg-[#0A1931] text-white px-5 py-3 flex justify-between items-center">
                    <span className="font-bold" style={{fontSize:'15px'}}>Kebutuhan Produksi: {selectedOrder.menus?.name} - {selectedOrder.jumlah_porsi} porsi - {produksiDetail.kebutuhan.length} bahan</span>
                    <span className={`px-3 py-1 rounded-full font-bold ${produksiDetail.allCukup?'bg-green-500':'bg-red-500'}`} style={{fontSize:'12px'}}>{produksiDetail.allCukup?'✅ Stok Cukup':'⚠️ Stok Kurang'}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full" style={{fontSize:'13px'}}>
                      <thead className="bg-slate-100"><tr><th className="p-2 text-left">Kode - Bahan - Sub</th><th className="p-2">Qty/Porsi</th><th className="p-2">Total Butuh</th><th className="p-2">Stok Sekarang</th><th className="p-2">Sisa Setelah Potong</th><th className="p-2">Status</th></tr></thead>
                      <tbody>
                        {produksiDetail.kebutuhan.map(k=>{
                          const inv = k.inventory_items
                          const sisa = k.stok - k.totalQty
                          return (
                            <tr key={k.id} className={`border-b ${k.cukup?'':'bg-red-50'}`}>
                              <td className="p-2"><b className="font-mono text-blue-700">{inv?.kode_bahan}</b> {inv?.nama_bahan} <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold" style={{fontSize:'11px'}}>{inv?.sub_kategori||'-'}</span> <span className="bg-slate-100 px-1.5 py-0.5 rounded" style={{fontSize:'11px'}}>{inv?.satuan||'Kg'}</span></td>
                              <td className="p-2 text-center">{k.qtyPerPorsi} {inv?.satuan||'Kg'}</td>
                              <td className="p-2 text-center font-bold bg-yellow-50">{k.totalQty.toFixed(3)} {inv?.satuan||'Kg'}</td>
                              <td className="p-2 text-center">{k.stok} {inv?.satuan||'Kg'}</td>
                              <td className="p-2 text-center font-bold"><span className={sisa>=0?'text-green-700':'text-red-700'}>{sisa.toFixed(3)} {inv?.satuan||'Kg'}</span></td>
                              <td className="p-2 text-center"><span className={`px-2 py-1 rounded-full font-bold text-white ${k.cukup?'bg-green-600':'bg-red-600'}`} style={{fontSize:'11px'}}>{k.cukup?'✅ Cukup':'❌ Kurang'}</span></td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="bg-[#FFF8E1] font-bold"><tr><td colSpan={5} className="p-2 text-right" style={{fontSize:'14px'}}>Total HPP Produksi {selectedOrder.jumlah_porsi} porsi:</td><td colSpan={1} className="p-2 text-right" style={{fontSize:'15px'}}>Rp {produksiDetail.totalHPP.toLocaleString('id-ID')}</td></tr></tfoot>
                    </table>
                  </div>
                  <div className="p-3 bg-slate-50 text-slate-600" style={{fontSize:'12px'}}>
                    Produksi: Saat klik Mulai Produksi → stok Data Inventory-Master Bahan {items.length} bahan dipotong otomatis: BHN-POK-001 Beras putih 0.1 Kg × {selectedOrder.jumlah_porsi} = {produksiDetail.kebutuhan.find(k=>k.inventory_items?.kode_bahan==='BHN-POK-001')?.totalQty.toFixed(3)||'0'} Kg, BHN-HEW-003 Daging Sapi 0.08 Kg × {selectedOrder.jumlah_porsi} = {produksiDetail.kebutuhan.find(k=>k.inventory_items?.kode_bahan==='BHN-HEW-003')?.totalQty.toFixed(3)||'0'} Kg, BHN-SAO-002 Minyak 0.015 Ltr × {selectedOrder.jumlah_porsi} = {produksiDetail.kebutuhan.find(k=>k.inventory_items?.kode_bahan==='BHN-SAO-002')?.totalQty.toFixed(3)||'0'} Ltr → sisa stok update!
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
                <div className="font-bold" style={{fontSize:'14px'}}>📋 Checklist Produksi {selectedOrder.menus?.name} - {selectedOrder.jumlah_porsi} porsi - {selectedOrder.customer_name}</div>
                <div className="grid md:grid-cols-2 gap-2 mt-2" style={{fontSize:'13px'}}>
                  <div className="bg-white p-2 rounded border"><input type="checkbox" /> Siapkan Beras {selectedOrder.jumlah_porsi} porsi × 0.1 Kg = {(0.1*Number(selectedOrder.jumlah_porsi)).toFixed(1)} Kg</div>
                  <div className="bg-white p-2 rounded border"><input type="checkbox" /> Siapkan Daging Sapi {selectedOrder.jumlah_porsi} × 0.08 Kg = {(0.08*Number(selectedOrder.jumlah_porsi)).toFixed(2)} Kg rendang</div>
                  <div className="bg-white p-2 rounded border"><input type="checkbox" /> Siapkan Bumbu (kunyit, bawang merah, cabe, dll) 7 bahan</div>
                  <div className="bg-white p-2 rounded border"><input type="checkbox" /> Masak Nasi + Rendang + Capcay + Pelengkap</div>
                  <div className="bg-white p-2 rounded border"><input type="checkbox" /> Packing Nasi Kotak {selectedOrder.jumlah_porsi} box</div>
                  <div className="bg-white p-2 rounded border"><input type="checkbox" /> Quality Check - Siap Delivery ke {selectedOrder.customer_name}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
