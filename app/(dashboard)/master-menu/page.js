"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

// MASTER MENU V16 - FIX 404 - table inventory_items + menu_items
export default function MasterMenuPage(){
  const [items,setItems]=useState([]);
  const [menuItems,setMenuItems]=useState([]);
  const [search,setSearch]=useState("");

  useEffect(()=>{
    fetchBahan();
    fetchMenu();
  },[]);

  async function fetchBahan(){
    const {data}=await supabase.from("inventory_items").select("*").order("kode_bahan");
    setItems(data||[]);
  }
  async function fetchMenu(){
    const {data}=await supabase.from("menu_items").select("*").order("created_at",{ascending:false}).limit(50);
    setMenuItems(data||[]);
  }

  const filtered = items.filter(i=>{
    if(!search) return true;
    const s=search.toLowerCase();
    return (i.kode_bahan||"").toLowerCase().includes(s) || (i.nama_bahan||i.name||"").toLowerCase().includes(s);
  });

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <h1 className="text-lg font-bold">Master Menu & Resep - V16 Fix 404</h1>
      <p className="text-xs text-gray-500 mb-3">Fix table inventory_items (kode_bahan, nama_bahan) • {items.length} bahan • {menuItems.length} menu</p>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari bahan..." className="w-full p-2 border rounded mb-3 text-sm" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-3 border">
          <div className="font-bold text-sm mb-2">Bahan Baku ({filtered.length})</div>
          <div className="max-h-[70vh] overflow-auto space-y-1">
            {filtered.slice(0,100).map(it=>(
              <div key={it.id||it.kode_bahan} className="flex justify-between border-b py-1 text-xs">
                <div><span className="font-mono font-bold">{it.kode_bahan}</span> - {it.nama_bahan||it.name}</div>
                <div className="text-gray-500">{it.stok||it.stock} {it.satuan||""}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 border">
          <div className="font-bold text-sm mb-2">Menu ({menuItems.length})</div>
          {menuItems.length===0 && <div className="text-xs text-gray-500">Belum ada menu_items Bos, bikin dulu Bos</div>}
          <div className="space-y-2">
            {menuItems.map(m=>(
              <div key={m.id} className="border p-2 rounded text-xs"><div className="font-bold">{m.nama_menu||m.name||m.kode}</div><div className="text-gray-500">{m.kategori||""}</div></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
