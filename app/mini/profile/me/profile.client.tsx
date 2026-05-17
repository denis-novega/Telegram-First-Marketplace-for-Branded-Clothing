// app/mini/profile/me/profile.client.tsx
'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import UserProfileView from '@/components/mini/UserProfileView'

/**
 * Полностью фиксированный TopBar, отрисовывается через портал в document.body,
 * так что НЕ зависит от transform/overflow у предков.
 */
function FixedTopBarPortal({ title = 'эхо!' }: { title?: string }) {
  if (typeof document === 'undefined') return null

  const bar = (
    <div
      className="fixed inset-x-0 top-0 z-[1000] bg-zinc-950 shadow-none border-b-0"
      style={{
        // Общая высота: safe-area сверху + 56px
        height: 'calc(env(safe-area-inset-top, 0px) + 56px)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
      role="banner"
      aria-label={title ? `Заголовок: ${title}` : 'Заголовок'}
    >
      <div
        className="px-3 h-14 grid items-center"
        style={{ gridTemplateColumns: 'auto 1fr auto' }}
      >
        <div className="w-11" aria-hidden />
        {title && (
          <div className="justify-self-center text-[15px] font-semibold tracking-tight text-zinc-100 text-center">
            {title}
          </div>
        )}
        <div className="w-11" aria-hidden />
      </div>
    </div>
  )

  // Рисуем прямо в body → не подвержено transform родителей
  return createPortal(bar, document.body)
}

type Profile = {
  id: string
  username: string | null
  name: string | null
  city: string | null
  telegram_username: string | null
  telegram_photo_url?: string | null
  is_verified?: boolean | null
}

// то, что приходит с сервера (базовые поля)
type StatsInput = {
  products: number
  likes: number
  // расширения, которые может передать сервер:
  products_published?: number
  products_pending?: number
  products_archived?: number
  // а также, что может вернуть /api/profile/stats:
  product_likes?: number
  profile_likes?: number
}

type ApiStats = {
  products_published: number
  products_pending: number
  product_likes: number
  profile_likes: number
}

export default function ClientProfileScreen({
  profile,
  stats,
}: {
  profile: Profile
  stats: StatsInput
}) {
  // Локально держим «живую» версию счётчиков,
  // поверх базовых значений из SSR.
  const [liveStats, setLiveStats] = useState<StatsInput>(stats)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch('/api/profile/stats', { credentials: 'include', cache: 'no-store' })
        const j: { ok?: boolean; stats?: Partial<ApiStats> } = await r.json()
        if (!alive) return
        if (j?.ok && j.stats) {
          // зафиксировали stats в локальную константу для уверенного сужения типов
          const st = j.stats
          setLiveStats((s) => ({
            ...s,
            products_published: st.products_published ?? s.products_published,
            products_pending: st.products_pending ?? s.products_pending,
            product_likes: st.product_likes ?? s.product_likes,
            profile_likes: st.profile_likes ?? s.profile_likes,
          }))
        }
      } catch {
        // тихо игнорируем — остаются базовые SSR-значения
      }
    })()
    return () => { alive = false }
  }, [])

  // Берём детальные поля, если они даны сервером/АПИ
  const published = liveStats.products_published ?? 0
  const pending = liveStats.products_pending ?? 0
  const archived = liveStats.products_archived ?? 0

  // “Объявлений” = опубликованные + на модерации,
  // а если сервер не прислал разбиение — используем старое поле products
  const totalAds = (published + pending) || liveStats.products || 0

  // готовим объект, совместимый с текущим UserProfileView:
  // подменяем products на сумму; остальные поля прокидываем “как есть”
  const statsForView = {
    ...liveStats,
    products: totalAds,
    // дополнительно пробрасываем детальные поля на будущее (если компонент их использует)
    products_published: published || undefined,
    products_pending: pending || undefined,
    products_archived: archived || undefined,
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Фиксированный топбар поверх всего */}
      <FixedTopBarPortal title="эхо!" />

      {/* Контент отталкиваем ровно на высоту шапки */}
      <main style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 56px)' }}>
        <UserProfileView profile={profile} stats={statsForView} />
      </main>
    </div>
  )
}
