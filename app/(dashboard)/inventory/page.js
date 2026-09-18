"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchInventoryCompat } from "@/lib/inventoryCompat";

// INVENTORY V15.0 - SUPPORT POINT A,B,C - Hall Orgk + 2 Kolom Custom Sync dari Admin Master
export default function InventoryPage(){
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [quick, setQuick] = useState(null);
  const [quickStock, setQuickStock] = useState("");
  const [quickHarga, setQuickHarga] = useState("");
  const [expanded, setExpanded] = useState({});
  const [showTambah, setShowTambah] = useState(false);
  const [masterKode, setMasterKode] = useState([]);
  const [masterKategori, setMasterKategori] = useState([]);
  const [mapKodeKeUtama, setMapKodeKeUtama] = useState({});
  const [customCols, setCustomCols] = useState([]);
  
  // Form tambah - Point C Hall Orgk + Point B 2 kolom
  const [newKodeKat, setNewKodeKat] = useState("BERAS");
  const [newNama, setNewNama] = useState("");
  const [newStock, setNewStock] = useState("10");
  const [newHarga, setNewHarga] = useState("15000");
  const [newPrefix, setNewPrefix] = useState(""); // Point C: "" | "Hall" | "Orgk"
  const [newKodeLama, setNewKodeLama] = useState("");
  const [newIdHalal, setNewIdHalal] = useState("");
  const [newCustom1, setNewCustom1] = useState("");
  const [newCustom2, setNewCustom2] = useState("");

  const newKategoriUtama = mapKodeKeUtama[newKodeKat] || "Bahan Baku Utama";
  const countForKode = items.filter(i=> (i._kode_fix||"")===newKodeKat).length;
  const nextNoForKode = countForKode + 1;
  const baseKode = `${newKodeKat}-${String(nextNoForKode).padStart(3,"0")}`;
  const newKodeDisplay = newPrefix ? `${newPrefix}-${baseKode}` : baseKode;

  useEffect(()=>{ loadMasterAndData(); },[]);

  async function loadMasterAndData(){
    const { data: kodeData } = await supabase.from("master_kode_kategori").select("*").order("kode");
    const { data: katData } = await supabase.from("master_kategori_utama").select("*").order("urutan");
    const { data: colData } = await supabase.from("master_custom_columns").select("*").order("id");
    
    let kodeList = kodeData;
    let katList = katData;
    let map = {};
    let colList = colData;

    if(!kodeData || kodeData.length===0){
      kodeList = [
        {kode:"BERAS",kategori_utama:"Bahan Baku Utama"},{kode:"BOX",kategori_utama:"Bahan Kemasan"},{kode:"SABUN",kategori_utama:"Bahan Pembersih"},
        {kode:"DAGING",kategori_utama:"Bahan Hewani"},{kode:"UMBI",kategori_utama:"Bahan Nabati"},
        {kode:"IKAN",kategori_utama:"Bahan Hewani Non Sembelihan"},{kode:"UDANG",kategori_utama:"Bahan Hewani Non Sembelihan"},{kode:"CUMI",kategori_utama:"Bahan Hewani Non Sembelihan"},{kode:"TELUR",kategori_utama:"Bahan Hewani Non Sembelihan"},
        {kode:"SUSU",kategori_utama:"Bahan Susu"},{kode:"FERMENTASI",kategori_utama:"Bahan Fermentasi Alami"},{kode:"MINYAK",kategori_utama:"Bahan Minyak dan Lemak"},
        {kode:"BUBUK",kategori_utama:"Bahan Bumbu Instan"},{kode:"SAYURAN",kategori_utama:"Bahan Sayuran"},{kode:"BUAH",kategori_utama:"Bahan Buah Segar"},
        {kode:"PENYEDAP",kategori_utama:"Bahan Penyedap Rasa"},{kode:"REMPAH",kategori_utama:"Bahan Rempah Alami"},{kode:"KERUPUK",kategori_utama:"Bahan Pelengkap"},
      ];
    }
    if(!katData || katData.length===0){
      katList = [
        {nama:"Bahan Baku Utama"},{nama:"Bahan Kemasan"},{nama:"Bahan Pembersih"},{nama:"Bahan Hewani"},{nama:"Bahan Nabati"},
        {nama:"Bahan Hewani Non Sembelihan"},{nama:"Bahan Susu"},{nama:"Bahan Fermentasi Alami"},{nama:"Bahan Minyak dan Lemak"},
        {nama:"Bahan Bumbu Instan"},{nama:"Bahan Sayuran"},{nama:"Bahan Buah Segar"},{nama:"Bahan Penyedap Rasa"},{nama:"Bahan Rempah Alami"},{nama:"Bahan Pelengkap"},
      ];
    }
    if(!colData || colData.length===0){
      colList = [
        {id:1, nama_kolom:"Merek", key_kolom:"custom_value_1", is_active:true, is_sync_dashboard:true},
        {id:2, nama_kolom:"ID Halal 19 digit", key_kolom:"custom_value_2", is_active:true, is_sync_dashboard:true},
      ];
    }
    kodeList.forEach(k=> map[k.kode]=k.kategori_utama);
    setMasterKode(kodeList);
    setMasterKategori(katList);
    setMapKodeKeUtama(map);
    setCustomCols(colList.filter(c=>c.is_active && c.is_sync_dashboard));

    try{
      const { items: data } = await fetchInventoryCompat();
      const withNo = data.map((d,i)=> {
        let raw = (d.kode_bahan||"").split("-");
        let prefix = "";
        let kodeFix = "";
        // Deteksi Hall- atau Orgk- di depan
        if(raw.length>=3 && (raw[0]==="Hall" || raw[0]==="Orgk" || raw[0]==="HALL" || raw[0]==="ORGK")){
          prefix = raw[0]; kodeFix = raw[1];
        } else if(raw.length>=2){
          kodeFix = raw[0];
        } else {
          kodeFix = d.kode_bahan?.split("-")[0] || "BERAS";
        }
        kodeFix = kodeFix.toUpperCase();
        const utama = map[kodeFix] || d.kategori || "Bahan Baku Utama";
        const nomor = d.kode_bahan?.split("-").pop() || String(i+1).padStart(3,"0");
        const kodeTampil = d.kode_prefix ? `${d.kode_prefix}-${kodeFix}-${nomor}` : `${kodeFix}-${nomor}`;
        return {...d, _no: i+1, _kode_fix: kodeFix, _kode_tampil: kodeTampil, _prefix: d.kode_prefix || prefix, _utama: utama, _nomor: nomor, selisih: Number(d.harga_baru||d.harga_beli||0) - Number(d.harga_beli||0)}
      });
      setItems(withNo);
      const exp = {}; katList.forEach(k=> exp[k.nama]=true); setExpanded(exp);
    }catch(e){ console.log(e); }
  }

  const filtered = items.filter(i=>{
    if(!search) return true;
    const s = search.toLowerCase();
    return i._kode_tampil.toLowerCase().includes(s) || i.nama_bahan.toLowerCase().includes(s) || (i.custom_value_1||"").toLowerCase().includes(s) || (i.id_halal_19||"").includes(s);
  });
  const grouped = filtered.reduce((acc,cur)=>{ const kat = cur._utama || "Bahan Baku Utama"; if(!acc[kat]) acc[kat]=[]; acc[kat].push(cur); return acc; },{});

  function handleClickNama(item){ setQuick(item); setQuickStock(""); setQuickHarga(String(item.harga_beli||0)); }
  async function handleUpdate(){
    if(!quick) return;
    const tambah = Number(quickStock||0);
    const stockLama = Number(quick.stok||quick.stock||0);
    const stockBaruTotal = stockLama + tambah;
    const hargaBaruInput = Number(quickHarga||0);
    const { error } = await supabase.from("inventory_items").update({ stok: stockBaruTotal, stock: stockBaruTotal, harga_beli: hargaBaruInput, harga_baru: hargaBaruInput }).eq("kode_bahan", quick.kode_bahan);
    if(error){ alert("Gagal: "+error.message); return; }
    setItems(items.map(it=> it.kode_bahan===quick.kode_bahan ? {...it, stok: stockBaruTotal, stock: stockBaruTotal, harga_beli: hargaBaruInput } : it));
    setQuick(null);
  }
  async function handleDelete(item){
    if(!confirm(`Hapus ${item._kode_tampil} - ${item.nama_bahan} ?`)) return;
    const { error } = await supabase.from("inventory_items").delete().eq("kode_bahan", item.kode_bahan);
    if(error){ alert("Gagal: "+error.message); return; }
    setItems(items.filter(it=> it.kode_bahan!==item.kode_bahan));
  }
  function handleBukaSemua(){ const exp = {}; Object.keys(grouped).forEach(k=> exp[k]=true); setExpanded(exp); }
  function handleTutupSemua(){ const exp = {}; Object.keys(grouped).forEach(k=> exp[k]=false); setExpanded(exp); }
  async function handleRefresh(){ await loadMasterAndData(); setShowTambah(false); }
  function handleTambahBahan(){ if(showTambah){ setShowTambah(false); }else{ setNewKodeKat(masterKode[0]?.kode || "BERAS"); setNewNama(""); setNewStock("10"); setNewHarga("15000"); setNewPrefix(""); setNewKodeLama(""); setNewIdHalal(""); setNewCustom1(""); setNewCustom2(""); setShowTambah(true); window.scrollTo({top:0, behavior:'smooth'}); } }
  function handleTambahPerKategori(kat){ const kodeDefault = masterKode.find(k=>k.kategori_utama===kat)?.kode || "BERAS"; setNewKodeKat(kodeDefault); setNewNama(""); setNewPrefix(""); setNewCustom1(""); setNewCustom2(""); setShowTambah(true); window.scrollTo({top:0, behavior:'smooth'}); }

  async function handleSimpanTambah(){
    if(!newNama){ alert("Nama bahan wajib"); return; }
    // Validasi Point C: Hall wajib ID Halal 19 digit
    if(newPrefix==="Hall" && newIdHalal.length!==19){ alert("Untuk Hall- wajib isi ID Halal 19 digit! Contoh: 1234567890123456789"); return; }
    if(newIdHalal && newIdHalal.length>0 && !/^\d+$/.test(newIdHalal)){ alert("ID Halal harus angka saja"); return; }
    
    // Validasi kode tidak duplikat
    const existing = items.find(i=> i._kode_tampil===newKodeDisplay);
    if(existing && !newKodeLama){ if(!confirm(`Kode ${newKodeDisplay} sudah ada (${existing.nama_bahan}). Tetap tambah stock?`)) return; }

    const payload = {
      kode_bahan: newKodeDisplay,
      nama_bahan: newNama.trim(),
      kategori: newKategoriUtama,
      stok: Number(newStock)||0,
      stock: Number(newStock)||0,
      harga_beli: Number(newHarga)||0,
      harga_baru: Number(newHarga)||0,
      kode_prefix: newPrefix || "",
      kode_lama: newKodeLama || baseKode,
      id_halal_19: newIdHalal || "",
      custom_value_1: newCustom1 || "",
      custom_value_2: newCustom2 || (newPrefix==="Hall" ? newIdHalal : ""),
      satuan: "Kg"
    };
    const { error } = await supabase.from("inventory_items").insert(payload);
    if(error){ alert("Gagal (jalankan SQL dulu): "+error.message); return; }
    alert(`Berhasil tambah ${newKodeDisplay} - ${newKategoriUtama}\nPrefix: ${newPrefix||"biasa"} | Merek: ${newCustom1} | ID Halal: ${newIdHalal||"tanpa"}`);
    setShowTambah(false); setNewNama(""); await loadMasterAndData();
  }

  const col1Name = customCols.find(c=>c.key_kolom==="custom_value_1")?.nama_kolom || "Merek";
  const col2Name = customCols.find(c=>c.key_kolom==="custom_value_2")?.nama_kolom || "ID Halal";

  return (
    <div className="p-4 bg-[#f5f7fb] min-h-screen">
      <div className="bg-slate-900 text-white p-4 rounded-t-xl">
        <div className="text-lg font-bold">Inventory V15.0 - Hall Orgk + 2 Kolom Custom Sync - Point A,B,C</div>
        <div className="text-xs text-slate-300">Live: {items.length} bahan • {masterKode.length} Kode | Prefix: Hall-/Orgk-/biasa | Kolom Custom: {col1Name}, {col2Name} sync dari Admin Master | No Global | Delete 🗑️</div>
        <div className="mt-3 flex gap-2 flex-wrap">
          <button onClick={handleTambahBahan} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm font-bold border-2 border-white">+ Tambah General (Next: {newKodeDisplay})</button>
          <button onClick={handleBukaSemua} className="bg-slate-700 px-3 py-2 rounded text-sm">Buka Semua</button>
          <button onClick={handleTutupSemua} className="bg-slate-700 px-3 py-2 rounded text-sm">Tutup Semua</button>
          <button onClick={handleRefresh} className="bg-blue-600 px-3 py-2 rounded text-sm border border-white">↻ Refresh</button>
          <a href="/admin/master-kategori" className="bg-purple-600 px-3 py-2 rounded text-sm font-bold border border-white">⚙️ Admin Master A,B,C</a>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Cari kode / nama / ${col1Name} / ID Halal...`} className="mt-3 w-full p-2 rounded text-black text-sm" />
      </div>

      {showTambah && (
        <div className="bg-white border-2 border-green-500 p-4 rounded-xl my-3 shadow">
          <div className="font-bold text-sm mb-2 text-green-700">✅ Tambah Bahan - Point A,B,C - Hall Orgk + 2 Kolom Custom</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-yellow-50 border-2 border-yellow-400 p-3 rounded">
              <div className="text-xs font-bold">Point C: Prefix Kode (Hall / Orgk)</div>
              <select value={newPrefix} onChange={e=>setNewPrefix(e.target.value)} className="w-full p-2 border-2 border-green-500 rounded text-sm font-bold mt-1">
                <option value="">Biasa (tanpa prefix) - ex: BERAS-001</option>
                <option value="Hall">Hall- (wajib ID Halal 19 digit) - ex: Hall-BERAS-001</option>
                <option value="Orgk">Orgk- (tanpa ID Halal) - ex: Orgk-Beras-001</option>
              </select>
              <div className="text-[10px] mt-1">Pilih Hall = harus isi ID Halal 19 digit di bawah | Orgk = tanpa halal</div>
            </div>
            <div className="bg-blue-50 border-2 border-blue-400 p-3 rounded">
              <div className="text-xs font-bold">Kode Kategori ({masterKode.length} Kode)</div>
              <select value={newKodeKat} onChange={e=> setNewKodeKat(e.target.value)} className="w-full p-2 border-2 border-blue-500 rounded text-sm font-bold mt-1">
                {masterKode.map(k=>{
                  const count = items.filter(i=>i._kode_fix===k.kode).length+1;
                  return <option key={k.kode} value={k.kode}>{k.kode} - {k.kategori_utama} - Next {k.kode}-{String(count).padStart(3,"0")}</option>
                })}
              </select>
              <div className="text-[11px] text-green-700 mt-1">Hasil: {newKodeDisplay} - {newKategoriUtama}</div>
            </div>
            <div className="bg-green-50 border-2 border-green-400 p-3 rounded">
              <div className="text-xs font-bold">Kode Bahan Final Auto</div>
              <input value={newKodeDisplay} disabled className="w-full p-2 border-2 border-green-500 rounded text-sm font-mono font-bold bg-green-50 mt-1" />
              <div className="text-[10px] mt-1">Kode Lama: <input value={newKodeLama} onChange={e=>setNewKodeLama(e.target.value)} placeholder={baseKode} className="border rounded px-1 text-[10px] w-24" /></div>
            </div>

            <div className="bg-white border-2 border-green-300 p-2 rounded"><div className="text-xs font-semibold">Nama Bahan *</div><input value={newNama} onChange={e=>setNewNama(e.target.value)} placeholder="Ex: Beras Premium" className="w-full p-2 border-2 border-green-400 rounded text-sm mt-1" autoFocus /></div>
            <div className="bg-purple-50 border-2 border-purple-300 p-2 rounded"><div className="text-xs font-bold">Point B: {col1Name} (Kolom_1 Custom)</div><input value={newCustom1} onChange={e=>setNewCustom1(e.target.value)} placeholder={`Ex: Sania, Rose Brand - ${col1Name}`} className="w-full p-2 border rounded text-sm mt-1" /></div>
            <div className="bg-yellow-50 border-2 border-yellow-400 p-2 rounded"><div className="text-xs font-bold">Point B: {col2Name} (Kolom_2 Custom) {newPrefix==="Hall" && "*Wajib 19 digit"}</div><input value={newCustom2 || newIdHalal} onChange={e=>{setNewCustom2(e.target.value); setNewIdHalal(e.target.value);}} placeholder={newPrefix==="Hall" ? "1234567890123456789 (19 digit)" : `Ex: ${col2Name} atau kosong untuk Orgk`} className="w-full p-2 border rounded text-sm mt-1" maxLength={19} /></div>

            <div className="bg-blue-50 border-2 border-blue-400 p-2 rounded"><div className="text-xs">Stock Awal</div><input type="number" value={newStock} onChange={e=>setNewStock(e.target.value)} className="w-full p-2 border rounded text-sm font-bold mt-1" /></div>
            <div className="bg-yellow-50 border-2 border-yellow-400 p-2 rounded"><div className="text-xs">Harga Beli</div><input type="number" value={newHarga} onChange={e=>setNewHarga(e.target.value)} className="w-full p-2 border rounded text-sm font-bold bg-yellow-50 mt-1" /></div>
            <div className="bg-red-50 border-2 border-red-300 p-2 rounded"><div className="text-xs font-bold">ID Halal 19 digit {newPrefix==="Hall" ? "*Wajib" : "(Optional untuk Orgk)"}</div><input value={newIdHalal} onChange={e=>setNewIdHalal(e.target.value)} placeholder={newPrefix==="Hall" ? "Wajib 19 digit angka" : "Kosongkan untuk Orgk"} className="w-full p-2 border rounded text-sm mt-1" maxLength={19} /></div>
          </div>
          <div className="mt-3 flex gap-2"><button onClick={handleSimpanTambah} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded font-bold text-sm">Simpan - {newKodeDisplay} - {newKategoriUtama} - Prefix {newPrefix||"biasa"}</button><button onClick={()=>setShowTambah(false)} className="px-6 py-3 bg-gray-200 rounded text-sm">Batal</button></div>
          <div className="text-[10px] text-gray-500 mt-2">Point C: Hall-BERAS-001 = wajib ID Halal 19 digit | Orgk-Beras-001 = tanpa ID Halal | Point B: {col1Name} & {col2Name} sync dari Admin Master</div>
        </div>
      )}

      <div className="bg-white rounded-b-xl border">
        {masterKategori.map((katObj,i)=>{
          const kat = katObj.nama;
          const list = grouped[kat] || [];
          const isOpen = expanded[kat]!==false;
          const kodeInKat = masterKode.filter(k=>k.kategori_utama===kat).map(k=>k.kode).join(", ");
          return (
            <div key={kat} className="border-b last:border-0">
              <div className="p-3 font-bold text-sm flex justify-between items-center bg-slate-50">
                <div className="cursor-pointer flex-1" onClick={()=>setExpanded(prev=>({...prev, [kat]: !isOpen}))}>
                  {i+1} &nbsp; {kat} - {list.length} bahan {kodeInKat && <span className="text-[10px] text-gray-500">({kodeInKat})</span>} {isOpen?"▼":"▶"}
                </div>
                <div className="flex gap-2 items-center">
                  <button onClick={()=>handleTambahPerKategori(kat)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-bold">+ Tambah {kat}</button>
                  <button onClick={()=>setExpanded(prev=>({...prev, [kat]: !isOpen}))} className="text-xs bg-white border px-2 py-1 rounded">{isOpen?"Tutup":"Buka"}</button>
                </div>
              </div>
              {isOpen && (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white text-xs"><tr><th className="text-left p-2">No</th><th className="text-left p-2">Kode Bahan (Hall/Orgk)</th><th className="text-left p-2">Nama Bahan</th><th className="text-left p-2">Kategori</th><th className="text-left p-2">{col1Name}</th><th className="text-left p-2">{col2Name}</th><th className="text-left p-2">ID Halal 19 digit</th><th className="text-left p-2">Stock</th><th className="text-left p-2">Aksi</th></tr></thead>
                    <tbody>
                      {list.map(it=>(
                        <tr key={it.kode_bahan} className="border-t hover:bg-blue-50">
                          <td className="p-2 text-xs">{String(it._no).padStart(3,"0")}</td>
                          <td className="p-2 font-mono text-xs font-bold">{it._kode_tampil} {it.kode_lama && <span className="text-[9px] text-gray-400">({it.kode_lama})</span>}</td>
                          <td className="p-2 font-semibold cursor-pointer" onClick={()=>handleClickNama(it)}>{it.nama_bahan} <span className="text-[10px] text-blue-600">↗</span></td>
                          <td className="p-2 text-[11px]">{it._utama}</td>
                          <td className="p-2 text-xs">{it.custom_value_1 || "-"}</td>
                          <td className="p-2 text-xs">{it.custom_value_2 || it.id_halal_19 || "-"}</td>
                          <td className="p-2 text-[10px] font-mono">{it.id_halal_19 ? `${String(it.id_halal_19).substring(0,6)}...${String(it.id_halal_19).length} digit` : "-"}</td>
                          <td className="p-2"><span className="bg-blue-100 px-2 py-1 rounded-full text-xs">{it.stok}</span></td>
                          <td className="p-2 flex gap-1">
                            <button onClick={()=>handleClickNama(it)} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Edit</button>
                            <button onClick={()=>handleDelete(it)} className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">🗑️ Delete</button>
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
