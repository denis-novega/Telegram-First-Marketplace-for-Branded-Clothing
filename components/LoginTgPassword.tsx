// components/LoginTgPassword.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

function guessTgId(): string {
  try {
    const wa = (window as any)?.Telegram?.WebApp
    const id = wa?.initDataUnsafe?.user?.id
    if (id) return String(id)
  } catch {}
  return ''
}

/** Берём акцент из Telegram themeParams, иначе — синий */
function useAccentColor() {
  return useMemo(() => {
    const wa = (typeof window !== 'undefined' ? (window as any)?.Telegram?.WebApp : undefined)
    const t = wa?.themeParams || {}
    const c = t.button_color || t.hint_color || t.link_color || '#3b82f6' // blue-500
    if (typeof c === 'number') return '#' + c.toString(16).padStart(6, '0')
    return String(c)
  }, [])
}

function toShadow(hex: string, a = 0.35) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return `rgba(59,130,246,${a})`
  const r = parseInt(m[1].slice(0, 2), 16)
  const g = parseInt(m[1].slice(2, 4), 16)
  const b = parseInt(m[1].slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

export default function LoginTgPassword() {
  const router = useRouter()
  const accent = useAccentColor()

  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [telegramId, setTelegramId] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string>('')
  const [showPass, setShowPass] = useState(false)
  const [idLocked, setIdLocked] = useState(true) // если подставили из WA — по умолчанию «только чтение»

  useEffect(() => {
    const id = guessTgId()
    setTelegramId(id)
    setIdLocked(!!id)
    try {
      const wa = (window as any)?.Telegram?.WebApp
      wa?.ready?.(); wa?.expand?.()
    } catch {}
  }, [])

  const submit = async () => {
    if (busy) return
    setErr('')
    setBusy(true)
    try {
      const r = await fetch('/api/tg-pass-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mode,
          telegram_id: telegramId.trim(),
          password,
          name: mode==='signup' ? name : undefined,
          username: mode==='signup' ? username : undefined,
        })
      })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.ok) {
        const msg = j?.error || `HTTP_${r.status}`
        const reqId = j?.reqId ? ` (reqId: ${j.reqId})` : ''
        setErr(`Ошибка: ${msg}${reqId}`)
        setBusy(false)
        return
      }
      router.replace('/mini/profile/me')
    } catch {
      setErr('Сеть недоступна. Попробуйте ещё раз.')
      setBusy(false)
    }
  }

  const canSubmit = /^\d{5,20}$/.test(telegramId.trim()) && password.length >= 6

  return (
    <div className="relative w-[min(92vw,560px)] mx-auto">
      {/* ауры */}
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
        style={{ background: `radial-gradient(600px 300px at 110% 120%, ${accent} 0%, transparent 55%)` }}
        aria-hidden
      />
      <style jsx global>{`
        @keyframes pulseBg { 0%,100% { transform: scale(1); opacity:.12 } 50% { transform: scale(1.06); opacity:.2 } }
        @keyframes rise { from { transform: translateY(10px); opacity:.0 } to { transform: translateY(0); opacity:1 } }
      `}</style>

      <div
        className="relative rounded-2xl border border-zinc-800 bg-[#0f0f10]/95 shadow-[0_10px_40px_rgba(0,0,0,.45)] p-5 sm:p-6"
        style={{ animation: 'rise .22s ease-out' }}
      >
        {/* заголовок */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 select-none">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: accent, boxShadow: `0 0 16px ${accent}` }}
              aria-hidden
            />
            <span className="text-zinc-300 tracking-wide text-xs uppercase">эхо!</span>
          </div>
          <div className="inline-flex rounded-xl border border-zinc-800 bg-[#171718] p-1">
            {(['login','signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                disabled={busy}
                className={[
                  'px-3 py-1.5 rounded-lg text-[13px] transition',
                  mode===m
                    ? 'text-white'
                    : 'text-zinc-400'
                ].join(' ')}
                style={mode===m ? {
                  background: '#1f1f21',
                  boxShadow: `inset 0 0 0 1px rgba(255,255,255,.06)`
                } : undefined}
                aria-pressed={mode===m}
              >
                {m==='login' ? 'Вход' : 'Регистрация'}
              </button>
            ))}
          </div>
        </div>

        {/* форма */}
        <form
          className="space-y-3"
          onSubmit={(e) => { e.preventDefault(); submit(); }}
        >
          {/* Telegram ID */}
          <div>
            <label className="text-xs text-zinc-400">Telegram ID</label>
            <div className="mt-1 relative">
              <input
                value={telegramId}
                onChange={(e)=>setTelegramId(e.target.value)}
                readOnly={busy || idLocked}
                className="w-full rounded-xl bg-[#151517] border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:ring-2"
                style={{ boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.2)',  }}
                placeholder="Напр. 123456789"
                inputMode="numeric"
                aria-describedby="tgid-help"
              />
              {idLocked && (
                <button
                  type="button"
                  onClick={() => setIdLocked(false)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-zinc-400 hover:text-zinc-200"
                >
                  изменить
                </button>
              )}
            </div>
            <div id="tgid-help" className="mt-1 text-[11px] text-zinc-500">
              {telegramId ? 'ID подставлен из Telegram Mini App' : 'Если не подставилось — введите вручную'}
            </div>
          </div>

          {/* signup extras */}
          {mode === 'signup' && (
            <>
              <div>
                <label className="text-xs text-zinc-400">Имя (необязательно)</label>
                <input
                  value={name}
                  onChange={(e)=>setName(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-[#151517] border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:ring-2"
                  placeholder="Иван"
                  disabled={busy}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Username (необязательно)</label>
                <input
                  value={username}
                  onChange={(e)=>setUsername(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-[#151517] border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:ring-2"
                  placeholder="tg_username"
                  disabled={busy}
                />
              </div>
            </>
          )}

          {/* password */}
          <div>
            <label className="text-xs text-zinc-400">Пароль (мин. 6 символов)</label>
            <div className="mt-1 relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                className="w-full rounded-xl bg-[#151517] border border-zinc-800 px-3 py-2.5 pr-16 text-sm text-zinc-100 outline-none focus:ring-2"
                placeholder="••••••••"
                disabled={busy}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass((v)=>!v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-zinc-400 hover:text-zinc-200"
                aria-label={showPass ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPass ? 'скрыть' : 'показать'}
              </button>
            </div>
          </div>

          {/* error */}
          {err && (
            <div className="text-xs text-yellow-300/95 bg-yellow-900/20 border border-yellow-800/40 px-3 py-2 rounded-xl">
              {err}
            </div>
          )}

          {/* submit */}
          <button
            type="submit"
            onClick={submit}
            disabled={busy || !canSubmit}
            className="w-full inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 focus:outline-none focus:ring-2"
            style={{
              background: accent,
              boxShadow: `0 6px 24px ${toShadow(accent, .45)}, inset 0 -2px 0 rgba(0,0,0,.25)`
            }}
            aria-label={mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          >
            {busy ? 'Отправляем…' : (mode === 'login' ? 'Войти' : 'Зарегистрироваться')}
          </button>
        </form>

        {/* мелкий копирайт/подсказка */}
        <p className="mt-3 text-[11px] text-zinc-500 text-center">
          Вход по Telegram ID. Данные пароля хранятся безопасно.
        </p>
      </div>
    </div>
  )
}
