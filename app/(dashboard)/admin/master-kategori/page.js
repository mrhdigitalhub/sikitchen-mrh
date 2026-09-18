"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// ADMIN MASTER LENGKAP - POINT A,B,C BOS
// a. bisa menambah nama bahan Kategori
// b. bisa menambahkan kolom max 2 kolom (nama kolom_1; kolom_2) terkoneksi ke semua dashboard jika sync
// c. bisa menambah kode bahan Hall dan Orgk sebelum kode kategori

export default function AdminMasterKategoriPage(){
  const [kodeList, setKodeList] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);
  const [customCols, setCustomCols] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form tambah kategori - Point A
  const [newKatNama, setNewKatNama] = useState("");
  const [newKatUrutan, setNewKatUrutan] = useState(16);

  // Form tambah kode - Point A
  const [newKode, setNewKode] = useState("");
  const [newNamaKode, setNewNamaKode] = useState("");
  const [newKategoriUtama, setNewKategoriUtama] = useState("Bahan Baku Utama");
  const [editKode, setEditKode] = useState(null);

  // Form custom columns - Point B max 2 kolom
  const [kolom1Nama, setKolom1Nama] = useState("Merek");
  const [kolom1Sync, setKolom1Sync] = useState(true);
  const [kolom2Nama, setKolom2Nama] = useState("ID Halal 19 digit");
  const [kolom2Sync, setKolom2Sync] = useState(true);

  // Point C Hall Orgk
  const [prefixList] = useState(["", "Hall", "Orgk"]);

  useEffect(()=>{ loadData(); },[]);

  async function loadData(){
    setLoading(true);
    const { data: kodeData } = await supabase.from("master_kode_kategori").select("*").order("kode");
    const { data: katData } = await supabase.from("master_kategori_utama").select("*").order("urutan");
    const { data: colData } = await supabase.from("master_custom_columns").select("*").order("id");
    
    if(kodeData) setKodeList(kodeData);
    if(katData) { setKategoriList(katData); if(katData.length>0) setNewKategoriUtama(katData[0].nama); }
    if(colData && colData.length>0){
      setCustomCols(colData);
      const c1 = colData.find(c=>c.id===1); if(c1){ setKolom1Nama(c1.nama_kolom); setKolom1Sync(c1.is_sync_dashboard); }
      const c2 = colData.find(c=>c.id===2); if(c2){ setKolom2Nama(c2.nama_kolom); setKolom2Sync(c2.is_sync_dashboard); }
    }
    
    // Fallback jika tabel belum ada
    if(!kodeData || kodeData.length===0){
      setKodeList([
        {kode:"BERAS",nama_kode:"Beras & Tepung",kategori_utama:"Bahan Baku Utama"},
        {kode:"BOX",nama_kode:"Kemasan",kategori_utama:"Bahan Kemasan"},
        {kode:"SABUN",nama_kode:"Sabun & Pembersih",kategori_utama:"Bahan Pembersih"},
        {kode:"DAGING",nama_kode:"Daging",kategori_utama:"Bahan Hewani"},
        {kode:"UMBI",nama_kode:"Umbi Tahu Tempe",kategori_utama:"Bahan Nabati"},
        {kode:"IKAN",nama_kode:"Ikan",kategori_utama:"Bahan Hewani Non Sembelihan"},
        {kode:"UDANG",nama_kode:"Udang",kategori_utama:"Bahan Hewani Non Sembelihan"},
        {kode:"CUMI",nama_kode:"Cumi",kategori_utama:"Bahan Hewani Non Sembelihan"},
        {kode:"TELUR",nama_kode:"Telur",kategori_utama:"Bahan Hewani Non Sembelihan"},
      ]);
    }
    if(!katData || katData.length===0){
      setKategoriList([
        {nama:"Bahan Baku Utama",urutan:1},{nama:"Bahan Kemasan",urutan:2},{nama:"Bahan Pembersih",urutan:3},
        {nama:"Bahan Hewani",urutan:4},{nama:"Bahan Nabati",urutan:5},{nama:"Bahan Hewani Non Sembelihan",urutan:6},
      ]);
    }
    setLoading(false);
  }

  // POINT A: Tambah Kategori
  async function handleTambahKategori(){
    if(!newKatNama){ alert("Nama kategori wajib"); return; }
    const payload = { nama: newKatNama.trim(), urutan: Number(newKatUrutan)||99 };
    const { error } = await supabase.from("master_kategori_utama").upsert(payload);
    if(error){ alert("Gagal (jalankan SQL dulu): "+error.message); return; }
    alert(`Berhasil tambah kategori ${payload.nama} urutan ${payload.urutan}`);
    setNewKatNama(""); setNewKatUrutan(prev=>prev+1);
    loadData();
  }
  async function handleDeleteKategori(nama){
    if(!confirm(`Hapus kategori ${nama}? Semua kode dengan kategori ini akan jadi tanpa kategori!`)) return;
    const { error } = await supabase.from("master_kategori_utama").delete().eq("nama", nama);
    if(error){ alert("Gagal: "+error.message); return; }
    loadData();
  }

  // POINT A: Tambah Kode
  async function handleTambahKode(){
    if(!newKode){ alert("Kode wajib"); return; }
    const kodeUpper = newKode.toUpperCase().trim();
    const payload = { kode: kodeUpper, nama_kode: newNamaKode || kodeUpper, kategori_utama: newKategoriUtama };
    const { error } = await supabase.from("master_kode_kategori").upsert(payload);
    if(error){ alert("Gagal: "+error.message); return; }
    alert(`Tambah ${kodeUpper} -> ${newKategoriUtama} berhasil`);
    setNewKode(""); setNewNamaKode(""); setEditKode(null);
    loadData();
  }
  async function handleEditKode(item){
    setEditKode(item); setNewKode(item.kode); setNewNamaKode(item.nama_kode); setNewKategoriUtama(item.kategori_utama);
  }
  async function handleUpdateKode(){
    if(!editKode) return;
    const payload = { kode: newKode.toUpperCase().trim(), nama_kode: newNamaKode, kategori_utama: newKategoriUtama };
    const { error } = await supabase.from("master_kode_kategori").update(payload).eq("kode", editKode.kode);
    if(error){ alert("Gagal: "+error.message); return; }
    alert(`Update ${editKode.kode} -> ${payload.kode} berhasil`);
    setEditKode(null); setNewKode(""); setNewNamaKode("");
    loadData();
  }
  async function handleDeleteKode(kode){
    if(!confirm(`Hapus kode ${kode}?`)) return;
    const { error } = await supabase.from("master_kode_kategori").delete().eq("kode", kode);
    if(error){ alert("Gagal: "+error.message); return; }
    loadData();
  }

  // POINT B: Max 2 kolom custom - terkoneksi ke dashboard jika sync
  async function handleSimpanCustomCols(){
    if(!kolom1Nama && !kolom2Nama){ alert("Isi minimal 1 nama kolom"); return; }
    // Validasi max 2 kolom
    const payload1 = { id:1, nama_kolom: kolom1Nama || "Kolom 1", key_kolom: "custom_value_1", is_active: !!kolom1Nama, is_sync_dashboard: kolom1Sync };
    const payload2 = { id:2, nama_kolom: kolom2Nama || "Kolom 2", key_kolom: "custom_value_2", is_active: !!kolom2Nama, is_sync_dashboard: kolom2Sync };
    const { error: e1 } = await supabase.from("master_custom_columns").upsert(payload1);
    const { error: e2 } = await supabase.from("master_custom_columns").upsert(payload2);
    if(e1 || e2){ alert("Gagal (jalankan SQL dulu): "+(e1?.message||e2?.message)); return; }
    alert(`Simpan 2 kolom custom berhasil:\nKolom 1: ${kolom1Nama} - Sync Dashboard: ${kolom1Sync ? "YA" : "TIDAK"}\nKolom 2: ${kolom2Nama} - Sync Dashboard: ${kolom2Sync ? "YA" : "TIDAK"}\nInventory akan otomatis tampil kolom ini`);
    loadData();
  }

  const grouped = kodeList.reduce((acc,cur)=>{ if(!acc[cur.kategori_utama]) acc[cur.kategori_utama]=[]; acc[cur.kategori_utama].push(cur); return acc; },{});

  return (
    <div className="p-4 bg-[#f5f7fb] min-h-screen">
      <div className="bg-slate-900 text-white p-4 rounded-t-xl">
        <div className="text-lg font-bold">Admin Master Inventory - Point A,B,C - Hall Orgk + 2 Kolom Custom</div>
        <div className="text-xs text-slate-300">a. Tambah Kategori | b. Max 2 kolom custom (Merek, ID Halal) sync ke dashboard | c. Hall- & Orgk- prefix kode bahan</div>
      </div>

      {loading && <div className="bg-white p-4 text-center text-sm">Loading...</div>}

      {/* POINT A: KATEGORI */}
      <div className="bg-white border-2 border-purple-500 p-4 rounded-xl my-3">
        <div className="font-bold text-sm mb-2 text-purple-700">a. Tambah Nama Bahan Kategori (15 + bisa nambah)</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div><div className="text-xs font-bold">Nama Kategori Baru *</div><input value={newKatNama} onChange={e=>setNewKatNama(e.target.value)} placeholder="Ex: Bahan Impor" className="w-full p-2 border-2 border-purple-400 rounded text-sm" /></div>
          <div><div className="text-xs">Urutan</div><input type="number" value={newKatUrutan} onChange={e=>setNewKatUrutan(e.target.value)} className="w-full p-2 border rounded text-sm" /></div>
          <div className="flex items-end"><button onClick={handleTambahKategori} className="w-full bg-purple-600 text-white py-2 rounded font-bold text-sm">+ Tambah Kategori</button></div>
          <div className="text-[10px] text-gray-500">Total {kategoriList.length} kategori - Bisa Edit/Delete di bawah</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {kategoriList.map(k=>(
            <span key={k.nama} className="bg-purple-50 border border-purple-300 px-2 py-1 rounded text-xs flex items-center gap-2">
              {k.urutan}. {k.nama} <button onClick={()=>handleDeleteKategori(k.nama)} className="bg-red-100 text-red-600 px-1 rounded">🗑️</button>
            </span>
          ))}
        </div>
      </div>

      {/* POINT B: MAX 2 KOLOM CUSTOM */}
      <div className="bg-white border-2 border-blue-500 p-4 rounded-xl my-3">
        <div className="font-bold text-sm mb-2 text-blue-700">b. Tambah Kolom Max 2 Kolom (nama kolom_1 ; kolom_2) Terkoneksi ke Semua Dashboard Jika Sync</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 border-2 border-blue-300 p-3 rounded">
            <div className="text-xs font-bold">Kolom_1 - Nama Kolom * (max 1)</div>
            <input value={kolom1Nama} onChange={e=>setKolom1Nama(e.target.value)} placeholder="Ex: Merek" className="w-full p-2 border-2 border-blue-400 rounded text-sm font-bold mt-1" />
            <div className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={kolom1Sync} onChange={e=>setKolom1Sync(e.target.checked)} id="sync1" />
              <label htmlFor="sync1" className="text-xs font-bold">Sync ke Dashboard Inventory? {kolom1Sync ? "YA - Muncul di tabel" : "TIDAK"}</label>
            </div>
            <div className="text-[10px] text-gray-600 mt-1">Key: custom_value_1 - Akan tampil di inventory sebagai kolom {kolom1Nama}</div>
          </div>
          <div className="bg-yellow-50 border-2 border-yellow-300 p-3 rounded">
            <div className="text-xs font-bold">Kolom_2 - Nama Kolom * (max 2)</div>
            <input value={kolom2Nama} onChange={e=>setKolom2Nama(e.target.value)} placeholder="Ex: ID Halal 19 digit" className="w-full p-2 border-2 border-yellow-400 rounded text-sm font-bold mt-1" />
            <div className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={kolom2Sync} onChange={e=>setKolom2Sync(e.target.checked)} id="sync2" />
              <label htmlFor="sync2" className="text-xs font-bold">Sync ke Dashboard Inventory? {kolom2Sync ? "YA - Muncul di tabel" : "TIDAK"}</label>
            </div>
            <div className="text-[10px] text-gray-600 mt-1">Key: custom_value_2 - Akan tampil di inventory sebagai kolom {kolom2Nama}</div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={handleSimpanCustomCols} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-bold text-sm">💾 Simpan 2 Kolom Custom - Sync ke Dashboard {kolom1Sync || kolom2Sync ? "AKTIF" : "NONAKTIF"}</button>
          <div className="text-[10px] text-gray-500 p-2">Max 2 kolom saja - Lebih dari 2 tidak bisa - Jika kosongkan nama = kolom nonaktif</div>
        </div>
        <div className="mt-2 bg-green-50 border p-2 rounded text-xs">
          <div>Contoh Bos: Kolom_1 = Merek (Sania, Rose Brand) | Kolom_2 = ID Halal 19 digit (1234567890123456789) - Kedua kolom akan muncul di inventory jika Sync YA</div>
          <div className="mt-1 font-bold">Untuk Hall-BERAS-001: Kolom_2 wajib isi 19 digit | Untuk Orgk-Beras-001: Kolom_2 boleh kosong</div>
        </div>
      </div>

      {/* POINT A & C: KODE BAHAN + Hall Orgk */}
      <div className="bg-white border-2 border-green-500 p-4 rounded-xl my-3">
        <div className="font-bold text-sm mb-2 text-green-700">a + c. Tambah Kode Bahan + Prefix Hall & Orgk Sebelum Kode Kategori</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div><div className="text-xs font-bold">Kode (18) *</div><input value={newKode} onChange={e=>setNewKode(e.target.value)} placeholder="BERAS" className="w-full p-2 border-2 border-green-400 rounded text-sm font-bold" /></div>
          <div><div className="text-xs">Nama Kode</div><input value={newNamaKode} onChange={e=>setNewNamaKode(e.target.value)} placeholder="Beras & Tepung" className="w-full p-2 border rounded text-sm" /></div>
          <div><div className="text-xs font-bold">Kategori Utama (15+)</div><select value={newKategoriUtama} onChange={e=>setNewKategoriUtama(e.target.value)} className="w-full p-2 border-2 border-purple-400 rounded text-sm">
            {kategoriList.map(k=><option key={k.nama} value={k.nama}>{k.nama}</option>)}
          </select></div>
          <div className="flex gap-2 items-end">
            {editKode ? (
              <><button onClick={handleUpdateKode} className="flex-1 bg-blue-600 text-white py-2 rounded font-bold text-sm">Update {editKode.kode}</button><button onClick={()=>{setEditKode(null); setNewKode(""); setNewNamaKode("");}} className="px-3 py-2 bg-gray-200 rounded text-sm">Batal</button></>
            ) : (
              <button onClick={handleTambahKode} className="flex-1 bg-green-600 text-white py-2 rounded font-bold text-sm">+ Simpan Kode</button>
            )}
          </div>
        </div>
        <div className="text-[10px] text-gray-600 mt-2">Point C: Kode bahan nanti di inventory bisa jadi Hall-BERAS-001 atau Orgk-BERAS-001 - Prefix Hall/Orgk dipilih di form Tambah Bahan Inventory (bukan di sini)</div>
        <div className="mt-2 text-xs bg-green-50 p-2 rounded">Contoh hasil di Inventory: <b>BERAS-001</b> (biasa), <b>Hall-BERAS-001</b> (dengan ID Halal 19 digit), <b>Orgk-Beras-001</b> (tanpa ID Halal)</div>
      </div>

      {/* TABEL 18 KODE */}
      <div className="bg-white rounded-xl border overflow-auto">
        <div className="p-3 font-bold text-sm bg-slate-50">Daftar {kodeList.length} Kode Bahan (18 Excel) - Bisa Edit/Delete + Prefix Hall/Orgk nanti di Inventory</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-xs"><tr><th className="text-left p-2">Kode (18)</th><th className="text-left p-2">Nama</th><th className="text-left p-2">Kategori Utama</th><th className="text-left p-2">Contoh Hall/Orgk</th><th className="text-left p-2">Aksi</th></tr></thead>
          <tbody>
            {kategoriList.map(kat=>{
              const list = grouped[kat.nama] || [];
              return list.map(it=>(
                <tr key={it.kode} className="border-t hover:bg-blue-50">
                  <td className="p-2 font-mono font-bold">{it.kode}</td>
                  <td className="p-2">{it.nama_kode}</td>
                  <td className="p-2 text-xs bg-purple-50">{it.kategori_utama}</td>
                  <td className="p-2 text-[11px] font-mono">BERAS-001 → Hall-{it.kode}-001 / Orgk-{it.kode}-001</td>
                  <td className="p-2 flex gap-1">
                    <button onClick={()=>handleEditKode(it)} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Edit</button>
                    <button onClick={()=>handleDeleteKode(it.kode)} className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">🗑️ Delete</button>
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
