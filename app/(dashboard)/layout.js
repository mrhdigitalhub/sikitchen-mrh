"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const MENU = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', border: 'border-slate-300', activeBorder: 'border-[#0A1931]' },
  { href: '/inventory', label: 'Inventori Stok', icon: '📦', border: 'border-blue-300', activeBorder: 'border-blue-600' },
  { href: '/menus', label: 'Master Menu & Resep', icon: '🍱', border: 'border-orange-300', activeBorder: 'border-orange-500' },
  { href: '/calculator', label: 'Kalkulator Order', icon: '🧮', border: 'border-yellow-300', activeBorder: 'border-yellow-500' },
  { href: '/production', label: 'Produksi', icon: '👨‍🍳', border: 'border-red-300', activeBorder: 'border-red-600' },
  { href: '/delivery', label: 'Delivery', icon: '🚚', border: 'border-emerald-300', activeBorder: 'border-emerald-600' },
]

export default function DashboardLayout({ children }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-[260px] bg-[#0A1931] text-white flex flex-col transition-transform ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-5 border-b border-white/10">
          <div className="font-black text-[18px] tracking-wider">SIKITCHEN</div>
          <div className="text-[11px] text-yellow-400 tracking-widest">CATERING OS v1.0</div>
        </div>

        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {MENU.map(m => {
            const isActive = pathname.includes(m.href)
            return (
              <Link
                key={m.href}
                href={m.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all border-l-4
                  ${isActive
                    ? `bg-white/10 text-white ${m.activeBorder} font-bold`
                    : `bg-transparent text-slate-300 ${m.border} border-l-transparent hover:bg-white/5 hover:text-white hover:border-white/20`
                  }`}
              >
                <span className="text-[16px]">{m.icon}</span>
                <span>{m.label}</span>
                {isActive && <span className="ml-auto w-2 h-2 rounded-full bg-white"></span>}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 text-[10px] text-slate-400 border-t border-white/10">
          <div>Tahap 1: Pondasi</div>
          <div>VS Code + Next.js + Vercel - FREE</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="md:hidden bg-[#0A1931] text-white p-3 flex justify-between items-center">
          <div className="font-black">SIKITCHEN</div>
          <button onClick={() => setOpen(!open)} className="bg-white/10 px-3 py-1.5 rounded-lg text-[12px]">☰ Menu</button>
        </div>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
