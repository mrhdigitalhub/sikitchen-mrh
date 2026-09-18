"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchInventoryCompat } from "@/lib/inventoryCompat";

// INVENTORY V15.1 - EDIT BAHAN LAMA BISA ISI MEREK + ID HALAL + HALL ORGK
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
  const [quickCustom2, setQuickCustom2] = useState("");
  const [expanded, setExpanded] = useState({});
  const [showTambah, setShowTambah] = useState(false);
  const [masterKode, setMasterKode] = useState([]);
  const [masterKategori, setMasterKategori] = useState([]);
  const [mapKodeKeUtama, setMapKodeKeUtama] = useState({});
  const [customCols, setCustomCols] = useState([]);
  
  const [newKodeKat, setNewKodeKat] = useState("BERAS");
  const [newNama, setNewNama] = useState("");
  const [newStock, setNewStock] = useState("10");
  const [newHarga, setNewHarga] = useState("15000");
  const [newPrefix, setNewPrefix] = useState("");
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
        let prefix = d.kode_prefix || "";
        if(!prefix && raw.length>=3 && (raw[0]==="Hall" || raw[0]==="Orgk" || raw[0]==="HALL" || raw[0]==="ORGK")) prefix = raw[0];
        let kodeFix = d.kode_bahan?.split("-").filter(x=>!["Hall","Orgk","HALL","ORGK"].includes(x))[0] || "BERAS";
        if(prefix) kodeFix = d.kode_bahan.split("-")[1] || kodeFix;
        kodeFix = kodeFix.toUpperCase();
        const utama = map[kodeFix] || d.kategori || "Bahan Baku Utama";
        const nomor = d.kode_bahan?.split("-").pop() || String(i+1).padStart(3,"0");
        const kodeTampil = prefix ? `${prefix}-${kodeFix}-${nomor}` : `${kodeFix}-${nomor}`;
        return {...d, _no: i+1, _kode_fix: kodeFix, _kode_tampil: kodeTampil, _prefix: prefix, _utama: utama, _nomor: nomor}
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

  // V15.1 FIX: Edit bahan lama bisa isi Merek + ID Halal + Hall Orgk
  function handleClickNama(item){
    setQuick(item);
    setQuickStock("");
    setQuickHarga(String(item.harga_beli||0));
    setQuickMerek(item.custom_value_1 || "");
    setQuickIdHalal(item.id_halal_19 || item.custom_value_2 || "");
    setQuickCustom2(item.custom_value_2 || "");
    setQuickPrefix(item.kode_prefix || item._prefix || "");
    setQuickKodeLama(item.kode_lama || "");
  }
  
  async function handleUpdate(){
    if(!quick) return;
    const tambah = Number(quickStock||0);
    const stockLama = Number(quick.stok||quick.stock||0);
    const stockBaruTotal = tambah ? stockLama + tambah : stockLama;
    
    // Validasi Hall wajib 19 digit
    if(quickPrefix==="Hall" && quickIdHalal && quickIdHalal.length!==19){
      alert("Untuk Hall- wajib ID Halal 19 digit angka!");
      return;
    }
    // Buat kode baru jika prefix berubah
    let kodeBahanBaru = quick.kode_bahan;
    if(quickPrefix !== (quick.kode_prefix||"")){
      // Rebuild kode: Prefix-KODE-NOMOR
      const parts = quick.kode_bahan.split("-");
      const nomor = parts.pop();
      const kodeFix = quick._kode_fix;
      kodeBahanBaru = quickPrefix ? `${quickPrefix}-${kodeFix}-${nomor}` : `${kodeFix}-${nomor}`;
    }

    const payload = {
      stok: stockBaruTotal,
      stock: stockBaruTotal,
      harga_beli: Number(quickHarga)||0,
      harga_baru: Number(quickHarga)||0,
      custom_value_1: quickMerek || "",
      custom_value_2: quickCustom2 || quickIdHalal || "",
      id_halal_19: quickIdHalal || "",
      kode_prefix: quickPrefix || "",
      kode_lama: quickKodeLama || quick.kode_bahan,
      kode_bahan: kodeBahanBaru
    };

    const { error } = await supabase.from("inventory_items").update(payload).eq("kode_bahan", quick.kode_bahan);
    if(error){ alert("Gagal update (jalankan SQL dulu): "+error.message); return; }
    
    alert(`Update berhasil:\n${quick.kode_bahan} → ${kodeBahanBaru}\nMerek: ${quickMerek}\nID Halal: ${quickIdHalal||"kosong (Orgk/biasa)"}\nStock: ${stockLama}+${tambah||0}=${stockBaruTotal}`);
    setQuick(null);
    await loadMasterAndData();
  }

  async function handleDelete(item){
    if(!confirm(`Hapus ${item._kode_tampil} - ${item.nama_bahan} ?`)) return;
    const { error } = await supabase.from("inventory_items").delete().eq("kode_bahan", item.kode_bahan);
    if(error){ alert("Gagal: "+error.message); return; }
    setItems(items.filter(it=> it.kode_bahan!==item.kode_bahan));
    if(quick && quick.kode_bahan===item.kode_bahan) setQuick(null);
  }

  function handleBukaSemua(){ const exp = {}; Object.keys(grouped).forEach(k=> exp[k]=true); setExpanded(exp); }
  function handleTutupSemua(){ const exp = {}; Object.keys(grouped).forEach(k=> exp[k]=false); setExpanded(exp); }
  async function handleRefresh(){ await loadMasterAndData(); setShowTambah(false); }
  function handleTambahBahan(){ if(showTambah){ setShowTambah(false); }else{ setNewKodeKat(masterKode[0]?.kode || "BERAS"); setNewNama(""); setNewStock("10"); setNewHarga("15000"); setNewPrefix(""); setNewKodeLama(""); setNewIdHalal(""); setNewCustom1(""); setNewCustom2(""); setShowTambah(true); window.scrollTo({top:0, behavior:'smooth'}); } }
  function handleTambahPerKategori(kat){ const kodeDefault = masterKode.find(k=>k.kategori_utama===kat)?.kode || "BERAS"; setNewKodeKat(kodeDefault); setNewNama(""); setNewPrefix(""); setNewCustom1(""); setNewCustom2(""); setShowTambah(true); window.scrollTo({top:0, behavior:'smooth'}); }

  async function handleSimpanTambah(){
    if(!newNama){ alert("Nama bahan wajib"); return; }
    if(newPrefix==="Hall" && newIdHalal.length!==19){ alert("Untuk Hall- wajib ID Halal 19 digit!"); return; }
    const payload = {
      kode_bahan: newKodeDisplay,
      nama_bahan: newNama.trim(),
      kategori: newKategoriUtama,
      stok: Number(newStock)||0, stock: Number(newStock)||0,
      harga_beli: Number(newHarga)||0, harga_baru: Number(newHarga)||0,
      kode_prefix: newPrefix || "", kode_lama: newKodeLama || baseKode,
      id_halal_19: newIdHalal || "", custom_value_1: newCustom1 || "", custom_value_2: newCustom2 || newIdHalal || "",
      satuan: "Kg"
    };
    const { error } = await supabase.from("inventory_items").insert(payload);
    if(error){ alert("Gagal (jalankan SQL dulu): "+error.message); return; }
    setShowTambah(false); setNewNama(""); await loadMasterAndData();
  }

  const col1Name = customCols.find(c=>c.key_kolom==="custom_value_1")?.nama_kolom || "Merek";
  const col2Name = customCols.find(c=>c.key_kolom==="custom_value_2")?.nama_kolom || "ID Halal";

  return (
    <div className="p-4 bg-[#f5f7fb] min-h-screen">
      <div className="bg-slate-900 text-white p-4 rounded-t-xl">
        <div className="text-lg font-bold">Inventory V15.1 - Edit Bahan Lama Bisa Isi Merek + Hall Orgk - Point A,B,C</div>
        <div className="text-xs text-slate-300">Live: {items.length} bahan • Edit klik nama → bisa isi {col1Name} + {col2Name} + Prefix Hall/Orgk + ID Halal 19 digit tanpa Delete | Sync dari Admin Master</div>
        <div className="mt-3 flex gap-2 flex-wrap">
          <button onClick={handleTambahBahan} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm font-bold border-2 border-white">+ Tambah General (Next: {newKodeDisplay})</button>
          <button onClick={handleBukaSemua} className="bg-slate-700 px-3 py-2 rounded text-sm">Buka Semua</button>
          <button onClick={handleTutupSemua} className="bg-slate-700 px-3 py-2 rounded text-sm">Tutup Semua</button>
          <button onClick={handleRefresh} className="bg-blue-600 px-3 py-2 rounded text-sm border border-white">↻ Refresh</button>
          <a href="/admin/master-kategori" className="bg-purple-600 px-3 py-2 rounded text-sm font-bold border border-white">⚙️ Admin Master A,B,C</a>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Cari kode / nama / ${col1Name} / ID Halal...`} className="mt-3 w-full p-2 rounded text-black text-sm" />
      </div>

      {/* FORM TAMBAH */}
      {showTambah && (
        <div className="bg-white border-2 border-green-500 p-4 rounded-xl my-3 shadow">
          <div className="font-bold text-sm mb-2 text-green-700">✅ Tambah Bahan - {newKategoriUtama} - {newKodeDisplay}</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-yellow-50 border-2 border-yellow-400 p-3 rounded">
              <div className="text-xs font-bold">Point C: Prefix Hall / Orgk</div>
              <select value={newPrefix} onChange={e=>setNewPrefix(e.target.value)} className="w-full p-2 border-2 border-green-500 rounded text-sm font-bold mt-1">
                <option value="">Biasa - BERAS-001</option>
                <option value="Hall">Hall- - Hall-BERAS-001 (wajib 19 digit)</option>
                <option value="Orgk">Orgk- - Orgk-Beras-001 (tanpa halal)</option>
              </select>
            </div>
            <div className="bg-blue-50 border-2 border-blue-400 p-3 rounded">
              <div className="text-xs font-bold">Kode Kategori</div>
              <select value={newKodeKat} onChange={e=> setNewKodeKat(e.target.value)} className="w-full p-2 border-2 border-blue-500 rounded text-sm font-bold mt-1">
                {masterKode.map(k=>{ const count = items.filter(i=>i._kode_fix===k.kode).length+1; return <option key={k.kode} value={k.kode}>{k.kode} - {k.kategori_utama} - Next {k.kode}-{String(count).padStart(3,"0")}</option> })}
              </select>
            </div>
            <div className="bg-green-50 border-2 border-green-400 p-3 rounded">
              <div className="text-xs font-bold">Kode Final</div>
              <input value={newKodeDisplay} disabled className="w-full p-2 border-2 border-green-500 rounded text-sm font-mono font-bold bg-green-50 mt-1" />
            </div>
            <div className="bg-white border-2 border-green-300 p-2 rounded"><div className="text-xs font-semibold">Nama Bahan *</div><input value={newNama} onChange={e=>setNewNama(e.target.value)} placeholder="Ex: Beras Premium" className="w-full p-2 border-2 border-green-400 rounded text-sm mt-1" autoFocus /></div>
            <div className="bg-purple-50 border-2 border-purple-300 p-2 rounded"><div className="text-xs font-bold">Point B: {col1Name}</div><input value={newCustom1} onChange={e=>setNewCustom1(e.target.value)} placeholder={`Ex: Sania - ${col1Name}`} className="w-full p-2 border rounded text-sm mt-1" /></div>
            <div className="bg-yellow-50 border-2 border-yellow-400 p-2 rounded"><div className="text-xs font-bold">Point B: {col2Name} / ID Halal</div><input value={newCustom2 || newIdHalal} onChange={e=>{setNewCustom2(e.target.value); setNewIdHalal(e.target.value);}} placeholder={newPrefix==="Hall" ? "19 digit wajib" : "Optional"} className="w-full p-2 border rounded text-sm mt-1" maxLength={19} /></div>
            <div className="bg-blue-50 p-2 rounded"><div className="text-xs">Stock</div><input type="number" value={newStock} onChange={e=>setNewStock(e.target.value)} className="w-full p-2 border rounded text-sm font-bold mt-1" /></div>
            <div className="bg-yellow-50 p-2 rounded"><div className="text-xs">Harga</div><input type="number" value={newHarga} onChange={e=>setNewHarga(e.target.value)} className="w-full p-2 border rounded text-sm font-bold mt-1" /></div>
            <div className="bg-red-50 p-2 rounded"><div className="text-xs font-bold">ID Halal 19 digit</div><input value={newIdHalal} onChange={e=>setNewIdHalal(e.target.value)} placeholder={newPrefix==="Hall" ? "Wajib 19 digit" : "Kosong untuk Orgk"} className="w-full p-2 border rounded text-sm mt-1" maxLength={19} /></div>
          </div>
          <div className="mt-3 flex gap-2"><button onClick={handleSimpanTambah} className="flex-1 bg-green-600 text-white py-3 rounded font-bold text-sm">Simpan - {newKodeDisplay}</button><button onClick={()=>setShowTambah(false)} className="px-6 py-3 bg-gray-200 rounded text-sm">Batal</button></div>
        </div>
      )}

      {/* V15.1 FIX: EDIT BAHAN LAMA BISA ISI MEREK */}
      {quick && (
        <div className="bg-green-50 border-2 border-green-400 p-4 rounded-xl my-3 shadow-lg">
          <div className="font-bold text-green-800 text-sm">🛠️ V15.1 Edit Bahan Lama - Bisa Isi Merek + Hall/Orgk + ID Halal Tanpa Delete: {quick._kode_tampil}</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div><div className="text-xs font-bold">Nama Bahan</div><input value={quick.nama_bahan} disabled className="w-full p-2 border rounded bg-white text-sm" /></div>
            <div><div className="text-xs font-bold">Kode Fix</div><input value={quick._kode_fix} disabled className="w-full p-2 border rounded bg-white text-sm font-bold" /></div>
            <div><div className="text-xs font-bold">Point C: Prefix Hall/Orgk (Bisa Ubah BERAS-001 jadi Hall-BERAS-001)</div>
              <select value={quickPrefix} onChange={e=>setQuickPrefix(e.target.value)} className="w-full p-2 border-2 border-green-500 rounded text-sm font-bold">
                <option value="">Biasa - {quick._kode_fix}-001</option>
                <option value="Hall">Hall- - Hall-{quick._kode_fix}-001 (wajib 19 digit)</option>
                <option value="Orgk">Orgk- - Orgk-{quick._kode_fix}-001 (tanpa halal)</option>
              </select>
            </div>
            
            <div className="bg-purple-50 border-2 border-purple-400 p-2 rounded">
              <div className="text-xs font-bold">Point B: {col1Name} (Merek) - BISA ISI UNTUK BAHAN LAMA</div>
              <input value={quickMerek} onChange={e=>setQuickMerek(e.target.value)} placeholder={`Ex: Sania, Rose Brand - ${col1Name}`} className="w-full p-2 border-2 border-purple-500 rounded text-sm font-bold mt-1" autoFocus />
              <div className="text-[10px] mt-1">Isi Merek untuk bahan lama BERAS-001 yang sudah ada tanpa Delete</div>
            </div>
            
            <div className="bg-yellow-50 border-2 border-yellow-400 p-2 rounded">
              <div className="text-xs font-bold">Point B: {col2Name} / ID Halal 19 digit - BISA ISI UNTUK BAHAN LAMA</div>
              <input value={quickIdHalal} onChange={e=>{setQuickIdHalal(e.target.value); setQuickCustom2(e.target.value);}} placeholder={quickPrefix==="Hall" ? "Wajib 19 digit angka" : "Optional - kosongkan untuk Orgk"} className="w-full p-2 border-2 border-yellow-500 rounded text-sm mt-1" maxLength={19} />
              <div className="text-[10px] mt-1">{quickPrefix==="Hall" ? "Hall- wajib 19 digit" : "Orgk- tanpa halal boleh kosong"}</div>
            </div>

            <div className="bg-white border p-2 rounded">
              <div className="text-xs">Kode Lama</div>
              <input value={quickKodeLama} onChange={e=>setQuickKodeLama(e.target.value)} placeholder={quick.kode_bahan} className="w-full p-2 border rounded text-sm mt-1" />
              <div className="text-[10px]">Otomatis: {quick.kode_bahan}</div>
            </div>

            <div><div className="text-xs font-bold">Tambah Stock (10+5=15)</div><input type="number" value={quickStock} onChange={e=>setQuickStock(e.target.value)} placeholder={`Stock sekarang ${quick.stok}`} className="w-full p-2 border-2 border-blue-400 rounded text-sm" /></div>
            <div><div className="text-xs font-bold">Harga Baru</div><input type="number" value={quickHarga} onChange={e=>setQuickHarga(e.target.value)} className="w-full p-2 border-2 border-yellow-400 rounded text-sm bg-yellow-50" /></div>
            <div><div className="text-xs">Kode Final Nanti</div><input value={quickPrefix ? `${quickPrefix}-${quick._kode_fix}-${quick._nomor}` : `${quick._kode_fix}-${quick._nomor}`} disabled className="w-full p-2 border-2 border-green-500 rounded text-sm font-mono font-bold bg-green-50" /></div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleUpdate} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded font-bold text-sm">💾 Update Bahan Lama + Merek + Hall/Orgk + ID Halal (Tanpa Delete)</button>
            <button onClick={()=>handleDelete(quick)} className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-bold">🗑️ Delete</button>
            <button onClick={()=>setQuick(null)} className="px-4 py-3 bg-gray-200 rounded text-sm">Batal</button>
          </div>
          <div className="text-[10px] text-gray-600 mt-2">V15.1 FIX: Sekarang Edit bahan lama BERAS-001 yang sudah ada bisa langsung isi Merek Sania + jadi Hall-BERAS-001 + ID Halal 19 digit tanpa harus Delete dulu</div>
        </div>
      )}

      <div className="bg-white rounded-b-xl border">
        {masterKategori.map((katObj,i)=>{
          const kat = katObj.nama;
          const list = grouped[kat] || [];
          const isOpen = expanded[kat]!==false;
          return (
            <div key={kat} className="border-b last:border-0">
              <div className="p-3 font-bold text-sm flex justify-between items-center bg-slate-50">
                <div className="cursor-pointer flex-1" onClick={()=>setExpanded(prev=>({...prev, [kat]: !isOpen}))}>{i+1} &nbsp; {kat} - {list.length} bahan {isOpen?"▼":"▶"}</div>
                <div className="flex gap-2 items-center">
                  <button onClick={()=>handleTambahPerKategori(kat)} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold">+ Tambah {kat}</button>
                  <button onClick={()=>setExpanded(prev=>({...prev, [kat]: !isOpen}))} className="text-xs bg-white border px-2 py-1 rounded">{isOpen?"Tutup":"Buka"}</button>
                </div>
              </div>
              {isOpen && (
                <div className="overflow-auto">
                  {list.length===0 ? <div className="p-4 text-center text-xs text-gray-400">Belum ada bahan di {kat}</div> : (
                  <table className="w-full text-sm">
                    <thead className="bg-white text-xs"><tr><th className="text-left p-2">No</th><th className="text-left p-2">Kode (Hall/Orgk)</th><th className="text-left p-2">Nama</th><th className="text-left p-2">Kategori</th><th className="text-left p-2">{col1Name} (Merek)</th><th className="text-left p-2">{col2Name}</th><th className="text-left p-2">ID Halal</th><th className="text-left p-2">Stock</th><th className="text-left p-2">Aksi</th></tr></thead>
                    <tbody>
                      {list.map(it=>(
                        <tr key={it.kode_bahan} className="border-t hover:bg-blue-50">
                          <td className="p-2 text-xs">{String(it._no).padStart(3,"0")}</td>
                          <td className="p-2 font-mono text-xs font-bold">{it._kode_tampil}</td>
                          <td className="p-2 font-semibold cursor-pointer" onClick={()=>handleClickNama(it)}>{it.nama_bahan} <span className="text-[10px] text-blue-600">↗ Edit Merek</span></td>
                          <td className="p-2 text-[11px]">{it._utama}</td>
                          <td className="p-2 text-xs bg-purple-50 font-bold">{it.custom_value_1 || <span className="text-gray-400">- belum isi (klik Edit)</span>}</td>
                          <td className="p-2 text-xs">{it.custom_value_2 || "-"}</td>
                          <td className="p-2 text-[10px] font-mono">{it.id_halal_19 ? `${String(it.id_halal_19).substring(0,4)}...${String(it.id_halal_19).length}D` : "-"}</td>
                          <td className="p-2"><span className="bg-blue-100 px-2 py-1 rounded-full text-xs">{it.stok}</span></td>
                          <td className="p-2 flex gap-1">
                            <button onClick={()=>handleClickNama(it)} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Edit Merek</button>
                            <button onClick={()=>handleDelete(it)} className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
