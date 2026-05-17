// components/shells/MiniShell.tsx — Floating Glass Bottom Bar (Hyperliquid-ish, blue accent)
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'

export function MiniShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ''
  const base = '/mini'

  // Навигационные пункты
  const items = [
    { href: `${base}/`,        match: (p: string) => p === `${base}/`,        label: 'Лента',   icon: <IconHome /> },
    { href: `${base}/likes`,   match: (p: string) => p === `${base}/likes`,   label: 'Лайки',   icon: <IconHeart /> },
    { href: `${base}/sell`,    match: (p: string) => p === `${base}/sell`,    label: 'Продать', icon: <IconPlus /> },
    { href: `${base}/profile`, match: (p: string) => p.startsWith(`${base}/profile`) || p === `${base}/auth`, label: 'Профиль', icon: <IconUser /> },
  ]

  const activeIndex = Math.max(
    0,
    items.findIndex(it => it.match(pathname))
  )

  return (
    <>
      {/* Top bar (compact) */}
      <div className="px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-2 bg-zinc-950/70 backdrop-blur supports-[backdrop-filter]:backdrop-blur border-b border-zinc-900/60">
        <div className="flex items-center justify-between">
          <button
            onClick={() => (window as any).Telegram?.WebApp?.close?.()}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition"
          >
            Закрыть
          </button>
          <div className="font-medium tracking-wide text-zinc-100">эхо!</div>
          <span className="text-xl leading-none text-zinc-400">⋯</span>
        </div>
      </div>

      {/* Content area: большой нижний паддинг под плавающий бар */}
      <main className="px-0 pb-[calc(96px+env(safe-area-inset-bottom))]">
        {children}
      </main>

      {/* Floating rounded bottom bar */}
      <div
        className="
          pointer-events-none fixed inset-x-0 bottom-0 z-40
          pb-[calc(env(safe-area-inset-bottom)+8px)]
        "
      >
        <nav className="pointer-events-auto mx-auto w-[min(560px,94%)]">
          {/* Стеклянный контейнер */}
          <div
            className="
              relative rounded-3xl border border-white/10
              bg-zinc-950/70 backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-950/55
              shadow-[0_10px_40px_-10px_rgba(0,0,0,.6)]
              px-2 py-1.5
            "
          >
            {/* Синий подсвечивающийся индикатор под активным пунктом */}
            <div className="absolute inset-y-1 left-2 right-2 -z-10 overflow-hidden">
              <div
                className="
                  h-[44px] rounded-2xl
                  bg-gradient-to-b from-blue-500/25 to-blue-600/20
                  border border-blue-400/30
                  shadow-[0_0_24px_6px_rgba(37,99,235,.25)]
                  transition-transform duration-250 ease-out
                  will-change-transform
                "
                style={{
                  width: '25%',
                  transform: `translateX(${activeIndex * 100}%)`,
                }}
              />
            </div>

            {/* Верхний «блик» по всей ширине бара */}
            <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent blur-[1px]" />

            <ul className="grid grid-cols-4">
              {items.map((it, i) => {
                const active = i === activeIndex
                return (
                  <li key={it.href} className="px-1">
                    <Link
                      href={it.href}
                      className={`
                        group flex h-[52px] flex-col items-center justify-center gap-0.5
                        text-[11px] font-medium transition-colors
                        ${active ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'}
                      `}
                      aria-current={active ? 'page' : undefined}
                      aria-label={it.label}
                    >
                      <span
                        className={`
                          grid h-9 w-9 place-items-center rounded-2xl border
                          transition-all duration-200
                          ${active
                            ? 'border-blue-300/40 bg-blue-500/20 shadow-[0_0_20px_2px_rgba(37,99,235,.25)]'
                            : 'border-white/10 bg-white/5 group-hover:bg-white/10'}
                        `}
                      >
                        {it.icon}
                      </span>
                      {it.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </nav>
      </div>
    </>
  )
}

/* === Icons (чистый SVG, без внешних зависимостей) === */

function IconHome(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path d="M3 10.5 12 4l9 6.5V20a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2v-9.5Z"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconHeart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path d="M12 21s-7.5-4.35-9.33-9A5.5 5.5 0 0 1 12 6.67 5.5 5.5 0 0 1 21.33 12C19.5 16.65 12 21 12 21Z"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconPlus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path d="M12 5v14M5 12h14"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconUser(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
