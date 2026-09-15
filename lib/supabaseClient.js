// TAHAP 2 - KONEKSI REAL SUPABASE - Support publishable & anon key
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// Supabase terbaru pakai PUBLISHABLE_KEY, yang lama ANON_KEY - support keduanya
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase ENV belum diisi - pakai .env.local dari .env.local.example')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key'
)

// Helper cek koneksi
export async function testSupabaseConnection() {
  const { data, error } = await supabase.from('inventory_items').select('id').limit(1)
  return { ok: !error, data, error }
}
