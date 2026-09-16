"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function KalkulatorOrderTahap4() {
  const [items, setItems] = useState([])
  const [menus, setMenus] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMenuId, setSelectedMenuId] = useState('')
  const [jumlahPorsi, setJumlahPorsi] = useState(100)
  const [customerName, setCustomerName] = useState('')
  const [tanggalOrder, setTanggalOrder] = useState(new Date().toISOString().slice(0,10))
  const [orders, setOrders] = useState([])

  async function loadAll(){
    setLoading(true)
    const { data: inv } = await supabase.from('inventory_items').select('*').order('kode_bahan').limit(500)
    const { data: m } = await supabase.from('menus').select('*').order('created_at', { ascending: false }).limit(100)
    const { data: rec } = await supabase.from('recipes').select('*, inventory_items(kode_bahan,nama_bahan,satuan,sub_kategori,harga_baru,stock_qty,stok), menus(name,harga_jual_per_porsi)').limit(1000)
    const { data: ord } = await supabase.from('orders').select('*, menus(name)').order('created_at', { ascending: false }).limit(20)
    if(inv) setItems(inv)
    if(m) setMenus(m)
    if(rec) setRecipes(rec)
    if(ord) setOrders(ord)
    setLoading(false)
  }
  useEffect(()=>{ loadAll() }, [])

  const selectedMenu = useMemo(()=> menus.find(mm=>mm.id===selectedMenuId) || null, [menus, selectedMenuId])
  const recsForSelected = useMemo(()=> recipes.filter(r=>r.menu_id===selectedMenuId), [recipes, selectedMenuId])

  const kalkulasi = useMemo(()=>{
    if(!selectedMenu || recsForSelected.length===0) return null
    let totalHPPPerPorsi = 0
    let kebutuhan = []
    for(const r of recsForSelected){
      const harga = Number(r.inventory_items?.harga_baru||0)
      const qtyPerPorsi = Number(r.qty_per_porsi||r.quantity||0)
      const totalQty = qtyPerPorsi * Number(jumlahPorsi||0)
      const stok = Number(r.inventory_items?.stok || r.inventory_items?.stock_qty || 0)
      const biayaPerPorsi = harga * qtyPerPorsi
      totalHPPPerPorsi += biayaPerPorsi
      kebutuhan.push({
        ...r,
        qtyPerPorsi,
        totalQty,
        stok,
        cukup: stok >= totalQty,
        kekurangan: Math.max(0, totalQty - stok),
        biayaPerPorsi,
        totalBiaya: biayaPerPorsi * Number(jumlahPorsi||0),
        harga
      })
    }
    const hargaJualPerPorsi = Number(selectedMenu.harga_jual_per_porsi||selectedMenu.harga_jual||25000)
    const totalHPP = totalHPPPerPorsi * Number(jumlahPorsi||0)
    const totalJual = hargaJualPerPorsi * Number(jumlahPorsi||0)
    const totalProfit = totalJual - totalHPP
    const persenProfit = totalJual ? Math.round(totalProfit/totalJual*100) : 0
    const allCukup = kebutuhan.every(k=>k.cukup)
    return { totalHPPPerPorsi, totalHPP, totalJual, totalProfit, persenProfit, kebutuhan, allCukup, hargaJualPerPorsi }
  }, [selectedMenu, recsForSelected, jumlahPorsi])

  async function buatOrder(){
    if(!selectedMenuId) return alert('Pilih Menu dulu')
    if(!jumlahPorsi || Number(jumlahPorsi)<=0) return alert('Isi Jumlah Porsi')
    if(!kalkulasi) return alert('Resep belum ada')
    if(!kalkulasi.allCukup){
      if(!confirm('Stok beberapa bahan tidak cukup! Tetap buat order?')) return
    }
    const payload = {
      menu_id: selectedMenuId,
      jumlah_porsi: Number(jumlahPorsi),
      customer_name: customerName||'Umum',
      tanggal_order: tanggalOrder,
      total_hpp: kalkulasi.totalHPP,
      total_jual: kalkulasi.totalJual,
      total_profit: kalkulasi.totalProfit,
      status: 'Draft'
    }
    let { data, error } = await supabase.from('orders').insert(payload).select().single()
    if(error && error.message.includes('orders')){
      // tabel orders belum ada - tampilkan ringkasan saja
      alert(`✅ Kalkulasi Order Berhasil!\n\nMenu: ${selectedMenu.name}\n${jumlahPorsi} porsi\nTotal HPP: Rp ${kalkulasi.totalHPP.toLocaleString('id-ID')}\nTotal Jual: Rp ${kalkulasi.totalJual.toLocaleString('id-ID')}\nProfit: Rp ${kalkulasi.totalProfit.toLocaleString('id-ID')} (${kalkulasi.persenProfit}%)\n\nSQL untuk buat tabel orders:\nCREATE TABLE orders (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, menu_id UUID REFERENCES menus(id), jumlah_porsi INT, customer_name TEXT, tanggal_order DATE, total_hpp INT, total_jual INT, total_profit INT, status TEXT DEFAULT 'Draft', created_at TIMESTAMPTZ DEFAULT NOW());\nNOTIFY pgrst, 'reload schema';`)
      return
    }
    if(error) return alert(error.message)
    alert(`✅ Order ${data.id.slice(0,8)} dibuat: ${selectedMenu.name} ${jumlahPorsi} porsi - HPP Rp ${kalkulasi.totalHPP.toLocaleString('id-ID')} - Jual Rp ${kalkulasi.totalJual.toLocaleString('id-ID')}`)
    loadAll()
  }

  if(loading) return <div className="p-6" style={{fontFamily:'Arial, sans-serif', fontSize:'16px'}}>Loading Kalkulator Order Tahap 4...</div>

  return (
    <div className="space-y-4" style={{fontFamily:'Arial, sans-serif'}}>
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border flex justify-between items-start">
        <div>
          <div className="font-bold" style={{fontSize:'20px'}}>Kalkulator Order - Tahap 4</div>
          <div className="text-slate-500 mt-1" style={{fontSize:'14px'}}>Pilih Menu • Input Jumlah Porsi • Auto hitung kebutuhan bahan (qty_per_porsi × jumlah) • Cek stok Data Inventory-Master Bahan {items.length} bahan • Total HPP/Jual/Profit</div>
        </div>
        <div className="bg-[#FFF8E1] border px-3 py-1.5 rounded-full text-[#0A1931] font-bold" style={{fontSize:'13px'}}>{menus.length} Menu • {items.length} Bahan</div>
      </div>

      {/* Form Pilih Menu & Jumlah */}
      <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="font-bold" style={{fontSize:'13px'}}>Pilih Menu (dari {menus.length} menu)</label>
            <select className="w-full border-2 p-3 rounded-xl bg-white mt-1" style={{fontSize:'14px', fontFamily:'Arial, sans-serif'}} value={selectedMenuId} onChange={e=>setSelectedMenuId(e.target.value)}>
              <option value="">▼ Pilih Menu - Daging rendang Rp 15.445 HPP</option>
              {menus.map(m=>{
                const hpp = recipes.filter(r=>r.menu_id===m.id).reduce((acc, r)=> acc + Number(r.inventory_items?.harga_baru||0)*Number(r.qty_per_porsi||0),0)
                return <option key={m.id} value={m.id}>{m.name} - HPP Rp {hpp.toLocaleString('id-ID')}/porsi - Jual Rp {Number(m.harga_jual_per_porsi||25000).toLocaleString('id-ID')} - {m.base_porsi} porsi</option>
              })}
            </select>
          </div>
          <div>
            <label className="font-bold" style={{fontSize:'13px'}}>Jumlah Porsi Order</label>
            <input type="number" className="w-full border-2 p-3 rounded-xl bg-white mt-1 font-bold" style={{fontSize:'16px', fontFamily:'Arial, sans-serif'}} value={jumlahPorsi} onChange={e=>setJumlahPorsi(e.target.value)} placeholder="100" />
            <div className="mt-1" style={{fontSize:'12px'}}>Standar: 50, 100, 200 porsi</div>
          </div>
          <div>
            <label className="font-bold" style={{fontSize:'13px'}}>Customer & Tanggal</label>
            <input className="w-full border-2 p-3 rounded-xl bg-white mt-1" style={{fontSize:'14px'}} placeholder="Nama Customer - Umum" value={customerName} onChange={e=>setCustomerName(e.target.value)} />
            <input type="date" className="w-full border-2 p-3 rounded-xl bg-white mt-2" style={{fontSize:'14px'}} value={tanggalOrder} onChange={e=>setTanggalOrder(e.target.value)} />
          </div>
        </div>

        {selectedMenu && kalkulasi && (
          <div className="grid md:grid-cols-4 gap-3 mt-2">
            <div className="bg-[#FFF8E1] p-3 rounded-xl border">
              <div style={{fontSize:'13px'}} className="text-slate-600">HPP / Porsi</div>
              <div className="font-bold text-[#0A1931]" style={{fontSize:'16px'}}>Rp {kalkulasi.totalHPPPerPorsi.toLocaleString('id-ID')}</div>
              <div style={{fontSize:'11px'}}>{kalkulasi.kebutuhan.length} bahan dari {items.length}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border">
              <div style={{fontSize:'13px'}} className="text-slate-600">Total HPP {jumlahPorsi} porsi</div>
              <div className="font-bold" style={{fontSize:'16px'}}>Rp {kalkulasi.totalHPP.toLocaleString('id-ID')}</div>
              <div style={{fontSize:'11px'}}>@ Rp {kalkulasi.totalHPPPerPorsi.toLocaleString('id-ID')} × {jumlahPorsi}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border">
              <div style={{fontSize:'13px'}} className="text-slate-600">Total Jual {jumlahPorsi} porsi</div>
              <div className="font-bold" style={{fontSize:'16px'}}>Rp {kalkulasi.totalJual.toLocaleString('id-ID')}</div>
              <div style={{fontSize:'11px'}}>@ Rp {kalkulasi.hargaJualPerPorsi.toLocaleString('id-ID')} × {jumlahPorsi}</div>
            </div>
            <div className={`p-3 rounded-xl border-2 ${kalkulasi.totalProfit>=0?'bg-green-50 border-green-200':'bg-red-50 border-red-200'}`}>
              <div style={{fontSize:'13px'}} className="text-green-700">Total Profit</div>
              <div className="font-bold text-green-800" style={{fontSize:'16px'}}>Rp {kalkulasi.totalProfit.toLocaleString('id-ID')}</div>
              <div style={{fontSize:'11px'}}>{kalkulasi.persenProfit}% dari jual - {kalkulasi.allCukup ? '✅ Stok Cukup' : '⚠️ Stok Kurang'}</div>
            </div>
          </div>
        )}

        {selectedMenu && kalkulasi && (
          <div className="flex justify-center gap-3 pt-2">
            <button onClick={buatOrder} className="bg-[#D4AF37] text-black font-bold px-8 py-3 rounded-full" style={{fontSize:'15px'}}>📦 Buat Order {jumlahPorsi} Porsi - {selectedMenu.name}</button>
            <button onClick={()=>{ setSelectedMenuId(''); setJumlahPorsi(100) }} className="bg-slate-200 text-black font-bold px-6 py-3 rounded-full" style={{fontSize:'14px'}}>Reset</button>
          </div>
        )}
      </div>

      {/* Detail Kebutuhan Bahan */}
      {selectedMenu && kalkulasi && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-[#0A1931] text-white px-5 py-3 flex justify-between items-center">
            <span className="font-bold" style={{fontSize:'15px'}}>Kebutuhan Bahan: {selectedMenu.name} - {jumlahPorsi} porsi - {kalkulasi.kebutuhan.length} bahan dari Data Inventory-Master Bahan {items.length} bahan</span>
            <span className={`px-3 py-1 rounded-full font-bold ${kalkulasi.allCukup?'bg-green-500':'bg-red-500'}`} style={{fontSize:'12px'}}>{kalkulasi.allCukup?'✅ Semua Stok Cukup':'⚠️ Ada Stok Kurang'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{fontSize:'13px', fontFamily:'Arial, sans-serif'}}>
              <thead className="bg-slate-100"><tr><th className="p-2 text-left">Kode - Nama Lengkap - Sub</th><th className="p-2">Qty / Porsi</th><th className="p-2">Total Butuh {jumlahPorsi} porsi</th><th className="p-2">Stock Qty</th><th className="p-2">Status Stok</th><th className="p-2 text-right">Harga Baru</th><th className="p-2 text-right">Total Biaya</th></tr></thead>
              <tbody>
                {kalkulasi.kebutuhan.map(k=>{
                  const inv = k.inventory_items
                  return (
                    <tr key={k.id} className={`border-b ${k.cukup?'':'bg-red-50'}`}>
                      <td className="p-2"><b className="font-mono text-blue-700">{inv?.kode_bahan}</b> {inv?.nama_bahan} <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold" style={{fontSize:'11px'}}>{inv?.sub_kategori||'-'}</span> <span className="bg-slate-100 px-1.5 py-0.5 rounded" style={{fontSize:'11px'}}>{inv?.satuan||k.satuan||'Kg'}</span></td>
                      <td className="p-2 text-center font-bold">{k.qtyPerPorsi} {inv?.satuan||k.satuan||'Kg'}</td>
                      <td className="p-2 text-center font-bold bg-yellow-50">{k.totalQty.toFixed(3)} {inv?.satuan||'Kg'}</td>
                      <td className="p-2 text-center">{k.stok} {inv?.satuan||'Kg'}</td>
                      <td className="p-2 text-center"><span className={`px-2 py-1 rounded-full font-bold text-white ${k.cukup?'bg-green-600':'bg-red-600'}`} style={{fontSize:'11px'}}>{k.cukup ? '✅ Cukup' : `❌ Kurang ${k.kekurangan.toFixed(2)}`}</span></td>
                      <td className="p-2 text-right">Rp {k.harga.toLocaleString('id-ID')}/{inv?.satuan||'Kg'}<div style={{fontSize:'11px'}}>Rp {(k.harga/1000).toFixed(1)}/gram</div></td>
                      <td className="p-2 text-right font-bold">Rp {k.totalBiaya.toLocaleString('id-ID')}<div style={{fontSize:'11px'}}>Rp {k.biayaPerPorsi.toLocaleString('id-ID')}/porsi</div></td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-[#FFF8E1] font-bold">
                <tr><td colSpan={6} className="p-2 text-right" style={{fontSize:'14px'}}>Total HPP {jumlahPorsi} porsi:</td><td className="p-2 text-right" style={{fontSize:'15px'}}>Rp {kalkulasi.totalHPP.toLocaleString('id-ID')}</td></tr>
                <tr><td colSpan={6} className="p-2 text-right" style={{fontSize:'14px'}}>Total Jual {jumlahPorsi} porsi:</td><td className="p-2 text-right" style={{fontSize:'15px'}}>Rp {kalkulasi.totalJual.toLocaleString('id-ID')}</td></tr>
                <tr><td colSpan={6} className="p-2 text-right text-green-700" style={{fontSize:'14px'}}>Total Profit ({kalkulasi.persenProfit}%):</td><td className="p-2 text-right text-green-700" style={{fontSize:'15px'}}>Rp {kalkulasi.totalProfit.toLocaleString('id-ID')}</td></tr>
              </tfoot>
            </table>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600" style={{fontSize:'12px'}}>Formula: qty_per_porsi dari Master Menu & Resep (BHN-POK-001 Beras putih 0.1 Kg, BHN-HEW-003 Daging Sapi 0.08 Kg, BHN-SAO-002 Minyak 0.015 Ltr) × jumlah porsi {jumlahPorsi} = total butuh. Harga dari harga_baru live Data Inventory-Master Bahan {items.length} bahan. HPP auto qty × harga.</div>
        </div>
      )}

      {/* Orders History */}
      {orders.length>0 && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-slate-100 px-5 py-3 font-bold" style={{fontSize:'14px'}}>History Order Terakhir ({orders.length})</div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{fontSize:'13px'}}>
              <thead className="bg-slate-50"><tr><th className="p-2">Tanggal</th><th className="p-2">Menu</th><th className="p-2">Porsi</th><th className="p-2">Customer</th><th className="p-2 text-right">Total HPP</th><th className="p-2 text-right">Total Jual</th><th className="p-2 text-right">Profit</th><th className="p-2">Status</th></tr></thead>
              <tbody>{orders.map(o=><tr key={o.id} className="border-b"><td className="p-2">{o.tanggal_order||o.created_at?.slice(0,10)}</td><td className="p-2 font-bold">{o.menus?.name||o.menu_id?.slice(0,8)}</td><td className="p-2 text-center">{o.jumlah_porsi}</td><td className="p-2">{o.customer_name}</td><td className="p-2 text-right">Rp {Number(o.total_hpp||0).toLocaleString('id-ID')}</td><td className="p-2 text-right">Rp {Number(o.total_jual||0).toLocaleString('id-ID')}</td><td className="p-2 text-right text-green-700 font-bold">Rp {Number(o.total_profit||0).toLocaleString('id-ID')}</td><td className="p-2"><span className="bg-yellow-100 px-2 py-1 rounded text-[11px]">{o.status}</span></td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {!selectedMenu && (
        <div className="bg-white p-8 rounded-xl border text-center">
          <div className="font-bold" style={{fontSize:'16px'}}>Pilih Menu di atas untuk mulai Kalkulator Order Tahap 4</div>
          <div className="text-slate-500 mt-2" style={{fontSize:'13px'}}>Contoh: Daging rendang - 100 porsi → Butuh Beras putih 0.1 Kg × 100 = 10 Kg, Daging Sapi 0.08 Kg × 100 = 8 Kg, Minyak 0.015 Ltr × 100 = 1.5 Ltr → Total HPP Rp 1.544.500, Total Jual Rp 2.500.000, Profit Rp 955.500 (38%) - satuan ikut sub kategori, harga live dari Data Inventory-Master Bahan {items.length} bahan BHN-POK-001 BHN-HEW-003 BHN-SAO-002</div>
        </div>
      )}
    </div>
  )
}
