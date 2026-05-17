// lib/tg.ts
import crypto from 'node:crypto'

type TGUser = {
  id: number
  is_bot?: boolean
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
}

export type TGInit = {
  user?: TGUser
  query_id?: string
  auth_date?: string
  hash?: string
  [k: string]: any
}

/** Разбор сырой initData (querystring) в объект */
export function parseInitData(raw: string): TGInit {
  const params = new URLSearchParams(raw)
  const obj: Record<string, any> = {}
  for (const [k, v] of params.entries()) {
    if (k === 'user') {
      try { obj.user = JSON.parse(v) } catch { obj.user = undefined }
    } else {
      obj[k] = v
    }
  }
  return obj as TGInit
}

/**
 * Проверка подписи Mini App
 * Секрет = sha256(BOT_TOKEN)  ← ВАЖНО!
 * data_check_string = отсортированные key=value (без hash), соединённые \n
 * HMAC_SHA256(secret, data_check_string) сравниваем с hash (hex)
 */
export function verifyInitData(raw: string, botToken: string): boolean {
  if (!raw || !botToken) return false

  const params = new URLSearchParams(raw)
  const receivedHash = params.get('hash') || ''
  params.delete('hash')

  const entries: string[] = []
  ;[...params.keys()].sort().forEach((k) => {
    const values = params.getAll(k)
    values.forEach((v) => entries.push(`${k}=${v}`))
  })
  const dataCheckString = entries.join('\n')

  // ❗ Правильный секрет для Mini App
  const secret = crypto.createHash('sha256').update(botToken).digest()

  const computed = crypto
    .createHmac('sha256', secret)
    .update(dataCheckString)
    .digest('hex')

  // безопасное сравнение; если длины различаются — сразу false
  const a = Buffer.from(computed, 'hex')
  const b = Buffer.from(receivedHash, 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/** helper: достать profile_id из httpOnly cookie */
export function getProfileIdFromCookies(req: Request, cookieName = 'tg_pid'): string | null {
  const cookie = req.headers.get('cookie') || ''
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`))
  return m ? decodeURIComponent(m[1]) : null
}
