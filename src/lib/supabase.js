import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_KEY

if (!url || !key) {
  console.warn('[supabase] нет VITE_SUPABASE_URL или VITE_SUPABASE_KEY — облачная синхронизация отключена')
}

export const supabase = url && key
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'vysota-auth',
      },
    })
  : null

export const cloudEnabled = !!supabase
