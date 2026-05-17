// app/api/logout/route.ts
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function delCookie(name: string, sameSite: 'Lax' | 'None' = 'Lax') {
  const parts = [
    `${name}=; Path=/`,
    `HttpOnly`,
    `Max-Age=0`,
    `Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    sameSite === 'None' ? `SameSite=None` : `SameSite=Lax`,
    `Secure`,
  ]
  return parts.join('; ')
}

function withClearCookies(res: NextResponse) {
  // учти оба имени, если ты менял
  res.headers.append('Set-Cookie', delCookie('tg_pid', 'Lax'))
  res.headers.append('Set-Cookie', delCookie('tg_pid', 'None'))
  res.headers.append('Set-Cookie', delCookie('tg_pid_v2', 'Lax'))
  res.headers.append('Set-Cookie', delCookie('tg_pid_v2', 'None'))
  res.headers.append('Set-Cookie', delCookie('sid', 'Lax'))
  res.headers.append('Set-Cookie', delCookie('sid', 'None'))
  return res
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const next = url.searchParams.get('next')
  if (next) {
    const res = NextResponse.redirect(new URL(next, url.origin))
    return withClearCookies(res)
  }
  return withClearCookies(NextResponse.json({ ok: true }))
}

export async function POST(req: Request) {
  return GET(req)
}
