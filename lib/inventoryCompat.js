// lib/inventoryCompat.js - LIB PUSAT V10 FINAL
// Fungsi: kompatibel schema inventory_items (fix kode vs kode_bahan, stok vs stock, name NOT NULL, Hall/Orgk + ID Halal 19 digit)
// Semua dashboard (dashboard, production, menus, calculator) pakai ini biar kalau ada perubahan struktur cukup edit 1 file ini

import { supabase } from "@/lib/supabaseClient";

// Fetch semua bahan dengan kompatibel kolom lama & baru
export async function fetchInventoryCompat() {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .order("kode_bahan", { ascending: true });

  if (error) {
    console.error("inventoryCompat error:", error);
    return { items: [], error };
  }

  const items = (data || []).map((it) => {
    // Kompatibel: kode_bahan (baru) vs kode (lama), nama_bahan vs name vs nama, stok vs stock, harga_beli vs harga
    const kodeBahan = it.kode_bahan || it.kode || "";
    const namaBahan = it.nama_bahan || it.name || it.nama || "";
    const stok = Number(it.stok ?? it.stock ?? 0);
    const hargaBeli = Number(it.harga_beli ?? it.harga ?? it.harga_baru ?? 0);
    const kategori = it.kategori || "Lain";
    const satuan = it.satuan || "Kg";
    const halalId = it.halal_id || null;
    const isHall = kodeBahan.startsWith("Hall-");
    const isOrgk = kodeBahan.startsWith("Orgk-");
    const jenis = isHall ? "Hall" : isOrgk ? "Orgk" : "Regular";

    return {
      ...it,
      kode_bahan: kodeBahan,
      nama_bahan: namaBahan,
      name: it.name || namaBahan,
      stok,
      stock: stok,
      harga_beli: hargaBeli,
      harga: hargaBeli,
      harga_baru: Number(it.harga_baru ?? hargaBeli),
      kategori,
      satuan,
      halal_id: halalId,
      jenis,
      isHall,
      isOrgk,
      isRegular: !isHall && !isOrgk,
    };
  });

  return { items, error: null };
}

// Hitung statistik untuk Dashboard Owner - Total Aset Rp 183jt contoh jadi live
export function calcOwnerStats(items) {
  const totalBahan = items.length;
  const totalStock = items.reduce((s, it) => s + Number(it.stok || 0), 0);
  const totalAset = items.reduce((s, it) => s + Number(it.stok || 0) * Number(it.harga_beli || 0), 0);

  const hall = items.filter((i) => i.isHall);
  const orgk = items.filter((i) => i.isOrgk);
  const regular = items.filter((i) => i.isRegular);

  const totalAsetHall = hall.reduce((s, it) => s + Number(it.stok || 0) * Number(it.harga_beli || 0), 0);
  const totalAsetOrgk = orgk.reduce((s, it) => s + Number(it.stok || 0) * Number(it.harga_beli || 0), 0);

  const perKategori = {};
  items.forEach((it) => {
    const kat = it.kategori || "Lain";
    if (!perKategori[kat]) perKategori[kat] = { count: 0, stock: 0, aset: 0 };
    perKategori[kat].count++;
    perKategori[kat].stock += Number(it.stok || 0);
    perKategori[kat].aset += Number(it.stok || 0) * Number(it.harga_beli || 0);
  });

  return { totalBahan, totalStock, totalAset, hall, orgk, regular, totalAsetHall, totalAsetOrgk, perKategori };
}

// Filter untuk Produksi / Dapur - Hall-BERAS-005 (ID Halal 19 digit ID32110078778290726) vs Orgk-IKAN-001 (tanpa ID Halal)
export function filterForProduction(items, filterType = "all", search = "") {
  let list = [...items];
  if (filterType === "hall") list = list.filter((i) => i.isHall);
  if (filterType === "orgk") list = list.filter((i) => i.isOrgk);
  if (filterType === "regular") list = list.filter((i) => i.isRegular);
  if (filterType === "lowstock") list = list.filter((i) => Number(i.stok || 0) < 5);
  if (search) {
    const s = search.toLowerCase();
    list = list.filter((i) => (i.nama_bahan || "").toLowerCase().includes(s) || (i.kode_bahan || "").toLowerCase().includes(s) || (i.halal_id || "").toLowerCase().includes(s));
  }
  return list;
}

// Generate ID Halal 19 digit contoh ID32110078778290726
export function generateHalalId() {
  let n = "";
  for (let i = 0; i < 17; i++) n += Math.floor(Math.random() * 10);
  return "ID" + n;
}
export function formatRp(v) {
  const num = Number(v || 0);
  return "Rp " + num.toLocaleString("id-ID");
}
