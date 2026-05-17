// @ts-nocheck
// app/(core)/messages/page.tsx
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function MessagesPage() {
  // серверный supabase-клиент (cookies берутся внутри утилиты)
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Если не авторизован — редирект
  if (!user) {
    redirect('/auth')
  }

  const { data: threads } = await supabase
    .from('message_threads')
    .select('*')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Ваши диалоги</h1>
      <ul>
        {threads?.map((thread) => (
          <li key={thread.id}>
            <Link href={`/messages/${thread.id}`}>
              <div className="p-2 border mb-2 rounded hover:bg-neutral-800 transition">
                💬 Диалог по товару: {thread.product_id}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
