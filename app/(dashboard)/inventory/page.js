"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

const KATEGORI_MASTER = [
  { no: 1, nama: "Bahan Baku Utama", kode: "BERAS" },
  { no: 2, nama: "Bahan Kemasan", kode: "BOX" },
  { no: 3, nama: "Bahan Pembersih", kode: "BERSIH" },
  { no: 4, nama: "Bahan Hewani", kode: "HEWANI" },
  { no: 5, nama: "Bahan Nabati", kode: "NABATI" },
  { no: 6, nama: "Bahan Hewani Non Sembelihan", kode: "HNS" },
  { no: 7, nama: "Bahan Susu", kode: "SUSU" },
  { no: 8, nama: "Bahan Fermentasi Alami", kode: "FERMENTASI" },
  { no: 9, nama: "Bahan Minyak dan Lemak", kode: "MINYAK" },
  { no: 10, nama: "Bahan Bumbu Instan", kode: "BUMBU" },
  { no: 11, nama: "Bahan Sayuran", kode: "SAYUR" },
  { no: 12, nama: "Bahan Buah Segar", kode: "BUAH" },
  { no: 13, nama: "Bahan Penyedap Rasa", kode: "PENYEDAP" },
  { no: 14, nama: "Bahan Rempah Alami", kode: "REMPAH" },
  { no: 15, nama: "Bahan Pelengkap", kode: "PELENGKAP" },
];
const SATUAN_OPTIONS = ["Kg","Pcs","Box","Btl","Liter","Gram","Pack","Sachet"];
function generateHalalId(){ let n=""; for(let i=0;i<17;i++) n+=Math.floor(Math.random()*10); return "ID"+n; }
function formatRp(v){ const num=Number(v||0); return "Rp "+num.toLocaleString("id-ID"); }

export default function InventoryV10FixFinal(){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");
  const [expanded,setExpanded]=useState({ "Bahan Baku Utama": true });
  // General Add
  const [showGeneralAdd,setShowGeneralAdd]=useState(false);
  const [generalNama,setGeneralNama]=useState("");
  const [generalCatId,setGeneralCatId]=useState(KATEGORI_MASTER[0].nama);
  const [generalSatuan,setGeneralSatuan]=useState("Kg");
  const [generalStock,setGeneralStock]=useState(0);
  const [generalHarga,setGeneralHarga]=useState(0);
  const [generalJenis,setGeneralJenis]=useState("Regular");
  const [generalHalalId,setGeneralHalalId]=useState(generateHalalId());
  // Delete
  const [showGeneralDel,setShowGeneralDel]=useState(false);
  const [delSearch,setDelSearch]=useState("");
  // Per kategori quick add - JALUR CEPAT UPDATE STOCK/HARGA
  const [perCatAdd,setPerCatAdd]=useState({}); // {kat: {show, nama, stock, harga, satuan, jenis, halal_id, editMode, originalKode}}
  // Edit Modal
  const [showEdit,setShowEdit]=useState(false);
  const [editItem,setEditItem]=useState(null);
  const [editKode,setEditKode]=useState("");
  const [editHalalId,setEditHalalId]=useState("");
  const [editStock,setEditStock]=useState(0);
  const [editHarga,setEditHarga]=useState(0);
  const [editSatuan,setEditSatuan]=useState("Kg");
  const [editNama,setEditNama]=useState("");

  useEffect(()=>{ fetchItems(); },[]);

  async function fetchItems(){
    setLoading(true);
    // FIX: hanya select kolom yang pasti ada, tidak pakai 'kode' atau 'nama' lama
    const { data, error } = await supabase.from("inventory_items").select("*").order("kode_bahan",{ascending:true});
    if(error){ console.error(error); setItems([]); } else setItems(data||[]);
    setLoading(false);
  }

  const grouped=useMemo(()=>{
    const g={}; KATEGORI_MASTER.forEach(k=>g[k.nama]=[]);
    items.forEach(it=>{
      const kode=(it.kode_bahan||"").toString();
      const kat = KATEGORI_MASTER.find(k=> (it.kategori||"").includes(k.nama) || kode.includes(k.kode))?.nama || it.kategori || KATEGORI_MASTER[0].nama;
      if(!g[kat]) g[kat]=[]; g[kat].push(it);
    });
    if(search){
      Object.keys(g).forEach(k=>{
        g[k]=g[k].filter(i=> (i.nama_bahan||"").toLowerCase().includes(search.toLowerCase()) || (i.kode_bahan||"").toLowerCase().includes(search.toLowerCase()) || (i.halal_id||"").toLowerCase().includes(search.toLowerCase()));
      });
    }
    return g;
  },[items,search]);

  function getNextNo(katNama){
    const list=grouped[katNama]||[];
    const max=list.reduce((m,it)=>{ const mm=(it.kode_bahan||"").match(/-(\d+)$/); return mm? Math.max(m,parseInt(mm[1])):m; },0);
    return max+1;
  }
  function getKodeBase(katNama,no){
    const master=KATEGORI_MASTER.find(k=>k.nama===katNama);
    return `${master.kode}-${String(no).padStart(3,"0")}`;
  }
  function getKodeWithJenis(katNama,no,jenis){
    const base=getKodeBase(katNama,no);
    if(jenis==="Hall") return `Hall-${base}`;
    if(jenis==="Orgk") return `Orgk-${base}`;
    return base;
  }

  const generalNextNo=useMemo(()=>getNextNo(generalCatId),[grouped,generalCatId]);
  const generalNextKode=useMemo(()=>getKodeWithJenis(generalCatId,generalNextNo,generalJenis),[generalCatId,generalNextNo,generalJenis]);

  async function handleGeneralAdd(){
    if(!generalNama.trim()) return alert("Nama bahan wajib");
    const sNum=Number(generalStock)||0; const hNum=Number(generalHarga)||0;
    // cek duplikat
    const list=grouped[generalCatId]||[];
    const dup=list.find(i=> i.nama_bahan.toLowerCase()===generalNama.trim().toLowerCase());
    if(dup){
      // UPDATE STOCK & HARGA - payload HANYA kolom yang ada (tanpa 'kode')
      const payload={
        name: dup.nama_bahan,
        nama_bahan: dup.nama_bahan,
        satuan: generalSatuan,
        stok: sNum,
        stock: sNum,
        harga_beli: hNum || dup.harga_beli,
        harga_baru: hNum || dup.harga_beli,
        halal_id: generalJenis==="Hall" ? generalHalalId : dup.halal_id
      };
      const {error}=await supabase.from("inventory_items").update(payload).eq("kode_bahan",dup.kode_bahan);
      if(error){ alert("Update error: "+error.message); return; }
    } else {
      const newItem={
        name: generalNama.trim(),
        kode_bahan: generalNextKode,
        nama_bahan: generalNama.trim(),
        kategori: generalCatId,
        sub_kategori: generalNama.trim(),
        satuan: generalSatuan,
        stok: sNum,
        stock: sNum,
        harga_beli: hNum,
        harga_awal: hNum,
        harga_baru: hNum,
        harga_lama: hNum,
        selisih_harga: 0,
        stok_baru: sNum,
        selisih_stok: sNum,
        supplier: "Supplier Umum",
        halal_id: generalJenis==="Hall" ? generalHalalId : null
      };
      const {error}=await supabase.from("inventory_items").insert([newItem]);
      if(error){ alert("Insert error: "+error.message); return; }
    }
    setShowGeneralAdd(false); setGeneralNama(""); setGeneralStock(0); setGeneralHarga(0); setGeneralHalalId(generateHalalId());
    setExpanded(prev=>({...prev,[generalCatId]:true})); fetchItems();
  }

  async function handleDelete(kode_bahan){
    if(!confirm(`Hapus ${kode_bahan}?`)) return;
    const {error}=await supabase.from("inventory_items").delete().eq("kode_bahan",kode_bahan);
    if(error) alert(error.message); else fetchItems();
  }

  // FIX EDIT - tanpa kolom 'kode' biar tidak error schema cache
  function openEdit(it){
    setEditItem(it);
    setEditKode(it.kode_bahan);
    setEditHalalId(it.halal_id||generateHalalId());
    setEditStock(Number(it.stok||0));
    setEditHarga(Number(it.harga_beli||0));
    setEditSatuan(it.satuan||"Kg");
    setEditNama(it.nama_bahan);
    setShowEdit(true);
  }
  async function handleEditSave(){
    if(!editItem) return;
    const isHall=editKode.startsWith("Hall-");
    if(isHall && (!editHalalId.startsWith("ID") || editHalalId.length!==19)){
      alert("ID Halal harus 19 digit contoh ID32110078778290726"); return;
    }
    // PAYLOAD HANYA kolom valid, TIDAK ada 'kode' agar tidak error "Could not find the 'kode' column"
    const payload={
      name: editNama,
      kode_bahan: editKode,
      nama_bahan: editNama,
      satuan: editSatuan,
      stok: Number(editStock),
      stock: Number(editStock),
      harga_beli: Number(editHarga),
      harga_baru: Number(editHarga),
      halal_id: isHall ? editHalalId : null
    };
    const {error}=await supabase.from("inventory_items").update(payload).eq("kode_bahan",editItem.kode_bahan);
    if(error){ alert("Edit error: "+error.message); return; }
    setShowEdit(false); fetchItems();
  }

  // QUICK ADD PER KATEGORI - JALUR CEPAT UPDATE STOCK/HARGA
  function handleRowClickForQuickUpdate(katNama, it){
    // Klik baris nama bahan -> auto isi form tambah cepat
    setExpanded(prev=>({...prev,[katNama]:true}));
    setPerCatAdd(prev=>({
      ...prev,
      [katNama]: {
        show: true,
        nama: it.nama_bahan,
        satuan: it.satuan||"Kg",
        stock: Number(it.stok||0),
        harga: Number(it.harga_beli||0),
        jenis: it.kode_bahan.startsWith("Hall-") ? "Hall" : it.kode_bahan.startsWith("Orgk-") ? "Orgk" : "Regular",
        halal_id: it.halal_id||generateHalalId(),
        editMode: true,
        originalKode: it.kode_bahan
      }
    }));
  }

  async function handlePerCatAdd(katNama){
    const state=perCatAdd[katNama];
    if(!state?.nama?.trim()) return alert("Nama wajib");
    const sNum=Number(state.stock||0); const hNum=Number(state.harga||0);
    const list=grouped[katNama]||[];
    
    if(state.editMode && state.originalKode){
      // UPDATE MODE - klik dari baris
      const dup=list.find(i=> i.kode_bahan===state.originalKode);
      if(dup){
        const payload={
          name: state.nama.trim(),
          nama_bahan: state.nama.trim(),
          satuan: state.satuan,
          stok: sNum,
          stock: sNum,
          harga_beli: hNum||dup.harga_beli,
          harga_baru: hNum||dup.harga_beli,
          halal_id: state.jenis==="Hall" ? state.halal_id : null
        };
        const {error}=await supabase.from("inventory_items").update(payload).eq("kode_bahan",state.originalKode);
        if(error){ alert(error.message); return; }
        setPerCatAdd(prev=>({...prev,[katNama]:{show:false}})); fetchItems(); return;
      }
    }
    // INSERT BARU
    const nextNo=getNextNo(katNama);
    const kode=getKodeWithJenis(katNama,nextNo,state.jenis||"Regular");
    const dup=list.find(i=> i.nama_bahan.toLowerCase()===state.nama.trim().toLowerCase());
    if(dup){
      const payload={ name: dup.nama_bahan, satuan: state.satuan, stok: sNum, stock: sNum, harga_beli: hNum||dup.harga_beli, harga_baru: hNum||dup.harga_beli, halal_id: state.jenis==="Hall"? state.halal_id: null };
      const {error}=await supabase.from("inventory_items").update(payload).eq("kode_bahan",dup.kode_bahan);
      if(!error){ setPerCatAdd(prev=>({...prev,[katNama]:{show:false}})); fetchItems(); } else alert(error.message);
      return;
    }
    const newItem={
      name: state.nama.trim(),
      kode_bahan: kode,
      nama_bahan: state.nama.trim(),
      kategori: katNama,
      sub_kategori: state.nama.trim(),
      satuan: state.satuan||"Kg",
      stok: sNum,
      stock: sNum,
      harga_beli: hNum,
      harga_awal: hNum,
      harga_baru: hNum,
      supplier: "Supplier Umum",
      halal_id: state.jenis==="Hall"? state.halal_id||generateHalalId(): null
    };
    const {error}=await supabase.from("inventory_items").insert([newItem]);
    if(!error){ setPerCatAdd(prev=>({...prev,[katNama]:{show:false}})); fetchItems(); } else alert(error.message);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-slate-900 text-white p-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-bold text-lg">Master Bahan Sikitchen - 15 Kategori - V10 Fix Final</h1>
          <div className="text-xs text-slate-300 mt-1">Live: {items.length} bahan • Edit kode Hall/Orgk + ID Halal 19 digit • Klik nama bahan untuk update cepat stock/harga</div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <button onClick={()=>{setGeneralJenis("Regular"); setGeneralHalalId(generateHalalId()); setShowGeneralAdd(true);}} className="bg-green-600 px-4 py-2 rounded-lg font-semibold">+ Tambah Bahan General</button>
            <button onClick={()=>setShowGeneralDel(true)} className="bg-red-600 px-4 py-2 rounded-lg font-semibold">Hapus Bahan General</button>
            <button onClick={()=>{const e={}; KATEGORI_MASTER.forEach(k=>e[k.nama]=true); setExpanded(e);}} className="bg-slate-700 px-3 py-2 rounded text-sm">Buka Semua</button>
            <button onClick={()=>setExpanded({"Bahan Baku Utama":true})} className="bg-slate-700 px-3 py-2 rounded text-sm">Tutup Semua</button>
            <button onClick={fetchItems} className="bg-blue-600 px-3 py-2 rounded text-sm">↻ Refresh</button>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari kode / nama / ID Halal... ex: BERAS, Hall-BERAS-005, ID3211..." className="w-full mt-3 px-3 py-2 rounded-lg text-black" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* General Add - DENGAN INPUT ID HALAL */}
        {showGeneralAdd && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-3xl p-6 max-h-[95vh] overflow-auto">
              <div className="flex justify-between items-center mb-3"><h2 className="font-bold text-lg">+ Tambah Bahan General</h2><button onClick={()=>setShowGeneralAdd(false)} className="bg-gray-100 px-3 py-1 rounded">✕</button></div>
              <div className="space-y-3">
                <div><label className="text-xs font-bold">KETIK NAMA BAHAN</label><input value={generalNama} onChange={e=>setGeneralNama(e.target.value)} placeholder="Contoh: beras premium halal" className="w-full border-2 border-green-300 rounded-lg px-3 py-2 mt-1" /></div>
                <div><label className="text-xs font-bold">KATEGORI UTAMA (15)</label><select value={generalCatId} onChange={e=>setGeneralCatId(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1">{KATEGORI_MASTER.map(k=><option key={k.nama} value={k.nama}>{k.nama} ({k.kode}) • {(grouped[k.nama]||[]).length} bahan</option>)}</select></div>
                <div><label className="text-xs font-bold">JENIS KODE - Regular / Hall (Halal) / Orgk (Organik)</label>
                  <div className="flex gap-2 mt-1">
                    {["Regular","Hall","Orgk"].map(j=><button key={j} onClick={()=>{setGeneralJenis(j); if(j==="Hall") setGeneralHalalId(generateHalalId());}} className={`flex-1 py-2 rounded-lg border font-bold text-sm ${generalJenis===j? j==="Hall"?"bg-emerald-600 text-white": j==="Orgk"?"bg-lime-600 text-white":"bg-slate-800 text-white":"bg-gray-100"}`}>{j==="Regular"?"Regular": j==="Hall"?"Hall - Halal":"Orgk - Organik"}</button>)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 border rounded p-2"><div className="text-xs">NO URUT</div><div className="font-bold text-lg">{String(generalNextNo).padStart(3,"0")}</div></div>
                  <div className="bg-green-50 border rounded p-2"><div className="text-xs">KODE BAHAN (AUTO)</div><div className="font-bold text-lg text-green-700">{generalNextKode}</div><div className="text-[10px]">Hall-BERAS-005 = Halal, Orgk-IKAN-001 = Organik</div></div>
                </div>
                {/* INPUT ID HALAL - BARU V10 */}
                {generalJenis==="Hall" && (
                  <div className="bg-emerald-50 border-2 border-emerald-300 rounded-lg p-3">
                    <label className="text-xs font-bold text-emerald-800">NOMOR ID HALAL 19 DIGIT - Format ID + 17 angka (Contoh: ID32110078778290726)</label>
                    <div className="text-[10px] text-emerald-700 mb-1">Jika kode Hall-BERAS-005 maka kolom ID Halal tampil. Jika Orgk-IKAN-001 maka tidak tampil.</div>
                    <div className="flex gap-2">
                      <input value={generalHalalId} onChange={e=>setGeneralHalalId(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 font-mono text-sm" placeholder="ID32110078778290726" />
                      <button onClick={()=>setGeneralHalalId(generateHalalId())} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Generate ID</button>
                    </div>
                  </div>
                )}
                {generalJenis==="Orgk" && <div className="bg-lime-50 border border-lime-200 rounded p-2 text-xs">Organik tidak perlu ID Halal - kolom ID Halal akan tampil - </div>}
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs">Nama Final</label><input value={generalNama} onChange={e=>setGeneralNama(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="Nama final" /></div>
                  <div><label className="text-xs">Satuan</label><select value={generalSatuan} onChange={e=>setGeneralSatuan(e.target.value)} className="w-full border rounded-lg px-3 py-2">{SATUAN_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-bold">Stock Awal (biru)</label><input type="number" value={generalStock} onChange={e=>setGeneralStock(e.target.value)} className="w-full border-2 border-blue-400 bg-blue-50 rounded-lg px-3 py-3 text-lg font-bold" placeholder="0" /></div>
                  <div><label className="text-xs font-bold">Harga Beli (kuning)</label><input type="number" value={generalHarga} onChange={e=>setGeneralHarga(e.target.value)} className="w-full border-2 border-yellow-400 bg-yellow-50 rounded-lg px-3 py-3 text-lg font-bold" placeholder="0" /></div>
                </div>
                <div className="flex gap-2"><button onClick={()=>setShowGeneralAdd(false)} className="flex-1 bg-gray-200 py-3 rounded-lg font-bold">Batal</button><button onClick={handleGeneralAdd} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold">Simpan {generalNextKode}</button></div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal - FIX tanpa 'kode' */}
        {showEdit && editItem && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl w-full max-w-xl p-6">
            <div className="flex justify-between items-center mb-3"><h2 className="font-bold">Edit Kode & ID Halal - {editItem.kode_bahan}</h2><button onClick={()=>setShowEdit(false)} className="bg-gray-100 px-3 py-1 rounded">✕</button></div>
            <div className="space-y-3">
              <div><label className="text-xs font-bold">Nama Bahan</label><input value={editNama} onChange={e=>setEditNama(e.target.value)} className="w-full border rounded-lg px-3 py-2" /></div>
              <div><label className="text-xs font-bold">Kode Bahan - Edit jadi Hall-BERAS-005 atau Orgk-IKAN-001</label><input value={editKode} onChange={e=>setEditKode(e.target.value)} className="w-full border-2 border-slate-400 rounded-lg px-3 py-2 font-mono font-bold" placeholder="Hall-BERAS-005" /></div>
              {editKode.startsWith("Hall-") && <div className="bg-emerald-50 border-2 border-emerald-300 rounded-lg p-3"><label className="text-xs font-bold text-emerald-800">ID HALAL 19 DIGIT - ID32110078778290726</label><div className="flex gap-2 mt-1"><input value={editHalalId} onChange={e=>setEditHalalId(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 font-mono text-sm" /><button onClick={()=>setEditHalalId(generateHalalId())} className="bg-emerald-600 text-white px-3 py-2 rounded text-sm">Generate</button></div></div>}
              <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold">Stock</label><input type="number" value={editStock} onChange={e=>setEditStock(e.target.value)} className="w-full border-2 border-blue-400 bg-blue-50 rounded-lg px-3 py-2 font-bold" /></div><div><label className="text-xs font-bold">Harga Beli</label><input type="number" value={editHarga} onChange={e=>setEditHarga(e.target.value)} className="w-full border-2 border-yellow-400 bg-yellow-50 rounded-lg px-3 py-2 font-bold" /></div></div>
              <div><label className="text-xs">Satuan</label><select value={editSatuan} onChange={e=>setEditSatuan(e.target.value)} className="w-full border rounded-lg px-3 py-2">{SATUAN_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
              <div className="flex gap-2"><button onClick={()=>setShowEdit(false)} className="flex-1 bg-gray-200 py-3 rounded font-bold">Batal</button><button onClick={handleEditSave} className="flex-1 bg-blue-600 text-white py-3 rounded font-bold">Update {editKode}</button></div>
            </div>
          </div></div>
        )}

        {showGeneralDel && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4"><h2 className="font-bold">Hapus Bahan General</h2><button onClick={()=>setShowGeneralDel(false)}>✕</button></div>
            <input value={delSearch} onChange={e=>setDelSearch(e.target.value)} placeholder="Ketik nama bahan..." className="w-full border rounded px-3 py-2 mb-3" />
            <div className="space-y-2 max-h-96 overflow-auto">{items.filter(i=>!delSearch || i.nama_bahan.toLowerCase().includes(delSearch.toLowerCase()) || i.kode_bahan.toLowerCase().includes(delSearch.toLowerCase())).slice(0,30).map(it=><div key={it.kode_bahan} className="flex justify-between items-center border p-2 rounded"><div><div className="font-bold text-sm">{it.kode_bahan} - {it.nama_bahan}</div><div className="text-xs text-gray-500">{it.kategori} {it.halal_id? `• ${it.halal_id}`:""}</div></div><button onClick={()=>handleDelete(it.kode_bahan)} className="bg-red-600 text-white px-3 py-1 rounded text-sm">Delete</button></div>)}</div>
          </div></div>
        )}

        <div className="space-y-3">
          {KATEGORI_MASTER.map(kat=>{
            const list=grouped[kat.nama]||[]; const isExp=expanded[kat.nama];
            const perState=perCatAdd[kat.nama]||{show:false, nama:"", satuan:"Kg", stock:0, harga:0, jenis:"Regular", halal_id: generateHalalId(), editMode:false, originalKode:null};
            return (
              <div key={kat.nama} className="bg-white rounded-xl shadow-sm border">
                <div className="flex justify-between items-center p-4 cursor-pointer" onClick={()=>setExpanded(prev=>({...prev,[kat.nama]:!prev[kat.nama]}))}>
                  <div className="flex items-center gap-3"><div className="bg-slate-800 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">{kat.no}</div><div><div className="font-bold">{kat.nama} ({kat.kode}) - {list.length} bahan</div><div className="text-xs text-gray-500">Format {kat.kode}-001 / Hall-{kat.kode}-001 / Orgk-{kat.kode}-001 • Klik nama bahan untuk update cepat</div></div></div>
                  <div className="flex gap-2" onClick={e=>e.stopPropagation()}><button onClick={()=>{setPerCatAdd(prev=>({...prev,[kat.nama]:{show:true, nama:"", satuan:"Kg", stock:0, harga:0, jenis:"Regular", halal_id: generateHalalId(), editMode:false, originalKode:null}})); setExpanded(prev=>({...prev,[kat.nama]:true}));}} className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold">+ Tambah Cepat</button><span className="text-gray-400">{isExp?"▲":"▼"}</span></div>
                </div>
                {isExp && <div className="p-4 border-t">
                  {/* FORM TAMBAH CEPAT - JALUR CEPAT UPDATE STOCK/HARGA - DIPERJELAS */}
                  {perState.show && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 p-4 rounded-xl mb-4">
                      <div className="flex justify-between items-center mb-3">
                        <div className="font-bold text-green-800">{perState.editMode? `🔄 Update Cepat: ${perState.originalKode}` : `➕ Tambah Cepat ke ${kat.nama}`}</div>
                        <div className="text-xs bg-white px-2 py-1 rounded border">No {String(getNextNo(kat.nama)).padStart(3,"0")} • Kode {getKodeWithJenis(kat.nama,getNextNo(kat.nama),perState.jenis)}</div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div className="md:col-span-2">
                          <label className="text-xs font-bold">Nama Bahan {perState.editMode && "(dari klik baris)"}</label>
                          <input value={perState.nama} onChange={e=>setPerCatAdd(prev=>({...prev,[kat.nama]:{...prev[kat.nama], nama:e.target.value}}))} placeholder="Nama bahan" className="w-full border-2 border-slate-300 rounded-lg px-3 py-2 mt-1 font-semibold" />
                        </div>
                        <div>
                          <label className="text-xs font-bold">Jenis Kode</label>
                          <select value={perState.jenis} onChange={e=>setPerCatAdd(prev=>({...prev,[kat.nama]:{...prev[kat.nama], jenis:e.target.value}}))} className="w-full border rounded-lg px-2 py-2 mt-1 text-sm">
                            <option value="Regular">Regular</option><option value="Hall">Hall - Halal</option><option value="Orgk">Orgk - Organik</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold">Stock Baru (biru)</label>
                          <input type="number" value={perState.stock} onChange={e=>setPerCatAdd(prev=>({...prev,[kat.nama]:{...prev[kat.nama], stock:e.target.value}}))} placeholder="0" className="w-full border-2 border-blue-400 bg-blue-50 rounded-lg px-3 py-2 mt-1 font-bold text-lg" />
                        </div>
                        <div>
                          <label className="text-xs font-bold">Harga Baru (kuning)</label>
                          <input type="number" value={perState.harga} onChange={e=>setPerCatAdd(prev=>({...prev,[kat.nama]:{...prev[kat.nama], harga:e.target.value}}))} placeholder="0" className="w-full border-2 border-yellow-400 bg-yellow-50 rounded-lg px-3 py-2 mt-1 font-bold text-lg" />
                        </div>
                      </div>
                      {perState.jenis==="Hall" && <div className="mt-3 bg-emerald-50 border border-emerald-300 rounded-lg p-2 flex gap-2"><input value={perState.halal_id} onChange={e=>setPerCatAdd(prev=>({...prev,[kat.nama]:{...prev[kat.nama], halal_id:e.target.value}}))} placeholder="ID32110078778290726" className="flex-1 border rounded px-2 py-1 font-mono text-xs" /><button onClick={()=>setPerCatAdd(prev=>({...prev,[kat.nama]:{...prev[kat.nama], halal_id: generateHalalId()}}))} className="bg-emerald-600 text-white px-3 py-1 rounded text-xs">Generate Halal ID</button></div>}
                      <div className="flex gap-2 mt-3">
                        <button onClick={()=>handlePerCatAdd(kat.nama)} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold">{perState.editMode? `Update Stock & Harga - ${perState.originalKode}` : `Simpan ${getKodeWithJenis(kat.nama,getNextNo(kat.nama),perState.jenis)}`}</button>
                        <button onClick={()=>setPerCatAdd(prev=>({...prev,[kat.nama]:{show:false}}))} className="bg-gray-200 px-6 py-2 rounded-lg font-bold">Batal</button>
                      </div>
                    </div>
                  )}

                  <div className="overflow-auto"><table className="w-full text-sm"><thead><tr className="text-gray-500 border-b text-xs"><th className="text-left p-2">No</th><th className="text-left p-2">Kode Bahan</th><th className="text-left p-2">Nama Bahan (klik untuk update cepat)</th><th className="text-left p-2">ID Halal 19 digit</th><th className="text-left p-2">Stock</th><th className="text-left p-2">Harga Beli</th><th className="text-left p-2">Harga Baru</th><th className="text-left p-2">Selisih</th><th className="text-left p-2">Aksi</th></tr></thead>
                    <tbody>{list.map(it=>{const kode=it.kode_bahan||""; const m=kode.match(/-(\d+)$/); const no=m?m[1]:"-"; const isHall=kode.startsWith("Hall-"); return (<tr key={kode} className="border-b hover:bg-blue-50"><td className="p-2">{no}</td><td className="p-2 font-mono text-xs font-bold">{kode}</td><td className="p-2 font-semibold cursor-pointer hover:text-blue-600 hover:underline" onClick={()=>handleRowClickForQuickUpdate(kat.nama,it)} title="Klik untuk update cepat stock/harga">{it.nama_bahan} <span className="text-[10px] text-blue-500">↗ klik</span></td><td className="p-2">{isHall? <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-mono border border-emerald-200">{it.halal_id||"ID32110078778290726"}</span>: <span className="text-gray-400">-</span>}</td><td className="p-2"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">{it.stok||0}</span></td><td className="p-2 text-xs">{formatRp(it.harga_beli)}</td><td className="p-2 text-xs">{formatRp(it.harga_baru||it.harga_beli)}</td><td className="p-2 text-xs">{Number(it.selisih_harga||0)!==0? formatRp(it.selisih_harga):"0"}</td><td className="p-2 flex gap-1"><button onClick={()=>openEdit(it)} className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs border">Edit</button><button onClick={()=>handleDelete(kode)} className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs">Delete</button></td></tr>);})}{list.length===0 && <tr><td colSpan={9} className="p-4 text-center text-gray-400">Belum ada bahan</td></tr>}</tbody></table></div>
                </div>}
              </div>
            );
          })}
        </div>
        {loading && <div className="text-center p-8">Loading...</div>}
      </div>
    </div>
  );
}
