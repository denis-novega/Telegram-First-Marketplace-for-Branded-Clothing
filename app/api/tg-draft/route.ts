// app/api/tg-draft/route.ts
import { NextResponse } from 'next/server';

// Если хочешь логировать переходы в Supabase — раскомментируй:
// import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic'; // отключаем билд-тайм кеш
export const revalidate = 0;

function noCache(res: NextResponse) {
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');
  res.headers.set('Surrogate-Control', 'no-store');
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return res;
}

function sanitizeUsername(u: string | null): string {
  const def = 'echo_garant';
  if (!u) return def;
  const trimmed = u.trim().replace(/^@/, '');
  // Базовая валидация username: 5..32 латиница/цифры/_
  return /^[A-Za-z0-9_]{5,32}$/.test(trimmed) ? trimmed : def;
}

function clipDraft(t: string | null, addInvisible: boolean): string {
  const MAX = 4096; // лимит Telegram для сообщения (с запасом)
  let txt = (t ?? '').toString();
  if (txt.length > MAX) txt = txt.slice(0, MAX);
  if (addInvisible) txt += '\u200B'; // zero-width space ломает кеш драфта при идентичном тексте
  return txt;
}

function buildTgUrl(username: string, text: string, nonce: string): string {
  const base = `https://t.me/${encodeURIComponent(username)}`;
  const qs = `text=${encodeURIComponent(text)}&nonce=${encodeURIComponent(nonce)}`;
  return `${base}?${qs}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // входные параметры
    const username = sanitizeUsername(url.searchParams.get('u'));
    const rawText = url.searchParams.get('t');
    const addInvisible = url.searchParams.get('z') === '1';

    // опциональные идентификаторы для логов
    const productId = url.searchParams.get('pid');
    const sellerProfileId = url.searchParams.get('sid');

    // формируем драфт и целевой URL
    const draft = clipDraft(rawText, addInvisible);
    const nonce = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    const target = buildTgUrl(username, draft, nonce);

    // ====== (опционально) логирование в Supabase ======
    // Чтобы включить — раскомментируй импорт наверху и блок ниже,
    // добавь в .env серверные переменные:
    // SUPABASE_URL=...
    // SUPABASE_SERVICE_ROLE=...   (service_role key, хранить только на сервере!)
    //
    // try {
    //   const supabaseUrl = process.env.SUPABASE_URL!;
    //   const serviceRole = process.env.SUPABASE_SERVICE_ROLE!;
    //   if (supabaseUrl && serviceRole) {
    //     const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    //     const ua = req.headers.get('user-agent') || null;
    //     const ip = (req as any).ip || req.headers.get('x-forwarded-for') || null;
    //     await supabase.from('tg_draft_redirects').insert({
    //       username,
    //       product_id: productId,
    //       seller_profile_id: sellerProfileId,
    //       text_len: draft.length,
    //       user_agent: ua,
    //       ip_addr: ip,
    //     });
    //   }
    // } catch (e) {
    //   // не валим редирект, если логирование упало
    //   console.error('[tg-draft] supabase log error', e);
    // }

    // редирект с жёстким no-cache
    const res = NextResponse.redirect(target, 302);
    return noCache(res);
  } catch (e) {
    console.error('[tg-draft] error', e);
    const res = NextResponse.json({ error: 'bad_request' }, { status: 400 });
    return noCache(res);
  }
}
