import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'эхо! — MiniApp',
  description: 'Маркетплейс для перепродажи вещей (Telegram Mini App)',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
}
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // важное для корректных safe-area на iOS
}
