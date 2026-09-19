"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// MASTER MENU V16.3 - HEADER MENU + KOLOM QTY
export default function MasterMenuPage(){
  const [items,setItems]=useState([]);
  const [menuItems,setMenuItems]=useState([]);
  const [search,setSearch]=useState("");
  const [showTambah,setShowTambah]=useState(false);
  const [newNama,setNewNama]=useState("");
  const [newKategori,setNewKategori]=useState("Nasi Box");
  const [newQty,setNewQty]=useState("1");
  const [newHarga,setNewHarga]=useState("25000");
  const [newDeskripsi,setNewDeskripsi]=useState("");

  useEffect(()=>{
    fetchBahan();
    fetchMenu();
  },[]);

  async function fetchBahan(){
    const {data}=await supabase.from("inventory_items").select("*").order("kode_bahan");
    setItems(data||[]);
  }
  async function fetchMenu(){
    const {data}=await supabase.from("menu_items").select("*").order("created_at",{ascending:false}).limit(100);
    setMenuItems(data||[]);
  }

  const filtered = items.filter(i=>{
    if(!search) return true;
    const s=search.toLowerCase();
    return (i.kode_bahan||"").toLowerCase().includes(s) || (i.nama_bahan||i.name||"").toLowerCase().includes(s);
  });

  async function handleSimpanMenu(){
    if(!newNama) return alert("Nama Menu kosong Bos");
    const kodeMenu = `MENU-${String(menuItems.length+1).padStart(3,"0")}`;
    // Payload dengan QTY - kolom Qty header menu
    const payload = {
      kode: kodeMenu,
      kode_menu: kodeMenu,
      nama_menu: newNama,
      name: newNama,
      kategori: newKategori,
      qty: Number(newQty||1),
      quantity: Number(newQty||1),
      porsi: Number(newQty||1),
      harga_jual: Number(newHarga||0),
      harga: Number(newHarga||0),
      deskripsi: newDeskripsi,
    };
    const { error } = await supabase.from("menu_items").insert([payload]);
    if(error){ 
      // Fallback kalau kolom qty belum ada - coba tanpa qty
      const payload2 = { kode: kodeMenu, nama_menu: newNama, name: newNama, kategori: newKategori, harga_jual: Number(newHarga||0), deskripsi: newDeskripsi };
      const { error: e2 } = await supabase.from("menu_items").insert([payload2]);
      if(e2){ alert("Gagal Bos: "+e2.message+" | Coba jalankan SQL: ALTER TABLE menu_items ADD COLUMN qty integer;"); return; }
    }
    alert(`Berhasil Bos: ${kodeMenu} - ${newNama} Qty ${newQty}`);
    setShowTambah(false); setNewNama(""); setNewQty("1"); setNewHarga("25000"); fetchMenu();
  }

  async function handleDelete(id){
    if(!confirm("Hapus menu ini Bos?")) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if(error){ alert(error.message); return; }
    fetchMenu();
  }

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h1 className="text-lg font-bold">Master Menu & Resep - V16.3 QTY Header</h1>
          <p className="text-xs text-gray-500">Fix table inventory_items • {items.length} bahan • {menuItems.length} menu • Header ada kolom QTY Bos</p>
        </div>
        <button onClick={()=>setShowTambah(true)} className="bg-green-600 text-white px-4 py-2 rounded text-xs font-bold">+ Tambah Menu + QTY</button>
      </div>

      {showTambah && (
        <div className="bg-white border-2 border-green-500 p-4 rounded-xl mb-4 shadow-lg">
          <div className="font-bold text-sm mb-3">Tambah Menu Baru - Dengan QTY Bos</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div><div className="text-xs font-bold">Nama Menu</div><input value={newNama} onChange={e=>setNewNama(e.target.value)} placeholder="Nasi Box Ayam Bakar" className="w-full p-2 border rounded text-sm font-bold" /></div>
            <div><div className="text-xs font-bold">Kategori</div><select value={newKategori} onChange={e=>setNewKategori(e.target.value)} className="w-full p-2 border rounded text-sm"><option>Nasi Box</option><option>Snack Box</option><option>Prasmanan</option><option>Paket</option></select></div>
            <div className="bg-yellow-50 border-2 border-yellow-500 p-2 rounded"><div className="text-xs font-bold">QTY (Porsi / Box) - BARU</div><input type="number" value={newQty} onChange={e=>setNewQty(e.target.value)} placeholder="1" className="w-full p-2 border-2 border-yellow-500 rounded text-sm font-bold mt-1" min="1" /></div>
            <div><div className="text-xs font-bold">Harga Jual</div><input type="number" value={newHarga} onChange={e=>setNewHarga(e.target.value)} className="w-full p-2 border rounded text-sm" /></div>
            <div className="md:col-span-4"><div className="text-xs font-bold">Deskripsi</div><input value={newDeskripsi} onChange={e=>setNewDeskripsi(e.target.value)} placeholder="Ayam bakar + nasi + lalap + sambal" className="w-full p-2 border rounded text-sm" /></div>
          </div>
          <div className="mt-3 p-2 bg-blue-50 rounded text-xs">Preview: <b>{newNama||"Nama Menu"}</b> - QTY: <b className="text-yellow-700 bg-yellow-200 px-2 rounded">{newQty} Porsi</b> - Harga: Rp {Number(newHarga||0).toLocaleString("id-ID")} - Kode Auto: MENU-{String(menuItems.length+1).padStart(3,"0")}</div>
          <div className="mt-3 flex gap-2"><button onClick={handleSimpanMenu} className="flex-1 bg-green-600 text-white py-2 rounded font-bold text-sm">💾 Simpan Menu + QTY</button><button onClick={()=>setShowTambah(false)} className="px-6 py-2 bg-gray-200 rounded text-sm">Batal</button></div>
        </div>
      )}

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
          <div className="font-bold text-sm mb-2">Menu ({menuItems.length}) - Ada Kolom QTY</div>
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0"><tr><th className="text-left p-2">Kode</th><th className="text-left p-2">Nama Menu</th><th className="text-center p-2 bg-yellow-100">QTY</th><th className="text-left p-2">Harga</th><th className="p-2">Aksi</th></tr></thead>
              <tbody>
                {menuItems.map(m=>(
                  <tr key={m.id} className="border-t hover:bg-blue-50">
                    <td className="p-2 font-mono font-bold">{m.kode||m.kode_menu}</td>
                    <td className="p-2 font-bold">{m.nama_menu||m.name} <div className="text-[10px] text-gray-500">{m.kategori}</div></td>
                    <td className="p-2 text-center bg-yellow-50 font-bold text-yellow-800">{m.qty||m.quantity||m.porsi||1}</td>
                    <td className="p-2">Rp {Number(m.harga_jual||m.harga||0).toLocaleString("id-ID")}</td>
                    <td className="p-2"><button onClick={()=>handleDelete(m.id)} className="bg-red-100 text-red-600 px-2 py-1 rounded text-[10px]">🗑️</button></td>
                  </tr>
                ))}
                {menuItems.length===0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400">Belum ada menu Bos, klik + Tambah Menu + QTY di atas Bos</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-2 p-2 bg-yellow-50 border text-[10px] rounded">SQL jika error qty: <br/><code>ALTER TABLE menu_items ADD COLUMN qty integer DEFAULT 1; ALTER TABLE menu_items ADD COLUMN quantity integer DEFAULT 1; ALTER TABLE menu_items ADD COLUMN porsi integer DEFAULT 1;</code></div>
        </div>
      </div>
    </div>
  );
}
