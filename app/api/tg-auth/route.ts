// app/api/tg-auth/route.ts
// SAFE VERSION — Telegram Mini App auth (anti-replay, hardened cookies)

import { NextResponse } from 'next/server'
import { validate, parse } from '@telegram-apps/init-data-node'
import { admin } from '@/lib/supabase-admin'
import crypto from 'crypto'

export const runtime = 'nodejs'

/* ================== CONFIG ================== */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const COOKIE_NAME = '__Host-tg_pid'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
const INITDATA_TTL = 300 // 5 minutes
const REPLAY_TABLE = 'tg_initdata_replay' // small table in supabase

/* ================== HELPERS ================== */

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

function ensureUsername(
  current?: string | null,
  tgUsername?: string | null,
  telegram_id?: string
) {
  if (current && current.length >= 3) return current
  if (tgUsername && tgUsername.length >= 3) return tgUsername
  return telegram_id ? `tg_${telegram_id}` : `tg_${crypto.randomUUID().slice(0, 6)}`
}

/* ================== HANDLER ================== */

export async function POST(req: Request) {
  try {
    if (!BOT_TOKEN) {
      console.error('[tg-auth] BOT_TOKEN missing')
      return NextResponse.json({ ok: false }, { status: 500 })
    }

    if (!(req.headers.get('content-type') || '').includes('application/json')) {
      return NextResponse.json({ ok: false }, { status: 415 })
    }

    const { initData } = await req.json()

    if (!initData || typeof initData !== 'string' || initData.length < 20) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    /* ===== 1. Validate Telegram signature + TTL ===== */

    try {
      validate(initData, BOT_TOKEN, { expiresIn: INITDATA_TTL })
    } catch {
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    /* ===== 2. Anti-replay (hash + TTL) ===== */

    const ua = req.headers.get('user-agent') || 'unknown'
    const initHash = sha256(initData)
    const uaHash = sha256(ua)

    const { data: used } = await admin
      .from(REPLAY_TABLE)
      .select('id')
      .eq('hash', initHash)
      .maybeSingle()

    if (used) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    // store replay marker
    await admin.from(REPLAY_TABLE).insert({
      hash: initHash,
      ua_hash: uaHash,
      created_at: new Date().toISOString(),
    })

    /* ===== 3. Parse initData ===== */

    const parsed = parse(initData)
    const user = parsed.user

    if (!user?.id) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const telegram_id = String(user.id)
    const tg_username = user.username ?? null
    const first_name = user.firstName ?? null
    const last_name = user.lastName ?? null
    const photo_url = user.photoUrl ?? null

    const fullName =
      [first_name, last_name].filter(Boolean).join(' ').trim() || null

    /* ===== 4. Profile upsert ===== */

    const { data: existing } = await admin
      .from('profiles')
      .select('id, username')
      .eq('telegram_id', telegram_id)
      .maybeSingle()

    let profile_id = existing?.id
    const username = ensureUsername(existing?.username, tg_username, telegram_id)

    if (!profile_id) {
      const { data, error } = await admin
        .from('profiles')
        .insert({
          telegram_id,
          username,
          name: fullName || username,
          telegram_username: tg_username,
          telegram_first_name: first_name,
          telegram_last_name: last_name,
          telegram_photo_url: photo_url,
        })
        .select('id')
        .single()

      if (error || !data) {
        return NextResponse.json({ ok: false }, { status: 500 })
      }

      profile_id = data.id
    } else {
      await admin
        .from('profiles')
        .update({
          telegram_username: tg_username ?? undefined,
          telegram_first_name: first_name ?? undefined,
          telegram_last_name: last_name ?? undefined,
          telegram_photo_url: photo_url ?? undefined,
          username,
          ...(first_name ? { name: fullName } : {}),
        })
        .eq('id', profile_id)
    }

    /* ===== 5. Secure cookie ===== */

    const res = NextResponse.json({ ok: true })

    res.headers.append(
      'Set-Cookie',
      `${COOKIE_NAME}=${encodeURIComponent(profile_id)}; ` +
        `Path=/; Max-Age=${COOKIE_MAX_AGE}; ` +
        'HttpOnly; Secure; SameSite=Lax'
    )

    return res
  } catch (e) {
    console.error('[tg-auth] fatal', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

/* ===== Explicitly disable GET ===== */

export function GET() {
  return new NextResponse(null, { status: 405 })
}
