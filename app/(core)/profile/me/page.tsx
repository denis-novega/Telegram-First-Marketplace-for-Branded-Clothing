'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabase';
import LikeButtonProduct from '@/components/LikeButtonProduct';
import LikeButtonProfile from '@/components/LikeButtonProfile';
import AdminVerifyToggle from '@/components/AdminVerifyToggle';
import UserAvatar from '@/components/UserAvatar';

type Profile = {
  id: string;
  user_id: string;
  username: string;
  name: string | null;
  city: string | null;
  avatar?: string | null;
  created_at: string;
  bio?: string | null;
  is_verified?: boolean | null;
};

type Product = {
  id: string;
  title: string;
  brand?: string | null;
  price: number;
  images?: string[] | null;
  created_at?: string;
  user_id?: string;
};

const supabase = getSupabaseBrowser();

export default function ProfileMePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Product[]>([]);
  const [likesCount, setLikesCount] = useState<number>(0);

  const [likedProductIds, setLikedProductIds] = useState<string[]>([]);
  const [likedProducts, setLikedProducts] = useState<Product[]>([]);
  const [likedProfileIds, setLikedProfileIds] = useState<string[]>([]);
  const [likedProfiles, setLikedProfiles] = useState<Profile[]>([]);

  const [tab, setTab] = useState<'listings' | 'liked_products' | 'liked_profiles'>('listings');
  const [loading, setLoading] = useState(true);

  const fmt = useMemo(
    () => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }),
    []
  );

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        setLoading(false);
        return;
      }

      // профиль
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profErr) console.warn('profiles error', profErr);
      if (!prof) {
        setLoading(false);
        return;
      }

      const p = prof as Profile;
      setProfile(p);

      // счётчик лайков профиля
      const { count: profLikesCount, error: plcErr } = await supabase
        .from('profile_likes')
        .select('profile_id', { count: 'exact', head: true })
        .eq('profile_id', p.id);
      if (plcErr) console.warn('profile_likes count error', plcErr);
      setLikesCount(profLikesCount ?? 0);

      // мои объявления
      const { data: products, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (prodErr) console.warn('products error', prodErr);
      setItems((products || []) as Product[]);

      // мои лайки на товары → ids
      const { data: pl, error: plErr } = await supabase
        .from('product_likes')
        .select('product_id')
        .eq('liker_user_id', user.id);
      if (plErr) console.warn('product_likes error', plErr);
      const pids = (pl || []).map((r: any) => r.product_id as string);
      setLikedProductIds(pids);

      // если есть ids → подгрузим продукты
      if (pids.length > 0) {
        const { data: lp, error: lpErr } = await supabase
          .from('products')
          .select('*')
          .in('id', pids)
          .order('created_at', { ascending: false });
        if (lpErr) console.warn('liked products fetch error', lpErr);
        setLikedProducts((lp || []) as Product[]);
      } else {
        setLikedProducts([]);
      }

      // мои лайки на профили → ids
      const { data: ppl, error: pplErr } = await supabase
        .from('profile_likes')
        .select('profile_id')
        .eq('liker_user_id', user.id);
      if (pplErr) console.warn('profile_likes (mine) error', pplErr);
      const pfids = (ppl || []).map((r: any) => r.profile_id as string);
      setLikedProfileIds(pfids);

      // если есть ids → подгрузим профили
      if (pfids.length > 0) {
        const { data: lpf, error: lpfErr } = await supabase
          .from('profiles')
          .select('*')
          .in('id', pfids);
        if (lpfErr) console.warn('liked profiles fetch error', lpfErr);
        setLikedProfiles((lpf || []) as Profile[]);
      } else {
        setLikedProfiles([]);
      }

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto max-w-screen-2xl px-4 py-10 md:px-6">
        <SkeletonHeader />
        <div className="mt-8">
          <SkeletonGrid />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto max-w-screen-2xl px-4 py-10 text-center md:px-6">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:p-8">
          <h1 className="text-2xl font-semibold">Профиль не найден</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Заверши создание профиля, чтобы продолжить.
          </p>
          <Link
            href="/profile/create"
            className="mt-5 inline-flex rounded-2xl bg-zinc-900 px-5 py-2.5 text-white dark:bg-white dark:text-zinc-950"
          >
            Создать профиль
          </Link>
        </div>
      </div>
    );
  }

  const joined = new Date(profile.created_at);

  return (
    <div className="container mx-auto max-w-screen-2xl px-4 py-8 md:px-6">
      {/* шапка профиля */}
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative h-28 w-full bg-gradient-to-r from-zinc-100 to-white dark:from-zinc-900 dark:to-zinc-950 md:h-36" />

        <div className="px-4 pb-5 md:px-6">
          <div className="-mt-10 flex items-end gap-4 md:-mt-12">
            {/* адаптивный UserAvatar */}
            <div className="relative">
              <div className="md:hidden">
                <UserAvatar
                  src={profile.avatar}
                  seed={profile.user_id || profile.username}
                  initialFrom={profile.username || profile.name}
                  size={80}
                  className="rounded-full ring-4 ring-white shadow-sm dark:ring-zinc-900 border border-zinc-800/50"
                />
              </div>
              <div className="hidden md:block">
                <UserAvatar
                  src={profile.avatar}
                  seed={profile.user_id || profile.username}
                  initialFrom={profile.username || profile.name}
                  size={96}
                  className="rounded-full ring-4 ring-white shadow-sm dark:ring-zinc-900 border border-zinc-800/50"
                />
              </div>
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-[-0.01em] md:text-2xl">
                {profile.name || profile.username}
                {profile.is_verified && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-zinc-300 px-2 py-0.5 text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                    ✔️ Верифицирован
                  </span>
                )}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <span>@{profile.username}</span>
                {profile.city && <span>• {profile.city}</span>}
                <span>• c {joined.toLocaleDateString('ru-RU')}</span>
              </div>
              {profile.bio && (
                <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">{profile.bio}</p>
              )}
            </div>

            <div className="ml-auto hidden items-center gap-2 md:flex">
              <LikeButtonProfile profileId={profile.id} ownerUserId={profile.user_id} />
              <AdminVerifyToggle profileId={profile.id} currentValue={!!profile.is_verified} />

              <Link
                href="/sell"
                className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                Выставить вещь
              </Link>
              <Link
                href="/profile/edit"
                className="rounded-2xl border border-zinc-300 px-4 py-2 text-sm transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Редактировать
              </Link>
            </div>
          </div>

          {/* кнопки (мобилка) */}
          <div className="mt-4 flex gap-2 md:hidden">
            <LikeButtonProfile profileId={profile.id} ownerUserId={profile.user_id} />
            <Link
              href="/sell"
              className="flex-1 rounded-2xl bg-zinc-900 px-4 py-2 text-center text-sm font-medium text-white dark:bg-white dark:text-zinc-950"
            >
              Выставить вещь
            </Link>
            <Link
              href="/profile/edit"
              className="flex-1 rounded-2xl border border-zinc-300 px-4 py-2 text-center text-sm dark:border-zinc-700"
            >
              Редактировать
            </Link>
          </div>

          {/* счётчики */}
          <div className="mt-5 grid grid-cols-2 gap-2 md:gap-4">
            <Stat label="Объявления" value={items.length} />
            <Stat label="Лайки профиля" value={likesCount} />
          </div>
        </div>
      </section>

      {/* Вкладки */}
      <div className="mt-6 flex gap-2 overflow-x-auto">
        <TabButton active={tab === 'listings'} onClick={() => setTab('listings')}>Мои объявления</TabButton>
        <TabButton active={tab === 'liked_products'} onClick={() => setTab('liked_products')}>
          Лайкнутые товары {likedProductIds.length > 0 ? `(${likedProductIds.length})` : ''}
        </TabButton>
        <TabButton active={tab === 'liked_profiles'} onClick={() => setTab('liked_profiles')}>
          Лайкнутые профили {likedProfileIds.length > 0 ? `(${likedProfileIds.length})` : ''}
        </TabButton>
      </div>

      {/* Контент вкладок */}
      <section className="mt-4">
        {tab === 'listings' && <ListingsGrid items={items} fmt={fmt} />}

        {tab === 'liked_products' && (
          likedProducts.length === 0 ? (
            <EmptyState text="Пока нет лайкнутых товаров." />
          ) : (
            <ListingsGrid items={likedProducts} fmt={fmt} />
          )
        )}

        {tab === 'liked_profiles' && (
          likedProfiles.length === 0 ? (
            <EmptyState text="Пока нет лайкнутых профилей." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
              {likedProfiles.map((u) => (
                <Link key={u.id} href={`/u/${u.username}`} className="group">
                  <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center gap-3 p-4">
                      <UserAvatar
                        src={u.avatar}
                        seed={u.user_id || u.username}
                        initialFrom={u.username || u.name}
                        size={48}
                        className="rounded-full border border-zinc-800/50"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-base font-medium">@{u.username}</h3>
                          {u.is_verified && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-2 py-0.5 text-[10px] text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                              ✔️ Верифицирован
                            </span>
                          )}
                        </div>
                        {u.name && <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{u.name}</p>}
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )
        )}
      </section>
    </div>
  );
}

/* Reusable UI */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border px-3 py-1.5 text-sm transition
        ${active
          ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950'
          : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800'
        }`}
    >
      {children}
    </button>
  );
}

function ListingsGrid({ items, fmt }: { items: Product[]; fmt: Intl.NumberFormat }) {
  if (items.length === 0) return <EmptyListings />;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
      {items.map((p: Product) => (
        <Link key={p.id} href={`/product/${p.id}`} className="group">
          <article className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
            {/* компактный лайк в углу карточки */}
            <div className="absolute right-3 top-3 z-10">
              <LikeButtonProduct productId={p.id} ownerUserId={p.user_id} compact />
            </div>

            <div className="relative w-full overflow-hidden">
              <Image
                src={p.images?.[0] || '/file.svg'}
                alt={p.title}
                width={1200}
                height={900}
                className="aspect-[4/3] w-full object-cover transition group-hover:scale-[1.02]"
              />
            </div>
            <div className="space-y-1.5 p-4">
              {p.brand ? (
                <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{p.brand}</p>
              ) : (
                <span className="block h-4" />
              )}
              <h3 className="line-clamp-1 text-base font-medium md:text-lg">{p.title}</h3>
              <p className="text-sm font-semibold">{fmt.format(p.price || 0)}</p>
            </div>
          </article>
        </Link>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center dark:border-zinc-800 dark:bg-zinc-900 md:p-4">
      <div className="text-xl font-semibold md:text-2xl">{value}</div>
      <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 md:text-sm">{label}</div>
    </div>
  );
}

function SkeletonHeader() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="h-28 w-full animate-pulse bg-zinc-100 dark:bg-zinc-800 md:h-36" />
      <div className="px-4 pb-5 md:px-6">
        <div className="-mt-10 flex items-end gap-4 md:-mt-12">
          <div className="h-20 w-20 animate-pulse rounded-full border-4 border-white bg-zinc-200 dark:border-zinc-900 dark:bg-zinc-800 md:h-24 md:w-24" />
          <div className="flex-1">
            <div className="mb-2 h-5 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-72 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 md:gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800 md:h-20" />
          ))}
        </div>
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="aspect-[4/3] w-full animate-pulse bg-zinc-100 dark:bg-zinc-800" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-20 rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-4 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-5 w-1/3 rounded bg-zinc-100 dark:bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyListings() {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
      <p className="text-zinc-600 dark:text-zinc-400">
        Пока нет объявлений. Начни с{' '}
        <Link
          href="/sell"
          className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-500 dark:text-zinc-100"
        >
          создания первого
        </Link>
        .
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
      <p className="text-zinc-600 dark:text-zinc-400">{text}</p>
    </div>
  );
}
