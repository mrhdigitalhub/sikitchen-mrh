"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ROLES = [
  { id:'admin', label:'Admin', icon:'📊', color:'border-blue-500', bg:'bg-blue-600', user:'admin', pass:'admin123', desc:'Akses Penuh Semua Modul', akses:['Dashboard','Inventori 16 bahan','Master Menu','Kalkulator Order','Produksi 7 Phase','Delivery 2 tombol'] },
  { id:'owner', label:'Owner', icon:'👑', color:'border-purple-500', bg:'bg-purple-600', user:'owner', pass:'owner123', desc:'Monitoring Profit & Laporan Read-Only', akses:['Dashboard Read-Only','Laporan Profit Rp 95.550','Order Aktif & CLOSED'] },
  { id:'produksi', label:'Produksi', icon:'👨‍🍳', color:'border-red-500', bg:'bg-red-600', user:'produksi', pass:'dapur123', desc:'Kalkulator (Read) + Produksi 7 Phase + QC', akses:['Kalkulator Read','Phase 1-4 Checklist','Tombol Proses Produksi → Diproses','QC → Next Delivery → Dikemas'] },
  { id:'delivery', label:'Delivery', icon:'🚚', color:'border-emerald-500', bg:'bg-emerald-600', user:'delivery', pass:'kurir123', desc:'Hanya Delivery - 2 Tombol DIKIRIM & CLOSED', akses:['DAFTAR DELIVERY','DIKIRIM → indikator 3 biru','CLOSED → indikator 4 hitam'] },
]

export default function LoginPage(){
  const router = useRouter()
  const [selectedRole,setSelectedRole]=useState('admin')
  const [username,setUsername]=useState('admin')
  const [password,setPassword]=useState('admin123')
  const [error,setError]=useState('')

  const role = ROLES.find(r=>r.id===selectedRole)

  function handleSelectRole(r){
    setSelectedRole(r.id)
    setUsername(r.user)
    setPassword(r.pass)
    setError('')
  }

  function handleLogin(){
    const r = ROLES.find(x=>x.user===username && x.pass===password)
    if(!r){
      setError('Username / Password salah Bos! Cek kartu role di atas')
      return
    }
    // Set cookie & localStorage untuk middleware & layout
    document.cookie = `sikitchen_role=${r.id}; path=/; max-age=86400`
    document.cookie = `sikitchen_user=${r.user}; path=/; max-age=86400`
    localStorage.setItem('sikitchen_role', r.id)
    localStorage.setItem('sikitchen_user', r.user)
    localStorage.setItem('sikitchen_login_at', new Date().toISOString())

    if(r.id==='admin') router.push('/dashboard')
    else if(r.id==='owner') router.push('/dashboard?role=owner')
    else if(r.id==='produksi') router.push('/production')
    else if(r.id==='delivery') router.push('/delivery')
  }

  return (
    <div className="min-h-screen bg-[#0A1931] flex items-center justify-center p-3" style={{fontFamily:'Inter, Arial, sans-serif'}}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden">
        <div className="bg-[#0A1931] text-white p-6 flex justify-between items-center">
          <div><div className="font-black text-[22px] tracking-wider">SIKITCHEN</div><div className="text-[11px] text-yellow-400 tracking-widest">CATERING OS v1.0 - Tahap 3 RBAC</div></div>
          <div className="text-[10px] text-slate-400">VS Code + Next.js + Vercel</div>
        </div>

        <div className="p-6 grid md:grid-cols-2 gap-6">
          <div>
            <div className="font-black text-[14px] mb-3">Pilih Role untuk Login</div>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map(r=>(
                <div key={r.id} onClick={()=>handleSelectRole(r)} className={`border-l-4 ${r.color} border-t border-r border-b rounded-2xl p-3 cursor-pointer transition hover:shadow-md ${selectedRole===r.id?'bg-slate-50 shadow-md ring-1 ring-slate-200':''}`}>
                  <div className="flex justify-between"><span className="text-[18px]">{r.icon}</span>{selectedRole===r.id && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}</div>
                  <div className="font-black text-[12px] mt-1">{r.label}</div>
                  <div className="text-[10px] text-slate-500 mt-1 leading-tight">{r.desc}</div>
                  <div className="text-[9px] mt-2 bg-slate-100 px-2 py-1 rounded-full inline-block">{r.user} / {r.pass}</div>
                  <div className="text-[9px] text-slate-400 mt-2">{r.akses.slice(0,2).join(' • ')}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border">
            <div className="font-bold text-[13px] mb-4 flex items-center gap-2"><span className="text-[16px]">{role.icon}</span> Login sebagai {role.label} <span className={`ml-auto px-2 py-0.5 rounded-full text-white text-[9px] ${role.bg}`}>{role.id.toUpperCase()}</span></div>
            
            <div className="space-y-3">
              <div><div className="text-[11px] font-bold mb-1">Username</div><input value={username} onChange={e=>setUsername(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-[13px] bg-white" placeholder="admin"/></div>
              <div><div className="text-[11px] font-bold mb-1">Password</div><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-[13px] bg-white" placeholder="••••••"/></div>
              
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-[11px]">{error}</div>}

              <div className="bg-white border rounded-xl p-3 text-[10px] leading-relaxed">
                <div className="font-bold mb-1">Hak Akses {role.label}:</div>
                {role.akses.map((a,i)=><div key={i} className="flex gap-1"><span>•</span><span>{a}</span></div>)}
              </div>

              <button onClick={handleLogin} className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-black py-3 rounded-xl text-[13px] shadow">🔐 Login {role.label}</button>
              <div className="text-[10px] text-slate-400 text-center">Cookie + localStorage → middleware cek role → redirect sesuai role</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-3 text-[10px] text-slate-400 border-t flex justify-between">
          <span>Tahap 3 RBAC - Admin Owner Produksi Delivery - 4 Role Berbeda</span><span>sikitchen-mrh.vercel.app/login</span>
        </div>
      </div>
    </div>
  )
}
