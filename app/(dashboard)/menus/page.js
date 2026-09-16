"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function MasterMenuResepFixKategoriMenu() {
  const [items, setItems] = useState([])
  const [menus, setMenus] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [menuForm, setMenuForm] = useState({ name: '', description: '', base_porsi: 50, harga_jual: 25000, kategori_menu: 'Nasi Kotak' })
  const [selectedMenu, setSelectedMenu] = useState(null)
  const [newRecipe, setNewRecipe] = useState({ inventory_item_id: '', qty_per_porsi: '' })
  const [searchBahan, setSearchBahan] = useState('')
  const [errorInfo, setErrorInfo] = useState('')

  async function loadAll(){
    setLoading(true)
    const { data: inv } = await supabase.from('inventory_items').select('*').order('kode_bahan').limit(500)
    const { data: m, error: mErr } = await supabase.from('menus').select('*').order('created_at', { ascending: false }).limit(100)
    if(mErr){
      setErrorInfo(`Error load menus: ${mErr.message} - Tabel menus mungkin belum ada kolom kategori_menu`)
    }
    const { data: rec } = await supabase.from('recipes').select('*, inventory_items(kode_bahan,nama_bahan,name,satuan,unit,harga_baru,price_per_unit), menus(name)').limit(1000)
    if(inv) setItems(inv)
    setMenus(m||[])
    setRecipes(rec||[])
    setLoading(false)
  }
  useEffect(()=>{ loadAll() }, [])

  const filteredBahan = useMemo(()=>{
    if(!searchBahan.trim()) return items.slice(0,50)
    const q = searchBahan.toLowerCase()
    return items.filter(it => (it.nama_bahan||'').toLowerCase().includes(q) || (it.kode_bahan||'').toLowerCase().includes(q) || (it.supplier_nama||'').toLowerCase().includes(q) || (it.kategori||'').toLowerCase().includes(q)).slice(0,50)
  }, [items, searchBahan])

  function getRecipesForMenu(menuId){ return recipes.filter(r => r.menu_id === menuId) }
  function calculateHPP(menuId){
    const recs = getRecipesForMenu(menuId)
    let total = 0
    for(const r of recs){
      const harga = Number(r.inventory_items?.harga_baru || r.inventory_items?.price_per_unit || 0)
      const qty = Number(r.qty_per_porsi || 0)
      total += harga * qty
    }
    return total
  }

  async function createMenu(e){
    e.preventDefault()
    if(!menuForm.name.trim()) return alert('Isi Nama Menu')
    setErrorInfo('')
    
    // ✅ FIX: Coba payload lengkap dulu, kalau gagal karena kolom kategori_menu tidak ada, coba payload minimal
    const payloadFull = { 
      name: menuForm.name.trim(), 
      description: menuForm.description, 
      base_porsi: Number(menuForm.base_porsi)||50, 
      harga_jual_per_porsi: Number(menuForm.harga_jual)||25000, 
      kategori_menu: menuForm.kategori_menu, 
      status: 'Aktif' 
    }
    
    let { data, error } = await supabase.from('menus').insert(payloadFull).select().single()
    
    if(error && error.message.includes('kategori_menu')){
      // ✅ Kolom kategori_menu tidak ada di DB lama - coba tanpa kategori_menu
      console.log('kategori_menu tidak ada, coba tanpa kolom itu')
      const payloadMinimal = {
        name: menuForm.name.trim(),
        description: menuForm.description,
        base_porsi: Number(menuForm.base_porsi)||50,
        harga_jual_per_porsi: Number(menuForm.harga_jual)||25000,
        status: 'Aktif'
      }
      const result2 = await supabase.from('menus').insert(payloadMinimal).select().single()
      data = result2.data
      error = result2.error
      
      if(error && error.message.includes('base_porsi')){
        // Coba lebih minimal lagi - hanya name & description
        const payloadSuperMinimal = {
          name: menuForm.name.trim(),
          description: menuForm.description
        }
        const result3 = await supabase.from('menus').insert(payloadSuperMinimal).select().single()
        data = result3.data
        error = result3.error
      }
    }

    if(error){
      setErrorInfo(`GAGAL SIMPAN: ${error.message}`)
      return alert(`❌ Error: ${error.message}\n\nSOLUSI: Jalankan SQL ini di Supabase SQL Editor:\n\nALTER TABLE menus ADD COLUMN IF NOT EXISTS kategori_menu TEXT DEFAULT 'Nasi Kotak';\nALTER TABLE menus ADD COLUMN IF NOT EXISTS base_porsi INT DEFAULT 50;\nALTER TABLE menus ADD COLUMN IF NOT EXISTS harga_jual_per_porsi INT DEFAULT 25000;\nALTER TABLE menus ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Aktif';\n\nLalu NOTIFY pgrst, 'reload schema';`)
    }
    
    alert(`✅ Menu ${data.name} disimpan - sekarang tambah resep dari ${items.length} bahan`)
    setMenuForm({ name: '', description: '', base_porsi: 50, harga_jual: 25000, kategori_menu: 'Nasi Kotak' })
    setShowForm(false)
    loadAll()
  }

  async function addRecipe(){
    if(!selectedMenu) return alert('Pilih Menu dulu')
    if(!newRecipe.inventory_item_id) return alert('Pilih Bahan Baku')
    if(!newRecipe.qty_per_porsi) return alert('Isi Qty per porsi')
    const inv = items.find(i=>i.id===newRecipe.inventory_item_id)
    const payload = { menu_id: selectedMenu.id, inventory_item_id: newRecipe.inventory_item_id, qty_per_porsi: Number(newRecipe.qty_per_porsi), satuan: inv?.satuan||'Kg' }
    const { error } = await supabase.from('recipes').insert(payload)
    if(error) return alert(error.message)
    setNewRecipe({ inventory_item_id: '', qty_per_porsi: '' })
    setSearchBahan('')
    loadAll()
  }

  async function deleteRecipe(id){
    if(!confirm('Hapus bahan dari resep?')) return
    await supabase.from('recipes').delete().eq('id', id)
    loadAll()
  }

  if(loading) return <div className="p-6">Loading Master Menu & Resep...</div>

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border flex justify-between items-start">
        <div>
          <div className="font-bold text-lg">Master Menu & Resep</div>
          <div className="text-[12px] text-slate-500 mt-1">Data Inventory-Master Bahan {items.length} bahan BHN-POK-001 • HPP = qty × harga_live</div>
          {errorInfo && <div className="mt-2 bg-red-50 border border-red-200 text-red-700 p-2 rounded text-[11px]">⚠️ {errorInfo}</div>}
        </div>
        <button onClick={()=>setShowForm(!showForm)} className="bg-[#0A1931] text-white px-4 py-2 rounded-full text-xs font-bold">{showForm ? 'Tutup' : '+ Menu Baru'}</button>
      </div>

      {/* SOLUSI ERROR KATEGORI_MENU */}
      {errorInfo.includes('kategori_menu') && (
        <div className="bg-yellow-50 border-2 border-yellow-400 p-4 rounded-xl">
          <div className="font-bold text-sm text-yellow-800">🔧 FIX ERROR: kolom kategori_menu tidak ada di Supabase</div>
          <div className="text-[12px] mt-2">Tabel menus Bos yang lama belum ada kolom kategori_menu. Jalankan SQL ini di Supabase SQL Editor:</div>
          <pre className="bg-[#0A1931] text-green-300 p-3 rounded-lg text-[11px] mt-2 overflow-x-auto">
{`ALTER TABLE menus ADD COLUMN IF NOT EXISTS kategori_menu TEXT DEFAULT 'Nasi Kotak';
ALTER TABLE menus ADD COLUMN IF NOT EXISTS base_porsi INT DEFAULT 50;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS harga_jual_per_porsi INT DEFAULT 25000;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Aktif';
ALTER TABLE menus ADD COLUMN IF NOT EXISTS description TEXT;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';`}
          </pre>
          <div className="text-[11px] mt-2">Setelah itu refresh halaman /menus Bos!</div>
        </div>
      )}

      {showForm && (
        <form onSubmit={createMenu} className="bg-white p-5 rounded-xl border shadow-sm space-y-3">
          <input className="w-full border p-3 rounded-xl text-sm" placeholder="Nama Menu - misal Daging Rendang" value={menuForm.name} onChange={e=>setMenuForm({...menuForm, name: e.target.value})} required />
          <textarea className="w-full border p-3 rounded-xl text-sm" placeholder="Deskripsi - misal paket daging rendang + capcay" value={menuForm.description} onChange={e=>setMenuForm({...menuForm, description: e.target.value})} rows={3} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className="text-[11px] font-bold">Base Porsi</label><input type="number" className="w-full border-2 p-3 rounded-xl text-sm mt-1 bg-white" value={menuForm.base_porsi} onChange={e=>setMenuForm({...menuForm, base_porsi: e.target.value})} /></div>
            <div><label className="text-[11px] font-bold">Harga Jual / Porsi</label><input type="number" className="w-full border-2 p-3 rounded-xl text-sm mt-1 bg-white" value={menuForm.harga_jual} onChange={e=>setMenuForm({...menuForm, harga_jual: e.target.value})} /></div>
            <div><label className="text-[11px] font-bold">Kategori Menu</label><select className="w-full border-2 p-3 rounded-xl text-sm mt-1 bg-white" value={menuForm.kategori_menu} onChange={e=>setMenuForm({...menuForm, kategori_menu: e.target.value})}><option>Nasi Kotak</option><option>Nasi Box</option><option>Snack Box</option><option>Tumpeng</option><option>Prasmanan</option></select></div>
          </div>
          <div className="flex justify-center pt-2">
            <button type="submit" className="bg-[#D4AF37] text-black font-bold px-8 py-2.5 rounded-full text-sm">Simpan Menu</button>
          </div>
        </form>
      )}

      {menus.length === 0 ? (
        <div className="bg-white p-6 rounded-xl border text-sm text-slate-500">Belum ada menu. Klik + Menu Baru di atas. Contoh: Daging Rendang, Nasi Kotak Ayam Goreng, Snack Box.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {menus.map(menu=>{
            const hpp = calculateHPP(menu.id)
            const profit = Number(menu.harga_jual_per_porsi||menu.harga_jual||0) - hpp
            const recs = getRecipesForMenu(menu.id)
            const isSelected = selectedMenu?.id === menu.id
            return (
              <div key={menu.id} className={`bg-white rounded-xl border shadow-sm p-4 ${isSelected?'ring-2 ring-[#D4AF37]':''}`}>
                <div className="font-bold text-sm">{menu.name}</div>
                <div className="text-[11px] text-slate-500">{menu.kategori_menu||'Nasi Kotak'} • {menu.base_porsi||10} porsi</div>
                <div className="text-[11px] text-slate-400 mt-1">{menu.description}</div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-slate-50 p-2 rounded-lg"><div className="text-slate-500">HPP / Porsi</div><div className="font-bold">Rp {hpp.toLocaleString('id-ID')}</div></div>
                  <div className="bg-slate-50 p-2 rounded-lg"><div className="text-slate-500">Jual / Porsi</div><div className="font-bold">Rp {Number(menu.harga_jual_per_porsi||menu.harga_jual||0).toLocaleString('id-ID')}</div></div>
                  <div className={`${profit>=0?'bg-green-50 text-green-700':'bg-red-50 text-red-700'} p-2 rounded-lg`}><div>Profit</div><div className="font-bold">Rp {profit.toLocaleString('id-ID')}</div></div>
                </div>
                <div className="mt-3">
                  <div className="text-[11px] font-bold">Resep ({recs.length} bahan dari {items.length} bahan):</div>
                  {recs.map(r=>(
                    <div key={r.id} className="flex justify-between text-[11px] py-1 border-b">
                      <span><b className="font-mono text-blue-700">{r.inventory_items?.kode_bahan}</b> {r.inventory_items?.nama_bahan} - {r.qty_per_porsi} {r.satuan}</span>
                      <button onClick={()=>deleteRecipe(r.id)} className="bg-red-100 text-red-600 w-5 h-5 rounded-full">x</button>
                    </div>
                  ))}
                </div>
                <button onClick={()=>setSelectedMenu(menu)} className="mt-3 w-full bg-[#0A1931] text-white py-2.5 rounded-xl text-xs font-bold">{isSelected ? '✓ Dipilih' : 'Kelola Resep'}</button>
              </div>
            )
          })}
        </div>
      )}

      {selectedMenu && (
        <div className="bg-white p-5 rounded-xl border-2 border-[#D4AF37]/40 shadow-sm">
          <div className="font-bold text-sm">Tambah Bahan untuk: {selectedMenu.name} - dari {items.length} bahan</div>
          <div className="flex gap-3 mt-3">
            <div className="flex-1">
              <input type="text" placeholder="🔍 Search BHN-POK-001 / Beras putih" value={searchBahan} onChange={e=>setSearchBahan(e.target.value)} className="w-full border-2 p-3 rounded-xl text-xs mb-2" />
              <select className="w-full border-2 p-3 rounded-xl text-xs bg-white" value={newRecipe.inventory_item_id} onChange={e=>setNewRecipe({...newRecipe, inventory_item_id: e.target.value})}>
                <option value="">▼ Pilih Bahan ({filteredBahan.length})</option>
                {filteredBahan.map(inv=><option key={inv.id} value={inv.id}>{inv.kode_bahan} - {inv.nama_bahan} - Rp {Number(inv.harga_baru||0).toLocaleString('id-ID')}</option>)}
              </select>
            </div>
            <div className="flex gap-2 items-end">
              <input type="number" step="0.0001" placeholder="Qty / porsi" className="w-28 border-2 p-3 rounded-xl text-xs" value={newRecipe.qty_per_porsi} onChange={e=>setNewRecipe({...newRecipe, qty_per_porsi: e.target.value})} />
              <button onClick={addRecipe} className="bg-[#D4AF37] text-black font-bold px-5 py-3 rounded-xl text-xs">+ Tambah</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
