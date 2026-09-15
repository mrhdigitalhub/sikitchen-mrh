"use client"
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/ui/Sidebar'

export default function DashboardLayout({ children }) {
  const [checked, setChecked] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const sess = localStorage.getItem('sikitchen_session')
    if (!sess) {
      // Belum login - redirect ke login (di awal buka web)
      router.replace('/login')
    } else {
      setChecked(true)
    }
  }, [router])

  if (!checked) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold">SIKITCHEN</h1>
          <p className="text-sm text-white/60 mt-2">Cek login-dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-64 flex-1 p-6 bg-[#F8FAFC] min-h-screen">{children}</main>
    </div>
  )
}
