'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginViaTelegram() {
  const router = useRouter()

  // Акцентный цвет, как раньше — из темы Telegram WebApp
  const accent = useMemo(() => {
    const wa =
      typeof window !== 'undefined'
        ? (window as any)?.Telegram?.WebApp
        : undefined

    const t = wa?.themeParams || {}
    const c = t?.button_color || t?.hint_color || t?.link_color || '#3b82f6'

    if (typeof c === 'number') return '#' + c.toString(16).padStart(6, '0')
    return String(c || '#3b82f6')
  }, [])

  // Состояние
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [tgId, setTgId] = useState<string | null>(null)
  const [initData, setInitData] = useState<string | null>(null)

  // Для UI — чтобы показать, кого авторизуем
  const [tgUsername, setTgUsername] = useState<string | null>(null)
  const [firstName, setFirstName] = useState<string | null>(null)
  const [lastName, setLastName] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  useEffect(() => {
    try {
      const wa = (window as any)?.Telegram?.WebApp
      wa?.ready?.()
      wa?.expand?.()

      if (wa?.initData) {
        setInitData(wa.initData)
      }

      const u = wa?.initDataUnsafe?.user
      if (u?.id) setTgId(String(u.id))
      if (u?.username) setTgUsername(String(u.username))
      if (u?.first_name) setFirstName(String(u.first_name))
      if (u?.last_name) setLastName(String(u.last_name))
      if (u?.photo_url) setPhotoUrl(String(u.photo_url))

      // Фолбэк только для локальной отладки:
      // ?tg=123&initData=... (initData всё равно должен быть валидным)
      if (!wa?.initData) {
        const sp = new URLSearchParams(location.search)
        const tg = sp.get('tg')
        const rawInitData = sp.get('initData')
        if (tg) setTgId(String(tg))
        if (rawInitData) setInitData(String(rawInitData))
      }
    } catch (e) {
      console.error('LoginViaTelegram: WebApp init failed', e)
    }
  }, [])

  const disabled = busy || !tgId || !initData

  async function handleSubmit() {
    if (disabled) return
    setBusy(true)
    setError('')

    try {
      const r = await fetch('/api/tg-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ initData }),
      })

      const j = await r.json().catch(() => null)

      if (!r.ok || !j?.ok) {
        setError(j?.error || `Ошибка ${r.status}`)
        setBusy(false)
        return
      }

      router.replace('/mini/profile/me')
    } catch (e) {
      console.error('LoginViaTelegram: network error', e)
      setError('Сеть недоступна. Попробуйте ещё раз.')
      setBusy(false)
    }
  }

  const toShadow = (hex: string, a = 0.45) => {
    const m = /^#([0-9a-f]{6})$/i.exec(hex)
    if (!m) return `rgba(59,130,246,${a})`
    const r = parseInt(m[1].slice(0, 2), 16)
    const g = parseInt(m[1].slice(2, 4), 16)
    const b = parseInt(m[1].slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }

  const displayName =
    [firstName, lastName].filter(Boolean).join(' ') ||
    (tgUsername ? `@${tgUsername}` : tgId ? `ID ${tgId}` : '')

  return (
    <div className="relative w-[min(92vw,560px)] mx-auto">
      {/* ауры в стиле welcome */}
      <style jsx global>{`
        @keyframes pulseBg {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.12;
          }
          50% {
            transform: scale(1.06);
            opacity: 0.2;
          }
        }
        @keyframes rise {
          from {
            transform: translateY(10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>

      <div
        className="pointer-events-none absolute -inset-24 blur-3xl opacity-90"
        style={{
          background: `radial-gradient(800px 400px at 50% -20%, ${accent} 0%, transparent 60%)`,
          animation: 'pulseBg 6s ease-in-out infinite',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -inset-10 blur-[72px] opacity-80"
        style={{
          background: `radial-gradient(600px 300px at 110% 120%, ${accent} 0%, transparent 55%)`,
        }}
        aria-hidden
      />

      <div
        className="relative rounded-2xl border border-zinc-800 bg-[#0f0f10]/95 shadow-[0_10px_40px_rgba(0,0,0,.45)] p-5 sm:p-6"
        style={{ animation: 'rise .22s ease-out' }}
      >
        {/* заголовок */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 select-none">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{
                background: accent,
                boxShadow: `0 0 16px ${accent}`,
              }}
              aria-hidden
            />
            <span className="text-zinc-300 tracking-wide text-xs uppercase">
              эхо!
            </span>
          </div>
        </div>

        {/* форма (по факту просто кнопка) */}
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          {/* статус Telegram */}
          <div className="rounded-xl border border-zinc-800 bg-[#151517] px-3 py-2.5 flex items-center gap-3">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={displayName || 'Telegram user'}
                className="h-9 w-9 rounded-full object-cover border border-zinc-700/60"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center text-[11px] text-zinc-400">
                tg
              </div>
            )}
            <div className="flex-1">
              <div className="text-xs text-zinc-400">Статус Telegram</div>
              <div className="mt-0.5 text-sm">
                {tgId && initData ? (
                  <span className="text-zinc-200">
                    {displayName
                      ? `Авторизуем: ${displayName}`
                      : 'Telegram пользователь определён'}
                  </span>
                ) : (
                  <span className="text-zinc-400">
                    Откройте мини-приложение из Telegram, чтобы авторизоваться
                    автоматически.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* сообщение об ошибке */}
          {error && (
            <div className="text-xs text-yellow-300/95 bg-yellow-900/20 border border-yellow-800/40 px-3 py-2 rounded-xl">
              {error}
            </div>
          )}

          {/* сабмит */}
          <button
            type="submit"
            disabled={disabled}
            className="w-full inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 focus:outline-none focus:ring-2"
            style={{
              background: accent,
              boxShadow: `0 6px 24px ${toShadow(
                accent
              )}, inset 0 -2px 0 rgba(0,0,0,.25)`,
            }}
          >
            {busy
              ? 'Авторизуем через Telegram…'
              : 'Продолжить через Telegram'}
          </button>

          <p className="mt-2 text-[11px] text-zinc-500 text-center">
            Авторизация происходит по данным Telegram Mini App. Пароль не
            требуется.
          </p>
        </form>
      </div>
    </div>
  )
}
