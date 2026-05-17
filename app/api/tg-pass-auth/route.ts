// app/api/tg-pass-auth/route.ts
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { admin } from '@/lib/supabase-admin'

const COOKIE = 'tg_pid'
const SALT_ROUNDS = 10

type Body = {
  mode: 'signup' | 'login'
  telegram_id?: string // строкой
  password?: string
  name?: string        // опционально для signup
  username?: string    // опционально для signup
}

function jlog(level:'info'|'warn'|'error', msg:string, extra?:Record<string,any>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...(extra||{}) }))
}
const bad = (error: string, reqId: string, status=400) =>
  NextResponse.json({ ok:false, error, reqId }, { status })

function isGoodPassword(p?: string) { return !!p && p.length >= 6 }
function isGoodTgId(id?: string) { return !!id && /^\d{5,20}$/.test(id) }

export async function POST(req: Request) {
  const reqId = Math.random().toString(36).slice(2,10)
  try {
    if (!(req.headers.get('content-type')||'').includes('application/json'))
      return bad('BAD_CONTENT_TYPE', reqId, 415)

    const body = await req.json() as Body
    const mode = body?.mode
    const telegram_id = (body?.telegram_id || '').trim()
    const password = body?.password || ''
    const name = (body?.name || '').trim() || null
    const username = (body?.username || '').trim() || null

    if (mode !== 'signup' && mode !== 'login') return bad('BAD_MODE', reqId)
    if (!isGoodTgId(telegram_id)) return bad('BAD_TELEGRAM_ID', reqId)
    if (!isGoodPassword(password)) return bad('BAD_PASSWORD', reqId)

    if (mode === 'signup') {
      // есть ли локальная учётка?
      const { data: existsAuth, error: exErr } = await admin
        .from('local_auth_tg')
        .select('telegram_id')
        .eq('telegram_id', telegram_id)
        .maybeSingle()
      if (exErr) { jlog('error','tgpass:select_auth_fail',{reqId, exErr}); return bad('DB_ERROR', reqId, 500) }
      if (existsAuth?.telegram_id) return bad('USER_EXISTS', reqId, 409)

      // найдём/создадим профиль
      const { data: existingProfile, error: profErr } = await admin
        .from('profiles')
        .select('id, username, telegram_id')
        .eq('telegram_id', telegram_id)
        .maybeSingle()
      if (profErr) { jlog('error','tgpass:select_profile_fail',{reqId, profErr}); return bad('DB_ERROR', reqId, 500) }

      let profile_id = existingProfile?.id as string | undefined
      if (!profile_id) {
        const insertPayload: any = {
          username: username || `tg_${telegram_id}`,
          name: name || username || `tg_${telegram_id}`,
          telegram_id
        }
        const ins = await admin
          .from('profiles')
          .insert(insertPayload)
          .select('id')
          .single()
        if (ins.error) { jlog('error','tgpass:insert_profile_fail',{reqId, err:ins.error}); return bad('DB_PROFILE_INSERT', reqId, 500) }
        profile_id = ins.data!.id
      }

      const password_hash = await bcrypt.hash(password, SALT_ROUNDS)
      const insAuth = await admin
        .from('local_auth_tg')
        .insert({ telegram_id, password_hash, profile_id })
        .select('profile_id')
        .single()
      if (insAuth.error) { jlog('error','tgpass:insert_auth_fail',{reqId, err:insAuth.error}); return bad('DB_LOCAL_AUTH_INSERT', reqId, 500) }

      const res = NextResponse.json({ ok:true, profile_id, reqId })
      const maxAge = 60*60*24*30
      res.headers.append('Set-Cookie', `${COOKIE}=${encodeURIComponent(profile_id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Secure`)
      jlog('info','tgpass:signup_ok',{reqId, telegram_id, profile_id})
      return res
    }

    // LOGIN
    const { data: auth, error: authErr } = await admin
      .from('local_auth_tg')
      .select('password_hash, profile_id')
      .eq('telegram_id', telegram_id)
      .maybeSingle()
    if (authErr) { jlog('error','tgpass:select_auth_fail',{reqId, authErr}); return bad('DB_ERROR', reqId, 500) }
    if (!auth?.password_hash) return bad('NO_SUCH_USER', reqId, 404)

    const ok = await bcrypt.compare(password, auth.password_hash)
    if (!ok) return bad('BAD_CREDENTIALS', reqId, 401)

    const res = NextResponse.json({ ok:true, profile_id: auth.profile_id, reqId })
    const maxAge = 60*60*24*30
    res.headers.append('Set-Cookie', `${COOKIE}=${encodeURIComponent(auth.profile_id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Secure`)
    jlog('info','tgpass:login_ok',{reqId, telegram_id, profile_id: auth.profile_id})
    return res
  } catch (e:any) {
    jlog('error','tgpass:exception',{reqId, err:String(e?.message||e)})
    return NextResponse.json({ ok:false, error:'SERVER_ERROR', reqId }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok:true })
}
