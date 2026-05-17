'use client'
import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase'

function StartThreadInner() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = getSupabaseBrowser()

  useEffect(() => {
    let canceled = false
    ;(async () => {
      const { data: session } = await supabase.auth.getSession()
      const user = session?.session?.user
      if (!user) {
        if (!canceled) router.replace('/auth')
        return
      }

      // достаём параметры (не падаем, если их нет)
      const productId = params.get('productId') || ''
      const sellerId = params.get('sellerId') || ''

      // TODO: здесь твоя логика старта переписки/создания треда
      // пока просто уводим на профиль продавца или товар
      if (productId) {
        router.replace(`/product/${productId}`)
      } else if (sellerId) {
        router.replace(`/u/${sellerId}`)
      } else {
        router.replace('/')
      }
    })()
    return () => {
      canceled = true
    }
  }, [params, router, supabase])

  return <div className="p-4 text-sm text-zinc-400">Готовим чат…</div>
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-zinc-400">Загружаем…</div>}>
      <StartThreadInner />
    </Suspense>
  )
}
