"use client"
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const ALL_MENU = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', roles:['admin','owner'], border: 'border-slate-300', activeBorder: 'border-[#0A1931]' },
  { href: '/inventory', label: 'Inventori Stok', icon: '📦', roles:['admin'], border: 'border-blue-300', activeBorder: 'border-blue-600' },
  { href: '/menus', label: 'Master Menu & Resep', icon: '🍱', roles:['admin'], border: 'border-orange-300', activeBorder: 'border-orange-500' },
  { href: '/calculator', label: 'Kalkulator Order', icon: '🧮', roles:['admin','produksi'], border: 'border-yellow-300', activeBorder: 'border-yellow-500' },
  { href: '/production', label: 'Produksi', icon: '👨‍🍳', roles:['admin','produksi'], border: 'border-red-300', activeBorder: 'border-red-600' },
  { href: '/delivery', label: 'Delivery', icon: '🚚', roles:['admin','delivery'], border: 'border-emerald-300', activeBorder: 'border-emerald-600' },
]

export default function DashboardLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [role,setRole]=useState('ADMIN')
  const [user,setUser]=useState('admin')

  useEffect(()=>{
    const r = localStorage.getItem('sikitchen_role')||'admin'
    const u = localStorage.getItem('sikitchen_user')||'admin'
    setRole(r.toUpperCase()); setUser(u)
  },[])

  const MENU = ALL_MENU.filter(m=> m.roles.includes(role.toLowerCase()) || role.toLowerCase()==='admin' || ALL_MENU.filter(x=>x.roles.includes('admin')).length===6 ? true : m.roles.includes(role.toLowerCase()))
  // simplified: admin lihat semua, lainnya filter
  const filtered = role.toLowerCase()==='admin' ? ALL_MENU : ALL_MENU.filter(m=>m.roles.includes(role.toLowerCase()))

  function handleLogout(){
    document.cookie = 'sikitchen_role=; path=/; max-age=0'
    document.cookie = 'sikitchen_user=; path=/; max-age=0'
    localStorage.removeItem('sikitchen_role')
    localStorage.removeItem('sikitchen_user')
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-50" style={{fontSize:'15px'}}>
      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-[280px] bg-[#0A1931] text-white flex flex-col transition-transform ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b border-white/10">
          <div className="font-black text-[20px] tracking-wider">SIKITCHEN</div>
          <div className="text-[13px] text-yellow-400 tracking-widest font-bold">CATERING OS v1.0</div>
          <div className="mt-3 bg-white/15 px-3 py-1.5 rounded-full text-[12px] inline-block font-bold">Role: {role} • {user}</div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {filtered.map(m => {
            const isActive = pathname.includes(m.href)
            return (
              <Link key={m.href} href={m.href} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] transition-all border-l-4 ${isActive ? `bg-white/15 text-white ${m.activeBorder} font-black` : `bg-transparent text-slate-300 ${m.border} border-l-transparent hover:bg-white/10 hover:text-white font-bold`}`}>
                <span className="text-[20px]">{m.icon}</span><span>{m.label}</span>{isActive && <span className="ml-auto w-2.5 h-2.5 rounded-full bg-white"></span>}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <button onClick={handleLogout} className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl text-[13px] font-black shadow">🔓 Logout {user}</button>
          <div className="text-[11px] text-slate-400">Font +2px • Sidebar 15px • 3D Icon 20px</div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden bg-[#0A1931] text-white p-4 flex justify-between items-center">
          <div className="font-black text-[16px]">SIKITCHEN - {role}</div>
          <button onClick={() => setOpen(!open)} className="bg-white/10 px-4 py-2 rounded-lg text-[14px] font-bold">☰ Menu</button>
        </div>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
