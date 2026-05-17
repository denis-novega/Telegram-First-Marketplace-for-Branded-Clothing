'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MiniSellSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    // Скроллим вверх, если пользователь пришёл со страницы с формой
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
  }, [])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
      <div className="max-w-md space-y-6">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-semibold">Объявление отправлено на модерацию</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Наши модераторы проверят объявление перед публикацией.
          Вы получите уведомление, когда оно появится.
        </p>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {/* В мини-приложении главная — это /mini */}
          <Link
            href="/mini"
            className="rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition dark:bg-white dark:text-zinc-950"
          >
            На главную
          </Link>

          {/* Удобно сразу перейти в “Мои объявления” */}
          <Link
            href="/mini/my"
            className="rounded-xl border border-zinc-300 px-6 py-2.5 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Мои объявления
          </Link>

          {/* И стандартная “назад”, если надо */}
          <button
            onClick={() => router.back()}
            className="rounded-xl border border-zinc-300 px-6 py-2.5 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Вернуться назад
          </button>
        </div>
      </div>
    </div>
  )
}
