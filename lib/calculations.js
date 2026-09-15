// CORE LOGIC - KONSISTEN DARI TAHAP 1 SAMPAI 5
// Tidak diubah kecuali ada perubahan rumus dari Bos Ridwan

export function calculateOrderNeeds(baseRecipePerPorsi, jumlahPorsi) {
  // baseRecipePerPorsi: array { bahan, qty_per_porsi, harga_per_satuan }
  return baseRecipePerPorsi.map(item => ({
    ...item,
    qty_total: item.qty_per_porsi * jumlahPorsi,
    cost_total: item.qty_per_porsi * jumlahPorsi * item.harga_per_satuan
  }))
}

export function calculateHPP(totalBahan, totalBOP, totalManPower, jumlahPorsi) {
  const total = totalBahan + totalBOP + totalManPower
  return { total, perPorsi: total / jumlahPorsi }
}

export function calculateManPower(jumlahPorsi) {
  // 1 orang prep = 30 porsi, 1 orang masak = 40 porsi, 1 packing = 50 porsi
  const prep = Math.ceil(jumlahPorsi / 30)
  const masak = Math.ceil(jumlahPorsi / 40)
  const packing = Math.ceil(jumlahPorsi / 50)
  return { prep, masak, packing, total: prep + masak + packing }
}

export function calculateWaktu(jumlahPorsi) {
  // Rumus non-linear: waktu tidak 4x lipat untuk 4x porsi
  const base50 = { prep: 2, masak: 3, packing: 1.5 } // jam untuk 50 porsi
  const factor = Math.pow(jumlahPorsi / 50, 0.7)
  const prep = base50.prep * factor
  const masak = base50.masak * factor
  const packing = base50.packing * factor
  return { prep, masak, packing, total: prep + masak + packing, factor }
}
