"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// V17.2 FIX TOTAL KEBUTUHAN SEMUA SATUAN - QTY x QTY_PER_PORSI = TOTAL BUTUH BOS
export default function MasterMenuPage(){
  const [items,setItems]=useState([]);
  const [menuItems,setMenuItems]=useState([]);
  const [searchBahan,setSearchBahan]=useState("");
  const [searchOptional,setSearchOptional]=useState("");
  const [showTambah,setShowTambah]=useState(false);
  const [tipeMenu,setTipeMenu]=useState("PAKET");
  const [newNama,setNewNama]=useState("");
  const [newQty,setNewQty]=useState("10");
  const [newHargaBaru,setNewHargaBaru]=useState("25000");
  const [selectedBahan,setSelectedBahan]=useState([]);
  const [optionalBahan,setOptionalBahan]=useState([]);
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

  const allKomponen = tipeMenu==="PAKET" ? [...selectedBahan, ...optionalBahan] : selectedBahan;
  const qtyOrder = Number(newQty||1);
  const totalHppPerPorsi = allKomponen.reduce((s,b)=> s + (Number(b.qty_per_porsi||0)*Number(b.harga_beli||0)), 0);
  const totalHppQty = totalHppPerPorsi * qtyOrder;

  async function handleSimpan(){
    if(isSaving) return;
    if(!newNama) return alert("Nama kosong Bos");
    if(selectedBahan.length===0) return alert("Pilih bahan Bos");
    setIsSaving(true);
    const kodeMenu = `${tipeMenu}-${String(menuItems.length+1).padStart(3,"0")}`;
    const payload = {
      kode: kodeMenu, kode_menu: kodeMenu, nama_menu: newNama, name: newNama,
      kategori: tipeMenu, tipe: tipeMenu, tipe_menu: tipeMenu,
      qty: qtyOrder, harga_jual: Number(newHargaBaru||0), harga: Number(newHargaBaru||0),
      hpp_per_porsi: Math.round(totalHppPerPorsi), hpp_baru: Math.round(totalHppPerPorsi), hpp_total: Math.round(totalHppQty),
      komponen: JSON.stringify(allKomponen), bahan_list: JSON.stringify(allKomponen),
      komponen_count: allKomponen.length, deskripsi: allKomponen.map(b=> `${b.kode_bahan}(${b.qty_per_porsi}${b.satuan})`).join(", "),
      stock_status: "AMAN",
    };
    const { error } = await supabase.from("menu_items").insert([payload]);
    if(error){ alert("Gagal Bos: "+error.message); setIsSaving(false); return; }
    alert(`Berhasil Bos: ${kodeMenu} - ${allKomponen.length} komponen - Total butuh sesuai QTY ${qtyOrder} Bos`);
    setIsSaving(false); setShowTambah(false); setSelectedBahan([]); setOptionalBahan([]); setNewNama(""); fetchMenu();
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
      <div className="flex justify-between mb-3">
        <h1 className="font-bold">Master Menu - V17.2 TOTAL BUTUH FIX - QTY x Qty/Porsi = Total Semua Satuan</h1>
        <button onClick={()=>setShowTambah(true)} className="bg-green-600 text-white px-4 py-2 rounded text-xs font-bold">+ Buat Menu</button>
      </div>

      {showTambah && (
        <div className="bg-white border-2 border-green-600 p-4 rounded-xl mb-4">
          <div className="flex gap-3 mb-3">
            <button onClick={()=>setTipeMenu("PAKET")} className={`flex-1 p-2 border-2 rounded font-bold ${tipeMenu==="PAKET"?'bg-blue-600 text-white':''}`}>📦 PAKET</button>
            <button onClick={()=>setTipeMenu("SATUAN")} className={`flex-1 p-2 border-2 rounded font-bold ${tipeMenu==="SATUAN"?'bg-orange-600 text-white':''}`}>🍗 SATUAN</button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <input value={newNama} onChange={e=>setNewNama(e.target.value)} placeholder="Nama Menu" className="p-2 border rounded font-bold text-sm" />
            <div className="border-2 border-yellow-500 p-2 rounded bg-yellow-50"><div className="text-[10px] font-bold">QTY</div><input type="number" value={newQty} onChange={e=>setNewQty(e.target.value)} className="w-full p-2 border-2 border-yellow-500 rounded font-bold" /></div>
            <input type="number" value={newHargaBaru} onChange={e=>setNewHargaBaru(e.target.value)} placeholder="Harga Jual" className="p-2 border rounded text-sm" />
          </div>

          {allKomponen.length>0 && (
            <div className="p-3 bg-green-50 border-2 border-green-500 rounded mb-3 text-[13px] font-bold">
              ✅ HPP/Porsi Rp {Math.round(totalHppPerPorsi).toLocaleString("id-ID")} | Total HPP QTY {qtyOrder} = Rp {Math.round(totalHppQty).toLocaleString("id-ID")} | {allKomponen.length} komponen - Total butuh sudah x QTY Bos
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-blue-500 rounded-xl p-3 bg-blue-50">
              <div className="font-bold text-[13px] mb-2">📦 FIXED - Semua Satuan Total = Qty/Porsi x QTY</div>
              <input value={searchBahan} onChange={e=>setSearchBahan(e.target.value)} placeholder="Cari bahan..." className="w-full p-2 border rounded text-[13px] mb-2" />
              <div className="max-h-[25vh] overflow-auto bg-white rounded border mb-2">
                {filtered.slice(0,60).map(it=>{
                  const c = selectedBahan.find(b=> b.kode_bahan===it.kode_bahan);
                  return <label key={it.kode_bahan} className={`flex gap-2 p-2 border-b cursor-pointer ${c?'bg-green-100':''}`}><input type="checkbox" checked={!!c} onChange={()=>toggleBahan(it,false)} className="w-5 h-5" /><span className="text-[13px]">{it.kode_bahan} - {it.nama_bahan||it.name}</span></label>
                })}
              </div>
              <div className="space-y-2 max-h-[35vh] overflow-auto">
                {selectedBahan.map(b=>{
                  const totalButuh = Number(b.qty_per_porsi||0) * qtyOrder;
                  return (
                    <div key={b.kode_bahan} className="bg-white border-2 border-green-300 rounded p-2 text-[12px]">
                      <div className="font-bold font-mono">{b.kode_bahan} - {b.nama_bahan}</div>
                      <div className="flex justify-between mt-1">
                        <span>Rp {Number(b.harga_beli).toLocaleString("id-ID")} / {b.satuan}</span>
                        <span className="font-bold">{b.qty_per_porsi} {b.satuan}/porsi x {qtyOrder} = {totalButuh.toFixed(2)} {b.satuan} TOTAL</span>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <input type="number" step="0.01" value={b.qty_per_porsi} onChange={e=>updateQty(b.kode_bahan, e.target.value, false)} className="w-20 p-1 border-2 border-blue-400 rounded font-bold text-[13px]" />
                        <span className="text-[11px] bg-yellow-100 px-2 py-1 rounded border">Butuh {totalButuh.toFixed(2)} {b.satuan} untuk QTY {qtyOrder}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {tipeMenu==="PAKET" && (
              <div className="border-2 border-orange-400 rounded-xl p-3 bg-orange-50">
                <div className="font-bold text-[13px] mb-2">➕ OPTIONAL - Juga x QTY Bos</div>
                <input value={searchOptional} onChange={e=>setSearchOptional(e.target.value)} placeholder="Cari optional..." className="w-full p-2 border rounded text-[13px] mb-2" />
                <div className="max-h-[25vh] overflow-auto bg-white rounded border mb-2">
                  {filteredOptional.slice(0,60).map(it=>{
                    if(selectedBahan.find(b=> b.kode_bahan===it.kode_bahan)) return null;
                    const c = optionalBahan.find(b=> b.kode_bahan===it.kode_bahan);
                    return <label key={it.kode_bahan} className={`flex gap-2 p-2 border-b cursor-pointer ${c?'bg-yellow-100':''}`}><input type="checkbox" checked={!!c} onChange={()=>toggleBahan(it,true)} className="w-5 h-5" /><span className="text-[13px]">{it.kode_bahan}</span></label>
                  })}
                </div>
                <div className="space-y-2">
                  {optionalBahan.map(b=>{
                    const totalButuh = Number(b.qty_per_porsi||0) * qtyOrder;
                    return (
                      <div key={b.kode_bahan} className="bg-white border rounded p-2 text-[12px]">
                        <div className="font-bold">{b.kode_bahan} (Optional)</div>
                        <div>{b.qty_per_porsi} {b.satuan}/porsi x {qtyOrder} = {totalButuh.toFixed(2)} {b.satuan} TOTAL</div>
                        <input type="number" step="0.01" value={b.qty_per_porsi} onChange={e=>updateQty(b.kode_bahan, e.target.value, true)} className="w-20 p-1 border-2 border-orange-400 rounded font-bold mt-1" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={handleSimpan} disabled={isSaving} className="flex-1 py-3 bg-green-600 text-white rounded font-bold text-[13px]">{isSaving?"Menyimpan...":`💾 Simpan ${tipeMenu} - ${allKomponen.length} Komponen - Total QTY ${qtyOrder}`}</button>
            <button onClick={()=>setShowTambah(false)} className="px-6 py-3 bg-gray-200 rounded text-[13px]">Batal</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-3 border">
        <div className="font-bold text-[13px] mb-2">Menu ({menuItems.length}) - V17.2 Total Butuh = Qty/Porsi x QTY Semua Satuan Bos</div>
        <table className="w-full text-[13px] min-w-[1000px]">
          <thead className="bg-gray-50 text-[11px]"><tr><th className="p-2">Tipe</th><th className="p-2">Kode</th><th className="p-2">Nama</th><th className="p-2 bg-yellow-100">QTY</th><th className="p-2">Komponen & Total Butuh</th><th className="p-2">HPP/Porsi</th><th className="p-2">Aksi</th></tr></thead>
          <tbody>
            {menuItems.map(m=>{
              const komps = parseKomponen(m);
              const tipe = m.tipe||m.kategori||"PAKET";
              return (
                <tr key={m.id} className="border-t">
                  <td className="p-2"><span className={`px-2 py-1 rounded text-[10px] font-bold ${tipe==="PAKET"?'bg-blue-100':''}`}>{tipe}</span></td>
                  <td className="p-2 font-mono">{m.kode}</td>
                  <td className="p-2 font-bold">{m.nama_menu}</td>
                  <td className="p-2 text-center bg-yellow-50 font-bold">{m.qty}</td>
                  <td className="p-2 bg-blue-50 text-[11px]">{komps.map(k=> `${k.kode_bahan}: ${k.qty_per_porsi}${k.satuan}/porsi x ${m.qty} = ${(Number(k.qty_per_porsi||0)*Number(m.qty||1)).toFixed(2)}${k.satuan}`).join(" | ").slice(0,120)}</td>
                  <td className="p-2 text-right">Rp {Number(m.hpp_per_porsi||0).toLocaleString("id-ID")}</td>
                  <td className="p-2"><button onClick={async()=>{ if(confirm("Hapus Bos?")){ await supabase.from("menu_items").delete().eq("id", m.id); fetchMenu(); } }} className="bg-red-100 text-red-600 px-2 py-1 rounded">🗑️</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
