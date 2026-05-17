// app/api/nonce/issue/route.ts
// SAFE VERSION — rate-limited, single-active-nonce, hardened

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { admin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BOT_ISSUE_SECRET = process.env.BOT_ISSUE_SECRET!
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'your_bot_username'
const APP_BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

const NONCE_BYTES = 32                 // сильнее, чем было
const DEFAULT_TTL_SEC = 10 * 60        // 10 минут
const MAX_ACTIVE_NONCES = 1            // 🔥 ключевой момент

type J = Record<string, unknown>

function jlog(level: 'info' | 'warn' | 'error', msg: string, extra?: J) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...(extra || {}) }))
}

function mkReqId() {
  return crypto.randomBytes(10).toString('hex')
}

function randomNonce() {
  return crypto.randomBytes(NONCE_BYTES).toString('base64url')
}

function isValidTelegramId(id: string) {
  // Telegram user id — число, обычно 5–12 цифр
  return /^[0-9]{5,15}$/.test(id)
}

export async function POST(req: Request) {
  const reqId = mkReqId()

  try {
    // ===== auth =====
    const auth = req.headers.get('x-bot-secret') || ''
    if (!BOT_ISSUE_SECRET || auth !== BOT_ISSUE_SECRET) {
      jlog('warn', 'nonce-issue:forbidden', { reqId })
      return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 })
    }

    if (!(req.headers.get('content-type') || '').includes('application/json')) {
      return NextResponse.json({ ok: false, error: 'BAD_CONTENT_TYPE', reqId }, { status: 415 })
    }

    const body = (await req.json().catch(() => null)) as any
    const telegram_id = String(body?.telegram_id || '').trim()

    if (!telegram_id || !isValidTelegramId(telegram_id)) {
      jlog('warn', 'nonce-issue:bad_telegram_id', { reqId })
      return NextResponse.json({ ok: false, error: 'BAD_TELEGRAM_ID', reqId }, { status: 400 })
    }

    // ===== ensure single active nonce =====
    const nowIso = new Date().toISOString()

    // удаляем просроченные (необязательно, но полезно)
    await admin
      .from('login_nonces')
      .delete()
      .eq('telegram_id', telegram_id)
      .lt('expires_at', nowIso)

    // проверяем активные
    const { data: active } = await admin
      .from('login_nonces')
      .select('nonce')
      .eq('telegram_id', telegram_id)
      .is('used_at', null)
      .gt('expires_at', nowIso)
      .limit(MAX_ACTIVE_NONCES + 1)

    if (active && active.length >= MAX_ACTIVE_NONCES) {
      jlog('warn', 'nonce-issue:rate_limited', { reqId, telegram_id })
      return NextResponse.json(
        { ok: false, error: 'TOO_MANY_ACTIVE_NONCES', reqId },
        { status: 429 }
      )
    }

    // ===== create nonce =====
    const nonce = randomNonce()
    const ttlSec = Number(process.env.NONCE_TTL_SEC || DEFAULT_TTL_SEC)
    const expires_at = new Date(Date.now() + ttlSec * 1000).toISOString()

    const ins = await admin
      .from('login_nonces')
      .insert({
        nonce,
        telegram_id,
        expires_at,
      })
      .select('nonce')
      .single()

    if (ins.error) {
      jlog('error', 'nonce-issue:db_insert_fail', { reqId })
      return NextResponse.json({ ok: false, error: 'DB_INSERT', reqId }, { status: 500 })
    }

    // ===== links =====
    const deep_link = `https://t.me/${BOT_USERNAME}/app?startapp=${encodeURIComponent(nonce)}`
    const miniapp_link = `${APP_BASE}/mini?nonce=${encodeURIComponent(nonce)}`

    // ⚠️ nonce возвращаем, потому что tg-webhook его использует
    return NextResponse.json({
      ok: true,
      nonce,
      deep_link,
      miniapp_link,
      reqId,
    })
  } catch (e) {
    jlog('error', 'nonce-issue:exception', { reqId })
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR', reqId }, { status: 500 })
  }
}

export function GET() {
  return new NextResponse(null, { status: 405 })
}
