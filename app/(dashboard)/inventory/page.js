"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchInventoryCompat } from "@/lib/inventoryCompat";

// EXCEL FIXED - 18 KODE SAJA
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
        let raw = (d.kode_bahan||"").split("-")[0].toUpperCase().trim();
        let kodeFix = raw;
        const namaLower = (d.nama_bahan||"").toLowerCase();

        // FIX SEMUA KODE SALAH - LOGIC TETAP TAPI TIDAK DITAMPILKAN MERAH
        if(raw==="HNS" || raw==="H" || raw==="HEWANI" || raw==="HEWAN" || raw==="NABATI" || raw==="NAB" || raw==="BUMBU" || raw==="SAYUR" || ["SAUS","LAUK","LAIN","KEMASAN","AYAM","KEJU"].includes(raw)){
          if(namaLower.includes("ikan")) kodeFix="IKAN";
          else if(namaLower.includes("udang") || namaLower.includes("kepiting") || namaLower.includes("kerang")) kodeFix="UDANG";
          else if(namaLower.includes("cumi") || namaLower.includes("sotong")) kodeFix="CUMI";
          else if(namaLower.includes("telur") || namaLower.includes("sosis") || namaLower.includes("nugget") || namaLower.includes("bakso") || namaLower.includes("kornet")) kodeFix="TELUR";
          else if(namaLower.includes("bayam") || namaLower.includes("kangkung") || namaLower.includes("sawi") || namaLower.includes("wortel") || namaLower.includes("kol") || namaLower.includes("tomat")) kodeFix="SAYURAN";
          else if(namaLower.includes("tahu") || namaLower.includes("tempe") || namaLower.includes("oncom") || namaLower.includes("kacang")) kodeFix="UMBI";
          else if(namaLower.includes("kaldu")) kodeFix="BUBUK";
          else {
            if(raw==="HEWANI" || raw==="HEWAN" || raw==="DAGING") kodeFix="DAGING";
            else if(raw==="NABATI" || raw==="NAB") kodeFix="UMBI";
            else if(raw==="BUMBU" || raw==="BUBU") kodeFix="BUBUK";
            else if(raw==="SAYUR") kodeFix="SAYURAN";
            else if(raw==="HNS" || raw==="H") kodeFix="IKAN";
            else if(raw==="SAUS") kodeFix="PENYEDAP";
            else if(raw==="LAUK") kodeFix="DAGING";
            else if(raw==="LAIN") kodeFix="KERUPUK";
            else if(raw==="KEMASAN") kodeFix="BOX";
            else if(raw==="AYAM") kodeFix="DAGING";
            else if(raw==="KEJU") kodeFix="SUSU";
          }
        }

        const utama = MAP_KODE_KE_UTAMA[kodeFix] || "Bahan Baku Utama";
        const nomor = d.kode_bahan.split("-")[1] || String(i+1).padStart(3,"0");
        // CLEAN CODE - HANYA KODE FIX, TIDAK ADA (RAW→FIX) MERAH LAGI
        const kodeTampil = `${kodeFix}-${nomor}`;

        return {...d, _no: i+1, _kode_fix: kodeFix, _kode_tampil: kodeTampil, _utama: utama, selisih: Number(d.harga_baru||d.harga_beli||0) - Number(d.harga_beli||0)}
      });
      setItems(withNo);
      const exp = {}; KATEGORI_UTAMA_15.forEach(k=> exp[k]=true); setExpanded(exp);
    }catch(e){ console.log(e); }
    setLoading(false);
  }

  const filtered = items.filter(i=>{
    if(!search) return true;
    const s = search.toLowerCase();
    return i._kode_tampil.toLowerCase().includes(s) || i.nama_bahan.toLowerCase().includes(s);
  });
  const grouped = filtered.reduce((acc,cur)=>{
    const kat = cur._utama || "Bahan Baku Utama";
    if(!acc[kat]) acc[kat]=[];
    acc[kat].push(cur);
    return acc;
  },{});

  function handleClickNama(item){ setQuick(item); setQuickStock(""); setQuickHarga(String(item.harga_beli||0)); }
  
  async function handleUpdate(){
    if(!quick) return;
    const tambah = Number(quickStock||0);
    const stockLama = Number(quick.stok||quick.stock||0);
    const stockBaruTotal = stockLama + tambah;
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

  async function handleDelete(item){
    if(!confirm(`Hapus ${item._kode_tampil} - ${item.nama_bahan} ?`)) return;
    const { error } = await supabase.from("inventory_items").delete().eq("kode_bahan", item.kode_bahan);
    if(error){ alert("Gagal hapus: "+error.message); return; }
    alert(`Berhasil hapus ${item._kode_tampil} 🗑️`);
    setItems(items.filter(it=> it.kode_bahan!==item.kode_bahan));
    if(quick && quick.kode_bahan===item.kode_bahan) setQuick(null);
  }

  function handleBukaSemua(){ const exp = {}; Object.keys(grouped).forEach(k=> exp[k]=true); setExpanded(exp); }
  function handleTutupSemua(){ const exp = {}; Object.keys(grouped).forEach(k=> exp[k]=false); setExpanded(exp); }
  async function handleRefresh(){ setLoading(true); await loadData(); setShowTambah(false); setQuick(null); }
  function handleTambahBahan(){
    if(showTambah){ setShowTambah(false); }else{ setNewKodeKat("BERAS"); setNewNama(""); setNewStock("10"); setNewHarga("15000"); setShowTambah(true); }
  }
  async function handleSimpanTambah(){
    if(!newNama){ alert("Nama wajib"); return; }
    const existing = items.find(i=> i._kode_tampil===newKode);
    const tambahStock = Number(newStock)||0;
    const hargaBaruInput = Number(newHarga)||0;
    if(existing){
      const stockLama = Number(existing.stok||existing.stock||0);
      const hargaLama = Number(existing.harga_beli||0);
      const stockBaruTotal = stockLama + tambahStock;
      const selisihBaru = hargaBaruInput - hargaLama;
      const { error } = await supabase.from("inventory_items").update({
        nama_bahan: newNama.trim(), kategori: newKategoriUtama, stok: stockBaruTotal, stock: stockBaruTotal, harga_beli: hargaBaruInput, harga_baru: hargaBaruInput, selisih: selisihBaru
      }).eq("kode_bahan", existing.kode_bahan);
      if(error){ alert("Gagal: "+error.message); return; }
      alert(`Update: ${newKode} ${stockLama}+${tambahStock}=${stockBaruTotal}`);
    } else {
      const payload = { kode_bahan: newKode, nama_bahan: newNama.trim(), kategori: newKategoriUtama, stok: tambahStock, stock: tambahStock, harga_beli: hargaBaruInput, harga_baru: hargaBaruInput, selisih: 0, satuan: "Kg" };
      const { error } = await supabase.from("inventory_items").insert(payload);
      if(error){ alert("Gagal: "+error.message); return; }
      alert(`Berhasil tambah baru ${newKode} - ${newKategoriUtama}`);
    }
    setShowTambah(false); setNewNama(""); await loadData();
  }

  return (
    <div className="p-4 bg-[#f5f7fb] min-h-screen">
      <div className="bg-slate-900 text-white p-4 rounded-t-xl">
        <div className="text-lg font-bold">Master Bahan Sikitchen - V12.9 FIX Hapus Tulisan Merah Bekas</div>
        <div className="text-xs text-slate-300">Live: {items.length} bahan • FIX: Hapus (BUMBU-DAGING) merah, (HEWANI-DAGING) merah, (NABATI-UMBI) merah - Sekarang bersih hanya DAGING-008, UMBI-001 • Bayam → SAYURAN-011 FIX • 18 Kode Excel Asli • No Global tetap</div>
        <div className="mt-3 flex gap-2 flex-wrap">
          <button onClick={handleTambahBahan} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm font-bold border-2 border-white">+ Tambah Bahan General (Next: {newKode})</button>
          <button onClick={handleBukaSemua} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded text-sm">Buka Semua</button>
          <button onClick={handleTutupSemua} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded text-sm">Tutup Semua</button>
          <button onClick={handleRefresh} className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm border border-white">↻ Refresh</button>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari kode / nama... (18 Kode bersih tanpa merah)" className="mt-3 w-full p-2 rounded text-black text-sm" />
      </div>

      {showTambah && (
        <div className="bg-white border-2 border-green-500 p-4 rounded-xl my-3 shadow">
          <div className="font-bold text-sm mb-2 text-green-700">✅ FIX V12.9 - Dashboard Bersih Tanpa Tulisan Merah Bekas</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 bg-yellow-50 border-2 border-yellow-400 p-3 rounded">
              <div className="text-xs font-bold">Kode Kategori Excel (18) - Bersih</div>
              <select value={newKodeKat} onChange={e=> setNewKodeKat(e.target.value)} className="w-full p-3 border-2 border-blue-500 rounded text-sm font-bold mt-1">
                {KODE_KATEGORI_18.map(k=>{
                  const count = items.filter(i=>i._kode_fix===k).length+1;
                  return <option key={k} value={k}>{k} - {MAP_KODE_KE_UTAMA[k]} - Next {k}-{String(count).padStart(3,"0")}</option>
                })}
              </select>
            </div>
            <div className="bg-blue-50 border-2 border-blue-400 p-3 rounded">
              <div className="text-xs font-bold">Kode Bahan Auto Bersih (Tanpa Merah)</div>
              <input value={newKode} disabled className="w-full p-3 border-2 border-green-500 rounded text-sm font-mono font-bold bg-green-50 mt-1" />
            </div>
            <div className="bg-white border-2 border-green-300 p-2 rounded"><div className="text-xs font-semibold">Nama Bahan *</div><input value={newNama} onChange={e=>setNewNama(e.target.value)} placeholder="Ex: Tahu Putih, Bebek, Ikan Tuna" className="w-full p-2 border-2 border-green-400 rounded text-sm mt-1" /></div>
            <div className="bg-blue-50 border-2 border-blue-400 p-2 rounded"><div className="text-xs font-semibold">Stock Awal (10+5=15)</div><input type="number" value={newStock} onChange={e=>setNewStock(e.target.value)} className="w-full p-2 border rounded text-sm font-bold mt-1" /></div>
            <div className="bg-yellow-50 border-2 border-yellow-400 p-2 rounded"><div className="text-xs font-semibold">Harga Beli</div><input type="number" value={newHarga} onChange={e=>setNewHarga(e.target.value)} className="w-full p-2 border rounded text-sm font-bold bg-yellow-50 mt-1" /></div>
          </div>
          <div className="mt-3 flex gap-2"><button onClick={handleSimpanTambah} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded font-bold text-sm">Simpan - {newKode} - {newKategoriUtama} - Bersih Tanpa Merah</button><button onClick={()=>setShowTambah(false)} className="px-6 py-3 bg-gray-200 rounded text-sm">Batal</button></div>
        </div>
      )}

      {quick && (
        <div className="bg-green-50 border-2 border-green-200 p-4 rounded-xl my-3">
          <div className="font-bold text-green-800 text-sm">🛠️ Update Cepat: {quick._kode_tampil} - {quick._utama}</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-2">
            <div><div className="text-xs">Nama</div><input value={quick.nama_bahan} disabled className="w-full p-2 border rounded bg-white text-sm" /></div>
            <div><div className="text-xs">Kode FIX Bersih</div><input value={quick._kode_fix} disabled className="w-full p-2 border rounded bg-white text-sm font-bold" /></div>
            <div><div className="text-xs">Stock Tambah</div><input type="number" value={quickStock} onChange={e=>setQuickStock(e.target.value)} className="w-full p-2 border-2 border-blue-400 rounded text-sm" /></div>
            <div><div className="text-xs">Harga Baru</div><input type="number" value={quickHarga} onChange={e=>setQuickHarga(e.target.value)} className="w-full p-2 border-2 border-yellow-400 rounded text-sm bg-yellow-50" /></div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleUpdate} className="flex-1 bg-green-600 text-white py-2 rounded font-bold text-sm">Update</button>
            <button onClick={()=>handleDelete(quick)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-bold">🗑️ Delete</button>
            <button onClick={()=>setQuick(null)} className="px-4 py-2 bg-gray-200 rounded text-sm">Batal</button>
          </div>
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
                    <thead className="bg-white text-xs"><tr><th className="text-left p-2">No Global</th><th className="text-left p-2">Kode Bahan FIX Bersih (Tanpa Merah)</th><th className="text-left p-2">Nama Bahan</th><th className="text-left p-2">Kategori Utama</th><th className="text-left p-2">Stock</th><th className="text-left p-2">Harga</th><th className="text-left p-2">Aksi</th></tr></thead>
                    <tbody>
                      {list.map(it=>(
                        <tr key={it.kode_bahan} className="border-t hover:bg-blue-50">
                          <td className="p-2 text-xs">{String(it._no).padStart(3,"0")}</td>
                          <td className="p-2 font-mono text-xs font-bold">{it._kode_tampil}</td>
                          <td className="p-2 font-semibold cursor-pointer" onClick={()=>handleClickNama(it)}>{it.nama_bahan} <span className="text-[10px] text-blue-600">↗ klik</span></td>
                          <td className="p-2 text-[11px]">{it._utama}</td>
                          <td className="p-2"><span className="bg-blue-100 px-2 py-1 rounded-full text-xs">{it.stok}</span></td>
                          <td className="p-2 text-xs">Rp {Number(it.harga_beli||0).toLocaleString("id-ID")}</td>
                          <td className="p-2 flex gap-1">
                            <button onClick={()=>handleClickNama(it)} className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs font-bold">Edit</button>
                            <button onClick={()=>handleDelete(it)} className="bg-red-100 hover:bg-red-200 text-red-600 px-2 py-1 rounded text-xs font-bold">🗑️ Delete</button>
                          </td>
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
