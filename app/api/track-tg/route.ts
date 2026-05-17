// app/api/track-tg/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { admin } from '@/lib/supabase-admin';

type EventPayload = {
  action: string;                     // 'page_view','view_item','search','favorite_add','chat_start','purchase','listing_created',...
  entity_type?: string;               // 'listing','user','brand','category'
  entity_id?: string | number | null;
  properties?: Record<string, any>;
  occurred_at?: string;               // ISO-строка (опционально)
};

type Envelope = {
  events?: EventPayload[];
  session_id?: string | null;
  source?: 'mini' | 'web' | string;
  path?: string | null;
  ref?: string | null;
  ua?: string | null;
  tz?: string | null;
  tg_user_id?: number | null;
  supabase_user_id?: string | null;
  // legacy
  product_id?: string | number;
  seller_id?: string | number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Envelope;
    const jar = await cookies();
    const tgPid = jar.get('tg_pid')?.value || null;

    // ---- 1) Back-compat: старый формат (клик из мини) ----
    if (body.product_id && body.seller_id) {
      await admin.from('tg_clicks').insert({
        product_id: body.product_id,
        seller_id: body.seller_id,
        buyer_id: tgPid, // как у тебя было
      });
      // Дополнительно дубль как событие (полезно для метрик):
      await admin.from('app_events').insert({
        occurred_at: new Date().toISOString(),
        session_id: body.session_id ?? null,
        source: body.source ?? 'mini',
        action: 'click_item',
        entity_type: 'listing',
        entity_id: String(body.product_id),
        properties: { seller_id: String(body.seller_id) },
        context: {
          tg_cookie_pid: tgPid,
          path: body.path ?? null,
          ref: body.ref ?? null,
          tz: body.tz ?? null,
          ua: body.ua ?? null,
          tg_user_id: body.tg_user_id ?? null,
          supabase_user_id: body.supabase_user_id ?? null,
        },
      });
      return NextResponse.json({ ok: true });
    }

    // ---- 2) Новый формат: батч событий ----
    const events = Array.isArray(body.events) ? body.events : [];
    if (events.length) {
      const rows = events.map((e) => ({
        occurred_at: e.occurred_at ?? new Date().toISOString(),
        session_id: body.session_id ?? null,
        source: body.source ?? 'mini',
        action: e.action,
        entity_type: e.entity_type ?? null,
        entity_id: e.entity_id != null ? String(e.entity_id) : null,
        properties: e.properties ?? {},
        context: {
          tg_cookie_pid: tgPid,
          path: body.path ?? null,
          ref: body.ref ?? null,
          tz: body.tz ?? null,
          ua: body.ua ?? null,
          tg_user_id: body.tg_user_id ?? null,
          supabase_user_id: body.supabase_user_id ?? null,
        },
      }));

      const { error } = await admin.from('app_events').insert(rows);
      if (error) throw error;

      return NextResponse.json({ ok: true });
    }

    // Если прилетело что-то непонятное — просто 204
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[track-tg] error', e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

