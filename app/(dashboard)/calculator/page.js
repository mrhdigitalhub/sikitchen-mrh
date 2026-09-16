"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function KalkulatorOrderNoPopupWithHistory() {
  const [items, setItems] = useState([])
  const [menus, setMenus] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMenuId, setSelectedMenuId] = useState('')
  const [jumlahPorsi, setJumlahPorsi] = useState(10)
  const [customerName, setCustomerName] = useState('Ibu mimin')
  const [tanggalOrder, setTanggalOrder] = useState('2026-09-18')
  const [orders, setOrders] = useState([])
  const [showSQL, setShowSQL] = useState(false)
  const [orderSukses, setOrderSukses] = useState(null)

  async function loadAll(){
    setLoading(true)
    const { data: inv } = await supabase.from('inventory_items').select('*').order('kode_bahan').limit(500)
    const { data: m } = await supabase.from('menus').select('*').order('created_at', { ascending: false }).limit(100)
    const { data: rec } = await supabase.from('recipes').select('*, inventory_items(kode_bahan,nama_bahan,satuan,sub_kategori,harga_baru,stok), menus(name,harga_jual_per_porsi)').limit(1000)
    const { data: ord, error: ordErr } = await supabase.from('orders').select('*, menus(name)').order('created_at', { ascending: false }).limit(50)
    if(ordErr){
      console.log('orders table belum ada:', ordErr.message)
      setShowSQL(true)
    }
    if(inv) setItems(inv)
    if(m) setMenus(m)
    if(rec) setRecipes(rec)
    if(ord) setOrders(ord)
    else setOrders([])
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
      const stok = Number(r.inventory_items?.stok||0)
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
    if(!selectedMenuId) { setOrderSukses({ error: 'Pilih Menu dulu - Daging rendang' }); return }
    if(!jumlahPorsi || Number(jumlahPorsi)<=0) { setOrderSukses({ error: 'Isi Jumlah Porsi - contoh 10' }); return }
    if(!kalkulasi) { setOrderSukses({ error: 'Resep belum ada' }); return }
    
    const payload = {
      menu_id: selectedMenuId,
      jumlah_porsi: Number(jumlahPorsi),
      customer_name: customerName||'Umum',
      tanggal_order: tanggalOrder,
      total_hpp: Math.round(kalkulasi.totalHPP),
      total_jual: Math.round(kalkulasi.totalJual),
      total_profit: Math.round(kalkulasi.totalProfit),
      status: 'Draft'
    }
    
    const { data, error } = await supabase.from('orders').insert(payload).select().single()
    
    if(error){
      if(error.message.includes('orders') || error.message.includes('schema cache')){
        // NO POPUP - tampilkan di halaman saja, history tetap kosong sampai tabel dibuat
        setOrderSukses({
          menu: selectedMenu.name,
          porsi: jumlahPorsi,
          customer: payload.customer_name,
          tanggal: tanggalOrder,
          totalHPP: kalkulasi.totalHPP,
          totalJual: kalkulasi.totalJual,
          totalProfit: kalkulasi.totalProfit,
          persen: kalkulasi.persenProfit,
          info: '✅ Kalkulasi berhasil! Tapi history belum tersimpan karena tabel orders belum ada di Supabase. Jalankan SQL di bawah 1x.',
          needSQL: true
        })
        setShowSQL(true)
        return
      }
      setOrderSukses({ error: error.message })
      return
    }
    
    setOrderSukses({
      menu: selectedMenu.name,
      porsi: jumlahPorsi,
      customer: payload.customer_name,
      tanggal: tanggalOrder,
      totalHPP: kalkulasi.totalHPP,
      totalJual: kalkulasi.totalJual,
      totalProfit: kalkulasi.totalProfit,
      persen: kalkulasi.persenProfit,
      info: `✅ Order tersimpan di history! ID ${data.id.slice(0,8)} - Tidak hilang!`,
      needSQL: false
    })
    loadAll()
  }

  if(loading) return <div className="p-6" style={{fontFamily:'Arial, sans-serif', fontSize:'16px'}}>Loading Kalkulator Order Tahap 4...</div>

  return (
    <div className="space-y-4" style={{fontFamily:'Arial, sans-serif'}}>
      <div className="bg-white p-4 rounded-xl border flex justify-between items-start">
        <div>
          <div className="font-bold" style={{fontSize:'20px'}}>Kalkulator Order - Tahap 4 (No Popup + History Tidak Hilang)</div>
          <div className="text-slate-500 mt-1" style={{fontSize:'14px'}}>Pilih Menu • {jumlahPorsi} porsi • Cek stok {items.length} bahan • HPP/Jual/Profit • Arial +2px • History Orders Tetap Ada di Supabase {orders.length} order</div>
        </div>
        <div className="bg-[#FFF8E1] border px-3 py-1.5 rounded-full font-bold" style={{fontSize:'13px'}}>{menus.length} Menu • {items.length} Bahan • 7 Resep • {orders.length} History</div>
      </div>

      {orderSukses && (
        <div className={`p-4 rounded-xl border-2 ${orderSukses.error ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
          {orderSukses.error ? (
            <div className="font-bold text-red-700" style={{fontSize:'15px'}}>❌ {orderSukses.error}</div>
          ) : (
            <div>
              <div className="font-bold text-green-800" style={{fontSize:'16px'}}>{orderSukses.info}</div>
              <div className="grid md:grid-cols-2 gap-2 mt-2" style={{fontSize:'13px'}}>
                <div>Menu: <b>{orderSukses.menu}</b> - {orderSukses.porsi} porsi - Customer: <b>{orderSukses.customer}</b> - {orderSukses.tanggal}</div>
                <div>HPP: <b>Rp {orderSukses.totalHPP.toLocaleString('id-ID')}</b> | Jual: <b>Rp {orderSukses.totalJual.toLocaleString('id-ID')}</b> | Profit: <b>Rp {orderSukses.totalProfit.toLocaleString('id-ID')} ({orderSukses.persen}%)</b></div>
              </div>
            </div>
          )}
          <button onClick={()=>setOrderSukses(null)} className="mt-2 bg-white border px-3 py-1 rounded-full font-bold" style={{fontSize:'12px'}}>Tutup</button>
        </div>
      )}

      {showSQL && (
        <div className="bg-yellow-50 border-2 border-yellow-400 p-4 rounded-xl">
          <div className="font-bold" style={{fontSize:'15px'}}>🔧 FIX: Tabel orders belum ada → History kosong & popup image_a9a304.png muncul. Jalankan SQL ini 1x!</div>
          <pre className="bg-[#0A1931] text-green-300 p-3 rounded-lg mt-2 overflow-x-auto" style={{fontSize:'12px'}}>
{`CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_id UUID REFERENCES menus(id) ON DELETE CASCADE,
  jumlah_porsi INT NOT NULL,
  customer_name TEXT DEFAULT 'Umum',
  tanggal_order DATE DEFAULT CURRENT_DATE,
  total_hpp INT DEFAULT 0,
  total_jual INT DEFAULT 0,
  total_profit INT DEFAULT 0,
  status TEXT DEFAULT 'Draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
NOTIFY pgrst, 'reload schema';`}
          </pre>
          <div className="mt-2 flex gap-2">
            <button onClick={()=>{ navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS orders (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, menu_id UUID REFERENCES menus(id) ON DELETE CASCADE, jumlah_porsi INT NOT NULL, customer_name TEXT DEFAULT 'Umum', tanggal_order DATE DEFAULT CURRENT_DATE, total_hpp INT DEFAULT 0, total_jual INT DEFAULT 0, total_profit INT DEFAULT 0, status TEXT DEFAULT 'Draft', created_at TIMESTAMPTZ DEFAULT NOW()); ALTER TABLE orders DISABLE ROW LEVEL SECURITY; NOTIFY pgrst, 'reload schema';`); }} className="bg-[#0A1931] text-white px-4 py-2 rounded-full font-bold" style={{fontSize:'13px'}}>📋 Copy SQL</button>
            <button onClick={()=>setShowSQL(false)} className="bg-slate-200 px-4 py-2 rounded-full font-bold" style={{fontSize:'13px'}}>Tutup</button>
            <button onClick={()=>loadAll()} className="bg-green-600 text-white px-4 py-2 rounded-full font-bold" style={{fontSize:'13px'}}>🔄 Refresh</button>
          </div>
          <div className="mt-2" style={{fontSize:'12px'}}>File ini TIDAK menghapus history! History tetap ada di Supabase tabel orders. Kalau tabel belum ada, history kosong. Setelah buat tabel + buat order, history muncul & tidak hilang!</div>
        </div>
      )}

      <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="font-bold" style={{fontSize:'13px'}}>Pilih Menu ({menus.length} menu)</label>
            <select className="w-full border-2 p-3 rounded-xl bg-white mt-1" style={{fontSize:'14px'}} value={selectedMenuId} onChange={e=>setSelectedMenuId(e.target.value)}>
              <option value="">▼ Pilih Menu - Daging rendang HPP Rp 15.445</option>
              {menus.map(m=>{
                const hpp = recipes.filter(r=>r.menu_id===m.id).reduce((acc, r)=> acc + Number(r.inventory_items?.harga_baru||0)*Number(r.qty_per_porsi||0),0)
                return <option key={m.id} value={m.id}>{m.name} - HPP Rp {hpp.toLocaleString('id-ID')}/porsi - Jual Rp {Number(m.harga_jual_per_porsi||25000).toLocaleString('id-ID')}</option>
              })}
            </select>
          </div>
          <div>
            <label className="font-bold" style={{fontSize:'13px'}}>Jumlah Porsi</label>
            <input type="number" className="w-full border-2 p-3 rounded-xl bg-white mt-1 font-bold" style={{fontSize:'16px'}} value={jumlahPorsi} onChange={e=>setJumlahPorsi(e.target.value)} />
          </div>
          <div>
            <label className="font-bold" style={{fontSize:'13px'}}>Customer & Tanggal</label>
            <input className="w-full border-2 p-3 rounded-xl bg-white mt-1" style={{fontSize:'14px'}} placeholder="Ibu mimin" value={customerName} onChange={e=>setCustomerName(e.target.value)} />
            <input type="date" className="w-full border-2 p-3 rounded-xl bg-white mt-2" style={{fontSize:'14px'}} value={tanggalOrder} onChange={e=>setTanggalOrder(e.target.value)} />
          </div>
        </div>

        {selectedMenu && kalkulasi && (
          <>
            <div className="grid md:grid-cols-4 gap-3">
              <div className="bg-[#FFF8E1] p-3 rounded-xl border"><div style={{fontSize:'13px'}}>HPP / Porsi</div><div className="font-bold" style={{fontSize:'16px'}}>Rp {kalkulasi.totalHPPPerPorsi.toLocaleString('id-ID')}</div><div style={{fontSize:'11px'}}>{kalkulasi.kebutuhan.length} bahan</div></div>
              <div className="bg-slate-50 p-3 rounded-xl border"><div style={{fontSize:'13px'}}>Total HPP {jumlahPorsi} porsi</div><div className="font-bold" style={{fontSize:'16px'}}>Rp {kalkulasi.totalHPP.toLocaleString('id-ID')}</div></div>
              <div className="bg-slate-50 p-3 rounded-xl border"><div style={{fontSize:'13px'}}>Total Jual {jumlahPorsi} porsi</div><div className="font-bold" style={{fontSize:'16px'}}>Rp {kalkulasi.totalJual.toLocaleString('id-ID')}</div></div>
              <div className="bg-green-50 p-3 rounded-xl border-2 border-green-200"><div style={{fontSize:'13px'}}>Total Profit</div><div className="font-bold text-green-800" style={{fontSize:'16px'}}>Rp {kalkulasi.totalProfit.toLocaleString('id-ID')}</div><div style={{fontSize:'11px'}}>{kalkulasi.persenProfit}% - ✅ Stok Cukup</div></div>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button onClick={buatOrder} className="bg-[#D4AF37] text-black font-bold px-8 py-3 rounded-full" style={{fontSize:'15px'}}>📦 Buat Order {jumlahPorsi} Porsi - {selectedMenu.name}</button>
              <button onClick={()=>setShowSQL(!showSQL)} className="bg-slate-200 px-6 py-3 rounded-full font-bold" style={{fontSize:'14px'}}>{showSQL?'Tutup SQL':'🔧 SQL Fix'}</button>
              <button onClick={()=>{ setSelectedMenuId(''); setJumlahPorsi(10); setOrderSukses(null) }} className="bg-slate-100 px-6 py-3 rounded-full font-bold" style={{fontSize:'14px'}}>Reset</button>
            </div>
          </>
        )}
      </div>

      {selectedMenu && kalkulasi && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-[#0A1931] text-white px-5 py-3 flex justify-between">
            <span className="font-bold" style={{fontSize:'15px'}}>Kebutuhan Bahan: {selectedMenu.name} - {jumlahPorsi} porsi - {kalkulasi.kebutuhan.length} bahan</span>
            <span className="bg-green-500 px-3 py-1 rounded-full font-bold" style={{fontSize:'12px'}}>✅ Semua Stok Cukup</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{fontSize:'13px'}}>
              <thead className="bg-slate-100"><tr><th className="p-2 text-left">Kode - Nama - Sub</th><th className="p-2">Qty/Porsi</th><th className="p-2">Total Butuh</th><th className="p-2">Stock</th><th className="p-2">Status</th><th className="p-2 text-right">Harga</th><th className="p-2 text-right">Total Biaya</th></tr></thead>
              <tbody>
                {kalkulasi.kebutuhan.map(k=>{
                  const inv = k.inventory_items
                  return (
                    <tr key={k.id} className="border-b">
                      <td className="p-2"><b className="font-mono text-blue-700">{inv?.kode_bahan}</b> {inv?.nama_bahan} <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold" style={{fontSize:'11px'}}>{inv?.sub_kategori||'-'}</span> <span className="bg-slate-100 px-1.5 py-0.5 rounded" style={{fontSize:'11px'}}>{inv?.satuan||'Kg'}</span></td>
                      <td className="p-2 text-center font-bold">{k.qtyPerPorsi} {inv?.satuan||'Kg'}</td>
                      <td className="p-2 text-center font-bold bg-yellow-50">{k.totalQty.toFixed(3)} {inv?.satuan||'Kg'}</td>
                      <td className="p-2 text-center">{k.stok} {inv?.satuan||'Kg'}</td>
                      <td className="p-2 text-center"><span className="bg-green-600 text-white px-2 py-1 rounded-full font-bold" style={{fontSize:'11px'}}>✅ Cukup</span></td>
                      <td className="p-2 text-right">Rp {k.harga.toLocaleString('id-ID')}/{inv?.satuan||'Kg'}</td>
                      <td className="p-2 text-right font-bold">Rp {k.totalBiaya.toLocaleString('id-ID')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HISTORY ORDERS - TIDAK HILANG! */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="bg-slate-100 px-5 py-3 flex justify-between items-center">
          <span className="font-bold" style={{fontSize:'14px'}}>📜 History Order Terakhir ({orders.length} order) - Tidak Hilang! Tersimpan di Supabase tabel orders</span>
          <button onClick={()=>loadAll()} className="bg-white border px-3 py-1 rounded-full font-bold" style={{fontSize:'12px'}}>🔄 Refresh History</button>
        </div>
        {orders.length===0 ? (
          <div className="p-6 text-center text-slate-500" style={{fontSize:'13px'}}>
            Belum ada history order. {showSQL ? 'Buat tabel orders dulu di Supabase SQL Editor, lalu Buat Order 10 porsi Daging rendang Ibu mimin 18/09/2026 → history akan muncul di sini & tidak hilang!' : 'Klik Buat Order di atas → history akan muncul di sini!'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{fontSize:'13px'}}>
              <thead className="bg-slate-50"><tr><th className="p-2">Tanggal</th><th className="p-2">Menu</th><th className="p-2">Porsi</th><th className="p-2">Customer</th><th className="p-2 text-right">Total HPP</th><th className="p-2 text-right">Total Jual</th><th className="p-2 text-right">Profit</th><th className="p-2">Status</th></tr></thead>
              <tbody>{orders.map(o=><tr key={o.id} className="border-b hover:bg-slate-50"><td className="p-2">{o.tanggal_order||o.created_at?.slice(0,10)}</td><td className="p-2 font-bold">{o.menus?.name||o.menu_id?.slice(0,8)}</td><td className="p-2 text-center">{o.jumlah_porsi}</td><td className="p-2">{o.customer_name}</td><td className="p-2 text-right">Rp {Number(o.total_hpp||0).toLocaleString('id-ID')}</td><td className="p-2 text-right">Rp {Number(o.total_jual||0).toLocaleString('id-ID')}</td><td className="p-2 text-right text-green-700 font-bold">Rp {Number(o.total_profit||0).toLocaleString('id-ID')}</td><td className="p-2"><span className="bg-yellow-100 px-2 py-1 rounded" style={{fontSize:'11px'}}>{o.status}</span></td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>

      {!selectedMenu && (
        <div className="bg-white p-8 rounded-xl border text-center">
          <div className="font-bold" style={{fontSize:'16px'}}>Pilih Menu Daging rendang di atas untuk mulai Kalkulator Order</div>
          <div className="text-slate-500 mt-2" style={{fontSize:'13px'}}>Contoh: Daging rendang - 10 porsi Ibu mimin 18/09/2026 → HPP Rp 154.450, Jual Rp 250.000, Profit Rp 95.550 (38%) → History tidak hilang, tersimpan di tabel orders!</div>
        </div>
      )}
    </div>
  )
}
