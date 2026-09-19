"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// MASTER MENU V16.7 - FIX SESUAI DEAL: HANYA 2 PILIHAN PAKET & SATUAN - KONDISIONAL BOX - TOMBOL SIMPAN FIX
export default function MasterMenuPage(){
  const [items,setItems]=useState([]);
  const [menuItems,setMenuItems]=useState([]);
  const [searchBahan,setSearchBahan]=useState("");
  const [searchOptional,setSearchOptional]=useState("");
  const [showTambah,setShowTambah]=useState(false);
  const [tipeMenu,setTipeMenu]=useState("PAKET"); // HANYA 2 PILIHAN BOS - PAKET & SATUAN
  const [newNama,setNewNama]=useState("");
  const [newQty,setNewQty]=useState("10");
  const [newHargaBaru,setNewHargaBaru]=useState("25000");
  const [selectedBahan,setSelectedBahan]=useState([]);
  const [optionalBahan,setOptionalBahan]=useState([]);
  const [komponenExpanded,setKomponenExpanded]=useState({});
  const [isSaving,setIsSaving]=useState(false);

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
      // Untuk SATUAN default qty 1 porsi, untuk PAKET default 0.15
      const defaultQty = tipeMenu==="SATUAN" ? 1 : 0.15;
      const defaultSatuan = tipeMenu==="SATUAN" ? "Porsi" : (it.satuan||"Kg");
      setList(prev=> [...prev, {
        kode_bahan: it.kode_bahan,
        nama_bahan: it.nama_bahan||it.name,
        qty_per_porsi: defaultQty,
        satuan: defaultSatuan,
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

  const allKomponen = tipeMenu==="PAKET" ? [...selectedBahan, ...optionalBahan] : selectedBahan;
  const qtyOrder = Number(newQty||1);
  const stockChecks = allKomponen.map(b=>{
    const required = Number(b.qty_per_porsi||0) * qtyOrder;
    const available = Number(b.stock_available||0);
    return {...b, required, available, kurang: available - required, is_cukup: available >= required};
  });
  const tidakTersedia = stockChecks.filter(c=> !c.is_cukup);
  const isStockAman = tidakTersedia.length===0;

  const totalHppPerPorsi = allKomponen.reduce((s,b)=> s + (Number(b.qty_per_porsi||0)*Number(b.harga_beli||0)), 0);
  const totalHppQty = totalHppPerPorsi * qtyOrder;

  async function handleSimpan(){
    if(isSaving) return;
    if(!newNama) return alert("Nama Menu kosong Bos");
    if(selectedBahan.length===0) return alert(`Pilih minimal 1 bahan ${tipeMenu==="PAKET" ? "fixed Paket" : "Satuan"} Bos`);
    if(!isStockAman){
      return alert(`Gagal Bos: Ada ${tidakTersedia.length} bahan stock kurang Bos: ${tidakTersedia.map(t=> `${t.kode_bahan} butuh ${t.required} stock ${t.available}`).join(", ")}`);
    }
    setIsSaving(true);
    const kodeMenu = `${tipeMenu==="PAKET" ? "PAKET" : "SATUAN"}-${String(menuItems.length+1).padStart(3,"0")}`;
    const payload = {
      kode: kodeMenu,
      kode_menu: kodeMenu,
      nama_menu: newNama,
      name: newNama,
      kategori: tipeMenu, // HANYA PAKET / SATUAN BOS SESUAI DEAL
      tipe: tipeMenu,
      tipe_menu: tipeMenu,
      qty: qtyOrder,
      quantity: qtyOrder,
      porsi: qtyOrder,
      harga_jual: Number(newHargaBaru||0),
      harga: Number(newHargaBaru||0),
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
    try{
      const { error } = await supabase.from("menu_items").insert([payload]);
      if(error){
        console.log("Insert error, coba fallback minimal Bos", error.message);
        const fallback = { kode: kodeMenu, nama_menu: newNama, name: newNama, kategori: tipeMenu, qty: qtyOrder, harga_jual: Number(newHargaBaru||0), deskripsi: payload.deskripsi, tipe: tipeMenu };
        const { error: e2 } = await supabase.from("menu_items").insert([fallback]);
        if(e2){ alert("Gagal Bos: "+e2.message); setIsSaving(false); return; }
      }
      alert(`Berhasil Bos: ${kodeMenu} ${tipeMenu} - ${newNama} - ${allKomponen.length} komponen - Stock AMAN Bos`);
      setShowTambah(false); setNewNama(""); setSelectedBahan([]); setOptionalBahan([]); setIsSaving(false); fetchMenu();
    }catch(err){
      alert("Error Bos: "+err.message);
      setIsSaving(false);
    }
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
          <h1 className="text-lg font-bold">Master Menu - V16.7 FIX 2 PILIHAN: PAKET & SATUAN + Stock Alert</h1>
          <p className="text-xs text-gray-500">{items.length} bahan • {menuItems.length} menu • Deal: Hanya 2 pilihan Paket & Satuan - Kondisional Box Bos</p>
        </div>
        <button onClick={()=>setShowTambah(true)} className="bg-green-600 text-white px-4 py-2 rounded text-xs font-bold">+ Buat Menu Paket / Satuan</button>
      </div>

      {showTambah && (
        <div className="bg-white border-2 border-green-600 p-4 rounded-xl mb-4 shadow-xl">
          <div className="font-bold text-sm mb-3">Buat Master Menu Paket - FIX 2 MODEL BOS SESUAI DEAL</div>
          
          {/* HANYA 2 PILIHAN BOS */}
          <div className="flex gap-3 mb-4">
            <button onClick={()=>{setTipeMenu("PAKET"); setSelectedBahan([]); setOptionalBahan([]);}} className={`flex-1 p-3 rounded-xl border-2 font-bold text-sm ${tipeMenu==="PAKET" ? 'bg-blue-600 text-white border-blue-700' : 'bg-white border-gray-300'}`}>
              📦 MENU PAKET (Box/Paket) - Nasi Box, Paket Ayam, Paket Lengkap
            </button>
            <button onClick={()=>{setTipeMenu("SATUAN"); setSelectedBahan([]); setOptionalBahan([]);}} className={`flex-1 p-3 rounded-xl border-2 font-bold text-sm ${tipeMenu==="SATUAN" ? 'bg-orange-600 text-white border-orange-700' : 'bg-white border-gray-300'}`}>
              🍗 MENU SATUAN (Masakan) - Ayam Bakar, Rendang, Sayur - 1-2 bahan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div><div className="text-xs font-bold">Nama Menu ({tipeMenu})</div><input value={newNama} onChange={e=>setNewNama(e.target.value)} placeholder={tipeMenu==="PAKET" ? "Paket Ayam bakar lengkap" : "Ayam Bakar Madu"} className="w-full p-2 border rounded text-sm font-bold" /></div>
            <div className="bg-blue-50 border-2 border-blue-400 p-2 rounded"><div className="text-xs font-bold">Tipe Menu - FIX 2 PILIHAN</div><select value={tipeMenu} onChange={e=>{setTipeMenu(e.target.value); setSelectedBahan([]); setOptionalBahan([]);}} className="w-full p-2 border-2 border-blue-600 rounded text-sm font-bold bg-white mt-1"><option value="PAKET">PAKET</option><option value="SATUAN">SATUAN</option></select></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-yellow-50 border-2 border-yellow-500 p-2 rounded"><div className="text-xs font-bold">QTY Pesanan</div><input type="number" value={newQty} onChange={e=>setNewQty(e.target.value)} className="w-full p-2 border-2 border-yellow-500 rounded text-sm font-bold mt-1" /></div>
              <div className="bg-green-50 border p-2 rounded"><div className="text-xs font-bold">Harga Jual / Porsi</div><input type="number" value={newHargaBaru} onChange={e=>setNewHargaBaru(e.target.value)} className="w-full p-2 border rounded text-sm font-bold mt-1" /></div>
            </div>
          </div>

          {/* STOCK ALERT */}
          {allKomponen.length>0 && (
            <div className={`p-3 rounded-xl border-2 mb-4 ${isStockAman ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-600'}`}>
              <div className="font-bold text-sm flex justify-between">
                <span>{isStockAman ? `✅ Stock AMAN untuk QTY ${qtyOrder} Bos - ${tipeMenu}` : `⚠️ ALERT ${tipeMenu}: ${tidakTersedia.length} Bahan Tidak Tersedia Bos!`}</span>
                <span className="text-xs">{tipeMenu==="PAKET" ? `${allKomponen.length} = ${selectedBahan.length} fixed + ${optionalBahan.length} optional` : `${selectedBahan.length} bahan satuan`}</span>
              </div>
              {!isStockAman && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {tidakTersedia.map(t=>(
                    <div key={t.kode_bahan} className="bg-white border border-red-400 p-2 rounded text-xs flex justify-between">
                      <div><b className="font-mono">{t.kode_bahan}</b> - {t.nama_bahan}<div className="text-[10px]">Butuh {t.required.toFixed(2)} {t.satuan} | Stock {t.available}</div></div>
                      <div className="text-red-600 font-bold">Kurang {(t.required - t.available).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* KONDISIONAL BOX SESUAI PILIHAN BOS */}
          {tipeMenu==="PAKET" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border-2 border-blue-500 rounded-xl p-3 bg-blue-50">
                <div className="font-bold text-xs mb-2">📦 FIXED Komponen Paket (Wajib ada Bos) - QTY/Porsi</div>
                <input value={searchBahan} onChange={e=>setSearchBahan(e.target.value)} placeholder="Cari bahan fixed paket..." className="w-full p-2 border rounded text-xs mb-2" />
                <div className="max-h-[25vh] overflow-auto bg-white rounded border mb-2">
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
                <div className="space-y-2 max-h-[35vh] overflow-auto">
                  {selectedBahan.map(b=>{
                    const check = stockChecks.find(c=> c.kode_bahan===b.kode_bahan && !c.is_optional);
                    return (
                      <div key={b.kode_bahan} className={`bg-white border rounded p-2 flex gap-2 items-center ${check && !check.is_cukup ? 'border-red-500 bg-red-50' : 'border-green-300'}`}>
                        <div className="flex-1 text-[11px]"><div className="font-bold font-mono">{b.kode_bahan}</div><div>{b.nama_bahan}</div><div className="text-[10px]">Stock {b.stock_available} | Butuh {(Number(b.qty_per_porsi||0)*qtyOrder).toFixed(2)} {b.satuan}</div></div>
                        <div className="w-20"><div className="text-[10px] font-bold">Qty/Porsi</div><input type="number" step="0.01" value={b.qty_per_porsi} onChange={e=>updateQty(b.kode_bahan, e.target.value, false)} className="w-full p-1 border-2 border-blue-400 rounded text-xs font-bold" /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="border-2 border-orange-400 rounded-xl p-3 bg-orange-50">
                <div className="font-bold text-xs mb-2">➕ OPTIONAL Add-on Paket (Tambahan jika ada permintaan Bos)</div>
                <input value={searchOptional} onChange={e=>setSearchOptional(e.target.value)} placeholder="Cari bahan optional..." className="w-full p-2 border rounded text-xs mb-2" />
                <div className="max-h-[25vh] overflow-auto bg-white rounded border mb-2">
                  {filteredOptional.slice(0,80).map(it=>{
                    const checked = optionalBahan.find(b=> b.kode_bahan===it.kode_bahan);
                    if(selectedBahan.find(b=> b.kode_bahan===it.kode_bahan)) return null;
                    return (
                      <label key={it.kode_bahan} className={`flex items-center gap-2 p-2 border-b hover:bg-orange-50 cursor-pointer ${checked?'bg-yellow-100':''}`}>
                        <input type="checkbox" checked={!!checked} onChange={()=>toggleBahan(it,true)} className="w-4 h-4" />
                        <div className="flex-1 text-[11px]"><span className="font-mono font-bold">{it.kode_bahan}</span> - {it.nama_bahan||it.name} <span className="text-gray-500">+ Rp {Number(it.harga_beli||0).toLocaleString("id-ID")}</span></div>
                      </label>
                    );
                  })}
                </div>
                <div className="space-y-2 max-h-[35vh] overflow-auto">
                  {optionalBahan.map(b=>(
                    <div key={b.kode_bahan} className="bg-white border border-orange-300 rounded p-2 flex gap-2 items-center">
                      <div className="flex-1 text-[11px]"><div className="font-bold font-mono">{b.kode_bahan} (Optional)</div><div>{b.nama_bahan}</div></div>
                      <div className="w-20"><div className="text-[10px] font-bold">Qty/Porsi</div><input type="number" step="0.01" value={b.qty_per_porsi} onChange={e=>updateQty(b.kode_bahan, e.target.value, true)} className="w-full p-1 border-2 border-orange-400 rounded text-xs font-bold" /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-orange-600 rounded-xl p-3 bg-orange-50">
              <div className="font-bold text-xs mb-2">🍗 Komponen SATUAN (1-2 bahan saja Bos) - Tidak ada Optional Bos</div>
              <input value={searchBahan} onChange={e=>setSearchBahan(e.target.value)} placeholder="Cari bahan untuk menu satuan..." className="w-full p-2 border rounded text-xs mb-2" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="max-h-[35vh] overflow-auto bg-white rounded border">
                  {filtered.slice(0,80).map(it=>{
                    const checked = selectedBahan.find(b=> b.kode_bahan===it.kode_bahan);
                    return (
                      <label key={it.kode_bahan} className={`flex items-center gap-2 p-2 border-b hover:bg-orange-50 cursor-pointer ${checked?'bg-green-100':''}`}>
                        <input type="checkbox" checked={!!checked} onChange={()=>toggleBahan(it,false)} className="w-4 h-4" />
                        <div className="flex-1 text-[11px]"><span className="font-mono font-bold">{it.kode_bahan}</span> - {it.nama_bahan||it.name} <span className="text-gray-500">Stock {it.stok||it.stock||0}</span></div>
                      </label>
                    );
                  })}
                </div>
                <div className="space-y-2 max-h-[35vh] overflow-auto">
                  {selectedBahan.map(b=>{
                    const check = stockChecks.find(c=> c.kode_bahan===b.kode_bahan);
                    return (
                      <div key={b.kode_bahan} className={`bg-white border rounded p-2 flex gap-2 items-center ${check && !check.is_cukup ? 'border-red-500 bg-red-50' : 'border-green-300'}`}>
                        <div className="flex-1 text-[11px]"><div className="font-bold font-mono">{b.kode_bahan}</div><div>{b.nama_bahan}</div><div className="text-[10px]">Stock {b.stock_available} | Butuh {(Number(b.qty_per_porsi||0)*qtyOrder).toFixed(2)} {b.satuan} {check && !check.is_cukup && <span className="text-red-600 font-bold">❌</span>}</div></div>
                        <div className="w-20"><div className="text-[10px] font-bold">Qty/Porsi</div><input type="number" step="0.01" value={b.qty_per_porsi} onChange={e=>updateQty(b.kode_bahan, e.target.value, false)} className="w-full p-1 border-2 border-orange-500 rounded text-xs font-bold" /></div>
                      </div>
                    );
                  })}
                  {selectedBahan.length===0 && <div className="text-xs text-gray-400 p-4 text-center border-dashed border rounded">Centang 1-2 bahan untuk menu satuan Bos</div>}
                </div>
              </div>
            </div>
          )}

          {allKomponen.length>0 && (
            <div className="mt-3 p-3 bg-white border-2 border-green-600 rounded text-xs">
              <b>Ringkasan {tipeMenu} Bos:</b> {newNama||"Nama Menu"} - QTY {qtyOrder} - {tipeMenu==="PAKET" ? `${selectedBahan.length} fixed + ${optionalBahan.length} optional = ${allKomponen.length} komponen` : `${selectedBahan.length} bahan satuan`} | HPP/Porsi Rp {Math.round(totalHppPerPorsi).toLocaleString("id-ID")} | Total HPP Rp {Math.round(totalHppQty).toLocaleString("id-ID")}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button onClick={handleSimpan} disabled={!isStockAman || isSaving} className={`flex-1 py-3 rounded font-bold text-sm ${isStockAman && !isSaving ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-300 text-red-800 cursor-not-allowed'}`}>
              {isSaving ? "Menyimpan..." : isStockAman ? `💾 Simpan ${tipeMenu} - ${allKomponen.length} Komponen - Stock AMAN` : `❌ Stock Tidak Cukup (${tidakTersedia.length} item) - Tidak Bisa Simpan ${tipeMenu}`}
            </button>
            <button onClick={()=>{setShowTambah(false); setSelectedBahan([]); setOptionalBahan([]);}} className="px-6 py-3 bg-gray-200 rounded text-sm">Batal</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-3 border overflow-auto">
        <div className="font-bold text-sm mb-2">Menu Paket & Satuan ({menuItems.length}) - 2 Model Sesuai Deal Bos</div>
        <div className="overflow-auto">
          <table className="w-full text-[11px] min-w-[1100px]">
            <thead className="bg-gray-50 text-[10px]"><tr>
              <th className="p-2 text-left">Tipe</th>
              <th className="p-2 text-left">Kode</th>
              <th className="p-2 text-left">Nama Menu</th>
              <th className="p-2 text-center bg-yellow-100">QTY</th>
              <th className="p-2 text-left bg-blue-50 min-w-[250px]">Komponen Flexible</th>
              <th className="p-2 text-center bg-red-50">Stock Status</th>
              <th className="p-2 text-right bg-green-50">Harga Jual</th>
              <th className="p-2 text-right bg-orange-50">HPP/Porsi</th>
              <th className="p-2">Aksi</th>
            </tr></thead>
            <tbody>
              {menuItems.map(m=>{
                const komps = parseKomponen(m);
                const tipe = m.tipe||m.tipe_menu||m.kategori||"PAKET";
                const hppPer = Number(m.hpp_per_porsi||m.hpp_baru||0);
                const stockStatus = m.stock_status||"AMAN";
                const isAlert = stockStatus.includes("KURANG");
                const isOpen = komponenExpanded[m.id];
                return (
                <>
                  <tr key={m.id} className={`border-t hover:bg-blue-50 ${isAlert?'bg-red-50':''}`}>
                    <td className="p-2"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${tipe==="PAKET" ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>{tipe}</span></td>
                    <td className="p-2 font-mono font-bold">{m.kode||m.kode_menu}</td>
                    <td className="p-2 font-bold">{m.nama_menu||m.name}</td>
                    <td className="p-2 text-center bg-yellow-50 font-bold">{m.qty||1}</td>
                    <td className="p-2 bg-blue-50"><div className="font-bold">{komps.length} item</div><div className="text-[10px] truncate max-w-[300px]">{komps.map(k=> k.kode_bahan).join(", ")}</div><button onClick={()=>setKomponenExpanded(prev=>({...prev, [m.id]: !isOpen}))} className="text-[10px] bg-white border px-2 py-0.5 rounded mt-1">{isOpen?'Tutup':'Detail'}</button></td>
                    <td className={`p-2 text-center font-bold ${isAlert ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{isAlert ? `⚠️ ${stockStatus}` : `✅ ${stockStatus}`}</td>
                    <td className="p-2 text-right bg-green-50 font-bold">Rp {Number(m.harga_jual||0).toLocaleString("id-ID")}</td>
                    <td className="p-2 text-right bg-orange-50">Rp {hppPer.toLocaleString("id-ID")}</td>
                    <td className="p-2"><button onClick={()=>handleDelete(m.id)} className="bg-red-100 text-red-600 px-2 py-1 rounded text-[10px]">🗑️</button></td>
                  </tr>
                  {isOpen && komps.length>0 && (
                    <tr className="bg-yellow-50"><td colSpan={9} className="p-3"><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{komps.map((k,i)=> (<div key={i} className="bg-white border p-2 rounded text-xs flex justify-between"><div><b>{k.kode_bahan}</b> - {k.nama_bahan}<div className="text-[10px]">{k.qty_per_porsi} {k.satuan}/porsi x {m.qty||1} = {(Number(k.qty_per_porsi||0)*Number(m.qty||1)).toFixed(2)} {k.satuan}</div></div></div>))}</div></td></tr>
                  )}
                </>
                );
              })}
              {menuItems.length===0 && <tr><td colSpan={9} className="p-6 text-center text-gray-400">Belum ada menu Bos, klik + Buat Menu Paket / Satuan Bos</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
