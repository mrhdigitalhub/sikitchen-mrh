"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchInventoryCompat } from "@/lib/inventoryCompat";

// INVENTORY V16.4 - HARGA Lama/Baru/Selisih + STOCK Awal/Tambah/Selisih/Ready - FLOW KATEGORI DULU
export default function InventoryPage(){
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [quick, setQuick] = useState(null);
  const [quickStockAwal, setQuickStockAwal] = useState(0);
  const [quickStockTambah, setQuickStockTambah] = useState("");
  const [quickStockSelisih, setQuickStockSelisih] = useState("");
  const [quickHargaLama, setQuickHargaLama] = useState(0);
  const [quickHargaBaru, setQuickHargaBaru] = useState("");
  const [quickMerek, setQuickMerek] = useState("");
  const [quickIdHalal, setQuickIdHalal] = useState("");
  const [quickPrefix, setQuickPrefix] = useState("");
  const [quickKodeKat, setQuickKodeKat] = useState("");
  const [expanded, setExpanded] = useState({});
  const [showTambah, setShowTambah] = useState(false);
  const [masterKode, setMasterKode] = useState([]);
  const [masterKategori, setMasterKategori] = useState([]);
  const [mapKodeKeUtama, setMapKodeKeUtama] = useState({});

  const [newKodeKat, setNewKodeKat] = useState("BERAS");
  const [newNama, setNewNama] = useState("");
  const [newStock, setNewStock] = useState("10");
  const [newHarga, setNewHarga] = useState("15000");
  const [newPrefix, setNewPrefix] = useState("");
  const [newMerek, setNewMerek] = useState("");
  const [newIdHalal, setNewIdHalal] = useState("");

  const normalizeKode = (kode) => { let k=(kode||"").toUpperCase(); if(k==="SAYURAN") k="SAYUR"; if(k==="HEWANI") k="DAGING"; return k; };

  const newKategoriUtama = mapKodeKeUtama[normalizeKode(newKodeKat)] || "Bahan Baku Utama";
  const numsForUtama = items.filter(i=> (i._utama||"")===newKategoriUtama).map(i=> parseInt((i._nomor||"0").toString().replace(/\D/g,""))||0);
  const maxNoUtama = numsForUtama.length ? Math.max(...numsForUtama) : 0;
  const nextNoForKode = maxNoUtama + 1;
  const baseKode = `${normalizeKode(newKodeKat)}-${String(nextNoForKode).padStart(3,"0")}`;
  const newKodeDisplay = newPrefix ? `${newPrefix}-${baseKode}` : baseKode;

  useEffect(()=>{ loadMasterAndData(); },[]);

  async function loadMasterAndData(){
    const { data: kodeData } = await supabase.from("master_kode_kategori").select("*").order("kode");
    const { data: katData } = await supabase.from("master_kategori_utama").select("*").order("urutan");
    let kodeList = kodeData; let katList = katData; let map = {};
    if(!kodeData || kodeData.length===0){
      kodeList = [{kode:"BERAS",kategori_utama:"Bahan Baku Utama"},{kode:"BOX",kategori_utama:"Bahan Kemasan"},{kode:"BERSIH",kategori_utama:"Bahan Pembersih"},{kode:"DAGING",kategori_utama:"Bahan Hewani"},{kode:"UMBI",kategori_utama:"Bahan Nabati"},{kode:"IKAN",kategori_utama:"Bahan Hewani Non Sembelihan"},{kode:"UDANG",kategori_utama:"Bahan Hewani Non Sembelihan"},{kode:"CUMI",kategori_utama:"Bahan Hewani Non Sembelihan"},{kode:"TELUR",kategori_utama:"Bahan Hewani Non Sembelihan"},{kode:"SUSU",kategori_utama:"Bahan Susu"},{kode:"FERMENTASI",kategori_utama:"Bahan Fermentasi Alami"},{kode:"MINYAK",kategori_utama:"Bahan Minyak dan Lemak"},{kode:"BUBUK",kategori_utama:"Bahan Bumbu Instan"},{kode:"SAYUR",kategori_utama:"Bahan Sayuran"},{kode:"BUAH",kategori_utama:"Bahan Buah Segar"},{kode:"PENYEDAP",kategori_utama:"Bahan Penyedap Rasa"},{kode:"REMPAH",kategori_utama:"Bahan Rempah Alami"},{kode:"KERUPUK",kategori_utama:"Bahan Pelengkap"},];
    }
    if(!katData || katData.length===0){
      katList = [{nama:"Bahan Baku Utama"},{nama:"Bahan Kemasan"},{nama:"Bahan Pembersih"},{nama:"Bahan Hewani"},{nama:"Bahan Nabati"},{nama:"Bahan Hewani Non Sembelihan"},{nama:"Bahan Susu"},{nama:"Bahan Fermentasi Alami"},{nama:"Bahan Minyak dan Lemak"},{nama:"Bahan Bumbu Instan"},{nama:"Bahan Sayuran"},{nama:"Bahan Buah Segar"},{nama:"Bahan Penyedap Rasa"},{nama:"Bahan Rempah Alami"},{nama:"Bahan Pelengkap"},];
    }
    kodeList.forEach(k=> { const nk = normalizeKode(k.kode); map[nk]=k.kategori_utama; map[k.kode]=k.kategori_utama; });
    setMasterKode(kodeList); setMasterKategori(katList); setMapKodeKeUtama(map);
    try{
      const { items: data } = await fetchInventoryCompat();
      const withNo = data.map((d,i)=> {
        let prefix = d.kode_prefix || "";
        let raw = (d.kode_bahan||d.kode||"").split("-");
        if(!prefix && raw.length>=3 && ["Hall","Orgk","HALL","ORGK"].includes(raw[0])) prefix = raw[0];
        let kodeFix = (d.kode_bahan||d.kode||"").split("-").filter(x=>!["Hall","Orgk","HALL","ORGK"].includes(x))[0] || "BERAS";
        if(prefix) kodeFix = (d.kode_bahan||d.kode||"").split("-")[1] || kodeFix;
        kodeFix = normalizeKode(kodeFix);
        const utama = map[kodeFix] || d.kategori || "Bahan Baku Utama";
        const nomor = (d.kode_bahan||d.kode||"").split("-").pop() || String(i+1).padStart(3,"0");
        const kodeTampil = prefix ? `${prefix}-${kodeFix}-${nomor}` : `${kodeFix}-${nomor}`;
        const namaFix = d.nama_bahan || d.name || "";
        const hargaLama = Number(d.harga_beli||d.harga||0);
        const hargaBaru = Number(d.harga_baru||d.harga_beli||hargaLama);
        const stockAwal = Number(d.stok_awal||d.stok||d.stock||0);
        // Ready stock = awal + tambah jika ada history, untuk sekarang = stok
        return {...d, _no: i+1, _kode_fix: kodeFix, _kode_tampil: kodeTampil, _prefix: prefix, _utama: utama, _nomor: nomor, _nama_fix: namaFix, _hargaLama: hargaLama, _hargaBaru: hargaBaru, _hargaSelisih: hargaBaru - hargaLama, _stockAwal: stockAwal, _stockTambah: Number(d.stock_tambah||0), _stockSelisih: Number(d.stock_selisih||0), _readyStock: Number(d.stok||d.stock||0)}
      });
      setItems(withNo);
      const exp = {}; katList.forEach(k=> exp[k.nama]=true); setExpanded(exp);
    }catch(e){ console.log(e); }
  }

  const filtered = items.filter(i=>{
    if(!search) return true;
    const s = search.toLowerCase();
    return i._kode_tampil.toLowerCase().includes(s) || (i._nama_fix||"").toLowerCase().includes(s) || (i.custom_value_1||"").toLowerCase().includes(s) || (i.id_halal_19||"").includes(s);
  });
  const grouped = filtered.reduce((acc,cur)=>{ const kat = cur._utama || "Bahan Baku Utama"; if(!acc[kat]) acc[kat]=[]; acc[kat].push(cur); return acc; },{});
  Object.keys(grouped).forEach(k=>{ grouped[k].sort((a,b)=>{ const na=parseInt((a._nomor||"0").toString().replace(/\D/g,""))||0; const nb=parseInt((b._nomor||"0").toString().replace(/\D/g,""))||0; return na-nb; }); });

  function handleClickNama(item){
    setQuick(item);
    setQuickStockAwal(Number(item.stok||item.stock||0));
    setQuickStockTambah("");
    setQuickStockSelisih("");
    setQuickHargaLama(Number(item.harga_beli||item.harga||0));
    setQuickHargaBaru(String(item.harga_baru||item.harga_beli||item.harga||0));
    setQuickMerek(item.custom_value_1 || "");
    setQuickIdHalal(item.id_halal_19 || "");
    setQuickPrefix(item.kode_prefix || item._prefix || "");
    setQuickKodeKat(normalizeKode(item._kode_fix || "DAGING"));
  }

  const calcReadyStock = Number(quickStockAwal||0) + Number(quickStockTambah||0) + Number(quickStockSelisih||0);
  const calcSelisihHarga = Number(quickHargaBaru||0) - Number(quickHargaLama||0);
  
  async function handleUpdate(){
    if(!quick) return;
    const kodeFixNorm = normalizeKode(quickKodeKat);
    const nomorTetap = quick._nomor;
    const kodeFinalBaru = quickPrefix ? `${quickPrefix}-${kodeFixNorm}-${nomorTetap}` : `${kodeFixNorm}-${nomorTetap}`;
    const kategoriUtamaBaru = mapKodeKeUtama[kodeFixNorm] || quick._utama || "Bahan Baku Utama";
    const readyFinal = calcReadyStock;
    const hargaBaruFinal = Number(quickHargaBaru||0);
    const payload = {
      kode_bahan: kodeFinalBaru,
      name: quick._nama_fix,
      nama_bahan: quick._nama_fix,
      kategori: kategoriUtamaBaru,
      stok: readyFinal,
      harga_beli: hargaBaruFinal,
      harga_baru: hargaBaruFinal,
      id_halal_19: quickPrefix==="Orgk" ? "" : (quickIdHalal || ""),
      custom_value_1: quickMerek || "",
      kode_prefix: quickPrefix || "",
    };
    const { error } = await supabase.from("inventory_items").update(payload).eq("id", quick.id);
    if(error){ alert("Gagal Bos: "+error.message); return; }
    alert(`Berhasil Bos: ${quick._kode_tampil} JADI ${kodeFinalBaru} | Stock ${quickStockAwal} + ${quickStockTambah||0} + (${quickStockSelisih||0}) = ${readyFinal} | Harga ${quickHargaLama} → ${hargaBaruFinal} Selisih ${calcSelisihHarga}`);
    setQuick(null); loadMasterAndData();
  }

  async function handleDelete(item){
    if(!confirm(`Hapus ${item._nama_fix}?`)) return;
    const { error } = await supabase.from("inventory_items").delete().eq("id", item.id);
    if(error){ alert(error.message); return; }
    loadMasterAndData();
  }

  async function handleSimpanTambah(){
    if(!newNama) return alert("Nama kosong Bos");
    const { error } = await supabase.from("inventory_items").insert([{
      kode_bahan: newKodeDisplay,
      name: newNama,
      nama_bahan: newNama,
      kategori: newKategoriUtama,
      stok: Number(newStock||0),
      harga_beli: Number(newHarga||0),
      harga_baru: Number(newHarga||0),
      id_halal_19: newPrefix==="Orgk" ? "" : (newIdHalal||""),
      custom_value_1: newMerek||"",
      kode_prefix: newPrefix||"",
    }]);
    if(error){ alert(error.message); return; }
    setShowTambah(false); setNewNama(""); loadMasterAndData();
  }

  function getKodeFinalBaruGeneral(){
    if(!quick) return "";
    const kodeFixNorm = normalizeKode(quickKodeKat);
    const nomorTetap = quick._nomor;
    return quickPrefix ? `${quickPrefix}-${kodeFixNorm}-${nomorTetap}` : `${kodeFixNorm}-${nomorTetap}`;
  }

  return (
    <div className="p-2 bg-gray-100 min-h-screen">
      <div className="flex gap-2 mb-2 flex-wrap">
        <button onClick={()=>setShowTambah(true)} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold">+ Tambah General (Next: {newKodeDisplay})</button>
        <button onClick={()=>{const e={}; masterKategori.forEach(k=>e[k.nama]=true); setExpanded(e);}} className="bg-gray-200 px-3 py-1 rounded text-xs">Buka Semua</button>
        <button onClick={()=>{const e={}; masterKategori.forEach(k=>e[k.nama]=false); setExpanded(e);}} className="bg-gray-200 px-3 py-1 rounded text-xs">Tutup Semua</button>
        <button onClick={loadMasterAndData} className="bg-blue-600 text-white px-3 py-1 rounded text-xs">↻ Refresh</button>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari kode / nama / Merek / id_halal_19..." className="w-full p-2 border rounded mb-2 text-sm" />

      {showTambah && (
        <div className="bg-white border-2 border-green-400 p-4 rounded-xl my-3 shadow-lg">
          <div className="font-bold text-sm">Tambah Bahan Baru - V16.4 Harga & Stock History</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div><div className="text-xs font-bold">Nama Bahan</div><input value={newNama} onChange={e=>setNewNama(e.target.value)} className="w-full p-2 border rounded text-sm" /></div>
            <div className="bg-blue-50 border-2 border-blue-500 p-2 rounded"><div className="text-xs font-bold">1️⃣ Kode Kategori - FLOW BENAR</div>
              <select value={newKodeKat} onChange={e=>setNewKodeKat(e.target.value)} className="w-full p-2 border rounded text-sm font-bold bg-white mt-1">
                {masterKode.map(k=> <option key={k.kode} value={normalizeKode(k.kode)}>{normalizeKode(k.kode)} - {k.kategori_utama}</option>)}
              </select>
            </div>
            <div><div className="text-xs font-bold">2️⃣ Prefix Hall/Orgk</div><select value={newPrefix} onChange={e=>setNewPrefix(e.target.value)} className="w-full p-2 border-2 border-green-500 rounded text-sm font-bold"><option value="">Biasa</option><option value="Hall">Hall-</option><option value="Orgk">Orgk-</option></select></div>
            <div><div className="text-xs">Kode Final</div><input value={newKodeDisplay} disabled className="w-full p-2 border-2 border-green-500 rounded text-sm font-mono font-bold bg-green-100" /></div>
            <div><div className="text-xs font-bold">Merek</div><input value={newMerek} onChange={e=>setNewMerek(e.target.value)} className="w-full p-2 border rounded text-sm" /></div>
            <div><div className="text-xs font-bold">id_halal_19</div><input value={newIdHalal} onChange={e=>setNewIdHalal(e.target.value)} placeholder="19 digit" className="w-full p-2 border rounded text-sm" maxLength={19} /></div>
          </div>
          <div className="mt-3 flex gap-2"><button onClick={handleSimpanTambah} className="flex-1 bg-green-600 text-white py-3 rounded font-bold text-sm">Simpan - {newKodeDisplay}</button><button onClick={()=>setShowTambah(false)} className="px-6 py-3 bg-gray-200 rounded text-sm">Batal</button></div>
        </div>
      )}

      {quick && (
        <div className="bg-green-50 border-2 border-green-400 p-4 rounded-xl my-3 shadow-lg border-dashed">
          <div className="font-bold text-green-800 text-sm">🛠️ V16.4 EDIT GENERAL: Harga Lama/Baru/Selisih + Stock Awal/Tambah/Selisih/Ready - FLOW TETAP KATEGORI DULU</div>
          <div className="bg-yellow-100 border border-yellow-400 p-2 rounded text-xs mt-2">Flow: Nama → 1️⃣ Kategori → 2️⃣ Prefix → Kode Final = Prefix + Kategori + Nomor Tetap {quick._nomor}. Stock Ready = Awal + Tambah + Selisih Opname. Harga Selisih = Baru - Lama.</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div><div className="text-xs font-bold">Nama Bahan</div><input value={quick._nama_fix} disabled className="w-full p-2 border rounded bg-gray-100 text-sm" /></div>
            <div className="bg-blue-50 border-2 border-blue-500 p-2 rounded"><div className="text-xs font-bold">1️⃣ Kode Kategori - PILIH DULU</div>
              <select value={quickKodeKat} onChange={e=>setQuickKodeKat(e.target.value)} className="w-full p-2 border-2 border-blue-600 rounded text-sm font-bold bg-white mt-1">
                {masterKode.map(k=> <option key={k.kode} value={normalizeKode(k.kode)}>{normalizeKode(k.kode)} - {k.kategori_utama}</option>)}
              </select>
            </div>
            <div><div className="text-xs font-bold">2️⃣ Prefix Hall/Orgk</div><select value={quickPrefix} onChange={e=>setQuickPrefix(e.target.value)} className="w-full p-2 border-2 border-green-500 rounded text-sm font-bold"><option value="">Biasa</option><option value="Hall">Hall-</option><option value="Orgk">Orgk-</option></select></div>
            <div><div className="text-xs">3️⃣ Kode Final Baru (Nomor Tetap {quick._nomor})</div><input value={getKodeFinalBaruGeneral()} disabled className="w-full p-2 border-2 border-green-500 rounded text-sm font-mono font-bold bg-green-100 text-green-800" /></div>
            <div className="bg-purple-50 border-2 border-purple-400 p-2 rounded"><div className="text-xs font-bold">Merek</div><input value={quickMerek} onChange={e=>setQuickMerek(e.target.value)} className="w-full p-2 border-2 border-purple-500 rounded text-sm font-bold mt-1" /></div>
            <div className="bg-yellow-50 border-2 border-yellow-500 p-2 rounded"><div className="text-xs font-bold">id_halal_19</div><input value={quickIdHalal} onChange={e=>setQuickIdHalal(e.target.value)} placeholder="Auto kosong Orgk" className="w-full p-2 border-2 border-yellow-500 rounded text-sm font-bold mt-1" maxLength={19} /></div>
          </div>

          {/* STOCK HISTORY */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 bg-blue-50 border-2 border-blue-400 p-3 rounded-xl">
            <div className="col-span-4 font-bold text-xs text-blue-800">📦 STOCK HISTORY - Awal + Tambah + Selisih = Ready</div>
            <div><div className="text-xs font-bold">Stock Awal (Read-only)</div><input value={quickStockAwal} disabled className="w-full p-2 border rounded bg-gray-100 text-sm font-bold" /></div>
            <div><div className="text-xs font-bold">Stock Tambah (Beli)</div><input type="number" value={quickStockTambah} onChange={e=>setQuickStockTambah(e.target.value)} placeholder="+5" className="w-full p-2 border-2 border-blue-500 rounded text-sm font-bold" /></div>
            <div><div className="text-xs font-bold">Selisih Opname (+/-)</div><input type="number" value={quickStockSelisih} onChange={e=>setQuickStockSelisih(e.target.value)} placeholder="-2 susut" className="w-full p-2 border-2 border-orange-400 rounded text-sm font-bold" /></div>
            <div className="bg-green-100 border-2 border-green-600 p-2 rounded"><div className="text-xs font-bold">Ready Stock = Awal+Tambah+Selisih</div><input value={calcReadyStock} disabled className="w-full p-2 border-2 border-green-600 rounded text-sm font-bold bg-green-200 text-green-800 mt-1" /></div>
          </div>

          {/* HARGA HISTORY */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 bg-yellow-50 border-2 border-yellow-400 p-3 rounded-xl">
            <div className="col-span-3 font-bold text-xs text-yellow-800">💰 HARGA HISTORY - Untuk HPP - Lama → Baru = Selisih</div>
            <div><div className="text-xs font-bold">Harga Lama (Read-only)</div><input value={quickHargaLama} disabled className="w-full p-2 border rounded bg-gray-100 text-sm font-bold" /></div>
            <div><div className="text-xs font-bold">Harga Baru (Input)</div><input type="number" value={quickHargaBaru} onChange={e=>setQuickHargaBaru(e.target.value)} placeholder="16000" className="w-full p-2 border-2 border-yellow-600 rounded text-sm font-bold" /></div>
            <div className={`p-2 rounded border-2 ${calcSelisihHarga>0 ? 'bg-red-100 border-red-500' : calcSelisihHarga<0 ? 'bg-green-100 border-green-500' : 'bg-gray-100 border-gray-300'}`}><div className="text-xs font-bold">Selisih = Baru - Lama</div><input value={`${calcSelisihHarga>0?'+':''}${calcSelisihHarga} (${quickHargaLama? ((calcSelisihHarga/quickHargaLama)*100).toFixed(1):0}%)`} disabled className="w-full p-2 rounded text-sm font-bold bg-white mt-1" /></div>
          </div>

          <div className="mt-4 flex gap-2"><button onClick={handleUpdate} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded font-bold text-sm">💾 Update V16.4 - {quick._kode_tampil} JADI {getKodeFinalBaruGeneral()} | Ready {calcReadyStock} | Harga Baru {quickHargaBaru}</button><button onClick={()=>handleDelete(quick)} className="px-4 py-3 bg-red-600 text-white rounded text-sm font-bold">🗑️</button><button onClick={()=>setQuick(null)} className="px-4 py-3 bg-gray-200 rounded text-sm">Batal</button></div>
        </div>
      )}

      <div className="bg-white rounded-b-xl border overflow-auto">
        {masterKategori.map((katObj,i)=>{
          const kat = katObj.nama; const list = grouped[kat] || []; const isOpen = expanded[kat]!==false;
          if(list.length===0) return null;
          return (
            <div key={kat} className="border-b last:border-0">
              <div className="p-3 font-bold text-sm flex justify-between items-center bg-slate-50"><div className="cursor-pointer flex-1" onClick={()=>setExpanded(prev=>({...prev, [kat]: !isOpen}))}>{i+1} &nbsp; {kat} - {list.length} bahan {isOpen?"▼":"▶"}</div><button onClick={()=>setExpanded(prev=>({...prev, [kat]: !isOpen}))} className="text-xs bg-white border px-2 py-1 rounded">{isOpen?"Tutup":"Buka"}</button></div>
              {isOpen && (<div className="overflow-auto"><table className="w-full text-[11px]"><thead className="bg-white text-[10px]"><tr><th className="text-left p-2">No</th><th className="text-left p-2">Kode</th><th className="text-left p-2">Nama</th><th className="text-left p-2">Merek</th><th className="text-left p-2">id_halal_19</th><th className="text-center p-2 bg-blue-50">Stock Awal</th><th className="text-center p-2 bg-blue-100">Tambah</th><th className="text-center p-2 bg-orange-50">Selisih</th><th className="text-center p-2 bg-green-100">Ready</th><th className="text-right p-2 bg-yellow-50">Harga Lama</th><th className="text-right p-2 bg-yellow-100">Harga Baru</th><th className="text-right p-2 bg-red-50">Selisih Harga</th><th className="text-left p-2">Aksi</th></tr></thead><tbody>{list.map((it, idx)=>(<tr key={it.id || it.kode_bahan || it.kode} className="border-t hover:bg-blue-50"><td className="p-2">{String(idx+1).padStart(3,"0")}</td><td className="p-2 font-mono font-bold">{it._kode_tampil}</td><td className="p-2 font-semibold cursor-pointer" onClick={()=>handleClickNama(it)}>{it._nama_fix} <span className="text-[10px] text-blue-600">↗</span></td><td className="p-2 bg-purple-50 font-bold">{it.custom_value_1 || "-"}</td><td className="p-2 font-mono bg-yellow-50">{it.id_halal_19 || "-"}</td><td className="p-2 text-center bg-blue-50">{it._stockAwal}</td><td className="p-2 text-center bg-blue-100 font-bold">{it._stockTambah||0}</td><td className="p-2 text-center bg-orange-50">{it._stockSelisih||0}</td><td className="p-2 text-center bg-green-100 font-bold"><span className="bg-green-200 px-2 py-1 rounded-full">{it._readyStock}</span></td><td className="p-2 text-right bg-yellow-50">Rp {Number(it._hargaLama).toLocaleString("id-ID")}</td><td className="p-2 text-right bg-yellow-100 font-bold">Rp {Number(it._hargaBaru).toLocaleString("id-ID")}</td><td className={`p-2 text-right font-bold ${it._hargaSelisih>0 ? 'bg-red-50 text-red-600' : it._hargaSelisih<0 ? 'bg-green-50 text-green-600' : 'bg-gray-50'}`}>{it._hargaSelisih>0?'+':''}{it._hargaSelisih!==0? `Rp ${Number(it._hargaSelisih).toLocaleString("id-ID")}`:'-'} </td><td className="p-2 flex gap-1"><button onClick={()=>handleClickNama(it)} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold">Edit Kode</button><button onClick={()=>handleDelete(it)} className="bg-red-100 text-red-600 px-2 py-1 rounded text-[10px] font-bold">🗑️</button></td></tr>))}</tbody></table></div>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
