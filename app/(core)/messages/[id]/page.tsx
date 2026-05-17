// @ts-nocheck
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import ChatHeader from '@/components/ChatHeader'

type PageParams = { id: string }

// В Next 15 params — Promise
export default async function ChatPage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { id } = await params

  // createClient не принимает аргументы: он сам читает cookies() внутри
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    return notFound()
  }

  const { data: thread } = await supabase
    .from('message_threads')
    .select('*')
    .eq('id', id)
    .single()

  if (!thread) return notFound()

  const { data: product } = await supabase
    .from('products')
    .select('title, images')
    .eq('id', thread.product_id)
    .single()

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: true })

  return (
    <div className="p-4">
      {product && (
        <ChatHeader
          title={product.title}
          imageUrl={product.images?.[0] || '/placeholder.jpg'}
          productId={thread.product_id}
        />
      )}

      <div className="space-y-2 mb-4 mt-4">
        {messages?.map((msg) => (
          <div key={msg.id} className="bg-muted p-2 rounded text-sm">
            <span className="text-muted-foreground">{msg.user_id}</span><br />
            {msg.content}
          </div>
        ))}
      </div>

      <form action="/api/send-message" method="POST" className="flex gap-2">
        <input type="hidden" name="thread_id" value={thread.id} />
        <input
          name="message"
          placeholder="Сообщение..."
          className="flex-1 px-4 py-2 border rounded bg-background"
        />
        <button type="submit" className="px-4 py-2 bg-primary text-white rounded">
          Отправить
        </button>
      </form>
    </div>
  )
}
