// components/mini/getInitData.ts
export function getInitData(): string {
  // 1) стандартное место (Telegram WebApp)
  const wa =
    typeof window !== 'undefined'
      ? (window as any)?.Telegram?.WebApp
      : undefined
  const fromWA = wa?.initData
  if (fromWA && fromWA.length > 0) return fromWA

  // 2) некоторые клиенты кладут в hash (#tgWebAppData=...)
  const hash = (typeof window !== 'undefined' ? window.location.hash : '') || ''
  if (hash.includes('tgWebAppData=')) {
    const sp = new URLSearchParams(hash.replace(/^#/, ''))
    const raw = sp.get('tgWebAppData')
    if (raw && raw.length > 0) return raw
  }

  // 3) SDK (@telegram-apps/sdk) — initDataRaw
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@telegram-apps/sdk')
    const lp = mod.retrieveLaunchParams?.()
    const raw = lp?.initDataRaw
    if (raw && raw.length > 0) return raw
  } catch {
    // ignore — SDK может быть не установлен или выполняемся на сервере
  }

  return ''
}
