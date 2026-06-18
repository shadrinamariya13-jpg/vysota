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
        flowType: 'pkce',
      },
      global: {
        // Явный fetch с omit credentials — Safari ITP не считает это
        // cross-site tracking, потому что не отправляет кеки/cookies.
        fetch: (input, init = {}) => fetch(input, { ...init, credentials: 'omit' }),
      },
    })
  : null

export const cloudEnabled = !!supabase
