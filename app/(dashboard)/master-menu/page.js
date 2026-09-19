"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// MASTER MENU V16.5 - KOMPONEN CHECKBOX FLEXIBLE - Deskripsi hilang ganti Komponen (X item dicentang)
export default function MasterMenuPage(){
  const [items,setItems]=useState([]);
  const [menuItems,setMenuItems]=useState([]);
  const [search,setSearch]=useState("");
  const [searchBahan,setSearchBahan]=useState("");
  const [showTambah,setShowTambah]=useState(false);
  const [newNama,setNewNama]=useState("");
  const [newKategori,setNewKategori]=useState("Paket");
  const [newQty,setNewQty]=useState("10");
  const [newHargaLama,setNewHargaLama]=useState("25000");
  const [newHargaBaru,setNewHargaBaru]=useState("25000");
  const [selectedBahan,setSelectedBahan]=useState([]); // [{kode_bahan, nama_bahan, qty_per_porsi, satuan, harga_beli}]
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

  function toggleBahan(it){
    const exists = selectedBahan.find(b=> b.kode_bahan===it.kode_bahan);
    if(exists){
      setSelectedBahan(prev=> prev.filter(b=> b.kode_bahan!==it.kode_bahan));
    } else {
      setSelectedBahan(prev=> [...prev, {
        kode_bahan: it.kode_bahan,
        nama_bahan: it.nama_bahan||it.name,
        qty_per_porsi: 0.15,
        satuan: it.satuan||"Kg",
        harga_beli: Number(it.harga_beli||it.harga||0)
      }]);
    }
  }

  function updateQtyPerPorsi(kode, val){
    setSelectedBahan(prev=> prev.map(b=> b.kode_bahan===kode ? {...b, qty_per_porsi: Number(val)||0} : b));
  }

  const totalHppPerPorsi = selectedBahan.reduce((s,b)=> s + (Number(b.qty_per_porsi||0)*Number(b.harga_beli||0)), 0);
  const totalHppForQty = totalHppPerPorsi * Number(newQty||1);
  const totalBahanQty = selectedBahan.reduce((acc,cur)=>{
    const qtyTotal = Number(cur.qty_per_porsi||0) * Number(newQty||1);
    return acc;
  },0);

  async function handleSimpanMenu(){
    if(!newNama) return alert("Nama Menu kosong Bos");
    if(selectedBahan.length===0) return alert("Centang minimal 1 bahan Bos untuk Komponen Bos");
    const kodeMenu = `MENU-${String(menuItems.length+1).padStart(3,"0")}`;
    const komponenJson = JSON.stringify(selectedBahan);
    const komponenPreview = selectedBahan.map(b=> `${b.kode_bahan}(${b.qty_per_porsi}${b.satuan})`).join(", ");
    // Payload flexible
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
      hpp_baru: Math.round(totalHppPerPorsi),
      hpp_total: Math.round(totalHppForQty),
      komponen: komponenJson,
      bahan_list: komponenJson,
      resep: komponenJson,
      components: komponenJson,
      komponen_preview: komponenPreview,
      komponen_count: selectedBahan.length,
      deskripsi: komponenPreview, // fallback biar kolom lama tetap isi
    };
    const { error } = await supabase.from("menu_items").insert([payload]);
    if(error){
      // fallback minimal jika kolom komponen belum ada
      const payload2 = { kode: kodeMenu, nama_menu: newNama, name: newNama, kategori: newKategori, qty: Number(newQty||1), harga_jual: Number(newHargaBaru||0), deskripsi: komponenPreview };
      const { error: e2 } = await supabase.from("menu_items").insert([payload2]);
      if(e2){ alert("Gagal Bos: "+e2.message+" | Jalankan SQL: ALTER TABLE menu_items ADD COLUMN komponen text; ADD COLUMN komponen_count integer;"); return; }
    }
    alert(`Berhasil Bos: ${kodeMenu} - ${newNama} - Komponen ${selectedBahan.length} item flexible Bos - QTY ${newQty} - HPP/porsi Rp ${Math.round(totalHppPerPorsi).toLocaleString("id-ID")}`);
    setShowTambah(false); setNewNama(""); setSelectedBahan([]); setSearchBahan(""); fetchMenu();
  }

  async function handleDelete(id){
    if(!confirm("Hapus menu ini Bos?")) return;
    await supabase.from("menu_items").delete().eq("id", id);
    fetchMenu();
  }

  function parseKomponen(m){
    try{
      const raw = m.komponen || m.bahan_list || m.resep || m.components;
      if(!raw) return [];
      if(Array.isArray(raw)) return raw;
      return JSON.parse(raw);
    }catch{ return []; }
  }

  return (
    <div className="p-3 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h1 className="text-lg font-bold">Master Menu & Resep - V16.5 KOMPONEN CHECKBOX FLEXIBLE</h1>
          <p className="text-xs text-gray-500">{items.length} bahan • {menuItems.length} menu • Kolom Deskripsi HILANG ganti Komponen (X item dicentang) flexible sesuai centang Bos</p>
        </div>
        <button onClick={()=>setShowTambah(true)} className="bg-green-600 text-white px-4 py-2 rounded text-xs font-bold">+ Tambah Menu + Komponen Centang</button>
      </div>

      {showTambah && (
        <div className="bg-white border-2 border-green-600 p-4 rounded-xl mb-4 shadow-xl">
          <div className="font-bold text-sm mb-3">Tambah Menu - Deskripsi Ganti Jadi Checkbox Komponen Flexible Bos</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div><div className="text-xs font-bold">Nama Menu</div><input value={newNama} onChange={e=>setNewNama(e.target.value)} placeholder="Nasi Box Ayam Bakar" className="w-full p-2 border rounded text-sm font-bold" /></div>
            <div><div className="text-xs font-bold">Kategori</div><select value={newKategori} onChange={e=>setNewKategori(e.target.value)} className="w-full p-2 border rounded text-sm"><option>Paket</option><option>Nasi Box</option><option>Snack Box</option><option>Prasmanan</option></select></div>
            <div className="bg-yellow-50 border-2 border-yellow-500 p-2 rounded"><div className="text-xs font-bold">QTY (Porsi)</div><input type="number" value={newQty} onChange={e=>setNewQty(e.target.value)} className="w-full p-2 border-2 border-yellow-500 rounded text-sm font-bold mt-1" /></div>
            <div className="bg-green-50 border p-2 rounded"><div className="text-xs font-bold">Harga Baru</div><input type="number" value={newHargaBaru} onChange={e=>setNewHargaBaru(e.target.value)} className="w-full p-2 border rounded text-sm font-bold mt-1" /></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* KIRI - LIST BAHAN DENGAN CHECKBOX */}
            <div className="border-2 border-blue-400 rounded-xl p-3 bg-blue-50">
              <div className="font-bold text-xs mb-2">1️⃣ Pilih Bahan (Centang) - Flexible Bos - Cari bahan:</div>
              <input value={searchBahan} onChange={e=>setSearchBahan(e.target.value)} placeholder="Cari BERAS, AYAM, BOX..." className="w-full p-2 border rounded text-xs mb-2" />
              <div className="max-h-[40vh] overflow-auto bg-white rounded border">
                {filtered.slice(0,100).map(it=>{
                  const checked = selectedBahan.find(b=> b.kode_bahan===it.kode_bahan);
                  return (
                    <label key={it.kode_bahan} className={`flex items-center gap-2 p-2 border-b hover:bg-blue-50 cursor-pointer ${checked?'bg-green-100':''}`}>
                      <input type="checkbox" checked={!!checked} onChange={()=>toggleBahan(it)} className="w-4 h-4" />
                      <div className="flex-1 text-[11px]"><span className="font-mono font-bold">{it.kode_bahan}</span> - {it.nama_bahan||it.name} <span className="text-gray-500">Rp {Number(it.harga_beli||0).toLocaleString("id-ID")}/{it.satuan||'Kg'}</span></div>
                    </label>
                  );
                })}
              </div>
              <div className="text-[10px] text-blue-700 mt-1">{selectedBahan.length} bahan dicentang Bos</div>
            </div>

            {/* KANAN - KOMPONEN YANG DICENTANG + QTY PER PORSI */}
            <div className="border-2 border-green-500 rounded-xl p-3 bg-green-50">
              <div className="font-bold text-xs mb-2">2️⃣ Komponen Dicentang ({selectedBahan.length} item) - Input Qty/Porsi - Auto Hitung QTY {newQty} Bos</div>
              {selectedBahan.length===0 && <div className="text-xs text-gray-400 p-4 text-center bg-white rounded border-dashed border">Belum ada bahan dicentang Bos, centang di kiri Bos</div>}
              <div className="space-y-2 max-h-[40vh] overflow-auto">
                {selectedBahan.map(b=>{
                  const totalQty = Number(b.qty_per_porsi||0) * Number(newQty||1);
                  const totalHarga = totalQty * Number(b.harga_beli||0);
                  return (
                    <div key={b.kode_bahan} className="bg-white border rounded p-2 flex gap-2 items-center">
                      <div className="flex-1 text-[11px]"><div className="font-bold font-mono">{b.kode_bahan}</div><div>{b.nama_bahan}</div><div className="text-[10px] text-gray-500">Rp {Number(b.harga_beli).toLocaleString("id-ID")}/{b.satuan}</div></div>
                      <div className="w-24"><div className="text-[10px] font-bold">Qty/Porsi</div><input type="number" step="0.01" value={b.qty_per_porsi} onChange={e=>updateQtyPerPorsi(b.kode_bahan, e.target.value)} className="w-full p-1 border-2 border-yellow-400 rounded text-xs font-bold" /></div>
                      <div className="w-20 text-[10px]"><div>Untuk QTY {newQty}</div><div className="font-bold">{totalQty.toFixed(2)} {b.satuan}</div><div className="text-green-700">Rp {Math.round(totalHarga).toLocaleString("id-ID")}</div></div>
                      <button onClick={()=>toggleBahan({kode_bahan:b.kode_bahan})} className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs">✕</button>
                    </div>
                  );
                })}
              </div>
              {selectedBahan.length>0 && (
                <div className="mt-3 p-3 bg-white border-2 border-green-600 rounded">
                  <div className="text-xs font-bold">Ringkasan untuk QTY {newQty} Porsi Bos:</div>
                  <div className="text-xs">Total HPP/Porsi: <b className="text-green-700">Rp {Math.round(totalHppPerPorsi).toLocaleString("id-ID")}</b></div>
                  <div className="text-xs">Total HPP untuk {newQty} Porsi: <b className="text-green-700">Rp {Math.round(totalHppForQty).toLocaleString("id-ID")}</b></div>
                  <div className="text-[10px] text-gray-500 mt-1">Komponen Preview: {selectedBahan.map(b=> b.kode_bahan).join(", ")} ({selectedBahan.length} item)</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-2"><button onClick={handleSimpanMenu} className="flex-1 bg-green-600 text-white py-3 rounded font-bold text-sm">💾 Simpan Menu Komponen {selectedBahan.length} item Flexible - QTY {newQty}</button><button onClick={()=>{setShowTambah(false); setSelectedBahan([]);}} className="px-6 py-3 bg-gray-200 rounded text-sm">Batal</button></div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-3 border">
          <div className="font-bold text-sm mb-2">Bahan Baku ({items.length}) - Sumber Centang</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari bahan..." className="w-full p-2 border rounded mb-2 text-xs" />
          <div className="max-h-[70vh] overflow-auto space-y-1">
            {items.filter(i=>{
              if(!search) return true;
              const s=search.toLowerCase();
              return (i.kode_bahan||"").toLowerCase().includes(s) || (i.nama_bahan||i.name||"").toLowerCase().includes(s);
            }).slice(0,80).map(it=>(
              <div key={it.id||it.kode_bahan} className="flex justify-between border-b py-1 text-[11px]"><div><span className="font-mono font-bold">{it.kode_bahan}</span> - {it.nama_bahan||it.name}</div><div className="text-gray-500">Rp {Number(it.harga_beli||0).toLocaleString("id-ID")}</div></div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 bg-white rounded-xl p-3 border overflow-auto">
          <div className="font-bold text-sm mb-2">Menu ({menuItems.length}) - TABLE UTAMA: Deskripsi HILANG Ganti KOMPONEN (flexible X item dicentang)</div>
          <div className="overflow-auto">
            <table className="w-full text-[11px] min-w-[1100px]">
              <thead className="bg-gray-50 sticky top-0 text-[10px]"><tr>
                <th className="text-left p-2">Kode</th>
                <th className="text-left p-2">Nama Menu</th>
                <th className="text-center p-2 bg-yellow-100">QTY</th>
                <th className="text-left p-2 bg-green-50 min-w-[200px]">Komponen (flexible X item dicentang)</th>
                <th className="text-right p-2 bg-blue-50">Harga Lama</th>
                <th className="text-right p-2 bg-green-50">Harga Baru</th>
                <th className="text-right p-2 bg-red-50">Selisih Harga</th>
                <th className="text-right p-2 bg-orange-50">HPP/Porsi</th>
                <th className="text-right p-2 bg-orange-100">HPP Total QTY</th>
                <th className="p-2">Aksi</th>
              </tr></thead>
              <tbody>
                {menuItems.map(m=>{
                  const hargaLama = Number(m.harga_lama||m.harga_jual||0);
                  const hargaBaru = Number(m.harga_baru||m.harga_jual||m.harga||0);
                  const selisihHarga = hargaBaru - hargaLama;
                  const komps = parseKomponen(m);
                  const kompCount = komps.length || m.komponen_count || 0;
                  const hppPerPorsi = Number(m.hpp_baru||m.hpp_lama||0);
                  const hppTotal = Number(m.hpp_total|| hppPerPorsi * Number(m.qty||1));
                  const preview = komps.length>0 ? komps.map(k=> k.kode_bahan).join(", ") : (m.komponen_preview||m.deskripsi||"-");
                  const isOpen = komponenExpanded[m.id];
                  return (
                  <>
                  <tr key={m.id} className="border-t hover:bg-blue-50">
                    <td className="p-2 font-mono font-bold">{m.kode||m.kode_menu}</td>
                    <td className="p-2 font-bold">{m.nama_menu||m.name}<div className="text-[10px] text-gray-500">{m.kategori}</div></td>
                    <td className="p-2 text-center bg-yellow-50 font-bold">{m.qty||m.quantity||m.porsi||1}</td>
                    <td className="p-2 bg-green-50"><div className="font-bold text-green-800">{kompCount} item dicentang {kompCount>0?'✅':''}</div><div className="text-[10px] truncate max-w-[250px]">{preview}</div><button onClick={()=>setKomponenExpanded(prev=>({...prev, [m.id]: !isOpen}))} className="text-[10px] bg-white border px-2 py-0.5 rounded mt-1">{isOpen?'Tutup':'Detail'}</button></td>
                    <td className="p-2 text-right bg-blue-50">Rp {hargaLama.toLocaleString("id-ID")}</td>
                    <td className="p-2 text-right bg-green-50 font-bold">Rp {hargaBaru.toLocaleString("id-ID")}</td>
                    <td className={`p-2 text-right font-bold ${selisihHarga>0?'bg-red-50 text-red-600': selisihHarga<0?'bg-green-50 text-green-600':'bg-gray-50'}`}>{selisihHarga>0?'+':''}{selisihHarga!==0?`Rp ${selisihHarga.toLocaleString("id-ID")}`:'-'}</td>
                    <td className="p-2 text-right bg-orange-50">Rp {hppPerPorsi.toLocaleString("id-ID")}</td>
                    <td className="p-2 text-right bg-orange-100 font-bold">Rp {hppTotal.toLocaleString("id-ID")}</td>
                    <td className="p-2"><button onClick={()=>handleDelete(m.id)} className="bg-red-100 text-red-600 px-2 py-1 rounded text-[10px]">🗑️</button></td>
                  </tr>
                  {isOpen && komps.length>0 && (
                    <tr className="bg-yellow-50"><td colSpan={10} className="p-3"><div className="text-xs font-bold mb-2">Detail Komponen {kompCount} item untuk {m.nama_menu||m.name} QTY {m.qty||1}:</div><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{komps.map((k,i)=>{ const qtyTotal = Number(k.qty_per_porsi||0) * Number(m.qty||1); const hargaTotal = qtyTotal * Number(k.harga_beli||0); return (<div key={i} className="bg-white border p-2 rounded text-xs flex justify-between"><div><b>{k.kode_bahan}</b> - {k.nama_bahan}<div className="text-[10px] text-gray-500">{k.qty_per_porsi} {k.satuan}/porsi x {m.qty||1} = {qtyTotal.toFixed(2)} {k.satuan}</div></div><div className="text-right"><div>Rp {Number(k.harga_beli||0).toLocaleString("id-ID")}/{k.satuan}</div><div className="font-bold text-green-700">Rp {Math.round(hargaTotal).toLocaleString("id-ID")}</div></div></div>); })}</div><div className="mt-2 text-xs">Total HPP: <b>Rp {hppTotal.toLocaleString("id-ID")}</b> untuk {m.qty||1} porsi</div></td></tr>
                  )}
                  </>
                )})}
                {menuItems.length===0 && <tr><td colSpan={10} className="p-6 text-center text-gray-400 text-xs">Belum ada menu Bos, klik + Tambah Menu + Komponen Centang - Komponen flexible sesuai centang Bos</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
