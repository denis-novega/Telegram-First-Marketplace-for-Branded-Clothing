// app/mini/profile/me/page.tsx
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { admin } from '@/lib/supabase-admin'
import ClientProfileScreen from './profile.client'
export const revalidate = 0
export const dynamic = 'force-dynamic'
export const fetchCache = 'default-no-store'

export default async function MiniProfileMePage() {
  const store = await cookies()
  const pid = store.get('tg_pid')?.value
  if (!pid) redirect('/mini/profile')

  const { data: profile, error: perr } = await admin
    .from('profiles')
    .select('id, username, name, city, telegram_username, telegram_photo_url, is_verified')
    .eq('id', pid)
    .maybeSingle()

  if (perr) throw perr
  if (!profile) notFound()

  const [productsCnt, likesCnt] = await Promise.all([
    admin.from('products').select('id', { count: 'exact', head: true }).eq('profile_id', pid),
    admin.rpc('count_product_likes_for_profile', { p_profile_id: pid }),
  ])

  let likesCount = likesCnt?.data as number | null
  if (likesCount == null) {
    const [a, b] = await Promise.all([
      admin.from('product_likes').select('id', { count: 'exact', head: true }).eq('liker_profile_id', pid),
      admin.from('product_likes').select('id', { count: 'exact', head: true }).eq('liker_user_id', pid),
    ])
    likesCount = Math.max(a.count ?? 0, b.count ?? 0)
  }

  return (
    <ClientProfileScreen
      profile={profile}
      // это "базовые" числа с сервера на случай, если /api/profile/stats недоступен
      stats={{ products: productsCnt.count ?? 0, likes: likesCount ?? 0 }}
    />
  )
}
