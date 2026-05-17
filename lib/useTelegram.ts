'use client'

import { useMemo } from 'react'

export function useTelegram() {
  const wa = useMemo<any>(() => {
    if (typeof window !== 'undefined') {
      return (window as any)?.Telegram?.WebApp
    }
    return undefined
  }, [])

  return wa
}
