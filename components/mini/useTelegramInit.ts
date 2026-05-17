'use client'
import { useEffect } from 'react'
export function useTelegramInit() {
  useEffect(() => {
    const wa = (window as any)?.Telegram?.WebApp
    try { wa?.ready?.(); wa?.expand?.() } catch {}
  }, [])
}
