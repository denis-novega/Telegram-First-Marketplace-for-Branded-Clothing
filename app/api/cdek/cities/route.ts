// /app/api/cdek/cities/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cdekFetch } from '@/lib/cdek'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ items: [] })

  try {
    const data = await cdekFetch('/v2/location/cities', {
      params: {
        city: q,
        country_codes: 'RU',
        size: 20,
        page: 0,
      },
    })

    const arr = Array.isArray(data) ? data : data?.items || data || []
    const items = arr.map((c: any) => ({
      code: c.code,
      city: c.city,
      region: c.region,
      country_code: c.country_code,
      latitude: c.latitude,
      longitude: c.longitude,
    }))

    return NextResponse.json({ items })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'CDEK cities failed' }, { status: 500 })
  }
}
