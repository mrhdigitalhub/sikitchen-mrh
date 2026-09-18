"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchInventoryCompat } from "@/lib/inventoryCompat";

const KATEGORI_UTAMA_15 = [
  "Bahan Baku Utama","Bahan Kemasan","Bahan Pembersih","Bahan Hewani","Bahan Nabati",
  "Bahan Hewani Non Sembelihan","Bahan Susu","Bahan Fermentasi Alami","Bahan Minyak dan Lemak",
  "Bahan Bumbu Instan","Bahan Sayuran","Bahan Buah Segar","Bahan Penyedap Rasa","Bahan Rempah Alami","Bahan Pelengkap"
];
const KODE_KATEGORI_18 = ["BERAS","BOX","SABUN","DAGING","UMBI","IKAN","UDANG","CUMI","TELUR","SUSU","FERMENTASI","MINYAK","BUBUK","SAYURAN","BUAH","PENYEDAP","REMPAH","KERUPUK"];
const MAP_KODE_KE_UTAMA = {
  "BERAS":"Bahan Baku Utama","BOX":"Bahan Kemasan","SABUN":"Bahan Pembersih","DAGING":"Bahan Hewani","UMBI":"Bahan Nabati",
  "IKAN":"Bahan Hewani Non Sembelihan","UDANG":"Bahan Hewani Non Sembelihan","CUMI":"Bahan Hewani Non Sembelihan","TELUR":"Bahan Hewani Non Sembelihan",
  "SUSU":"Bahan Susu","FERMENTASI":"Bahan Fermentasi Alami","MINYAK":"Bahan Minyak dan Lemak","BUBUK":"Bahan Bumbu Instan",
  "SAYURAN":"Bahan Sayuran","BUAH":"Bahan Buah Segar","PENYEDAP":"Bahan Penyedap Rasa","REMPAH":"Bahan Rempah Alami","KERUPUK":"Bahan Pelengkap"
};

export default function InventoryPage(){
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [quick, setQuick] = useState(null);
  const [quickStock, setQuickStock] = useState("");
  const [quickHarga, setQuickHarga] = useState("");
  const [expanded, setExpanded] = useState({});
  const [showTambah, setShowTambah] = useState(false);
  const [newKodeKat, setNewKodeKat] = useState("BERAS");
  const [newNama, setNewNama] = useState("");
  const [newStock, setNewStock] = useState("10");
  const [newHarga, setNewHarga] = useState("15000");
  const [loading, setLoading] = useState(true);

  const newKategoriUtama = MAP_KODE_KE_UTAMA[newKodeKat] || "Bahan Baku Utama";
  const countForKode = items.filter(i=> (i._kode_fix||"")===newKodeKat).length;
  const nextNoForKode = countForKode + 1;
  const newKode = `${newKodeKat}-${String(nextNoForKode).padStart(3,"0")}`;

  useEffect(()=>{ loadData(); },[]);

  async function loadData(){
    setLoading(true);
    try{
      const { items: data } = await fetchInventoryCompat();
      const withNo = data.map((d,i)=> {
        let kode = (d.kode_bahan||"").split("-")[0].toUpperCase();
        if(["SAUS","LAUK","LAIN","KEMASAN","AYAM","SAYUR","BUMBU","KEJU"].includes(kode)){
          if(kode==="SAUS") kode="PENYEDAP"; else if(kode==="LAUK") kode="DAGING"; else if(kode==="LAIN") kode="KERUPUK"; else if(kode==="KEMASAN") kode="BOX"; else if(kode==="AYAM") kode="DAGING"; else if(kode==="SAYUR") kode="SAYURAN"; else if(kode==="BUMBU") kode="BUBUK"; else if(kode==="KEJU") kode="SUSU";
        }
        const utama = MAP_KODE_KE_UTAMA[kode] || d.kategori || "Bahan Baku Utama";
        return {...d, _no: i+1, _kode_fix: kode, _utama: utama, selisih: Number(d.harga_baru||d.harga_beli||0) - Number(d.harga_beli||0)}
      });
      setItems(withNo);
      const exp = {}; KATEGORI_UTAMA_15.forEach(k=> exp[k]=true); setExpanded(exp);
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

  // LOGIC CEPAT - TETAP 10+5=15
  function handleClickNama(item){ setQuick(item); setQuickStock(""); setQuickHarga(String(item.harga_beli||0)); }
  async function handleUpdate(){
    if(!quick) return;
    const tambah = Number(quickStock||0);
    const stockLama = Number(quick.stok||quick.stock||0);
    const stockBaruTotal = stockLama + tambah; // LOGIC 10+5=15
    const hargaLama = Number(quick.harga_beli||0);
    const hargaBaruInput = Number(quickHarga||0);
    const selisihBaru = hargaBaruInput - hargaLama;
    const { error } = await supabase.from("inventory_items").update({
      stok: stockBaruTotal, stock: stockBaruTotal, harga_beli: hargaBaruInput, harga_baru: hargaBaruInput, selisih: selisihBaru
    }).eq("kode_bahan", quick.kode_bahan);
    if(error){ alert("Gagal: "+error.message); return; }
    setItems(items.map(it=> it.kode_bahan===quick.kode_bahan ? {...it, stok: stockBaruTotal, stock: stockBaruTotal, harga_beli: hargaBaruInput, harga_baru: hargaBaruInput, selisih: selisihBaru } : it));
    setQuick(null);
  }

  function handleBukaSemua(){ const exp = {}; Object.keys(grouped).forEach(k=> exp[k]=true); setExpanded(exp); }
  function handleTutupSemua(){ const exp = {}; Object.keys(grouped).forEach(k=> exp[k]=false); setExpanded(exp); }
  async function handleRefresh(){ setLoading(true); await loadData(); setShowTambah(false); setQuick(null); }
  function handleTambahBahan(){
    if(showTambah){ setShowTambah(false); }else{ setNewKodeKat("BERAS"); setNewNama(""); setNewStock("10"); setNewHarga("15000"); setShowTambah(true); }
  }

  // FIX LOGIC TAMBAH SAMA DENGAN CEPAT - 10+5=15 + SELISIH
  async function handleSimpanTambah(){
    if(!newNama){ alert("Nama Bahan wajib isi"); return; }
    const existing = items.find(i=> i.kode_bahan===newKode);
    const tambahStock = Number(newStock)||0;
    const hargaBaruInput = Number(newHarga)||0;

    if(existing){
      // KALAU SUDAH ADA (sama kayak klik cepat) -> stock lama + tambah, selisih harga_baru - harga_lama
      const stockLama = Number(existing.stok||existing.stock||0);
      const hargaLama = Number(existing.harga_beli||0);
      const stockBaruTotal = stockLama + tambahStock; // LOGIC SAMA 10+5=15
      const selisihBaru = hargaBaruInput - hargaLama;
      const { error } = await supabase.from("inventory_items").update({
        nama_bahan: newNama.trim(),
        kategori: newKategoriUtama,
        stok: stockBaruTotal,
        stock: stockBaruTotal,
        harga_beli: hargaBaruInput,
        harga_baru: hargaBaruInput,
        selisih: selisihBaru
      }).eq("kode_bahan", newKode);
      if(error){ alert("Gagal update tambah: "+error.message); return; }
      alert(`Update sama kayak cepat: ${newKode} Stock ${stockLama}+${tambahStock}=${stockBaruTotal} | Harga Lama ${hargaLama} -> Baru ${hargaBaruInput} | Selisih ${selisihBaru}`);
    } else {
      // KALAU BARU -> stok = tambah, harga_baru = harga_beli, selisih 0 (sama logic awal cepat)
      const payload = { 
        kode_bahan: newKode, 
        nama_bahan: newNama.trim(), 
        kategori: newKategoriUtama, 
        stok: tambahStock, 
        stock: tambahStock, 
        harga_beli: hargaBaruInput, 
        harga_baru: hargaBaruInput, 
        selisih: 0, 
        satuan: "Kg" 
      };
      const { error } = await supabase.from("inventory_items").insert(payload);
      if(error){ alert("Gagal simpan: "+error.message); return; }
      alert(`Berhasil tambah baru ${newKode} - ${newKategoriUtama} - Stock ${tambahStock} | Harga ${hargaBaruInput} | Selisih 0 (logic sama kayak cepat)`);
    }
    setShowTambah(false); setNewNama(""); await loadData();
  }

  const berasItems = items.filter(i=> i._kode_fix==="BERAS");

  return (
    <div className="p-4 bg-[#f5f7fb] min-h-screen">
      <div className="bg-slate-900 text-white p-4 rounded-t-xl">
        <div className="text-lg font-bold">Master Bahan Sikitchen - V12.5 Tambah Logic Sama Kayak Cepat FIX</div>
        <div className="text-xs text-slate-300">Live: {items.length} bahan • Logic Tambah: Stock Lama+Baru=Total (10+5=15) | Harga Baru & Selisih = Baru-Lama (sama kayak klik cepat) • 15 Kategori Excel • No Global tetap</div>
        <div className="mt-3 flex gap-2 flex-wrap">
          <button onClick={handleTambahBahan} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm font-bold border-2 border-white">+ Tambah Bahan General (Next BERAS: BERAS-{String(berasItems.length+1).padStart(3,"0")})</button>
          <button onClick={handleBukaSemua} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded text-sm">Buka Semua</button>
          <button onClick={handleTutupSemua} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded text-sm">Tutup Semua</button>
          <button onClick={handleRefresh} className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm border border-white">↻ Refresh</button>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari kode / nama..." className="mt-3 w-full p-2 rounded text-black text-sm" />
      </div>

      {showTambah && (
        <div className="bg-white border-2 border-green-500 p-4 rounded-xl my-3 shadow">
          <div className="font-bold text-sm mb-2 text-green-700">✅ + Tambah Bahan General - Logic Stock & Harga SAMA KAYAK KLIK CEPAT</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="bg-yellow-50 border border-yellow-300 p-2 rounded">
              <div className="text-xs font-semibold">Kode Kategori Excel (18)</div>
              <select value={newKodeKat} onChange={e=> setNewKodeKat(e.target.value)} className="w-full p-2 border-2 border-blue-400 rounded text-sm font-bold">
                {KODE_KATEGORI_18.map(k=><option key={k} value={k}>{k} - {MAP_KODE_KE_UTAMA[k]} - Next {k}-{String(items.filter(i=>i._kode_fix===k).length+1).padStart(3,"0")}</option>)}
              </select>
            </div>
            <div className="bg-blue-50 border border-blue-300 p-2 rounded">
              <div className="text-xs font-semibold">Kode Bahan Auto (1 Garis Lurus)</div>
              <input value={newKode} disabled className="w-full p-2 border-2 border-green-400 rounded text-sm font-mono font-bold bg-green-50" />
            </div>
            <div>
              <div className="text-xs font-semibold">Nama Bahan * Wajib</div>
              <input value={newNama} onChange={e=>setNewNama(e.target.value)} placeholder="Ex: Beras Super" className="w-full p-2 border-2 border-green-300 rounded text-sm" />
            </div>
            <div className="md:col-span-3 bg-purple-50 border border-purple-300 p-2 rounded">
              <div className="text-xs font-semibold">Kategori Utama Excel (15) Auto</div>
              <input value={newKategoriUtama} disabled className="w-full p-2 border rounded text-sm bg-white font-bold" />
            </div>
            <div className="bg-blue-50 border-2 border-blue-400 p-2 rounded">
              <div className="text-xs font-semibold">Stock Awal (Logic Sama Kayak Cepat: Lama+Tambah=Total)</div>
              <input type="number" value={newStock} onChange={e=>setNewStock(e.target.value)} className="w-full p-2 border rounded text-sm font-bold" />
              <div className="text-[10px] text-blue-600 mt-1">Jika {newKode} sudah ada stok 12 + {newStock} = {12 + (Number(newStock)||0)} | Jika baru = {newStock}</div>
            </div>
            <div className="bg-yellow-50 border-2 border-yellow-400 p-2 rounded">
              <div className="text-xs font-semibold">Harga Beli (Logic Sama Kayak Cepat: Baru & Selisih)</div>
              <input type="number" value={newHarga} onChange={e=>setNewHarga(e.target.value)} className="w-full p-2 border rounded text-sm font-bold bg-yellow-50" />
              <div className="text-[10px] text-yellow-700 mt-1">Harga Baru = Harga Beli | Selisih = Baru - Lama (sama kayak cepat)</div>
            </div>
          </div>
          <div className="mt-3 flex gap-2"><button onClick={handleSimpanTambah} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded font-bold text-sm">Simpan - {newKode} - Stock {newStock} + Lama = Total | Harga {newHarga} | Logic Sama Kayak Cepat</button><button onClick={()=>setShowTambah(false)} className="px-6 py-3 bg-gray-200 rounded text-sm">Batal</button></div>
        </div>
      )}

      {quick && (
        <div className="bg-green-50 border-2 border-green-200 p-4 rounded-xl my-3">
          <div className="flex justify-between items-center mb-2">
            <div className="font-bold text-green-800 text-sm">🛠️ Update Cepat: {quick.kode_bahan} - Logic 10+5=15</div>
            <div className="text-xs bg-white border px-3 py-1 rounded-full">No Global {String(quick._no).padStart(3,"0")} • {quick._utama}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div><div className="text-xs font-semibold">Nama Bahan</div><input value={quick.nama_bahan} disabled className="w-full p-2 border rounded bg-white text-sm" /></div>
            <div><div className="text-xs font-semibold">Kategori Excel</div><input value={quick._utama} disabled className="w-full p-2 border rounded bg-white text-xs" /></div>
            <div><div className="text-xs font-semibold">Stock Tambah (10+5=15)</div><input type="number" value={quickStock} onChange={e=>setQuickStock(e.target.value)} className="w-full p-2 border-2 border-blue-400 rounded text-sm" /><div className="text-[10px] text-blue-600">{Number(quick.stok||0)}+{quickStock||0}={Number(quick.stok||0)+Number(quickStock||0)}</div></div>
            <div><div className="text-xs font-semibold">Harga Baru</div><input type="number" value={quickHarga} onChange={e=>setQuickHarga(e.target.value)} className="w-full p-2 border-2 border-yellow-400 rounded text-sm bg-yellow-50" /><div className="text-[10px] text-yellow-700">Selisih {Number(quickHarga||0)-Number(quick.harga_beli||0)}</div></div>
          </div>
          <div className="mt-3 flex gap-2"><button onClick={handleUpdate} className="flex-1 bg-green-600 text-white py-2 rounded font-bold text-sm">Update Stock {Number(quick.stok||0)}+{quickStock||0}={Number(quick.stok||0)+Number(quickStock||0)} & Harga</button><button onClick={()=>setQuick(null)} className="px-4 py-2 bg-gray-200 rounded text-sm">Batal</button></div>
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
                    <thead className="bg-white text-xs"><tr><th className="text-left p-2">No Global</th><th className="text-left p-2">Kode Bahan FIX</th><th className="text-left p-2">Nama Bahan (klik cepat)</th><th className="text-left p-2">Kategori Utama</th><th className="text-left p-2">Stock</th><th className="text-left p-2">Harga Beli</th><th className="text-left p-2">Harga Baru</th><th className="text-left p-2">Selisih</th><th className="text-left p-2">Aksi</th></tr></thead>
                    <tbody>
                      {list.map(it=>(
                        <tr key={it.kode_bahan} className="border-t hover:bg-blue-50">
                          <td className="p-2 text-xs">{String(it._no).padStart(3,"0")}</td>
                          <td className="p-2 font-mono text-xs font-bold">{it.kode_bahan}</td>
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
