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

export default function InventoryPageV9Fix(){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");
  const [expanded,setExpanded]=useState({ "Bahan Baku Utama": true });
  const [showGeneralAdd,setShowGeneralAdd]=useState(false);
  const [generalNama,setGeneralNama]=useState("");
  const [generalCatId,setGeneralCatId]=useState(KATEGORI_MASTER[0].nama);
  const [generalSatuan,setGeneralSatuan]=useState("Kg");
  const [generalStock,setGeneralStock]=useState(0);
  const [generalHarga,setGeneralHarga]=useState(0);
  const [generalJenis,setGeneralJenis]=useState("Regular");
  const [generalHalalId,setGeneralHalalId]=useState(generateHalalId());
  const [showGeneralDel,setShowGeneralDel]=useState(false);
  const [delSearch,setDelSearch]=useState("");
  const [perCatAdd,setPerCatAdd]=useState({});
  const [showEdit,setShowEdit]=useState(false);
  const [editItem,setEditItem]=useState(null);
  const [editKode,setEditKode]=useState("");
  const [editHalalId,setEditHalalId]=useState("");
  const [editStock,setEditStock]=useState(0);
  const [editHarga,setEditHarga]=useState(0);
  const [editSatuan,setEditSatuan]=useState("Kg");
  const [editNama,setEditNama]=useState("");
  const [debugInfo,setDebugInfo]=useState("");

  useEffect(()=>{ fetchItems(); },[]);

  async function fetchItems(){
    setLoading(true);
    setDebugInfo("Fetching...");
    // FIX BACA: coba baca semua kolom, kompatibel lama & baru
    // 1. coba inventory_items (master 15 kategori)
    let { data, error } = await supabase.from("inventory_items").select("*").order("kode_bahan",{ascending:true});
    if(error){
      setDebugInfo("Error inventory_items: "+error.message+" - coba bahan_baku");
      // fallback tabel lama bahan_baku jika ada
      const res2 = await supabase.from("bahan_baku").select("*").order("kode_bahan",{ascending:true});
      if(!res2.error){ data=res2.data; error=null; setDebugInfo("Fallback bahan_baku: "+(data?.length||0)+" bahan"); }
      else {
        // fallback terakhir: tanpa order
        const res3 = await supabase.from("inventory_items").select("*");
        if(!res3.error){ data=res3.data; setDebugInfo("Fallback tanpa order: "+(data?.length||0)); error=null; }
        else { setDebugInfo("Gagal total: "+res3.error.message); data=[]; }
      }
    } else {
      setDebugInfo(`Live: ${data?.length||0} bahan (sebelumnya 16, sekarang ${data?.length||0})`);
    }
    setItems(data||[]);
    setLoading(false);
  }

  const grouped=useMemo(()=>{
    const g={}; KATEGORI_MASTER.forEach(k=>g[k.nama]=[]);
    items.forEach(it=>{
      const kode=(it.kode_bahan||it.kode||"").toString();
      const kat = KATEGORI_MASTER.find(k=> (it.kategori||"").includes(k.nama) || kode.includes(k.kode))?.nama || it.kategori || KATEGORI_MASTER[0].nama;
      if(!g[kat]) g[kat]=[]; g[kat].push(it);
    });
    if(search){
      Object.keys(g).forEach(k=>{
        g[k]=g[k].filter(i=> (i.nama_bahan||i.nama||"").toLowerCase().includes(search.toLowerCase()) || (i.kode_bahan||i.kode||"").toLowerCase().includes(search.toLowerCase()));
      });
    }
    return g;
  },[items,search]);

  function getNextNo(katNama){
    const list=grouped[katNama]||[];
    const max=list.reduce((m,it)=>{ const mm=(it.kode_bahan||it.kode||"").match(/-(\d+)$/); return mm? Math.max(m,parseInt(mm[1])):m; },0);
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
  const generalDuplicate=useMemo(()=>{
    if(!generalNama.trim()) return null;
    const list=grouped[generalCatId]||[];
    return list.find(i=> (i.nama_bahan||i.nama||"").toLowerCase()===generalNama.trim().toLowerCase())||null;
  },[generalNama,grouped,generalCatId]);

  async function handleGeneralAdd(){
    if(!generalNama.trim()) return alert("Nama bahan wajib");
    const sNum=Number(generalStock)||0; const hNum=Number(generalHarga)||0;
    if(generalDuplicate){
      const sLama=Number(generalDuplicate.stok||generalDuplicate.stock||0);
      const hLama=Number(generalDuplicate.harga_beli||generalDuplicate.harga||0);
      if(hNum!==0 && hNum===hLama) alert("Harga sama");
      const payload={ stok:sNum, stock:sNum, harga_beli:hNum||hLama, harga:hNum||hLama, harga_baru:hNum||hLama, harga_lama:hLama, selisih_harga:(hNum||hLama)-hLama, stok_lama:sLama, stok_baru:sNum, selisih_stok:sNum-sLama, satuan:generalSatuan, halal_id: generalJenis==="Hall"? generalHalalId: null };
      const {error}=await supabase.from("inventory_items").update(payload).eq("kode_bahan",generalDuplicate.kode_bahan||generalDuplicate.kode);
      if(error){ alert(error.message); return; }
    } else {
      const newItem={ kode_bahan:generalNextKode, nama_bahan:generalNama.trim(), kategori:generalCatId, sub_kategori:generalNama.trim(), satuan:generalSatuan, stok:sNum, stock:sNum, harga_beli:hNum, harga:hNum, harga_awal:hNum, harga_baru:hNum, harga_lama:hNum, selisih_harga:0, stok_lama:0, stok_baru:sNum, selisih_stok:sNum, supplier:"Supplier Umum", halal_id: generalJenis==="Hall"? generalHalalId: null };
      const {error}=await supabase.from("inventory_items").insert([newItem]);
      if(error){ alert(error.message); return; }
    }
    setShowGeneralAdd(false); setGeneralNama(""); setGeneralStock(0); setGeneralHarga(0);
    setExpanded(prev=>({...prev,[generalCatId]:true})); fetchItems();
  }

  async function handleDelete(kode){
    if(!confirm(`Hapus ${kode}?`)) return;
    const {error}=await supabase.from("inventory_items").delete().eq("kode_bahan",kode);
    if(!error){ fetchItems(); }
    else{
      // fallback jika kolom kode bukan kode_bahan tapi kode
      const {error:err2}=await supabase.from("inventory_items").delete().eq("kode",kode);
      if(!err2) fetchItems(); else alert(error.message);
    }
  }

  function openEdit(it){
    setEditItem(it); setEditKode(it.kode_bahan||it.kode||""); setEditHalalId(it.halal_id||generateHalalId());
    setEditStock(Number(it.stok||it.stock||0)); setEditHarga(Number(it.harga_beli||it.harga||0));
    setEditSatuan(it.satuan||"Kg"); setEditNama(it.nama_bahan||it.nama||""); setShowEdit(true);
  }
  async function handleEditSave(){
    if(!editItem) return;
    const isHall=editKode.startsWith("Hall-"); 
    if(isHall && (!editHalalId.startsWith("ID")||editHalalId.length!==19)){ alert("ID Halal harus 19 digit ID... contoh ID32110078778290726"); return; }
    const payload={ kode_bahan:editKode, kode:editKode, nama_bahan:editNama, nama:editNama, satuan:editSatuan, stok:Number(editStock), stock:Number(editStock), harga_beli:Number(editHarga), harga:Number(editHarga), harga_baru:Number(editHarga), halal_id: isHall? editHalalId: null };
    const {error}=await supabase.from("inventory_items").update(payload).eq("kode_bahan",editItem.kode_bahan||editItem.kode);
    if(error){ alert(error.message); return; }
    setShowEdit(false); fetchItems();
  }

  async function handlePerCatAdd(katNama){
    const state=perCatAdd[katNama]; if(!state?.nama?.trim()) return alert("Nama wajib");
    const nextNo=getNextNo(katNama); const jenis=state.jenis||"Regular"; const kode=getKodeWithJenis(katNama,nextNo,jenis);
    const sNum=Number(state.stock||0); const hNum=Number(state.harga||0);
    const list=grouped[katNama]||[]; const dup=list.find(i=> (i.nama_bahan||i.nama||"").toLowerCase()===state.nama.trim().toLowerCase());
    if(dup){
      const {error}=await supabase.from("inventory_items").update({ stok:sNum, stock:sNum, harga_beli:hNum||dup.harga_beli, harga_baru:hNum||dup.harga_beli, selisih_harga:(hNum||dup.harga_beli)-Number(dup.harga_beli||0), stok_lama:Number(dup.stok||0), stok_baru:sNum, selisih_stok:sNum-Number(dup.stok||0), halal_id: jenis==="Hall"? state.halal_id||generateHalalId(): null }).eq("kode_bahan",dup.kode_bahan||dup.kode);
      if(!error){ setPerCatAdd(prev=>({...prev,[katNama]:{show:false}})); fetchItems(); } else alert(error.message);
      return;
    }
    const newItem={ kode_bahan:kode, nama_bahan:state.nama.trim(), kategori:katNama, sub_kategori:state.nama.trim(), satuan:state.satuan||"Kg", stok:sNum, stock:sNum, harga_beli:hNum, harga:hNum, harga_awal:hNum, harga_baru:hNum, supplier:"Supplier Umum", halal_id: jenis==="Hall"? state.halal_id||generateHalalId(): null };
    const {error}=await supabase.from("inventory_items").insert([newItem]);
    if(!error){ setPerCatAdd(prev=>({...prev,[katNama]:{show:false}})); fetchItems(); } else alert(error.message);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-slate-900 text-white p-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-bold text-lg">Master Bahan Sikitchen - 15 Kategori - V9 Fix Baca - Kelola Tambah Delete</h1>
          <div className="text-xs text-slate-300 mt-1">{debugInfo} • Tabel: {items.length} bahan • Klik Edit untuk ubah, hapus, atau tambah resep</div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <button onClick={()=>{setGeneralJenis("Regular"); setGeneralHalalId(generateHalalId()); setShowGeneralAdd(true);}} className="bg-green-600 px-4 py-2 rounded-lg font-semibold">+ Tambah Bahan General</button>
            <button onClick={()=>setShowGeneralDel(true)} className="bg-red-600 px-4 py-2 rounded-lg font-semibold">Hapus Bahan General</button>
            <button onClick={()=>{const e={}; KATEGORI_MASTER.forEach(k=>e[k.nama]=true); setExpanded(e);}} className="bg-slate-700 px-3 py-2 rounded text-sm">Buka Semua</button>
            <button onClick={()=>setExpanded({"Bahan Baku Utama":true})} className="bg-slate-700 px-3 py-2 rounded text-sm">Tutup Semua</button>
            <button onClick={fetchItems} className="bg-blue-600 px-3 py-2 rounded text-sm">↻ Refresh</button>
          </div>
          <div className="flex gap-2 mt-3">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari kode / nama / kategori... contoh Beras, Hall-BERAS-005, Orgk-IKAN-001" className="flex-1 px-3 py-2 rounded-lg text-black" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {showGeneralAdd && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl w-full max-w-3xl p-6 max-h-[95vh] overflow-auto">
            <div className="flex justify-between items-center mb-3"><h2 className="font-bold text-lg">+ Tambah Bahan General {generalDuplicate?"• DUPLIKAT TERDETEKSI":""}</h2><button onClick={()=>setShowGeneralAdd(false)} className="bg-gray-100 px-3 py-1 rounded">✕</button></div>
            <div className="space-y-3">
              <div><label className="text-xs font-bold">KETIK NAMA BAHAN (CONTOH: BERAS / MINYAK / AYAM)</label><input value={generalNama} onChange={e=>setGeneralNama(e.target.value)} placeholder="beras premium" className="w-full border-2 border-green-300 rounded-lg px-3 py-2 mt-1" /></div>
              <div><label className="text-xs font-bold">MASUK KE KATEGORI UTAMA (15 KATEGORI)</label><select value={generalCatId} onChange={e=>setGeneralCatId(e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1">{KATEGORI_MASTER.map(k=><option key={k.nama} value={k.nama}>{k.nama} ({k.kode}) • {(grouped[k.nama]||[]).length} bahan</option>)}</select></div>
              <div><label className="text-xs font-bold">JENIS KODE - Regular / Hall (Halal) / Orgk (Organik)</label><div className="flex gap-2 mt-1">{["Regular","Hall","Orgk"].map(j=>(<button key={j} onClick={()=>setGeneralJenis(j)} className={`flex-1 py-2 rounded-lg border font-bold text-sm ${generalJenis===j? j==="Hall"?"bg-emerald-600 text-white": j==="Orgk"?"bg-lime-600 text-white":"bg-slate-800 text-white":"bg-gray-100"}`}>{j==="Regular"?"Regular": j==="Hall"?"Hall - Halal":"Orgk - Organik"}</button>))}</div></div>
              <div className="grid grid-cols-2 gap-2"><div className="bg-green-50 border rounded p-2"><div className="text-xs">NO URUT</div><div className="font-bold text-lg">{String(generalNextNo).padStart(3,"0")}</div></div><div className="bg-green-50 border rounded p-2"><div className="text-xs">KODE BAHAN (AUTO)</div><div className="font-bold text-lg text-green-700">{generalNextKode}</div></div></div>
              {generalJenis==="Hall" && <div className="bg-emerald-50 border border-emerald-300 rounded p-3"><label className="text-xs font-bold text-emerald-800">ID HALAL 19 DIGIT - ID32110078778290726</label><div className="flex gap-2 mt-1"><input value={generalHalalId} onChange={e=>setGeneralHalalId(e.target.value)} className="flex-1 border rounded px-3 py-2 font-mono text-sm" /><button onClick={()=>setGeneralHalalId(generateHalalId())} className="bg-emerald-600 text-white px-3 py-2 rounded text-sm">Generate</button></div></div>}
              {generalDuplicate && <div className="bg-yellow-100 border border-yellow-300 rounded p-3 text-sm">⚠️ SUDAH ADA: {generalDuplicate.kode_bahan||generalDuplicate.kode} - Stock {generalDuplicate.stok||generalDuplicate.stock} - Harga {formatRp(generalDuplicate.harga_beli||generalDuplicate.harga)}</div>}
              <div className="grid grid-cols-2 gap-3"><input value={generalNama} onChange={e=>setGeneralNama(e.target.value)} placeholder="Nama final" className="border rounded px-3 py-2" /><select value={generalSatuan} onChange={e=>setGeneralSatuan(e.target.value)} className="border rounded px-3 py-2">{SATUAN_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3"><input type="number" value={generalStock} onChange={e=>setGeneralStock(e.target.value)} className="border-2 border-blue-300 bg-blue-50 rounded px-3 py-2" placeholder="Stock Awal" /><input type="number" value={generalHarga} onChange={e=>setGeneralHarga(e.target.value)} className="border-2 border-yellow-300 bg-yellow-50 rounded px-3 py-2" placeholder="Harga Beli" /></div>
              <div className="flex gap-2"><button onClick={()=>setShowGeneralAdd(false)} className="flex-1 bg-gray-200 py-3 rounded font-bold">Batal</button><button onClick={handleGeneralAdd} className={`flex-1 py-3 rounded font-bold text-white ${generalDuplicate?"bg-blue-600":"bg-green-600"}`}>{generalDuplicate?`Update - ${generalDuplicate.kode_bahan}`:`Simpan ${generalNextKode}`}</button></div>
            </div>
          </div></div>
        )}

        {showEdit && editItem && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl w-full max-w-xl p-6">
            <div className="flex justify-between items-center mb-3"><h2 className="font-bold">Edit Kode & ID Halal - {editItem.kode_bahan||editItem.kode}</h2><button onClick={()=>setShowEdit(false)} className="bg-gray-100 px-3 py-1 rounded">✕</button></div>
            <div className="space-y-3">
              <input value={editNama} onChange={e=>setEditNama(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Nama Bahan" />
              <div><label className="text-xs font-bold">Kode Bahan - Edit jadi Hall-BERAS-005 atau Orgk-IKAN-001</label><input value={editKode} onChange={e=>setEditKode(e.target.value)} className="w-full border-2 rounded px-3 py-2 font-mono" /></div>
              {editKode.startsWith("Hall-") && <div className="bg-emerald-50 border border-emerald-300 rounded p-3"><label className="text-xs font-bold">ID Halal 19 Digit</label><div className="flex gap-2 mt-1"><input value={editHalalId} onChange={e=>setEditHalalId(e.target.value)} className="flex-1 border rounded px-3 py-2 font-mono text-sm" /><button onClick={()=>setEditHalalId(generateHalalId())} className="bg-emerald-600 text-white px-3 py-2 rounded text-sm">Generate</button></div></div>}
              <div className="grid grid-cols-2 gap-3"><input type="number" value={editStock} onChange={e=>setEditStock(e.target.value)} className="border-2 border-blue-300 bg-blue-50 rounded px-3 py-2" /><input type="number" value={editHarga} onChange={e=>setEditHarga(e.target.value)} className="border-2 border-yellow-300 bg-yellow-50 rounded px-3 py-2" /></div>
              <select value={editSatuan} onChange={e=>setEditSatuan(e.target.value)} className="w-full border rounded px-3 py-2">{SATUAN_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}</select>
              <div className="flex gap-2"><button onClick={()=>setShowEdit(false)} className="flex-1 bg-gray-200 py-3 rounded font-bold">Batal</button><button onClick={handleEditSave} className="flex-1 bg-blue-600 text-white py-3 rounded font-bold">Update {editKode}</button></div>
            </div>
          </div></div>
        )}

        {showGeneralDel && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4"><h2 className="font-bold">Hapus Bahan General</h2><button onClick={()=>setShowGeneralDel(false)}>✕</button></div>
            <input value={delSearch} onChange={e=>setDelSearch(e.target.value)} placeholder="Ketik nama bahan..." className="w-full border rounded px-3 py-2 mb-3" />
            <div className="space-y-2 max-h-96 overflow-auto">{items.filter(i=>!delSearch || (i.nama_bahan||i.nama||"").toLowerCase().includes(delSearch.toLowerCase()) || (i.kode_bahan||i.kode||"").toLowerCase().includes(delSearch.toLowerCase())).slice(0,20).map(it=><div key={it.kode_bahan||it.kode} className="flex justify-between items-center border p-2 rounded"><div><div className="font-bold text-sm">{it.kode_bahan||it.kode} - {it.nama_bahan||it.nama}</div><div className="text-xs text-gray-500">{it.kategori} {it.halal_id? `• ${it.halal_id}`:""}</div></div><button onClick={()=>handleDelete(it.kode_bahan||it.kode)} className="bg-red-600 text-white px-3 py-1 rounded text-sm">Delete</button></div>)}</div>
          </div></div>
        )}

        <div className="space-y-3">
          {KATEGORI_MASTER.map(kat=>{
            const list=grouped[kat.nama]||[]; const isExp=expanded[kat.nama]; const perState=perCatAdd[kat.nama]||{show:false, nama:"", satuan:"Kg", stock:0, harga:0, jenis:"Regular", halal_id: generateHalalId()};
            return (
              <div key={kat.nama} className="bg-white rounded-xl shadow-sm border">
                <div className="flex justify-between items-center p-4 cursor-pointer" onClick={()=>setExpanded(prev=>({...prev,[kat.nama]:!prev[kat.nama]}))}>
                  <div className="flex items-center gap-3"><div className="bg-slate-800 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">{kat.no}</div><div><div className="font-bold">{kat.nama} ({kat.kode})</div><div className="text-xs text-gray-500">{list.length} bahan • Format {kat.kode}-001 / Hall-{kat.kode}-001 / Orgk-{kat.kode}-001</div></div></div>
                  <div className="flex gap-2" onClick={e=>e.stopPropagation()}><button onClick={()=>{setPerCatAdd(prev=>({...prev,[kat.nama]:{show:true, nama:"", satuan:"Kg", stock:0, harga:0, jenis:"Regular", halal_id: generateHalalId()}})); setExpanded(prev=>({...prev,[kat.nama]:true}));}} className="bg-green-600 text-white px-3 py-1 rounded text-sm">+ Tambah</button><span className="text-gray-400">{isExp?"▲":"▼"}</span></div>
                </div>
                {isExp && <div className="p-4 border-t">
                  {perState.show && <div className="bg-green-50 p-3 rounded-lg mb-3 flex flex-wrap gap-2 items-end"><div className="text-xs">No {String(getNextNo(kat.nama)).padStart(3,"0")}</div><div className="font-bold text-green-700 text-xs">{getKodeWithJenis(kat.nama,getNextNo(kat.nama),perState.jenis)}</div><select value={perState.jenis} onChange={e=>setPerCatAdd(prev=>({...prev,[kat.nama]:{...prev[kat.nama], jenis:e.target.value}}))} className="border px-2 py-1 rounded text-sm"><option value="Regular">Regular</option><option value="Hall">Hall</option><option value="Orgk">Orgk</option></select><input value={perState.nama} onChange={e=>setPerCatAdd(prev=>({...prev,[kat.nama]:{...prev[kat.nama], nama:e.target.value}}))} placeholder="Nama" className="border px-2 py-1 rounded flex-1 min-w-[100px] text-sm" /><input type="number" value={perState.stock} onChange={e=>setPerCatAdd(prev=>({...prev,[kat.nama]:{...prev[kat.nama], stock:e.target.value}}))} placeholder="Stock" className="border-2 border-blue-300 bg-blue-50 px-2 py-1 rounded w-16 text-sm" /><input type="number" value={perState.harga} onChange={e=>setPerCatAdd(prev=>({...prev,[kat.nama]:{...prev[kat.nama], harga:e.target.value}}))} placeholder="Harga" className="border-2 border-yellow-300 bg-yellow-50 px-2 py-1 rounded w-20 text-sm" /><button onClick={()=>handlePerCatAdd(kat.nama)} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Simpan</button><button onClick={()=>setPerCatAdd(prev=>({...prev,[kat.nama]:{show:false}}))} className="bg-gray-200 px-3 py-1 rounded text-sm">Batal</button></div>}
                  <div className="overflow-auto"><table className="w-full text-sm"><thead><tr className="text-gray-500 border-b text-xs"><th className="text-left p-2">No</th><th className="text-left p-2">Kode Bahan</th><th className="text-left p-2">Nama Bahan</th><th className="text-left p-2">ID Halal 19 digit</th><th className="text-left p-2">Stock</th><th className="text-left p-2">Harga Beli</th><th className="text-left p-2">Harga Baru</th><th className="text-left p-2">Selisih</th><th className="text-left p-2">Aksi</th></tr></thead><tbody>{list.map(it=>{const kode=it.kode_bahan||it.kode||""; const m=kode.match(/-(\d+)$/); const no=m?m[1]:"-"; const isHall=kode.startsWith("Hall-"); return (<tr key={kode} className="border-b hover:bg-gray-50"><td className="p-2">{no}</td><td className="p-2 font-mono text-xs font-bold">{kode}</td><td className="p-2 font-semibold">{it.nama_bahan||it.nama}</td><td className="p-2">{isHall? <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-mono border">{it.halal_id||"ID32110078778290726"}</span>: <span className="text-gray-400">-</span>}</td><td className="p-2"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">{it.stok||it.stock||0}</span></td><td className="p-2 text-xs">{formatRp(it.harga_beli||it.harga)}</td><td className="p-2 text-xs">{formatRp(it.harga_baru||it.harga_beli||it.harga)}</td><td className="p-2 text-xs">{Number(it.selisih_harga||0)!==0? formatRp(it.selisih_harga):"0"}</td><td className="p-2 flex gap-1"><button onClick={()=>{ const itFix={...it, kode_bahan: kode}; openEdit(itFix); }} className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs border">Edit</button><button onClick={()=>handleDelete(kode)} className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs">Delete</button></td></tr>);})}{list.length===0 && <tr><td colSpan={9} className="p-4 text-center text-gray-400">Belum ada bahan - {debugInfo}</td></tr>}</tbody></table></div>
                </div>}
              </div>
            );
          })}
        </div>
        {loading && <div className="text-center p-8">Loading... {debugInfo}</div>}
      </div>
    </div>
  );
}
