'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase'
import ProductCard from '@/components/ProductCard'
import { useTWA } from '@/providers/TWAProvider'

type Product = {
  id: string
  title: string
  brand?: string | null
  price: number
  images?: string[] | null
  created_at?: string
  gender?: 'men' | 'women' | 'unisex' | null
  category?: 'clothing' | 'sneakers' | 'accessories' | null
}

function HomeInner() {
  const supabase = getSupabaseBrowser()
  const params = useSearchParams()
  const gender = (params.get('gender') as 'men' | 'women' | null) || null
  const category = (params.get('category') as 'sneakers' | 'clothing' | 'accessories' | null) || null

  const isMini = useTWA()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 0,
      }),
    []
  )

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        let q = supabase.from('products').select('*').order('created_at', { ascending: false })
        if (gender) q = q.eq('gender', gender)
        if (category) q = q.eq('category', category)
        const { data, error } = await q
        if (error) {
          console.error('Ошибка загрузки товаров:', error.message)
          if (alive) setProducts([])
        } else {
          if (alive) setProducts((data || []) as Product[])
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [supabase, gender, category])

  const chipClass = (active?: boolean) =>
    [
      'inline-flex items-center rounded-full border px-4 py-2 text-[14px] font-medium transition md:px-6 md:py-3 md:text-[16px]',
      'border-zinc-300/70 bg-zinc-100/70 text-zinc-800 hover:bg-zinc-200 hover:border-zinc-300',
      'dark:border-zinc-700/70 dark:bg-zinc-900/70 dark:text-zinc-100 dark:hover:bg-zinc-800',
      active ? 'ring-2 ring-indigo-500' : '',
    ].join(' ')

  const items = products

  return (
    <div className={isMini ? 'px-4 pb-28' : 'min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100'}>
      {!isMini && (
        <nav aria-label="Категории" className="bg-white/80 backdrop-blur dark:bg-zinc-950/70 -mt-px">
          <div className="container mx-auto max-w-screen-2xl px-4 md:px-6">
            <ul className="m-0 flex flex-nowrap gap-2 overflow-x-auto py-3 md:flex-wrap md:gap-3 md:py-5 scrollbar-none">
              <li className="shrink-0">
                <Link href="/brands" className={chipClass()}>
                  Бренды
                </Link>
              </li>
              <li className="shrink-0">
                <Link href="/?gender=men" className={chipClass(gender === 'men')}>
                  Мужское
                </Link>
              </li>
              <li className="shrink-0">
                <Link href="/?gender=women" className={chipClass(gender === 'women')}>
                  Женское
                </Link>
              </li>
              <li className="shrink-0">
                <Link href="/?category=sneakers" className={chipClass(category === 'sneakers')}>
                  Кроссовки
                </Link>
              </li>
              <li className="shrink-0">
                <Link href="/?category=accessories" className={chipClass(category === 'accessories')}>
                  Аксессуары
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      )}

      <section className={`container mx-auto max-w-screen-2xl ${isMini ? 'px-0 pt-2' : 'px-4 md:px-6'} pb-10`}>
        {!isMini && (
          <div className="mb-4 flex items-center gap-2 md:mb-6">
            <h3 className="text-xl font-semibold tracking-[-0.01em] md:text-2xl">Лента товаров</h3>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-zinc-200/60 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="aspect-square w-full animate-pulse bg-zinc-100 dark:bg-zinc-800" />
                <div className="space-y-2 p-3">
                  <div className="h-3 w-16 rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-4 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800" />
                  <div className="h-5 w-1/3 rounded bg-zinc-100 dark:bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-zinc-300 p-8 text-center dark:border-zinc-700">Ничего не найдено.</div>
        ) : (
          <div className={`grid ${isMini ? 'grid-cols-2 gap-3' : 'grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3'}`}>
            {items.map((p) => (
              <Link key={p.id} href={`/product/${p.id}`} className="group">
                <ProductCard p={p} fmt={fmt} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-zinc-400">Загружаем…</div>}>
      <HomeInner />
    </Suspense>
  )
}
