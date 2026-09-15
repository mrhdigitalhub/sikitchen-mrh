'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menus = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'Inventori Stok', href: '/inventory', icon: '📦' },
  { label: 'Master Menu & Resep', href: '/menus', icon: '🍱' },
  { label: 'Kalkulator Order', href: '/calculator', icon: '🧮', highlight: true },
  { label: 'Produksi', href: '/production', icon: '👨‍🍳' },
  { label: 'Delivery', href: '/delivery', icon: '🚚' },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-64 bg-navy text-white min-h-screen p-4 fixed">
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-widest">SIKITCHEN</h1>
        <p className="text-gold text-xs tracking-[0.2em]">CATERING OS v1.0</p>
      </div>
      <nav className="space-y-1">
        {menus.map(m => {
          const active = pathname?.startsWith(m.href)
          return (
            <Link key={m.href} href={m.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm ${m.highlight ? 'bg-gold text-navy font-semibold' : active ? 'bg-white/10' : 'hover:bg-white/5'} transition`}>
              <span>{m.icon}</span>{m.label}
            </Link>
          )
        })}
      </nav>
      <div className="absolute bottom-4 left-4 right-4 text-[11px] text-white/50">
        Tahap 1: Pondasi<br/>VS Code + Next.js + Vercel - FREE
      </div>
    </aside>
  )
}
