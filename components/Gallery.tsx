'use client'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

export function Gallery({
  images,
  alt,
  overlay,
}: {
  images: string[]
  alt: string
  overlay?: React.ReactNode // например LikeButton поверх
}) {
  const safe = images?.length ? images : ['/file.svg']
  const [idx, setIdx] = useState(0)
  const trackRef = useRef<HTMLDivElement | null>(null)

  const go = (n: number) => setIdx((p) => (n + safe.length) % safe.length)
  const prev = () => go(idx - 1)
  const next = () => go(idx + 1)

  // клавиши ← →
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx])

  return (
    <div className="relative select-none">
      {/* Слайды */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div
          ref={trackRef}
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {safe.map((src, i) => (
            <div key={i} className="relative min-w-full">
              <Image
                src={src}
                alt={`${alt} — фото ${i + 1}`}
                width={1600}
                height={1200}
                className="aspect-[4/3] w-full object-cover"
                sizes="(min-width: 768px) 50vw, 100vw"
                priority={i === 0}
              />
            </div>
          ))}
        </div>

        {/* overlay (лайк и т.д.) */}
        {overlay ? <div className="absolute right-3 top-3 z-10">{overlay}</div> : null}

        {/* Стрелки */}
        {safe.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Предыдущее фото"
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-zinc-200/70 bg-white/80 px-3 py-2 backdrop-blur hover:bg-white dark:border-zinc-700/70 dark:bg-zinc-900/70"
            >
              ‹
            </button>
            <button
              onClick={next}
              aria-label="Следующее фото"
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-zinc-200/70 bg-white/80 px-3 py-2 backdrop-blur hover:bg-white dark:border-zinc-700/70 dark:bg-zinc-900/70"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Точки */}
      {safe.length > 1 && (
        <div className="mt-2 flex justify-center gap-2">
          {safe.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Перейти к фото ${i + 1}`}
              className={[
                'h-1.5 w-1.5 rounded-full transition',
                i === idx ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-400/60 dark:bg-zinc-600',
              ].join(' ')}
            />
          ))}
        </div>
      )}

      {/* Миниатюры */}
      {safe.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {safe.map((src, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={[
                'relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border',
                i === idx
                  ? 'border-indigo-500'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700',
              ].join(' ')}
              aria-label={`Открыть фото ${i + 1}`}
            >
              <Image src={src} alt="" fill className="object-cover" sizes="160px" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
