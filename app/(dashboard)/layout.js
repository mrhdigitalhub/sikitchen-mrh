"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// LAYOUT DASHBOARD FIX SIDEBAR STATIS - TIDAK IKUT SCROLL
export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menu = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/inventory", label: "Inventori Stok", icon: "📦" },
    { href: "/master-menu", label: "Master Menu & Resep", icon: "🍱" },
    { href: "/kalkulator", label: "Kalkulator Order", icon: "🧮" },
    { href: "/produksi", label: "Produksi", icon: "👨‍🍳" },
    { href: "/delivery", label: "Delivery", icon: "🚚" },
    { href: "/admin/master-kategori", label: "Admin Master A,B,C", icon: "⚙️" },
  ];

  const isActive = (href) => pathname === href || pathname?.startsWith(href + "/");

  return (
    <div className="min-h-screen bg-[#f5f7fb] flex">
      {/* SIDEBAR - FIXED STATIS TIDAK IKUT SCROLL */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex flex-col z-50 overflow-hidden transform transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="p-4 font-bold text-lg border-b border-slate-700 shrink-0">
          Sikitchen OS
          <div className="text-[10px] font-normal text-slate-400">Catering Operation</div>
        </div>
        {/* MENU - SCROLL DALAM SIDEBAR SAJA KALAU PANJANG */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
          {menu.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
              ${isActive(m.href) ? "bg-slate-800 text-white border-l-4 border-green-500 font-bold" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
            >
              <span>{m.icon}</span> {m.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700 shrink-0 text-[10px] text-slate-400">
          V15.6 Final • Sidebar Fixed
        </div>
      </aside>

      {/* OVERLAY MOBILE */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* MAIN CONTENT - MARGIN KIRI 64 (256px) BIAR TIDAK KETUTUP SIDEBAR + SCROLL SENDIRI */}
      <div className="flex-1 md:ml-64 min-h-screen flex flex-col">
        {/* TOPBAR MOBILE */}
        <div className="md:hidden sticky top-0 z-30 bg-slate-900 text-white p-3 flex justify-between items-center">
          <button onClick={() => setSidebarOpen(true)} className="bg-slate-800 px-3 py-1.5 rounded">☰ Menu</button>
          <span className="font-bold text-sm">Sikitchen OS</span>
          <div className="w-12" />
        </div>

        {/* CONTENT AREA - INI YANG SCROLL, SIDEBAR TETAP DIAM */}
        <main className="flex-1 overflow-y-auto h-screen md:h-auto">
          {children}
        </main>
      </div>

      <style jsx global>{`
        /* HIDE SCROLLBAR TAPI TETAP BISA SCROLL */
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        /* BODY JANGAN DOUBLE SCROLL */
        html, body { height: 100%; overflow: hidden; }
        @media (max-width: 768px) {
          html, body { overflow: auto; }
          main { height: auto !important; overflow: visible !important; }
        }
      `}</style>
    </div>
  );
}
