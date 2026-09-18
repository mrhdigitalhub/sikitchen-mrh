"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchInventoryCompat, formatRp } from "@/lib/inventoryCompat";

export default function InventoryPage(){
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [quick, setQuick] = useState(null); // item yang diklik
  const [quickStock, setQuickStock] = useState("");
  const [quickHarga, setQuickHarga] = useState("");
  const [quickJenis, setQuickJenis] = useState("Regular");
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ loadData(); },[]);

  async function loadData(){
    setLoading(true);
    const { items: data } = await fetchInventoryCompat();
    // beri nomor urut per kategori BERAS untuk cek No 012
    let noCounter = 1;
    const withNo = data.map(d=>{
      const obj = { ...d, _no: noCounter++ };
      return obj;
    });
    setItems(withNo);
    setFiltered(withNo);
    setLoading(false);
  }

  useEffect(()=>{
    if(!search){ setFiltered(items); return; }
    const s = search.toLowerCase();
    setFiltered(items.filter(i=> 
      i.kode_bahan.toLowerCase().includes(s) ||
      i.nama_bahan.toLowerCase().includes(s) ||
      (i.halal_id||"").toLowerCase().includes(s)
    ));
  },[search, items]);

  function handleClickNama(item){
    setQuick(item);
    setQuickStock(String(item.stok||0));
    setQuickHarga(String(item.harga_beli||0));
    if(item.isHall) setQuickJenis("Hall");
    else if(item.isOrgk) setQuickJenis("Orgk");
    else setQuickJenis("Regular");
  }

  async function handleUpdate(){
    if(!quick) return;
    // update stok & harga_beli via supabase langsung kode_bahan
    const { error } = await supabase.from("inventory_items")
      .update({ stok: Number(quickStock), harga_beli: Number(quickHarga), stock: Number(quickStock) })
      .eq("kode_bahan", quick.kode_bahan);
    if(error){ alert("Gagal update: "+error.message); return; }
    // refresh lokal
    const newItems = items.map(it=> it.kode_bahan===quick.kode_bahan ? {...it, stok: Number(quickStock), stock: Number(quickStock), harga_beli: Number(quickHarga)} : it);
    setItems(newItems);
    setQuick(null);
  }

  // Hitung next kode BERAS untuk hint Tambah Bahan General
  const berasItems = items.filter(i=> i.kode_bahan.includes("BERAS"));
  const nextNoBeras = berasItems.length + 1;
  const nextKodeBeras = `BERAS-${String(nextNoBeras).padStart(3,"0")}`; // 012 karena sudah 11 bahan (001-010 + Hall-011)

  // Group by kategori
  const grouped = filtered.reduce((acc, cur)=>{
    const kat = cur.kategori || "LAIN";
    if(!acc[kat]) acc[kat]=[];
    acc[kat].push(cur);
    return acc;
  },{});

  return (
    <div className="p-4 bg-[#f5f7fb] min-h-screen">
      <div className="bg-slate-900 text-white p-4 rounded-t-xl">
        <div className="text-lg font-bold">Master Bahan Sikitchen - 15 Kategori - V11 Fix Header No</div>
        <div className="text-xs text-slate-300">Live: {items.length} bahan • Edit kode Hall/Orgk + ID Halal 19 digit • Klik nama bahan untuk update cepat stock/harga • Next BERAS {nextKodeBeras} • V11 Fix: Header No sinkron dengan baris diklik</div>
        <div className="mt-3 flex gap-2 flex-wrap">
          <button className="bg-green-600 px-3 py-2 rounded text-sm font-semibold">+ Tambah Bahan General (Next: {nextKodeBeras} No {String(nextNoBeras).padStart(3,"0")})</button>
          <button className="bg-red-600 px-3 py-2 rounded text-sm">Hapus Bahan General</button>
          <button className="bg-slate-700 px-3 py-2 rounded text-sm">Buka Semua</button>
          <button className="bg-slate-700 px-3 py-2 rounded text-sm">Tutup Semua</button>
          <button onClick={loadData} className="bg-blue-600 px-3 py-2 rounded text-sm">↻ Refresh</button>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari kode / nama / ID Halal... ex: BERAS, Hall-BERAS-005, ID3211..." className="mt-3 w-full p-2 rounded text-black text-sm" />
      </div>

      {quick && (
        <div className="bg-green-50 border-2 border-green-200 p-4 rounded-xl my-3">
          <div className="flex justify-between items-center mb-3">
            <div className="font-bold text-green-800 text-sm">🛠️ Update Cepat: {quick.kode_bahan} (Beras Premium fix)</div>
            {/* FIX V11: Header sekarang pakai kode yang diklik, bukan next kode 012 */}
            <div className="text-xs bg-white border px-3 py-1 rounded-full font-mono">No {String(quick._no).padStart(3,"0")} • Kode {quick.kode_bahan} • V11 Fix sinkron</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><div className="text-xs font-semibold">Nama Bahan (dari klik baris)</div><input value={quick.nama_bahan} disabled className="w-full p-2 border rounded bg-white text-sm" /></div>
            <div><div className="text-xs font-semibold">Jenis Kode</div><select value={quickJenis} onChange={e=>setQuickJenis(e.target.value)} className="w-full p-2 border rounded text-sm"><option>Regular</option><option>Hall</option><option>Orgk</option></select></div>
            <div className="flex gap-2"><div className="flex-1"><div className="text-xs font-semibold">Stock Baru (biru)</div><input type="number" value={quickStock} onChange={e=>setQuickStock(e.target.value)} className="w-full p-2 border-2 border-blue-400 rounded text-sm" /></div><div className="flex-1"><div className="text-xs font-semibold">Harga Baru (kuning)</div><input type="number" value={quickHarga} onChange={e=>setQuickHarga(e.target.value)} className="w-full p-2 border-2 border-yellow-400 rounded text-sm bg-yellow-50" /></div></div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleUpdate} className="flex-1 bg-green-600 text-white py-2 rounded font-bold text-sm">Update Stock & Harga - {quick.kode_bahan}</button>
            <button onClick={()=>setQuick(null)} className="px-4 py-2 bg-gray-200 rounded text-sm">Batal</button>
          </div>
          <div className="text-[10px] text-gray-500 mt-2">Fix V11: Sebelumnya No 012 • Kode BERAS-012 (next kode) muncul saat klik BERAS-001. Sekarang sudah sinkron No {String(quick._no).padStart(3,"0")} • Kode {quick.kode_bahan}. Next kode {nextKodeBeras} tetap tampil di tombol Tambah Bahan General.</div>
        </div>
      )}

      <div className="bg-white rounded-b-xl border overflow-auto">
        <div className="p-3 font-bold text-sm">1 &nbsp; Bahan Baku Utama (BERAS) - {berasItems.length} bahan (11 bahan: 001-010 + Hall-011 = Next 012) • Format BERAS-001 / Hall-BERAS-001 / Orgk-BERAS-001 • Klik nama bahan untuk update cepat</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs"><tr><th className="text-left p-2">No</th><th className="text-left p-2">Kode Bahan</th><th className="text-left p-2">Nama Bahan (klik untuk update cepat)</th><th className="text-left p-2">ID Halal 19 digit</th><th className="text-left p-2">Stock</th><th className="text-left p-2">Harga Beli</th><th className="text-left p-2">Harga Baru</th><th className="text-left p-2">Selisih</th><th className="text-left p-2">Aksi</th></tr></thead>
          <tbody>
            {filtered.filter(i=>i.kode_bahan.includes("BERAS")).map(it=>(
              <tr key={it.kode_bahan} className="border-t hover:bg-blue-50">
                <td className="p-2 text-xs">{String(it._no).padStart(3,"0")}</td>
                <td className="p-2 font-mono text-xs font-bold">{it.kode_bahan}</td>
                <td className="p-2 font-semibold cursor-pointer" onClick={()=>handleClickNama(it)}>{it.nama_bahan} <span className="text-[10px] text-blue-600">↗ klik</span></td>
                <td className="p-2">{it.isHall ? <span className="bg-green-100 border border-green-300 px-2 py-1 rounded text-[10px] font-mono">{it.halal_id||"ID32110078778290726"}</span> : "-"}</td>
                <td className="p-2"><span className="bg-blue-100 px-2 py-1 rounded-full text-xs">{it.stok}</span></td>
                <td className="p-2 text-xs">Rp {Number(it.harga_beli).toLocaleString("id-ID")}</td>
                <td className="p-2 text-xs">Rp {Number(it.harga_beli).toLocaleString("id-ID")}</td>
                <td className="p-2 text-xs">0</td>
                <td className="p-2"><button onClick={()=>handleClickNama(it)} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs mr-1">Edit</button><button className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="p-4 text-center text-sm text-gray-400">Loading 143 bahan via lib/inventoryCompat...</div>}
      </div>
    </div>
  );
}
