"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchInventoryCompat } from "@/lib/inventoryCompat";

// INVENTORY V15.4 FIX name NOT NULL - PAKAI name + nama_bahan DUA-DUANYA + id_halal_19 SAJA + ADMIN MASTER BALIK
export default function InventoryPage(){
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [quick, setQuick] = useState(null);
  const [quickStock, setQuickStock] = useState("");
  const [quickHarga, setQuickHarga] = useState("");
  const [quickMerek, setQuickMerek] = useState("");
  const [quickIdHalal, setQuickIdHalal] = useState("");
  const [quickPrefix, setQuickPrefix] = useState("");
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

  const newKategoriUtama = mapKodeKeUtama[newKodeKat] || "Bahan Baku Utama";
  const countForKode = items.filter(i=> (i._kode_fix||"")===newKodeKat).length;
  const nextNoForKode = countForKode + 1;
  const baseKode = `${newKodeKat}-${String(nextNoForKode).padStart(3,"0")}`;
  const newKodeDisplay = newPrefix ? `${newPrefix}-${baseKode}` : baseKode;

  useEffect(()=>{ loadMasterAndData(); },[]);

  async function loadMasterAndData(){
    const { data: kodeData } = await supabase.from("master_kode_kategori").select("*").order("kode");
    const { data: katData } = await supabase.from("master_kategori_utama").select("*").order("urutan");
    let kodeList = kodeData; let katList = katData; let map = {};
    if(!kodeData || kodeData.length===0){
      kodeList = [{kode:"BERAS",kategori_utama:"Bahan Baku Utama"},{kode:"BOX",kategori_utama:"Bahan Kemasan"},{kode:"SABUN",kategori_utama:"Bahan Pembersih"},{kode:"DAGING",kategori_utama:"Bahan Hewani"},{kode:"UMBI",kategori_utama:"Bahan Nabati"},{kode:"IKAN",kategori_utama:"Bahan Hewani Non Sembelihan"},{kode:"UDANG",kategori_utama:"Bahan Hewani Non Sembelihan"},{kode:"CUMI",kategori_utama:"Bahan Hewani Non Sembelihan"},{kode:"TELUR",kategori_utama:"Bahan Hewani Non Sembelihan"},{kode:"SUSU",kategori_utama:"Bahan Susu"},{kode:"FERMENTASI",kategori_utama:"Bahan Fermentasi Alami"},{kode:"MINYAK",kategori_utama:"Bahan Minyak dan Lemak"},{kode:"BUBUK",kategori_utama:"Bahan Bumbu Instan"},{kode:"SAYURAN",kategori_utama:"Bahan Sayuran"},{kode:"BUAH",kategori_utama:"Bahan Buah Segar"},{kode:"PENYEDAP",kategori_utama:"Bahan Penyedap Rasa"},{kode:"REMPAH",kategori_utama:"Bahan Rempah Alami"},{kode:"KERUPUK",kategori_utama:"Bahan Pelengkap"},];
    }
    if(!katData || katData.length===0){
      katList = [{nama:"Bahan Baku Utama"},{nama:"Bahan Kemasan"},{nama:"Bahan Pembersih"},{nama:"Bahan Hewani"},{nama:"Bahan Nabati"},{nama:"Bahan Hewani Non Sembelihan"},{nama:"Bahan Susu"},{nama:"Bahan Fermentasi Alami"},{nama:"Bahan Minyak dan Lemak"},{nama:"Bahan Bumbu Instan"},{nama:"Bahan Sayuran"},{nama:"Bahan Buah Segar"},{nama:"Bahan Penyedap Rasa"},{nama:"Bahan Rempah Alami"},{nama:"Bahan Pelengkap"},];
    }
    kodeList.forEach(k=> map[k.kode]=k.kategori_utama);
    setMasterKode(kodeList); setMasterKategori(katList); setMapKodeKeUtama(map);
    try{
      const { items: data } = await fetchInventoryCompat();
      const withNo = data.map((d,i)=> {
        let prefix = d.kode_prefix || "";
        let raw = (d.kode_bahan||d.kode||"").split("-");
        if(!prefix && raw.length>=3 && ["Hall","Orgk","HALL","ORGK"].includes(raw[0])) prefix = raw[0];
        let kodeFix = (d.kode_bahan||d.kode||"").split("-").filter(x=>!["Hall","Orgk","HALL","ORGK"].includes(x))[0] || "BERAS";
        if(prefix) kodeFix = (d.kode_bahan||d.kode||"").split("-")[1] || kodeFix;
        kodeFix = kodeFix.toUpperCase();
        const utama = map[kodeFix] || d.kategori || d.kategori_utama || "Bahan Baku Utama";
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

  function handleClickNama(item){
    setQuick(item); setQuickStock(""); setQuickHarga(String(item.harga_beli||item.harga||0));
    setQuickMerek(item.custom_value_1 || ""); setQuickIdHalal(item.id_halal_19 || "");
    setQuickPrefix(item.kode_prefix || item._prefix || ""); setQuickKodeLama(item.kode_lama || "");
  }
  
  async function handleUpdate(){
    if(!quick) return;
    const tambah = Number(quickStock||0); const stockLama = Number(quick.stok||quick.stock||0);
    const stockBaruTotal = tambah ? stockLama + tambah : stockLama;
    if(quickPrefix==="Hall" && quickIdHalal && quickIdHalal.length!==19){ alert("Hall- wajib 19 digit!"); return; }
    let kodeBahanBaru = quick.kode_bahan || quick.kode;
    if(quickPrefix !== (quick.kode_prefix||"")){
      kodeBahanBaru = quickPrefix ? `${quickPrefix}-${quick._kode_fix}-${quick._nomor}` : `${quick._kode_fix}-${quick._nomor}`;
    }
    // FIX: UPDATE dua kolom name + nama_bahan biar tidak nyangkut
    const payload = {
      stok: stockBaruTotal, stock: stockBaruTotal,
      harga_beli: Number(quickHarga)||0, harga_baru: Number(quickHarga)||0, harga: Number(quickHarga)||0,
      custom_value_1: quickMerek || "", custom_value_2: "",
      id_halal_19: quickIdHalal || "", kode_prefix: quickPrefix || "",
      kode_lama: quickKodeLama || quick.kode_bahan, kode_bahan: kodeBahanBaru, kode: kodeBahanBaru,
      name: quick._nama_fix || quick.nama_bahan || quick.name, // FIX name NOT NULL
      nama_bahan: quick._nama_fix || quick.nama_bahan || quick.name
    };
    const { error } = await supabase.from("inventory_items").update(payload).eq("kode_bahan", quick.kode_bahan || quick.kode);
    if(error){ alert("Gagal update: "+error.message); return; }
    setQuick(null); await loadMasterAndData();
  }

  async function handleDelete(item){
    if(!confirm(`Hapus ${item._kode_tampil} - ${item._nama_fix} ?`)) return;
    const { error } = await supabase.from("inventory_items").delete().eq("kode_bahan", item.kode_bahan || item.kode);
    if(error){ alert("Gagal: "+error.message); return; }
    setItems(items.filter(it=> (it.kode_bahan||it.kode)!==(item.kode_bahan||item.kode))); if(quick && (quick.kode_bahan||quick.kode)===(item.kode_bahan||item.kode)) setQuick(null);
  }

  function handleBukaSemua(){ const exp = {}; Object.keys(grouped).forEach(k=> exp[k]=true); setExpanded(exp); }
  function handleTutupSemua(){ const exp = {}; Object.keys(grouped).forEach(k=> exp[k]=false); setExpanded(exp); }
  async function handleRefresh(){ await loadMasterAndData(); setShowTambah(false); }
  function handleTambahBahan(){ if(showTambah){ setShowTambah(false); }else{ setNewKodeKat(masterKode[0]?.kode || "BERAS"); setNewNama(""); setNewStock("10"); setNewHarga("15000"); setNewPrefix(""); setNewKodeLama(""); setNewIdHalal(""); setNewMerek(""); setShowTambah(true); window.scrollTo({top:0, behavior:'smooth'}); } }

  async function handleSimpanTambah(){
    if(!newNama){ alert("Nama bahan wajib"); return; }
    if(newPrefix==="Hall" && newIdHalal.length!==19){ alert("Hall- wajib 19 digit!"); return; }
    // FIX V15.4: KIRIM name + nama_bahan + kode + kode_bahan + stok + stock + harga + harga_beli + harga_baru BIAR TIDAK NYANGKUT
    const payload = {
      kode_bahan: newKodeDisplay, kode: newKodeDisplay,
      name: newNama.trim(), nama_bahan: newNama.trim(), // FIX UTAMA: dua-duanya isi biar tidak violates not-null constraint
      kategori: newKategoriUtama, kategori_utama: newKategoriUtama,
      stok: Number(newStock)||0, stock: Number(newStock)||0,
      harga_beli: Number(newHarga)||0, harga_baru: Number(newHarga)||0, harga: Number(newHarga)||0,
      kode_prefix: newPrefix || "", kode_lama: newKodeLama || baseKode,
      id_halal_19: newIdHalal || "", custom_value_1: newMerek || "", custom_value_2: "", satuan: "Kg", unit: "Kg"
    };
    console.log("INSERT PAYLOAD V15.4:", payload);
    const { error } = await supabase.from("inventory_items").insert(payload);
    if(error){ alert("Gagal: "+error.message + "\n\nPayload: "+JSON.stringify(payload)); return; }
    alert(`Berhasil tambah ${newKodeDisplay} - ${newNama} - Merek ${newMerek} - id_halal_19 ${newIdHalal||"kosong"}`);
    setShowTambah(false); setNewNama(""); await loadMasterAndData();
  }

  return (
    <div className="p-4 bg-[#f5f7fb] min-h-screen">
      <div className="bg-slate-900 text-white p-4 rounded-t-xl">
        <div className="text-lg font-bold">Inventory V15.4 FIX name NOT NULL - id_halal_19 SAJA + Admin Master BALIK</div>
        <div className="text-xs text-slate-300">Live: {items.length} bahan • FIX: insert pakai name + nama_bahan + kode + kode_bahan biar tidak violates constraint • Merek custom_value_1 + id_halal_19</div>
        <div className="mt-3 flex gap-2 flex-wrap">
          <button onClick={handleTambahBahan} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm font-bold border-2 border-white">+ Tambah General (Next: {newKodeDisplay})</button>
          <button onClick={handleBukaSemua} className="bg-slate-700 px-3 py-2 rounded text-sm">Buka Semua</button>
          <button onClick={handleTutupSemua} className="bg-slate-700 px-3 py-2 rounded text-sm">Tutup Semua</button>
          <button onClick={handleRefresh} className="bg-blue-600 px-3 py-2 rounded text-sm border border-white">↻ Refresh</button>
          <a href="/admin/master-kategori" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-sm font-bold border-2 border-white">⚙️ Admin Master A,B,C</a>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Cari kode / nama / Merek / id_halal_19...`} className="mt-3 w-full p-2 rounded text-black text-sm" />
      </div>

      {showTambah && (
        <div className="bg-white border-2 border-green-500 p-4 rounded-xl my-3 shadow">
          <div className="font-bold text-sm mb-2 text-green-700">✅ Tambah Bahan V15.4 FIX - id_halal_19 SAJA + FIX name constraint</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-yellow-50 border-2 border-yellow-400 p-3 rounded"><div className="text-xs font-bold">Prefix Hall/Orgk</div><select value={newPrefix} onChange={e=>setNewPrefix(e.target.value)} className="w-full p-2 border-2 border-green-500 rounded text-sm font-bold mt-1"><option value="">Biasa - BERAS-001</option><option value="Hall">Hall- (wajib id_halal_19 19 digit)</option><option value="Orgk">Orgk- (tanpa halal)</option></select></div>
            <div className="bg-blue-50 border-2 border-blue-400 p-3 rounded"><div className="text-xs font-bold">Kode Kategori</div><select value={newKodeKat} onChange={e=> setNewKodeKat(e.target.value)} className="w-full p-2 border-2 border-blue-500 rounded text-sm font-bold mt-1">{masterKode.map(k=>{ const count = items.filter(i=>i._kode_fix===k.kode).length+1; return <option key={k.kode} value={k.kode}>{k.kode} - Next {k.kode}-{String(count).padStart(3,"0")}</option> })}</select></div>
            <div className="bg-green-50 border-2 border-green-400 p-3 rounded"><div className="text-xs font-bold">Kode Final</div><input value={newKodeDisplay} disabled className="w-full p-2 border-2 border-green-500 rounded text-sm font-mono font-bold bg-green-50 mt-1" /></div>
            <div className="bg-white border-2 border-green-300 p-2 rounded"><div className="text-xs font-semibold">Nama Bahan *</div><input value={newNama} onChange={e=>setNewNama(e.target.value)} placeholder="Ayam Potong" className="w-full p-2 border-2 border-green-400 rounded text-sm mt-1" autoFocus /></div>
            <div className="bg-purple-50 border-2 border-purple-400 p-2 rounded"><div className="text-xs font-bold">Merek (custom_value_1)</div><input value={newMerek} onChange={e=>setNewMerek(e.target.value)} placeholder="Sania, Rojo Lele" className="w-full p-2 border-2 border-purple-500 rounded text-sm mt-1" /></div>
            <div className="bg-yellow-50 border-2 border-yellow-500 p-2 rounded"><div className="text-xs font-bold">id_halal_19 SAJA (19 digit)</div><input value={newIdHalal} onChange={e=>setNewIdHalal(e.target.value)} placeholder={newPrefix==="Hall" ? "Wajib 19 digit" : "Kosong untuk Orgk"} className="w-full p-2 border-2 border-yellow-500 rounded text-sm mt-1" maxLength={19} /></div>
            <div className="bg-blue-50 p-2 rounded"><div className="text-xs">Stock</div><input type="number" value={newStock} onChange={e=>setNewStock(e.target.value)} className="w-full p-2 border rounded text-sm font-bold mt-1" /></div>
            <div className="bg-yellow-50 p-2 rounded"><div className="text-xs">Harga</div><input type="number" value={newHarga} onChange={e=>setNewHarga(e.target.value)} className="w-full p-2 border rounded text-sm font-bold mt-1" /></div>
          </div>
          <div className="mt-3 flex gap-2"><button onClick={handleSimpanTambah} className="flex-1 bg-green-600 text-white py-3 rounded font-bold text-sm">Simpan - {newKodeDisplay} - FIX name NOT NULL</button><button onClick={()=>setShowTambah(false)} className="px-6 py-3 bg-gray-200 rounded text-sm">Batal</button></div>
        </div>
      )}

      {quick && (
        <div className="bg-green-50 border-2 border-green-400 p-4 rounded-xl my-3 shadow-lg">
          <div className="font-bold text-green-800 text-sm">🛠️ Edit Bahan Lama - id_halal_19 SAJA + Merek: {quick._kode_tampil} - {quick._nama_fix}</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div><div className="text-xs font-bold">Nama Bahan</div><input value={quick._nama_fix} disabled className="w-full p-2 border rounded bg-white text-sm" /></div>
            <div><div className="text-xs font-bold">Prefix Hall/Orgk</div><select value={quickPrefix} onChange={e=>setQuickPrefix(e.target.value)} className="w-full p-2 border-2 border-green-500 rounded text-sm font-bold"><option value="">Biasa</option><option value="Hall">Hall- (wajib id_halal_19)</option><option value="Orgk">Orgk- (tanpa halal)</option></select></div>
            <div><div className="text-xs">Kode Final</div><input value={quickPrefix ? `${quickPrefix}-${quick._kode_fix}-${quick._nomor}` : `${quick._kode_fix}-${quick._nomor}`} disabled className="w-full p-2 border-2 border-green-500 rounded text-sm font-mono font-bold bg-green-50" /></div>
            <div className="bg-purple-50 border-2 border-purple-400 p-2 rounded"><div className="text-xs font-bold">Merek (custom_value_1)</div><input value={quickMerek} onChange={e=>setQuickMerek(e.target.value)} placeholder="Sania" className="w-full p-2 border-2 border-purple-500 rounded text-sm font-bold mt-1" autoFocus /></div>
            <div className="bg-yellow-50 border-2 border-yellow-500 p-2 rounded"><div className="text-xs font-bold">id_halal_19 SAJA (19 digit)</div><input value={quickIdHalal} onChange={e=>setQuickIdHalal(e.target.value)} placeholder={quickPrefix==="Hall" ? "Wajib 19 digit" : "Kosongkan"} className="w-full p-2 border-2 border-yellow-500 rounded text-sm font-bold mt-1" maxLength={19} /></div>
            <div><div className="text-xs font-bold">Tambah Stock</div><input type="number" value={quickStock} onChange={e=>setQuickStock(e.target.value)} placeholder={`Stock ${quick.stok||quick.stock}`} className="w-full p-2 border-2 border-blue-400 rounded text-sm" /></div>
          </div>
          <div className="mt-4 flex gap-2"><button onClick={handleUpdate} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded font-bold text-sm">💾 Update - id_halal_19 SAJA + Merek + FIX name</button><button onClick={()=>handleDelete(quick)} className="px-4 py-3 bg-red-600 text-white rounded text-sm font-bold">🗑️ Delete</button><button onClick={()=>setQuick(null)} className="px-4 py-3 bg-gray-200 rounded text-sm">Batal</button></div>
        </div>
      )}

      <div className="bg-white rounded-b-xl border">
        {masterKategori.map((katObj,i)=>{
          const kat = katObj.nama; const list = grouped[kat] || []; const isOpen = expanded[kat]!==false;
          return (
            <div key={kat} className="border-b last:border-0">
              <div className="p-3 font-bold text-sm flex justify-between items-center bg-slate-50"><div className="cursor-pointer flex-1" onClick={()=>setExpanded(prev=>({...prev, [kat]: !isOpen}))}>{i+1} &nbsp; {kat} - {list.length} bahan {isOpen?"▼":"▶"}</div><button onClick={()=>setExpanded(prev=>({...prev, [kat]: !isOpen}))} className="text-xs bg-white border px-2 py-1 rounded">{isOpen?"Tutup":"Buka"}</button></div>
              {isOpen && (<div className="overflow-auto"><table className="w-full text-sm"><thead className="bg-white text-xs"><tr><th className="text-left p-2">No</th><th className="text-left p-2">Kode</th><th className="text-left p-2">Nama</th><th className="text-left p-2">Merek</th><th className="text-left p-2">id_halal_19</th><th className="text-left p-2">Stock</th><th className="text-left p-2">Aksi</th></tr></thead><tbody>{list.map(it=>(<tr key={it.kode_bahan||it.kode} className="border-t hover:bg-blue-50"><td className="p-2 text-xs">{String(it._no).padStart(3,"0")}</td><td className="p-2 font-mono text-xs font-bold">{it._kode_tampil}</td><td className="p-2 font-semibold cursor-pointer" onClick={()=>handleClickNama(it)}>{it._nama_fix} <span className="text-[10px] text-blue-600">↗</span></td><td className="p-2 text-xs bg-purple-50 font-bold">{it.custom_value_1 || "-"}</td><td className="p-2 text-xs font-mono bg-yellow-50">{it.id_halal_19 || "-"}</td><td className="p-2"><span className="bg-blue-100 px-2 py-1 rounded-full text-xs">{it.stok||it.stock}</span></td><td className="p-2 flex gap-1"><button onClick={()=>handleClickNama(it)} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Edit</button><button onClick={()=>handleDelete(it)} className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">🗑️</button></td></tr>))}</tbody></table></div>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
