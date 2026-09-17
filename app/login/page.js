"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ROLES = [
  { id:'admin', label:'Admin', desc:'Akses Penuh Semua Modul', cred:'admin / admin123', icon:'📊', border:'border-blue-500', text:'text-blue-600', footer:'Dashboard - Inventori 16 bahan' },
  { id:'owner', label:'Owner', desc:'Monitoring Profit & Laporan Read-Only', cred:'owner / owner123', icon:'👑', border:'border-purple-500', text:'text-purple-600', footer:'Dashboard Read-Only - Laporan Profit Rp 95.550', selected:true },
  { id:'produksi', label:'Produksi', desc:'Kalkulator (Read) + Produksi 7 Phase + QC', cred:'produksi / dapur123', icon:'👨‍🍳', border:'border-red-500', text:'text-red-600', footer:'Kalkulator Read - Phase 1-4 Checklist' },
  { id:'delivery', label:'Delivery', desc:'Hanya Delivery - 2 Tombol DIKIRIM & CLOSED', cred:'delivery / kurir123', icon:'🚚', border:'border-green-500', text:'text-green-600', footer:'DAFTAR DELIVERY - DIKIRIM → indikator 3 biru' },
]

export default function LoginPage(){
  const router = useRouter()
  const [selected,setSelected]=useState('owner')
  const [username,setUsername]=useState('owner')
  const [password,setPassword]=useState('owner123')
  const [showPass,setShowPass]=useState(false)

  function pickRole(r){
    setSelected(r.id)
    setUsername(r.id)
    if(r.id==='admin') setPassword('admin123')
    if(r.id==='owner') setPassword('owner123')
    if(r.id==='produksi') setPassword('dapur123')
    if(r.id==='delivery') setPassword('kurir123')
  }

  function handleLogin(e){
    e.preventDefault()
    const u = username.toLowerCase()
    const p = password
    let ok = false
    if(u==='admin' && p==='admin123') ok=true
    if(u==='owner' && p==='owner123') ok=true
    if(u==='produksi' && p==='dapur123') ok=true
    if(u==='delivery' && p==='kurir123') ok=true
    if(!ok){ alert('Username / Password salah Bos!'); return }
    localStorage.setItem('sikitchen_role', u)
    localStorage.setItem('sikitchen_company','SIKITCHEN-MRH')
    document.cookie = `sikitchen_role=${u}; path=/; max-age=86400`
    router.push(`/dashboard?role=${u}`)
  }

  const cur = ROLES.find(r=>r.id===selected)

  return (
    <div className="min-h-screen bg-[#0A1931] flex flex-col items-center justify-center p-4" style={{fontFamily:'Inter, sans-serif'}}>
      <div className="w-full max-w-[850px]">
        {/* HEADER */}
        <div className="mb-4 flex justify-between items-end">
          <div>
            <div className="font-black text-white text-[20px] tracking-wide">SIKITCHEN</div>
            <div className="text-[#FBBF24] text-[11px] font-bold tracking-wider">CATERING OS v1.0 - Tahap 3 RBAC</div>
          </div>
        </div>

        {/* MAIN COMPACT BOX */}
        <div className="bg-white rounded-2xl p-4 md:p-5 flex flex-col md:flex-row gap-4 border border-slate-200">
          {/* LEFT 2x2 GRID */}
          <div className="flex-1">
            <div className="font-black text-[13px] mb-3">Pilih Role untuk Login</div>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map(r=>(
                <div key={r.id} onClick={()=>pickRole(r)} className={`bg-white rounded-xl p-3 cursor-pointer border-4 ${r.border} ${selected===r.id?'ring-2 ring-offset-1 ring-slate-300':''} relative transition-all hover:scale-[1.02]`}>
                  {r.selected || selected===r.id ? <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full"></div> : null}
                  <div className={`text-[18px] ${r.text}`}>{r.icon}</div>
                  <div className="font-black text-[12px] mt-1">{r.label}</div>
                  <div className="text-[10px] text-slate-600 leading-tight mt-0.5 line-clamp-2">{r.desc}</div>
                  <div className="mt-2 bg-slate-100 rounded-full px-2 py-0.5 inline-block text-[9px] font-mono font-bold">{r.cred}</div>
                  <div className="text-[8px] text-slate-400 mt-1.5 leading-tight">{r.footer}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT FORM */}
          <div className="w-full md:w-[320px] bg-white rounded-xl border-2 border-slate-200 p-4 h-fit">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 font-bold text-[12px]"><span className="text-[14px]">{cur?.icon}</span> Login sebagai {cur?.label}</div>
              <div className={`px-2 py-0.5 rounded-full text-[8px] font-black text-white uppercase ${selected==='admin'?'bg-blue-500':selected==='owner'?'bg-purple-500':selected==='produksi'?'bg-red-500':'bg-green-500'}`}>{selected}</div>
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold">Username</label>
                <input value={username} onChange={e=>setUsername(e.target.value)} className="mt-1 w-full h-9 rounded-lg border-2 border-slate-200 px-3 text-[12px] focus:border-blue-400 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold">Password</label>
                <div className="mt-1 relative">
                  <input type={showPass?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} className="w-full h-9 rounded-lg border-2 border-slate-200 px-3 text-[12px] pr-8 focus:border-blue-400 outline-none" />
                  <button type="button" onClick={()=>setShowPass(!showPass)} className="absolute right-2 top-2 text-[12px]">👁️</button>
                </div>
              </div>

              <div className="bg-slate-50 border-2 border-slate-100 rounded-xl p-2.5">
                <div className="text-[10px] font-black">Hak Akses {cur?.label}:</div>
                <ul className="text-[10px] mt-1 space-y-0.5 list-disc ml-3 text-slate-600">
                  {selected==='admin' && <><li>Akses Penuh Semua Modul</li><li>Inventori 16 bahan</li><li>Kelola User</li></>}
                  {selected==='owner' && <><li>Dashboard Read-Only</li><li>Laporan Profit Rp 95.550</li><li>Order Aktif & CLOSED</li></>}
                  {selected==='produksi' && <><li>Kalkulator Read-Only</li><li>Produksi 7 Phase + QC</li><li>Checklist Phase</li></>}
                  {selected==='delivery' && <><li>DAFTAR DELIVERY</li><li>2 Tombol DIKIRIM & CLOSED</li><li>Indikator 3 biru</li></>}
                </ul>
              </div>

              <button type="submit" className="w-full h-10 rounded-xl bg-[#FBBF24] hover:bg-[#f6b40a] text-black font-black text-[12px] flex items-center justify-center gap-1.5 transition">
                🔒 Login {cur?.label}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
