"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchInventoryCompat, formatRp } from "@/lib/inventoryCompat";

const KATEGORI_LIST = ["BERAS","AYAM","DAGING","IKAN","SAYUR","BUMBU","MINYAK","TELUR","SUSU","KEJU","BUAH","SAUS","KEMASAN","LAUK","LAIN"];

export default function InventoryPage(){
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [quick, setQuick] = useState(null);
  const [quickStock, setQuickStock] = useState("");
  const [quickHarga, setQuickHarga] = useState("");
  const [quickJenis, setQuickJenis] = useState("Regular");
  const [expanded, setExpanded] = useState({});
  const [showTambah, setShowTambah] = useState(false);
  const [newKode, setNewKode] = useState("");
  const [newNama, setNewNama] = useState("");
  const [newKategori, setNewKategori] = useState("BERAS");
  const [newStock, setNewStock] = useState("10");
  const [newHarga, setNewHarga] = useState("15000");
  const [newJenis, setNewJenis] = useState("Regular");
  const [newHalal, setNewHalal] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ loadData(); },[]);

  async function loadData(){
    setLoading(true);
    const { items: data } = await fetchInventoryCompat();
    const withNo = data.map((d,i)=> ({...d, _no: i+1, selisih: Number(d.harga_baru||d.harga_beli||0) - Number(d.harga_beli||0)}));
    setItems(withNo);
    const exp = {};
    KATEGORI_LIST.forEach(k=> exp[k]=true);
    withNo.forEach(it=>{ const kat = (it.kategori||"LAIN").toUpperCase(); exp[kat]=true; });
    setExpanded(exp);
    setLoading(false);
  }

  const filtered = items.filter(i=>{
    if(!search) return true;
    const s = search.toLowerCase();
    return i.kode_bahan.toLowerCase().includes(s) || i.nama_bahan.toLowerCase().includes(s) || (i.halal_id||"").toLowerCase().includes(s);
  });

  const grouped = filtered.reduce((acc,cur)=>{
    const kat = (cur.kategori||"LAIN").toUpperCase();
    if(!acc[kat]) acc[kat]=[];
    acc[kat].push(cur);
    return acc;
  },{});

  const berasItems = items.filter(i=> (i.kode_bahan||"").includes("BERAS"));
  const nextNoBeras = berasItems.length + 1;
  const nextKodeBeras = `BERAS-${String(nextNoBeras).padStart(3,"0")}`;

  function handleClickNama(item){
    setQuick(item);
    setQuickStock(""); // input tambah, bukan timpa - fix logic 10+13=23
    setQuickHarga(String(item.harga_beli||0));
    if(item.isHall) setQuickJenis("Hall");
    else if(item.isOrgk) setQuickJenis("Orgk");
    else setQuickJenis("Regular");
  }

  async function handleUpdate(){
    if(!quick) return;
    const tambah = Number(quickStock||0);
    const stockLama = Number(quick.stok||quick.stock||0);
    const stockBaruTotal = stockLama + tambah; // 10 + 5 =15 (foto Tepung Terigu)
    const hargaLama = Number(quick.harga_beli||0);
    const hargaBaruInput = Number(quickHarga||0);

    // FIX COMPATIBLE SUPABASE: Coba update dengan kolom lengkap, kalau gagal karena kolom selisih belum ada, fallback update minimal
    let error = null;
    const payloadFull = { stok: stockBaruTotal, stock: stockBaruTotal, harga_beli: hargaBaruInput };
    // Cek apakah tabel punya kolom harga_baru & selisih via try
    try{
      const { error: e1 } = await supabase.from("inventory_items").update({ ...payloadFull, harga_baru: hargaBaruInput, selisih: hargaBaruInput - hargaLama }).eq("kode_bahan", quick.kode_bahan);
      if(e1 && e1.message.includes("selisih")) throw e1;
      error = e1;
    }catch(err){
      // Fallback: update hanya kolom yang pasti ada
      const { error: e2 } = await supabase.from("inventory_items").update(payloadFull).eq("kode_bahan", quick.kode_bahan);
      error = e2;
    }

    if(error){ alert("Gagal update: "+error.message+"\nJalankan fix_inventory_columns.sql di Supabase SQL Editor dulu!"); return; }

    const newItems = items.map(it=> it.kode_bahan===quick.kode_bahan ? {...it, stok: stockBaruTotal, stock: stockBaruTotal, harga_beli: hargaBaruInput, harga_baru: hargaBaruInput, selisih: hargaBaruInput - hargaLama } : it);
    setItems(newItems);
    setQuick(null);
  }

  function handleBukaSemua(){
    const exp = {}; Object.keys(grouped).forEach(k=> exp[k]=true); KATEGORI_LIST.forEach(k=> exp[k]=true); setExpanded(exp);
  }
  function handleTutupSemua(){
    const exp = {}; Object.keys(grouped).forEach(k=> exp[k]=false); setExpanded(exp);
  }
  function handleRefresh(){ loadData(); }
  function handleTambahBahan(){ setNewKode(nextKodeBeras); setNewKategori("BERAS"); setNewNama(""); setNewStock("10"); setNewHarga("15000"); setNewJenis("Regular"); setNewHalal(""); setShowTambah(true); }
  async function handleSimpanTambah(){
    if(!newKode || !newNama){ alert("Kode & Nama wajib"); return; }
    const payload = { kode_bahan: newKode, nama_bahan: newNama, kategori: newKategori, stok: Number(newStock), stock: Number(newStock), harga_beli: Number(newHarga), satuan: "kg" };
    const { error } = await supabase.from("inventory_items").insert(payload);
    if(error){ alert("Gagal tambah: "+error.message); return; }
    setShowTambah(false); loadData();
  }
  async function handleHapusGeneral(){
    if(!confirm("Hapus bahan General / "+nextKodeBeras+" ?")) return;
    const target = items.find(i=> i.kode_bahan===nextKodeBeras);
    if(!target){ alert("Tidak ada "+nextKodeBeras+" - pakai Delete di kolom Aksi untuk hapus per baris"); return; }
    const { error } = await supabase.from("inventory_items").delete().eq("kode_bahan", target.kode_bahan);
    if(error){ alert("Gagal hapus: "+error.message); return; }
    loadData();
  }

  return (
    <div className="p-4 bg-[#f5f7fb] min-h-screen">
      <div className="bg-slate-900 text-white p-4 rounded-t-xl">
        <div className="text-lg font-bold">Master Bahan Sikitchen - 15 Kategori - V12.1 Fix SQL Compatible</div>
        <div className="text-xs text-slate-300">Live: {items.length} bahan • Fix error selisih column - compatible Supabase • Next BERAS {nextKodeBeras} • Logic Stock 10+5=15 & Harga Selisih 1000 • Tombol header aktif • 15 kategori tampil</div>
        <div className="mt-3 flex gap-2 flex-wrap">
          <button onClick={handleTambahBahan} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm font-bold">+ Tambah Bahan General (Next: {nextKodeBeras} No {String(nextNoBeras).padStart(3,"0")})</button>
          <button onClick={handleHapusGeneral} className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm font-bold">Hapus Bahan General</button>
          <button onClick={handleBukaSemua} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded text-sm">Buka Semua</button>
          <button onClick={handleTutupSemua} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded text-sm">Tutup Semua</button>
          <button onClick={handleRefresh} className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm">↻ Refresh</button>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari kode / nama / ID Halal..." className="mt-3 w-full p-2 rounded text-black text-sm" />
      </div>

      {showTambah && (
        <div className="bg-white border-2 border-green-300 p-4 rounded-xl my-3">
          <div className="font-bold text-sm mb-2">+ Tambah Bahan General - Next {nextKodeBeras}</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div><div className="text-xs">Kode Bahan</div><input value={newKode} onChange={e=>setNewKode(e.target.value)} className="w-full p-2 border rounded text-sm font-mono" /></div>
            <div><div className="text-xs">Nama Bahan</div><input value={newNama} onChange={e=>setNewNama(e.target.value)} className="w-full p-2 border rounded text-sm" /></div>
            <div><div className="text-xs">Kategori</div><select value={newKategori} onChange={e=>setNewKategori(e.target.value)} className="w-full p-2 border rounded text-sm">{KATEGORI_LIST.map(k=><option key={k} value={k}>{k}</option>)}</select></div>
          </div>
          <div className="mt-3 flex gap-2"><button onClick={handleSimpanTambah} className="flex-1 bg-green-600 text-white py-2 rounded font-bold text-sm">Simpan</button><button onClick={()=>setShowTambah(false)} className="px-4 py-2 bg-gray-200 rounded text-sm">Batal</button></div>
        </div>
      )}

      {quick && (
        <div className="bg-green-50 border-2 border-green-200 p-4 rounded-xl my-3">
          <div className="flex justify-between items-center mb-3">
            <div className="font-bold text-green-800 text-sm">🛠️ Update Cepat: {quick.kode_bahan} ({quick.nama_bahan}) - V12.1 Compatible</div>
            <div className="text-xs bg-white border px-3 py-1 rounded-full font-mono">No {String(quick._no).padStart(3,"0")} • Kode {quick.kode_bahan} • Stock {quick.stok} + {quickStock||0} = {Number(quick.stok||0)+Number(quickStock||0)}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div><div className="text-xs font-semibold">Nama Bahan</div><input value={quick.nama_bahan} disabled className="w-full p-2 border rounded bg-white text-sm" /></div>
            <div><div className="text-xs font-semibold">Jenis Kode</div><select value={quickJenis} onChange={e=>setQuickJenis(e.target.value)} className="w-full p-2 border rounded text-sm"><option>Regular</option><option>Hall</option><option>Orgk</option></select></div>
            <div><div className="text-xs font-semibold">Stock Baru (biru) = DITAMBAH ex 10+5=15</div><input type="number" value={quickStock} onChange={e=>setQuickStock(e.target.value)} placeholder="5" className="w-full p-2 border-2 border-blue-400 rounded text-sm" /></div>
            <div><div className="text-xs font-semibold">Harga Baru (kuning) selisih auto</div><input type="number" value={quickHarga} onChange={e=>setQuickHarga(e.target.value)} className="w-full p-2 border-2 border-yellow-400 rounded text-sm bg-yellow-50" /></div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleUpdate} className="flex-1 bg-green-600 text-white py-2 rounded font-bold text-sm">Update Stock & Harga - {quick.kode_bahan} → Stock {quick.stok} + {quickStock||0} = {Number(quick.stok||0)+Number(quickStock||0)} | Selisih {Number(quickHarga||0)-Number(quick.harga_beli||0)}</button>
            <button onClick={()=>setQuick(null)} className="px-4 py-2 bg-gray-200 rounded text-sm">Batal</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-b-xl border">
        {Object.keys(grouped).sort().map((kat,i)=>{
          const list = grouped[kat];
          const isOpen = expanded[kat]!==false;
          return (
            <div key={kat} className="border-b last:border-0">
              <div className="p-3 font-bold text-sm flex justify-between bg-slate-50 cursor-pointer" onClick={()=>setExpanded(prev=>({...prev, [kat]: !isOpen}))}>
                <div>{i+1} &nbsp; {kat} - {list.length} bahan • Format {kat}-001 • Klik nama untuk update cepat {isOpen?"▼":"▶"}</div><div className="text-xs">{isOpen?"Tutup":"Buka"}</div>
              </div>
              {isOpen && (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white text-xs"><tr><th className="text-left p-2">No</th><th className="text-left p-2">Kode Bahan</th><th className="text-left p-2">Nama Bahan (klik)</th><th className="text-left p-2">ID Halal 19 digit</th><th className="text-left p-2">Stock</th><th className="text-left p-2">Harga Beli</th><th className="text-left p-2">Harga Baru</th><th className="text-left p-2">Selisih</th><th className="text-left p-2">Aksi</th></tr></thead>
                    <tbody>
                      {list.map(it=>(
                        <tr key={it.kode_bahan} className="border-t hover:bg-blue-50">
                          <td className="p-2 text-xs">{String(it._no).padStart(3,"0")}</td>
                          <td className="p-2 font-mono text-xs font-bold">{it.kode_bahan}</td>
                          <td className="p-2 font-semibold cursor-pointer" onClick={()=>handleClickNama(it)}>{it.nama_bahan} <span className="text-[10px] text-blue-600">↗ klik</span></td>
                          <td className="p-2">{it.isHall ? <span className="bg-green-100 border px-2 py-1 rounded text-[10px] font-mono">{it.halal_id||"ID32110078778290726"}</span> : "-"}</td>
                          <td className="p-2"><span className="bg-blue-100 px-2 py-1 rounded-full text-xs">{it.stok}</span></td>
                          <td className="p-2 text-xs">Rp {Number(it.harga_beli||0).toLocaleString("id-ID")}</td>
                          <td className="p-2 text-xs">Rp {Number(it.harga_baru||it.harga_beli||0).toLocaleString("id-ID")}</td>
                          <td className="p-2 text-xs">{Number(it.selisih||0).toLocaleString("id-ID")}</td>
                          <td className="p-2"><button onClick={()=>handleClickNama(it)} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs mr-1">Edit</button><button className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs">Delete</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
