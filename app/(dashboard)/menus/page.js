"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function MenusPage() {
  const [menus, setMenus] = useState([])
  const [inventory, setInventory] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', base_porsi: 50, harga_jual: 25000 })
  const [selectedMenu, setSelectedMenu] = useState(null)
  const [newRecipe, setNewRecipe] = useState({ inventory_item_id: '', qty_per_porsi: '' })

  async function loadAll() {
    setLoading(true)
    const { data: m } = await supabase.from('menus').select('*').order('created_at')
    const { data: inv } = await supabase.from('inventory_items').select('*').order('name')
    const { data: rec } = await supabase.from('recipes').select('*, inventory_items(name,unit,price_per_unit)')
    setMenus(m || [])
    setInventory(inv || [])
    setRecipes(rec || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  function getRecipesForMenu(menuId) {
    return recipes.filter(r => r.menu_id === menuId)
  }

  function calculateHPP(menuId) {
    const rs = getRecipesForMenu(menuId)
    let total = 0
    rs.forEach(r => {
      const price = r.inventory_items?.price_per_unit || 0
      total += Number(r.qty_per_porsi) * Number(price)
    })
    return total
  }

  async function createMenu(e) {
    e.preventDefault()
    const { data, error } = await supabase.from('menus').insert({
      name: form.name,
      description: form.description,
      base_porsi: Number(form.base_porsi),
      harga_jual_per_porsi: Number(form.harga_jual)
    }).select().single()
    if (!error) {
      setForm({ name: '', description: '', base_porsi: 50, harga_jual: 25000 })
      setShowForm(false)
      loadAll()
    } else alert(error.message)
  }

  async function addRecipe() {
    if (!selectedMenu || !newRecipe.inventory_item_id || !newRecipe.qty_per_porsi) return alert('Lengkapi bahan & qty')
    const { error } = await supabase.from('recipes').insert({
      menu_id: selectedMenu.id,
      inventory_item_id: newRecipe.inventory_item_id,
      qty_per_porsi: Number(newRecipe.qty_per_porsi)
    })
    if (error) alert(error.message)
    else {
      setNewRecipe({ inventory_item_id: '', qty_per_porsi: '' })
      loadAll()
    }
  }

  async function deleteRecipe(id) {
    if (!confirm('Hapus bahan dari resep?')) return
    await supabase.from('recipes').delete().eq('id', id)
    loadAll()
  }

  if (loading) return <div className="p-6">Loading menu & HPP...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-navy">Master Menu & Resep (Tahap 3 - HPP Otomatis)</h1>
          <p className="text-sm text-slate-500">HPP = SUM(qty_per_porsi * harga_bahan_live)</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-navy text-white px-4 py-2 rounded-xl text-sm">
          {showForm ? 'Tutup' : '+ Menu Baru'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createMenu} className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
          <input className="w-full border p-2 rounded-lg" placeholder="Nama Menu - misal Nasi Kotak Ayam Goreng" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <textarea className="w-full border p-2 rounded-lg" placeholder="Deskripsi" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Base Porsi<input type="number" className="w-full border p-2 rounded-lg mt-1" value={form.base_porsi} onChange={e => setForm({...form, base_porsi: e.target.value})} /></label>
            <label className="text-sm">Harga Jual / Porsi<input type="number" className="w-full border p-2 rounded-lg mt-1" value={form.harga_jual} onChange={e => setForm({...form, harga_jual: e.target.value})} /></label>
          </div>
          <button type="submit" className="bg-gold text-navy font-semibold px-4 py-2 rounded-xl">Simpan Menu</button>
        </form>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {menus.map(menu => {
          const hpp = calculateHPP(menu.id)
          const profit = Number(menu.harga_jual_per_porsi) - hpp
          const isSelected = selectedMenu?.id === menu.id
          return (
            <div key={menu.id} className={`bg-white rounded-xl border shadow-sm p-4 ${isSelected ? 'ring-2 ring-gold' : ''}`}>
              <div className="flex justify-between">
                <h3 className="font-bold">{menu.name}</h3>
                <span className="text-xs bg-slate-100 px-2 py-1 rounded-full">{menu.base_porsi} porsi base</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{menu.description}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-50 p-2 rounded-lg"><div className="text-slate-500">HPP / Porsi</div><div className="font-bold text-navy">Rp {hpp.toLocaleString('id-ID')}</div></div>
                <div className="bg-slate-50 p-2 rounded-lg"><div className="text-slate-500">Jual / Porsi</div><div className="font-bold">Rp {Number(menu.harga_jual_per_porsi).toLocaleString('id-ID')}</div></div>
                <div className={`${profit>=0?'bg-green-50 text-green-700':'bg-red-50 text-red-700'} p-2 rounded-lg`}><div className="text-xs">Profit</div><div className="font-bold">Rp {profit.toLocaleString('id-ID')}</div></div>
              </div>
              <div className="mt-3">
                <div className="text-xs font-semibold mb-1">Resep per porsi:</div>
                {getRecipesForMenu(menu.id).length===0 ? <div className="text-xs text-slate-400">Belum ada resep</div> :
                getRecipesForMenu(menu.id).map(r => (
                  <div key={r.id} className="flex justify-between text-xs py-1 border-b last:border-0">
                    <span>{r.inventory_items?.name} - {r.qty_per_porsi} {r.inventory_items?.unit} @ Rp {Number(r.inventory_items?.price_per_unit).toLocaleString('id-ID')}</span>
                    <button onClick={()=>deleteRecipe(r.id)} className="text-red-500">x</button>
                  </div>
                ))}
              </div>
              <button onClick={()=>setSelectedMenu(menu)} className="mt-3 w-full text-xs bg-navy text-white py-2 rounded-lg">Kelola Resep {isSelected?'✓':''}</button>
            </div>
          )
        })}
      </div>

      {selectedMenu && (
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <h4 className="font-bold mb-2">Tambah Bahan untuk: {selectedMenu.name}</h4>
          <div className="flex gap-2">
            <select className="flex-1 border p-2 rounded-lg text-sm" value={newRecipe.inventory_item_id} onChange={e=>setNewRecipe({...newRecipe, inventory_item_id: e.target.value})}>
              <option value="">Pilih Bahan Baku</option>
              {inventory.map(inv => <option key={inv.id} value={inv.id}>{inv.name} - Rp {Number(inv.price_per_unit).toLocaleString('id-ID')} / {inv.unit}</option>)}
            </select>
            <input type="number" step="0.0001" placeholder="Qty / porsi (mis 0.15)" className="w-48 border p-2 rounded-lg text-sm" value={newRecipe.qty_per_porsi} onChange={e=>setNewRecipe({...newRecipe, qty_per_porsi: e.target.value})} />
            <button onClick={addRecipe} className="bg-gold text-navy font-semibold px-4 py-2 rounded-lg text-sm">+ Tambah</button>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Contoh: Ayam 0.2 kg per porsi, Beras 0.15 kg per porsi, Minyak 0.02 liter per porsi. HPP otomatis ngambil harga dari Inventori live.</p>
        </div>
      )}

      {menus.length===0 && <div className="text-sm text-slate-500">Belum ada menu. Klik + Menu Baru di atas. Contoh: Nasi Kotak Ayam Goreng, Nasi Box Rendang, Snack Box.</div>}
    </div>
  )
}
