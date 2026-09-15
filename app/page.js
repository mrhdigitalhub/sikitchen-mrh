"use client"
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const router = useRouter()
  useEffect(() => {
    const sess = localStorage.getItem('sikitchen_session')
    if (!sess) {
      router.replace('/login')
    } else {
      // Masuk ke login-dashboard sesuai username yang dipakai saat login
      // Semua role masuk ke /dashboard tapi dashboard akan render sesuai role
      router.replace('/dashboard')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center text-white">
      <div className="text-center">
        <h1 className="text-3xl font-bold">SIKITCHEN</h1>
        <p className="text-gold-light text-sm mt-2">Mengalihkan ke login-dashboard...</p>
      </div>
    </div>
  )
}
