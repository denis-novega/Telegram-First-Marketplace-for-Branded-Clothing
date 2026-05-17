import { NextResponse } from 'next/server'

// В проде здесь дергаем реальный API СДЭК (по городу/координатам).
// Пока — МОК, чтобы UI сразу ожил.

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Pvz = {
  id: string
  name: string
  city: string
  address: string
  lat: number
  lon: number
}

const MOCK: Record<string, Pvz[]> = {
  'москва': [
    { id: 'msk-1', name: 'СДЭК ПВЗ Тверская', city: 'Москва', address: 'ул. Тверская, 7', lat: 55.765, lon: 37.604 },
    { id: 'msk-2', name: 'СДЭК ПВЗ Арбат',    city: 'Москва', address: 'ул. Арбат, 23',    lat: 55.752, lon: 37.592 },
  ],
  'санкт-петербург': [
    { id: 'spb-1', name: 'СДЭК ПВЗ Невский',  city: 'Санкт-Петербург', address: 'Невский пр., 55', lat: 59.934, lon: 30.335 },
  ],
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const city = (searchParams.get('city') || '').trim().toLowerCase()
  if (!city) {
    return NextResponse.json({ ok: false, error: 'CITY_REQUIRED' }, { status: 400 })
  }
  // тут вместо MOCK — обращение к CDEK API и нормализация
  const list = MOCK[city] ?? []
  return NextResponse.json({ ok: true, items: list })
}
