'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase'

type AuthState = 'loading' | 'guest' | 'user'

export default function Header() {
  const supabase = getSupabaseBrowser()
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [username, setUsername] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const router = useRouter()

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      if (!active) return
      const user = sessionData.session?.user

      if (!user) {
        setAuthState('guest')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!active) return
      setAuthState('user')
      setUsername(profile?.username ?? null)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      const user = session?.user
      if (!user) {
        setAuthState('guest')
        setUsername(null)
      } else {
        supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (active) {
              setAuthState('user')
              setUsername(data?.username ?? null)
            }
          })
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    router.push(trimmed.startsWith('@') ? `/u/${trimmed.slice(1)}` : `/?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/60 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center gap-3 px-4 md:h-20 md:gap-4 md:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight md:text-xl">Эхо!</Link>

        <form onSubmit={handleSearch} className="ml-3 flex w-full max-w-xl items-center md:ml-6 md:max-w-3xl">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти любой товар или @юзернейм…"
            className="w-full rounded-2xl border border-zinc-300 bg-white/80 px-4 py-2.5 text-sm outline-none transition
                       placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-500
                       dark:border-zinc-700 dark:bg-zinc-900/80 md:px-5 md:py-3 md:text-base"
            aria-label="Поиск"
          />
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
          <Link
            href="/sell"
            className="hidden rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 sm:inline-flex
                       dark:bg-white dark:text-zinc-950 md:px-5 md:py-2.5 md:text-base"
          >
            Продать
          </Link>

          {authState === 'user' && username ? (
            <Link
              href="/profile/me"
              className="rounded-2xl border border-zinc-300 px-4 py-2 text-sm transition hover:bg-zinc-100
                         dark:border-zinc-700 dark:hover:bg-zinc-900 md:px-5 md:py-2.5 md:text-base"
            >
              {username}
            </Link>
          ) : authState === 'loading' ? null : (
            <Link
              href="/auth"
              className="rounded-2xl border border-zinc-300 px-4 py-2 text-sm transition hover:bg-zinc-100
                         dark:border-zinc-700 dark:hover:bg-zinc-900 md:px-5 md:py-2.5 md:text-base"
            >
              Войти
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
