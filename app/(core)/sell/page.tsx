'use client'

import { useRouter } from 'next/navigation'
import SellPageCore from '@/components/sell/SellPageCore'
import { getSupabaseBrowser } from '@/lib/supabase'

export default function CoreSellPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowser()

  return (
    <SellPageCore
      deps={{
        ensureAuthed: async () => {
          const { data } = await supabase.auth.getUser()
          if (!data?.user) router.replace('/auth')
        },
        submit: async (payload) => {
          // 👉 тут оставляешь свою прежнюю вставку в pending_products,
          // которую сейчас делает core-страница (через supabase из браузера)
          const { error } = await supabase.from('pending_products').insert({
            ...payload,
            // в core, как и раньше, записываешь user_id
            user_id: (await supabase.auth.getUser()).data.user?.id ?? null,
          })
          if (error) throw new Error(error.message)
          // при необходимости дернуть notify-прокси — как и раньше
          await fetch('/api/notify-pending', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ pending: payload }),
          }).catch(() => {})
        },
        onSuccessRedirect: (url) => router.replace(url),
      }}
    />
  )
}
