'use client'
import { useEffect, useState } from 'react'

export function useIsTWA() {
  const [is, setIs] = useState(false)
  useEffect(() => {
    const anyW = window as any
    const tg = anyW?.Telegram?.WebApp
    // плюс подстраховка по UA
    const ua = navigator.userAgent.toLowerCase()
    const guess = !!tg || ua.includes('telegram')
    setIs(guess)
    // если есть tg api — раскрываем webapp
    try { tg?.expand?.() } catch {}
  }, [])
  return is
}
