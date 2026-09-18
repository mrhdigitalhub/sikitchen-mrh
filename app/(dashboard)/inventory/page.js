"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchInventoryCompat } from "@/lib/inventoryCompat";

// FIX KATEGORI SESUAI EXCEL FIXED - 15 Kategori Bahan Utama - TIDAK ADA SAUS, LAUK, LAIN, KEMASAN
const KATEGORI_UTAMA_15 = [
  "Bahan Baku Utama",
  "Bahan Kemasan",
  "Bahan Pembersih",
  "Bahan Hewani",
  "Bahan Nabati",
  "Bahan Hewani Non Sembelihan",
  "Bahan Susu",
  "Bahan Fermentasi Alami",
  "Bahan Minyak dan Lemak",
  "Bahan Bumbu Instan",
  "Bahan Sayuran",
  "Bahan Buah Segar",
  "Bahan Penyedap Rasa",
  "Bahan Rempah Alami",
  "Bahan Pelengkap"
];

const KODE_KATEGORI_18 = ["BERAS","BOX","SABUN","DAGING","UMBI","IKAN","UDANG","CUMI","TELUR","SUSU","FERMENTASI","MINYAK","BUBUK","SAYURAN","BUAH","PENYEDAP","REMPAH","KERUPUK"];

const MAP_KODE_KE_UTAMA = {
  "BERAS":"Bahan Baku Utama",
  "BOX":"Bahan Kemasan",
  "SABUN":"Bahan Pembersih",
  "DAGING":"Bahan Hewani",
  "UMBI":"Bahan Nabati",
  "IKAN":"Bahan Hewani Non Sembelihan",
  "UDANG":"Bahan Hewani Non Sembelihan",
  "CUMI":"Bahan Hewani Non Sembelihan",
  "TELUR":"Bahan Hewani Non Sembelihan",
  "SUSU":"Bahan Susu",
  "FERMENTASI":"Bahan Fermentasi Alami",
  "MINYAK":"Bahan Minyak dan Lemak",
  "BUBUK":"Bahan Bumbu Instan",
  "SAYURAN":"Bahan Sayuran",
  "BUAH":"Bahan Buah Segar",
  "PENYEDAP":"Bahan Penyedap Rasa",
  "REMPAH":"Bahan Rempah Alami",
  "KERUPUK":"Bahan Pelengkap"
};

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
  const [newKodeKat, setNewKodeKat] = useState("BERAS");
  const [newKategoriUtama, setNewKategoriUtama] = useState("Bahan Baku Utama");
  const [newStock, setNewStock] = useState("10");
  const [newHarga, setNewHarga] = useState("15000");
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ loadData(); },[]);

  async function loadData(){
    setLoading(true);
    try{
      const { items: data } = await fetchInventoryCompat();
      const withNo = data.map((d,i)=> {
        // mapping kategori excel jika kode masih lama SAUS->PENYEDAP, LAUK->DAGING, LAIN->KERUPUK, KEMASAN->BOX
        let kode = (d.kode_bahan||"").split("-")[0];
        if(kode==="SAUS") kode="PENYEDAP";
        if(kode==="LAUK") kode="DAGING";
        if(kode==="LAIN") kode="KERUPUK";
        if(kode==="KEMASAN") kode="BOX";
        if(kode==="AYAM") kode="DAGING";
        if(kode==="SAYUR") kode="SAYURAN";
        if(kode==="BUMBU") kode="BUBUK";
        if(kode==="KEJU") kode="SUSU";
        const utama = MAP_KODE_KE_UTAMA[kode] || d.kategori || "Bahan Baku Utama";
        return {...d, _no: i+1, _kode_fix: kode, _utama: utama, selisih: Number(d.harga_baru||d.harga_beli||0) - Number(d.harga_beli||0)}
      });
      setItems(withNo);
      const exp = {};
      KATEGORI_UTAMA_15.forEach(k=> exp[k]=true);
      KODE_KATEGORI_18.forEach(k=> exp[k]=true);
      withNo.forEach(it=>{ exp[it._utama]=true; exp[it._kode_fix]=true; });
      setExpanded(exp);
    }catch(e){ console.log(e); }
    setLoading(false);
  }

  const filtered = items.filter(i=>{
    if(!search) return true;
    const s = search.toLowerCase();
    return i.kode_bahan.toLowerCase().includes(s) || i.nama_bahan.toLowerCase().includes(s);
  });

  const grouped = filtered.reduce((acc,cur)=>{
    const kat = cur._utama || "Bahan Baku Utama";
    if(!acc[kat]) acc[kat]=[];
    acc[kat].push(cur);
    return acc;
  },{});

  const berasItems = items.filter(i=> (i._kode_fix||"").includes("BERAS"));
  const nextNoBeras = berasItems.length + 1;
  const nextKodeBeras = `BERAS-${String(nextNoBeras).padStart(3,"0")}`;

  function handleClickNama(item){
    setQuick(item);
    setQuickStock("");
    setQuickHarga(String(item.harga_beli||0));
  }

  async function handleUpdate(){
    if(!quick) return;
    const tambah = Number(quickStock||0);
    const stockLama = Number(quick.stok||quick.stock||0);
    const stockBaruTotal = stockLama + tambah; // logic tetap 10+5=15
    const hargaLama = Number(quick.harga_beli||0);
    const hargaBaruInput = Number(quickHarga||0);
    const { error } = await supabase.from("inventory_items").update({
      stok: stockBaruTotal, stock: stockBaruTotal, harga_beli: hargaBaruInput, harga_baru: hargaBaruInput, selisih: hargaBaruInput - hargaLama
    }).eq("kode_bahan", quick.kode_bahan);
    if(error){ alert("Gagal: "+error.message); return; }
    setItems(items.map(it=> it.kode_bahan===quick.kode_bahan ? {...it, stok: stockBaruTotal, stock: stockBaruTotal, harga_beli: hargaBaruInput, harga_baru: hargaBaruInput, selisih: hargaBaruInput - hargaLama } : it));
    setQuick(null);
  }

  function handleBukaSemua(){ const exp = {}; Object.keys(grouped).forEach(k=> exp[k]=true); setExpanded(exp); }
  function handleTutupSemua(){ const exp = {}; Object.keys(grouped).forEach(k=> exp[k]=false); setExpanded(exp); }
  async function handleRefresh(){ setLoading(true); await loadData(); setShowTambah(false); setQuick(null); }
  function handleTambahBahan(){
    if(showTambah){ setShowTambah(false); }else{ setNewKode(nextKodeBeras); setNewKodeKat("BERAS"); setNewKategoriUtama("Bahan Baku Utama"); setNewNama(""); setNewStock("10"); setNewHarga("15000"); setShowTambah(true); }
  }
  async function handleSimpanTambah(){
    if(!newKode || !newNama){ alert("Kode & Nama wajib"); return; }
    const payload = { kode_bahan: newKode.trim(), nama_bahan: newNama.trim(), kategori: newKategoriUtama, stok: Number(newStock)||10, stock: Number(newStock)||10, harga_beli: Number(newHarga)||15000, harga_baru: Number(newHarga)||15000, selisih: 0, satuan: "Kg" };
    const { error } = await supabase.from("inventory_items").insert(payload);
    if(error){ alert("Gagal simpan: "+error.message); return; }
    alert("Berhasil tambah "+newKode+" - Kategori Excel Fixed: "+newKategoriUtama);
    setShowTambah(false); await loadData();
  }
  async function handleHapusGeneral(){
    if(!confirm("Hapus "+nextKodeBeras+" ?")) return;
    const target = items.find(i=> i.kode_bahan===nextKodeBeras);
    if(!target){ alert("Tidak ada "+nextKodeBeras); return; }
    const { error } = await supabase.from("inventory_items").delete().eq("kode_bahan", target.kode_bahan);
    if(error){ alert("Gagal: "+error.message); return; }
    await loadData();
  }

  return (
    <div className="p-4 bg-[#f5f7fb] min-h-screen">
      <div className="bg-slate-900 text-white p-4 rounded-t-xl">
        <div className="text-lg font-bold">Master Bahan Sikitchen - 15 Kategori Excel Fixed - V12.3 No Global Tetap</div>
        <div className="text-xs text-slate-300">Live: {items.length} bahan • Excel Fixed: 15 Kategori Utama (Bahan Baku, Kemasan, Pembersih...) • 18 Kode (BERAS, BOX, SABUN...) • Tidak ada SAUS, LAUK, LAIN, KEMASAN • No Global tetap • Stock 10+5=15 tetap</div>
        <div className="mt-3 flex gap-2 flex-wrap">
          <button onClick={handleTambahBahan} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm font-bold border-2 border-white">+ Tambah Bahan General (Next: {nextKodeBeras} No {String(nextNoBeras).padStart(3,"0")})</button>
          <button onClick={handleHapusGeneral} className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm font-bold">Hapus Bahan General</button>
          <button onClick={handleBukaSemua} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded text-sm">Buka Semua</button>
          <button onClick={handleTutupSemua} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded text-sm">Tutup Semua</button>
          <button onClick={handleRefresh} className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm border border-white">↻ Refresh</button>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari kode / nama..." className="mt-3 w-full p-2 rounded text-black text-sm" />
      </div>

      {showTambah && (
        <div className="bg-white border-2 border-green-400 p-4 rounded-xl my-3 shadow">
          <div className="font-bold text-sm mb-2">+ Tambah Bahan General - Excel Fixed 15 Kategori (Bukan SAUS/LAUK/LAIN)</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div><div className="text-xs font-semibold">Kode Bahan * (18 Kode Excel)</div><input value={newKode} onChange={e=>setNewKode(e.target.value)} className="w-full p-2 border-2 border-green-300 rounded text-sm font-mono" /></div>
            <div><div className="text-xs font-semibold">Nama Bahan *</div><input value={newNama} onChange={e=>setNewNama(e.target.value)} placeholder="Wajib isi" className="w-full p-2 border-2 border-green-300 rounded text-sm" /></div>
            <div><div className="text-xs font-semibold">Kode Kategori Excel (18)</div><select value={newKodeKat} onChange={e=>{ setNewKodeKat(e.target.value); setNewKategoriUtama(MAP_KODE_KE_UTAMA[e.target.value]); }} className="w-full p-2 border rounded text-sm">{KODE_KATEGORI_18.map(k=><option key={k} value={k}>{k} - {MAP_KODE_KE_UTAMA[k]}</option>)}</select></div>
            <div className="md:col-span-3"><div className="text-xs font-semibold">Kategori Utama Excel (15) - Auto dari Kode</div><select value={newKategoriUtama} onChange={e=>setNewKategoriUtama(e.target.value)} className="w-full p-2 border rounded text-sm bg-yellow-50">{KATEGORI_UTAMA_15.map(k=><option key={k} value={k}>{k}</option>)}</select></div>
            <div><div className="text-xs">Stock Awal</div><input type="number" value={newStock} onChange={e=>setNewStock(e.target.value)} className="w-full p-2 border rounded text-sm" /></div>
            <div><div className="text-xs">Harga Beli</div><input type="number" value={newHarga} onChange={e=>setNewHarga(e.target.value)} className="w-full p-2 border rounded text-sm" /></div>
          </div>
          <div className="mt-3 flex gap-2"><button onClick={handleSimpanTambah} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded font-bold text-sm">Simpan - {newKode} - {newKategoriUtama}</button><button onClick={()=>setShowTambah(false)} className="px-6 py-3 bg-gray-200 rounded text-sm">Batal</button></div>
          <div className="text-[10px] text-gray-500 mt-2">Excel Fixed: Tidak ada SAUS, LAUK, LAIN, KEMASAN, AYAM, KEJU. Yang ada: BOX, SABUN, UMBI, UDANG, CUMI, FERMENTASI, BUBUK, SAYURAN, BUAH, PENYEDAP, REMPAH, KERUPUK</div>
        </div>
      )}

      {quick && (
        <div className="bg-green-50 border-2 border-green-200 p-4 rounded-xl my-3">
          <div className="flex justify-between items-center mb-3">
            <div className="font-bold text-green-800 text-sm">🛠️ Update Cepat: {quick.kode_bahan} - No Global {String(quick._no).padStart(3,"0")} tetap</div>
            <div className="text-xs bg-white border px-3 py-1 rounded-full font-mono">Stock {quick.stok} + {quickStock||0} = {Number(quick.stok||0)+Number(quickStock||0)}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div><div className="text-xs font-semibold">Nama</div><input value={quick.nama_bahan} disabled className="w-full p-2 border rounded bg-white text-sm" /></div>
            <div><div className="text-xs font-semibold">Kategori Excel</div><input value={quick._utama} disabled className="w-full p-2 border rounded bg-white text-xs" /></div>
            <div><div className="text-xs font-semibold">Stock Tambah 10+5=15 tetap</div><input type="number" value={quickStock} onChange={e=>setQuickStock(e.target.value)} className="w-full p-2 border-2 border-blue-400 rounded text-sm" /></div>
            <div><div className="text-xs font-semibold">Harga Baru</div><input type="number" value={quickHarga} onChange={e=>setQuickHarga(e.target.value)} className="w-full p-2 border-2 border-yellow-400 rounded text-sm bg-yellow-50" /></div>
          </div>
          <div className="mt-3 flex gap-2"><button onClick={handleUpdate} className="flex-1 bg-green-600 text-white py-2 rounded font-bold text-sm">Update</button><button onClick={()=>setQuick(null)} className="px-4 py-2 bg-gray-200 rounded text-sm">Batal</button></div>
        </div>
      )}

      <div className="bg-white rounded-b-xl border">
        {KATEGORI_UTAMA_15.map((kat,i)=>{
          const list = grouped[kat] || [];
          if(list.length===0) return null;
          const isOpen = expanded[kat]!==false;
          return (
            <div key={kat} className="border-b last:border-0">
              <div className="p-3 font-bold text-sm flex justify-between bg-slate-50 cursor-pointer" onClick={()=>setExpanded(prev=>({...prev, [kat]: !isOpen}))}>
                <div>{i+1} &nbsp; {kat} - {list.length} bahan • {isOpen?"▼":"▶"}</div><div className="text-xs">{isOpen?"Tutup":"Buka"}</div>
              </div>
              {isOpen && (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white text-xs"><tr><th className="text-left p-2">No Global</th><th className="text-left p-2">Kode Bahan (18 Kode Excel)</th><th className="text-left p-2">Nama Bahan (klik)</th><th className="text-left p-2">Kategori Utama</th><th className="text-left p-2">Stock</th><th className="text-left p-2">Harga Beli</th><th className="text-left p-2">Harga Baru</th><th className="text-left p-2">Selisih</th><th className="text-left p-2">Aksi</th></tr></thead>
                    <tbody>
                      {list.map(it=>(
                        <tr key={it.kode_bahan} className="border-t hover:bg-blue-50">
                          <td className="p-2 text-xs">{String(it._no).padStart(3,"0")}</td>
                          <td className="p-2 font-mono text-xs font-bold">{it.kode_bahan} <span className="text-[10px] text-gray-400">({it._kode_fix})</span></td>
                          <td className="p-2 font-semibold cursor-pointer" onClick={()=>handleClickNama(it)}>{it.nama_bahan} <span className="text-[10px] text-blue-600">↗ klik</span></td>
                          <td className="p-2 text-[11px]">{it._utama}</td>
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
