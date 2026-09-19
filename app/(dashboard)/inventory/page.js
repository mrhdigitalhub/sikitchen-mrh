"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// INVENTORY V16.9 - TAMBAH KOLOM JENIS SATUAN (Kg,Pcs,Bks,Btl,Lsn) & STOCK KURANG
export default function InventoryPage(){
  const [items,setItems]=useState([]);
  const [search,setSearch]=useState("");
  const [expanded,setExpanded]=useState({});
  const [editingSatuan,setEditingSatuan]=useState({});

  useEffect(()=>{ fetchItems(); },[]);

  async function fetchItems(){
    const {data}=await supabase.from("inventory_items").select("*").order("kode_bahan");
    setItems(data||[]);
  }

  const satuanOptions = ["Kg","Pcs","Bks","Btl","Lsn","Gram","Ml","Sachet","Pack"];

  function getStockKurang(it){
    const ready = Number(it.stok||it.stock||it.ready||10);
    const minStock = Number(it.min_stock||it.minimum||5);
    const kurang = minStock - ready;
    return kurang > 0 ? kurang : 0;
  }

  function getJenisSatuan(it){
    if(it.satuan) return it.satuan;
    if(it.jenis_satuan) return it.jenis_satuan;
    const kode = (it.kode_bahan||"").toUpperCase();
    if(kode.includes("PENYEDAP") || kode.includes("SAUS") || kode.includes("KECAP")) return "Btl";
    if(kode.includes("BERAS") || kode.includes("GULA") || kode.includes("GARAM") || kode.includes("TEPUNG")) return "Kg";
    if(kode.includes("TELUR")) return "Bks";
    if(kode.includes("AYAM") || kode.includes("DAGING") || kode.includes("IKAN")) return "Kg";
    return "Pcs";
  }

  async function updateSatuan(id, newSatuan){
    const { error } = await supabase.from("inventory_items").update({ satuan: newSatuan, jenis_satuan: newSatuan }).eq("id", id);
    if(!error){
      setItems(prev=> prev.map(it=> it.id===id ? {...it, satuan: newSatuan, jenis_satuan: newSatuan} : it));
      setEditingSatuan(prev=> ({...prev, [id]: false}));
    } else {
      alert("Gagal Bos: "+error.message+" - Jalankan SQL ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS satuan TEXT; ADD COLUMN jenis_satuan TEXT; ADD COLUMN min_stock INTEGER DEFAULT 5;");
    }
  }

  const filtered = items.filter(it=>{
    if(!search) return true;
    const s = search.toLowerCase();
    return (it.kode_bahan||"").toLowerCase().includes(s) || (it.nama_bahan||it.name||"").toLowerCase().includes(s);
  });

  // Group by kategori Bos (simplified)
  const groups = {};
  filtered.forEach(it=>{
    const kode = (it.kode_bahan||"").split("-")[0] || "LAIN";
    if(!groups[kode]) groups[kode]=[];
    groups[kode].push(it);
  });

  return (
    <div className="p-3 bg-gray-100 min-h-screen">
      <div className="flex justify-between mb-3">
        <div>
          <h1 className="font-bold text-lg">Inventori Stok - V16.9 Jenis Satuan & Stock Kurang</h1>
          <p className="text-xs text-gray-500">{items.length} bahan • Kolom baru: Jenis Satuan (Kg,Pcs,Bks,Btl,Lsn) & Stock Kurang Bos</p>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari bahan..." className="p-2 border rounded text-sm" />
      </div>

      {Object.keys(groups).map(kodeGroup=>{
        const list = groups[kodeGroup];
        const isOpen = expanded[kodeGroup] !== false;
        return (
          <div key={kodeGroup} className="bg-white rounded-xl border mb-3 overflow-auto">
            <div className="flex justify-between p-3 bg-gray-50 font-bold text-sm cursor-pointer" onClick={()=>setExpanded(prev=>({...prev, [kodeGroup]: !isOpen}))}>
              <span>{kodeGroup} - {list.length} bahan ▼ - Jenis Satuan & Stock Kurang Bos</span>
              <span>{isOpen ? "Tutup" : "Buka"}</span>
            </div>
            {isOpen && (
              <div className="overflow-auto">
                <table className="w-full text-[11px] min-w-[1300px]">
                  <thead className="bg-yellow-50 text-[10px]">
                    <tr>
                      <th className="p-2">No</th>
                      <th className="p-2">Kode</th>
                      <th className="p-2 text-left">Nama</th>
                      <th className="p-2 bg-blue-50">Jenis Satuan (Kg,Pcs,Bks,Btl,Lsn) BARU</th>
                      <th className="p-2">Stock Awal</th>
                      <th className="p-2">Ready</th>
                      <th className="p-2 bg-red-100">Stock Kurang BARU</th>
                      <th className="p-2">Harga Lama</th>
                      <th className="p-2">Harga Baru</th>
                      <th className="p-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((it, idx)=>{
                      const jenisSatuan = getJenisSatuan(it);
                      const stockKurang = getStockKurang(it);
                      const ready = Number(it.stok||it.stock||it.ready||10);
                      const isKurang = stockKurang > 0;
                      return (
                        <tr key={it.id} className={`border-t hover:bg-blue-50 ${isKurang?'bg-red-50':''}`}>
                          <td className="p-2 text-center">{String(idx+1).padStart(3,"0")}</td>
                          <td className="p-2 font-mono font-bold">{it.kode_bahan}</td>
                          <td className="p-2 font-bold">{it.nama_bahan||it.name}</td>
                          <td className="p-2 bg-blue-50">
                            {editingSatuan[it.id] ? (
                              <select value={jenisSatuan} onChange={e=>updateSatuan(it.id, e.target.value)} className="p-1 border-2 border-blue-500 rounded font-bold text-[11px] w-full">
                                {satuanOptions.map(s=><option key={s} value={s}>{s}</option>)}
                              </select>
                            ) : (
                              <div className="flex gap-1 items-center">
                                <span className={`px-2 py-1 rounded-full font-bold text-[10px] ${jenisSatuan==="Kg"?'bg-green-100 text-green-800': jenisSatuan==="Btl"?'bg-purple-100 text-purple-800': jenisSatuan==="Pcs"?'bg-blue-100 text-blue-800': 'bg-gray-100'}`}>{jenisSatuan}</span>
                                <button onClick={()=>setEditingSatuan(prev=>({...prev, [it.id]: true}))} className="text-[10px] bg-white border px-1 rounded">Edit</button>
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-center bg-gray-50">{it.stok_awal||it.stock_awal||10}</td>
                          <td className="p-2 text-center bg-green-50 font-bold">{ready} {jenisSatuan}</td>
                          <td className={`p-2 text-center font-bold ${isKurang ? 'bg-red-200 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {isKurang ? `Kurang ${stockKurang} ${jenisSatuan} ⚠️` : `Aman ✅`}
                          </td>
                          <td className="p-2 text-right bg-yellow-50">Rp {Number(it.harga_lama||it.harga_beli||15000).toLocaleString("id-ID")}</td>
                          <td className="p-2 text-right bg-yellow-100 font-bold">Rp {Number(it.harga_baru||it.harga_beli||15000).toLocaleString("id-ID")}</td>
                          <td className="p-2"><button className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-[10px]">Edit Kode</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      <div className="bg-white p-3 rounded-xl border mt-3 text-[11px]">
        <b>SQL Tambahan Bos (jalankan sekali Bos di Supabase SQL Editor Bos):</b>
        <pre className="bg-black text-green-400 p-2 rounded mt-2 overflow-auto">
{`ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS satuan TEXT DEFAULT 'Kg';
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS jenis_satuan TEXT DEFAULT 'Kg';
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 5;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS stok INTEGER DEFAULT 10;
`}
        </pre>
      </div>
    </div>
  );
}
