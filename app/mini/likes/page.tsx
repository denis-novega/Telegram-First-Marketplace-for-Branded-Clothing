'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProductCardMini from '@/components/ProductCardMini'

type RawLike =
  | {
      product_id: string
      title?: string | null
      price?: number | null
      brand?: string | null
      images?: string[] | null
      status?: string | null
    }
  | {
      id: string
      title?: string | null
      price?: number | null
      brand?: string | null
      images?: string[] | null
      status?: string | null
    }

type NormalizedItem = {
  id: string
  title: string
  price: number
  brand?: string
  images?: string[]
  status?: string
}

/** TopBar: фиксированная шапка с центр-тайтлом и учётом safe-area */
function TopBar({ title = 'Лайки' }: { title?: string }) {
  return (
    <div
      className="fixed top-0 z-50 w-full border-b-0 shadow-none
                 bg-zinc-950 supports-[backdrop-filter]:bg-zinc-950 supports-[backdrop-filter]:backdrop-blur"
      style={{ ['--topbar-h' as any]: '56px' }}
      role="banner"
      aria-label={title ? `Заголовок: ${title}` : 'Заголовок'}
    >
      <div className="pt-[max(var(--safe-top,0px),0px)]" />
      <div className="px-3 h-12 grid items-center" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
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
}

export default function MiniLikesPage() {
  const router = useRouter()

  const [authChecked, setAuthChecked] = useState(false)
  const [isAuthed, setIsAuthed] = useState<boolean>(false)

  const [items, setItems] = useState<NormalizedItem[] | null>(null)
  const [error, setError] = useState<string>('')

  // 1) Проверяем авторизацию
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch('/api/me', { credentials: 'include', cache: 'no-store' })
        const j = await r.json()
        if (!alive) return
        setIsAuthed(!!j?.ok)
      } catch {
        if (!alive) return
        setIsAuthed(false)
      } finally {
        if (alive) setAuthChecked(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // 1.1) Редирект неавторизованных
  useEffect(() => {
    if (!authChecked) return
    if (!isAuthed) {
      router.replace('/mini/profile')
    }
  }, [authChecked, isAuthed, router])

  // 2) Тянем лайки после подтверждённой авторизации
  useEffect(() => {
    if (!authChecked || !isAuthed) return
    let alive = true
    setItems(null)
    setError('')
    ;(async () => {
      try {
        const r = await fetch('/api/likes/list?limit=200', {
          credentials: 'include',
          cache: 'no-store',
        })
        const j = await r.json()
        if (!alive) return

        if (!j?.ok) {
          setError(j?.error || 'Не удалось загрузить лайки')
          setItems([])
          return
        }

        const raw: RawLike[] = j.items ?? []
        const normalized: NormalizedItem[] = raw
          .map((p) => {
            const id = ('product_id' in p ? p.product_id : (p as any).id) as string | undefined
            if (!id) return null
            return {
              id,
              title: (p.title ?? '').toString(),
              price: Number(p.price ?? 0),
              brand: p.brand ?? undefined,
              images: (p.images ?? undefined) || undefined,
              status: p.status ?? undefined,
            }
          })
          .filter(Boolean) as NormalizedItem[]

        setItems(normalized)
      } catch {
        if (!alive) return
        setError('Не удалось загрузить лайки')
        setItems([])
      }
    })()
    return () => {
      alive = false
    }
  }, [authChecked, isAuthed])

  // --- Подготовка контента для единообразного рендера под TopBar ---
  let content: ReactNode = null

  if (!authChecked) {
    content = <div className="p-4 text-sm text-zinc-400">Проверяем вход…</div>
  } else if (!isAuthed) {
    // На момент редиректа ничего не рисуем
    content = null
  } else if (items === null) {
    content = <div className="p-4 text-sm text-zinc-400">Загружаем…</div>
  } else if (items.length === 0) {
    content = (
      <div className="p-6 text-center text-sm text-zinc-400">
        {error ? <div className="mb-2 text-red-400">{error}</div> : null}
        Пока пусто.{' '}
        <Link className="underline" href="/mini">
          Откройте ленту
        </Link>{' '}
        и поставьте лайки.
      </div>
    )
  } else {
    content = (
      <div className="px-3 grid grid-cols-2 gap-3 pt-1">
        {items.map((p) => (
          <Link key={p.id} href={`/mini/product/${p.id}`}>
            <ProductCardMini
              p={{
                id: p.id,
                title: p.title,
                price: p.price,
                brand: p.brand,
                images: p.images,
                status: p.status,
              } as any}
            />
          </Link>
        ))}
      </div>
    )
  }

  // --- Рендер с TopBar и отступом под него ---
  return (
    <div>
      <TopBar title="Лайки" />
      <main
        style={{
          paddingTop: 'calc(var(--content-safe-top, 0px) + var(--topbar-h, 56px))',
        }}
      >
        {content}
      </main>
    </div>
  )
}

