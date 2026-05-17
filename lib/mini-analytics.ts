"use client";
/**
 * Tiny client‑side analytics for Next.js (App Router) + Telegram Mini App.
 *
 * Drop this file at `lib/mini-analytics.ts` and wire it in:
 * 1) Add <AnalyticsAutoTracker /> to both layouts:
 *    - app/(core)/layout.tsx
 *    - app/mini/layout.tsx
 * 2) (Optional) Call `track(...)` from UI actions (favorite, chat, purchase, etc.).
 *
 * It sends batched events via navigator.sendBeacon() (or fetch fallback)
 * to your existing API route `/api/track-tg` (present in your repo).
 * Server expects JSON: { events: EventPayload[], session_id, source, path, ref, ua, tz, tg_user_id?, supabase_user_id? }
 *
 * If your `/api/track-tg` expects a different shape, adjust `buildEnvelope()` once.
 */

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// -------------------- Types --------------------
export type EventPayload = {
  action: string;                   // e.g., 'page_view', 'view_item', 'search', 'favorite_add', 'chat_start', 'purchase', 'listing_created'
  entity_type?: string;             // e.g., 'listing','user','brand','category'
  entity_id?: string | number;      // ID of entity (string OK)
  properties?: Record<string, any>; // arbitrary details
  occurred_at?: string;             // ISO (defaults to now on server)
};

// -------------------- Config --------------------
const ENDPOINT = "/api/track-tg"; // you already have this route in the repo
const MAX_QUEUE = 20;               // batch size before auto‑flush
const FLUSH_MS = 4000;              // periodic flush window

// -------------------- Session utils --------------------
const LS_KEY = "mini.session_id";
function getSessionId(): string {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v) return v;
    const s = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    localStorage.setItem(LS_KEY, s);
    return s;
  } catch {
    // SSR or disabled storage
    return `${Date.now()}-${Math.random()}`;
  }
}

function isTelegramMini(): boolean {
  // Telegram WebApp present?
  // @ts-ignore
  return typeof window !== "undefined" && !!(window as any)?.Telegram?.WebApp;
}

function getTelegramUserId(): number | undefined {
  try {
    // @ts-ignore
    const tg = (window as any)?.Telegram?.WebApp;
    return tg?.initDataUnsafe?.user?.id;
  } catch {
    return undefined;
  }
}

function getSupabaseUserId(): string | undefined {
  try {
    // If you inject supabase user into window (optional). Otherwise leave undefined.
    // Example: (window as any).__sb_uid = "uuid";
    // @ts-ignore
    return (window as any)?.__sb_uid;
  } catch {
    return undefined;
  }
}

// -------------------- Queue & transport --------------------
let QUEUE: EventPayload[] = [];
let flushing = false;

function buildEnvelope(events: EventPayload[]) {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const ref = typeof document !== "undefined" ? (document.referrer || null) : null;
  const path = typeof location !== "undefined" ? location.pathname + location.search : "";

  return {
    events,
    session_id: getSessionId(),
    source: isTelegramMini() ? "mini" : "web",
    path,
    ref,
    ua,
    tz,
    tg_user_id: getTelegramUserId(),
    supabase_user_id: getSupabaseUserId(),
  };
}

async function sendNow(events: EventPayload[]) {
  if (!events.length) return;
  const body = JSON.stringify(buildEnvelope(events));
  try {
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const ok = navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      if (ok) return;
      // fall through to fetch if Beacon refused (e.g., CORS)
    }
  } catch {}

  // Fallback fetch
  try {
    await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      cache: "no-store",
    });
  } catch {
    // swallow network errors (fire‑and‑forget)
  }
}

function scheduleFlush() {
  if (flushing) return;
  flushing = true;
  setTimeout(async () => {
    const batch = QUEUE.slice();
    QUEUE = [];
    flushing = false;
    await sendNow(batch);
  }, FLUSH_MS);
}

export function track(action: string, payload: Omit<EventPayload, "action"> = {}) {
  const evt: EventPayload = { action, ...payload };
  QUEUE.push(evt);
  if (QUEUE.length >= MAX_QUEUE) {
    const batch = QUEUE.slice();
    QUEUE = [];
    sendNow(batch);
    return;
  }
  scheduleFlush();
}

// Hard flush on tab close / route change
if (typeof window !== "undefined") {
  const hardFlush = () => {
    if (!QUEUE.length) return;
    const batch = QUEUE.slice();
    QUEUE = [];
    try {
      const body = JSON.stringify(buildEnvelope(batch));
      if ("sendBeacon" in navigator) {
        navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      }
    } catch {}
  };
  window.addEventListener("pagehide", hardFlush);
  window.addEventListener("beforeunload", hardFlush);
}

// -------------------- React helpers --------------------
/**
 * Add to your layouts to auto‑track page_view and basic UTM.
 */
export function AnalyticsAutoTracker({ enabled = true }: { enabled?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPV = useRef<string>("");

  useEffect(() => {
    if (!enabled) return;
    const path = `${pathname}${searchParams?.toString() ? `?${searchParams!.toString()}` : ""}`;
    if (path === lastPV.current) return; // de‑dupe on quick rerenders
    lastPV.current = path;

    const utm: Record<string, string> = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) => {
      const v = searchParams?.get(k);
      if (v) utm[k] = v;
    });

    track("page_view", {
      properties: Object.keys(utm).length ? { utm } : undefined,
    });
  }, [enabled, pathname, searchParams]);

  return null;
}

// -------------------- Sugar helpers for common events --------------------
export const Analytics = {
  viewItem(listingId: string | number, extras: Record<string, any> = {}) {
    track("view_item", { entity_type: "listing", entity_id: String(listingId), properties: extras });
  },
  search(query: string, extras: Record<string, any> = {}) {
    track("search", { properties: { query, ...extras } });
  },
  favoriteAdd(listingId: string | number, extras: Record<string, any> = {}) {
    track("favorite_add", { entity_type: "listing", entity_id: String(listingId), properties: extras });
  },
  chatStart(withUserId: string | number, extras: Record<string, any> = {}) {
    track("chat_start", { entity_type: "user", entity_id: String(withUserId), properties: extras });
  },
  purchase(listingId: string | number, extras: Record<string, any> = {}) {
    track("purchase", { entity_type: "listing", entity_id: String(listingId), properties: extras });
  },
  listingCreated(listingId: string | number, extras: Record<string, any> = {}) {
    track("listing_created", { entity_type: "listing", entity_id: String(listingId), properties: extras });
  },
};

// -------------------- Minimal server payload example (FYI) --------------------
/**
 * On your /api/track-tg route (Edge/Node), read JSON and insert to Supabase:
 *
 * import { createClient } from "@supabase/supabase-js";
 * export async function POST(req: Request) {
 *   const body = await req.json();
 *   const { events, session_id, source, path, ref, ua, tz, tg_user_id, supabase_user_id } = body;
 *   const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
 *   const rows = events.map((e: EventPayload) => ({
 *     occurred_at: e.occurred_at ?? new Date().toISOString(),
 *     session_id,
 *     source,
 *     action: e.action,
 *     entity_type: e.entity_type ?? null,
 *     entity_id: e.entity_id?.toString() ?? null,
 *     properties: e.properties ?? {},
 *     context: { path, ref, tz, tg_user_id, supabase_user_id, ua },
 *   }));
 *   await supabase.from("analytics.app_events").insert(rows);
 *   return new Response(null, { status: 204 });
 * }
 */
