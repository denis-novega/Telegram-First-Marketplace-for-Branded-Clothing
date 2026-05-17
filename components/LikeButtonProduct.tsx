'use client'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase'

const supabase = getSupabaseBrowser()

export default function LikeButtonProduct({
  productId,
  ownerUserId,
  compact = false,
}: {
  productId: string
  ownerUserId?: string
  compact?: boolean
}) {
  const pathname = usePathname()
  const isMini = useMemo(() => pathname.startsWith('/mini'), [pathname])

  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState<number>(0)
  const [busy, setBusy] = useState(false)
  const [self, setSelf] = useState(false)

  // ---------- INIT ----------
  useEffect(() => {
    let alive = true
    ;(async () => {
      // self-check (только для core, в mini ownerUserId не сравниваем с supabase uid)
      if (!isMini && ownerUserId) {
        const { data: auth } = await supabase.auth.getUser()
        const me = auth?.user?.id
        if (me && me === ownerUserId) {
          if (alive) setSelf(true)
        }
      }

      if (isMini) {
        // MINI: получим список лайков и определим is liked оптимистично
        try {
          const r = await fetch('/api/likes/list?limit=500', { cache: 'no-store' })
          const j = await r.json()
          if (alive && j?.ok && Array.isArray(j.items)) {
            const exists = j.items.some((it: any) => it.product_id === productId)
            setLiked(!!exists)
          }
        } catch {}
        // Мини: счётчик можно не грузить отдельно, оставим 0 до первого действия,
        // или подгрузить счётчик из твоего core-кода (если нужен, можно сделать /api/likes/count?product_id=)
      } else {
        // CORE: твой прежний код
        const { data: auth } = await supabase.auth.getUser()
        const me = auth?.user?.id

        if (me) {
          const { data } = await supabase
            .from('product_likes')
            .select('product_id')
            .eq('product_id', productId)
            .eq('liker_user_id', me)
            .maybeSingle()
          if (alive) setLiked(!!data)
        }

        const { count } = await supabase
          .from('product_likes')
          .select('product_id', { count: 'exact', head: true })
          .eq('product_id', productId)
        if (alive) setCount(count ?? 0)
      }
    })()
    return () => {
      alive = false
    }
  }, [productId, ownerUserId, isMini])

  // ---------- ACTION ----------
  async function toggle() {
    if (busy || self) return
    setBusy(true)

    try {
      if (isMini) {
        // MINI: бьём в серверный эндпоинт
        const tryToggle = async (): Promise<boolean> => {
          const r = await fetch('/api/likes/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId }),
          })
          if (r.status === 401) return false
          const j = await r.json()
          if (j?.ok) {
            // оптимистично обновляем локальный счётчик
            const nextLiked = !!j.liked
            setLiked(nextLiked)
            setCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)))
          }
          return true
        }

        // 1-я попытка
        let ok = await tryToggle()

        // если не авторизованы — пробуем reauth по initData и снова
        if (!ok) {
          try {
            await fetch('/api/tg-auth', {
              method: 'POST',
              headers: { 'x-telegram-init-data': (window as any)?.Telegram?.WebApp?.initData || '' },
            })
          } catch {}
          ok = await tryToggle()
          if (!ok) {
            // остаёмся в текущем состоянии, можно показать тост
            console.warn('Mini like toggle failed: unauthorized')
          }
        }
      } else {
        // CORE: твой прежний код
        const { data: auth } = await supabase.auth.getUser()
        const me = auth?.user?.id
        if (!me) {
          window.location.href = '/auth'
          return
        }

        if (liked) {
          await supabase
            .from('product_likes')
            .delete()
            .eq('product_id', productId)
            .eq('liker_user_id', me)
          setLiked(false)
          setCount((c) => Math.max(0, c - 1))
        } else {
          const { error } = await supabase
            .from('product_likes')
            .insert({ product_id: productId, liker_user_id: me })
          if (!error) {
            setLiked(true)
            setCount((c) => c + 1)
          }
        }
      }
    } finally {
      setBusy(false)
    }
  }

  // ---------- UI ----------
  if (compact) {
    return (
      <button
        onClick={toggle}
        disabled={busy || self}
        className={`rounded-full px-3 py-1 text-xs backdrop-blur border
        ${liked ? 'border-pink-600 text-pink-600 bg-white/80 dark:bg-zinc-900/60' : 'border-zinc-300 text-zinc-700 bg-white/70 dark:border-zinc-700 dark:text-zinc-200 dark:bg-zinc-900/50'}`}
        title={self ? 'Нельзя лайкать свой товар' : liked ? 'Убрать лайк' : 'Поставить лайк'}
      >
        {liked ? '❤️' : '🤍'} {count}
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      disabled={busy || self}
      className={`rounded-2xl border px-4 py-2 text-sm transition
        ${liked ? 'border-pink-600 text-pink-600 dark:border-pink-500 dark:text-pink-400' : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
      title={self ? 'Нельзя лайкать свой товар' : liked ? 'Убрать лайк' : 'Поставить лайк'}
    >
      {liked ? '❤️ Лайк' : '🤍 Лайк'} ({count})
    </button>
  )
}
