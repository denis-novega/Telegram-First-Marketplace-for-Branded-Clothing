// app/api/mini-link/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* ================== Supabase admin client (server-only) ================== */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

/* ================== base64url ================== */
function b64url(s: string) {
  // @ts-ignore
  const b64 = Buffer.from(s, 'utf8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}

/* ================== helpers ================== */
function makePayload(pid: string) {
  // payload ~ {"pid":"..."} — держим короче 64 байт
  const raw = JSON.stringify({ pid });
  return b64url(raw.slice(0, 60));
}

async function logClickSafe(row: {
  pid: string;
  bot: string;
  target: string;
  payload: string;
  ip?: string | null;
  ua?: string | null;
  referer?: string | null;
  country?: string | null;
}) {
  if (!supabase) return;
  try {
    await supabase.from('tg_outbound_clicks').insert({
      pid: row.pid,
      bot: row.bot,
      target: row.target,
      payload: row.payload,
      ip: row.ip ?? null,
      ua: row.ua ?? null,
      referer: row.referer ?? null,
      country: row.country ?? null,
    });
  } catch {
    // не блокируем редирект
  }
}

/* ================== handler ================== */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const pid = (url.searchParams.get('pid') || '').trim();

  // приоритет: ?bot=... → env TG_BOT_USERNAME → заглушка
  const bot = (
    url.searchParams.get('bot') ||
    process.env.TG_BOT_USERNAME ||
    'your_bot_username'
  ).trim();

  // простая валидация
  if (!pid) {
    const bad = NextResponse.json({ ok: false, error: 'bad_request', detail: 'missing pid' }, { status: 400 });
    bad.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    bad.headers.set('Pragma', 'no-cache');
    bad.headers.set('Expires', '0');
    return bad;
  }
  if (!/^[A-Za-z0-9_]{5,}$/.test(bot)) {
    const bad = NextResponse.json({ ok: false, error: 'bad_request', detail: 'invalid bot username' }, { status: 400 });
    bad.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    bad.headers.set('Pragma', 'no-cache');
    bad.headers.set('Expires', '0');
    return bad;
  }

  const payload = makePayload(pid);
  const target = `https://t.me/${encodeURIComponent(bot)}?startapp=${payload}`;

  // Мета из заголовков (IP/UA/Referer/страна CDN)
  const hdr = req.headers;
  const ip = hdr.get('x-forwarded-for')?.split(',')[0]?.trim() || hdr.get('x-real-ip') || null;
  const ua = hdr.get('user-agent') || null;
  const referer = hdr.get('referer') || null;
  const country = hdr.get('x-vercel-ip-country') || hdr.get('cf-ipcountry') || null;

  // Лог — неблокирующий
  logClickSafe({ pid, bot, target, payload, ip, ua, referer, country }).catch(() => {});

  const res = NextResponse.redirect(target, 302);
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  return res;
}
