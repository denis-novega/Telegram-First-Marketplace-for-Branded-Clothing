// app/api/tg-webhook/route.ts
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ====== ENV (обязательные) ======
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const BOT_ISSUE_SECRET = process.env.BOT_ISSUE_SECRET!
const TG_WEBHOOK_SECRET = process.env.TG_WEBHOOK_SECRET!
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

// ====== CONSTANTS ======
const MAX_BODY_SIZE = 100_000 // 100 KB — с запасом, Telegram updates обычно < 50 KB
const TG_API_BASE = 'https://api.telegram.org'

// ====== helpers ======
type JSONish = Record<string, any>

const jlog = (
  lvl: 'info' | 'warn' | 'error' | 'debug',
  msg: string,
  extra?: JSONish
) => {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: lvl,
      msg,
      ...(extra || {}),
    })
  )
}

// ====== Telegram helpers ======
async function issueNonce(telegram_id: string) {
  const r = await fetch(`${BASE}/api/nonce/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bot-secret': BOT_ISSUE_SECRET,
    },
    cache: 'no-store',
    body: JSON.stringify({ telegram_id }),
    signal: AbortSignal.timeout(3000),
  })

  const j = (await r.json().catch(() => null)) as any
  if (!j?.ok || typeof j?.nonce !== 'string') {
    throw new Error('issueNonce_failed')
  }

  return j as { ok: true; nonce: string }
}

async function sendMessage(
  chat_id: number,
  text: string,
  reply_markup?: any
) {
  const r = await fetch(`${TG_API_BASE}/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      chat_id,
      text,
      reply_markup,
      parse_mode: 'HTML',
    }),
    signal: AbortSignal.timeout(3000),
  })

  const j = await r.json().catch(() => null)
  if (!j?.ok) {
    jlog('warn', 'tg:sendMessage_fail', { chat_id, err: j })
  }
}

// ====== HANDLER ======
export async function POST(req: Request) {
  // 1️⃣ SECRET CHECK — ДО ЧТЕНИЯ BODY
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  if (!secret || secret !== TG_WEBHOOK_SECRET) {
    // Всегда 204 → Telegram не будет ретраить
    return new Response(null, { status: 204 })
  }

  // 2️⃣ SIZE LIMIT — ДО req.json()
  const contentLength = Number(req.headers.get('content-length') || 0)
  if (!contentLength || contentLength > MAX_BODY_SIZE) {
    jlog('warn', 'tg-webhook:bad-size', { contentLength })
    return new Response(null, { status: 204 })
  }

  // 3️⃣ PARSE JSON (теперь безопасно)
  let upd: any
  try {
    upd = await req.json()
  } catch {
    return new Response(null, { status: 204 })
  }

  if (!upd || typeof upd !== 'object') {
    return new Response(null, { status: 204 })
  }

  // 4️⃣ MINIMAL SCHEMA EXTRACTION
  const msg = upd.message || upd.edited_message
  if (!msg) {
    return new Response(null, { status: 204 })
  }

  const fromId =
    typeof msg?.from?.id === 'number' ? msg.from.id : undefined
  const chatId =
    typeof msg?.chat?.id === 'number' ? msg.chat.id : undefined
  const text =
    typeof msg?.text === 'string' ? msg.text.trim() : undefined

  if (!fromId || !chatId || !text) {
    return new Response(null, { status: 204 })
  }

  // 5️⃣ BUSINESS LOGIC — /start
  if (text.startsWith('/start')) {
    try {
      const { nonce } = await issueNonce(String(fromId))

      const webappUrl = `${BASE}/mini?tgWebAppStartParam=${encodeURIComponent(
        nonce
      )}`

      const kb = {
        inline_keyboard: [
          [
            {
              text: 'Открыть EchoMarket',
              web_app: { url: webappUrl },
            },
          ],
        ],
      }

      await sendMessage(
        chatId,
        'Жми, чтобы войти в мини-приложение:',
        kb
      )

      jlog('info', 'tg-webhook:/start_sent', { chatId, fromId })
    } catch (e: any) {
      jlog('error', 'tg-webhook:/start_fail', {
        chatId,
        fromId,
        err: String(e?.message || e),
      })

      // fallback — не раскрываем деталей
      await sendMessage(
        chatId,
        'Не удалось войти. Попробуйте чуть позже.'
      )
    }
  }

  // 6️⃣ ВСЕГДА OK ДЛЯ TELEGRAM
  return new Response(null, { status: 204 })
}

// Healthcheck / manual ping
export async function GET() {
  return NextResponse.json({ ok: true })
}
