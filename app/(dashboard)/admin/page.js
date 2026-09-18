"use client";
import { useState, useEffect } from "react";

export default function MasterRulesPage(){
  const [rules, setRules] = useState(null);
  const [newAturan, setNewAturan] = useState("");
  const [newFitur, setNewFitur] = useState("Inventory");
  const [filter, setFilter] = useState("all");

  useEffect(()=>{
    const defaultRules = {
  "version": "V1.0 - 18-09-2026",
  "description": "MASTER RULES Sikitchen OS - Semua aturan dinamis Bos, Muse WAJIB baca ini sebelum ngoding apapun",
  "last_updated": "2026-09-18",
  "CORE_NEVER_BREAK": [
    "DB inventory_items HANYA kirim kolom yang ada: kode_bahan, name, nama_bahan, kategori, stok, harga_beli, id_halal_19, custom_value_1, kode_prefix, satuan. JANGAN PERNAH kirim kategori_utama, kode, stock, harga, harga_baru, custom_value_2, kode_lama, unit - bikin error schema cache",
    "INSERT wajib kirim name DAN nama_bahan (keduanya) biar tidak error null constraint",
    "UPDATE pakai eq(kode_bahan) fallback eq(id) kalau gagal",
    "ID Halal pakai kolom id_halal_19 SAJA. custom_value_2 JANGAN dipakai untuk halal",
    "Merek pakai custom_value_1",
    "Sidebar HARUS fixed left-0 top-0 bottom-0 w-64, tidak ikut scroll. Main content md:pl-64 yang scroll. JANGAN pakai html,body overflow:hidden",
    "Sidebar HARUS ada tombol Logout merah di bawah + tulisan versi V15.x + menu Admin Master A,B,C jangan hilang",
    "Edit bahan lama HARUS bisa ganti: Prefix Hall/Orgk, Kode Kategori (HEWANI jadi DAGING bisa), Merek, id_halal_19, stock, harga",
    "Push pakai PowerShell: copy ... -Force; git add .; git commit -m ...; git push - 1 baris"
  ],
  "DYNAMIC_RULES": [
    {
      "id": "R001",
      "fitur": "Inventory",
      "aturan": "Bisa ganti kode HEWANI-001 jadi DAGING-001 via Edit Kode - dropdown Kode Kategori",
      "status": "active",
      "tanggal": "2026-09-18"
    },
    {
      "id": "R002",
      "fitur": "Inventory",
      "aturan": "Tambah General Next Kode otomatis: BERAS-012, BOX-009 dll",
      "status": "active",
      "tanggal": "2026-09-18"
    },
    {
      "id": "R003",
      "fitur": "Sidebar",
      "aturan": "Sidebar statis tidak ikut scroll, inventory bisa scroll normal",
      "status": "active",
      "tanggal": "2026-09-18"
    },
    {
      "id": "R004",
      "fitur": "Auth",
      "aturan": "Tombol Logout wajib ada di sidebar bawah dan topbar mobile",
      "status": "active",
      "tanggal": "2026-09-18"
    }
  ],
  "WORKFLOW_WAJIB_MUSE": "Sebelum ngoding apapun, BACA file ini dulu. Sebelum push, CEK apakah melanggar CORE_NEVER_BREAK. Kalau Bos bilang 'tambahin rules', update file ini dulu baru ngoding."
};
    const saved = localStorage.getItem("MASTER_RULES_SIKITCHEN");
    if(saved){
      try{ setRules(JSON.parse(saved)); } catch{ setRules(defaultRules); }
    } else {
      setRules(defaultRules);
    }
  },[]);

  useEffect(()=>{
    if(rules) localStorage.setItem("MASTER_RULES_SIKITCHEN", JSON.stringify(rules));
  },[rules]);

  if(!rules) return <div className="p-6">Loading Master Rules...</div>;

  const addRule = ()=>{
    if(!newAturan) return;
    const id = "R"+String(rules.DYNAMIC_RULES.length+1).padStart(3,"0");
    const baru = {id, fitur: newFitur, aturan: newAturan, status: "active", tanggal: new Date().toISOString().slice(0,10)};
    setRules({...rules, DYNAMIC_RULES: [...rules.DYNAMIC_RULES, baru], last_updated: new Date().toISOString().slice(0,10)});
    setNewAturan("");
  };

  const toggleStatus = (id)=>{
    setRules({...rules, DYNAMIC_RULES: rules.DYNAMIC_RULES.map(r=> r.id===id ? {...r, status: r.status==="active"?"inactive":"active"} : r)});
  };

  const deleteRule = (id)=>{
    if(!confirm("Hapus rules "+id+" ?")) return;
    setRules({...rules, DYNAMIC_RULES: rules.DYNAMIC_RULES.filter(r=>r.id!==id)});
  };

  const exportJSON = ()=>{
    const blob = new Blob([JSON.stringify(rules, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="MASTER_RULES.json"; a.click();
  };

  const filteredRules = rules.DYNAMIC_RULES.filter(r=> filter==="all" || r.fitur===filter || r.status===filter);

  return (
    <div className="p-4 bg-[#f5f7fb] min-h-screen">
      <div className="bg-slate-900 text-white p-4 rounded-t-xl">
        <div className="text-lg font-bold">📜 MASTER RULES - Otak Muse Biar Tidak Ngulang</div>
        <div className="text-xs text-slate-300">Version: {rules.version} • Last: {rules.last_updated} • {rules.CORE_NEVER_BREAK.length} core + {rules.DYNAMIC_RULES.length} dynamic • Bos tetap chat di Meta AI, ini cuma gudang catatan</div>
        <div className="mt-3 flex gap-2 flex-wrap">
          <button onClick={exportJSON} className="bg-green-600 px-3 py-2 rounded text-sm font-bold">⬇️ Export JSON</button>
          <button onClick={()=>{localStorage.removeItem("MASTER_RULES_SIKITCHEN"); location.reload();}} className="bg-slate-700 px-3 py-2 rounded text-sm">Reset Default</button>
          <a href="/dashboard" className="bg-blue-600 px-3 py-2 rounded text-sm">← Dashboard</a>
        </div>
      </div>

      <div className="bg-white p-4 rounded-b-xl border space-y-6 mt-3">
        <div className="bg-red-50 border-2 border-red-400 p-4 rounded-xl">
          <div className="font-bold text-red-700 text-sm">🔒 CORE_NEVER_BREAK - Muse WAJIB Patuhi, Jangan Pernah Dilanggar</div>
          <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm">
            {rules.CORE_NEVER_BREAK.map((c,i)=><li key={i} className="bg-white p-2 rounded border">{c}</li>)}
          </ol>
          <div className="text-[11px] text-red-600 mt-2">Ini yang bikin Bos capek kemarin: name not null, kategori_utama schema cache, sidebar stag, logout hilang - semua sudah di-lock di sini</div>
        </div>

        <div className="bg-blue-50 border-2 border-blue-400 p-4 rounded-xl">
          <div className="font-bold text-blue-700 text-sm">➕ Tambah Rules Baru (Dinamis) - Bos Bisa Chat Di Sini Atau Ketik Di Sini</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-3">
            <select value={newFitur} onChange={e=>setNewFitur(e.target.value)} className="p-2 border-2 border-blue-400 rounded text-sm font-bold">
              <option>Inventory</option><option>Sidebar</option><option>Auth</option><option>Master Menu</option><option>Kalkulator</option><option>Produksi</option><option>Delivery</option><option>Dashboard</option><option>Umum</option>
            </select>
            <input value={newAturan} onChange={e=>setNewAturan(e.target.value)} placeholder="Contoh: Stok default tambah baru 10 Kg, harga default 15000" className="md:col-span-2 p-2 border-2 border-blue-400 rounded text-sm" />
            <button onClick={addRule} className="bg-blue-600 text-white py-2 rounded font-bold text-sm">Tambah Rules</button>
          </div>
          <div className="text-[11px] text-blue-600 mt-2">Bos ketik di sini = otomatis ke-save. Atau Bos chat di Meta AI: "Muse tambahin rules ..." = aku yang tambahin. Dua-duanya nyambung.</div>
        </div>

        <div className="bg-white border p-3 rounded-xl">
          <div className="flex justify-between items-center">
            <div className="font-bold text-sm">📋 DYNAMIC_RULES - {filteredRules.length} aturan (dinamis, bisa tambah terus)</div>
            <div className="flex gap-1">
              <select value={filter} onChange={e=>setFilter(e.target.value)} className="p-1 border rounded text-xs">
                <option value="all">Semua</option><option value="Inventory">Inventory</option><option value="Sidebar">Sidebar</option><option value="Auth">Auth</option><option value="active">Active</option><option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {filteredRules.map(r=>(
              <div key={r.id} className={`p-3 rounded border flex justify-between items-start gap-3 ${r.status==="active"?"bg-green-50 border-green-300":"bg-gray-100 border-gray-300 opacity-60"}`}>
                <div className="flex-1">
                  <div className="flex gap-2 items-center"><span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">{r.id}</span><span className="text-xs bg-blue-100 px-2 py-0.5 rounded font-bold">{r.fitur}</span><span className="text-[10px] text-gray-500">{r.tanggal}</span><span className={`text-[10px] px-2 py-0.5 rounded font-bold ${r.status==="active"?"bg-green-600 text-white":"bg-gray-400 text-white"}`}>{r.status}</span></div>
                  <div className="text-sm mt-1 font-medium">{r.aturan}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={()=>toggleStatus(r.id)} className="text-xs px-2 py-1 bg-yellow-100 border rounded">{r.status==="active"?"Nonaktif":"Aktifkan"}</button>
                  <button onClick={()=>deleteRule(r.id)} className="text-xs px-2 py-1 bg-red-100 border rounded">Hapus</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-400 p-3 rounded-xl">
          <div className="font-bold text-sm">💡 Cara Pakai Biar Tidak Ngulang Lagi Bos:</div>
          <ol className="list-decimal pl-5 text-xs mt-2 space-y-1">
            <li>Bos tetap chat di Meta AI seperti biasa untuk intruksi koding</li>
            <li>Setiap Bos bilang "tambahin rules", aku update file docs/MASTER_RULES.json + localStorage ini</li>
            <li>Sebelum aku ngoding, aku WAJIB baca file ini dulu - jadi tidak akan ngulang error lama</li>
            <li>Bos bisa buka halaman ini kapan saja untuk lihat sudah berapa aturan, bisa edit/hapus langsung di sini tanpa chat</li>
            <li>Export JSON kalau mau di-push ke GitHub biar permanen</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
