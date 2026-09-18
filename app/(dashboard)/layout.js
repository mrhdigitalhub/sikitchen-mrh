"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// LAYOUT DASHBOARD V2 - SIDEBAR STATIS, INVENTORY BISA SCROLL - FIX STAG
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
    <div className="min-h-screen bg-[#f5f7fb]">
      {/* SIDEBAR FIXED - DIAM TIDAK IKUT SCROLL */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-64 bg-slate-900 text-white flex flex-col z-50
        transform transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="p-4 font-bold text-lg border-b border-slate-700 shrink-0">
          Sikitchen OS
          <div className="text-[10px] font-normal text-slate-400">Catering Operation</div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menu.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
              ${isActive(m.href) ? "bg-slate-800 text-white border-l-4 border-green-500 font-bold" : "text-slate-300 hover:bg-slate-800"}`}
            >
              <span>{m.icon}</span> {m.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700 shrink-0 text-[10px] text-slate-400">
          V15.7 Fix Stag - Sidebar Static
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* MAIN CONTENT - DIBERI MARGIN KIRI 64, BISA SCROLL NORMAL */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Topbar mobile */}
        <div className="md:hidden sticky top-0 z-30 bg-slate-900 text-white p-3 flex justify-between items-center">
          <button onClick={() => setSidebarOpen(true)} className="bg-slate-800 px-3 py-1.5 rounded">☰ Menu</button>
          <span className="font-bold text-sm">Sikitchen OS</span>
          <div className="w-12" />
        </div>

        {/* INVENTORY PAGE - SCROLL NORMAL, TIDAK STAG LAGI */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
