'use client'
import Image from 'next/image'
import { useTWA } from '@/providers/TWAProvider'

type P = {
  id: string
  title: string
  brand?: string | null
  price: number
  images?: string[] | null
}

export default function ProductCard({ p, fmt }: { p: P; fmt: Intl.NumberFormat }) {
  const isMini = useTWA()

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200/60 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className={`relative w-full overflow-hidden ${isMini ? 'aspect-square' : 'aspect-[4/3]'}`}>
        <Image
          src={(p.images && p.images[0]) || '/file.svg'}
          alt={p.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 33vw"
          priority={false}
        />
      </div>

      <div className={`${isMini ? 'p-3 space-y-1' : 'p-4 space-y-1.5'}`}>
        {p.brand ? (
          <p className={`${isMini ? 'text-[10px]' : 'text-xs'} uppercase tracking-wide text-zinc-500 dark:text-zinc-400`}>
            {p.brand}
          </p>
        ) : (
          <span className="block h-3" />
        )}

        <h3 className={`${isMini ? 'text-sm' : 'text-base'} font-medium line-clamp-1`}>{p.title}</h3>

        <div className={`${isMini ? 'text-[13px]' : 'text-sm'} font-semibold text-zinc-900 dark:text-zinc-100`}>
          {fmt.format(p.price || 0)}
        </div>
      </div>
    </article>
  )
}
