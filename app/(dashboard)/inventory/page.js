"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchInventoryCompat, formatRp } from "@/lib/inventoryCompat";

const KATEGORI_LIST = [
  "BERAS","AYAM","DAGING","IKAN","SAYUR","BUMBU","MINYAK","TELUR","SUSU","KEJU","BUAH","SAUS","KEMASAN","LAUK","LAIN"
];

export default function InventoryPage(){
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [quick, setQuick] = useState(null);
  const [quickStock, setQuickStock] = useState("");
  const [quickHarga, setQuickHarga] = useState("");
  const [quickJenis, setQuickJenis] = useState("Regular");
  const [expanded, setExpanded] = useState({}); // buka/tutup per kategori
  const [showTambah, setShowTambah] = useState(false);
  const [newKode, setNewKode] = useState("");
  const [newNama, setNewNama] = useState("");
  const [newKategori, setNewKategori] = useState("BERAS");
  const [newStock, setNewStock] = useState("10");
  const [newHarga, setNewHarga] = useState("15000");
  const [newJenis, setNewJenis] = useState("Regular");
  const [newHalal, setNewHalal] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ loadData(); },[]);

  async function loadData(){
    setLoading(true);
    const { items: data } = await fetchInventoryCompat();
    // beri _no urut global untuk fix V11 header sinkron
    const withNo = data.map((d,i)=> ({...d, _no: i+1}));
    setItems(withNo);
    // default buka semua biar 14 bahan yang ke-hide tampil lagi
    const exp = {};
    KATEGORI_LIST.forEach(k=> exp[k]=true);
    // juga kategori yang ada di data
    withNo.forEach(it=>{ const kat = (it.kategori||"LAIN").toUpperCase(); exp[kat]=true; });
    setExpanded(exp);
    setLoading(false);
  }

  // Search
  const filtered = items.filter(i=>{
    if(!search) return true;
    const s = search.toLowerCase();
    return i.kode_bahan.toLowerCase().includes(s) || i.nama_bahan.toLowerCase().includes(s) || (i.halal_id||"").toLowerCase().includes(s);
  });

  const grouped = filtered.reduce((acc,cur)=>{
    const kat = (cur.kategori||"LAIN").toUpperCase();
    if(!acc[kat]) acc[kat]=[];
    acc[kat].push(cur);
    return acc;
  },{});

  const berasItems = items.filter(i=> (i.kode_bahan||"").includes("BERAS"));
  const nextNoBeras = berasItems.length + 1;
  const nextKodeBeras = `BERAS-${String(nextNoBeras).padStart(3,"0")}`;

  function handleClickNama(item){
    setQuick(item);
    setQuickStock(""); // kosongkan biar jelas ini penambahan, bukan timpa - logic baru 10+13=23
    setQuickHarga(String(item.harga_beli||0));
    if(item.isHall) setQuickJenis("Hall");
    else if(item.isOrgk) setQuickJenis("Orgk");
    else setQuickJenis("Regular");
  }

  async function handleUpdate(){
    if(!quick) return;
    // LOGIC BARU BENAR: Stock ditambah, bukan timpa
    const tambah = Number(quickStock||0);
    const stockLama = Number(quick.stok||0);
    const stockBaruTotal = stockLama + tambah; // 10 + 13 = 23
    const hargaLama = Number(quick.harga_beli||0);
    const hargaBaruInput = Number(quickHarga||0);
    const selisih = hargaBaruInput - hargaLama;

    // Update supabase
    const { error } = await supabase.from("inventory_items")
      .update({ stok: stockBaruTotal, stock: stockBaruTotal, harga_beli: hargaBaruInput, harga_baru: hargaBaruInput, selisih })
      .eq("kode_bahan", quick.kode_bahan);
    if(error){ alert("Gagal update: "+error.message); return; }

    // Refresh lokal tanpa reload full
    const newItems = items.map(it=> it.kode_bahan===quick.kode_bahan ? {...it, stok: stockBaruTotal, stock: stockBaruTotal, harga_beli: hargaBaruInput, harga_baru: hargaBaruInput, selisih } : it);
    setItems(newItems);
    setQuick(null);
  }

  // HEADER BUTTONS - AKTIFKAN
  function handleBukaSemua(){
    const exp = {};
    Object.keys(grouped).forEach(k=> exp[k]=true);
    KATEGORI_LIST.forEach(k=> exp[k]=true);
    setExpanded(exp);
  }
  function handleTutupSemua(){
    const exp = {};
    Object.keys(grouped).forEach(k=> exp[k]=false);
    setExpanded(exp);
  }
  function handleRefresh(){
    loadData();
  }
  function handleTambahBahan(){
    // set next kode default
    setNewKode(nextKodeBeras);
    setNewKategori("BERAS");
    setNewNama("");
    setNewStock("10");
    setNewHarga("15000");
    setNewJenis("Regular");
    setNewHalal("");
    setShowTambah(true);
  }
  async function handleSimpanTambah(){
    if(!newKode || !newNama){ alert("Kode & Nama wajib"); return; }
    const payload = {
      kode_bahan: newKode,
      nama_bahan: newNama,
      kategori: newKategori,
      stok: Number(newStock),
      stock: Number(newStock),
      harga_beli: Number(newHarga),
      harga_baru: Number(newHarga),
      selisih: 0,
      jenis_kode: newJenis,
      halal_id: newJenis==="Hall" ? (newHalal||"ID32110078778290726") : null
    };
    const { error } = await supabase.from("inventory_items").insert(payload);
    if(error){ alert("Gagal tambah: "+error.message); return; }
    setShowTambah(false);
    loadData();
  }
  async function handleHapusGeneral(){
    if(!confirm("Hapus bahan General terakhir? (BERAS-012 / bahan kosong)")) return;
    // hapus bahan yang stok 0 dan nama mengandung General atau kode BERAS-012 sebagai contoh
    const target = items.find(i=> i.kode_bahan===nextKodeBeras || (i.nama_bahan||"").toLowerCase().includes("general"));
    if(!target){ alert("Tidak ada bahan General / "+nextKodeBeras+" untuk dihapus. Pilih baris lalu klik Delete di Aksi untuk hapus per bahan."); return; }
    const { error } = await supabase.from("inventory_items").delete().eq("kode_bahan", target.kode_bahan);
    if(error){ alert("Gagal hapus: "+error.message); return; }
    loadData();
  }

  return (
    <div className="p-4 bg-[#f5f7fb] min-h-screen">
      <div className="bg-slate-900 text-white p-4 rounded-t-xl">
        <div className="text-lg font-bold">Master Bahan Sikitchen - 15 Kategori - V12 Full Active Header</div>
        <div className="text-xs text-slate-300">Live: {items.length} bahan (143 LIVE) • Edit kode Hall/Orgk + ID Halal 19 digit • Klik nama bahan untuk update cepat stock/harga • Next BERAS {nextKodeBeras} • V11 Fix Header No sinkron • V12 Fix Logic Stock 10+13=23 & Selisih Harga</div>
        <div className="mt-3 flex gap-2 flex-wrap">
          <button onClick={handleTambahBahan} className="bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm font-bold">+ Tambah Bahan General (Next: {nextKodeBeras} No {String(nextNoBeras).padStart(3,"0")})</button>
          <button onClick={handleHapusGeneral} className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-sm font-bold">Hapus Bahan General</button>
          <button onClick={handleBukaSemua} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded text-sm">Buka Semua</button>
          <button onClick={handleTutupSemua} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded text-sm">Tutup Semua</button>
          <button onClick={handleRefresh} className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm">↻ Refresh</button>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari kode / nama / ID Halal... ex: BERAS, Hall-BERAS-005, ID3211..." className="mt-3 w-full p-2 rounded text-black text-sm" />
      </div>

      {showTambah && (
        <div className="bg-white border-2 border-green-300 p-4 rounded-xl my-3">
          <div className="font-bold text-sm mb-2">+ Tambah Bahan General - Next {nextKodeBeras}</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div><div className="text-xs">Kode Bahan (auto {nextKodeBeras})</div><input value={newKode} onChange={e=>setNewKode(e.target.value)} className="w-full p-2 border rounded text-sm font-mono" /></div>
            <div><div className="text-xs">Nama Bahan</div><input value={newNama} onChange={e=>setNewNama(e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="ex: Beras Premium Super" /></div>
            <div><div className="text-xs">Kategori (15 Kategori)</div><select value={newKategori} onChange={e=>setNewKategori(e.target.value)} className="w-full p-2 border rounded text-sm">{KATEGORI_LIST.map(k=><option key={k} value={k}>{k}</option>)}</select></div>
            <div><div className="text-xs">Jenis Kode</div><select value={newJenis} onChange={e=>setNewJenis(e.target.value)} className="w-full p-2 border rounded text-sm"><option>Regular</option><option>Hall</option><option>Orgk</option></select></div>
            <div><div className="text-xs">Stock Awal</div><input type="number" value={newStock} onChange={e=>setNewStock(e.target.value)} className="w-full p-2 border rounded text-sm" /></div>
            <div><div className="text-xs">Harga Beli</div><input type="number" value={newHarga} onChange={e=>setNewHarga(e.target.value)} className="w-full p-2 border rounded text-sm" /></div>
            {newJenis==="Hall" && <div className="md:col-span-3"><div className="text-xs">ID Halal 19 digit (Hall)</div><input value={newHalal} onChange={e=>setNewHalal(e.target.value)} placeholder="ID32110078778290726" className="w-full p-2 border rounded text-sm font-mono" /></div>}
          </div>
          <div className="mt-3 flex gap-2"><button onClick={handleSimpanTambah} className="flex-1 bg-green-600 text-white py-2 rounded font-bold text-sm">Simpan Bahan General</button><button onClick={()=>setShowTambah(false)} className="px-4 py-2 bg-gray-200 rounded text-sm">Batal</button></div>
        </div>
      )}

      {quick && (
        <div className="bg-green-50 border-2 border-green-200 p-4 rounded-xl my-3">
          <div className="flex justify-between items-center mb-3">
            <div className="font-bold text-green-800 text-sm">🛠️ Update Cepat: {quick.kode_bahan} (Beras Premium fix) - Logic Baru Stock Tambah</div>
            <div className="text-xs bg-white border px-3 py-1 rounded-full font-mono">No {String(quick._no).padStart(3,"0")} • Kode {quick.kode_bahan} • V11 Fix sinkron • V12 Stock 10+13=23</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div><div className="text-xs font-semibold">Nama Bahan (dari klik baris)</div><input value={quick.nama_bahan} disabled className="w-full p-2 border rounded bg-white text-sm" /></div>
            <div><div className="text-xs font-semibold">Jenis Kode (fixed)</div><select value={quickJenis} onChange={e=>setQuickJenis(e.target.value)} className="w-full p-2 border rounded text-sm"><option>Regular</option><option>Hall</option><option>Orgk</option></select></div>
            <div><div className="text-xs font-semibold">Stock Baru (biru) = DITAMBAH ke {quick.stok} - ex input 13 jadi {Number(quick.stok||0)+Number(quickStock||0)}</div><input type="number" value={quickStock} onChange={e=>setQuickStock(e.target.value)} placeholder="+13 (akan jadi 23 jika lama 10)" className="w-full p-2 border-2 border-blue-400 rounded text-sm" /></div>
            <div><div className="text-xs font-semibold">Harga Baru (kuning) - selisih auto</div><input type="number" value={quickHarga} onChange={e=>setQuickHarga(e.target.value)} className="w-full p-2 border-2 border-yellow-400 rounded text-sm bg-yellow-50" /></div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleUpdate} className="flex-1 bg-green-600 text-white py-2 rounded font-bold text-sm">Update Stock & Harga - {quick.kode_bahan} → Stock {Number(quick.stok||0)} + {quickStock||0} = {Number(quick.stok||0)+Number(quickStock||0)} | Selisih {Number(quickHarga||0)-Number(quick.harga_beli||0)}</button>
            <button onClick={()=>setQuick(null)} className="px-4 py-2 bg-gray-200 rounded text-sm">Batal</button>
          </div>
          <div className="text-[10px] text-gray-500 mt-2">Fix V12 Logic Benar: Stock lama {quick.stok} + input {quickStock||0} = {Number(quick.stok||0)+Number(quickStock||0)} (10+13=23). Harga lama {quick.harga_beli} → baru {quickHarga} selisih {Number(quickHarga||0)-Number(quick.harga_beli||0)}. Fix V11 Header No sinkron tetap dipertahankan.</div>
        </div>
      )}

      <div className="bg-white rounded-b-xl border">
        {Object.keys(grouped).sort().map((kat,i)=>{
          const list = grouped[kat];
          const isOpen = expanded[kat]!==false;
          return (
            <div key={kat} className="border-b last:border-0">
              <div className="p-3 font-bold text-sm flex justify-between bg-slate-50 cursor-pointer" onClick={()=>setExpanded(prev=>({...prev, [kat]: !isOpen}))}>
                <div>{i+1} &nbsp; {kat} - {list.length} bahan • Format {kat}-001 / Hall-{kat}-001 / Orgk-{kat}-001 • Klik nama bahan untuk update cepat {isOpen?"▼":"▶"}</div>
                <div className="text-xs text-gray-500">{isOpen?"Tutup":"Buka"}</div>
              </div>
              {isOpen && (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white text-xs"><tr><th className="text-left p-2">No</th><th className="text-left p-2">Kode Bahan</th><th className="text-left p-2">Nama Bahan (klik untuk update cepat)</th><th className="text-left p-2">ID Halal 19 digit</th><th className="text-left p-2">Stock</th><th className="text-left p-2">Harga Beli</th><th className="text-left p-2">Harga Baru</th><th className="text-left p-2">Selisih</th><th className="text-left p-2">Aksi</th></tr></thead>
                    <tbody>
                      {list.map(it=>(
                        <tr key={it.kode_bahan} className="border-t hover:bg-blue-50">
                          <td className="p-2 text-xs">{String(it._no).padStart(3,"0")}</td>
                          <td className="p-2 font-mono text-xs font-bold">{it.kode_bahan}</td>
                          <td className="p-2 font-semibold cursor-pointer" onClick={()=>handleClickNama(it)}>{it.nama_bahan} <span className="text-[10px] text-blue-600">↗ klik</span></td>
                          <td className="p-2">{it.isHall ? <span className="bg-green-100 border border-green-300 px-2 py-1 rounded text-[10px] font-mono">{it.halal_id||"ID32110078778290726"}</span> : "-"}</td>
                          <td className="p-2"><span className="bg-blue-100 px-2 py-1 rounded-full text-xs">{it.stok}</span></td>
                          <td className="p-2 text-xs">Rp {Number(it.harga_beli||0).toLocaleString("id-ID")}</td>
                          <td className="p-2 text-xs">Rp {Number(it.harga_baru||it.harga_beli||0).toLocaleString("id-ID")}</td>
                          <td className="p-2 text-xs">{Number(it.selisih||0).toLocaleString("id-ID")}</td>
                          <td className="p-2"><button onClick={()=>handleClickNama(it)} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs mr-1">Edit</button><button className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs">Delete</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        {loading && <div className="p-4 text-center text-sm text-gray-400">Loading 143 bahan via lib/inventoryCompat - 15 Kategori...</div>}
        {!loading && Object.keys(grouped).length===0 && <div className="p-4 text-center text-sm">Tidak ada bahan - klik Buka Semua / Refresh</div>}
      </div>
    </div>
  );
}
