'use client'

import type { ComponentType, ReactNode } from 'react'
import { useEffect, useMemo, Suspense } from 'react' // 👈 добавили Suspense
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Script from 'next/script'
import { init } from '@telegram-apps/sdk'
import { Home, Heart, Folder, User } from 'lucide-react'
import { AnalyticsAutoTracker } from '@/lib/mini-analytics' // автотрекинг

// ===== Heights (px) =====
const TOPBAR_H = 56
const TABS_H = 64

function getInitData(): string {
  const wa = typeof window !== 'undefined' ? (window as any)?.Telegram?.WebApp : undefined
  const fromWA = wa?.initData
  if (fromWA && fromWA.length > 0) return fromWA

  const hash = (typeof window !== 'undefined' ? window.location.hash : '') || ''
  if (hash.includes('tgWebAppData=')) {
    const sp = new URLSearchParams(hash.replace(/^#/, ''))
    const raw = sp.get('tgWebAppData')
    if (raw && raw.length > 0) return raw
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@telegram-apps/sdk')
    const lp = mod.retrieveLaunchParams?.()
    const raw = lp?.initDataRaw
    if (raw && raw.length > 0) return raw
  } catch {}
  return ''
}

function useTelegramInit() {
  useEffect(() => {
    const w = window as any
    const wa = w?.Telegram?.WebApp

    try { init() } catch {}

    try {
      const initData = getInitData()
      if (initData) {
        fetch('/api/tg-auth', {
          method: 'POST',
          headers: {
            'x-telegram-init-data': initData,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ init_data: initData }),
        }).catch(() => {})
      }
    } catch {}

    try {
      wa?.ready?.()
      wa?.setHeaderColor?.('secondary_bg_color')
      wa?.setBottomBarColor?.('secondary_bg_color')
      wa?.setBackgroundColor?.('#0b0b0c')

      const canFullscreen = !!wa?.requestFullscreen && !!wa?.isVersionAtLeast?.('8.0')
      if (canFullscreen) {
        wa.requestFullscreen?.().catch(() => wa?.expand?.())
      } else {
        wa?.expand?.()
      }

      const onFirstTap = () => {
        if (canFullscreen) wa?.requestFullscreen?.().catch(() => wa?.expand?.())
        else wa?.expand?.()
        window.removeEventListener('pointerdown', onFirstTap, true)
      }
      window.addEventListener('pointerdown', onFirstTap, true)

      const applyInsets = () => {
        const inset = (wa as any)?.contentSafeAreaInset ?? (wa as any)?.safeAreaInset
        const safe = (wa as any)?.safeAreaInset ?? {}
        const bottom = inset?.bottom ?? 0
        const contentTop = inset?.top ?? 0

        document.documentElement.style.setProperty('--safe-top', `${safe?.top ?? 0}px`)
        document.documentElement.style.setProperty('--safe-bottom', `${bottom}px`)
        document.documentElement.style.setProperty('--content-safe-top', `${contentTop}px`)
        document.documentElement.style.setProperty('--topbar-h', `${TOPBAR_H}px`)
        document.documentElement.style.setProperty('--bottombar-h', `${TABS_H}px`)
      }

      applyInsets()
      wa?.onEvent?.('safeAreaChanged', applyInsets)
      wa?.onEvent?.('contentSafeAreaChanged', applyInsets)

      return () => {
        window.removeEventListener('pointerdown', onFirstTap, true)
        wa?.offEvent?.('safeAreaChanged', applyInsets)
        wa?.offEvent?.('contentSafeAreaChanged', applyInsets)
      }
    } catch {}
  }, [])
}

// === TopBar: фиксированная шапка, единая формула высоты (safe + 56px) ===
function TopBar({ title = 'эхо!' }: { title?: string }) {
  const router = useRouter()

  const handleClose = () => {
    try {
      const wa = (window as any)?.Telegram?.WebApp
      if (wa?.close) return wa.close()
    } catch {}
    if (typeof window !== 'undefined' && window.history.length > 1) window.history.back()
    else router.push('/mini')
  }

  return (
    <div
      className="fixed inset-x-0 top-0 z-[100] backdrop-blur supports-[backdrop-filter]:bg-zinc-950/70 bg-zinc-950/90 border-b-0"
      style={{
        height:
          'calc(var(--safe-top, env(safe-area-inset-top, 0px)) + var(--topbar-h, 56px))',
        paddingTop: 'var(--safe-top, env(safe-area-inset-top, 0px))',
      }}
      role="banner"
      aria-label={title ? `Заголовок: ${title}` : 'Заголовок'}
    >
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

// === Bottom Bar (использует usePathname → оборачиваем в Suspense) ===
function BottomTabBarInner() {
  const pathname = usePathname()
  const active = useMemo(() => {
    if (pathname === '/mini' || pathname?.startsWith('/mini/product')) return 'feed'
    if (pathname?.startsWith('/mini/likes')) return 'likes'
    if (pathname?.startsWith('/mini/my')) return 'my'
    return 'profile'
  }, [pathname]) as 'feed' | 'likes' | 'my' | 'profile'

  const Item = ({
    href, label, isActive, icon: Icon,
  }: {
    href: string
    label: string
    isActive: boolean
    icon: ComponentType<{ size?: number; className?: string }>
  }) => (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 select-none active:scale-95 transition-transform ${
        isActive ? 'text-zinc-50' : 'text-zinc-400/80'
      }`}
      aria-current={isActive ? 'page' : undefined}
      role="tab"
    >
      <Icon size={22} aria-hidden />
      <span className={`text-[11px] ${isActive ? 'font-medium' : ''}`}>{label}</span>
    </Link>
  )

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] backdrop-blur supports-[backdrop-filter]:bg-zinc-950/70 bg-zinc-950/90 border-t border-zinc-800/60"
      style={{ paddingBottom: 'var(--safe-bottom, env(safe-area-inset-bottom, 0px))' }}
      role="tablist"
      aria-label="Нижняя навигация"
    >
      <div className="grid grid-cols-4 h-16 px-2">
        <Item href="/mini" label="Лента"   isActive={active === 'feed'}   icon={Home} />
        <Item href="/mini/likes" label="Лайки"   isActive={active === 'likes'}  icon={Heart} />
        <Item href="/mini/my" label="Мои"     isActive={active === 'my'}     icon={Folder} />
        <Item href="/mini/profile" label="Профиль" isActive={active === 'profile'} icon={User} />
      </div>
    </nav>
  )
}

function BottomTabBar() {
  return (
    <Suspense fallback={null}>
      <BottomTabBarInner />
    </Suspense>
  )
}

export default function MiniRootLayout({ children }: { children: ReactNode }) {
  useTelegramInit()

  return (
    <div
      className="min-h-dvh antialiased bg-[var(--tg-bg)] text-[var(--tg-text)]"
      style={{ overscrollBehavior: 'contain' }}
    >
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />

      {/* Верхняя шапка (fixed) */}
      <TopBar />

      {/* Контент: отталкиваемся РОВНО на высоту шапки */}
      <main
        id="content"
        className="px-0"
        style={{
          paddingTop:
            'calc(var(--safe-top, env(safe-area-inset-top, 0px)) + var(--topbar-h, 56px))',
          paddingBottom:
            'calc(var(--safe-bottom, env(safe-area-inset-bottom, 0px)) + var(--bottombar-h, 64px))',
        }}
      >
        {children}
      </main>

      {/* Авто-трекинг страниц и UTM (использует useSearchParams → оборачиваем в Suspense) */}
      <Suspense fallback={null}>
        <AnalyticsAutoTracker />
      </Suspense>

      {/* Нижняя навигация */}
      <BottomTabBar />
    </div>
  )
}
