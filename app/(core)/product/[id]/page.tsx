// app/(core)/product/[id]/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode, type MouseEvent, type PointerEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase';
import LikeButtonProduct from '@/components/LikeButtonProduct';
import UserAvatar from '@/components/UserAvatar';

type Product = {
  id: string;
  title: string;
  brand?: string | null;
  price: number;
  images?: string[] | null;
  description?: string | null;

  user_id: string | null;
  profile_id?: string | null;
  created_at?: string;

  category?: 'clothing' | 'sneakers' | 'accessories' | null;
  gender?: 'men' | 'women' | 'unisex' | null;
  condition?: 'new' | 'like_new' | 'good' | 'fair' | null;

  apparel_size?: string | null;   // одежда
  shoe_size?: string | null;      // кроссовки
  size?: string | null;           // общий фоллбэк
};

type Profile = {
  id: string;
  user_id: string;
  username: string;
  name: string | null;
  city: string | null;
  avatar?: string | null;
  telegram_username?: string | null; // сохраняем без @, если возможно
  telegram_id?: string | null;       // не используется для перехода
  is_verified?: boolean | null;
};

const supabase = getSupabaseBrowser();

const labelGender: Record<NonNullable<Product['gender']>, string> = {
  men: 'Мужское',
  women: 'Женское',
  unisex: 'Унисекс',
};
const labelCategory: Record<NonNullable<Product['category']>, string> = {
  clothing: 'Одежда',
  sneakers: 'Кроссовки',
  accessories: 'Аксессуары',
};
const labelCondition: Record<NonNullable<Product['condition']>, string> = {
  new: 'Новое',
  like_new: 'Как новое',
  good: 'Хорошее',
  fair: 'Удовлетворительное',
};

/* ==================== helpers: Telegram (только username из profiles) ==================== */
function extractUsername(raw?: string | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();

  // t.me/username
  const mLink = s.match(/t\.me\/([A-Za-z0-9_]+)/i);
  if (mLink) return mLink[1];

  // tg://resolve?domain=username
  const mResolve = s.match(/resolve\?domain=([A-Za-z0-9_]+)/i);
  if (mResolve) return mResolve[1];

  // @username
  if (s.startsWith('@')) return s.slice(1);

  // чистый username без спецсимволов
  if (/^[A-Za-z0-9_]+$/.test(s)) return s;

  return null;
}

/* ==================== helpers: Size ==================== */
function firstNonEmpty(...vals: Array<string | null | undefined>) {
  for (const v of vals) {
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

/** Добавляет "(EU)" к числовым размерам кроссовок, если там нет собственного суффикса */
function fmtShoeSizeWithEU(val: string | null) {
  if (!val) return null;
  const hasSuffix = /\b(EU|US|UK)\b/i.test(val);
  if (hasSuffix) return val;
  const num = Number(val.replace(',', '.'));
  if (!Number.isNaN(num) && num >= 30 && num <= 50) return `${val} (EU)`;
  return val;
}

/** Унифицированное вычисление размера: apparel_size → shoe_size → size */
function computeDisplaySize(item: Product): string | null {
  const apparel = firstNonEmpty(item.apparel_size);
  const shoe = firstNonEmpty(item.shoe_size);
  const fallback = firstNonEmpty(item.size);

  if (apparel) return apparel;
  if (shoe) return fmtShoeSizeWithEU(shoe);
  if (fallback) {
    if (item.category === 'sneakers') return fmtShoeSizeWithEU(fallback);
    return fallback;
  }
  return null;
}

/* ====== accent from Telegram theme ====== */
function useAccentColor() {
  const [c, setC] = useState('#3b82f6'); // tailwind blue-500
  useEffect(() => {
    try {
      const wa = (window as any)?.Telegram?.WebApp;
      const t = wa?.themeParams || {};
      const v = t?.button_color || t?.hint_color || t?.link_color;
      if (typeof v === 'number') setC('#' + v.toString(16).padStart(6, '0'));
      else if (typeof v === 'string' && v) setC(v);
    } catch {}
  }, []);
  return c;
}

function shadowFromHex(hex: string, a = 0.35) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 'rgba(59,130,246,.35)';
  const r = parseInt(m[1].slice(0,2),16);
  const g = parseInt(m[1].slice(2,4),16);
  const b = parseInt(m[1].slice(4,6),16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function openTgLink(href: string) {
  const wa = (window as any)?.Telegram?.WebApp;
  if (wa?.openTelegramLink) wa.openTelegramLink(href);
  else window.open(href, '_blank', 'noopener,noreferrer');
}

/** Базовый URL товара (для шера/гаранта) */
function buildProductUrl(productId: string) {
  let origin = 'http://localhost:3000';
  try { origin = window.location.origin; } catch {}
  return `${origin}/mini/product/${productId}`;
}

/** Текст для гаранта */
function buildGarantMessage(productId: string, productTitle?: string) {
  const url = buildProductUrl(productId);
  const title = (productTitle || '').replace(/\s+/g, ' ').trim();
  const safeTitle = title || 'этот товар';
  return `Я заинтересован в безопасной сделке по этому товару: «${safeTitle}»\n${url}`;
}

/** Ссылка на пользователя Telegram с предзаполненным черновиком */
function buildTelegramUserDraftLink(username: string, text: string) {
  const web = `https://t.me/${encodeURIComponent(username)}?text=${encodeURIComponent(text)}`;
  const tg  = `tg://resolve?domain=${encodeURIComponent(username)}&text=${encodeURIComponent(text)}`;
  return { web, tg };
}

/* ==================== Галерея ==================== */
function Gallery({
  images,
  alt,
  overlay,
}: {
  images: string[];
  alt: string;
  overlay?: ReactNode;
}) {
  const safe = images?.length ? images : ['/file.svg'];
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);

  const prev = () => setIdx((p) => (p - 1 + safe.length) % safe.length);
  const next = () => setIdx((p) => (p + 1) % safe.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [safe.length]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <div className="relative select-none">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-[#131313] dark:border-zinc-800 dark:bg-[#131313]">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {safe.map((src, i) => (
            <button
              key={i}
              type="button"
              className="relative min-w-full"
              onClick={() => setOpen(true)}
              aria-label="Открыть полноэкранный просмотр"
            >
              <Image
                src={src}
                alt={`${alt} — фото ${i + 1}`}
                width={1600}
                height={1200}
                className="aspect-[4/3] w-full object-cover"
                sizes="(min-width: 768px) 50vw, 100vw"
                priority={i === 0}
              />
            </button>
          ))}
        </div>

        {overlay ? <div className="absolute right-3 top-3 z-10 flex gap-2">{overlay}</div> : null}

        {safe.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Предыдущее фото"
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-zinc-200/70 bg-[#131313]/80 px-3 py-2 backdrop-blur hover:bg-white dark:border-zinc-700/70 dark:bg-[#131313]/70"
            >
              ‹
            </button>
            <button
              onClick={next}
              aria-label="Следующее фото"
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-zinc-200/70 bg-[#131313]/80 px-3 py-2 backdrop-blur hover:bg-white dark:border-zinc-700/70 dark:bg-[#131313]/70"
            >
              ›
            </button>
          </>
        )}
      </div>

      {safe.length > 1 && (
        <div className="mt-2 flex justify-center gap-2">
          {safe.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Перейти к фото ${i + 1}`}
              className={[
                'h-1.5 w-1.5 rounded-full transition',
                i === idx ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-400/60 dark:bg-zinc-600',
              ].join(' ')}
            />
          ))}
        </div>
      )}

      {safe.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {safe.map((src, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={[
                'relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border',
                i === idx
                  ? 'border-indigo-500'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700',
              ].join(' ')}
              aria-label={`Открыть фото ${i + 1}`}
            >
              <Image src={src} alt="" fill className="object-cover" sizes="160px" />
            </button>
          ))}
        </div>
      )}

      {open && (
        <Lightbox
          images={safe}
          idx={idx}
          setIdx={setIdx}
          alt={alt}
          onClose={() => setOpen(false)}
          onPrev={prev}
          onNext={next}
        />
      )}
    </div>
  );
}

function Lightbox({
  images,
  idx,
  setIdx,
  alt,
  onClose,
  onPrev,
  onNext,
}: {
  images: string[];
  idx: number;
  setIdx: (n: number) => void;
  alt: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) setBox({ w: cr.width, h: cr.height });
    });
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);

  const [dragging, setDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef(0);
  const startTRef = useRef(0);
  const ptrIdRef = useRef<number | null>(null);

  const handlePointerDown = (e: PointerEvent) => {
    if ((e as any).button && (e as any).button !== 0) return;
    ptrIdRef.current = (e as any).pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture((e as any).pointerId);
    startYRef.current = e.clientY;
    startTRef.current = performance.now();
    setDragging(true);
  };
  const handlePointerMove = (e: PointerEvent) => {
    if (!dragging || (e as any).pointerId !== ptrIdRef.current) return;
    const dy = e.clientY - startYRef.current;
    setDragY(Math.max(0, dy));
  };
  const finishDrag = (e: PointerEvent) => {
    if ((e as any).pointerId === ptrIdRef.current) {
      (e.currentTarget as HTMLElement).releasePointerCapture((e as any).pointerId);
    }
    const dt = Math.max(1, performance.now() - startTRef.current);
    const speed = dragY / dt;
    const shouldClose = dragY > 120 || (dragY > 60 && speed > 0.8);
    setDragging(false);
    if (shouldClose) onClose();
    else setDragY(0);
  };

  const fit = (() => {
    const w = box.w;
    const h = box.h;
    const nw = nat?.w ?? 1600;
    const nh = nat?.h ?? 1200;
    if (!w || !h) return { w: 0, h: 0, left: 0, top: 0 };
    const scale = Math.min(w / nw, h / nh);
    const dw = nw * scale;
    const dh = nh * scale;
    return { w: dw, h: dh, left: (w - dw) / 2, top: (h - dh) / 2 };
  })();

  const bgAlphaBase = 0.9;
  const bgAlpha = Math.max(0, bgAlphaBase * (1 - Math.min(1, dragY / 300) * 0.6));
  const scale = 1 - Math.min(0.08, dragY / 1200);

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{ backgroundColor: `rgba(0,0,0,${bgAlpha})` }}
    >
      <div
        ref={viewerRef}
        className="relative h-full w-full"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        {images.length > 1 && (
          <>
            <button
              onClick={onPrev}
              aria-label="Предыдущее фото"
              className="absolute left-4 top-1/2 z-[110] -translate-y-1/2 rounded-full bg-[#131313]/15 px-3 py-2 text-white hover:bg-white/25"
            >
              ‹
            </button>
            <button
              onClick={onNext}
              aria-label="Следующее фото"
              className="absolute right-4 top-1/2 z-[110] -translate-y-1/2 rounded-full bg-[#131313]/15 px-3 py-2 text-white hover:bg-white/25"
            >
              ›
            </button>
          </>
        )}

        <div
          className="absolute"
          style={{
            width: `${fit.w}px`,
            height: `${fit.h}px`,
            left: `${fit.left}px`,
            top: `${fit.top}px`,
            transform: `translateY(${dragY}px) scale(${scale})`,
            transition: dragging ? 'none' : 'transform 200ms ease-out',
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Закрыть"
            className="absolute right-2 top-2 z-[120] rounded-full bg-black/45 px-3 py-2 text-white backdrop-blur hover:bg-black/60 md:right-3 md:top-3"
          >
            ✕
          </button>

          <Image
            src={images[idx]}
            alt={`${alt} — полноэкранное фото ${idx + 1}`}
            fill
            className="object-contain"
            sizes="100vw"
            priority
            onLoadingComplete={(img: HTMLImageElement) => {
              const nw = (img as any).naturalWidth ?? (img as any).naturalSize?.width ?? 1600;
              const nh = (img as any).naturalHeight ?? (img as any).naturalSize?.height ?? 1200;
              setNat({ w: nw, h: nh });
            }}
          />
        </div>

        {images.length > 1 && (
          <div className="pointer-events-none absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            {images.map((_, i) => (
              <span
                key={i}
                className={['h-1.5 w-1.5 rounded-full', i === idx ? 'bg-[#131313]' : 'bg-[#131313]/40'].join(' ')}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ==================== ShareButton ==================== */
// ✅ новый компонент: шэрим или копируем ссылку
function ShareButton({
  productId,
  title,
  priceText,
}: {
  productId: string;
  title: string;
  priceText?: string;
}) {
  const [copied, setCopied] = useState(false);

  const url = buildProductUrl(productId);
  const text = [title?.trim(), priceText ? `— ${priceText}` : null].filter(Boolean).join(' ');

  const onShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: title || 'Товар', text, url });
        return;
      }
    } catch {
      // если пользователь отменил — просто выходим без копирования
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // финальный запасной вариант
      prompt('Скопируйте ссылку:', url);
    }
  };

  return (
    <button
      type="button"
      onClick={onShare}
      className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-700/60 bg-[#1b1b1b]/80 text-zinc-200 backdrop-blur transition hover:bg-[#222]"
      aria-label="Поделиться"
      title={copied ? 'Ссылка скопирована' : 'Поделиться ссылкой'}
    >
      {/* иконка "share" */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M15 6.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M17 22.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8.9 10.9l5.9-3.3M9.1 13l6.1 3.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </button>
  );
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Product | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fmt = useMemo(
    () => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }),
    []
  );

  useEffect(() => {
    if (!id) return;

    (async () => {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      setMeId(auth?.user?.id ?? null);

      const { data: product, error: pErr } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (pErr || !product) {
        setItem(null);
        setOwner(null);
        setLoading(false);
        return;
      }
      setItem(product as Product);

      let fetchedOwner: Profile | null = null;
      if (product.user_id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', product.user_id)
          .maybeSingle();
        fetchedOwner = (prof || null) as Profile | null;
      } else if (product.profile_id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', product.profile_id)
          .maybeSingle();
        fetchedOwner = (prof || null) as Profile | null;
      }
      setOwner(fetchedOwner);

      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-screen-2xl px-4 py-10 md:px-6">
        <div className="h-60 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container mx-auto max-w-screen-2xl px-4 py-10 md:px-6">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-[#131313] p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-[#131313]">
          <h1 className="text-xl font-semibold">Объявление не найдено</h1>
          <Link
            href="/"
            className="mt-3 inline-flex rounded-2xl bg-zinc-900 px-4 py-2 text-white dark:bg-white dark:text-zinc-950"
          >
            На главную
          </Link>
        </div>
      </div>
    );
  }

  const price = fmt.format(item.price || 0);
  const isOwner = meId != null && item.user_id === meId;

  // ✅ единый источник истины для "Размер"
  const computedSize = computeDisplaySize(item);

  // ✅ username берём ТОЛЬКО из profiles.telegram_username
  const username = extractUsername(owner?.telegram_username ?? null);
  const mainHref = username ? `https://t.me/${encodeURIComponent(username)}` : null;

  const desc = (item.description ?? '').trim();

  return (
    <div className="container mx-auto max-w-screen-2xl px-4 py-8 md:px-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Фото/Галерея */}
        <Gallery
          images={item.images ?? []}
          alt={item.title}
          overlay={
            <>
              <LikeButtonProduct
                productId={item.id}
                ownerUserId={owner?.user_id || item.user_id || ''}
              />
              {/* ✅ кнопка «поделиться» поверх галереи */}
              <ShareButton productId={item.id} title={item.title} priceText={price} />
            </>
          }
        />

        {/* Детали */}
        <div className="space-y-5">
          {/* Заголовок/цена + дублирующая кнопка «поделиться» (на карточке) */}
          <div className="rounded-2xl border border-zinc-200 bg-[#131313] p-5 dark:border-zinc-800 dark:bg-[#131313]">
            <div className="flex items-start justify-between gap-3">
              <div>
                {item.brand && (
                  <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{item.brand}</p>
                )}
                <h1 className="mt-1 text-2xl font-semibold">{item.title}</h1>
                <div className="mt-3 text-xl font-bold">{price}</div>
              </div>
              {/* ✅ мини-иконка share рядом с заголовком */}
              <ShareButton productId={item.id} title={item.title} priceText={price} />
            </div>
          </div>

          {/* Продавец */}
          <div className="rounded-2xl border border-zinc-200 bg-[#131313] p-5 dark:border-zinc-800 dark:bg-[#131313]">
            <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Продавец</h2>

            {owner ? (
              <div className="mt-3 flex items-center gap-3">
                <UserAvatar
                  src={owner.avatar}
                  seed={owner.user_id || owner.username}
                  initialFrom={owner.username || owner.name || ''}
                  size={48}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/mini/u/${owner.username}`} className="truncate font-medium hover:underline">
                      @{owner.username}
                    </Link>
                    {owner.is_verified && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-2 py-0.5 text-[10px] text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                        ✔️ Верифицирован
                      </span>
                    )}
                  </div>
                  {owner.name && <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{owner.name}</p>}
                  {owner.city && <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{owner.city}</p>}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">Профиль продавца не найден.</p>
            )}

            {/* Контакты и безопасная сделка */}
            <SellerActions
              mainHref={mainHref}
              isOwner={isOwner}
              productId={item.id}
              ownerProfileId={owner?.id || null}
              productTitle={item.title}
            />
          </div>

          {/* Характеристики */}
          <div className="rounded-2xl border border-zinc-200 bg-[#131313] p-5 dark:border-zinc-800 dark:bg-[#131313]">
            <h2 className="mb-3 text-sm font-semibold text-zinc-600 dark:text-zinc-400">Характеристики</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm md:grid-cols-3 text-zinc-400">
              <Spec label="Категория" value={item.category ? labelCategory[item.category] : '—'} />
              <Spec label="Пол" value={item.gender ? labelGender[item.gender] : '—'} />
              <Spec label="Размер" value={computedSize || '—'} />
              <Spec label="Состояние" value={item.condition ? labelCondition[item.condition] : '—'} />
              <Spec label="Бренд" value={item.brand || '—'} />
            </div>
          </div>

          {/* Описание */}
          <div className="rounded-2xl border border-zinc-200 bg-[#131313] p-5 dark:border-zinc-800 dark:bg-[#131313]">
            <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Описание</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-zinc-300">
              {desc || '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-[#131313] px-3 py-2 dark:border-zinc-800 dark:bg-[#131313]">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-0.5 text-sm text-zinc-100">{value}</div>
    </div>
  );
}

/* ==================== SellerActions (draft в личку пользователю + трекинг) ==================== */
function SellerActions({
  mainHref,
  isOwner,
  productId,
  ownerProfileId,
  productTitle,
}: {
  mainHref: string | null;
  isOwner: boolean;
  productId: string;
  ownerProfileId: string | null;
  productTitle: string;
}) {
  const accent = useAccentColor();

  async function track(kind: 'seller' | 'garant') {
    try {
      await fetch('/api/track-tg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          product_id: productId,
          seller_id: ownerProfileId,
          kind,
        }),
      });
    } catch {}
  }

  const handleSellerClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    if (!mainHref) return;
    e.preventDefault();
    await track('seller');
    openTgLink(mainHref);
  };

  // ✅ ОБНОВЛЁННЫЙ обработчик безопасной сделки: открываем именно tg:// / https://t.me/
  const handleGarant = async () => {
    await track('garant');

    const text = buildGarantMessage(productId, productTitle);
    const { web, tg } = buildTelegramUserDraftLink('echo_garant', text);

    const wa = (window as any)?.Telegram?.WebApp;
    if (wa?.openTelegramLink) {
      try {
        wa.openTelegramLink(tg);
      } catch {
        wa.openTelegramLink(web);
      }
      return;
    }

    try {
      window.open(tg, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = web;
    }
  };

  return (
    <div className="mt-4 space-y-3">
      {/* Основная кнопка — продавцу */}
      {mainHref ? (
        <a
          href={mainHref}
          onClick={handleSellerClick}
          className="block w-full select-none rounded-2xl px-4 py-2.5 text-center text-sm font-semibold text-white transition focus:outline-none focus:ring-2"
          style={{
            background: accent,
            boxShadow: `0 6px 24px rgba(0,0,0,.25), 0 6px 24px ${shadowFromHex(accent, .35)}`
          }}
        >
          Написать в Telegram
        </a>
      ) : isOwner ? (
        <Link
          href="/profile/edit"
          className="block w-full select-none rounded-2xl border border-zinc-300 px-4 py-2 text-center text-sm transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Добавить публичный @username
        </Link>
      ) : (
        <span className="block text-xs text-zinc-500">
          Продавец не указал публичный @username — перейти в профиль нельзя
        </span>
      )}

      {/* Безопасная сделка — не показываем владельцу своего лота */}
      {!isOwner && (
        <div className="rounded-2xl border border-zinc-800 bg-[#141414] p-3">
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 grid h-8 w-8 place-items-center rounded-lg text-white"
              style={{ background: `${accent}1A`, border: `1px solid ${accent}33` }}
              aria-hidden
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 3l7 3v5c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-3Z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8.5 12.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Безопасная сделка</div>
              <p className="mt-1 text-xs text-zinc-400">
                Наш гарант @echo_garant. 0% комиссия. Оплата — через карту.
              </p>

              <button
                type="button"
                onClick={handleGarant}
                className="mt-2 rounded-xl px-3 py-1.5 text-xs font-medium text-white"
                style={{ background: accent }}
              >
                Начать безопасную сделку
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
