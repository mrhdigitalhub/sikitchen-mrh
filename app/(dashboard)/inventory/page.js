"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// INVENTORY V17.0 - FIX SATUAN DROPDOWN COMPACT + TERPAKAI DARI MASTER MENU + SELISIH HARGA
export default function InventoryPage(){
  const [items,setItems]=useState([]);
  const [menuItems,setMenuItems]=useState([]);
  const [search,setSearch]=useState("");
  const [expanded,setExpanded]=useState({});

  useEffect(()=>{ fetchItems(); fetchMenu(); },[]);

  async function fetchItems(){
    const {data}=await supabase.from("inventory_items").select("*").order("kode_bahan");
    setItems(data||[]);
  }
  async function fetchMenu(){
    const {data}=await supabase.from("menu_items").select("*");
    setMenuItems(data||[]);
  }

  // Hitung Terpakai dari Master Menu Bos
  function getTerpakai(kodeBahan){
    let total = 0;
    menuItems.forEach(m=>{
      try{
        const komps = m.komponen || m.bahan_list;
        if(!komps) return;
        const arr = Array.isArray(komps) ? komps : JSON.parse(komps);
        arr.forEach(k=>{
          if(k.kode_bahan===kodeBahan){
            total += Number(k.qty_per_porsi||0) * Number(m.qty||1);
          }
        });
      }catch{}
    });
    return total;
  }

  const satuanOptions = ["Kg","Pcs","Bks","Btl","Lsn","Gram","Ml"];

  async function updateSatuan(id, newSatuan){
    const { error } = await supabase.from("inventory_items").update({ satuan: newSatuan, jenis_satuan: newSatuan }).eq("id", id);
    if(!error){
      setItems(prev=> prev.map(it=> it.id===id ? {...it, satuan: newSatuan, jenis_satuan: newSatuan} : it));
    }
  }

  const filtered = items.filter(it=>{
    if(!search) return true;
    const s = search.toLowerCase();
    return (it.kode_bahan||"").toLowerCase().includes(s) || (it.nama_bahan||it.name||"").toLowerCase().includes(s);
  });

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
          <h1 className="font-bold text-lg">Inventori Stok - V17.0 Fix Satuan Compact + Terpakai + Selisih Harga</h1>
          <p className="text-xs text-gray-500">{items.length} bahan • Terpakai dari Master Menu Bos • {menuItems.length} menu</p>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari bahan..." className="p-2 border rounded text-sm" />
      </div>

      {Object.keys(groups).map(kodeGroup=>{
        const list = groups[kodeGroup];
        const isOpen = expanded[kodeGroup] !== false;
        return (
          <div key={kodeGroup} className="bg-white rounded-xl border mb-3 overflow-hidden">
            <div className="flex justify-between p-3 bg-gray-50 font-bold text-sm cursor-pointer" onClick={()=>setExpanded(prev=>({...prev, [kodeGroup]: !isOpen}))}>
              <span>{kodeGroup} - {list.length} bahan ▼</span>
              <span>{isOpen ? "Tutup" : "Buka"}</span>
            </div>
            {isOpen && (
              <div className="overflow-auto">
                <table className="w-full text-[11px] min-w-[1400px]">
                  <thead className="bg-gray-100 text-[10px]">
                    <tr>
                      <th className="p-2 w-[40px]">No</th>
                      <th className="p-2 w-[100px]">Kode</th>
                      <th className="p-2 text-left w-[160px]">Nama</th>
                      <th className="p-2 w-[90px] bg-blue-50">Satuan (Fix Compact)</th>
                      <th className="p-2 w-[60px]">Awal</th>
                      <th className="p-2 w-[80px]">Ready</th>
                      <th className="p-2 w-[110px] bg-orange-100">Terpakai (Dari Master Menu)</th>
                      <th className="p-2 w-[90px]">Harga Lama</th>
                      <th className="p-2 w-[90px]">Harga Baru</th>
                      <th className="p-2 w-[100px] bg-yellow-100">Selisih Harga BARU</th>
                      <th className="p-2 w-[80px]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((it, idx)=>{
                      const satuan = it.satuan || it.jenis_satuan || "Kg";
                      const ready = Number(it.stok||it.stock||it.ready||10);
                      const hargaLama = Number(it.harga_lama||it.harga_beli||15000);
                      const hargaBaru = Number(it.harga_baru||it.harga_beli||15000);
                      const selisihHarga = hargaBaru - hargaLama;
                      const terpakai = getTerpakai(it.kode_bahan);
                      const sisa = ready - terpakai;
                      return (
                        <tr key={it.id} className="border-t hover:bg-blue-50">
                          <td className="p-2 text-center">{idx+1}</td>
                          <td className="p-2 font-mono font-bold">{it.kode_bahan}</td>
                          <td className="p-2 font-bold">{it.nama_bahan||it.name}</td>
                          <td className="p-2 bg-blue-50">
                            <select value={satuan} onChange={e=>updateSatuan(it.id, e.target.value)} className="w-[70px] p-1 border rounded text-[11px] font-bold bg-white">
                              {satuanOptions.map(s=><option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td className="p-2 text-center">{it.stok_awal||10}</td>
                          <td className="p-2 text-center bg-green-50 font-bold">{ready} {satuan}</td>
                          <td className={`p-2 text-center font-bold ${terpakai>0 ? 'bg-orange-200 text-orange-800' : 'bg-gray-50'}`}>
                            {terpakai>0 ? `${terpakai.toFixed(2)} ${satuan} Terpakai` : `0 ${satuan}`} <div className="text-[9px]">Sisa {sisa.toFixed(1)}</div>
                          </td>
                          <td className="p-2 text-right">Rp {hargaLama.toLocaleString("id-ID")}</td>
                          <td className="p-2 text-right font-bold bg-yellow-50">Rp {hargaBaru.toLocaleString("id-ID")}</td>
                          <td className={`p-2 text-right font-bold ${selisihHarga>0 ? 'bg-red-100 text-red-600' : selisihHarga<0 ? 'bg-green-100 text-green-600' : 'bg-gray-50'}`}>
                            {selisihHarga>0 ? `+Rp ${selisihHarga.toLocaleString("id-ID")}` : selisihHarga<0 ? `-Rp ${Math.abs(selisihHarga).toLocaleString("id-ID")}` : '-'}
                          </td>
                          <td className="p-2"><button className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-[10px]">Edit</button></td>
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
    </div>
  );
}
