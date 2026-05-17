// components/mini/UserProfileView.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type MiniProfile = {
  id: string
  username: string | null
  name: string | null
  city: string | null
  telegram_username: string | null
  telegram_photo_url?: string | null
  is_verified?: boolean | null
}

export default function UserProfileView({
  profile,
  stats,
}: {
  profile: MiniProfile
  stats: { products: number; likes: number }
}) {
  const accent = useAccentColor()

  const displayName =
    profile.name?.trim() ||
    profile.username?.trim() ||
    (profile.telegram_username ? `@${profile.telegram_username}` : 'Без имени')

  const handleSupport = () => openTgLink('https://t.me/your_support_bot_username')

  return (
    <div className="px-4 py-5 space-y-6 text-zinc-100">
      {/* Шапка профиля */}
      <section className="rounded-2xl border border-zinc-800 bg-[#121212] p-4">
        <div className="flex items-center gap-4">
          <div
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full"
            style={{ boxShadow: `0 0 0 1px ${accent}33, 0 6px 18px ${shadowFromHex(accent, .25)}` }}
            aria-hidden
          >
            {profile.telegram_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.telegram_photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div
                className="grid h-full w-full place-items-center text-sm"
                style={{ background: `${accent}1A`, color: '#e5e7eb' }}
              >
                {initialsFrom(displayName)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="truncate font-medium">{displayName}</div>
              {profile.is_verified ? (
                <span
                  className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]"
                  style={{ borderColor: `${accent}66`, background: `${accent}1A`, color: '#a7f3d0' /* emerald-200-ish */ }}
                  title="Верифицированный продавец"
                >
                  ✓ проверен
                </span>
              ) : null}
            </div>

            <div className="truncate text-xs text-zinc-400">
              {profile.username
                ? `@${profile.username}`
                : profile.telegram_username
                ? `@${profile.telegram_username}`
                : '—'}
              {profile.city ? ` · ${profile.city}` : ''}
            </div>
          </div>
        </div>
      </section>

      {/* Статистика */}
      <section className="grid grid-cols-2 gap-3">
        <Link
          href="/mini/my"
          className="rounded-2xl border border-zinc-800 bg-[#121212] p-3 transition hover:bg-zinc-900/60"
        >
          <div className="text-[11px] text-zinc-400">Мои объявления</div>
          <div className="text-2xl font-semibold leading-tight">{stats.products}</div>
        </Link>

        <Link
          href="/mini/likes"
          className="rounded-2xl border border-zinc-800 bg-[#121212] p-3 transition hover:bg-zinc-900/60"
        >
          <div className="text-[11px] text-zinc-400">Лайкнутые</div>
          <div className="text-2xl font-semibold leading-tight">{stats.likes}</div>
        </Link>
      </section>

      {/* Действия */}
      <section className="grid grid-cols-2 gap-3">
        <Link
          href="/mini/sell"
          className="rounded-2xl text-center px-4 py-2 text-sm font-semibold text-white border border-transparent transition"
          style={{
            background: accent,
            boxShadow: `0 6px 24px rgba(0,0,0,.25), 0 6px 24px ${shadowFromHex(accent, .35)}`
          }}
        >
          Продать вещь
        </Link>
        <Link
          href="/mini/profile/edit"
          className="rounded-2xl text-center px-4 py-2 text-sm border border-zinc-700 bg-[#151515] transition hover:bg-zinc-900/60"
        >
          Редактировать
        </Link>
      </section>

      {/* Поддержка */}
      <section className="rounded-2xl border border-zinc-800 bg-[#121212] p-4">
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
              Напишите в поддержку{' '}
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
      </section>
    </div>
  )
}

/* ================= helpers ================= */
function useAccentColor() {
  const [c, setC] = useState('#3b82f6') // tailwind blue-500
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

function initialsFrom(name: string) {
  const parts = String(name).trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase() || '').join('')
}
