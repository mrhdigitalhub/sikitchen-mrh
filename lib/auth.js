// lib/auth.js - TAHAP 3 RBAC GENERAL - Tanpa Email, pakai Username
import { supabase } from './supabaseClient'

export const ROLES = {
  admin: { label: 'Admin', desc: 'Full CRUD', menus: ['dashboard','inventory','menus','orders','produksi','delivery','kategori'] },
  owner: { label: 'Owner', desc: 'Monitoring + Approve Harga + Profit', menus: ['dashboard','inventory','price_history'] },
  kepala_dapur: { label: 'Kepala Dapur', desc: 'Produksi, Resep, Pakai Stok', menus: ['dashboard','inventory','menus','produksi'] },
  delivery: { label: 'Delivery', desc: 'Update Status Delivery', menus: ['dashboard','delivery'] }
}

export function getSession() {
  if (typeof window === 'undefined') return null
  const saved = localStorage.getItem('sikitchen_session')
  if (!saved) return null
  try { return JSON.parse(saved) } catch { return null }
}

export function getCurrentRole() {
  const sess = getSession()
  return sess?.role || null
}

export async function getProfileByUsername(username) {
  const { data } = await supabase.from('profiles').select('*').eq('username', username).single()
  return data
}

export function signOutGeneral() {
  localStorage.removeItem('sikitchen_session')
}

export function canAccess(role, page) {
  if (!role) return false
  if (role === 'admin') return true
  const allowed = ROLES[role]?.menus || []
  return allowed.includes(page)
}
