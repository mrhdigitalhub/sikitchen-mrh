"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Kategori sesuai gambar Bos
const KATEGORI_LIST = [
  "BIN - Bumbu Instan",
  "BSG - Bumbu Segar", 
  "HEW - Protein Hewani",
  "KEM - Kemasan /Packing",
  "NAB - Protein Nabati",
  "SAY - Sayuran",
  "KAR - Karbohidrat",
  "MIN - Minyak & Lemak"
];

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvData, setCsvData] = useState([]);
  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState("Semua");

  const [form, setForm] = useState({
    code: "",
    name: "",
    category: "HEW - Protein Hewani",
    sub_category: "",
    stock: "",
    unit: "Kg",
    price: "",
    supplier_name: "",
    supplier_phone: ""
  });

  // FETCH - dinamis baca 2 nama tabel (inventory_items & bahan_baku)
  const fetchItems = async () => {
    setLoading(true);
    let data = null;
    // coba inventory_items dulu
    let res = await supabase.from("inventory_items").select("*").order("code", {ascending: true});
    if (res.data && res.data.length > 0) {
      data = res.data;
    } else {
      // fallback ke bahan_baku
      let res2 = await supabase.from("bahan_baku").select("*").order("code", {ascending: true});
      if (res2.data) data = res2.data;
    }
    // fallback ke inventory (nama lama)
    if (!data) {
      let res3 = await supabase.from("inventory").select("*").order("code", {ascending: true});
      if (res3.data) data = res3.data;
    }
    setItems(data || []);
    setLoading(false);
  };

  useEffect(()=>{ fetchItems(); }, []);

  // TAMBAH BAHAN BARU - CARA PERMANEN
  const handleAdd = async (e) => {
    e.preventDefault();
    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name,
      category: form.category,
      sub_category: form.sub_category,
      stock: parseFloat(form.stock) || 0,
      unit: form.unit,
      price: parseInt(form.price.toString().replace(/\D/g,'')) || 0,
      supplier_name: form.supplier_name,
      supplier_phone: form.supplier_phone,
      company_id: "sikitchen-mrh"
    };
    // insert ke inventory_items (tabel utama)
    const { error } = await supabase.from("inventory_items").insert([payload]);
    if (error) {
      // coba fallback bahan_baku
      const { error2 } = await supabase.from("bahan_baku").insert([payload]);
      if (error2) { alert("Gagal: "+error.message); return; }
    }
    alert(`✅ Bahan ${payload.name} berhasil ditambah! Dashboard Layer 1 auto LIVE.`);
    setShowAddModal(false);
    setForm({code:"",name:"",category:"HEW - Protein Hewani",sub_category:"",stock:"",unit:"Kg",price:"",supplier_name:"",supplier_phone:""});
    fetchItems();
  };

  // IMPORT CSV - CARA 2 DINAMIS
  const handleCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split("\n").filter(l=>l.trim());
      const headers = lines[0].split(",").map(h=>h.trim().replace(/"/g,''));
      const rows = lines.slice(1).map(line=>{
        const vals = line.split(",").map(v=>v.trim().replace(/"/g,''));
        let obj = {};
        headers.forEach((h,i)=> obj[h]=vals[i]);
        return {
          code: obj.code || obj.Kode,
          name: obj.name || obj.Nama_Lengkap || obj.Nama,
          category: obj.category || obj.Kategori,
          sub_category: obj.sub_category || obj.Sub,
          stock: parseFloat(obj.stock || obj.Stock) || 0,
          unit: obj.unit || obj.Unit || "Kg",
          price: parseInt((obj.price||obj.Harga_Baru||"").toString().replace(/\D/g,''))||0,
          supplier_name: obj.supplier_name || obj.Supplier,
          supplier_phone: obj.supplier_phone || obj.Phone || "",
          company_id: "sikitchen-mrh"
        };
      });
      setCsvData(rows);
    };
    reader.readAsText(file);
  };

  const handleImportSave = async () => {
    if (csvData.length===0) return alert("Tidak ada data CSV");
    const { error } = await supabase.from("inventory_items").insert(csvData);
    if (error) { alert("Gagal import: "+error.message); return; }
    alert(`✅ Berhasil import ${csvData.length} bahan! Dashboard LIVE auto update.`);
    setShowImportModal(false);
    setCsvData([]);
    fetchItems();
  };

  // FILTER SEARCH
  const filtered = items.filter(it=>{
    const matchSearch = `${it.code} ${it.name}`.toLowerCase().includes(search.toLowerCase());
    const matchKat = filterKategori==="Semua" || it.category===filterKategori;
    return matchSearch && matchKat;
  });

  const quickFixSapi = async () => {
    await supabase.from("inventory_items").update({price:120000}).eq("code","BHN-HEW-003");
    await supabase.from("bahan_baku").update({price:120000}).eq("code","BHN-HEW-003");
    alert("✅ Daging Sapi update Rp 120.000/Kg - HPP auto live");
    fetchItems();
  };

  return (
    <div className="p-4 bg-[#f1f5f9] min-h-screen">
      <div className="bg-white p-4 rounded-xl shadow mb-4">
        <h1 className="text-xl font-bold text-slate-800">Data Inventory-Master Bahan - Update Harga</h1>
        <p className="text-sm text-slate-500">Klik Edit di baris bahan untuk rubah Harga Baru • HPP di Master Menu & Resep auto ikut harga_live • Contoh: BHN-HEW-003 Daging Sapi Rp 15.500 → Rp 120.000/Kg</p>
        <div className="flex gap-2 mt-3 flex-wrap">
          <button onClick={quickFixSapi} className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold">🖊 Quick Fix Daging Sapi Rp 120.000/Kg</button>
          <button onClick={()=>setShowAddModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full text-sm font-bold">+ Tambah Bahan Baru</button>
          <button onClick={()=>setShowImportModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-bold">📤 Import CSV / Excel</button>
          <a href="/template_import_bahan_sikitchen.csv" download className="bg-slate-200 text-slate-700 px-4 py-2 rounded-full text-sm">⬇ Download Template</a>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="bg-slate-900 text-white p-3 flex justify-between items-center">
          <h2 className="font-bold">Tabel {filtered.length}/{items.length} Bahan - Klik Edit untuk Update Harga</h2>
          <div className="flex gap-2">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search BHN-HEW-003 / Daging" className="px-3 py-1 rounded text-slate-900 text-sm w-60" />
            <select value={filterKategori} onChange={e=>setFilterKategori(e.target.value)} className="px-3 py-1 rounded text-slate-900 text-sm">
              <option>Semua</option>
              {KATEGORI_LIST.map(k=><option key={k}>{k}</option>)}
            </select>
          </div>
        </div>

        {loading ? <div className="p-10 text-center">Loading LIVE Supabase...</div> : (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2 text-left">Kode</th>
              <th className="p-2 text-left">Nama Lengkap</th>
              <th className="p-2">Kategori</th>
              <th className="p-2">Sub</th>
              <th className="p-2">Stock</th>
              <th className="p-2 bg-yellow-100">Harga Baru</th>
              <th className="p-2">Supplier</th>
              <th className="p-2 bg-yellow-400">Aksi Update</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(row=>(
              <tr key={row.code} className="border-b hover:bg-yellow-50">
                <td className="p-2 font-mono text-blue-600 font-bold">{row.code}</td>
                <td className="p-2 font-semibold">{row.name}</td>
                <td className="p-2 bg-yellow-50 text-xs">{row.category}</td>
                <td className="p-2 text-xs">{row.sub_category}</td>
                <td className="p-2">{row.stock} {row.unit}</td>
                <td className="p-2 bg-blue-50 font-bold text-center">Rp {Number(row.price).toLocaleString("id-ID")} <div className="text-[10px] text-slate-500">Rp {row.price}/{row.unit}</div></td>
                <td className="p-2 text-xs"><div>{row.supplier_name}</div><div className="text-emerald-600">{row.supplier_phone}</div></td>
                <td className="p-2"><button className="bg-slate-900 text-white px-3 py-1 rounded-full text-xs">🖊 Edit Harga</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        )}
      </div>

      {/* MODAL TAMBAH BAHAN BARU - CARA PERMANEN */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAdd} className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">+ Tambah Bahan Baru - LIVE Supabase & Dashboard</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-bold">Kode *</label><input required value={form.code} onChange={e=>setForm({...form,code:e.target.value})} placeholder="BHN-HEW-004" className="w-full border p-2 rounded" /></div>
              <div><label className="text-xs font-bold">Nama Lengkap *</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Daging Ayam Fillet" className="w-full border p-2 rounded" /></div>
              <div><label className="text-xs font-bold">Kategori *</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="w-full border p-2 rounded">{KATEGORI_LIST.map(k=><option key={k}>{k}</option>)}</select></div>
              <div><label className="text-xs font-bold">Sub</label><input value={form.sub_category} onChange={e=>setForm({...form,sub_category:e.target.value})} placeholder="Fillet" className="w-full border p-2 rounded" /></div>
              <div><label className="text-xs font-bold">Stock</label><input type="number" step="0.1" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} placeholder="10" className="w-full border p-2 rounded" /></div>
              <div><label className="text-xs font-bold">Unit</label><select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} className="w-full border p-2 rounded"><option>Kg</option><option>Pcs</option><option>Gram</option><option>Liter</option><option>Pack</option></select></div>
              <div><label className="text-xs font-bold">Harga Baru *</label><input required type="number" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="35000" className="w-full border p-2 rounded" /></div>
              <div><label className="text-xs font-bold">Supplier</label><input value={form.supplier_name} onChange={e=>setForm({...form,supplier_name:e.target.value})} placeholder="Toko Pangan Jaya" className="w-full border p-2 rounded" /></div>
              <div className="col-span-2"><label className="text-xs font-bold">Supplier Phone</label><input value={form.supplier_phone} onChange={e=>setForm({...form,supplier_phone:e.target.value})} placeholder="0817..." className="w-full border p-2 rounded" /></div>
            </div>
            <div className="flex gap-2 mt-5">
              <button type="submit" className="flex-1 bg-emerald-600 text-white py-2 rounded-full font-bold">Simpan - LIVE ke Dashboard Layer 1</button>
              <button type="button" onClick={()=>setShowAddModal(false)} className="flex-1 bg-slate-200 py-2 rounded-full">Batal</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL IMPORT CSV */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-2">📤 Import CSV / Excel - Format 1:1 Supabase</h3>
            <p className="text-xs text-slate-500 mb-3">Format kolom wajib: code, name, category, sub_category, stock, unit, price, supplier_name, supplier_phone, company_id - Download template dulu untuk contoh.</p>
            <input type="file" accept=".csv" onChange={handleCSV} className="w-full border p-2 rounded mb-3" />
            {csvData.length>0 && (
              <>
                <div className="bg-slate-50 p-2 rounded text-xs mb-3 max-h-60 overflow-auto">
                  <div>Preview {csvData.length} baris:</div>
                  <table className="w-full mt-2 text-[11px]">
                    <thead><tr><th>Kode</th><th>Nama</th><th>Harga</th><th>Stock</th></tr></thead>
                    <tbody>{csvData.slice(0,5).map((r,i)=><tr key={i}><td>{r.code}</td><td>{r.name}</td><td>{r.price}</td><td>{r.stock} {r.unit}</td></tr>)}</tbody>
                  </table>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleImportSave} className="flex-1 bg-blue-600 text-white py-2 rounded-full font-bold">Import {csvData.length} Bahan - LIVE Dashboard</button>
                  <button onClick={()=>setShowImportModal(false)} className="flex-1 bg-slate-200 py-2 rounded-full">Batal</button>
                </div>
              </>
            )}
            {!csvData.length && <button onClick={()=>setShowImportModal(false)} className="w-full bg-slate-200 py-2 rounded-full mt-3">Tutup</button>}
          </div>
        </div>
      )}
    </div>
  );
}
