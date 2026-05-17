// lib/supabase.ts
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'
import type { RequestCookies } from 'next/dist/compiled/@edge-runtime/cookies'

// --- env ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '[ECHO] Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

// --- одноразовая «миграция» LS при смене проекта/доменa ---
if (typeof window !== 'undefined') {
  try {
    const host = new globalThis.URL(SUPABASE_URL).host
    const fpKey = `sb-fp:${host}`
    const hasFp = localStorage.getItem(fpKey) === '1'
    if (!hasFp) {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb-') || k.includes('supabase'))
        .forEach((k) => localStorage.removeItem(k))
      localStorage.setItem(fpKey, '1')
    }

    // eslint-disable-next-line no-console
    console.log('[ECHO] SUPABASE ENV', {
      url: SUPABASE_URL,
      keyPreview: SUPABASE_ANON_KEY.slice(0, 10) + '…',
    })
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[ECHO] Supabase URL parse error', e)
  }
}

// --- тип клиента выводим из самой фабрики (устойчиво к различиям дженериков SDK) ---
export type BrowserSBClient = ReturnType<typeof createBrowserClient<Database>>

let browserClient: BrowserSBClient | undefined

export const getSupabaseBrowser = (): BrowserSBClient => {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return browserClient
}

// --- серверный клиент (для API/SSR) ---
export const getSupabaseServer = (cookies: () => RequestCookies) =>
  createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies,
  })

// --- helper: ручная очистка локальной сессии ---
export const clearSupabaseLocal = () => {
  if (typeof window === 'undefined') return
  Object.keys(localStorage)
    .filter((k) => k.startsWith('sb-') || k.includes('supabase'))
    .forEach((k) => localStorage.removeItem(k))
}
