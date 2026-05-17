// lib/cdek.ts — версия для EDU (https://api.edu.cdek.ru)

let cachedToken: { access_token: string; expires_at: number } | null = null

function normalizeBase(url: string | undefined, fallback: string) {
  if (!url) return fallback
  const clean = url.replace(/\/+$/, '')
  return clean.endsWith('/v2') ? clean.slice(0, -3) : clean
}

const AUTH_BASE     = normalizeBase(process.env.CDEK_AUTH_BASE,     'https://api.edu.cdek.ru')
const API_BASE      = normalizeBase(process.env.CDEK_API_BASE,      'https://api.edu.cdek.ru')
const LOCATION_BASE = normalizeBase(process.env.CDEK_LOCATION_BASE, 'https://api.edu.cdek.ru')

const ACCOUNT = process.env.CDEK_ACCOUNT || ''
const SECURE  = process.env.CDEK_SECURE  || ''

export async function getCdekToken() {
  if (!ACCOUNT || !SECURE) {
    throw new Error('CDEK env is missing: CDEK_ACCOUNT or CDEK_SECURE')
  }

  const now = Date.now()
  if (cachedToken && cachedToken.expires_at > now + 5000) {
    return cachedToken.access_token
  }

  const url = `${AUTH_BASE}/v2/oauth/token?parameters`
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: ACCOUNT,
    client_secret: SECURE,
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`CDEK auth failed ${res.status}: ${text}`)
  }

  const data = await res.json()
  cachedToken = {
    access_token: data.access_token,
    expires_at: now + (data.expires_in ? data.expires_in * 1000 : 25 * 60 * 1000),
  }
  return cachedToken.access_token
}

type FetchOpts = {
  method?: 'GET' | 'POST'
  params?: Record<string, any>
  body?: any
  headers?: Record<string, string>
  baseOverride?: string
  noAuth?: boolean // если вдруг нужно явно без токена (обычно НЕ нужно)
}

export async function cdekFetch(path: string, opts: FetchOpts = {}) {
  const isLocation = path.startsWith('/v2/location/')
  const base = opts.baseOverride || (isLocation ? LOCATION_BASE : API_BASE)

  const sp = new URLSearchParams()
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v === undefined || v === null || v === '') continue
      sp.set(k, String(v))
    }
  }
  const url = `${base}${path}${sp.toString() ? `?${sp.toString()}` : ''}`

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(opts.headers || {}),
  }

  // В EDU кладём токен ВЕЗДЕ, включая /location/*
  if (!opts.noAuth) {
    const token = await getCdekToken()
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`CDEK API error ${res.status}: ${text}`)
  }

  return res.json()
}
