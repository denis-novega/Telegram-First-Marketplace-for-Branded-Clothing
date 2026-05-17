// components/ProductCardMini.tsx
'use client'

import Image from 'next/image'

export type MiniProduct = {
  id: string
  title: string
  price: number | null
  brand?: string | null
  images?: string[] | null
}

export default function ProductCardMini({ p }: { p?: MiniProduct | null }) {
  // skeleton
  if (!p) {
    return (
      <div className="animate-pulse rounded-2xl overflow-hidden border border-zinc-800/60 bg-[#232325]">
        <div className="aspect-square bg-zinc-800/60" />
        <div className="p-3">
          <div className="h-3 w-4/5 rounded bg-zinc-800/60" />
          <div className="mt-2 h-3 w-2/5 rounded bg-zinc-800/60" />
        </div>
      </div>
    )
  }

  const img   = (Array.isArray(p.images) && p.images[0]) ? p.images[0] : '/file.svg'
  const title = p.title || 'Без названия'
  const brand = p.brand || '—'
  const price = p.price != null ? `${p.price.toLocaleString('ru-RU')} ₽` : '—'

  return (
    // единая фигура
    <div className="group relative rounded-2xl overflow-hidden border border-zinc-800/60 bg-[#232325] active:scale-[.99] transition-transform">
      {/* верх: изображение */}
      <div className="relative aspect-square w-full bg-zinc-900">
        <Image
          src={img}
          alt={title}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          priority={false}
        />

        {/* strap (blur) снизу: title в одну строку с ... */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 py-0.5 backdrop-blur bg-black/30">
          <div className="truncate text-[12px] font-medium tracking-tight text-zinc-100">
            {title}
          </div>
        </div>
      </div>

      {/* низ: бренд над ценой, ровно 2px между ними, не прилипают к краям */}
      <div className="px-3 py-[3px]">
        <div className="truncate text-[10px] uppercase tracking-wide text-zinc-400">
          {brand}
        </div>
        <div className="mt-[1px] truncate text-[15px] font-medium text-zinc-100">
          {price}
        </div>
      </div>
    </div>
  )
}
