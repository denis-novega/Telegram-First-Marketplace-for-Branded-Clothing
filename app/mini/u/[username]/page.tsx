'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import ProductCardMini from '@/components/ProductCardMini'

type Profile = {
  id: string                // ← profile_id (UUID строки профиля)
  user_id: string           // ← auth.users.id (UUID пользователя)
  username: string
  name?: string | null
  city?: string | null
  bio?: string | null
  avatar_url?: string | null
  telegram_username?: string | null
  created_at?: string
}

type Product = {
  id: string
  title: string
  brand?: string | null
  price: number
  images?: string[] | null
  profile_id?: string       // ← ключ связи с Profile.id
  // Если у тебя другое имя поля, например owner_profile_id:
  // owner_profile_id?: string
}

export default function MiniUserPage() {
  const router = useRouter()
  const params = useParams()
  const username = (params?.username as string) || ''
  const supabase = createClientComponentClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!username) return
    let alive = true

    ;(async () => {
      try {
        setLoading(true)
        setNotFound(false)

        // 1) Получаем профиль по username
        const { data: prof, error: profError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .maybeSingle<Profile>()

        if (!alive) return

        if (profError || !prof) {
          console.error('profiles error:', profError)
          setNotFound(true)
          setLoading(false)
          return
        }

        setProfile(prof)

        // 2) Получаем товары по profile_id = prof.id
        const { data: products, error: productsError, count } = await supabase
          .from('products')
          // Если поле связи другое (например, owner_profile_id), поправь select и eq ниже
          .select('id, title, price, brand, images, profile_id', { count: 'exact' })
          .eq('profile_id', prof.id)
          // Если у тебя есть статус публикации — раскомментируй:
          // .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (productsError) {
          console.error('products error:', productsError)
        }

        // Небольшой лог для отладки
        console.log({
          page_username: username,
          prof_id: prof.id,
          prof_user_id: prof.user_id,
          products_count: count,
        })

        setItems(products || [])
      } catch (e) {
        console.error('Unexpected error:', e)
        setItems([])
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [username, supabase])

  if (loading) {
    return <div className="p-6 text-center text-zinc-400">Загрузка...</div>
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-[100svh] flex flex-col items-center justify-center text-zinc-400">
        <p className="text-lg font-medium mb-2">Профиль не найден</p>
        <p className="text-sm text-zinc-500 mb-4">@{username} отсутствует или скрыт</p>
        <button
          onClick={() => router.push('/mini')}
          className="rounded-xl border border-zinc-700 bg-[#232325]/70 px-4 py-2 text-sm text-zinc-100"
        >
          На главную
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-[100svh] bg-zinc-950 text-zinc-100">
      {/* ===== Header ===== */}
      <div className="flex flex-col items-center py-8">
        <div className="relative h-24 w-24 rounded-full overflow-hidden border border-zinc-800">
          <Image
            src={profile.avatar_url || '/default-avatar.png'}
            alt={profile.username}
            fill
            className="object-cover"
          />
        </div>

        <h1 className="mt-3 text-lg font-semibold">{profile.name || profile.username}</h1>
        <p className="text-sm text-zinc-400">@{profile.username}</p>

        {profile.city && (
          <p className="text-xs text-zinc-500 mt-1">{profile.city}</p>
        )}

        {profile.bio && (
          <p className="mt-3 px-6 text-center text-sm text-zinc-400">{profile.bio}</p>
        )}

        {profile.telegram_username && (
          <a
            href={`https://t.me/${profile.telegram_username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 rounded-xl border border-zinc-700 bg-[#232325]/70 px-4 py-2 text-sm text-zinc-100"
          >
            Написать в Telegram
          </a>
        )}
      </div>

      {/* ===== Products ===== */}
      <div className="px-3">
        <h2 className="text-[15px] font-semibold mb-3 text-zinc-300">
          Объявления
        </h2>

        {items.length === 0 ? (
          <div className="text-sm text-zinc-500 text-center py-10">
            Пока нет активных объявлений
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-20">
            {items.map((p) => (
              <Link key={p.id} href={`/mini/product/${p.id}`} className="block">
                <ProductCardMini p={p} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
