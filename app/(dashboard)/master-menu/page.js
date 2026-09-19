"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// MASTER MENU V17.1 - FIX HPP 0 & KOMPONEN 0 ITEM - PENYEBAB: KOLOM BELUM ADA & DATA LAMA FALLBACK
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

  useEffect(()=>{ 
    fetchBahan(); 
    fetchMenu();
    try{
      const saved = localStorage.getItem("sikitchen_master_menu_draft_V17_1");
      if(saved){
        const d = JSON.parse(saved);
        if(d.tipeMenu) setTipeMenu(d.tipeMenu);
        if(d.newNama) setNewNama(d.newNama);
        if(d.newQty) setNewQty(d.newQty);
        if(d.newHargaBaru) setNewHargaBaru(d.newHargaBaru);
        if(d.selectedBahan) setSelectedBahan(d.selectedBahan);
        if(d.optionalBahan) setOptionalBahan(d.optionalBahan);
        if(d.showTambah) setShowTambah(d.showTambah);
      }
    }catch(e){}
  },[]);

  useEffect(()=>{
    try{
      const draft = { tipeMenu, newNama, newQty, newHargaBaru, selectedBahan, optionalBahan, showTambah };
      localStorage.setItem("sikitchen_master_menu_draft_V17_1", JSON.stringify(draft));
    }catch(e){}
  },[tipeMenu, newNama, newQty, newHargaBaru, selectedBahan, optionalBahan, showTambah]);

  async function fetchBahan(){
    const {data}=await supabase.from("inventory_items").select("*").order("kode_bahan");
    setItems(data||[]);
  }
  async function fetchMenu(){
    const {data, error} = await supabase.from("menu_items").select("*").order("created_at",{ascending:false}).limit(100);
    if(!error) setMenuItems(data||[]);
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

  function clearDraft(){
    localStorage.removeItem("sikitchen_master_menu_draft_V17_1");
    setSelectedBahan([]); setOptionalBahan([]); setNewNama(""); setNewQty("10"); setNewHargaBaru("25000"); setIsSaving(false);
  }

  const allKomponen = tipeMenu==="PAKET" ? [...selectedBahan, ...optionalBahan] : selectedBahan;
  const qtyOrder = Number(newQty||1);
  const totalHppPerPorsi = allKomponen.reduce((s,b)=> s + (Number(b.qty_per_porsi||0)*Number(b.harga_beli||0)), 0);
  const totalHppQty = totalHppPerPorsi * qtyOrder;
  const stockChecks = allKomponen.map(b=>{
    const required = Number(b.qty_per_porsi||0) * qtyOrder;
    const available = Number(b.stock_available||0);
    return {...b, required, available, is_cukup: available >= required};
  });
  const isStockAman = stockChecks.every(c=> c.is_cukup);

  async function handleSimpan(){
    if(isSaving) return;
    if(!newNama) return alert("Nama Menu kosong Bos");
    if(selectedBahan.length===0) return alert(`Pilih minimal 1 bahan ${tipeMenu} Bos`);
    if(!isStockAman) return alert("Stock kurang Bos");
    setIsSaving(true);
    const kodeMenu = `${tipeMenu==="PAKET" ? "PAKET" : "SATUAN"}-${String(menuItems.length+1).padStart(3,"0")}`;
    // Payload lengkap Bos - semua kolom Bos
    const payload = {
      kode: kodeMenu,
      kode_menu: kodeMenu,
      nama_menu: newNama,
      name: newNama,
      kategori: tipeMenu,
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
      hpp_porsi: Math.round(totalHppPerPorsi),
      komponen: JSON.stringify(allKomponen),
      bahan_list: JSON.stringify(allKomponen),
      fixed_components: JSON.stringify(selectedBahan),
      optional_components: JSON.stringify(optionalBahan),
      komponen_count: allKomponen.length,
      fixed_count: selectedBahan.length,
      optional_count: optionalBahan.length,
      deskripsi: allKomponen.map(b=> `${b.kode_bahan}(${b.qty_per_porsi}${b.satuan})`).join(", "),
      stock_status: "AMAN",
    };
    try{
      const { error } = await supabase.from("menu_items").insert([payload]);
      if(error){
        alert("Gagal Bos, kolom belum ada Bos: "+error.message+"\n\nJalankan SQL ALTER TABLE di bawah Bos!");
        setIsSaving(false);
        return;
      }
      alert(`Berhasil Bos: ${kodeMenu} ${tipeMenu} - ${newNama} - ${allKomponen.length} komponen - HPP Rp ${Math.round(totalHppPerPorsi).toLocaleString("id-ID")}/porsi Bos`);
      setIsSaving(false); clearDraft(); setShowTambah(false); fetchMenu();
    }catch(err){
      alert("Error Bos: "+err.message); setIsSaving(false);
    }
  }

  async function handleDelete(id){
    if(!confirm("Hapus menu 0 item ini Bos? Nanti buat ulang biar HPP muncul Bos?")) return;
    await supabase.from("menu_items").delete().eq("id", id);
    fetchMenu();
  }

  function parseKomponen(m){
    try{
      // Coba semua kemungkinan field Bos
      let raw = m.komponen || m.bahan_list || m.fixed_components || m.deskripsi;
      if(!raw) return [];
      if(Array.isArray(raw)) return raw;
      // Kalau deskripsi isinya cuma "BERAS-001(0.15Kg), ..." bukan JSON, return kosong Bos
      if(typeof raw === 'string' && raw.startsWith('[')){
        return JSON.parse(raw);
      }
      // Coba gabung fixed + optional kalau ada
      if(m.fixed_components){
        try{
          const fixed = JSON.parse(m.fixed_components);
          let optional = [];
          if(m.optional_components) optional = JSON.parse(m.optional_components);
          return [...fixed, ...optional];
        }catch{}
      }
      return [];
    }catch{ return []; }
  }

  function calcHppFromKomponen(komps){
    return komps.reduce((s,b)=> s + (Number(b.qty_per_porsi||0)*Number(b.harga_beli||0)), 0);
  }

  return (
    <div className="p-3 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h1 className="text-lg font-bold">Master Menu - V17.1 FIX HPP 0 & KOMPONEN 0 ITEM</h1>
          <p className="text-xs text-red-600 font-bold">Fix Bos: HPP 0 karena data lama fallback Bos, komponen 0 item karena deskripsi bukan JSON Bos - Jalankan SQL ALTER TABLE Bos</p>
        </div>
        <button onClick={()=>setShowTambah(true)} className="bg-green-600 text-white px-4 py-2 rounded text-xs font-bold">+ Buat Menu Paket / Satuan</button>
      </div>

      <div className="bg-yellow-50 border-2 border-yellow-600 p-3 rounded-xl mb-4">
        <div className="font-bold text-xs">Kenapa HPP 0 & 0 item Bos? (Lihat screenshot Bos)</div>
        <div className="text-[11px] mt-1">
          1. <b>Data lama Bos</b> (PAKET-001 & SATUAN-002 di screenshot) disimpan pakai fallback minimal Bos (cuma kode, nama, qty, harga) karena kolom <code>hpp_per_porsi</code>, <code>komponen</code> belum ada waktu itu Bos → jadi HPP 0 & 0 item Bos<br/>
          2. <b>Solusi Bos:</b> Hapus 2 data lama Bos (klik 🗑️) Bos, lalu buat ulang Bos dengan V17.1 ini Bos, HPP pasti muncul Bos!<br/>
          3. <b>Jalankan SQL ini dulu Bos di Supabase SQL Editor Bos biar kolom lengkap Bos:</b>
        </div>
        <pre className="bg-black text-green-400 p-2 rounded text-[10px] mt-2 overflow-auto">
{`-- TAMBAH KOLOM YANG BELUM ADA BOS
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS hpp_per_porsi INTEGER DEFAULT 0;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS hpp_total INTEGER DEFAULT 0;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS hpp_baru INTEGER DEFAULT 0;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS hpp_porsi INTEGER DEFAULT 0;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS komponen TEXT;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS bahan_list TEXT;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS fixed_components TEXT;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS optional_components TEXT;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS komponen_count INTEGER DEFAULT 0;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS stock_status TEXT;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS tipe TEXT;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS tipe_menu TEXT;
`}
        </pre>
      </div>

      {showTambah && (
        <div className="bg-white border-2 border-green-600 p-4 rounded-xl mb-4 shadow-xl">
          <div className="font-bold text-sm mb-3">Buat Menu - V17.1 HPP Fix Bos</div>
          <div className="flex gap-3 mb-4">
            <button onClick={()=>setTipeMenu("PAKET")} className={`flex-1 p-3 rounded-xl border-2 font-bold text-sm ${tipeMenu==="PAKET" ? 'bg-blue-600 text-white' : 'bg-white'}`}>📦 MENU PAKET</button>
            <button onClick={()=>setTipeMenu("SATUAN")} className={`flex-1 p-3 rounded-xl border-2 font-bold text-sm ${tipeMenu==="SATUAN" ? 'bg-orange-600 text-white' : 'bg-white'}`}>🍗 MENU SATUAN</button>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div><div className="text-xs font-bold">Nama Menu ({tipeMenu})</div><input value={newNama} onChange={e=>setNewNama(e.target.value)} placeholder="Paket Ayam Bakar Kecap Premium" className="w-full p-2 border rounded text-sm font-bold" /></div>
            <div className="bg-yellow-50 border-2 border-yellow-500 p-2 rounded"><div className="text-xs font-bold">QTY</div><input type="number" value={newQty} onChange={e=>setNewQty(e.target.value)} className="w-full p-2 border-2 border-yellow-500 rounded text-sm font-bold mt-1" /></div>
            <div className="bg-green-50 border p-2 rounded"><div className="text-xs font-bold">Harga Jual / Porsi</div><input type="number" value={newHargaBaru} onChange={e=>setNewHargaBaru(e.target.value)} className="w-full p-2 border rounded text-sm font-bold mt-1" /></div>
          </div>
          {allKomponen.length>0 && <div className="p-3 bg-green-50 border-2 border-green-500 rounded mb-3 text-[13px] font-bold">✅ HPP/Porsi Rp {Math.round(totalHppPerPorsi).toLocaleString("id-ID")} | Total HPP QTY {qtyOrder} = Rp {Math.round(totalHppQty).toLocaleString("id-ID")} | {allKomponen.length} komponen Bos - Pasti muncul Bos di table Bos!</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-blue-500 rounded-xl p-3 bg-blue-50">
              <div className="font-bold text-[13px] mb-2">📦 FIXED</div>
              <input value={searchBahan} onChange={e=>setSearchBahan(e.target.value)} placeholder="Cari bahan..." className="w-full p-2 border rounded text-[13px] mb-2" />
              <div className="max-h-[25vh] overflow-auto bg-white rounded border">
                {filtered.slice(0,60).map(it=>{
                  const checked = selectedBahan.find(b=> b.kode_bahan===it.kode_bahan);
                  return <label key={it.kode_bahan} className={`flex items-center gap-2 p-2 border-b cursor-pointer ${checked?'bg-green-100':''}`}><input type="checkbox" checked={!!checked} onChange={()=>toggleBahan(it,false)} className="w-5 h-5" /><span className="text-[13px]">{it.kode_bahan} - {it.nama_bahan||it.name}</span></label>
                })}
              </div>
              <div className="mt-2 space-y-1 max-h-[20vh] overflow-auto">
                {selectedBahan.map(b=><div key={b.kode_bahan} className="bg-white border p-2 rounded flex gap-2 text-[12px]"><div className="flex-1"><b>{b.kode_bahan}</b> - {b.nama_bahan}<br/>Rp {b.harga_beli.toLocaleString("id-ID")} x {b.qty_per_porsi} {b.satuan}</div><input type="number" step="0.01" value={b.qty_per_porsi} onChange={e=>updateQty(b.kode_bahan, e.target.value, false)} className="w-20 p-1 border-2 border-blue-400 rounded font-bold" /></div>)}
              </div>
            </div>
            {tipeMenu==="PAKET" && (
              <div className="border-2 border-orange-400 rounded-xl p-3 bg-orange-50">
                <div className="font-bold text-[13px] mb-2">➕ OPTIONAL</div>
                <input value={searchOptional} onChange={e=>setSearchOptional(e.target.value)} placeholder="Cari optional..." className="w-full p-2 border rounded text-[13px] mb-2" />
                <div className="max-h-[25vh] overflow-auto bg-white rounded border">
                  {filteredOptional.slice(0,60).map(it=>{
                    if(selectedBahan.find(b=> b.kode_bahan===it.kode_bahan)) return null;
                    const checked = optionalBahan.find(b=> b.kode_bahan===it.kode_bahan);
                    return <label key={it.kode_bahan} className={`flex items-center gap-2 p-2 border-b cursor-pointer ${checked?'bg-yellow-100':''}`}><input type="checkbox" checked={!!checked} onChange={()=>toggleBahan(it,true)} className="w-5 h-5" /><span className="text-[13px]">{it.kode_bahan}</span></label>
                  })}
                </div>
                <div className="mt-2 space-y-1">
                  {optionalBahan.map(b=><div key={b.kode_bahan} className="bg-white border p-2 rounded flex gap-2 text-[12px]"><div className="flex-1"><b>{b.kode_bahan}</b> - {b.nama_bahan}</div><input type="number" step="0.01" value={b.qty_per_porsi} onChange={e=>updateQty(b.kode_bahan, e.target.value, true)} className="w-20 p-1 border-2 border-orange-400 rounded font-bold" /></div>)}
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleSimpan} disabled={isSaving} className={`flex-1 py-3 rounded font-bold text-[13px] ${isSaving ? 'bg-gray-400 text-white' : 'bg-green-600 text-white'}`}>{isSaving ? "Menyimpan..." : `💾 Simpan ${tipeMenu} - HPP Rp ${Math.round(totalHppPerPorsi).toLocaleString("id-ID")}/porsi - ${allKomponen.length} Komponen`}</button>
            <button onClick={()=>setShowTambah(false)} className="px-6 py-3 bg-gray-200 rounded text-[13px]">Batal</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-3 border overflow-auto">
        <div className="font-bold text-[13px] mb-2">Menu Paket & Satuan ({menuItems.length}) - V17.1 FIX HPP 0 Bos</div>
        <table className="w-full text-[13px] min-w-[1100px]">
          <thead className="bg-gray-50 text-[11px]"><tr><th className="p-2 text-left">Tipe</th><th className="p-2">Kode</th><th className="p-2 text-left">Nama Menu</th><th className="p-2 bg-yellow-100">QTY</th><th className="p-2 bg-blue-50">Komponen</th><th className="p-2">HPP/Porsi (Hitung Ulang)</th><th className="p-2 bg-green-50">Harga Jual</th><th className="p-2">Aksi</th></tr></thead>
          <tbody>
            {menuItems.map(m=>{
              const komps = parseKomponen(m);
              const tipe = m.tipe||m.tipe_menu||m.kategori||"PAKET";
              // HPP FIX: kalau kolom hpp_per_porsi 0, hitung ulang dari komponen Bos
              let hppPer = Number(m.hpp_per_porsi||m.hpp_baru||m.hpp_porsi||0);
              if(hppPer===0 && komps.length>0){
                hppPer = calcHppFromKomponen(komps);
              }
              const isOldData = komps.length===0 && hppPer===0;
              return (
                <tr key={m.id} className={`border-t ${isOldData ? 'bg-red-50' : 'hover:bg-blue-50'}`}>
                  <td className="p-2"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${tipe==="PAKET" ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>{tipe}</span></td>
                  <td className="p-2 font-mono font-bold">{m.kode||m.kode_menu}</td>
                  <td className="p-2 font-bold">{m.nama_menu||m.name} {isOldData && <span className="text-red-600 text-[10px]">⚠️ Data lama 0 item - Hapus & buat ulang Bos</span>}</td>
                  <td className="p-2 text-center bg-yellow-50 font-bold">{m.qty||1}</td>
                  <td className="p-2 bg-blue-50">{komps.length>0 ? `${komps.length} item - ${komps.map(k=> k.kode_bahan).join(", ").slice(0,50)}` : <span className="text-red-600 font-bold">0 item (data lama Bos)</span>}</td>
                  <td className="p-2 text-right font-bold bg-orange-50">{hppPer>0 ? `Rp ${Math.round(hppPer).toLocaleString("id-ID")}` : <span className="text-red-600">Rp 0 - Hapus & buat ulang Bos</span>}</td>
                  <td className="p-2 text-right bg-green-50 font-bold">Rp {Number(m.harga_jual||0).toLocaleString("id-ID")}</td>
                  <td className="p-2"><button onClick={()=>handleDelete(m.id)} className="bg-red-100 text-red-600 px-2 py-1 rounded text-[11px]">🗑️ Hapus</button></td>
                </tr>
              );
            })}
            {menuItems.length===0 && <tr><td colSpan={8} className="p-6 text-center text-gray-400">Belum ada menu Bos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
