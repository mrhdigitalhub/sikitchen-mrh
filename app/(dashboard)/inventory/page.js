"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function InventoryUpdateHarga() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterKategori, setFilterKategori] = useState('Semua')
  const [editItem, setEditItem] = useState(null)
  const [editForm, setEditForm] = useState({ harga_baru: '', stok: '', supplier_nama: '', supplier_wa: '' })

  const kategoriLabel = {'POK':'Bahan Pokok','HEW':'Protein Hewani','NAB':'Protein Nabati','SAY':'Sayuran','BSG':'Bumbu Segar','BIN':'Bumbu Instan','SAO':'Saos & Cairan','PLG':'Pelengkap & garnish','KEM':'Kemasan /Packing'}

  function formatKategori(kode){ return `${kode} - ${kategoriLabel[kode]||kode}` }

  async function load(){
    setLoading(true)
    const { data } = await supabase.from('inventory_items').select('*').order('kode_bahan').limit(500)
    if(data) setItems(data)
    setLoading(false)
  }
  useEffect(()=>{ load() }, [])

  const filteredItems = useMemo(()=>{
    let f = items
    if(filterKategori !== 'Semua') f = f.filter(it => it.kategori === filterKategori)
    if(searchQuery) f = f.filter(it => (it.nama_bahan||'').toLowerCase().includes(searchQuery.toLowerCase()) || (it.kode_bahan||'').toLowerCase().includes(searchQuery.toLowerCase()) || (it.supplier_nama||'').toLowerCase().includes(searchQuery.toLowerCase()))
    return f
  }, [items, searchQuery, filterKategori])

  function startEdit(it){
    setEditItem(it)
    setEditForm({ harga_baru: String(it.harga_baru||''), stok: String(it.stok||''), supplier_nama: it.supplier_nama||'', supplier_wa: it.supplier_wa||'' })
  }

  async function saveEdit(e){
    e.preventDefault()
    if(!editItem) return
    const payload = {
      harga_baru: Number(editForm.harga_baru)||0,
      price_per_unit: Number(editForm.harga_baru)||0,
      stok: Number(editForm.stok)||0,
      stock_qty: Number(editForm.stok)||0,
      supplier_nama: editForm.supplier_nama,
      supplier_wa: editForm.supplier_wa
    }
    const { error } = await supabase.from('inventory_items').update(payload).eq('id', editItem.id)
    if(error) return alert(error.message)
    alert(`✅ ${editItem.nama_bahan} - Harga Baru Rp ${Number(editForm.harga_baru).toLocaleString('id-ID')} disimpan! HPP di Master Menu & Resep auto update!`)
    setEditItem(null)
    load()
  }

  // Quick update harga khusus Daging Sapi
  async function quickUpdateDagingSapi(){
    const target = items.find(it => it.kode_bahan === 'BHN-HEW-003')
    if(!target) return alert('BHN-HEW-003 Daging Sapi tidak ditemukan')
    const { error } = await supabase.from('inventory_items').update({ harga_baru: 120000, price_per_unit: 120000 }).eq('id', target.id)
    if(error) return alert(error.message)
    alert('✅ Daging Sapi BHN-HEW-003 harga diupdate Rp 15.500 → Rp 120.000/Kg! HPP Daging rendang sekarang Rp 9.600 (0.08 Kg × 120.000) bukan Rp 1.240!')
    load()
  }

  if(loading) return <div className="p-6">Loading...</div>

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border">
        <div className="font-bold text-lg">Data Inventory-Master Bahan - Update Harga</div>
        <div className="text-[12px] text-slate-500">Klik Edit di baris bahan untuk rubah Harga Baru • HPP di Master Menu & Resep auto ikut harga_live • Contoh: BHN-HEW-003 Daging Sapi Rp 15.500 → Rp 120.000/Kg</div>
        <button onClick={quickUpdateDagingSapi} className="mt-3 bg-red-600 text-white px-4 py-2 rounded-full text-xs font-bold">🔧 Quick Fix Daging Sapi Rp 120.000/Kg</button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="bg-[#0A1931] text-white px-5 py-3 flex justify-between items-center">
          <span className="text-sm font-bold">Tabel {filteredItems.length}/{items.length} Bahan - Klik Edit untuk Update Harga</span>
          <div className="flex gap-2">
            <input className="px-3 py-1.5 rounded text-xs text-black w-[200px]" placeholder="Search BHN-HEW-003 / Daging Sapi / Supplier..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
            <select className="px-3 py-1.5 rounded text-xs text-black" value={filterKategori} onChange={e=>setFilterKategori(e.target.value)}><option value="Semua">Semua</option>{Object.keys(kategoriLabel).map(k=><option key={k} value={k}>{k} - {kategoriLabel[k]}</option>)}</select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-100"><tr><th className="p-2">Kode</th><th className="p-2 text-left">Nama Lengkap</th><th className="p-2">Kategori</th><th className="p-2">Sub</th><th className="p-2">Stock</th><th className="p-2 bg-yellow-50">Harga Baru</th><th className="p-2">Supplier</th><th className="p-2 bg-[#D4AF37] text-black">Aksi Update</th></tr></thead>
            <tbody>
              {filteredItems.slice(0,100).map(it=>(
                <tr key={it.id} className="border-b hover:bg-slate-50">
                  <td className="p-2 font-mono font-bold text-blue-700">{it.kode_bahan}</td>
                  <td className="p-2 font-bold">{it.nama_bahan}</td>
                  <td className="p-2 bg-[#FFF8E1] text-[11px]">{formatKategori(it.kategori)}</td>
                  <td className="p-2 bg-blue-50 font-bold">{it.sub_kategori}</td>
                  <td className="p-2 text-center">{it.stok} {it.satuan}</td>
                  <td className="p-2 text-right bg-yellow-50 font-bold">Rp {(it.harga_baru||0).toLocaleString('id-ID')}<div className="text-[9px] text-slate-500">{it.satuan==='Kg' ? `Rp ${(Number(it.harga_baru||0)/1000).toFixed(0)}/gram` : ''}</div></td>
                  <td className="p-2 text-[11px]">{it.supplier_nama}<br/><span className="text-green-600">{it.supplier_wa}</span></td>
                  <td className="p-2 text-center"><button onClick={()=>startEdit(it)} className="bg-[#0A1931] text-white px-3 py-1.5 rounded-full text-[11px] font-bold">✏️ Edit Harga</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={saveEdit} className="bg-white rounded-xl p-5 w-full max-w-md space-y-4 border-2 border-[#D4AF37]">
            <div className="font-bold">✏️ Update Harga: {editItem.kode_bahan} - {editItem.nama_bahan}</div>
            <div className="text-[11px] text-slate-500">Sub: {editItem.sub_kategori} - Satuan: {editItem.satuan} - HPP di Master Menu auto update dari harga_baru live</div>
            <div className="bg-yellow-50 p-3 rounded-lg border">
              <div className="text-[11px] font-bold">Harga Lama: Rp {(editItem.harga_baru||0).toLocaleString('id-ID')}/{editItem.satuan}</div>
              <div className="text-[10px]">Contoh akurat: Daging Sapi Rp 120.000/Kg, Ayam Potong Rp 35.000/Kg, Beras putih Rp 15.500/Kg</div>
            </div>
            <div><label className="text-[11px] font-bold">Harga Baru *</label><input type="number" className="w-full border-2 p-3 rounded-xl text-sm font-bold" value={editForm.harga_baru} onChange={e=>setEditForm({...editForm, harga_baru: e.target.value})} required placeholder="120000" /></div>
            <div className="text-[10px] text-slate-500">Preview: Rp {Number(editForm.harga_baru||0).toLocaleString('id-ID')}/{editItem.satuan} = Rp {(Number(editForm.harga_baru||0)/1000).toFixed(1)}/gram - Untuk resep 0.08 Kg = Rp {(Number(editForm.harga_baru||0)*0.08).toLocaleString('id-ID')}/porsi</div>
            <div><label className="text-[11px] font-bold">Stock - Qty</label><input type="number" className="w-full border-2 p-3 rounded-xl text-sm" value={editForm.stok} onChange={e=>setEditForm({...editForm, stok: e.target.value})} /></div>
            <div><label className="text-[11px] font-bold">Supplier Nama</label><input className="w-full border-2 p-3 rounded-xl text-sm bg-green-50" value={editForm.supplier_nama} onChange={e=>setEditForm({...editForm, supplier_nama: e.target.value})} /></div>
            <div><label className="text-[11px] font-bold">Supplier WA</label><input className="w-full border-2 p-3 rounded-xl text-sm bg-green-50" value={editForm.supplier_wa} onChange={e=>setEditForm({...editForm, supplier_wa: e.target.value})} /></div>
            <div className="flex gap-2">
              <button type="button" onClick={()=>setEditItem(null)} className="flex-1 bg-slate-200 text-black py-2.5 rounded-xl text-xs font-bold">Batal</button>
              <button type="submit" className="flex-1 bg-[#D4AF37] text-black py-2.5 rounded-xl text-xs font-bold">💾 Simpan Harga Baru</button>
            </div>
            <div className="text-[10px] text-slate-500">Setelah simpan, cek di Master Menu & Resep → Daging rendang HPP auto naik dari Rp 4.685 → Rp ~12.000 karena Daging Sapi 0.08 Kg × Rp 120.000 = Rp 9.600</div>
          </form>
        </div>
      )}
    </div>
  )
}
