'use client'

import { useEffect, useState } from 'react'

type Profile = {
  id: string
  username: string | null
  name: string | null
  city: string | null
  telegram_username: string | null
  telegram_photo_url?: string | null
}

export default function ProfileForm() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [tgUser, setTgUser] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch('/api/me/edit', { credentials: 'include', cache: 'no-store' })
        const j = await r.json()

        // Подстрахуемся на все случаи: неизвестный формат, пустой профиль, другие ключи
        const p: Partial<Profile> | null =
          j && j.ok && j.profile && typeof j.profile === 'object' ? j.profile : null

        const safe: Profile = {
          id: String(p?.id ?? ''),
          username: (p?.username ?? null) as string | null,
          name: (p?.name ?? null) as string | null,
          city: (p?.city ?? null) as string | null,
          telegram_username: (p?.telegram_username ?? null) as string | null,
          telegram_photo_url: (p?.telegram_photo_url ?? null) as string | null,
        }

        if (!alive) return

        // Даже если профиль пуст — ставим безопасные значения,
        // чтобы дальше нигде не было p.username без optional-chaining
        setProfile(safe)

        setUsername(safe.username ?? '')
        setName(safe.name ?? '')
        setCity(safe.city ?? '')
        setTgUser(safe.telegram_username ?? '')
      } catch {
        if (!alive) return
        // В фейле тоже не падаем: выставляем дефолты
        const safe: Profile = {
          id: '',
          username: null,
          name: null,
          city: null,
          telegram_username: null,
          telegram_photo_url: null,
        }
        setProfile(safe)
        setUsername('')
        setName('')
        setCity('')
        setTgUser('')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const save = async () => {
    setSaving(true)
    setMsg('')
    try {
      const r = await fetch('/api/profile/update', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username: username || null,
          name: name || null,
          city: city || null,
          telegram_username: tgUser ? tgUser.replace(/^@/, '') : null,
        }),
      })
      const j = await r.json()
      if (!j?.ok) setMsg(j?.error || 'Не удалось сохранить')
      else setMsg('Сохранено')
    } catch {
      setMsg('Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-4 text-sm text-zinc-400">Загрузка…</div>
  if (!profile) return <div className="p-4 text-sm text-zinc-400">Профиль не найден</div>

  return (
    <div className="px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-zinc-800 overflow-hidden">
          {profile.telegram_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.telegram_photo_url} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="text-base font-medium">Профиль</div>
      </div>

      <div className="space-y-3">
        <label className="block">
          <div className="text-xs text-zinc-400 mb-1">Ник (на сайте)</div>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-transparent px-3 py-2 text-sm outline-none"
            placeholder="например, sneakerhead77"
          />
        </label>

        <label className="block">
          <div className="text-xs text-zinc-400 mb-1">Имя</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-transparent px-3 py-2 text-sm outline-none"
            placeholder="как к вам обращаться"
          />
        </label>

        <label className="block">
          <div className="text-xs text-zinc-400 mb-1">Город</div>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-transparent px-3 py-2 text-sm outline-none"
            placeholder="Москва"
          />
        </label>

        <label className="block">
          <div className="text-xs text-zinc-400 mb-1">Telegram @username</div>
          <input
            value={tgUser}
            onChange={(e) => setTgUser(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-transparent px-3 py-2 text-sm outline-none"
            placeholder="@yourname"
          />
          <div className="mt-1 text-[11px] text-zinc-500">
            Используется для связи покупателя с вами
          </div>
        </label>
      </div>

      {msg ? <div className="text-sm text-zinc-300">{msg}</div> : null}

      <div className="pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center rounded-xl border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900 disabled:opacity-50"
        >
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}
