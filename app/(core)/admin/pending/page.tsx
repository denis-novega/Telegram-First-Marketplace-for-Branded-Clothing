'use client'

import { useEffect, useState } from 'react'
import { getSupabaseBrowser, type BrowserSBClient } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

// типизированный клиент без кастов к SupabaseClient<...>
const supabase: BrowserSBClient = getSupabaseBrowser()

type PendingRow = Database['public']['Tables']['pending_products']['Row']
type PendingUpdate = Database['public']['Tables']['pending_products']['Update']

export default function PendingPage() {
  const [products, setProducts] = useState<PendingRow[]>([])
  const [loading, setLoading] = useState(false)

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('pending_products')
      .select('*')
      .eq('approved', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      return
    }
    setProducts(data ?? [])
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleApprove = async (id: string) => {
    setLoading(true)

    // Из-за бага вывода дженериков у update(...) в некоторых сборках SDK
    // TS видит параметр как `never`. Точечно приглушаем:
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore -- narrow to server schema manually
    await supabase
      .from('pending_products')
      .update({ approved: true } as PendingUpdate)
      .eq('id', id)

    await fetchProducts()
    setLoading(false)
  }

  const handleReject = async (id: string) => {
    setLoading(true)
    await supabase.from('pending_products').delete().eq('id', id)
    await fetchProducts()
    setLoading(false)
  }

  return (
    <div className="pt-20 p-6 text-white bg-black min-h-screen">
      <h1 className="text-2xl font-bold mb-6">⏳ Ожидающие модерации</h1>

      {products.length === 0 && <p className="text-gray-400">Нет товаров для модерации</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-zinc-900 rounded p-4 border border-zinc-700">
            {product.images?.[0] && (
              <img
                src={product.images[0]}
                alt={product.title}
                className="w-full h-60 object-cover mb-3 rounded"
              />
            )}
            <h2 className="text-xl font-bold">{product.title}</h2>
            <p className="text-sm text-zinc-400 mb-1">
              {product.brand} • {product.size} • {product.condition}
            </p>
            <p className="mb-2">{product.description}</p>
            <p className="text-red-400 font-bold mb-3">{product.price} ₽</p>

            <div className="flex gap-2">
              <button
                onClick={() => handleReject(product.id)}
                disabled={loading}
                className="bg-zinc-700 hover:bg-zinc-600 px-3 py-1 rounded"
              >
                ❌ Отклонить
              </button>
              <button
                onClick={() => handleApprove(product.id)}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded"
              >
                ✅ Одобрить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
