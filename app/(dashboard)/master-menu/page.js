"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// MASTER MENU V16.4 - QTY + HARGA Lama/Baru/Selisih + HPP Lama/Baru/Selisih - TABLE UTAMA
export default function MasterMenuPage(){
  const [items,setItems]=useState([]);
  const [menuItems,setMenuItems]=useState([]);
  const [search,setSearch]=useState("");
  const [showTambah,setShowTambah]=useState(false);
  const [newNama,setNewNama]=useState("");
  const [newKategori,setNewKategori]=useState("Nasi Box");
  const [newQty,setNewQty]=useState("1");
  const [newHargaLama,setNewHargaLama]=useState("25000");
  const [newHargaBaru,setNewHargaBaru]=useState("25000");
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
    const payload = {
      kode: kodeMenu,
      kode_menu: kodeMenu,
      nama_menu: newNama,
      name: newNama,
      kategori: newKategori,
      qty: Number(newQty||1),
      quantity: Number(newQty||1),
      porsi: Number(newQty||1),
      harga_jual: Number(newHargaBaru||0),
      harga: Number(newHargaBaru||0),
      harga_lama: Number(newHargaLama||0),
      harga_baru: Number(newHargaBaru||0),
      hpp_lama: Math.round(Number(newHargaLama||0)*0.6),
      hpp_baru: Math.round(Number(newHargaBaru||0)*0.6),
      deskripsi: newDeskripsi,
    };
    const { error } = await supabase.from("menu_items").insert([payload]);
    if(error){
      const payload2 = { kode: kodeMenu, nama_menu: newNama, name: newNama, kategori: newKategori, qty: Number(newQty||1), harga_jual: Number(newHargaBaru||0), deskripsi: newDeskripsi };
      const { error: e2 } = await supabase.from("menu_items").insert([payload2]);
      if(e2){ alert("Gagal Bos: "+e2.message); return; }
    }
    alert(`Berhasil Bos: ${kodeMenu} QTY ${newQty} Harga Lama ${newHargaLama} Baru ${newHargaBaru}`);
    setShowTambah(false); setNewNama(""); fetchMenu();
  }

  async function handleDelete(id){
    if(!confirm("Hapus menu ini Bos?")) return;
    await supabase.from("menu_items").delete().eq("id", id);
    fetchMenu();
  }

  return (
    <div className="p-3 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h1 className="text-lg font-bold">Master Menu & Resep - V16.4 QTY + Harga & HPP History TABLE UTAMA</h1>
          <p className="text-xs text-gray-500">{items.length} bahan • {menuItems.length} menu • Table utama ada QTY + Harga Lama/Baru/Selisih + HPP Lama/Baru/Selisih Bos</p>
        </div>
        <button onClick={()=>setShowTambah(true)} className="bg-green-600 text-white px-4 py-2 rounded text-xs font-bold">+ Tambah Menu + QTY + HPP</button>
      </div>

      {showTambah && (
        <div className="bg-white border-2 border-green-500 p-4 rounded-xl mb-4 shadow-lg">
          <div className="font-bold text-sm mb-3">Tambah Menu - Dengan QTY + Harga Lama/Baru + HPP Lama/Baru Bos</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><div className="text-xs font-bold">Nama Menu</div><input value={newNama} onChange={e=>setNewNama(e.target.value)} placeholder="Nasi Box Ayam Bakar" className="w-full p-2 border rounded text-sm font-bold" /></div>
            <div><div className="text-xs font-bold">Kategori</div><select value={newKategori} onChange={e=>setNewKategori(e.target.value)} className="w-full p-2 border rounded text-sm"><option>Nasi Box</option><option>Snack Box</option><option>Prasmanan</option><option>Paket</option></select></div>
            <div className="bg-yellow-50 border-2 border-yellow-500 p-2 rounded"><div className="text-xs font-bold">QTY (Porsi)</div><input type="number" value={newQty} onChange={e=>setNewQty(e.target.value)} className="w-full p-2 border-2 border-yellow-500 rounded text-sm font-bold mt-1" /></div>
            <div className="bg-blue-50 border p-2 rounded"><div className="text-xs font-bold">Harga Lama</div><input type="number" value={newHargaLama} onChange={e=>setNewHargaLama(e.target.value)} className="w-full p-2 border rounded text-sm mt-1" /></div>
            <div className="bg-green-50 border-2 border-green-500 p-2 rounded"><div className="text-xs font-bold">Harga Baru</div><input type="number" value={newHargaBaru} onChange={e=>setNewHargaBaru(e.target.value)} className="w-full p-2 border-2 border-green-500 rounded text-sm font-bold mt-1" /></div>
            <div className="p-2 rounded bg-red-50 border"><div className="text-xs font-bold">Selisih Harga</div><div className="p-2 bg-white border rounded text-sm font-bold mt-1">{Number(newHargaBaru)-Number(newHargaLama)>0?'+':''}Rp {Number(newHargaBaru)-Number(newHargaLama)}</div></div>
            <div className="md:col-span-3"><div className="text-xs font-bold">Deskripsi</div><input value={newDeskripsi} onChange={e=>setNewDeskripsi(e.target.value)} placeholder="Ayam bakar + nasi + lalap" className="w-full p-2 border rounded text-sm" /></div>
          </div>
          <div className="mt-3 flex gap-2"><button onClick={handleSimpanMenu} className="flex-1 bg-green-600 text-white py-2 rounded font-bold text-sm">💾 Simpan Menu QTY {newQty} + HPP</button><button onClick={()=>setShowTambah(false)} className="px-6 py-2 bg-gray-200 rounded text-sm">Batal</button></div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-3 border">
          <div className="font-bold text-sm mb-2">Bahan Baku ({filtered.length})</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari bahan..." className="w-full p-2 border rounded mb-2 text-xs" />
          <div className="max-h-[70vh] overflow-auto space-y-1">
            {filtered.slice(0,100).map(it=>(
              <div key={it.id||it.kode_bahan} className="flex justify-between border-b py-1 text-[11px]">
                <div><span className="font-mono font-bold">{it.kode_bahan}</span> - {it.nama_bahan||it.name}</div>
                <div className="text-gray-500">Rp {Number(it.harga_beli||0).toLocaleString("id-ID")}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 bg-white rounded-xl p-3 border overflow-auto">
          <div className="font-bold text-sm mb-2">Menu ({menuItems.length}) - TABLE UTAMA: QTY + Harga Lama/Baru/Selisih + HPP Lama/Baru/Selisih</div>
          <div className="overflow-auto">
            <table className="w-full text-[11px] min-w-[900px]">
              <thead className="bg-gray-50 sticky top-0 text-[10px]"><tr>
                <th className="text-left p-2">Kode</th>
                <th className="text-left p-2">Nama Menu</th>
                <th className="text-center p-2 bg-yellow-100">QTY</th>
                <th className="text-right p-2 bg-blue-50">Harga Lama</th>
                <th className="text-right p-2 bg-green-50">Harga Baru</th>
                <th className="text-right p-2 bg-red-50">Selisih Harga</th>
                <th className="text-right p-2 bg-orange-50">HPP Lama</th>
                <th className="text-right p-2 bg-orange-100">HPP Baru</th>
                <th className="text-right p-2 bg-purple-50">Selisih HPP</th>
                <th className="p-2">Aksi</th>
              </tr></thead>
              <tbody>
                {menuItems.map(m=>{
                  const hargaLama = Number(m.harga_lama||m.harga_jual||0);
                  const hargaBaru = Number(m.harga_baru||m.harga_jual||m.harga||0);
                  const selisihHarga = hargaBaru - hargaLama;
                  const hppLama = Number(m.hpp_lama||Math.round(hargaLama*0.6));
                  const hppBaru = Number(m.hpp_baru||Math.round(hargaBaru*0.6));
                  const selisihHpp = hppBaru - hppLama;
                  return (
                  <tr key={m.id} className="border-t hover:bg-blue-50">
                    <td className="p-2 font-mono font-bold">{m.kode||m.kode_menu}</td>
                    <td className="p-2 font-bold">{m.nama_menu||m.name}<div className="text-[10px] text-gray-500">{m.kategori}</div></td>
                    <td className="p-2 text-center bg-yellow-50 font-bold">{m.qty||m.quantity||m.porsi||1}</td>
                    <td className="p-2 text-right bg-blue-50">Rp {hargaLama.toLocaleString("id-ID")}</td>
                    <td className="p-2 text-right bg-green-50 font-bold">Rp {hargaBaru.toLocaleString("id-ID")}</td>
                    <td className={`p-2 text-right font-bold ${selisihHarga>0?'bg-red-50 text-red-600': selisihHarga<0?'bg-green-50 text-green-600':'bg-gray-50'}`}>{selisihHarga>0?'+':''}{selisihHarga!==0?`Rp ${selisihHarga.toLocaleString("id-ID")}`:'-'}</td>
                    <td className="p-2 text-right bg-orange-50">Rp {hppLama.toLocaleString("id-ID")}</td>
                    <td className="p-2 text-right bg-orange-100 font-bold">Rp {hppBaru.toLocaleString("id-ID")}</td>
                    <td className={`p-2 text-right font-bold ${selisihHpp>0?'bg-purple-50 text-red-600':'bg-purple-50 text-green-600'}`}>{selisihHpp>0?'+':''}Rp {selisihHpp.toLocaleString("id-ID")}</td>
                    <td className="p-2"><button onClick={()=>handleDelete(m.id)} className="bg-red-100 text-red-600 px-2 py-1 rounded text-[10px]">🗑️</button></td>
                  </tr>
                )})}
                {menuItems.length===0 && <tr><td colSpan={10} className="p-6 text-center text-gray-400 text-xs">Belum ada menu Bos, klik + Tambah Menu + QTY + HPP di atas Bos</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-2 p-2 bg-yellow-50 border text-[10px] rounded">SQL jika error: ALTER TABLE menu_items ADD COLUMN qty integer DEFAULT 1; ADD COLUMN harga_lama integer DEFAULT 0; ADD COLUMN harga_baru integer DEFAULT 0; ADD COLUMN hpp_lama integer DEFAULT 0; ADD COLUMN hpp_baru integer DEFAULT 0;</div>
        </div>
      </div>
    </div>
  );
}
