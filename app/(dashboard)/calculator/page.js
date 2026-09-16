"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function KalkulatorOrderUltraNoPopup() {
  const [items, setItems] = useState([])
  const [menus, setMenus] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMenuId, setSelectedMenuId] = useState('')
  const [jumlahPorsi, setJumlahPorsi] = useState(10)
  const [customerName, setCustomerName] = useState('Ibu mimin')
  const [tanggalOrder, setTanggalOrder] = useState('2026-09-18')
  const [orders, setOrders] = useState([])
  const [orderSukses, setOrderSukses] = useState(null)
  const [showSQL, setShowSQL] = useState(false)

  async function loadAll(){
    setLoading(true)
    const { data: inv } = await supabase.from('inventory_items').select('*').order('kode_bahan').limit(500)
    const { data: m } = await supabase.from('menus').select('*').order('created_at', { ascending: false }).limit(100)
    const { data: rec } = await supabase.from('recipes').select('*, inventory_items(kode_bahan,nama_bahan,satuan,sub_kategori,harga_baru,stok), menus(name,harga_jual_per_porsi)').limit(1000)
    const { data: ord } = await supabase.from('orders').select('*, menus(name)').order('created_at', { ascending: false }).limit(50)
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
      const stok = Number(r.inventory_items?.stok||0)
      totalHPPPerPorsi += harga * qtyPerPorsi
      kebutuhan.push({ ...r, qtyPerPorsi, totalQty, stok, cukup: stok >= totalQty, harga, totalBiaya: harga * totalQty })
    }
    const hargaJualPerPorsi = Number(selectedMenu.harga_jual_per_porsi||25000)
    return {
      totalHPPPerPorsi,
      totalHPP: totalHPPPerPorsi * Number(jumlahPorsi||0),
      totalJual: hargaJualPerPorsi * Number(jumlahPorsi||0),
      totalProfit: (hargaJualPerPorsi - totalHPPPerPorsi) * Number(jumlahPorsi||0),
      persenProfit: Math.round(((hargaJualPerPorsi - totalHPPPerPorsi)/hargaJualPerPorsi)*100),
      kebutuhan,
      allCukup: kebutuhan.every(k=>k.cukup),
      hargaJualPerPorsi
    }
  }, [selectedMenu, recsForSelected, jumlahPorsi])

  async function buatOrder(){
    if(!selectedMenuId) { setOrderSukses({ error: 'Pilih Menu dulu' }); return }
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
      // ULTRA NO POPUP: Jika tabel orders belum ada, tetap tampilkan sukses kalkulasi, TIDAK tampilkan SQL otomatis
      // Hanya tampilkan HPP/Jual/Profit seperti di screenshot image_394abb.png tapi tanpa tulisan "tabel orders belum ada"
      setOrderSukses({
        menu: selectedMenu.name,
        porsi: jumlahPorsi,
        customer: payload.customer_name,
        tanggal: tanggalOrder,
        totalHPP: kalkulasi.totalHPP,
        totalJual: kalkulasi.totalJual,
        totalProfit: kalkulasi.totalProfit,
        persen: kalkulasi.persenProfit,
        info: `✅ Kalkulasi berhasil! ${selectedMenu.name} ${jumlahPorsi} porsi - Customer ${payload.customer_name}`,
        needSQL: true,
        errorDetail: error.message
      })
      // Jangan auto buka SQL, user bisa buka manual kalau mau
      // setShowSQL(false) -> tetap false biar tidak muncul kotak kuning otomatis
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
      info: `✅ Order tersimpan! ID ${data.id.slice(0,8)} - History tidak hilang!`,
      needSQL: false
    })
    loadAll()
  }

  if(loading) return <div className="p-6" style={{fontFamily:'Arial, sans-serif'}}>Loading Kalkulator...</div>

  return (
    <div className="space-y-4" style={{fontFamily:'Arial, sans-serif'}}>
      <div className="bg-white p-4 rounded-xl border flex justify-between">
        <div><div className="font-bold" style={{fontSize:'20px'}}>Kalkulator Order - Tahap 4 (Ultra No Popup)</div><div className="text-slate-500 mt-1" style={{fontSize:'14px'}}>Daging rendang • {jumlahPorsi} porsi • {items.length} bahan • Tanpa Popup SQL - Arial +2px</div></div>
        <div className="bg-[#FFF8E1] border px-3 py-1.5 rounded-full font-bold" style={{fontSize:'13px'}}>{orders.length} History • {menus.length} Menu</div>
      </div>

      {orderSukses && (
        <div className={`p-4 rounded-xl border-2 ${orderSukses.error ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
          {orderSukses.error ? <div className="font-bold text-red-700">{orderSukses.error}</div> : (
            <div>
              <div className="font-bold text-green-800" style={{fontSize:'15px'}}>{orderSukses.info}</div>
              <div style={{fontSize:'13px'}} className="mt-1">Menu: <b>{orderSukses.menu}</b> - {orderSukses.porsi} porsi - Customer: <b>{orderSukses.customer}</b> - {orderSukses.tanggal}</div>
              <div style={{fontSize:'13px'}}>HPP: <b>Rp {orderSukses.totalHPP.toLocaleString('id-ID')}</b> | Jual: <b>Rp {orderSukses.totalJual.toLocaleString('id-ID')}</b> | Profit: <b>Rp {orderSukses.totalProfit.toLocaleString('id-ID')} ({orderSukses.persen}%)</b></div>
              {orderSukses.needSQL && <div className="mt-2 text-[11px] text-slate-500">History belum tersimpan karena tabel orders belum ada. Klik tombol SQL Fix di bawah kalau mau simpan history.</div>}
            </div>
          )}
          <button onClick={()=>setOrderSukses(null)} className="mt-2 bg-white border px-3 py-1 rounded-full font-bold" style={{fontSize:'12px'}}>Tutup</button>
        </div>
      )}

      {showSQL && (
        <div className="bg-yellow-50 border-2 border-yellow-400 p-4 rounded-xl">
          <div className="font-bold" style={{fontSize:'14px'}}>🔧 SQL Fix - Jalankan 1x di Supabase SQL Editor project Bos (yang URL-nya di .env.local)</div>
          <pre className="bg-[#0A1931] text-green-300 p-3 rounded-lg mt-2 overflow-x-auto" style={{fontSize:'11px'}}>
{`-- Aktifkan extension untuk UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS orders (
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
          <div className="flex gap-2 mt-2">
            <button onClick={()=>{ navigator.clipboard.writeText(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"; CREATE TABLE IF NOT EXISTS orders (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, menu_id UUID REFERENCES menus(id) ON DELETE CASCADE, jumlah_porsi INT NOT NULL, customer_name TEXT DEFAULT 'Umum', tanggal_order DATE DEFAULT CURRENT_DATE, total_hpp INT DEFAULT 0, total_jual INT DEFAULT 0, total_profit INT DEFAULT 0, status TEXT DEFAULT 'Draft', created_at TIMESTAMPTZ DEFAULT NOW()); ALTER TABLE orders DISABLE ROW LEVEL SECURITY; NOTIFY pgrst, 'reload schema';`); alert('SQL copied!'); }} className="bg-[#0A1931] text-white px-4 py-2 rounded-full font-bold" style={{fontSize:'13px'}}>📋 Copy SQL</button>
            <button onClick={()=>setShowSQL(false)} className="bg-slate-200 px-4 py-2 rounded-full font-bold" style={{fontSize:'13px'}}>Tutup</button>
            <button onClick={()=>loadAll()} className="bg-green-600 text-white px-4 py-2 rounded-full font-bold" style={{fontSize:'13px'}}>🔄 Refresh History</button>
          </div>
        </div>
      )}

      <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div><label className="font-bold" style={{fontSize:'13px'}}>Pilih Menu ({menus.length})</label><select className="w-full border-2 p-3 rounded-xl mt-1" style={{fontSize:'14px'}} value={selectedMenuId} onChange={e=>setSelectedMenuId(e.target.value)}><option value="">▼ Pilih Menu - Daging rendang HPP Rp 15.445</option>{menus.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
          <div><label className="font-bold" style={{fontSize:'13px'}}>Jumlah Porsi</label><input type="number" className="w-full border-2 p-3 rounded-xl mt-1 font-bold" style={{fontSize:'16px'}} value={jumlahPorsi} onChange={e=>setJumlahPorsi(e.target.value)} /></div>
          <div><label className="font-bold" style={{fontSize:'13px'}}>Customer & Tanggal</label><input className="w-full border-2 p-3 rounded-xl mt-1" style={{fontSize:'14px'}} value={customerName} onChange={e=>setCustomerName(e.target.value)} /><input type="date" className="w-full border-2 p-3 rounded-xl mt-2" style={{fontSize:'14px'}} value={tanggalOrder} onChange={e=>setTanggalOrder(e.target.value)} /></div>
        </div>
        {selectedMenu && kalkulasi && (
          <>
            <div className="grid md:grid-cols-4 gap-3">
              <div className="bg-[#FFF8E1] p-3 rounded-xl border"><div style={{fontSize:'12px'}}>HPP / Porsi</div><div className="font-bold" style={{fontSize:'15px'}}>Rp {kalkulasi.totalHPPPerPorsi.toLocaleString('id-ID')}</div></div>
              <div className="bg-slate-50 p-3 rounded-xl border"><div style={{fontSize:'12px'}}>Total HPP</div><div className="font-bold" style={{fontSize:'15px'}}>Rp {kalkulasi.totalHPP.toLocaleString('id-ID')}</div></div>
              <div className="bg-slate-50 p-3 rounded-xl border"><div style={{fontSize:'12px'}}>Total Jual</div><div className="font-bold" style={{fontSize:'15px'}}>Rp {kalkulasi.totalJual.toLocaleString('id-ID')}</div></div>
              <div className="bg-green-50 p-3 rounded-xl border-2 border-green-200"><div style={{fontSize:'12px'}}>Profit</div><div className="font-bold text-green-800" style={{fontSize:'15px'}}>Rp {kalkulasi.totalProfit.toLocaleString('id-ID')} ({kalkulasi.persenProfit}%)</div></div>
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={buatOrder} className="bg-[#D4AF37] text-black font-bold px-8 py-3 rounded-full" style={{fontSize:'15px'}}>📦 Buat Order {jumlahPorsi} Porsi - {selectedMenu.name}</button>
              <button onClick={()=>setShowSQL(!showSQL)} className="bg-slate-100 px-4 py-2 rounded-full" style={{fontSize:'13px'}}>🔧 SQL Fix</button>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="bg-slate-100 px-5 py-3 font-bold flex justify-between" style={{fontSize:'14px'}}><span>📜 History Order ({orders.length}) - Tidak Hilang!</span><button onClick={loadAll} className="bg-white border px-3 py-1 rounded-full text-[12px]">🔄 Refresh</button></div>
        {orders.length===0 ? <div className="p-6 text-center text-slate-500" style={{fontSize:'13px'}}>Belum ada history. Buat order dulu. Kalau history tidak muncul setelah buat order, klik SQL Fix & jalankan SQL di Supabase.</div> :
          <table className="w-full" style={{fontSize:'13px'}}><thead className="bg-slate-50"><tr><th className="p-2">Tanggal</th><th className="p-2">Menu</th><th className="p-2">Porsi</th><th className="p-2">Customer</th><th className="p-2 text-right">HPP</th><th className="p-2 text-right">Jual</th><th className="p-2">Status</th></tr></thead><tbody>{orders.map(o=><tr key={o.id} className="border-b"><td className="p-2">{o.tanggal_order}</td><td className="p-2 font-bold">{o.menus?.name}</td><td className="p-2 text-center">{o.jumlah_porsi}</td><td className="p-2">{o.customer_name}</td><td className="p-2 text-right">Rp {Number(o.total_hpp).toLocaleString('id-ID')}</td><td className="p-2 text-right">Rp {Number(o.total_jual).toLocaleString('id-ID')}</td><td className="p-2"><span className="bg-yellow-100 px-2 py-1 rounded text-[11px]">{o.status}</span></td></tr>)}</tbody></table>
        }
      </div>
    </div>
  )
}
