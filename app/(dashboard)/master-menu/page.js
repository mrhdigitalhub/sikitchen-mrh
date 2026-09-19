"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// MASTER MENU V17.3 - FIX KECAP 7,5KG - MAPPING DEFAULT QTY PER JENIS BAHAN BOS - DIGITAL SYSTEM BOS
export default function MasterMenuPage(){
  const [items,setItems]=useState([]);
  const [menuItems,setMenuItems]=useState([]);
  const [searchBahan,setSearchBahan]=useState("");
  const [searchOptional,setSearchOptional]=useState("");
  const [showTambah,setShowTambah]=useState(false);
  const [tipeMenu,setTipeMenu]=useState("PAKET");
  const [newNama,setNewNama]=useState("");
  const [newQty,setNewQty]=useState("50");
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

  // MAPPING DEFAULT QTY DIGITAL SYSTEM BOS - TIDAK SEMUA 0,15 KG BOS
  function getDefaultQty(kode, nama, satuan){
    const k = (kode||"").toUpperCase();
    const n = (nama||"").toLowerCase();
    // Beras
    if(k.includes("BERAS")) return {qty: 0.15, satuan: "Kg"};
    // Ayam, Daging
    if(k.includes("AYAM") || n.includes("ayam")) return {qty: 0.12, satuan: "Kg"};
    if(k.includes("DAGING") || n.includes("daging")) return {qty: 0.10, satuan: "Kg"};
    // Penyedap spesifik Bos - KECAP TIDAK 7,5 KG LAGI BOS
    if(k==="PENYEDAP-001" || n.includes("garam halus")) return {qty: 0.005, satuan: "Kg"}; // 5 gram
    if(k==="PENYEDAP-002" || n.includes("gula pasir")) return {qty: 0.01, satuan: "Kg"}; // 10 gram
    if(k==="PENYEDAP-003" || n.includes("gula merah")) return {qty: 0.01, satuan: "Kg"};
    if(k==="PENYEDAP-004" || n.includes("gula aren")) return {qty: 0.01, satuan: "Kg"};
    if(k==="PENYEDAP-005" || n.includes("penyedap ayam")) return {qty: 0.003, satuan: "Kg"}; // 3 gram
    if(k==="PENYEDAP-006" || n.includes("penyedap sapi")) return {qty: 0.003, satuan: "Kg"};
    if(k==="PENYEDAP-007" || n.includes("micin")) return {qty: 0.002, satuan: "Kg"};
    if(k==="PENYEDAP-008" || n.includes("lada putih")) return {qty: 0.002, satuan: "Kg"};
    if(k==="PENYEDAP-009" || n.includes("lada hitam")) return {qty: 0.002, satuan: "Kg"};
    if(k==="PENYEDAP-010" || n.includes("kecap manis")) return {qty: 0.02, satuan: "Kg"}; // 20 gram bukan 150 gram Bos!
    if(k==="PENYEDAP-011" || n.includes("kecap asin")) return {qty: 0.015, satuan: "Kg"}; // 15 gram
    if(k==="PENYEDAP-012" || n.includes("saus tiram")) return {qty: 0.015, satuan: "Kg"};
    if(k.includes("PENYEDAP") || k.includes("BUMBU") || k.includes("REMPAH")) return {qty: 0.01, satuan: "Kg"};
    if(k.includes("MINYAK") || n.includes("minyak")) return {qty: 0.02, satuan: "Liter"};
    if(k.includes("TELUR") || n.includes("telur")) return {qty: 1, satuan: "Pcs"};
    if(k.includes("SAYUR") || k.includes("BUAH")) return {qty: 0.05, satuan: "Kg"};
    // Default untuk satuan
    if(tipeMenu==="SATUAN") return {qty: 1, satuan: satuan||"Porsi"};
    return {qty: 0.05, satuan: satuan||"Kg"};
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
      const def = getDefaultQty(it.kode_bahan, it.nama_bahan||it.name, it.satuan);
      setList(prev=> [...prev, {
        kode_bahan: it.kode_bahan,
        nama_bahan: it.nama_bahan||it.name,
        qty_per_porsi: def.qty,
        satuan: def.satuan,
        harga_beli: Number(it.harga_beli||it.harga||15000),
        stock_available: Number(it.stok||it.stock||10),
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
      hpp_per_porsi: Math.round(totalHppPerPorsi), hpp_total: Math.round(totalHppQty),
      komponen: JSON.stringify(allKomponen), bahan_list: JSON.stringify(allKomponen),
      komponen_count: allKomponen.length, deskripsi: allKomponen.map(b=> `${b.kode_bahan}(${b.qty_per_porsi}${b.satuan})`).join(", "),
      stock_status: "AMAN",
    };
    const { error } = await supabase.from("menu_items").insert([payload]);
    if(error){ alert("Gagal Bos: "+error.message); setIsSaving(false); return; }
    alert(`Berhasil Bos: ${kodeMenu} - ${allKomponen.length} komponen - Kecap tidak 7,5Kg lagi Bos, cuma ${allKomponen.find(b=>b.kode_bahan.includes("KECAP")||b.kode_bahan.includes("010"))?.qty_per_porsi||0} Kg/porsi Bos`);
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
        <h1 className="font-bold">Master Menu V17.3 FIX Kecap 7,5Kg - Mapping Default Qty Digital Bos</h1>
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
            <div className="border-2 border-yellow-500 p-2 rounded bg-yellow-50"><div className="text-[10px] font-bold">QTY Pesanan</div><input type="number" value={newQty} onChange={e=>setNewQty(e.target.value)} className="w-full p-2 border-2 border-yellow-500 rounded font-bold" /></div>
            <input type="number" value={newHargaBaru} onChange={e=>setNewHargaBaru(e.target.value)} placeholder="Harga Jual" className="p-2 border rounded text-sm" />
          </div>

          {allKomponen.length>0 && (
            <div className="p-3 bg-green-50 border-2 border-green-500 rounded mb-3 text-[13px] font-bold">
              ✅ HPP/Porsi Rp {Math.round(totalHppPerPorsi).toLocaleString("id-ID")} | Total HPP QTY {qtyOrder} = Rp {Math.round(totalHppQty).toLocaleString("id-ID")} | {allKomponen.length} komponen - Kecap sudah 0,02 Kg/porsi Bos bukan 0,15 Kg Bos!
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-blue-500 rounded-xl p-3 bg-blue-50">
              <div className="font-bold text-[13px] mb-2">📦 FIXED - Mapping Qty Digital Bos (Kecap 0,02 Kg bukan 0,15 Kg)</div>
              <input value={searchBahan} onChange={e=>setSearchBahan(e.target.value)} placeholder="Cari kecap, beras..." className="w-full p-2 border rounded text-[13px] mb-2" />
              <div className="max-h-[25vh] overflow-auto bg-white rounded border mb-2">
                {filtered.slice(0,80).map(it=>{
                  const c = selectedBahan.find(b=> b.kode_bahan===it.kode_bahan);
                  const def = getDefaultQty(it.kode_bahan, it.nama_bahan||it.name, it.satuan);
                  return <label key={it.kode_bahan} className={`flex gap-2 p-2 border-b cursor-pointer ${c?'bg-green-100':''}`}><input type="checkbox" checked={!!c} onChange={()=>toggleBahan(it,false)} className="w-5 h-5" /><span className="text-[12px]">{it.kode_bahan} - {it.nama_bahan||it.name} <span className="text-[10px] bg-yellow-100 px-1 rounded">default {def.qty}{def.satuan}/porsi</span></span></label>
                })}
              </div>
              <div className="space-y-2 max-h-[40vh] overflow-auto">
                {selectedBahan.map(b=>{
                  const totalButuh = Number(b.qty_per_porsi||0) * qtyOrder;
                  const isKecap = b.kode_bahan.includes("010") || b.kode_bahan.includes("011") || b.nama_bahan.toLowerCase().includes("kecap");
                  return (
                    <div key={b.kode_bahan} className={`bg-white border-2 rounded p-2 text-[12px] ${isKecap?'border-green-500 bg-green-50':''}`}>
                      <div className="font-bold font-mono">{b.kode_bahan} - {b.nama_bahan} {isKecap && <span className="bg-green-200 px-1 rounded text-[10px]">FIX 0,02 Kg Bos bukan 0,15 Kg</span>}</div>
                      <div className="flex justify-between mt-1">
                        <span>Rp {Number(b.harga_beli).toLocaleString("id-ID")} / {b.satuan}</span>
                        <span className="font-bold">{b.qty_per_porsi} {b.satuan}/porsi x {qtyOrder} = {totalButuh.toFixed(3)} {b.satuan} TOTAL</span>
                      </div>
                      <div className="flex gap-2 mt-1 items-center">
                        <input type="number" step="0.001" value={b.qty_per_porsi} onChange={e=>updateQty(b.kode_bahan, e.target.value, false)} className="w-24 p-1 border-2 border-blue-400 rounded font-bold text-[13px]" />
                        <span className="text-[11px] bg-yellow-100 px-2 py-1 rounded border">Butuh {totalButuh.toFixed(3)} {b.satuan} untuk QTY {qtyOrder} {isKecap ? `= 20 gram/porsi x ${qtyOrder} = masuk akal Bos` : ''}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {tipeMenu==="PAKET" && (
              <div className="border-2 border-orange-400 rounded-xl p-3 bg-orange-50">
                <div className="font-bold text-[13px] mb-2">➕ OPTIONAL - Juga Mapping Digital Bos</div>
                <input value={searchOptional} onChange={e=>setSearchOptional(e.target.value)} placeholder="Cari optional..." className="w-full p-2 border rounded text-[13px] mb-2" />
                <div className="max-h-[25vh] overflow-auto bg-white rounded border mb-2">
                  {filteredOptional.slice(0,60).map(it=>{
                    if(selectedBahan.find(b=> b.kode_bahan===it.kode_bahan)) return null;
                    const c = optionalBahan.find(b=> b.kode_bahan===it.kode_bahan);
                    return <label key={it.kode_bahan} className={`flex gap-2 p-2 border-b cursor-pointer ${c?'bg-yellow-100':''}`}><input type="checkbox" checked={!!c} onChange={()=>toggleBahan(it,true)} className="w-5 h-5" /><span className="text-[12px]">{it.kode_bahan}</span></label>
                  })}
                </div>
                <div className="space-y-2">
                  {optionalBahan.map(b=>{
                    const totalButuh = Number(b.qty_per_porsi||0) * qtyOrder;
                    return (
                      <div key={b.kode_bahan} className="bg-white border rounded p-2 text-[12px]">
                        <div className="font-bold">{b.kode_bahan} (Optional) - {b.qty_per_porsi}{b.satuan}/porsi x {qtyOrder} = {totalButuh.toFixed(3)}{b.satuan}</div>
                        <input type="number" step="0.001" value={b.qty_per_porsi} onChange={e=>updateQty(b.kode_bahan, e.target.value, true)} className="w-20 p-1 border-2 border-orange-400 rounded font-bold mt-1" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={handleSimpan} disabled={isSaving} className="flex-1 py-3 bg-green-600 text-white rounded font-bold text-[13px]">{isSaving?"Menyimpan...":`💾 Simpan ${tipeMenu} - ${allKomponen.length} Komponen - Total QTY ${qtyOrder} - Kecap Fix`}</button>
            <button onClick={()=>setShowTambah(false)} className="px-6 py-3 bg-gray-200 rounded text-[13px]">Batal</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-3 border">
        <div className="font-bold text-[13px] mb-2">Menu ({menuItems.length}) - V17.3 Fix Kecap 7,5Kg Bos</div>
        <table className="w-full text-[13px] min-w-[1000px]">
          <thead className="bg-gray-50 text-[11px]"><tr><th className="p-2">Tipe</th><th className="p-2">Kode</th><th className="p-2">Nama</th><th className="p-2 bg-yellow-100">QTY</th><th className="p-2">Komponen & Total Butuh Fix</th><th className="p-2">HPP/Porsi</th><th className="p-2">Aksi</th></tr></thead>
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
                  <td className="p-2 bg-blue-50 text-[11px]">{komps.map(k=> `${k.kode_bahan}: ${k.qty_per_porsi}${k.satuan} x ${m.qty}=${(Number(k.qty_per_porsi||0)*Number(m.qty||1)).toFixed(3)}${k.satuan}`).join(" | ").slice(0,150)}</td>
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
