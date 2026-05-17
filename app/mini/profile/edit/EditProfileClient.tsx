// app/mini/profile/edit/EditProfileClient.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Profile = {
  id: string
  username: string | null
  name: string | null
  city: string | null
  telegram_username: string | null
  bio: string | null
}

function sanitizeTg(v: string) {
  return v.trim().replace(/^@+/, '').replace(/\s+/g, '')
}

export default function EditProfileClient({ profile }: { profile: Profile }) {
  const router = useRouter()

  const [username, setUsername] = useState(profile.username ?? '')
  const [name, setName] = useState(profile.name ?? '')
  const [city, setCity] = useState(profile.city ?? '')
  const [telegram, setTelegram] = useState(profile.telegram_username ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')

  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(false)

  // валидация как в core
  const valid = useMemo(() => {
    const uOk = /^[a-z0-9_.]{3,20}$/i.test(username)
    const t = sanitizeTg(telegram)
    const tgOk = t === '' || /^[a-z0-9_]{3,32}$/i.test(t)
    return uOk && tgOk && name.trim().length > 0
  }, [username, telegram, name])

  const handleSave = async () => {
    if (!valid || loading) return
    setLoading(true)
    setError('')
    setOk('')

    try {
      const payload = {
        username: username.trim(),
        name: name.trim(),
        city: city.trim(),
        telegram_username: sanitizeTg(telegram),
        bio: bio.trim(),
      }

      const r = await fetch('/api/profile/update', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await r.json()
      if (!j?.ok) throw new Error(j?.error || 'Ошибка сохранения')

      setOk('Сохранено')
      setTimeout(() => router.replace('/mini/profile/me'), 600)
    } catch (e: any) {
      setError(e?.message || 'Ошибка сохранения')
    } finally {
      setLoading(false)
    }
  }

  // Шапка с safe-area
  const TopBar = (
    <div
      className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="h-14 px-4 flex items-center justify-between">
        <button
          onClick={() => router.replace('/mini/profile/me')}
          className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-sm"
        >
          Назад
        </button>
        <div className="text-[15px] font-semibold">Редактирование профиля</div>
        <div className="w-[76px]" aria-hidden />
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {TopBar}
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <div className="grid gap-4">
          <Field label="Имя пользователя">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none
                         focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </Field>

          <Field label="Имя">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none
                         focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </Field>

          <Field label="Город">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none
                         focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </Field>

          <Field label="Telegram">
            <div className="flex items-center gap-2">
              <span className="rounded-2xl border border-zinc-300 px-3 py-2.5 text-sm dark:border-zinc-700">@</span>
              <input
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none
                           focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
          </Field>

          <Field label="О себе">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full resize-y rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none
                         focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </Field>
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        {ok && <p className="mt-4 text-sm text-emerald-500">{ok}</p>}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={loading || !valid}
            className="rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition
                       hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {loading ? 'Сохранение…' : 'Сохранить'}
          </button>
          <button
            onClick={() => router.replace('/mini/profile/me')}
            className="rounded-2xl border border-zinc-300 px-5 py-2.5 text-sm transition hover:bg-zinc-100
                       dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Назад
          </button>
        </div>

        <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
      {children}
    </label>
  )
}
