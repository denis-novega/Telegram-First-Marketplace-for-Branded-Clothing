// /app/api/cdek/pvz/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cdekFetch } from '@/lib/cdek'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cityName = searchParams.get('city')?.trim()
  const cityCodeParam = searchParams.get('city_code')?.trim()

  try {
    let city_code = cityCodeParam ? Number(cityCodeParam) : undefined

    if (!city_code && cityName) {
      const cityRes = await cdekFetch('/v2/location/cities', {
        params: { city: cityName, country_codes: 'RU', size: 1, page: 0 },
      })
      const first = Array.isArray(cityRes) ? cityRes[0] : cityRes?.items?.[0]
      city_code = first?.code
    }

    if (!city_code) {
      return NextResponse.json({ error: 'city_code not found' }, { status: 400 })
    }

    const dp = await cdekFetch('/v2/deliverypoints', {
      params: { city_code, type: 'PVZ', size: 500 },
    })

    const arr = Array.isArray(dp) ? dp : dp?.items || dp || []

    // нормализуем + удаляем дубли по id
    const byId = new Map<string, any>()
    for (const raw of arr) {
      const id = String(raw.code || raw.uuid || raw.id || `${raw?.location?.latitude},${raw?.location?.longitude}`)
      const address = raw.location?.address || raw.address || ''
      const lat = raw.location?.latitude ?? raw.latitude
      const lon = raw.location?.longitude ?? raw.longitude

      // fallback для имени — если пусто
      const shortAddr = address.split(',').slice(0, 2).join(', ').trim()
      const name =
        raw.name?.trim() ||
        (raw.code ? `${raw.code}${shortAddr ? ', ' + shortAddr : ''}` : shortAddr || 'ПВЗ СДЭК')

      // пропускаем кривые точки без координат/адреса
      if (lat == null || lon == null || !address) continue

      byId.set(id, {
        id,
        name,
        address,
        lat,
        lon,
        work_time: raw.work_time,
        phone: raw.phone,
        is_cash: raw.have_cash,
        is_card: raw.have_cashless,
        is_example: raw.is_dressing_room,
      })
    }

    const items = Array.from(byId.values())
    return NextResponse.json({ items, city_code })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'CDEK pvz failed' }, { status: 500 })
  }
}
