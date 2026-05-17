'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Клиент из auth-helpers: он сам возьмёт env и куки
import { createClientComponentClient as _createClient } from '@supabase/auth-helpers-nextjs'
// ❌ не импортируем SupabaseClient — он и вызывает конфликт generic’ов
// import type { SupabaseClient } from '@supabase/supabase-js'

type Product = {
  id: string
  title: string
  price: number | null
  brand?: string | null
  images?: string[] | null
}

// Вариант 1 (самый простой): позволяем TS вывести тип
function useSupabase() {
  return _createClient()
}

// Вариант 2 (явно, если хочешь строгий тип от фабрики)
// function useSupabase(): ReturnType<typeof _createClient> {
//   return _createClient()
// }

export default function LikesPage() {
  const supabase = useSupabase()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Product[]>([])
  const pathname = usePathname() || ''
  const isMini = useMemo(() => pathname.startsWith('/mini'), [pathname])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (alive) { setItems([]); setLoading(false) }
        return
      }

      // 1) берём лайки пользователя
      const { data: liked, error: e1 } = await supabase
        .from('likes')
        .select('product_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (e1 || !liked?.length) {
        if (alive) { setItems([]); setLoading(false) }
        return
      }

      const ids = liked.map(l => l.product_id)

      // 2) подтягиваем товары
      const { data: products, error: e2 } = await supabase
        .from('products')
        .select('id, title, price, brand, images')
        .in('id', ids)

      if (alive) {
        if (e2 || !products) {
          setItems([])
        } else {
          // сохранить порядок по времени лайка
          const order = new Map(ids.map((id, i) => [id, i]))
          products.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
          setItems(products)
        }
        setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [supabase, pathname])

  if (loading) {
    return <div className="p-4 text-sm text-zinc-400">Загружаем лайки…</div>
  }

  if (!items.length) {
    return (
      <div className="p-6 text-center text-sm text-zinc-400">
        {isMini ? (
          <>Пока пусто. Откройте <Link className="underline" href="/mini">ленту</Link> и поставьте несколько лайков.</>
        ) : (
          <>Пока пусто. Зайдите в ленту и поставьте несколько лайков.</>
        )}
      </div>
    )
  }

  // для мини используем компактные карточки
  const Card = isMini
    ? require('@/components/ProductCardMini').default
    : require('@/components/ProductCard').default

  return (
    <div className="p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map(p => (
          <Card key={p.id} p={p} />
        ))}
      </div>
    </div>
  )
}
