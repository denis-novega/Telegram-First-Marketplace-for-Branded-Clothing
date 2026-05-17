'use client'

import { Suspense } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase'
import { useSearchParams, useRouter } from 'next/navigation'

const supabase = getSupabaseBrowser()

function VerifyInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = (searchParams.get('email') || '').trim()

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [left, setLeft] = useState(0)
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  const token = useMemo(() => digits.join(''), [digits])

  useEffect(() => {
    inputsRef.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (!left) return
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [left])

  function onChangeDigit(i: number, v: string) {
    const val = v.replace(/\D/g, '').slice(0, 1)
    const next = [...digits]
    next[i] = val
    setDigits(next)
    if (val && i < 5) inputsRef.current[i + 1]?.focus()
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputsRef.current[i - 1]?.focus()
    if (e.key === 'ArrowLeft' && i > 0) inputsRef.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) inputsRef.current[i + 1]?.focus()
    if (e.key === 'Enter' && token.length === 6) handleVerify()
  }

  async function handleVerify(e?: React.FormEvent) {
    e?.preventDefault()
    if (!email || token.length !== 6) return

    setLoading(true)
    setErr(null)
    setOk(null)

    const { error } = await supabase.auth.verifyOtp({
      type: 'email',
      email,
      token,
    })

    setLoading(false)

    if (error) {
      setErr(error.message || 'Неверный код. Попробуй ещё раз.')
    } else {
      setOk('Успешно! Вход выполнен.')
      setTimeout(() => router.push('/profile/create'), 800)
    }
  }

  async function resend() {
    if (!email || left > 0 || loading) return
    setLoading(true)
    setErr(null)
    setOk(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })

    setLoading(false)

    if (error) {
      setErr(error.message || 'Не удалось отправить код.')
    } else {
      setLeft(60)
      setDigits(['', '', '', '', '', ''])
      inputsRef.current[0]?.focus()
    }
  }

  // фабрика безопасных ref-callback
  const setInputRef = (i: number) => (el: HTMLInputElement | null): void => {
    inputsRef.current[i] = el
  }

  if (!email) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:p-8">
          <h1 className="text-2xl font-semibold">Нужен email</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Перейди на страницу входа и введи email.
          </p>
          <a
            href="/auth"
            className="mt-5 inline-flex rounded-2xl bg-zinc-900 px-5 py-2.5 text-white dark:bg-white dark:text-zinc-950"
          >
            К странице входа
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:p-8">
        <h1 className="text-center text-2xl font-semibold tracking-tight">Подтверждение кода</h1>
        <p className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Отправили код на <span className="font-medium">{email}</span>
        </p>

        <form onSubmit={handleVerify} className="mt-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={setInputRef(i)} // безопасный ref
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={d}
                onChange={(e) => onChangeDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                className="h-12 w-12 rounded-xl border border-zinc-300 bg-white text-center text-xl outline-none
                           focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
              />
            ))}
          </div>

          {err && <p className="text-sm text-red-500">{err}</p>}
          {ok && <p className="text-sm text-green-500">{ok}</p>}

          <button
            type="submit"
            disabled={loading || token.length !== 6}
            className="w-full rounded-2xl bg-zinc-900 px-5 py-3 text-base font-medium text-white transition
                       hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {loading ? 'Проверяем…' : 'Подтвердить'}
          </button>

          <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
            <a
              href={`/auth?email=${encodeURIComponent(email)}`}
              className="underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-500"
            >
              Изменить email
            </a>
            <button
              type="button"
              onClick={resend}
              disabled={left > 0 || loading}
              className="underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-500 disabled:no-underline disabled:opacity-60"
            >
              {left > 0 ? `Отправить снова через ${left}с` : 'Отправить код ещё раз'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-zinc-400">Загружаем…</div>}>
      <VerifyInner />
    </Suspense>
  )
}

