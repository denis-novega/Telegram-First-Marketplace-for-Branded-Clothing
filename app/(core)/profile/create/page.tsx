'use client'

import { useState, useEffect, useMemo } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const supabase = getSupabaseBrowser()

function sanitizeTg(v: string) {
  return v.trim().replace(/^@+/, '').replace(/\s+/g, '')
}

// лениво грузим пикер ПВЗ (с картой)
const CdekPvzPicker = dynamic(() => import('@/components/CdekPvzPicker'), { ssr: false })

// Что храним в профиле как «доставка по умолчанию»
type DefaultDelivery =
  | null
  | {
      mode: 'PICKUP'
      carrier: 'CDEK'
      pvz_id: string
      pvz_name: string
      city: string
      address: string
      lat: number
      lon: number
    }

// Тип, который ожидает CdekPvzPicker в defaultValue (обязательные lat/lon)
type PvzDefault =
  | {
      code: string
      name: string
      address: string
      lat: number
      lon: number
    }
  | null

// Тип, который CdekPvzPicker пробрасывает в onChange — допускает null
type DeliveryValue = DefaultDelivery // = { ... } | null

export default function CreateProfilePage() {
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [telegram, setTelegram] = useState('')
  const [defaultDelivery, setDefaultDelivery] = useState<DefaultDelivery>(null)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const router = useRouter()

  const valid = useMemo(() => {
    const uOk = /^[a-z0-9_.]{3,20}$/i.test(username)
    const t = sanitizeTg(telegram)
    const tgOk = t === '' || /^[a-z0-9_]{3,32}$/i.test(t)
    return uOk && tgOk && name.trim().length > 0
  }, [username, telegram, name])

  useEffect(() => {
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth?.user
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle()

      if (data) router.replace('/profile/me')
    })()
  }, [router])

  const handleCreate = async () => {
    setLoading(true)
    setError('')

    const { data: auth, error: aerr } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user || aerr) {
      setError('Ошибка: не найден пользователь.')
      setLoading(false)
      return
    }

    const payload: any = {
      user_id: user.id,
      username: username.trim(),
      name: name.trim(),
      city: city.trim(),
      telegram_username: sanitizeTg(telegram),
    }

    if (defaultDelivery) {
      payload.default_delivery = defaultDelivery
    }

    const { error: insertErr } = await supabase.from('profiles').insert([payload])
    if (insertErr) {
      setError('Ошибка создания профиля: ' + insertErr.message)
      setLoading(false)
      return
    }

    router.replace('/profile/me')
  }

  // Сформировать defaultValue для пикера из нашего defaultDelivery
  const pickerDefault: PvzDefault =
    defaultDelivery
      ? {
          code: defaultDelivery.pvz_id,
          name: defaultDelivery.pvz_name,
          address: defaultDelivery.address,
          // lat/lon должны быть ОБЯЗАТЕЛЬНО number
          lat: Number(defaultDelivery.lat ?? 0),
          lon: Number(defaultDelivery.lon ?? 0),
        }
      : null

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="container mx-auto flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:p-8">
          <h1 className="text-center text-2xl font-semibold">Создание профиля</h1>
          <p className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Эти данные будут видны в вашем профиле.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Имя пользователя</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="owner_123"
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none
                           focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <p className="mt-1 text-xs text-zinc-500">Латиница/цифры/._, 3–20 символов.</p>
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Имя</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван"
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none
                           focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Город</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Москва"
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none
                           focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Telegram</label>
              <div className="flex items-center gap-2">
                <span className="rounded-2xl border border-zinc-300 px-3 py-2.5 text-sm dark:border-zinc-700">@</span>
                <input
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="username"
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none
                             focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
              <p className="mt-1 text-xs text-zinc-500">Только юзернейм без @ (по желанию, можно пустым).</p>
            </div>

            {/* ПВЗ СДЭК по умолчанию */}
            <div className="pt-2">
              <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-400">
                Пункт выдачи СДЭК (по умолчанию)
              </label>
              <div className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                <CdekPvzPicker
                  defaultCity={city || 'Москва'}
                  defaultValue={pickerDefault}
                  onChange={(v: DeliveryValue) => {
                    if (!v) {
                      setDefaultDelivery(null)
                      return
                    }
                    // если компонент уже возвращает city — берём его, иначе ставим текущий из формы
                    setDefaultDelivery({
                      ...v,
                      city: v.city || city.trim(),
                    })
                  }}
                />

                {defaultDelivery ? (
                  <div className="mt-3 rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                    <div className="font-medium">{defaultDelivery.pvz_name}</div>
                    <div className="text-zinc-500">{defaultDelivery.address}</div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-zinc-500">
                    Выберите ближайшее отделение/автомат СДЭК — это ускорит расчёт доставки в объявлениях.
                  </p>
                )}
              </div>
            </div>
          </div>

          {error && <p className="mt-4 text-center text-sm text-red-500">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={loading || !valid}
            className="mt-6 w-full rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white
                       transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {loading ? 'Создание…' : 'Создать профиль'}
          </button>
        </div>
      </div>
    </div>
  )
}
