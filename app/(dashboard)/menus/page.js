"use client"
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function MasterMenuResepHPPAkuratArial() {
  const [items, setItems] = useState([])
  const [menus, setMenus] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [menuForm, setMenuForm] = useState({ name: '', description: '', base_porsi: 10, harga_jual: 25000, kategori_menu: 'Nasi Kotak' })
  const [selectedMenu, setSelectedMenu] = useState(null)
  const [newRecipe, setNewRecipe] = useState({ inventory_item_id: '', qty_per_porsi: '', satuan_resep: 'Kg' })
  const [searchBahan, setSearchBahan] = useState('')

  const standarPorsi = {
    'Beras': { qty: 0.1, satuan: 'Kg', note: '100gr nasi matang ~ 50gr beras mentah' },
    'Daging Sapi': { qty: 0.08, satuan: 'Kg', note: '80gr rendang matang per porsi' },
    'Ayam': { qty: 0.12, satuan: 'Kg', note: '1/8 ekor ~ 120gr' },
    'Minyak Goreng': { qty: 0.015, satuan: 'Ltr', note: '15ml untuk tumis' },
    'default': { qty: 0.05, satuan: 'Kg', note: '50gr' }
  }

  function getStandar(namaBahan){
    for(const key in standarPorsi){
      if(namaBahan.toLowerCase().includes(key.toLowerCase())) return standarPorsi[key]
    }
    return standarPorsi['default']
  }

  async function loadAll(){
    setLoading(true)
    const { data: inv } = await supabase.from('inventory_items').select('*').order('kode_bahan').limit(500)
    const { data: m } = await supabase.from('menus').select('*').order('created_at', { ascending: false }).limit(100)
    const { data: rec } = await supabase.from('recipes').select('*, inventory_items(kode_bahan,nama_bahan,name,satuan,unit,sub_kategori,harga_baru,price_per_unit), menus(name)').limit(1000)
    if(inv) setItems(inv)
    setMenus(m||[])
    setRecipes(rec||[])
    setLoading(false)
  }
  useEffect(()=>{ loadAll() }, [])

  const filteredBahan = useMemo(()=>{
    if(!searchBahan.trim()) return items.slice(0,50)
    const q = searchBahan.toLowerCase()
    return items.filter(it => (it.nama_bahan||'').toLowerCase().includes(q) || (it.kode_bahan||'').toLowerCase().includes(q) || (it.sub_kategori||'').toLowerCase().includes(q) || (it.kategori||'').toLowerCase().includes(q)).slice(0,50)
  }, [items, searchBahan])

  function getRecipesForMenu(menuId){ return recipes.filter(r => r.menu_id === menuId) }
  
  function calculateHPP(menuId){
    const recs = getRecipesForMenu(menuId)
    let total = 0
    for(const r of recs){
      const harga = Number(r.inventory_items?.harga_baru || 0)
      const qty = Number(r.qty_per_porsi || r.quantity || 0)
      total += harga * qty
    }
    return total
  }

  function formatHargaDetail(item){
    const harga = Number(item.harga_baru||0)
    const satuan = item.satuan||'Kg'
    if(satuan === 'Kg'){
      return `Rp ${harga.toLocaleString('id-ID')}/Kg = Rp ${(harga/1000).toFixed(1)}/gram`
    }
    if(satuan === 'Ltr'){
      return `Rp ${harga.toLocaleString('id-ID')}/Ltr = Rp ${(harga/1000).toFixed(1)}/ml`
    }
    return `Rp ${harga.toLocaleString('id-ID')}/${satuan}`
  }

  async function createMenu(e){
    e.preventDefault()
    if(!menuForm.name.trim()) return alert('Isi Nama Menu')
    const payload = { name: menuForm.name.trim(), description: menuForm.description, base_porsi: Number(menuForm.base_porsi)||10, harga_jual_per_porsi: Number(menuForm.harga_jual)||25000, kategori_menu: menuForm.kategori_menu, status: 'Aktif' }
    const { error, data } = await supabase.from('menus').insert(payload).select().single()
    if(error){
      const { data: d2, error: e2 } = await supabase.from('menus').insert({ name: payload.name, description: payload.description }).select().single()
      if(e2) return alert(e2.message)
      alert(`✅ Menu ${d2.name} disimpan`)
    } else {
      alert(`✅ Menu ${data.name} disimpan`)
    }
    setMenuForm({ name: '', description: '', base_porsi: 10, harga_jual: 25000, kategori_menu: 'Nasi Kotak' })
    setShowForm(false)
    loadAll()
  }

  async function addRecipe(){
    if(!selectedMenu) return alert('Pilih Menu dulu')
    if(!newRecipe.inventory_item_id) return alert('Pilih Bahan Baku')
    if(!newRecipe.qty_per_porsi) return alert('Isi Qty per porsi')
    const inv = items.find(i=>i.id===newRecipe.inventory_item_id)
    let payload = { 
      menu_id: selectedMenu.id, 
      inventory_item_id: newRecipe.inventory_item_id, 
      qty_per_porsi: Number(newRecipe.qty_per_porsi), 
      satuan: newRecipe.satuan_resep || inv?.satuan || 'Kg'
    }
    let { error } = await supabase.from('recipes').insert(payload)
    if(error && error.message.includes('satuan')){
      delete payload.satuan
      const r2 = await supabase.from('recipes').insert(payload)
      error = r2.error
      if(error && error.message.includes('qty_per_porsi')){
        payload = { menu_id: selectedMenu.id, inventory_item_id: newRecipe.inventory_item_id, quantity: Number(newRecipe.qty_per_porsi) }
        const r3 = await supabase.from('recipes').insert(payload)
        error = r3.error
      }
    }
    if(error) return alert(`Error: ${error.message}`)
    alert(`✅ ${inv.kode_bahan} - ${inv.nama_bahan} ${newRecipe.qty_per_porsi} ${newRecipe.satuan_resep} ditambah`)
    setNewRecipe({ inventory_item_id: '', qty_per_porsi: '', satuan_resep: 'Kg' })
    setSearchBahan('')
    loadAll()
  }

  useEffect(()=>{
    if(newRecipe.inventory_item_id){
      const inv = items.find(i=>i.id===newRecipe.inventory_item_id)
      if(inv){
        const std = getStandar(inv.nama_bahan)
        setNewRecipe(r=>({ 
          ...r, 
          satuan_resep: inv.satuan||std.satuan,
          qty_per_porsi: r.qty_per_porsi || String(std.qty)
        }))
      }
    }
  }, [newRecipe.inventory_item_id, items])

  if(loading) return <div className="p-6" style={{fontFamily:'Arial, sans-serif', fontSize:'16px'}}>Loading HPP Akurat...</div>

  return (
    <div className="space-y-4" style={{fontFamily:'Arial, sans-serif'}}>
      <div className="bg-white p-4 rounded-xl border flex justify-between">
        <div>
          <div className="font-bold" style={{fontSize:'20px'}}>Master Menu & Resep - HPP Akurat</div>
          <div className="text-slate-500 mt-1" style={{fontSize:'14px'}}>Satuan ikut sub kategori • {items.length} bahan • BHN-POK-001 Beras putih Kg, BHN-HEW-003 Daging Sapi Kg, BHN-SAO-002 Minyak Goreng Ltr</div>
        </div>
        <button onClick={()=>setShowForm(!showForm)} className="bg-[#0A1931] text-white px-4 py-2 rounded-full font-bold" style={{fontSize:'14px'}}>{showForm ? 'Tutup' : '+ Menu Baru'}</button>
      </div>

      {showForm && (
        <form onSubmit={createMenu} className="bg-white p-5 rounded-xl border space-y-3">
          <input className="w-full border p-3 rounded-xl bg-white" style={{fontSize:'16px', fontFamily:'Arial, sans-serif'}} placeholder="Nama Menu" value={menuForm.name} onChange={e=>setMenuForm({...menuForm, name: e.target.value})} required />
          <textarea className="w-full border p-3 rounded-xl bg-white" style={{fontSize:'16px', fontFamily:'Arial, sans-serif'}} placeholder="Deskripsi" value={menuForm.description} onChange={e=>setMenuForm({...menuForm, description: e.target.value})} rows={2} />
          <div className="grid grid-cols-3 gap-3">
            <div><label className="font-bold" style={{fontSize:'13px'}}>Base Porsi</label><input type="number" className="w-full border-2 p-3 rounded-xl bg-white mt-1" style={{fontSize:'16px', fontFamily:'Arial, sans-serif'}} value={menuForm.base_porsi} onChange={e=>setMenuForm({...menuForm, base_porsi: e.target.value})} /></div>
            <div><label className="font-bold" style={{fontSize:'13px'}}>Harga Jual / Porsi</label><input type="number" className="w-full border-2 p-3 rounded-xl bg-white mt-1" style={{fontSize:'16px', fontFamily:'Arial, sans-serif'}} value={menuForm.harga_jual} onChange={e=>setMenuForm({...menuForm, harga_jual: e.target.value})} /></div>
            <div><label className="font-bold" style={{fontSize:'13px'}}>Kategori</label><select className="w-full border-2 p-3 rounded-xl bg-white mt-1" style={{fontSize:'16px', fontFamily:'Arial, sans-serif'}} value={menuForm.kategori_menu} onChange={e=>setMenuForm({...menuForm, kategori_menu: e.target.value})}><option>Nasi Kotak</option><option>Nasi Box</option><option>Snack Box</option></select></div>
          </div>
          <button type="submit" className="bg-[#D4AF37] text-black font-bold px-8 py-2.5 rounded-full mx-auto block" style={{fontSize:'16px'}}>Simpan Menu</button>
        </form>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {menus.map(menu=>{
          const hpp = calculateHPP(menu.id)
          const profit = Number(menu.harga_jual_per_porsi||25000) - hpp
          const recs = getRecipesForMenu(menu.id)
          const isSelected = selectedMenu?.id === menu.id
          return (
            <div key={menu.id} className={`bg-white rounded-xl border-2 ${isSelected?'border-[#D4AF37]':'border-slate-200'} shadow-sm p-4`} style={{fontFamily:'Arial, sans-serif'}}>
              <div className="font-bold" style={{fontSize:'16px'}}>{menu.name}</div>
              <div className="text-slate-500" style={{fontSize:'13px'}}>{menu.kategori_menu||'Nasi Kotak'} • {menu.base_porsi||10} porsi</div>
              <div className="text-slate-400 mt-1" style={{fontSize:'13px'}}>{menu.description}</div>
              <div className="mt-3 grid grid-cols-3 gap-2" style={{fontSize:'13px'}}>
                <div className="bg-[#FFF8E1] p-2 rounded-lg border"><div className="text-slate-500" style={{fontSize:'13px'}}>HPP / Porsi</div><div className="font-bold text-[#0A1931]" style={{fontSize:'14px'}}>Rp {hpp.toLocaleString('id-ID')}</div><div style={{fontSize:'11px'}}>{recs.length} bahan</div></div>
                <div className="bg-slate-50 p-2 rounded-lg"><div className="text-slate-500" style={{fontSize:'13px'}}>Jual / Porsi</div><div className="font-bold" style={{fontSize:'14px'}}>Rp {Number(menu.harga_jual_per_porsi||25000).toLocaleString('id-ID')}</div></div>
                <div className="bg-green-50 p-2 rounded-lg border border-green-200"><div className="text-green-700" style={{fontSize:'13px'}}>Profit</div><div className="font-bold text-green-800" style={{fontSize:'14px'}}>Rp {profit.toLocaleString('id-ID')}</div><div style={{fontSize:'11px'}}>{Math.round(profit/Number(menu.harga_jual_per_porsi||25000)*100)}%</div></div>
              </div>
              <div className="mt-3">
                <div className="font-bold" style={{fontSize:'13px'}}>Resep ({recs.length} bahan dari {items.length} bahan):</div>
                {recs.length===0 ? <div className="text-slate-400" style={{fontSize:'13px'}}>Belum ada bahan</div> :
                recs.map(r=>{
                  const inv = r.inventory_items
                  const hargaSatuan = Number(inv?.harga_baru||0)
                  const qty = Number(r.qty_per_porsi||r.quantity||0)
                  const sub = inv?.sub_kategori || '-'
                  const satuanInv = inv?.satuan || r.satuan || 'Kg'
                  const biaya = hargaSatuan * qty
                  return (
                    <div key={r.id} className="flex justify-between items-start py-2 border-b" style={{fontSize:'13px'}}>
                      <div className="flex-1">
                        <div><b className="font-mono text-blue-700">{inv?.kode_bahan}</b> {inv?.nama_bahan} <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold" style={{fontSize:'11px'}}>{sub}</span> <span className="bg-slate-100 px-1.5 py-0.5 rounded" style={{fontSize:'11px'}}>{satuanInv}</span> - {qty} {r.satuan||satuanInv}</div>
                        <div className="text-slate-500" style={{fontSize:'12px'}}>@ {formatHargaDetail(inv)} → Rp {biaya.toLocaleString('id-ID')} / porsi</div>
                      </div>
                      <div className="text-right ml-2">
                        <div className="font-bold" style={{fontSize:'13px'}}>Rp {biaya.toLocaleString('id-ID')}</div>
                        <button onClick={async()=>{ if(confirm('Hapus?')){ await supabase.from('recipes').delete().eq('id', r.id); loadAll() } }} className="text-red-500" style={{fontSize:'12px'}}>x hapus</button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button onClick={()=>setSelectedMenu(menu)} className={`mt-3 w-full py-2.5 rounded-xl font-bold ${isSelected?'bg-[#D4AF37] text-black':'bg-[#0A1931] text-white'}`} style={{fontSize:'14px'}}>{isSelected ? '✓ Dipilih - tambah di bawah' : 'Kelola Resep'}</button>
            </div>
          )
        })}
      </div>

      {selectedMenu && (
        <div className="bg-white p-5 rounded-xl border-2 border-[#D4AF37]/50 shadow-sm" style={{fontFamily:'Arial, sans-serif'}}>
          <div className="font-bold" style={{fontSize:'16px'}}>Tambah Bahan untuk: {selectedMenu.name} - dari {items.length} bahan (satuan ikut sub kategori)</div>
          <div className="text-slate-500 mt-1" style={{fontSize:'13px'}}>HPP akurat = qty × harga_live per satuan asli • Contoh: BHN-POK-001 Beras putih 0.1 Kg × Rp 15.500/Kg = Rp 1.550, BHN-HEW-003 Daging Sapi 0.08 Kg × Rp 150.000/Kg = Rp 12.000</div>
          
          <div className="mt-4 bg-yellow-50 border border-yellow-200 p-3 rounded-xl">
            <div className="font-bold" style={{fontSize:'14px'}}>💡 Panduan Qty Akurat (bukan kira-kira):</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2" style={{fontSize:'12px'}}>
              <div className="bg-white p-2 rounded">Beras putih: 0.1 Kg (100gr) = 1 porsi nasi</div>
              <div className="bg-white p-2 rounded">Daging Sapi: 0.08 Kg (80gr) = rendang</div>
              <div className="bg-white p-2 rounded">Ayam Potong: 0.12 Kg (120gr)</div>
              <div className="bg-white p-2 rounded">Minyak Goreng: 0.015 Ltr (15ml)</div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-3 mt-4">
            <div className="flex-1 space-y-2">
              <input type="text" placeholder="🔍 Search BHN-POK-001 / Beras putih / putih / POK" value={searchBahan} onChange={e=>setSearchBahan(e.target.value)} className="w-full border-2 border-[#D4AF37]/30 p-3 rounded-xl bg-white" style={{fontSize:'14px', fontFamily:'Arial, sans-serif'}} />
              <select className="w-full border-2 p-3 rounded-xl bg-white font-bold" style={{fontSize:'14px', fontFamily:'Arial, sans-serif'}} value={newRecipe.inventory_item_id} onChange={e=>setNewRecipe({...newRecipe, inventory_item_id: e.target.value})}>
                <option value="">▼ Pilih Bahan Baku ({filteredBahan.length} bahan - satuan ikut sub kategori)</option>
                {filteredBahan.map(inv=>{
                  const std = getStandar(inv.nama_bahan)
                  return <option key={inv.id} value={inv.id}>{inv.kode_bahan} - {inv.nama_bahan} [sub: {inv.sub_kategori||'-'}] - {inv.satuan||'Kg'} - {formatHargaDetail(inv)} - Stock {inv.stok} - {std.note}</option>
                })}
              </select>
              {newRecipe.inventory_item_id && (
                <div className="bg-slate-50 p-2 rounded-lg border" style={{fontSize:'13px'}}>
                  {(() => {
                    const inv = items.find(i=>i.id===newRecipe.inventory_item_id)
                    if(!inv) return null
                    const std = getStandar(inv.nama_bahan)
                    const qty = Number(newRecipe.qty_per_porsi||std.qty)
                    const biaya = qty * Number(inv.harga_baru||0)
                    return (
                      <div>
                        <div><b>{inv.kode_bahan}</b> {inv.nama_bahan} - sub kategori: <b className="text-blue-700">{inv.sub_kategori||'-'}</b> - satuan asli: <b>{inv.satuan}</b></div>
                        <div>Harga: {formatHargaDetail(inv)}</div>
                        <div>Rekomendasi: {std.qty} {std.satuan} ({std.note})</div>
                        <div className="font-bold text-green-700 mt-1">Biaya / porsi: {qty} {newRecipe.satuan_resep} × Rp {Number(inv.harga_baru||0).toLocaleString('id-ID')} = Rp {biaya.toLocaleString('id-ID')}</div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
            <div className="flex gap-2 items-end">
              <div>
                <label className="font-bold" style={{fontSize:'13px'}}>Qty / Porsi</label>
                <input type="number" step="0.001" className="w-24 border-2 p-3 rounded-xl bg-white mt-1" style={{fontSize:'14px', fontFamily:'Arial, sans-serif'}} value={newRecipe.qty_per_porsi} onChange={e=>setNewRecipe({...newRecipe, qty_per_porsi: e.target.value})} placeholder="0.08" />
              </div>
              <div>
                <label className="font-bold" style={{fontSize:'13px'}}>Satuan</label>
                <select className="w-20 border-2 p-3 rounded-xl bg-white mt-1" style={{fontSize:'14px', fontFamily:'Arial, sans-serif'}} value={newRecipe.satuan_resep} onChange={e=>setNewRecipe({...newRecipe, satuan_resep: e.target.value})}>
                  <option>Kg</option><option>Ltr</option><option>Pcs</option><option>Buah</option><option>Ikat</option><option>Gram</option>
                </select>
              </div>
              <button onClick={addRecipe} className="bg-[#D4AF37] text-black font-bold px-5 py-3 rounded-xl" style={{fontSize:'14px'}}> + Tambah</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
