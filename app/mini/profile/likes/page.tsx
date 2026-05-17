// app/mini/profile/likes/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type LikedProfile = {
  id: string
  username: string | null
  name: string | null
  city: string | null
  telegram_username: string | null
  telegram_photo_url?: string | null
  is_verified?: boolean | null
}

export default function MiniLikedProfilesPage() {
  const router = useRouter()
  const [items, setItems] = useState<LikedProfile[] | null>(null)
  const [err, setErr] = useState<string>('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // Проверим вход
        const me = await fetch('/api/me', { credentials: 'include', cache: 'no-store' }).then(r => r.json())
        if (!me?.ok) {
          router.replace('/mini/profile')
          return
        }
        const j = await fetch('/api/likes/profiles?limit=200', { credentials: 'include', cache: 'no-store' }).then(r => r.json())
        if (!alive) return
        if (j?.ok) setItems(j.items ?? [])
        else { setErr(j?.error || 'Не удалось загрузить'); setItems([]) }
      } catch {
        if (!alive) return
        setErr('Не удалось загрузить')
        setItems([])
      }
    })()
    return () => { alive = false }
  }, [router])

  if (items === null) return <div className="p-4 text-sm text-zinc-400">Загружаем…</div>
  if (items.length === 0) return <div className="p-6 text-center text-sm text-zinc-400">Пока пусто.</div>

  return (
    <div className="px-3 pt-2 space-y-3">
      {err ? <div className="text-red-400 text-sm">{err}</div> : null}
      {items.map((p) => (
        <Link key={p.id} href={`/u/${p.username ?? p.id}`} className="flex items-center gap-3 rounded-xl border border-zinc-800 p-3 hover:bg-zinc-900">
          <div className="h-10 w-10 rounded-full bg-zinc-800 overflow-hidden">
            {p.telegram_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.telegram_photo_url} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium truncate">
                {p.name?.trim() || p.username?.trim() || (p.telegram_username ? `@${p.telegram_username}` : 'Профиль')}
              </div>
              {p.is_verified ? (
                <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                  ✓
                </span>
              ) : null}
            </div>
            <div className="text-[11px] text-zinc-400 truncate">
              {p.username ? `@${p.username}` : p.telegram_username ? `@${p.telegram_username}` : '—'}
              {p.city ? ` · ${p.city}` : ''}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
