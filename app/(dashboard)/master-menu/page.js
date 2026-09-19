"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// MASTER MENU V16.6 - 2 MODEL: MENU PAKET (Box/Paket) & MENU SATUAN (Masakan) + STOCK ALERT
export default function MasterMenuPage(){
  const [items,setItems]=useState([]);
  const [menuItems,setMenuItems]=useState([]);
  const [searchBahan,setSearchBahan]=useState("");
  const [showTambah,setShowTambah]=useState(false);
  const [tipeMenu,setTipeMenu]=useState("PAKET"); // PAKET atau SATUAN
  const [newNama,setNewNama]=useState("");
  const [newKategori,setNewKategori]=useState("Paket");
  const [newQty,setNewQty]=useState("10");
  const [newHargaLama,setNewHargaLama]=useState("25000");
  const [newHargaBaru,setNewHargaBaru]=useState("25000");
  const [selectedBahan,setSelectedBahan]=useState([]);
  const [optionalBahan,setOptionalBahan]=useState([]);
  const [searchOptional,setSearchOptional]=useState("");
  const [komponenExpanded,setKomponenExpanded]=useState({});

  useEffect(()=>{ fetchBahan(); fetchMenu(); },[]);

  async function fetchBahan(){
    const {data}=await supabase.from("inventory_items").select("*").order("kode_bahan");
    setItems(data||[]);
  }
  async function fetchMenu(){
    const {data}=await supabase.from("menu_items").select("*").order("created_at",{ascending:false}).limit(100);
    setMenuItems(data||[]);
  }

  const filtered = items.filter(i=>{
    if(!searchBahan) return true;
    const s=searchBahan.toLowerCase();
    return (i.kode_bahan||"").toLowerCase().includes(s) || (i.nama_bahan||i.name||"").toLowerCase().includes(s);
  });
  const filteredOptional = items.filter(i=>{
    if(!searchOptional) return true;
    const s=searchOptional.toLowerCase();
    return (i.kode_bahan||"").toLowerCase().includes(s) || (i.nama_bahan||i.name||"").toLowerCase().includes(s);
  });

  function toggleBahan(it, isOptional=false){
    const list = isOptional ? optionalBahan : selectedBahan;
    const setList = isOptional ? setOptionalBahan : setSelectedBahan;
    const exists = list.find(b=> b.kode_bahan===it.kode_bahan);
    if(exists){
      setList(prev=> prev.filter(b=> b.kode_bahan!==it.kode_bahan));
    } else {
      setList(prev=> [...prev, {
        kode_bahan: it.kode_bahan,
        nama_bahan: it.nama_bahan||it.name,
        qty_per_porsi: tipeMenu==="SATUAN" ? 1 : 0.15,
        satuan: it.satuan|| (tipeMenu==="SATUAN" ? "Porsi" : "Kg"),
        harga_beli: Number(it.harga_beli||it.harga||0),
        stock_available: Number(it.stok||it.stock||0),
        is_optional: isOptional
      }]);
    }
  }

  function updateQty(kode, val, isOptional){
    const setList = isOptional ? setOptionalBahan : setSelectedBahan;
    setList(prev=> prev.map(b=> b.kode_bahan===kode ? {...b, qty_per_porsi: Number(val)||0} : b));
  }

  const allKomponen = [...selectedBahan, ...optionalBahan];
  const qtyOrder = Number(newQty||1);
  // STOCK ALERT LOGIC
  const stockChecks = allKomponen.map(b=>{
    const required = Number(b.qty_per_porsi||0) * qtyOrder;
    const available = Number(b.stock_available||0);
    const kurang = available - required;
    return {...b, required, available, kurang, is_cukup: available >= required};
  });
  const tidakTersedia = stockChecks.filter(c=> !c.is_cukup);
  const isStockAman = tidakTersedia.length===0;

  const totalHppPerPorsi = allKomponen.reduce((s,b)=> s + (Number(b.qty_per_porsi||0)*Number(b.harga_beli||0)), 0);
  const totalHppQty = totalHppPerPorsi * qtyOrder;

  async function handleSimpan(){
    if(!newNama) return alert("Nama Menu kosong Bos");
    if(selectedBahan.length===0) return alert("Pilih minimal 1 bahan fixed Bos");
    if(!isStockAman) return alert(`Gagal Bos: Ada ${tidakTersedia.length} bahan stock tidak cukup Bos: ${tidakTersedia.map(t=> `${t.kode_bahan} butuh ${t.required} stock ${t.available}`).join(", ")}`);
    const kodeMenu = `${tipeMenu==="PAKET" ? "PAKET" : "SATUAN"}-${String(menuItems.length+1).padStart(3,"0")}`;
    const payload = {
      kode: kodeMenu,
      kode_menu: kodeMenu,
      nama_menu: newNama,
      name: newNama,
      kategori: newKategori,
      tipe: tipeMenu,
      tipe_menu: tipeMenu,
      qty: qtyOrder,
      quantity: qtyOrder,
      porsi: qtyOrder,
      harga_jual: Number(newHargaBaru||0),
      harga: Number(newHargaBaru||0),
      harga_lama: Number(newHargaLama||0),
      harga_baru: Number(newHargaBaru||0),
      hpp_per_porsi: Math.round(totalHppPerPorsi),
      hpp_baru: Math.round(totalHppPerPorsi),
      hpp_total: Math.round(totalHppQty),
      komponen: JSON.stringify(allKomponen),
      bahan_list: JSON.stringify(allKomponen),
      fixed_components: JSON.stringify(selectedBahan),
      optional_components: JSON.stringify(optionalBahan),
      komponen_count: allKomponen.length,
      fixed_count: selectedBahan.length,
      optional_count: optionalBahan.length,
      deskripsi: allKomponen.map(b=> `${b.kode_bahan}(${b.qty_per_porsi}${b.satuan})`).join(", "),
      stock_status: isStockAman ? "AMAN" : `KURANG ${tidakTersedia.length} ITEM`,
    };
    const { error } = await supabase.from("menu_items").insert([payload]);
    if(error){
      const fallback = { kode: kodeMenu, nama_menu: newNama, name: newNama, kategori: newKategori, qty: qtyOrder, harga_jual: Number(newHargaBaru||0), deskripsi: payload.deskripsi };
      const { error: e2 } = await supabase.from("menu_items").insert([fallback]);
      if(e2){ alert("Gagal Bos: "+e2.message); return; }
    }
    alert(`Berhasil Bos: ${kodeMenu} Tipe ${tipeMenu} - ${newNama} - ${allKomponen.length} komponen (${selectedBahan.length} fixed + ${optionalBahan.length} optional) - Stock AMAN Bos`);
    setShowTambah(false); setNewNama(""); setSelectedBahan([]); setOptionalBahan([]); fetchMenu();
  }

  async function handleDelete(id){
    if(!confirm("Hapus menu ini Bos?")) return;
    await supabase.from("menu_items").delete().eq("id", id);
    fetchMenu();
  }

  function parseKomponen(m){
    try{
      const raw = m.komponen || m.bahan_list;
      if(!raw) return [];
      return Array.isArray(raw) ? raw : JSON.parse(raw);
    }catch{ return []; }
  }

  return (
    <div className="p-3 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h1 className="text-lg font-bold">Master Menu - V16.6 2 MODEL: PAKET & SATUAN + Stock Alert</h1>
          <p className="text-xs text-gray-500">{items.length} bahan • {menuItems.length} menu • Model: Menu Paket (Box/Paket) & Menu Satuan (Masakan) Bos</p>
        </div>
        <button onClick={()=>setShowTambah(true)} className="bg-green-600 text-white px-4 py-2 rounded text-xs font-bold">+ Buat Menu Paket / Satuan</button>
      </div>

      {showTambah && (
        <div className="bg-white border-2 border-green-600 p-4 rounded-xl mb-4 shadow-xl">
          <div className="font-bold text-sm mb-3">Buat Master Menu Paket - 2 Model Bos</div>
          
          {/* TIPE MENU */}
          <div className="flex gap-3 mb-4">
            <button onClick={()=>setTipeMenu("PAKET")} className={`flex-1 p-3 rounded-xl border-2 font-bold text-sm ${tipeMenu==="PAKET" ? 'bg-blue-600 text-white border-blue-700' : 'bg-white border-gray-300'}`}>
              📦 MENU PAKET (Box/Paket) - Nasi Box, Paket Ayam, Paket Lengkap - Isi banyak komponen Bos
            </button>
            <button onClick={()=>setTipeMenu("SATUAN")} className={`flex-1 p-3 rounded-xl border-2 font-bold text-sm ${tipeMenu==="SATUAN" ? 'bg-orange-600 text-white border-orange-700' : 'bg-white border-gray-300'}`}>
              🍗 MENU SATUAN (Masakan) - Ayam Bakar, Rendang, Sayur - 1-2 bahan Bos
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div><div className="text-xs font-bold">Nama Menu</div><input value={newNama} onChange={e=>setNewNama(e.target.value)} placeholder={tipeMenu==="PAKET" ? "Paket Nasi Box Ayam Bakar" : "Ayam Bakar Madu"} className="w-full p-2 border rounded text-sm font-bold" /></div>
            <div><div className="text-xs font-bold">Kategori</div><select value={newKategori} onChange={e=>setNewKategori(e.target.value)} className="w-full p-2 border rounded text-sm"><option>Paket</option><option>Box</option><option>Nasi Box</option><option>Snack Box</option><option>Prasmanan</option><option>Satuan</option><option>Lauk</option><option>Sayur</option></select></div>
            <div className="bg-yellow-50 border-2 border-yellow-500 p-2 rounded"><div className="text-xs font-bold">QTY Pesanan</div><input type="number" value={newQty} onChange={e=>setNewQty(e.target.value)} className="w-full p-2 border-2 border-yellow-500 rounded text-sm font-bold mt-1" /></div>
            <div className="bg-green-50 border p-2 rounded"><div className="text-xs font-bold">Harga Jual / Porsi</div><input type="number" value={newHargaBaru} onChange={e=>setNewHargaBaru(e.target.value)} className="w-full p-2 border rounded text-sm font-bold mt-1" /></div>
          </div>

          {/* STOCK ALERT BANNER */}
          {allKomponen.length>0 && (
            <div className={`p-3 rounded-xl border-2 mb-4 ${isStockAman ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-600 animate-pulse'}`}>
              <div className="font-bold text-sm flex justify-between">
                <span>{isStockAman ? `✅ Stock AMAN untuk QTY ${qtyOrder} Bos` : `⚠️ ALERT: ${tidakTersedia.length} Bahan Tidak Tersedia Bos!`}</span>
                <span className="text-xs">{allKomponen.length} komponen = {selectedBahan.length} fixed + {optionalBahan.length} optional</span>
              </div>
              {!isStockAman && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {tidakTersedia.map(t=>(
                    <div key={t.kode_bahan} className="bg-white border border-red-400 p-2 rounded text-xs flex justify-between">
                      <div><b className="font-mono">{t.kode_bahan}</b> - {t.nama_bahan}<div className="text-[10px]">Butuh {t.required.toFixed(2)} {t.satuan} | Stock {t.available} {t.satuan}</div></div>
                      <div className="text-red-600 font-bold">Kurang {t.kurang.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* FIXED COMPONENTS */}
            <div className="border-2 border-blue-500 rounded-xl p-3 bg-blue-50">
              <div className="font-bold text-xs mb-2">📦 FIXED Komponen Paket {tipeMenu==="PAKET" ? "(Wajib ada Bos)" : "(Bahan utama satuan)"}</div>
              <input value={searchBahan} onChange={e=>setSearchBahan(e.target.value)} placeholder="Cari bahan fixed..." className="w-full p-2 border rounded text-xs mb-2" />
              <div className="max-h-[30vh] overflow-auto bg-white rounded border mb-2">
                {filtered.slice(0,80).map(it=>{
                  const checked = selectedBahan.find(b=> b.kode_bahan===it.kode_bahan);
                  return (
                    <label key={it.kode_bahan} className={`flex items-center gap-2 p-2 border-b hover:bg-blue-50 cursor-pointer ${checked?'bg-green-100':''}`}>
                      <input type="checkbox" checked={!!checked} onChange={()=>toggleBahan(it,false)} className="w-4 h-4" />
                      <div className="flex-1 text-[11px]"><span className="font-mono font-bold">{it.kode_bahan}</span> - {it.nama_bahan||it.name} <span className="text-gray-500">Stock {it.stok||it.stock||0}</span></div>
                    </label>
                  );
                })}
              </div>
              <div className="space-y-2 max-h-[30vh] overflow-auto">
                {selectedBahan.map(b=>{
                  const check = stockChecks.find(c=> c.kode_bahan===b.kode_bahan && !c.is_optional);
                  return (
                    <div key={b.kode_bahan} className={`bg-white border rounded p-2 flex gap-2 items-center ${check && !check.is_cukup ? 'border-red-500 bg-red-50' : 'border-green-300'}`}>
                      <div className="flex-1 text-[11px]"><div className="font-bold font-mono">{b.kode_bahan}</div><div>{b.nama_bahan}</div><div className="text-[10px]">Stock {b.stock_available} | Butuh {(Number(b.qty_per_porsi||0)*qtyOrder).toFixed(2)} {b.satuan} {check && !check.is_cukup && <span className="text-red-600 font-bold">❌ KURANG</span>}</div></div>
                      <div className="w-20"><div className="text-[10px] font-bold">Qty/Porsi</div><input type="number" step="0.01" value={b.qty_per_porsi} onChange={e=>updateQty(b.kode_bahan, e.target.value, false)} className="w-full p-1 border-2 border-blue-400 rounded text-xs font-bold" /></div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* OPTIONAL ADD-ON */}
            <div className="border-2 border-orange-400 rounded-xl p-3 bg-orange-50">
              <div className="font-bold text-xs mb-2">➕ OPTIONAL Add-on (Tambahan jika ada permintaan Bos) - Flexible Bos</div>
              <input value={searchOptional} onChange={e=>setSearchOptional(e.target.value)} placeholder="Cari bahan optional..." className="w-full p-2 border rounded text-xs mb-2" />
              <div className="max-h-[30vh] overflow-auto bg-white rounded border mb-2">
                {filteredOptional.slice(0,80).map(it=>{
                  const checked = optionalBahan.find(b=> b.kode_bahan===it.kode_bahan);
                  const alreadyFixed = selectedBahan.find(b=> b.kode_bahan===it.kode_bahan);
                  if(alreadyFixed) return null;
                  return (
                    <label key={it.kode_bahan} className={`flex items-center gap-2 p-2 border-b hover:bg-orange-50 cursor-pointer ${checked?'bg-yellow-100':''}`}>
                      <input type="checkbox" checked={!!checked} onChange={()=>toggleBahan(it,true)} className="w-4 h-4" />
                      <div className="flex-1 text-[11px]"><span className="font-mono font-bold">{it.kode_bahan}</span> - {it.nama_bahan||it.name} <span className="text-gray-500">+ Rp {Number(it.harga_beli||0).toLocaleString("id-ID")}</span></div>
                    </label>
                  );
                })}
              </div>
              <div className="space-y-2 max-h-[30vh] overflow-auto">
                {optionalBahan.map(b=>{
                  const check = stockChecks.find(c=> c.kode_bahan===b.kode_bahan && c.is_optional);
                  return (
                    <div key={b.kode_bahan} className={`bg-white border rounded p-2 flex gap-2 items-center ${check && !check.is_cukup ? 'border-red-500 bg-red-50' : 'border-orange-300'}`}>
                      <div className="flex-1 text-[11px]"><div className="font-bold font-mono">{b.kode_bahan} (Optional)</div><div>{b.nama_bahan}</div><div className="text-[10px]">+ Rp {Number(b.harga_beli).toLocaleString("id-ID")} {check && !check.is_cukup && <span className="text-red-600 font-bold">❌ Stock Kurang</span>}</div></div>
                      <div className="w-20"><div className="text-[10px] font-bold">Qty/Porsi</div><input type="number" step="0.01" value={b.qty_per_porsi} onChange={e=>updateQty(b.kode_bahan, e.target.value, true)} className="w-full p-1 border-2 border-orange-400 rounded text-xs font-bold" /></div>
                    </div>
                  );
                })}
                {optionalBahan.length===0 && <div className="text-[10px] text-gray-400 p-3 text-center">Belum ada optional Bos, centang di atas jika ada tambahan Bos</div>}
              </div>
            </div>
          </div>

          {allKomponen.length>0 && (
            <div className="mt-3 p-3 bg-white border-2 border-green-600 rounded text-xs">
              <b>Ringkasan {tipeMenu} Bos:</b> {newNama||"Nama Menu"} - QTY {qtyOrder} - Fixed {selectedBahan.length} + Optional {optionalBahan.length} = {allKomponen.length} komponen | HPP/Porsi Rp {Math.round(totalHppPerPorsi).toLocaleString("id-ID")} | Total HPP Rp {Math.round(totalHppQty).toLocaleString("id-ID")}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button onClick={handleSimpan} disabled={!isStockAman} className={`flex-1 py-3 rounded font-bold text-sm ${isStockAman ? 'bg-green-600 text-white' : 'bg-red-300 text-red-800 cursor-not-allowed'}`}>
              {isStockAman ? `💾 Simpan ${tipeMenu} - ${allKomponen.length} Komponen - Stock AMAN` : `❌ Stock Tidak Cukup (${tidakTersedia.length} item) - Tidak Bisa Simpan`}
            </button>
            <button onClick={()=>{setShowTambah(false); setSelectedBahan([]); setOptionalBahan([]);}} className="px-6 py-3 bg-gray-200 rounded text-sm">Batal</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-3 border overflow-auto">
        <div className="font-bold text-sm mb-2">Menu Paket & Satuan ({menuItems.length}) - 2 Model Bos</div>
        <div className="overflow-auto">
          <table className="w-full text-[11px] min-w-[1200px]">
            <thead className="bg-gray-50 text-[10px]"><tr>
              <th className="p-2 text-left">Tipe</th>
              <th className="p-2 text-left">Kode</th>
              <th className="p-2 text-left">Nama Menu</th>
              <th className="p-2 text-center bg-yellow-100">QTY</th>
              <th className="p-2 text-left bg-blue-50 min-w-[250px]">Komponen (Fixed + Optional) Flexible</th>
              <th className="p-2 text-center bg-red-50">Stock Status</th>
              <th className="p-2 text-right bg-green-50">Harga Jual</th>
              <th className="p-2 text-right bg-orange-50">HPP/Porsi</th>
              <th className="p-2 text-right bg-orange-100">HPP Total</th>
              <th className="p-2">Aksi</th>
            </tr></thead>
            <tbody>
              {menuItems.map(m=>{
                const komps = parseKomponen(m);
                const tipe = m.tipe||m.tipe_menu||"PAKET";
                const fixedCount = m.fixed_count || komps.filter(k=>!k.is_optional).length || komps.length;
                const optCount = m.optional_count || komps.filter(k=>k.is_optional).length || 0;
                const hppPer = Number(m.hpp_per_porsi||m.hpp_baru||0);
                const hppTot = Number(m.hpp_total|| hppPer * Number(m.qty||1));
                const stockStatus = m.stock_status||"AMAN";
                const isAlert = stockStatus.includes("KURANG");
                const isOpen = komponenExpanded[m.id];
                return (
                <>
                  <tr key={m.id} className={`border-t hover:bg-blue-50 ${isAlert?'bg-red-50':''}`}>
                    <td className="p-2"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${tipe==="PAKET" ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>{tipe}</span></td>
                    <td className="p-2 font-mono font-bold">{m.kode||m.kode_menu}</td>
                    <td className="p-2 font-bold">{m.nama_menu||m.name}<div className="text-[10px] text-gray-500">{m.kategori}</div></td>
                    <td className="p-2 text-center bg-yellow-50 font-bold">{m.qty||1}</td>
                    <td className="p-2 bg-blue-50"><div className="font-bold">{komps.length} item = {fixedCount} fixed + {optCount} optional {komps.length>0?'✅':''}</div><div className="text-[10px] truncate max-w-[300px]">{komps.map(k=> k.kode_bahan).join(", ")}</div><button onClick={()=>setKomponenExpanded(prev=>({...prev, [m.id]: !isOpen}))} className="text-[10px] bg-white border px-2 py-0.5 rounded mt-1">{isOpen?'Tutup':'Detail + Stock Alert'}</button></td>
                    <td className={`p-2 text-center font-bold ${isAlert ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{isAlert ? `⚠️ ${stockStatus}` : `✅ ${stockStatus}`}</td>
                    <td className="p-2 text-right bg-green-50 font-bold">Rp {Number(m.harga_jual||0).toLocaleString("id-ID")}</td>
                    <td className="p-2 text-right bg-orange-50">Rp {hppPer.toLocaleString("id-ID")}</td>
                    <td className="p-2 text-right bg-orange-100 font-bold">Rp {hppTot.toLocaleString("id-ID")}</td>
                    <td className="p-2"><button onClick={()=>handleDelete(m.id)} className="bg-red-100 text-red-600 px-2 py-1 rounded text-[10px]">🗑️</button></td>
                  </tr>
                  {isOpen && komps.length>0 && (
                    <tr className="bg-yellow-50"><td colSpan={10} className="p-3"><div className="text-xs font-bold">Detail {tipe}: {m.nama_menu} - QTY {m.qty||1} - {fixedCount} fixed + {optCount} optional:</div><div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">{komps.map((k,i)=>{ const qtyTotal = Number(k.qty_per_porsi||0) * Number(m.qty||1); return (<div key={i} className={`border p-2 rounded text-xs flex justify-between ${k.is_optional ? 'bg-orange-50 border-orange-300' : 'bg-white border-blue-300'}`}><div><b>{k.kode_bahan}</b> {k.is_optional && <span className="bg-orange-200 px-1 rounded text-[9px]">OPTIONAL</span>} - {k.nama_bahan}<div className="text-[10px]">{k.qty_per_porsi} {k.satuan}/porsi x {m.qty||1} = {qtyTotal.toFixed(2)} {k.satuan}</div></div><div className="text-right"><div>Rp {Number(k.harga_beli||0).toLocaleString("id-ID")}</div></div></div>); })}</div></td></tr>
                  )}
                </>
                );
              })}
              {menuItems.length===0 && <tr><td colSpan={10} className="p-6 text-center text-gray-400">Belum ada menu Bos, klik + Buat Menu Paket / Satuan Bos - 2 Model: Paket & Satuan</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
