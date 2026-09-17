"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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

function mapRow(row) {
  return {
    id: row.id,
    code: row.kode_bahan || row.code || "",
    name: row.nama_bahan || row.name || "",
    category: row.kategori || row.category || "",
    sub_category: row.sub_kategori || row.sub_category || "",
    stock: row.stok ?? row.stock_qty ?? row.stock ?? 0,
    unit: row.satuan || row.unit || "Kg",
    price: row.harga_baru ?? row.price_per_unit ?? row.price ?? 0,
    supplier_name: row.supplier_nama || row.supplier_name || "",
    supplier_phone: row.supplier_wa || row.supplier_phone || "",
    company_id: row.perusahaan || row.company_id || "sikitchen-mrh",
    _raw: row
  };
}

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvData, setCsvData] = useState([]);
  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState("Semua");

  const [form, setForm] = useState({
    kode_bahan: "",
    nama_bahan: "",
    kategori: "HEW - Protein Hewani",
    sub_kategori: "",
    stok: "",
    satuan: "Kg",
    harga_baru: "",
    supplier_nama: "",
    supplier_wa: ""
  });

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .order("kode_bahan", { ascending: true });
    if (error) {
      console.error(error);
      setItems([]);
    } else {
      setItems((data || []).map(mapRow));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.kode_bahan || !form.nama_bahan) {
      alert("Kode dan Nama wajib!");
      return;
    }
    const payload = {
      kode_bahan: form.kode_bahan,
      nama_bahan: form.nama_bahan,
      kategori: form.kategori,
      sub_kategori: form.sub_kategori,
      stok: parseFloat(form.stok) || 0,
      satuan: form.satuan,
      harga_baru: parseFloat(form.harga_baru) || 0,
      supplier_nama: form.supplier_nama,
      supplier_wa: form.supplier_wa,
      perusahaan: "sikitchen-mrh",
      status: "aktif",
      // isi kolom legacy biar kompatibel
      name: form.nama_bahan,
      category: form.kategori,
      stock_qty: parseFloat(form.stok) || 0,
      unit: form.satuan,
      price_per_unit: parseFloat(form.harga_baru) || 0,
      supplier_name: form.supplier_nama,
      supplier_phone: form.supplier_wa,
      company_id: "sikitchen-mrh"
    };

    const { error } = await supabase.from("inventory_items").insert(payload);
    if (error) {
      alert("Gagal: " + error.message);
    } else {
      setShowAddModal(false);
      setForm({
        kode_bahan: "", nama_bahan: "", kategori: "HEW - Protein Hewani",
        sub_kategori: "", stok: "", satuan: "Kg", harga_baru: "",
        supplier_nama: "", supplier_wa: ""
      });
      fetchItems();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split("\n").filter(l => l.trim() !== "");
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const rows = lines.slice(1).map(line => {
        const vals = line.split(",");
        const obj = {};
        headers.forEach((h, i) => obj[h] = vals[i]?.trim());
        return obj;
      });
      setCsvData(rows);
    };
    reader.readAsText(file);
  };

  const handleImportSave = async () => {
    if (csvData.length === 0) {
      alert("Tidak ada data!");
      return;
    }
    const toInsert = csvData.map(r => ({
      kode_bahan: r.kode_bahan || r.code || `BHN-${Date.now()}-${Math.floor(Math.random()*100)}`,
      nama_bahan: r.nama_bahan || r.name || r.nama || "",
      kategori: r.kategori || r.category || "LAIN",
      sub_kategori: r.sub_kategori || r.sub_category || "",
      stok: parseFloat(r.stok || r.stock || r.stock_qty || 0),
      satuan: r.satuan || r.unit || "Kg",
      harga_baru: parseFloat(r.harga_baru || r.price || r.price_per_unit || 0),
      supplier_nama: r.supplier_nama || r.supplier_name || "",
      supplier_wa: r.supplier_wa || r.supplier_phone || "",
      perusahaan: "sikitchen-mrh",
      status: "aktif",
      name: r.nama_bahan || r.name || "",
      category: r.kategori || r.category || "LAIN",
      stock_qty: parseFloat(r.stok || r.stock || 0),
      unit: r.satuan || r.unit || "Kg",
      price_per_unit: parseFloat(r.harga_baru || r.price || 0),
      company_id: "sikitchen-mrh"
    })).filter(x => x.nama_bahan);

    const { error } = await supabase.from("inventory_items").upsert(toInsert, { onConflict: "kode_bahan" });
    if (error) {
      alert("Gagal import: " + error.message);
    } else {
      alert(`Berhasil import ${toInsert.length} bahan!`);
      setShowImportModal(false);
      setCsvData([]);
      fetchItems();
    }
  };

  const downloadTemplate = () => {
    const csv = `kode_bahan,nama_bahan,kategori,sub_kategori,stok,satuan,harga_baru,supplier_nama,supplier_wa
BHN-TEST-001,Ayam Test,HEW - Protein Hewani,Ayam,10,Kg,40000,Toko Test,081200000001
BHN-TEST-002,Beras Test,KAR - Karbohidrat,Beras,20,Kg,14500,Toko Beras,081200000002
BHN-TEST-003,Minyak Test,MIN - Minyak & Lemak,Minyak,5,Liter,16000,Toko Sembako,081200000003`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_import_bahan_sikitchen.csv";
    a.click();
  };

  const filtered = items.filter(it => {
    const matchSearch = (it.name + it.code + it.category).toLowerCase().includes(search.toLowerCase());
    const matchKat = filterKategori === "Semua" || it.category === filterKategori;
    return matchSearch && matchKat;
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Inventory Bahan Baku - {items.length} Bahan (Live)</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowAddModal(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold">+ Tambah Bahan Baru</button>
          <button onClick={() => setShowImportModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">📤 Import CSV / Excel</button>
          <button onClick={downloadTemplate} className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded">⬇ Download Template</button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari kode / nama / kategori..." className="border px-3 py-2 rounded w-full md:w-1/3" />
        <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)} className="border px-3 py-2 rounded">
          <option value="Semua">Semua Kategori</option>
          {KATEGORI_LIST.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      {loading ? <div>Loading...</div> : (
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Kode</th>
                <th className="p-2 text-left">Nama</th>
                <th className="p-2 text-left">Kategori</th>
                <th className="p-2 text-left">Stok</th>
                <th className="p-2 text-left">Satuan</th>
                <th className="p-2 text-left">Harga</th>
                <th className="p-2 text-left">Supplier</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(it => (
                <tr key={it.id} className="border-t hover:bg-gray-50">
                  <td className="p-2 font-mono">{it.code}</td>
                  <td className="p-2 font-bold">{it.name}</td>
                  <td className="p-2">{it.category}</td>
                  <td className="p-2">{it.stock}</td>
                  <td className="p-2">{it.unit}</td>
                  <td className="p-2">Rp {Number(it.price).toLocaleString("id-ID")}</td>
                  <td className="p-2">{it.supplier_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-2 text-xs text-gray-500">Tabel {filtered.length}/{items.length} Bahan - Klik Edit untuk ubah, hapus, atau tambah resep. Total Live: {items.length} bahan (sebelumnya 16, sekarang {items.length})</div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAdd} className="bg-white rounded-lg p-6 w-full max-w-lg space-y-3">
            <h2 className="text-lg font-bold">Tambah Bahan Baru</h2>
            <input required value={form.kode_bahan} onChange={e => setForm({ ...form, kode_bahan: e.target.value })} placeholder="Kode Bahan (BHN-...)" className="border w-full px-3 py-2 rounded" />
            <input required value={form.nama_bahan} onChange={e => setForm({ ...form, nama_bahan: e.target.value })} placeholder="Nama Bahan" className="border w-full px-3 py-2 rounded" />
            <select value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value })} className="border w-full px-3 py-2 rounded">
              {KATEGORI_LIST.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input value={form.sub_kategori} onChange={e => setForm({ ...form, sub_kategori: e.target.value })} placeholder="Sub Kategori" className="border px-3 py-2 rounded" />
              <input value={form.satuan} onChange={e => setForm({ ...form, satuan: e.target.value })} placeholder="Satuan (Kg/Pcs/Liter)" className="border px-3 py-2 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" step="0.01" value={form.stok} onChange={e => setForm({ ...form, stok: e.target.value })} placeholder="Stok" className="border px-3 py-2 rounded" />
              <input type="number" value={form.harga_baru} onChange={e => setForm({ ...form, harga_baru: e.target.value })} placeholder="Harga Baru" className="border px-3 py-2 rounded" />
            </div>
            <input value={form.supplier_nama} onChange={e => setForm({ ...form, supplier_nama: e.target.value })} placeholder="Supplier Nama" className="border w-full px-3 py-2 rounded" />
            <input value={form.supplier_wa} onChange={e => setForm({ ...form, supplier_wa: e.target.value })} placeholder="Supplier WA" className="border w-full px-3 py-2 rounded" />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded bg-gray-200">Batal</button>
              <button type="submit" className="px-4 py-2 rounded bg-green-600 text-white">Simpan</button>
            </div>
          </form>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg space-y-3">
            <h2 className="text-lg font-bold">Import CSV / Excel</h2>
            <p className="text-sm text-gray-600">Upload file CSV dengan header: kode_bahan,nama_bahan,kategori,sub_kategori,stok,satuan,harga_baru,supplier_nama,supplier_wa</p>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="border w-full px-3 py-2 rounded" />
            {csvData.length > 0 && <div className="text-sm bg-green-50 p-2 rounded">{csvData.length} baris siap import. Preview: {csvData[0]?.nama_bahan || csvData[0]?.name}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowImportModal(false)} className="px-4 py-2 rounded bg-gray-200">Batal</button>
              <button onClick={handleImportSave} className="px-4 py-2 rounded bg-blue-600 text-white">Import Sekarang</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
