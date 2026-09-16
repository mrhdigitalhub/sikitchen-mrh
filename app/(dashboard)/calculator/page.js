"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function KalkulatorOrderFixOrdersTable() {
  const [items, setItems] = useState([])
  const [menus, setMenus] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMenuId, setSelectedMenuId] = useState('')
  const [jumlahPorsi, setJumlahPorsi] = useState(10)
  const [customerName, setCustomerName] = useState('')
  const [tanggalOrder, setTanggalOrder] = useState('2026-09-18')
  const [orders, setOrders] = useState([])
  const [showSQL, setShowSQL] = useState(false)

  async function loadAll(){
    setLoading(true)
    const { data: inv } = await supabase.from('inventory_items').select('*').order('kode_bahan').limit(500)
    const { data: m } = await supabase.from('menus').select('*').order('created_at', { ascending: false }).limit(100)
    const { data: rec } = await supabase.from('recipes').select('*, inventory_items(kode_bahan,nama_bahan,satuan,sub_kategori,harga_baru,stok), menus(name,harga_jual_per_porsi)').limit(1000)
    // coba load orders, kalau tabel belum ada tidak error
    const { data: ord, error: ordErr } = await supabase.from('orders').select('*, menus(name)').order('created_at', { ascending: false }).limit(20)
    if(ordErr){
      console.log('orders table belum ada:', ordErr.message)
      setShowSQL(true)
    }
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
    if(!selectedMenuId) return alert('Pilih Menu dulu - Daging rendang')
    if(!jumlahPorsi || Number(jumlahPorsi)<=0) return alert('Isi Jumlah Porsi - contoh 10')
    if(!kalkulasi) return alert('Resep belum ada - tambah bahan dulu di Master Menu & Resep')
    if(!kalkulasi.allCukup){
      if(!confirm(`Stok kurang! Tetap buat order ${jumlahPorsi} porsi ${selectedMenu.name}?`)) return
    }
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
      // FIX: tabel orders belum ada -> tampilkan kalkulasi sukses tanpa SQL mengganggu
      if(error.message.includes('orders') || error.message.includes('schema cache')){
        setShowSQL(true)
        alert(`✅ Kalkulasi Berhasil!\n\nMenu: ${selectedMenu.name}\nJumlah: ${jumlahPorsi} porsi\nCustomer: ${payload.customer_name}\nTanggal: ${tanggalOrder}\n\nTotal HPP: Rp ${kalkulasi.totalHPP.toLocaleString('id-ID')}\nTotal Jual: Rp ${kalkulasi.totalJual.toLocaleString('id-ID')}\nProfit: Rp ${kalkulasi.totalProfit.toLocaleString('id-ID')} (${kalkulasi.persenProfit}%)\n\n⚠️ History order belum tersimpan karena tabel orders belum ada di Supabase.\nKlik OK lalu jalankan SQL di bawah di Supabase SQL Editor untuk buat tabel orders!`)
        return
      }
      return alert(`Error: ${error.message}`)
    }
    alert(`✅ Order Berhasil Dibuat!\n\nID: ${data.id.slice(0,8)}\n${selectedMenu.name} - ${jumlahPorsi} porsi\nCustomer: ${payload.customer_name}\nTotal HPP: Rp ${kalkulasi.totalHPP.toLocaleString('id-ID')}\nTotal Jual: Rp ${kalkulasi.totalJual.toLocaleString('id-ID')}\nProfit: Rp ${kalkulasi.totalProfit.toLocaleString('id-ID')} (${kalkulasi.persenProfit}%)`)
    loadAll()
  }

  if(loading) return <div className="p-6" style={{fontFamily:'Arial, sans-serif', fontSize:'16px'}}>Loading Kalkulator Order Tahap 4...</div>

  return (
    <div className="space-y-4" style={{fontFamily:'Arial, sans-serif'}}>
      <div className="bg-white p-4 rounded-xl border flex justify-between items-start">
        <div>
          <div className="font-bold" style={{fontSize:'20px'}}>Kalkulator Order - Tahap 4 (Fix Orders Table)</div>
          <div className="text-slate-500 mt-1" style={{fontSize:'14px'}}>Pilih Menu Daging rendang • Input Jumlah Porsi • Auto kebutuhan bahan (qty_per_porsi × jumlah) • Cek stok {items.length} bahan • HPP/Jual/Profit - Font Arial +2px</div>
        </div>
        <div className="bg-[#FFF8E1] border px-3 py-1.5 rounded-full font-bold" style={{fontSize:'13px'}}>{menus.length} Menu • {items.length} Bahan • {recipes.length} Resep</div>
      </div>

      {showSQL && (
        <div className="bg-yellow-50 border-2 border-yellow-400 p-4 rounded-xl">
          <div className="font-bold" style={{fontSize:'15px'}}>🔧 FIX: Tabel orders belum ada di Supabase (makanya alert SQL muncul di screenshot Bos image_acef15.png)</div>
          <div className="mt-2" style={{fontSize:'13px'}}>Jalankan SQL ini 1x di Supabase SQL Editor (copy paste):</div>
          <pre className="bg-[#0A1931] text-green-300 p-3 rounded-lg mt-2 overflow-x-auto" style={{fontSize:'12px'}}>
{`-- Buat tabel orders untuk Kalkulator Order Tahap 4
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

-- Biar bisa diakses tanpa RLS error
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';`}
          </pre>
          <div className="mt-2 flex gap-2">
            <button onClick={()=>{ navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS orders (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, menu_id UUID REFERENCES menus(id) ON DELETE CASCADE, jumlah_porsi INT NOT NULL, customer_name TEXT DEFAULT 'Umum', tanggal_order DATE DEFAULT CURRENT_DATE, total_hpp INT DEFAULT 0, total_jual INT DEFAULT 0, total_profit INT DEFAULT 0, status TEXT DEFAULT 'Draft', created_at TIMESTAMPTZ DEFAULT NOW()); ALTER TABLE orders DISABLE ROW LEVEL SECURITY; NOTIFY pgrst, 'reload schema';`); alert('SQL copied! Paste di Supabase SQL Editor'); }} className="bg-[#0A1931] text-white px-4 py-2 rounded-full font-bold" style={{fontSize:'13px'}}>📋 Copy SQL</button>
            <button onClick={()=>setShowSQL(false)} className="bg-slate-200 px-4 py-2 rounded-full font-bold" style={{fontSize:'13px'}}>Tutup</button>
            <button onClick={()=>loadAll()} className="bg-green-600 text-white px-4 py-2 rounded-full font-bold" style={{fontSize:'13px'}}>🔄 Refresh setelah buat tabel</button>
          </div>
          <div className="mt-2" style={{fontSize:'12px'}}>Setelah jalankan SQL, refresh /calculator → alert SQL tidak muncul lagi, order bisa tersimpan di history!</div>
        </div>
      )}

      <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="font-bold" style={{fontSize:'13px'}}>Pilih Menu</label>
            <select className="w-full border-2 p-3 rounded-xl bg-white mt-1" style={{fontSize:'14px', fontFamily:'Arial, sans-serif'}} value={selectedMenuId} onChange={e=>setSelectedMenuId(e.target.value)}>
              <option value="">▼ Pilih Menu - Daging rendang 7 bahan</option>
              {menus.map(m=>{
                const hpp = recipes.filter(r=>r.menu_id===m.id).reduce((acc, r)=> acc + Number(r.inventory_items?.harga_baru||0)*Number(r.qty_per_porsi||0),0)
                return <option key={m.id} value={m.id}>{m.name} - HPP Rp {hpp.toLocaleString('id-ID')}/porsi - Jual Rp {Number(m.harga_jual_per_porsi||25000).toLocaleString('id-ID')} - {m.base_porsi} porsi</option>
              })}
            </select>
          </div>
          <div>
            <label className="font-bold" style={{fontSize:'13px'}}>Jumlah Porsi Order</label>
            <input type="number" className="w-full border-2 p-3 rounded-xl bg-white mt-1 font-bold" style={{fontSize:'16px', fontFamily:'Arial, sans-serif'}} value={jumlahPorsi} onChange={e=>setJumlahPorsi(e.target.value)} placeholder="10" />
            <div className="mt-1 text-slate-500" style={{fontSize:'12px'}}>Contoh screenshot: 10 porsi → Total Butuh 1.000 Kg Beras, 0.800 Kg Daging Sapi</div>
          </div>
          <div>
            <label className="font-bold" style={{fontSize:'13px'}}>Customer & Tanggal (18/09/2026)</label>
            <input className="w-full border-2 p-3 rounded-xl bg-white mt-1" style={{fontSize:'14px'}} placeholder="Nama Customer" value={customerName} onChange={e=>setCustomerName(e.target.value)} />
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
              <div style={{fontSize:'11px'}}>{kalkulasi.persenProfit}% - {kalkulasi.allCukup ? '✅ Stok Cukup' : '⚠️ Stok Kurang'}</div>
            </div>
          </div>
        )}

        {selectedMenu && kalkulasi && (
          <div className="flex justify-center gap-3 pt-2">
            <button onClick={buatOrder} className="bg-[#D4AF37] text-black font-bold px-8 py-3 rounded-full" style={{fontSize:'15px'}}>📦 Buat Order {jumlahPorsi} Porsi - {selectedMenu.name}</button>
            <button onClick={()=>setShowSQL(!showSQL)} className="bg-slate-200 text-black font-bold px-6 py-3 rounded-full" style={{fontSize:'14px'}}>{showSQL ? 'Tutup SQL' : '🔧 Tampilkan SQL Fix'}</button>
            <button onClick={()=>{ setSelectedMenuId(''); setJumlahPorsi(10) }} className="bg-slate-100 text-black font-bold px-6 py-3 rounded-full" style={{fontSize:'14px'}}>Reset</button>
          </div>
        )}
      </div>

      {selectedMenu && kalkulasi && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-[#0A1931] text-white px-5 py-3 flex justify-between items-center">
            <span className="font-bold" style={{fontSize:'15px'}}>Kebutuhan Bahan: {selectedMenu.name} - {jumlahPorsi} porsi - {kalkulasi.kebutuhan.length} bahan dari {items.length} bahan</span>
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
        </div>
      )}

      {orders.length>0 && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-slate-100 px-5 py-3 font-bold" style={{fontSize:'14px'}}>History Order Terakhir ({orders.length}) - Tersimpan di Supabase</div>
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
          <div className="font-bold" style={{fontSize:'16px'}}>Pilih Menu Daging rendang di atas untuk mulai Kalkulator Order Tahap 4</div>
          <div className="text-slate-500 mt-2" style={{fontSize:'13px'}}>Contoh screenshot Bos image_acef15.png: Daging rendang - 10 porsi → Butuh Beras 0.1×10=1.000 Kg (Stok 170 Kg ✅ Cukup Rp 15.500/Kg Rp 15.500), Daging Sapi 0.08×10=0.800 Kg (Stok 10 Kg ✅ Cukup Rp 150.000/Kg Rp 120.000), Minyak 0.015×10=0.150 Ltr (Stok 30 Ltr ✅ Cukup) → HPP Rp 15.445/porsi, Jual Rp 25.000, Profit Rp 95.550 (38%)</div>
        </div>
      )}
    </div>
  )
}
