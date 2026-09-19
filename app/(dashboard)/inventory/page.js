"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchInventoryCompat } from "@/lib/inventoryCompat";

// INVENTORY V16.2 - FIX GENERAL + FLOW KATEGORI DULU BARU PREFIX - Table inventory_items
export default function InventoryPage(){
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [quick, setQuick] = useState(null);
  const [quickStock, setQuickStock] = useState("");
  const [quickHarga, setQuickHarga] = useState("");
  const [quickMerek, setQuickMerek] = useState("");
  const [quickIdHalal, setQuickIdHalal] = useState("");
  const [quickPrefix, setQuickPrefix] = useState("");
  const [quickKodeKat, setQuickKodeKat] = useState("");
  const [quickKodeLama, setQuickKodeLama] = useState("");
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
  const [newKodeLama, setNewKodeLama] = useState("");
  const [newIdHalal, setNewIdHalal] = useState("");
  const [newMerek, setNewMerek] = useState("");

  const normalizeKode = (kode) => {
    let k = (kode||"").toUpperCase();
    if(k==="SAYURAN") k="SAYUR";
    if(k==="HEWANI") k="DAGING";
    return k;
  };

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
        return {...d, _no: i+1, _kode_fix: kodeFix, _kode_tampil: kodeTampil, _prefix: prefix, _utama: utama, _nomor: nomor, _nama_fix: namaFix}
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
    setQuick(item); setQuickStock(""); setQuickHarga(String(item.harga_beli||item.harga||0));
    setQuickMerek(item.custom_value_1 || ""); setQuickIdHalal(item.id_halal_19 || "");
    setQuickPrefix(item.kode_prefix || item._prefix || ""); 
    setQuickKodeKat(normalizeKode(item._kode_fix || "DAGING"));
    setQuickKodeLama(item.kode_lama || "");
  }
  
  async function handleUpdate(){
    if(!quick) return;
    const tambah = Number(quickStock||0); const stockLama = Number(quick.stok||quick.stock||0);
    const stockBaruTotal = tambah ? stockLama + tambah : stockLama;
    const kodeFixNorm = normalizeKode(quickKodeKat);
    const nomorTetap = quick._nomor;
    const kodeFinalBaru = quickPrefix ? `${quickPrefix}-${kodeFixNorm}-${nomorTetap}` : `${kodeFixNorm}-${nomorTetap}`;
    const kategoriUtamaBaru = mapKodeKeUtama[kodeFixNorm] || quick._utama || "Bahan Baku Utama";
    const payload = {
      kode_bahan: kodeFinalBaru,
      name: quick._nama_fix,
      nama_bahan: quick._nama_fix,
      kategori: kategoriUtamaBaru,
      stok: stockBaruTotal,
      harga_beli: Number(quickHarga||0),
      id_halal_19: quickPrefix==="Orgk" ? "" : (quickIdHalal || ""),
      custom_value_1: quickMerek || "",
      kode_prefix: quickPrefix || "",
    };
    const { error } = await supabase.from("inventory_items").update(payload).eq("id", quick.id);
    if(error){ alert("Gagal Bos: "+error.message); return; }
    alert(`Berhasil Bos: ${quick._kode_tampil} JADI ${kodeFinalBaru}`);
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
      <div className="flex gap-2 mb-2">
        <button onClick={()=>setShowTambah(true)} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold">+ Tambah General (Next: {newKodeDisplay})</button>
        <button onClick={()=>{const e={}; masterKategori.forEach(k=>e[k.nama]=true); setExpanded(e);}} className="bg-gray-200 px-3 py-1 rounded text-xs">Buka Semua</button>
        <button onClick={()=>{const e={}; masterKategori.forEach(k=>e[k.nama]=false); setExpanded(e);}} className="bg-gray-200 px-3 py-1 rounded text-xs">Tutup Semua</button>
        <button onClick={loadMasterAndData} className="bg-blue-600 text-white px-3 py-1 rounded text-xs">↻ Refresh</button>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari kode / nama / Merek / id_halal_19..." className="w-full p-2 border rounded mb-2 text-sm" />

      {showTambah && (
        <div className="bg-white border-2 border-green-400 p-4 rounded-xl my-3 shadow-lg">
          <div className="font-bold text-sm">Tambah Bahan Baru - V16.2 FLOW BENAR</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div><div className="text-xs font-bold">Nama Bahan</div><input value={newNama} onChange={e=>setNewNama(e.target.value)} className="w-full p-2 border rounded text-sm" /></div>
            {/* FLOW BENAR: KATEGORI DULU */}
            <div className="bg-blue-50 border-2 border-blue-500 p-2 rounded"><div className="text-xs font-bold">1️⃣ Kode Kategori - PILIH DULU</div>
              <select value={newKodeKat} onChange={e=>setNewKodeKat(e.target.value)} className="w-full p-2 border rounded text-sm font-bold bg-white mt-1">
                {masterKode.map(k=> <option key={k.kode} value={normalizeKode(k.kode)}>{normalizeKode(k.kode)} - {k.kategori_utama}</option>)}
              </select>
            </div>
            {/* BARU PREFIX */}
            <div><div className="text-xs font-bold">2️⃣ Prefix Hall/Orgk</div><select value={newPrefix} onChange={e=>setNewPrefix(e.target.value)} className="w-full p-2 border-2 border-green-500 rounded text-sm font-bold"><option value="">Biasa</option><option value="Hall">Hall-</option><option value="Orgk">Orgk-</option></select></div>
            <div><div className="text-xs">Kode Final</div><input value={newKodeDisplay} disabled className="w-full p-2 border-2 border-green-500 rounded text-sm font-mono font-bold bg-green-100" /></div>
            <div><div className="text-xs font-bold">Merek</div><input value={newMerek} onChange={e=>setNewMerek(e.target.value)} className="w-full p-2 border rounded text-sm" /></div>
            <div><div className="text-xs font-bold">id_halal_19</div><input value={newIdHalal} onChange={e=>setNewIdHalal(e.target.value)} placeholder="19 digit / kosong" className="w-full p-2 border rounded text-sm" maxLength={19} /></div>
          </div>
          <div className="mt-3 flex gap-2"><button onClick={handleSimpanTambah} className="flex-1 bg-green-600 text-white py-3 rounded font-bold text-sm">Simpan - {newKodeDisplay}</button><button onClick={()=>setShowTambah(false)} className="px-6 py-3 bg-gray-200 rounded text-sm">Batal</button></div>
        </div>
      )}

      {quick && (
        <div className="bg-green-50 border-2 border-green-400 p-4 rounded-xl my-3 shadow-lg border-dashed">
          <div className="font-bold text-green-800 text-sm">🛠️ V16.2 FLOW BENAR: KATEGORI DULU BARU PREFIX - GENERAL NOMOR TETAP</div>
          <div className="bg-yellow-100 border border-yellow-400 p-2 rounded text-xs mt-2">Flow: Nama → 1️⃣ Kategori (SAYUR/BERAS) → 2️⃣ Prefix Hall/Orgk → Kode Final = Prefix + Kategori + Nomor Tetap {quick._nomor}. Anti duplicate.</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div><div className="text-xs font-bold">Nama Bahan</div><input value={quick._nama_fix} disabled className="w-full p-2 border rounded bg-gray-100 text-sm" /></div>
            {/* SWAP: KATEGORI DI POSISI PREFIX TADI */}
            <div className="bg-blue-50 border-2 border-blue-500 p-2 rounded"><div className="text-xs font-bold">1️⃣ Kode Kategori - PILIH DULU (FLOW BENAR)</div>
              <select value={quickKodeKat} onChange={e=>setQuickKodeKat(e.target.value)} className="w-full p-2 border-2 border-blue-600 rounded text-sm font-bold bg-white mt-1">
                {masterKode.map(k=> <option key={k.kode} value={normalizeKode(k.kode)}>{normalizeKode(k.kode)} - {k.kategori_utama}</option>)}
              </select>
            </div>
            {/* PREFIX PINDAH KE KANAN */}
            <div><div className="text-xs font-bold">2️⃣ Prefix Hall/Orgk (Biasa di-delete)</div><select value={quickPrefix} onChange={e=>setQuickPrefix(e.target.value)} className="w-full p-2 border-2 border-green-500 rounded text-sm font-bold"><option value="">Biasa</option><option value="Hall">Hall-</option><option value="Orgk">Orgk-</option></select></div>
            <div><div className="text-xs">3️⃣ Kode Final Baru (GENERAL - Nomor Tetap {quick._nomor})</div><input value={getKodeFinalBaruGeneral()} disabled className="w-full p-2 border-2 border-green-500 rounded text-sm font-mono font-bold bg-green-100 text-green-800" /></div>
            <div className="bg-purple-50 border-2 border-purple-400 p-2 rounded"><div className="text-xs font-bold">4️⃣ Merek (custom_value_1)</div><input value={quickMerek} onChange={e=>setQuickMerek(e.target.value)} placeholder="Sania" className="w-full p-2 border-2 border-purple-500 rounded text-sm font-bold mt-1" autoFocus /></div>
            <div className="bg-yellow-50 border-2 border-yellow-500 p-2 rounded"><div className="text-xs font-bold">5️⃣ id_halal_19 SAJA (Auto kosong Orgk)</div><input value={quickIdHalal} onChange={e=>setQuickIdHalal(e.target.value)} placeholder="Auto kosong untuk Orgk" className="w-full p-2 border-2 border-yellow-500 rounded text-sm font-bold mt-1" maxLength={19} /></div>
          </div>
          <div className="mt-4 flex gap-2"><button onClick={handleUpdate} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded font-bold text-sm">💾 Update V16.2 FLOW BENAR - {quick._kode_tampil} JADI {getKodeFinalBaruGeneral()}</button><button onClick={()=>handleDelete(quick)} className="px-4 py-3 bg-red-600 text-white rounded text-sm font-bold">🗑️ Delete</button><button onClick={()=>setQuick(null)} className="px-4 py-3 bg-gray-200 rounded text-sm">Batal</button></div>
        </div>
      )}

      <div className="bg-white rounded-b-xl border">
        {masterKategori.map((katObj,i)=>{
          const kat = katObj.nama; const list = grouped[kat] || []; const isOpen = expanded[kat]!==false;
          if(list.length===0) return null;
          return (
            <div key={kat} className="border-b last:border-0">
              <div className="p-3 font-bold text-sm flex justify-between items-center bg-slate-50"><div className="cursor-pointer flex-1" onClick={()=>setExpanded(prev=>({...prev, [kat]: !isOpen}))}>{i+1} &nbsp; {kat} - {list.length} bahan {isOpen?"▼":"▶"}</div><button onClick={()=>setExpanded(prev=>({...prev, [kat]: !isOpen}))} className="text-xs bg-white border px-2 py-1 rounded">{isOpen?"Tutup":"Buka"}</button></div>
              {isOpen && (<div className="overflow-auto"><table className="w-full text-sm"><thead className="bg-white text-xs"><tr><th className="text-left p-2">No</th><th className="text-left p-2">Kode</th><th className="text-left p-2">Nama</th><th className="text-left p-2">Merek</th><th className="text-left p-2">id_halal_19</th><th className="text-left p-2">Stock</th><th className="text-left p-2">Aksi</th></tr></thead><tbody>{list.map((it, idx)=>(<tr key={it.id || it.kode_bahan || it.kode} className="border-t hover:bg-blue-50"><td className="p-2 text-xs">{String(idx+1).padStart(3,"0")}</td><td className="p-2 font-mono text-xs font-bold">{it._kode_tampil}</td><td className="p-2 font-semibold cursor-pointer" onClick={()=>handleClickNama(it)}>{it._nama_fix} <span className="text-[10px] text-blue-600">↗</span></td><td className="p-2 text-xs bg-purple-50 font-bold">{it.custom_value_1 || "-"}</td><td className="p-2 text-xs font-mono bg-yellow-50">{it.id_halal_19 || "-"}</td><td className="p-2"><span className="bg-blue-100 px-2 py-1 rounded-full text-xs">{it.stok||it.stock}</span></td><td className="p-2 flex gap-1"><button onClick={()=>handleClickNama(it)} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Edit Kode</button><button onClick={()=>handleDelete(it)} className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">🗑️</button></td></tr>))}</tbody></table></div>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
