// app/mini/my/page.tsx
'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const ProductCardMini = dynamic(() => import('@/components/ProductCardMini'), { ssr: false })

type MyItem = {
  id: string
  title: string
  price: number | null
  brand?: string | null
  images?: string[] | null
  status?: string | null // 'published' | 'pending' ...
}

/* ===== Accent из Telegram темы ===== */
function useAccentColor() {
  const [c, setC] = useState('#3b82f6') // blue-500
  useEffect(() => {
    try {
      const wa = (window as any)?.Telegram?.WebApp
      const t = wa?.themeParams || {}
      const v = t?.button_color || t?.link_color || t?.hint_color
      if (typeof v === 'number') setC('#' + v.toString(16).padStart(6, '0'))
      else if (typeof v === 'string' && v) setC(v)
    } catch {}
  }, [])
  return c
}
function shadowFromHex(hex: string, a = 0.35) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return 'rgba(59,130,246,.35)'
  const r = parseInt(m[1].slice(0, 2), 16)
  const g = parseInt(m[1].slice(2, 4), 16)
  const b = parseInt(m[1].slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
function openTgLink(href: string) {
  const wa = (window as any)?.Telegram?.WebApp
  if (wa?.openTelegramLink) wa.openTelegramLink(href)
  else window.open(href, '_blank', 'noopener,noreferrer')
}

/** Топбар как просил */
function TopBar({ title = 'эхо!' }: { title?: string }) {
  return (
    <div
      className="fixed top-0 z-50 w-full border-b-0 shadow-none bg-zinc-950"
      style={{ ['--topbar-h' as any]: '56px' }}
      role="banner"
      aria-label={title ? `Заголовок: ${title}` : 'Заголовок'}
    >
      <div className="pt-[max(var(--safe-top,0px),0px)]" />
      <div className="px-3 h-14 grid items-center" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
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

type MenuState =
  | { open: false }
  | { open: true; id: string; x: number; y: number }

export default function MiniMyPage() {
  const router = useRouter()
  const accent = useAccentColor()

  const [authChecked, setAuthChecked] = useState(false)
  const [isAuthed, setIsAuthed] = useState(false)
  const [items, setItems] = useState<MyItem[] | null>(null)
  const [error, setError] = useState<string>('')

  // контекстное меню (фиксированное, чтобы не обрезалось)
  const [menu, setMenu] = useState<MenuState>({ open: false })
  const [busyId, setBusyId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const money = useMemo(
    () =>
      new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 0,
      }),
    []
  )

  // закрытие меню по клику вне
  useEffect(() => {
    if (!menu.open) return
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return setMenu({ open: false })
      if (!menuRef.current.contains(e.target as Node)) setMenu({ open: false })
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menu])

  // 1) проверка входа
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

  // 2) редирект если не вошёл
  useEffect(() => {
    if (!authChecked) return
    if (!isAuthed) router.replace('/mini/profile')
  }, [authChecked, isAuthed, router])

  // 3) тянем мои объявления
  useEffect(() => {
    if (!authChecked || !isAuthed) return
    let alive = true
    setItems(null)
    setError('')
    ;(async () => {
      try {
        const r = await fetch('/api/my/list', { credentials: 'include', cache: 'no-store' })
        const j = await r.json()
        if (!alive) return
        if (!j?.ok) {
          setError(j?.error ?? 'Ошибка при загрузке объявлений')
          setItems([])
          return
        }
        setItems(j.items ?? [])
      } catch {
        if (!alive) return
        setError('Ошибка при загрузке объявлений')
        setItems([])
      }
    })()
    return () => {
      alive = false
    }
  }, [authChecked, isAuthed])

  // 4) действия меню
  function openMenuFor(e: React.MouseEvent, id: string) {
    setMenu({ open: true, id, x: e.clientX, y: e.clientY })
  }

  async function handleDelete(id: string) {
    if (busyId) return
    setBusyId(id)
    try {
      const r = await fetch('/api/my/delete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const j = await r.json()
      if (!j?.ok) throw new Error(j?.error || 'SERVER_ERROR')
      setItems((arr) => (arr ? arr.filter((x) => x.id !== id) : arr))
      setMenu({ open: false })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось удалить'
      try {
        ;(window as any)?.Telegram?.WebApp?.showAlert?.(msg)
      } catch {}
      if (!(window as any)?.Telegram?.WebApp) alert(msg)
    } finally {
      setBusyId(null)
    }
  }

  async function handleShare(id: string) {
    const url = new URL(`/mini/product/${id}`, window.location.origin).toString()
    try {
      await navigator.clipboard.writeText(url)
      ;(window as any)?.Telegram?.WebApp?.showAlert?.('Ссылка скопирована')
    } catch {
      prompt('Скопируйте ссылку', url)
    } finally {
      setMenu({ open: false })
    }
  }

  // 5) отрисовка
  let content: ReactNode = null

  if (!authChecked) {
    content = <div className="p-4 text-sm text-zinc-400">Проверяем вход…</div>
  } else if (!isAuthed) {
    content = null
  } else if (items === null) {
    content = <SkeletonGrid />
  } else if (items.length === 0) {
    content = (
      <div className="px-4 py-12 text-center space-y-4">
        <div className="text-base font-medium">У вас пока нет объявлений</div>
        <div className="text-sm text-zinc-400">Добавьте первое — это займёт минуту</div>

        <Link
          href="/mini/sell"
          className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold text-white transition border border-transparent"
          style={{
            background: accent,
            boxShadow: `0 6px 24px rgba(0,0,0,.25), 0 6px 24px ${shadowFromHex(accent,.35)}`
          }}
        >
          Продать вещь
        </Link>

        <SupportCard accent={accent} />
      </div>
    )
  } else {
    content = (
      <>
        <div className="px-3 grid grid-cols-2 gap-3 pt-3 pb-16">
          {items.map((p) => (
            <div key={p.id} className="relative">
              <Link href={`/mini/product/${p.id}`}>
                <ProductCardMini p={p} />
              </Link>

              {/* бейдж "на модерации" поверх карточки */}
              {p.status === 'pending' && (
                <span className="absolute left-2 top-2 inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                  на модерации
                </span>
              )}

              {/* кнопка ⋯ поверх карточки */}
              <button
                className="absolute right-2 top-2 h-8 w-8 grid place-items-center rounded-lg border border-zinc-800 bg-zinc-900/70 text-zinc-200"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  openMenuFor(e, p.id)
                }}
                aria-label="Действия"
              >
                ⋯
              </button>
            </div>
          ))}
        </div>

        {/* поддержка — на странице со списком тоже показываем, но ниже */}
        <div className="px-4 pb-24">
          <SupportCard accent={accent} />
        </div>
      </>
    )
  }

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <TopBar title="эхо!" />
      <main style={{ paddingTop: 'calc(var(--content-safe-top, 0px) + var(--topbar-h, 56px))' }}>
        {error && <div className="p-3 text-sm text-red-400">{error}</div>}
        {content}
      </main>

      {/* ФИКСИРОВАННОЕ МЕНЮ — поверх всего, не обрезается */}
      {menu.open && (
        <div
          className="fixed inset-0 z-[999]"
          onClick={() => setMenu({ open: false })}
          aria-hidden
        >
          <div
            ref={menuRef}
            className="fixed min-w-36 rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl"
            style={{
              top: Math.max(8, Math.min(menu.y + 8, window.innerHeight - 90)),
              left: Math.max(8, Math.min(menu.x - 140, window.innerWidth - 160)),
            }}
            onClick={(e) => e.stopPropagation()}
            role="menu"
          >
            <button
              className="block w-full text-left px-3 py-2 text-[13px] hover:bg-zinc-900"
              onClick={() => menu.open && handleShare((menu as any).id)}
            >
              Поделиться
            </button>
            <button
              className="block w-full text-left px-3 py-2 text-[13px] text-red-300 hover:bg-red-950/30 disabled:opacity-60"
              disabled={busyId === (menu as any).id}
              onClick={() => menu.open && handleDelete((menu as any).id)}
            >
              {busyId === (menu as any).id ? 'Удаляю…' : 'Удалить'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ===== Карточка поддержки с ссылкой на @your_support_bot_username ===== */
function SupportCard({ accent }: { accent: string }) {
  const handleSupport = () => {
    openTgLink('https://t.me/your_support_bot_username')
  }
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-zinc-800 bg-[#121212] p-4 text-left">
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg text-white"
          style={{ background: `${accent}1A`, border: `1px solid ${accent}33` }}
          aria-hidden
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 3l7 3v5c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-3Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8.5 12.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">Нужна помощь?</div>
          <p className="mt-1 text-xs text-zinc-400">
            Напишите в поддержку&nbsp;
            <button
              type="button"
              onClick={handleSupport}
              className="underline decoration-dotted underline-offset-2 hover:text-zinc-200"
              aria-label="Открыть поддержку в Telegram"
            >
              @your_support_bot_username
            </button>
            .
          </p>
          <button
            type="button"
            onClick={handleSupport}
            className="mt-2 rounded-xl px-3 py-1.5 text-xs font-medium text-white"
            style={{ background: accent }}
          >
            Написать в поддержку
          </button>
        </div>
      </div>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="px-3 grid grid-cols-2 gap-3 pt-3" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
          <div className="aspect-square bg-zinc-800/60" />
          <div className="p-3">
            <div className="h-3 w-4/5 rounded bg-zinc-800/60" />
            <div className="mt-2 h-3 w-2/5 rounded bg-zinc-800/60" />
          </div>
        </div>
      ))}
    </div>
  )
}
