// components/mini/AuthGate.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { getInitData } from '@/components/mini/getInitData'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Текущий путь + query (аналог asPath)
  const currentPath = useMemo(() => {
    const base = pathname || '/'
    const qs = searchParams?.toString()
    return qs ? `${base}?${qs}` : base
  }, [pathname, searchParams])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch('/api/me', { cache: 'no-store' })
        const j = await r.json()
        if (!alive) return
        setOk(!!j?.auth)
      } catch {
        if (!alive) return
        setOk(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (ok === null) {
    return <div className="p-6 text-sm text-zinc-400">Проверяем вход…</div>
  }

  if (!ok) {
    const reauth = async () => {
      if (loading) return
      setLoading(true)
      try {
        const initData = getInitData()
        if (!initData) {
          alert('Не удалось получить данные Telegram для входа.')
          setLoading(false)
          return
        }

        const r = await fetch('/api/tg-auth', {
          method: 'POST',
          headers: {
            'x-telegram-init-data': initData,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ init_data: initData }),
        })
        const j = await r.json()

        if (j?.ok) {
          // Обновляем текущую страницу с уже установленной кукой
          router.replace(currentPath)
          return
        }

        alert('Не удалось войти: ' + (j?.error || 'unknown'))
      } catch (e) {
        console.error(e)
        alert('Ошибка сети при попытке входа.')
      } finally {
        setLoading(false)
      }
    }

    return (
      <div className="p-6 text-center space-y-3">
        <div className="text-base font-medium">Вы не вошли</div>
        <div className="text-sm text-zинc-400">
          Войдите через Telegram, чтобы продолжить
        </div>
        <button
          onClick={reauth}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-white text-black text-sm font-medium disabled:opacity-60"
        >
          {loading ? 'Входим…' : 'Войти через Telegram'}
        </button>
      </div>
    )
  }

  return <>{children}</>
}
